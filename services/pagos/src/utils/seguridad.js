import crypto from 'node:crypto';
export function claveServicio(req) {
  const esperada = process.env.SERVICE_API_KEY,
    recibida = req.headers['x-service-key'];
  if (typeof esperada !== 'string' || esperada.length < 32 || typeof recibida !== 'string') return false;
  const hash = s => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(hash(esperada), hash(recibida));
}
export async function identidadVigente(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw Object.assign(new Error('Se requiere iniciar sesión.'), {
    status: 401
  });
  let r;
  try {
    r = await fetch(`${process.env.AUTH_URL || 'http://auth:3001'}/api/auth/interno/identidad`, {
      headers: {
        Authorization: authorization,
        'x-service-key': process.env.SERVICE_API_KEY || ''
      },
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    throw Object.assign(new Error('No se pudo verificar la sesión. Reintenta.'), {
      status: 503
    });
  }
  const d = await r.json();
  if (!r.ok) throw Object.assign(new Error(d.message || 'Sesión inválida.'), {
    status: r.status
  });
  return d;
}
export const rolesPersonal = ['ADMINISTRADOR', 'CAJERO', 'INVENTARIO', 'DESPACHO'];
export const tieneRol = (usuario, roles) => Array.isArray(usuario?.roles) && usuario.roles.some(r => roles.includes(r));
export const personal = roles => async (req, res, next) => {
  try {
    req.usuario = await identidadVigente(req);
    if (!tieneRol(req.usuario, roles)) return res.status(403).json({
      message: 'No tienes permiso para esta operación.'
    });
    req.actorAdministrativo = req.usuario.id_usuario;
    next();
  } catch (e) {
    res.status(e.status || 500).json({
      message: e.message
    });
  }
};
export const internoOAdministrador = async (req, res, next) => {
  if (req.headers['x-service-key'] !== undefined) {
    if (!claveServicio(req)) return res.status(401).json({
      message: 'Credencial de servicio inválida.'
    });
    req.origenServicio = true;
    return next();
  }
  return personal(['ADMINISTRADOR'])(req, res, next);
};
