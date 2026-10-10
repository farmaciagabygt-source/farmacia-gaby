import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
export async function verificarToken(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (typeof h !== 'string' || !h.startsWith('Bearer ')) return res.status(401).json({
      message: 'Token requerido.'
    });
    const p = jwt.verify(h.slice(7), process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    const u = await prisma.usuario.findUnique({
      where: {
        id_usuario: Number(p.id_usuario)
      },
      include: {
        rel_usuario_rol_id_usuario: {
          include: {
            ref_id_rol: true
          }
        },
        rel_cliente_id_usuario: {
          select: {
            id_cliente: true
          }
        }
      }
    });
    if (!u || u.estado !== 'ACTIVO' || u.version_seguridad !== p.version_seguridad) return res.status(401).json({
      message: 'Tu sesión cambió o la cuenta está inactiva. Inicia sesión nuevamente.'
    });
    req.usuario = {
      id_usuario: u.id_usuario,
      id_cliente: u.rel_cliente_id_usuario[0]?.id_cliente ?? null,
      roles: u.rel_usuario_rol_id_usuario.filter(r => r.ref_id_rol.estado === 'ACTIVO').map(r => r.ref_id_rol.codigo),
      version_seguridad: u.version_seguridad
    };
    next();
  } catch {
    res.status(401).json({
      message: 'Token inválido o expirado.'
    });
  }
}
export const soloAdministrador = (req, res, next) => req.usuario?.roles?.includes('ADMINISTRADOR') ? next() : res.status(403).json({
  message: 'Se requieren permisos administrativos.'
});
