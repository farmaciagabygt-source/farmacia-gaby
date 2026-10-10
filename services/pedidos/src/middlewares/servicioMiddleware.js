import { identidadVigente, tieneRol, claveServicio } from '../utils/seguridad.js';
export const verificarClaveServicio = claveServicio;
export async function servicioOAdministrador(req, res, next) {
  if (req.headers['x-service-key'] !== undefined) {
    if (!claveServicio(req)) return res.status(401).json({
      message: 'Credencial de servicio inválida.'
    });
    req.origenServicio = true;
    return next();
  }
  try {
    req.usuario = await identidadVigente(req);
    if (!tieneRol(req.usuario, ['ADMINISTRADOR', 'CAJERO', 'DESPACHO'])) return res.status(403).json({
      message: 'No tienes permisos para gestionar pedidos.'
    });
    req.actorAdministrativo = req.usuario.id_usuario;
    if (req.body && typeof req.body === 'object') req.body.id_actor = req.usuario.id_usuario;
    next();
  } catch (e) {
    res.status(e.status || 500).json({
      message: e.message
    });
  }
}
export function autorizarCambioEstadoPedido(req, res, next) {
  return servicioOAdministrador(req, res, () => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({
      message: 'Cuerpo JSON requerido.'
    });
    const estado = req.body.estado;
    if (req.origenServicio && !['CONFIRMADO', 'CANCELADO'].includes(estado)) return res.status(403).json({
      message: 'Pagos solo confirma o cancela pedidos.'
    });
    if (!req.origenServicio && !tieneRol(req.usuario, ['ADMINISTRADOR'])) {
      if (tieneRol(req.usuario, ['DESPACHO']) && ['PREPARANDO', 'LISTO', 'EN_ENTREGA', 'COMPLETADO'].includes(estado)) {} else if (tieneRol(req.usuario, ['CAJERO']) && estado === 'CANCELADO') {} else return res.status(403).json({
        message: 'Tu puesto no permite este cambio de estado.'
      });
    }
    if (!req.origenServicio) req.body.id_actor = req.actorAdministrativo;
    next();
  });
}
