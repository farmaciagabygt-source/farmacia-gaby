import { auditar } from '../utils/operacion.js';
import prisma from '../config/prisma.js';
const fallo = (status, message) => Object.assign(new Error(message), {
  status
});
async function transicion(id, destino, body = {}) {
  if (!Number.isSafeInteger(id) || id <= 0) throw fallo(400, 'Reserva inválida.');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id_reserva_inventario FROM reserva_inventario WHERE id_reserva_inventario=${id} FOR UPDATE`;
    const r = await tx.reservaInventario.findUnique({
      where: {
        id_reserva_inventario: id
      },
      include: {
        rel_reserva_detalle_id_reserva: true
      }
    });
    if (!r) throw fallo(404, 'Reserva de inventario no encontrada');
    if (r.estado === destino || destino === 'LIBERADA' && r.estado === 'VENCIDA') return r;
    if (destino === 'CONFIRMADA' && (r.estado !== 'ACTIVA' || r.vence_at <= new Date())) throw fallo(409, 'La reserva no está activa o venció.');
    if (destino === 'CONSUMIDA' && r.estado !== 'CONFIRMADA') throw fallo(409, 'La reserva debe estar confirmada.');
    if (destino === 'LIBERADA' && !['ACTIVA', 'CONFIRMADA'].includes(r.estado)) throw fallo(409, 'La reserva no se puede liberar.');
    if (destino !== 'CONFIRMADA') {
      const cantidades = new Map();
      for (const d of r.rel_reserva_detalle_id_reserva) cantidades.set(d.id_existencia, (cantidades.get(d.id_existencia) || 0) + d.cantidad);
      for (const [id_existencia, cantidad] of [...cantidades].sort((a, b) => a[0] - b[0])) {
        const cambiado = await tx.existencia.updateMany({
          where: {
            id_existencia,
            cantidad_reservada: {
              gte: cantidad
            },
            ...(destino === 'CONSUMIDA' ? {
              cantidad_fisica: {
                gte: cantidad
              }
            } : {})
          },
          data: {
            cantidad_reservada: {
              decrement: cantidad
            },
            ...(destino === 'CONSUMIDA' ? {
              cantidad_fisica: {
                decrement: cantidad
              }
            } : {}),
            version: {
              increment: 1
            }
          }
        });
        if (cambiado.count !== 1) throw fallo(409, 'Las existencias reservadas requieren revisión.');
        if (destino === 'CONSUMIDA') {
          const e = await tx.existencia.findUnique({
            where: {
              id_existencia
            }
          });
          await tx.movimientoInventario.create({
            data: {
              id_existencia,
              tipo: 'VENTA',
              delta: -cantidad,
              saldo_resultante: e.cantidad_fisica,
              id_actor: body.id_actor ?? 0,
              tipo_documento: 'PEDIDO',
              referencia_documento: String(r.id_pedido),
              motivo: 'Entrega de pedido',
              clave_idempotencia: `VENTA-${id}-${id_existencia}`
            }
          });
        }
      }
    }
    let vence_at = r.vence_at;
    if (destino === 'CONFIRMADA' && body.vence_at) {
      vence_at = new Date(body.vence_at);
      if (!Number.isFinite(vence_at.getTime()) || vence_at <= new Date() || vence_at > new Date(Date.now() + 72 * 3600000)) throw fallo(400, 'Vencimiento de reserva inválido.');
    }
    const actualizado = await tx.reservaInventario.update({
      where: {
        id_reserva_inventario: id
      },
      data: {
        estado: destino,
        vence_at,
        version: {
          increment: 1
        },
        ...(destino === 'CONFIRMADA' ? {
          confirmada_at: new Date()
        } : destino === 'CONSUMIDA' ? {
          consumida_at: new Date()
        } : {
          liberada_at: new Date()
        })
      }
    });
    await tx.eventoReserva.create({
      data: {
        id_reserva: id,
        estado: destino,
        motivo: body.motivo || `Reserva ${destino.toLowerCase()}`,
        id_actor: body.id_actor ?? null,
        clave_evento: `TRANSICION-${id}-${destino}`
      }
    });
    await auditar(tx, {
      actor: body.id_actor ?? null,
      accion: 'CAMBIAR_RESERVA',
      entidad: 'ReservaInventario',
      referencia: id,
      cambios: {
        antes: r.estado,
        estado: destino,
        id_pedido: r.id_pedido
      }
    });
    return actualizado;
  }, {
    timeout: 30000
  });
}
const controller = destino => async (req, res) => {
  try {
    res.json(await transicion(Number(req.params.id), destino, req.body));
  } catch (e) {
    res.status(e.status || 500).json({
      message: e.status ? e.message : 'No se pudo cambiar la reserva.'
    });
  }
};
export const confirmarReserva = controller('CONFIRMADA');
export const liberarReserva = controller('LIBERADA');
export const consumirReserva = controller('CONSUMIDA');
