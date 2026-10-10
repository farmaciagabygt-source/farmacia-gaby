import express from 'express';
import prisma from '../config/prisma.js';
import { personal } from '../utils/seguridad.js';
import { positivo, centavos, importe, fallo, auditar, responder } from '../utils/operacion.js';
const router = express.Router();
router.use(personal(['ADMINISTRADOR']));
router.get('/', responder(() => prisma.tarifaEntrega.findMany({
  include: {
    ref_id_zona: true
  },
  orderBy: {
    id_tarifa_entrega: 'asc'
  }
})));
router.put('/:id', responder(async req => {
  const id = positivo(req.params.id),
    b = req.body,
    costo = centavos(b.importe),
    minimo = centavos(b.minimo_compra),
    gratis = b.umbral_gratis == null || b.umbral_gratis === '' ? null : centavos(b.umbral_gratis);
  if (gratis != null && gratis < minimo) throw fallo(400, 'El umbral gratuito debe ser mayor o igual al mínimo de compra.');
  return prisma.$transaction(async tx => {
    const actual = await tx.tarifaEntrega.findUnique({
      where: {
        id_tarifa_entrega: id
      }
    });
    if (!actual) throw fallo(404, 'Tarifa no encontrada.');
    const data = {
      importe: importe(costo),
      minimo_compra: importe(minimo),
      umbral_gratis: gratis == null ? null : importe(gratis)
    };
    const r = await tx.tarifaEntrega.update({
      where: {
        id_tarifa_entrega: id
      },
      data,
      include: {
        ref_id_zona: true
      }
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'ACTUALIZAR_TARIFA',
      entidad: 'TarifaEntrega',
      referencia: id,
      cambios: data
    });
    return r;
  });
}));
export default router;
