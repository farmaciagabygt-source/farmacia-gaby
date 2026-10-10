import express from 'express';
import prisma from '../config/prisma.js';
import { conPedido } from '../services/pedidoOperacion.js';
import { personal, internoOAdministrador } from '../utils/seguridad.js';
import { positivo, texto, clave, hash, fallo, auditar, responder } from '../utils/operacion.js';
const router = express.Router(),
  lectura = personal(['ADMINISTRADOR', 'CAJERO', 'DESPACHO']),
  admin = personal(['ADMINISTRADOR']);
const include = {
  rel_detalle_devolucion_id_devolucion: {
    include: {
      ref_id_detalle: true
    }
  },
  ref_id_pedido: {
    select: {
      numero: true,
      id_pedido: true,
      estado: true
    }
  }
};
async function llamar(servicio, ruta, method = 'GET', body) {
  const base = servicio === 'inventario' ? process.env.INVENTARIO_URL || 'http://inventario:3003' : process.env.PAGOS_URL || 'http://pagos:3005';
  const r = await fetch(base + ruta, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': process.env.SERVICE_API_KEY || ''
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const d = await r.json();
  if (!r.ok) throw fallo(r.status, d.message || 'No se pudo coordinar la devolución.');
  return d;
}
async function dto(tx, d) {
  let monto = 0;
  for (const linea of d.rel_detalle_devolucion_id_devolucion) {
    const anteriores = await tx.detalleDevolucion.aggregate({
      _sum: {
        cantidad: true
      },
      where: {
        id_detalle: linea.id_detalle,
        id_devolucion: {
          lt: d.id_devolucion
        },
        ref_id_devolucion: {
          estado: {
            in: ['SOLICITADA', 'AUTORIZADA', 'RECIBIDA', 'CERRADA']
          }
        }
      }
    });
    const antes = anteriores._sum.cantidad || 0,
      c = Math.round(Number(linea.ref_id_detalle.total_linea) * 100),
      q = linea.ref_id_detalle.cantidad;
    monto += Math.round(c * (antes + linea.cantidad) / q) - Math.round(c * antes / q);
  }
  return {
    ...d,
    maximo_reembolso: (monto / 100).toFixed(2),
    decision_inventario: 'CUARENTENA'
  };
}
router.get('/', lectura, responder(async req => {
  const items = await prisma.devolucion.findMany({
    where: req.query.id_pedido ? {
      id_pedido: positivo(req.query.id_pedido)
    } : {},
    include,
    orderBy: {
      id_devolucion: 'desc'
    }
  });
  return Promise.all(items.map(d => dto(prisma, d)));
}));
router.get('/:id', internoOAdministrador, responder(async req => {
  const d = await prisma.devolucion.findUnique({
    where: {
      id_devolucion: positivo(req.params.id)
    },
    include
  });
  if (!d) throw fallo(404, 'Devolución no encontrada.');
  return dto(prisma, d);
}));
router.post('/', personal(['ADMINISTRADOR', 'DESPACHO']), responder(async req => {
  const b = req.body,
    id = positivo(b.id_pedido),
    motivo = texto(b.motivo, 'Motivo'),
    key = clave(b.clave_idempotencia);
  if (!Array.isArray(b.detalles) || !b.detalles.length || b.detalles.length > 100) throw fallo(400, 'Selecciona productos para devolver.');
  const detalles = b.detalles.map(d => ({
    id_detalle: positivo(d.id_detalle),
    cantidad: positivo(d.cantidad),
    condicion: texto(d.condicion, 'Condición de lo devuelto', 200)
  })).sort((a, b) => a.id_detalle - b.id_detalle);
  if (new Set(detalles.map(d => d.id_detalle)).size !== detalles.length) throw fallo(400, 'No repitas una línea.');
  const h = hash({
    id,
    motivo,
    detalles
  });
  return conPedido(id, async (tx, p) => {
    const op = await tx.operacionIdempotente.findUnique({
      where: {
        alcance_clave: {
          alcance: 'DEVOLUCION',
          clave: key
        }
      }
    });
    if (op) {
      if (op.hash_solicitud !== h) throw fallo(409, 'La clave corresponde a otra devolución.');
      return dto(tx, await tx.devolucion.findUnique({
        where: {
          id_devolucion: Number(op.referencia_resultado)
        },
        include
      }));
    }
    if (p.estado !== 'COMPLETADO') throw fallo(409, 'Solo se devuelven productos de pedidos entregados.');
    for (const d of detalles) {
      const vendido = p.rel_detalle_pedido_id_pedido.find(x => x.id_detalle_pedido === d.id_detalle);
      if (!vendido) throw fallo(400, 'Una línea no pertenece al pedido.');
      const otras = await tx.detalleDevolucion.aggregate({
        _sum: {
          cantidad: true
        },
        where: {
          id_detalle: d.id_detalle,
          ref_id_devolucion: {
            estado: {
              not: 'RECHAZADA'
            }
          }
        }
      });
      if (d.cantidad + (otras._sum.cantidad || 0) > vendido.cantidad) throw fallo(409, 'La cantidad supera las unidades entregadas que todavía pueden devolverse.');
    }
    const devolucion = await tx.devolucion.create({
      data: {
        id_pedido: id,
        motivo,
        rel_detalle_devolucion_id_devolucion: {
          create: detalles
        }
      },
      include
    });
    await tx.operacionIdempotente.create({
      data: {
        alcance: 'DEVOLUCION',
        clave: key,
        hash_solicitud: h,
        estado: 'COMPLETADA',
        referencia_resultado: String(devolucion.id_devolucion),
        vence_at: new Date('2100-01-01')
      }
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'SOLICITAR_DEVOLUCION',
      entidad: 'Devolucion',
      referencia: devolucion.id_devolucion,
      cambios: {
        id_pedido: id,
        detalles: detalles.map(d => ({
          id_detalle: d.id_detalle,
          cantidad: d.cantidad
        }))
      },
      correlacion: key
    });
    return dto(tx, devolucion);
  });
}));
router.patch('/:id/estado', lectura, responder(async req => {
  const id = positivo(req.params.id),
    estado = req.body.estado;
  if (!['AUTORIZADA', 'RECHAZADA', 'RECIBIDA', 'CERRADA'].includes(estado)) throw fallo(400, 'Estado de devolución inválido.');
  const base = await prisma.devolucion.findUnique({
    where: {
      id_devolucion: id
    }
  });
  if (!base) throw fallo(404, 'Devolución no encontrada.');
  if (['AUTORIZADA', 'RECHAZADA', 'CERRADA'].includes(estado) && !req.usuario.roles.includes('ADMINISTRADOR')) throw fallo(403, 'Solo el administrador autoriza o cierra devoluciones.');
  if (estado === 'RECIBIDA' && !req.usuario.roles.some(r => ['ADMINISTRADOR', 'DESPACHO'].includes(r))) throw fallo(403, 'La recepción corresponde a despacho.');
  return conPedido(base.id_pedido, async (tx, p) => {
    const d = await tx.devolucion.findUnique({
      where: {
        id_devolucion: id
      },
      include
    });
    if (d.estado === estado) return dto(tx, d);
    const siguientes = {
      SOLICITADA: ['AUTORIZADA', 'RECHAZADA'],
      AUTORIZADA: ['RECIBIDA'],
      RECIBIDA: ['CERRADA']
    };
    if (!siguientes[d.estado]?.includes(estado)) throw fallo(409, 'Transición de devolución inválida.');
    if (estado === 'RECIBIDA') {
      const recibido = await llamar('inventario', '/admin/devoluciones/recibir', 'POST', {
        id_devolucion: id,
        id_pedido: p.id_pedido,
        id_actor: req.usuario.id_usuario,
        detalles: d.rel_detalle_devolucion_id_devolucion.map(x => ({
          id_detalle: x.id_detalle,
          cantidad: x.cantidad
        }))
      });
      await tx.detalleDevolucion.updateMany({
        where: {
          id_devolucion: id
        },
        data: {
          decision_inventario: 'CUARENTENA',
          referencia_recepcion_inventario: recibido.referencia
        }
      });
    }
    if (estado === 'CERRADA') {
      const pagos = await llamar('pagos', `/pagos/pedido/${p.id_pedido}`),
        ids = pagos.map(x => x.id_pago),
        reembolsos = (await Promise.all(ids.map(i => llamar('pagos', `/reembolsos/pago/${i}`)))).flat().filter(x => x.id_devolucion === id);
      if (!reembolsos.some(x => x.estado === 'CONFIRMADO')) throw fallo(409, 'Registra y confirma el reembolso antes de cerrar.');
    }
    const resultado = await tx.devolucion.update({
      where: {
        id_devolucion: id
      },
      data: {
        estado,
        ...(estado === 'AUTORIZADA' ? {
          autorizado_por: req.usuario.id_usuario
        } : estado === 'RECIBIDA' ? {
          recibido_at: new Date()
        } : {})
      },
      include
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'CAMBIAR_DEVOLUCION',
      entidad: 'Devolucion',
      referencia: id,
      cambios: {
        antes: d.estado,
        estado,
        id_pedido: p.id_pedido
      }
    });
    return dto(tx, resultado);
  });
}));
export default router;
