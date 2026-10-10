import express from 'express';
import prisma from '../config/prisma.js';
import { personal } from '../utils/seguridad.js';
import { positivo, texto, fallo, auditar, responder } from '../utils/operacion.js';
const router = express.Router();
router.use(personal(['ADMINISTRADOR']));
router.put('/sucursales/:id', responder(async req => {
  const id = positivo(req.params.id),
    b = req.body,
    data = {
      nombre: texto(b.nombre, 'Nombre', 150),
      direccion: texto(b.direccion, 'Dirección', 500),
      departamento: texto(b.departamento, 'Departamento', 100),
      municipio: texto(b.municipio, 'Municipio', 100),
      zona: b.zona ? texto(b.zona, 'Zona', 20) : null,
      telefono: b.telefono ? texto(b.telefono, 'Teléfono', 25) : null,
      correo: b.correo ? texto(b.correo, 'Correo', 254).toLowerCase() : null
    };
  if (data.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) throw fallo(400, 'Correo inválido.');
  return prisma.$transaction(async tx => {
    const s = await tx.sucursal.findUnique({
      where: {
        id_sucursal: id
      }
    });
    if (!s) throw fallo(404, 'Sucursal no encontrada.');
    const r = await tx.sucursal.update({
      where: {
        id_sucursal: id
      },
      data
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'ACTUALIZAR_FARMACIA',
      entidad: 'Sucursal',
      referencia: id,
      cambios: {
        campos: Object.keys(data)
      }
    });
    return r;
  });
}));
router.put('/sucursales/:id/horarios', responder(async req => {
  const id = positivo(req.params.id),
    horarios = req.body.horarios;
  if (!Array.isArray(horarios) || horarios.length > 14) throw fallo(400, 'Horarios inválidos.');
  const validos = horarios.map(h => {
    const dia = Number(h.dia_semana),
      apertura = Number(h.apertura_minuto),
      cierre = Number(h.cierre_minuto);
    if (![dia, apertura, cierre].every(Number.isInteger) || dia < 1 || dia > 7 || apertura < 0 || apertura >= 1440 || cierre <= apertura || cierre > 1440) throw fallo(400, 'Indica día 1–7 y horas de apertura y cierre del mismo día.');
    return {
      id_sucursal: id,
      dia_semana: dia,
      apertura_minuto: apertura,
      cierre_minuto: cierre,
      cierra_dia_siguiente: false
    };
  });
  for (const h of validos) if (validos.some(o => o !== h && h.dia_semana === o.dia_semana && h.apertura_minuto < o.cierre_minuto && o.apertura_minuto < h.cierre_minuto)) throw fallo(400, 'Los horarios no deben solaparse.');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id_sucursal FROM sucursal WHERE id_sucursal=${id} FOR UPDATE`;
    if (!(await tx.sucursal.findUnique({
      where: {
        id_sucursal: id
      }
    }))) throw fallo(404, 'Sucursal no encontrada.');
    await tx.horarioSucursal.deleteMany({
      where: {
        id_sucursal: id
      }
    });
    if (validos.length) await tx.horarioSucursal.createMany({
      data: validos
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'ACTUALIZAR_HORARIOS',
      entidad: 'Sucursal',
      referencia: id,
      cambios: {
        horarios: validos
      }
    });
    return tx.horarioSucursal.findMany({
      where: {
        id_sucursal: id
      },
      orderBy: [{
        dia_semana: 'asc'
      }, {
        apertura_minuto: 'asc'
      }]
    });
  });
}));
export default router;
