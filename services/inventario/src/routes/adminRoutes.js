import express from 'express';
import prisma from '../config/prisma.js';
import { personal, internoOAdministrador } from '../utils/seguridad.js';
import { positivo, texto, clave, hash, fallo, auditar, responder } from '../utils/operacion.js';
const router = express.Router(),
  editar = personal(['ADMINISTRADOR', 'INVENTARIO']);
router.get('/ubicaciones', personal(['ADMINISTRADOR', 'INVENTARIO']), responder(() => prisma.ubicacionInventario.findMany({
  where: {
    activa: true
  },
  orderBy: {
    id_ubicacion_inventario: 'asc'
  }
})));
router.get('/movimientos', personal(['ADMINISTRADOR', 'INVENTARIO']), responder(async req => prisma.movimientoInventario.findMany({
  where: req.query.id_existencia ? {
    id_existencia: positivo(req.query.id_existencia)
  } : {},
  include: {
    ref_id_existencia: {
      include: {
        ref_id_lote: true,
        ref_id_ubicacion: true
      }
    }
  },
  orderBy: {
    id_movimiento_inventario: 'desc'
  },
  take: 200
})));
router.post('/ajustes', editar, responder(async req => {
  const id = positivo(req.body.id_existencia),
    delta = Number(req.body.delta),
    motivo = texto(req.body.motivo, 'Motivo'),
    key = clave(req.body.clave_idempotencia);
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 1000000) throw fallo(400, 'La variación debe ser un entero distinto de cero, hasta un millón de unidades.');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id_existencia FROM existencia WHERE id_existencia=${id} FOR UPDATE`;
    const anterior = await tx.movimientoInventario.findUnique({
      where: {
        clave_idempotencia: key
      }
    });
    if (anterior) {
      if (anterior.id_existencia !== id || anterior.delta !== delta || anterior.motivo !== motivo) throw fallo(409, 'La clave corresponde a otro ajuste.');
      return anterior;
    }
    const e = await tx.existencia.findUnique({
      where: {
        id_existencia: id
      },
      include: {
        ref_id_ubicacion: true,
        ref_id_lote: true
      }
    });
    if (!e) throw fallo(404, 'Existencia no encontrada.');
    const saldo = e.cantidad_fisica + delta;
    if (saldo < e.cantidad_reservada) throw fallo(409, 'No puedes reducir el stock por debajo de lo reservado.');
    if (saldo > 2147483647) throw fallo(400, 'Cantidad fuera de rango.');
    await tx.existencia.update({
      where: {
        id_existencia: id
      },
      data: {
        cantidad_fisica: saldo,
        version: {
          increment: 1
        }
      }
    });
    const movimiento = await tx.movimientoInventario.create({
      data: {
        id_existencia: id,
        tipo: delta > 0 ? 'AJUSTE_ENTRADA' : 'AJUSTE_SALIDA',
        delta,
        saldo_resultante: saldo,
        id_actor: req.usuario.id_usuario,
        tipo_documento: 'AJUSTE_MANUAL',
        referencia_documento: key,
        motivo,
        clave_idempotencia: key
      }
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'AJUSTAR_EXISTENCIA',
      entidad: 'Existencia',
      referencia: id,
      cambios: {
        delta,
        saldo_resultante: saldo
      },
      correlacion: key
    });
    return movimiento;
  });
}));
router.post('/recepciones', editar, responder(async req => {
  const b = req.body,
    id = positivo(b.id_presentacion),
    ubicacion = positivo(b.id_ubicacion),
    cantidad = positivo(b.cantidad, 'Cantidad'),
    numero = texto(b.numero_lote, 'Lote', 100),
    fabricante = texto(b.fabricante_referencia, 'Referencia del fabricante', 150),
    key = clave(b.clave_idempotencia),
    vence = b.fecha_vencimiento ? new Date(b.fecha_vencimiento + 'T00:00:00Z') : null;
  if (cantidad > 1000000 || !vence || !Number.isFinite(vence.getTime()) || vence <= new Date()) throw fallo(400, 'Indica una cantidad válida y un vencimiento futuro.');
  const r = await fetch(`${process.env.CATALOGO_URL || 'http://catalogo:3002'}/presentaciones/${id}`, {
    signal: AbortSignal.timeout(8000)
  });
  const p = await r.json();
  if (!r.ok || p.estado !== 'ACTIVO' || !p.permite_venta || p.ref_id_producto?.estado !== 'PUBLICADO') throw fallo(409, 'La presentación no está disponible en catálogo.');
  const solicitud = {
      id,
      ubicacion,
      cantidad,
      numero,
      fabricante,
      vence: vence.toISOString()
    },
    huella = hash(solicitud);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(905301)::text`;
    const operacion = await tx.operacionIdempotente.findUnique({
      where: {
        alcance_clave: {
          alcance: 'RECEPCION',
          clave: key
        }
      }
    });
    if (operacion) {
      if (operacion.hash_solicitud !== huella) throw fallo(409, 'La clave corresponde a otra recepción.');
      return tx.movimientoInventario.findUnique({
        where: {
          clave_idempotencia: key
        }
      });
    }
    const u = await tx.ubicacionInventario.findUnique({
      where: {
        id_ubicacion_inventario: ubicacion
      }
    });
    if (!u?.activa || !['BODEGA', 'VENTA'].includes(u.tipo)) throw fallo(409, 'Selecciona una ubicación activa de bodega o venta.');
    let lote = await tx.lote.findUnique({
      where: {
        id_producto_numero_fabricante_referencia: {
          id_producto: p.id_producto,
          numero,
          fabricante_referencia: fabricante
        }
      }
    });
    if (lote && (lote.fecha_vencimiento?.getTime() !== vence.getTime() || lote.estado !== 'DISPONIBLE')) throw fallo(409, 'El lote existente tiene otro vencimiento o está bloqueado.');
    if (!lote) lote = await tx.lote.create({
      data: {
        id_producto: p.id_producto,
        numero,
        fabricante_referencia: fabricante,
        fecha_vencimiento: vence
      }
    });
    let e = await tx.existencia.findUnique({
      where: {
        id_ubicacion_id_lote_id_presentacion: {
          id_ubicacion: ubicacion,
          id_lote: lote.id_lote,
          id_presentacion: id
        }
      }
    });
    if (e) {
      await tx.$queryRaw`SELECT id_existencia FROM existencia WHERE id_existencia=${e.id_existencia} FOR UPDATE`;
      e = await tx.existencia.update({
        where: {
          id_existencia: e.id_existencia
        },
        data: {
          cantidad_fisica: {
            increment: cantidad
          },
          version: {
            increment: 1
          }
        }
      });
    } else e = await tx.existencia.create({
      data: {
        id_presentacion: id,
        id_lote: lote.id_lote,
        id_ubicacion: ubicacion,
        cantidad_fisica: cantidad
      }
    });
    const m = await tx.movimientoInventario.create({
      data: {
        id_existencia: e.id_existencia,
        tipo: 'RECEPCION',
        delta: cantidad,
        saldo_resultante: e.cantidad_fisica,
        id_actor: req.usuario.id_usuario,
        tipo_documento: 'RECEPCION',
        referencia_documento: key,
        motivo: 'Recepción de mercadería',
        clave_idempotencia: key
      }
    });
    await tx.operacionIdempotente.create({
      data: {
        alcance: 'RECEPCION',
        clave: key,
        hash_solicitud: huella,
        estado: 'COMPLETADA',
        referencia_resultado: String(m.id_movimiento_inventario),
        vence_at: new Date('2100-01-01')
      }
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'RECIBIR_MERCADERIA',
      entidad: 'Existencia',
      referencia: e.id_existencia,
      cambios: {
        cantidad,
        id_presentacion: id,
        id_lote: lote.id_lote
      },
      correlacion: key
    });
    return m;
  });
}));
router.post('/devoluciones/recibir', internoOAdministrador, responder(async req => {
  if (!req.origenServicio) throw fallo(403, 'La recepción se coordina desde el pedido.');
  const id = positivo(req.body.id_devolucion),
    pedido = positivo(req.body.id_pedido),
    actor = positivo(req.body.id_actor, 'Actor'),
    detalles = req.body.detalles;
  if (!Array.isArray(detalles) || !detalles.length || detalles.length > 100) throw fallo(400, 'Detalles inválidos.');
  const entrada = detalles.map(d => ({
    id_detalle: positivo(d.id_detalle),
    cantidad: positivo(d.cantidad)
  })).sort((a, b) => a.id_detalle - b.id_detalle);
  if (new Set(entrada.map(d => d.id_detalle)).size !== entrada.length) throw fallo(400, 'Detalles duplicados.');
  const h = hash({
      pedido,
      entrada
    }),
    key = `DEVOLUCION-${id}`;
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(905302)::text`;
    const anterior = await tx.operacionIdempotente.findUnique({
      where: {
        alcance_clave: {
          alcance: 'DEVOLUCION',
          clave: key
        }
      }
    });
    if (anterior) {
      if (anterior.hash_solicitud !== h) throw fallo(409, 'La devolución cambió en un reintento.');
      return {
        recibida: true,
        decision: 'CUARENTENA',
        referencia: key
      };
    }
    const reserva = await tx.reservaInventario.findFirst({
      where: {
        id_pedido: pedido,
        estado: 'CONSUMIDA'
      },
      include: {
        rel_reserva_detalle_id_reserva: {
          include: {
            ref_id_existencia: true
          }
        }
      }
    });
    if (!reserva) throw fallo(409, 'No hay una entrega consumida para este pedido.');
    let u = await tx.ubicacionInventario.findFirst({
      where: {
        id_sucursal: reserva.id_sucursal,
        tipo: 'CUARENTENA',
        activa: true
      }
    });
    if (!u) u = await tx.ubicacionInventario.create({
      data: {
        id_sucursal: reserva.id_sucursal,
        codigo: 'DEVOLUCIONES',
        nombre: 'Devoluciones pendientes de revisión',
        tipo: 'CUARENTENA',
        activa: true
      }
    });
    for (const d of entrada) {
      let falta = d.cantidad;
      const origen = reserva.rel_reserva_detalle_id_reserva.filter(x => x.id_detalle_pedido === d.id_detalle).sort((a, b) => a.id_reserva_detalle - b.id_reserva_detalle);
      const entregado = origen.reduce((s, x) => s + x.cantidad, 0);
      const movimientos = await tx.movimientoInventario.findMany({
        where: {
          tipo: 'DEVOLUCION',
          referencia_documento: {
            startsWith: `PED-${pedido}-DET-${d.id_detalle}-`
          }
        }
      });
      const anteriores = movimientos.reduce((s, m) => s + m.delta, 0);
      if (d.cantidad + anteriores > entregado) throw fallo(409, 'La cantidad devuelta supera lo entregado.');
      let saltar = anteriores;
      for (const o of origen) {
        const omitido = Math.min(saltar, o.cantidad);
        saltar -= omitido;
        const cantidad = Math.min(falta, o.cantidad - omitido);
        if (!cantidad) continue;
        const original = o.ref_id_existencia;
        const e = await tx.existencia.upsert({
          where: {
            id_ubicacion_id_lote_id_presentacion: {
              id_ubicacion: u.id_ubicacion_inventario,
              id_lote: original.id_lote,
              id_presentacion: original.id_presentacion
            }
          },
          create: {
            id_ubicacion: u.id_ubicacion_inventario,
            id_lote: original.id_lote,
            id_presentacion: original.id_presentacion,
            cantidad_fisica: cantidad
          },
          update: {
            cantidad_fisica: {
              increment: cantidad
            },
            version: {
              increment: 1
            }
          }
        });
        await tx.movimientoInventario.create({
          data: {
            id_existencia: e.id_existencia,
            tipo: 'DEVOLUCION',
            delta: cantidad,
            saldo_resultante: e.cantidad_fisica,
            id_actor: actor,
            tipo_documento: 'DEVOLUCION',
            referencia_documento: `PED-${pedido}-DET-${d.id_detalle}-DEV-${id}`,
            motivo: 'Recepción de devolución en cuarentena',
            clave_idempotencia: `DEV-${id}-ORIGEN-${o.id_reserva_detalle}`
          }
        });
        falta -= cantidad;
        if (!falta) break;
      }
      if (falta) throw fallo(409, 'No se pudo reconciliar el inventario de la devolución.');
    }
    await tx.operacionIdempotente.create({
      data: {
        alcance: 'DEVOLUCION',
        clave: key,
        hash_solicitud: h,
        estado: 'COMPLETADA',
        referencia_resultado: String(id),
        vence_at: new Date('2100-01-01')
      }
    });
    await auditar(tx, {
      actor,
      accion: 'RECIBIR_DEVOLUCION_CUARENTENA',
      entidad: 'Devolucion',
      referencia: id,
      cambios: {
        id_pedido: pedido,
        detalles: entrada
      }
    });
    return {
      recibida: true,
      decision: 'CUARENTENA',
      referencia: key
    };
  }, {
    timeout: 30000
  });
}));
export default router;
