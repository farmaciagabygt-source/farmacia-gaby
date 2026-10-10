import { auditar } from '../utils/operacion.js';
export function auditoriaHttp(prisma) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const json = res.json.bind(res);
    res.json = function (data) {
      if (res.statusCode < 200 || res.statusCode >= 300 || !req.usuario?.id_usuario) return json(data);
      const dato = data?.producto || data?.presentacion || data?.precio || data;
      const identificador = Object.entries(dato || {}).find(([k, v]) => k.startsWith('id_') && typeof v === 'number');
      const cambios = {};
      for (const campo of ['estado', 'importe', 'tasa_impuesto', 'id_presentacion', 'id_producto', 'unidades_base']) if (dato?.[campo] != null) cambios[campo] = dato[campo];
      void auditar(prisma, {
        actor: req.usuario.id_usuario,
        accion: `${req.method}_${req.baseUrl.replaceAll('/', '')}`,
        entidad: req.baseUrl.replaceAll('/', ''),
        referencia: identificador?.[1] || req.params.id || 'creacion',
        cambios
      }).catch(e => console.error('No se registró auditoría de catálogo:', e.code || e.message));
      return json(data);
    };
    next();
  };
}
