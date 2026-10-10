import express from 'express';
import prisma from '../config/prisma.js';
import { personal } from '../utils/seguridad.js';
import { positivo, texto, centavos, importe, clave, fallo, auditar, responder } from '../utils/operacion.js';
const router = express.Router();
const leer = responder(async req => prisma.reembolso.findMany({
  where: req.params.id_pago ? {
    id_pago: positivo(req.params.id_pago)
  } : {},
  orderBy: {
    id_reembolso: 'desc'
  }
}));
router.get('/', leer);
router.get('/pago/:id_pago', leer);
router.get('/:id', responder(async req => {
  const r = await prisma.reembolso.findUnique({
    where: {
      id_reembolso: positivo(req.params.id)
    }
  });
  if (!r) throw fallo(404, 'Reembolso no encontrado.');
  return r;
}));
router.post('/', personal(['ADMINISTRADOR']), responder(async req => {
  const b = req.body,
    id = positivo(b.id_pago),
    monto = centavos(b.monto),
    motivo = texto(b.motivo, 'Motivo'),
    key = clave(b.clave_idempotencia),
    devolucion = b.id_devolucion ? positivo(b.id_devolucion) : null;
  if (!monto) throw fallo(400, 'El reembolso debe ser mayor que cero.');
  let d = null;
  if (devolucion) {
    const r = await fetch(`${process.env.PEDIDOS_URL || 'http://pedidos:3004'}/devoluciones/${devolucion}`, {
      headers: {
        'x-service-key': process.env.SERVICE_API_KEY || ''
      },
      signal: AbortSignal.timeout(10000)
    });
    d = await r.json();
    if (!r.ok) throw fallo(r.status, d.message);
    if (!['RECIBIDA', 'CERRADA'].includes(d.estado)) throw fallo(409, 'Recibe la devolución antes de solicitar su reembolso.');
    if (monto !== Math.round(Number(d.maximo_reembolso) * 100)) throw fallo(409, 'El importe debe coincidir con los productos recibidos en devolución.');
  }
  const base = await prisma.pago.findUnique({
    where: {
      id_pago: id
    }
  });
  if (!base) throw fallo(404, 'Pago no encontrado.');
  if (d && d.id_pedido !== base.id_pedido) throw fallo(400, 'La devolución pertenece a otro pedido.');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${base.id_pedido}::bigint)::text`;
    const anterior = await tx.reembolso.findUnique({
      where: {
        clave_idempotencia: key
      }
    });
    if (anterior) {
      if (anterior.id_pago !== id || Math.round(Number(anterior.monto) * 100) !== monto || anterior.motivo !== motivo || anterior.id_devolucion !== devolucion) throw fallo(409, 'La clave corresponde a otro reembolso.');
      return anterior;
    }
    const p = await tx.pago.findUnique({
      where: {
        id_pago: id
      }
    });
    if (p.metodo !== 'EFECTIVO') throw fallo(409, 'Los reembolsos bancarios requieren una pasarela real.');
    if (!['CONFIRMADO', 'REEMBOLSADO_PARCIAL'].includes(p.estado)) throw fallo(409, 'El pago no admite reembolso.');
    if (devolucion && (await tx.reembolso.findFirst({
      where: {
        id_devolucion: devolucion,
        estado: {
          in: ['SOLICITADO', 'PROCESANDO', 'CONFIRMADO']
        }
      }
    }))) throw fallo(409, 'La devolución ya tiene un reembolso activo.');
    const activos = await tx.reembolso.findMany({
      where: {
        id_pago: id,
        estado: {
          in: ['SOLICITADO', 'PROCESANDO', 'CONFIRMADO']
        }
      }
    });
    const ocupado = activos.reduce((s, x) => s + Math.round(Number(x.monto) * 100), 0);
    if (monto + ocupado > Math.round(Number(p.monto) * 100)) throw fallo(409, 'El reembolso supera el saldo disponible.');
    const resultado = await tx.reembolso.create({
      data: {
        id_pago: id,
        id_devolucion: devolucion,
        monto: importe(monto),
        motivo,
        proveedor: 'EFECTIVO_MANUAL',
        clave_idempotencia: key
      }
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'SOLICITAR_REEMBOLSO',
      entidad: 'Reembolso',
      referencia: resultado.id_reembolso,
      cambios: {
        id_pago: id,
        id_pedido: p.id_pedido,
        monto: importe(monto),
        id_devolucion: devolucion
      },
      correlacion: key
    });
    return resultado;
  });
}));
router.patch('/:id/estado', responder(async req => {
  const id = positivo(req.params.id),
    estado = req.body.estado;
  if (!['PROCESANDO', 'CONFIRMADO', 'FALLIDO', 'CANCELADO'].includes(estado)) throw fallo(400, 'Estado inválido.');
  if (req.origenServicio) throw fallo(403, 'El efectivo debe registrarlo el personal autenticado.');
  if (!req.usuario?.roles?.some(r => r === 'ADMINISTRADOR' || r === 'CAJERO' && estado === 'CONFIRMADO')) throw fallo(403, 'Tu puesto no permite esta operación.');
  const base = await prisma.reembolso.findUnique({
    where: {
      id_reembolso: id
    }
  });
  if (!base) throw fallo(404, 'Reembolso no encontrado.');
  const pago = await prisma.pago.findUnique({
    where: {
      id_pago: base.id_pago
    }
  });
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${pago.id_pedido}::bigint)::text`;
    const r = await tx.reembolso.findUnique({
      where: {
        id_reembolso: id
      }
    });
    if (r.estado === estado) return r;
    if (!({
      SOLICITADO: ['PROCESANDO', 'CANCELADO'],
      PROCESANDO: ['CONFIRMADO', 'FALLIDO', 'CANCELADO']
    }[r.estado] || []).includes(estado)) throw fallo(409, 'Transición de reembolso inválida.');
    if (r.proveedor !== 'EFECTIVO_MANUAL') throw fallo(409, 'No se puede confirmar un reembolso bancario sin proveedor.');
    const actualizado = await tx.reembolso.update({
      where: {
        id_reembolso: id
      },
      data: {
        estado,
        ...(estado === 'CONFIRMADO' ? {
          confirmado_at: new Date()
        } : {})
      }
    });
    if (estado === 'CONFIRMADO') {
      const confirmados = await tx.reembolso.findMany({
          where: {
            id_pago: pago.id_pago,
            estado: 'CONFIRMADO'
          }
        }),
        total = confirmados.reduce((s, x) => s + Math.round(Number(x.monto) * 100), 0),
        original = Math.round(Number(pago.monto) * 100);
      if (total > original) throw fallo(409, 'Los reembolsos superan lo cobrado.');
      await tx.pago.update({
        where: {
          id_pago: pago.id_pago
        },
        data: {
          estado: total === original ? 'REEMBOLSADO' : 'REEMBOLSADO_PARCIAL',
          version: {
            increment: 1
          }
        }
      });
    }
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'CAMBIAR_REEMBOLSO',
      entidad: 'Reembolso',
      referencia: id,
      cambios: {
        antes: r.estado,
        estado,
        id_pago: pago.id_pago,
        monto: r.monto.toString()
      }
    });
    return actualizado;
  });
}));
export default router;
