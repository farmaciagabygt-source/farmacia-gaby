import crypto from 'node:crypto';
export const fallo = (status, message) => Object.assign(new Error(message), {
  status
});
export const positivo = (valor, nombre = 'ID') => {
  const n = Number(valor);
  if (!Number.isSafeInteger(n) || n <= 0) throw fallo(400, `${nombre} debe ser un entero positivo.`);
  return n;
};
export const texto = (valor, nombre, max = 500) => {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > max) throw fallo(400, `${nombre} es obligatorio y admite hasta ${max} caracteres.`);
  return valor.trim();
};
export function centavos(valor) {
  if (typeof valor !== 'string' || !/^\d{1,10}(\.\d{1,2})?$/.test(valor)) throw fallo(400, 'El importe debe ser texto decimal con hasta dos decimales.');
  const [e, d = ''] = valor.split('.');
  return Number(e) * 100 + Number(d.padEnd(2, '0'));
}
export const importe = n => (n / 100).toFixed(2);
export const clave = valor => texto(valor, 'Clave de operación', 100);
export const hash = valor => crypto.createHash('sha256').update(JSON.stringify(valor)).digest('hex');
export async function auditar(tx, {
  actor = null,
  accion,
  entidad,
  referencia,
  cambios = {},
  correlacion = crypto.randomUUID()
}) {
  await tx.auditoriaEvento.create({
    data: {
      id_actor: actor,
      actor_sistema: actor == null ? 'GabyFarma' : null,
      accion,
      entidad,
      referencia: String(referencia),
      resultado: 'CORRECTO',
      correlacion,
      cambios_sanitizados: cambios
    }
  });
}
export const responder = fn => async (req, res) => {
  try {
    const dato = await fn(req);
    res.json(dato);
  } catch (e) {
    if (!e.status) console.error('Operación fallida:', e.code || e.message);
    res.status(e.status || 500).json({
      message: e.status ? e.message : 'No se pudo completar la operación.'
    });
  }
};
export function consultarAuditoria(prisma) {
  return responder(async req => {
    const limit = Math.min(100, req.query.limit?positivo(req.query.limit,"Límite"):50),
      cursor = req.query.cursor ? positivo(req.query.cursor) : null,
      where = {
        ...(cursor ? {
          id_auditoria_evento: {
            lt: cursor
          }
        } : {}),
        ...(req.query.entidad ? {
          entidad: texto(req.query.entidad, 'Entidad', 100)
        } : {})
      };
    if (req.query.desde || req.query.hasta) {
      const desde = req.query.desde ? new Date(req.query.desde) : null,
        hasta = req.query.hasta ? new Date(req.query.hasta) : null;
      if (desde && !Number.isFinite(desde.getTime()) || hasta && !Number.isFinite(hasta.getTime()) || desde && hasta && desde > hasta) throw fallo(400, 'Rango de fechas inválido.');
      where.created_at = {
        ...(desde ? {
          gte: desde
        } : {}),
        ...(hasta ? {
          lte: hasta
        } : {})
      };
    }
    const items = await prisma.auditoriaEvento.findMany({
      where,
      orderBy: {
        id_auditoria_evento: 'desc'
      },
      take: limit + 1
    });
    const hay = items.length > limit;
    if (hay) items.pop();
    return {
      items,
      nextCursor: hay ? items.at(-1).id_auditoria_evento : null
    };
  });
}
