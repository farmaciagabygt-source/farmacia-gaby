import { identidadVigente, tieneRol } from '../utils/seguridad.js';
export const verificarToken = async (req, res, next) => {
  try {
    req.usuario = await identidadVigente(req);
    next();
  } catch (e) {
    res.status(e.status || 500).json({
      message: e.message
    });
  }
};
export const soloAdministrador = (req, res, next) => tieneRol(req.usuario, ['ADMINISTRADOR']) ? next() : res.status(403).json({
  message: 'Se requieren permisos administrativos.'
});
export const leerCatalogo = (req, res, next) => tieneRol(req.usuario, ['ADMINISTRADOR', 'INVENTARIO', 'CAJERO', 'DESPACHO']) ? next() : res.status(403).json({
  message: 'El catálogo administrativo es exclusivo del personal.'
});
