import { identidadVigente, tieneRol } from '../utils/seguridad.js';
export const identificar = async (req, res, next) => {
  if (req.headers.authorization) {
    try {
      const p = await identidadVigente(req),
        roles = p.roles;
      req.identidad = {
        tipo: tieneRol(p, ['ADMINISTRADOR', 'CAJERO', 'INVENTARIO', 'DESPACHO']) ? 'PERSONAL' : 'CLIENTE',
        ...p
      };
      if (req.identidad.tipo === 'CLIENTE' && (!roles.includes('CLIENTE') || !Number.isSafeInteger(p.id_cliente) || p.id_cliente <= 0)) return res.status(403).json({
        message: 'La sesión no corresponde a un cliente.'
      });
      return next();
    } catch (e) {
      return res.status(e.status || 500).json({
        message: e.message
      });
    }
  }
  const t = req.headers['x-token-invitado'];
  if (typeof t === 'string' && t.length >= 16 && t.length <= 256) {
    req.identidad = {
      tipo: 'INVITADO',
      token_invitado: t
    };
    return next();
  }
  res.status(401).json({
    message: 'Debes iniciar sesión o identificar tu carrito de invitado.'
  });
};
export const esAdministrador = i => i?.tipo === 'PERSONAL' && i.roles?.includes('ADMINISTRADOR');
export const esPersonalPedidos = i => i?.tipo === 'PERSONAL' && i.roles?.some(r => ['ADMINISTRADOR', 'CAJERO', 'DESPACHO'].includes(r));
export const soloAdministrador = (req, res, next) => esAdministrador(req.identidad) ? next() : res.status(403).json({
  message: 'Se requieren permisos administrativos.'
});
export const soloPersonalPedidos = (req, res, next) => esPersonalPedidos(req.identidad) ? next() : res.status(403).json({
  message: 'No tienes permiso para consultar pedidos.'
});
export const soloCliente = (req, res, next) => req.identidad?.tipo === 'CLIENTE' ? next() : res.status(403).json({
  message: 'Esta operación corresponde a clientes.'
});
