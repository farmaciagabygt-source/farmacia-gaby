import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { verificarToken, soloAdministrador } from '../middlewares/authMiddleware.js';
import { fallo, positivo, texto, auditar, responder, consultarAuditoria } from '../utils/operacion.js';
const router = express.Router();
router.use(verificarToken, soloAdministrador);
const include = {
  rel_usuario_rol_id_usuario: {
    include: {
      ref_id_rol: true
    }
  }
};
const publico = u => ({
  id_usuario: u.id_usuario,
  nombre_completo: u.nombre_completo,
  correo: u.correo,
  telefono: u.telefono,
  estado: u.estado,
  ultimo_acceso: u.ultimo_acceso,
  created_at: u.created_at,
  roles: u.rel_usuario_rol_id_usuario.map(r => r.ref_id_rol.codigo)
});
const rolesPermitidos = ['ADMINISTRADOR', 'CAJERO', 'INVENTARIO', 'DESPACHO', 'CLIENTE'];
function validar(body, crear = false) {
  const data = {
    nombre_completo: texto(body.nombre_completo, 'Nombre', 150),
    correo: texto(body.correo, 'Correo', 254).toLowerCase(),
    telefono: body.telefono ? texto(body.telefono, 'Teléfono', 25) : null
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) throw fallo(400, 'Correo inválido.');
  if (!Array.isArray(body.roles) || !body.roles.length || body.roles.some(r => !rolesPermitidos.includes(r)) || new Set(body.roles).size !== body.roles.length) throw fallo(400, 'Selecciona roles válidos, sin duplicados.');
  if (body.roles.includes('CLIENTE') && body.roles.length !== 1) throw fallo(400, 'Separa cuentas de cliente y personal.');
  if (crear) {
    if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 72 || !/[A-Z]/.test(body.password) || !/[a-z]/.test(body.password) || !/[0-9]/.test(body.password)) throw fallo(400, 'La contraseña inicial requiere 12–72 caracteres, mayúscula, minúscula y número.');
  }
  return data;
}
async function validarUltimo(tx, u, roles, estado) {
  if (u.estado === 'ACTIVO' && u.rel_usuario_rol_id_usuario.some(r => r.ref_id_rol.codigo === 'ADMINISTRADOR') && (estado !== 'ACTIVO' || !roles.includes('ADMINISTRADOR'))) {
    const otros = await tx.usuario.count({
      where: {
        id_usuario: {
          not: u.id_usuario
        },
        estado: 'ACTIVO',
        rel_usuario_rol_id_usuario: {
          some: {
            ref_id_rol: {
              codigo: 'ADMINISTRADOR',
              estado: 'ACTIVO'
            }
          }
        }
      }
    });
    if (!otros) throw fallo(409, 'Debe permanecer al menos un administrador activo.');
  }
}
router.get('/resumen', responder(async () => ({
  usuarios: await prisma.usuario.count()
})));
router.get('/usuarios', responder(async () => {
  const usuarios = await prisma.usuario.findMany({
    include,
    orderBy: {
      id_usuario: 'desc'
    }
  });
  return usuarios.map(publico);
}));
router.get('/roles', responder(() => prisma.rol.findMany({
  where: {
    estado: 'ACTIVO',
    codigo: {
      in: rolesPermitidos
    }
  },
  select: {
    id_rol: true,
    codigo: true,
    nombre: true
  },
  orderBy: {
    id_rol: 'asc'
  }
})));
router.get('/usuarios/:id', responder(async req => {
  const u = await prisma.usuario.findUnique({
    where: {
      id_usuario: positivo(req.params.id)
    },
    include
  });
  if (!u) throw fallo(404, 'Usuario no encontrado.');
  return publico(u);
}));
router.post('/usuarios', responder(async req => {
  const data = validar(req.body, true),
    password_hash = await bcrypt.hash(req.body.password, 12);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(905100)::text`;
    if (await tx.usuario.findUnique({
      where: {
        correo: data.correo
      }
    })) throw fallo(409, 'El correo ya está registrado.');
    const roles = await tx.rol.findMany({
      where: {
        codigo: {
          in: req.body.roles
        },
        estado: 'ACTIVO'
      }
    });
    if (roles.length !== req.body.roles.length) throw fallo(409, 'Un rol seleccionado no está configurado.');
    const u = await tx.usuario.create({
      data: {
        ...data,
        password_hash,
        rel_usuario_rol_id_usuario: {
          create: roles.map(r => ({
            id_rol: r.id_rol,
            asignado_por: req.usuario.id_usuario
          }))
        },
        ...(req.body.roles.includes('CLIENTE') ? {
          rel_cliente_id_usuario: {
            create: {}
          }
        } : {})
      },
      include
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'CREAR_USUARIO',
      entidad: 'Usuario',
      referencia: u.id_usuario,
      cambios: {
        roles: req.body.roles,
        estado: u.estado
      }
    });
    return publico(u);
  });
}));
router.put('/usuarios/:id', responder(async req => {
  const id = positivo(req.params.id),
    data = validar(req.body);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(905100)::text`;
    const u = await tx.usuario.findUnique({
      where: {
        id_usuario: id
      },
      include
    });
    if (!u) throw fallo(404, 'Usuario no encontrado.');
    await validarUltimo(tx, u, req.body.roles, u.estado);
    if (id === req.usuario.id_usuario && !req.body.roles.includes('ADMINISTRADOR')) throw fallo(409, 'No puedes quitarte tu acceso administrativo.');
    const duplicado = await tx.usuario.findUnique({
      where: {
        correo: data.correo
      }
    });
    if (duplicado && duplicado.id_usuario !== id) throw fallo(409, 'El correo ya está registrado.');
    const roles = await tx.rol.findMany({
      where: {
        codigo: {
          in: req.body.roles
        },
        estado: 'ACTIVO'
      }
    });
    if (roles.length !== req.body.roles.length) throw fallo(409, 'Rol no disponible.');
    await tx.usuarioRol.deleteMany({
      where: {
        id_usuario: id
      }
    });
    await tx.usuarioRol.createMany({
      data: roles.map(r => ({
        id_usuario: id,
        id_rol: r.id_rol,
        asignado_por: req.usuario.id_usuario
      }))
    });
    if (req.body.roles.includes('CLIENTE')) await tx.cliente.upsert({
      where: {
        id_usuario: id
      },
      create: {
        id_usuario: id
      },
      update: {}
    });
    const actualizado = await tx.usuario.update({
      where: {
        id_usuario: id
      },
      data: {
        ...data,
        version_seguridad: {
          increment: 1
        }
      },
      include
    });
    await tx.sesion.updateMany({
      where: {
        id_usuario: id,
        revocada_at: null
      },
      data: {
        revocada_at: new Date()
      }
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'ACTUALIZAR_USUARIO',
      entidad: 'Usuario',
      referencia: id,
      cambios: {
        roles_anteriores: publico(u).roles,
        roles: req.body.roles,
        sesion_revocada: true
      }
    });
    return publico(actualizado);
  });
}));
router.patch('/usuarios/:id/estado', responder(async req => {
  const id = positivo(req.params.id),
    estado = req.body.estado;
  if (!['ACTIVO', 'INACTIVO'].includes(estado)) throw fallo(400, 'Estado inválido.');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(905100)::text`;
    const u = await tx.usuario.findUnique({
      where: {
        id_usuario: id
      },
      include
    });
    if (!u) throw fallo(404, 'Usuario no encontrado.');
    if (u.estado === estado) return publico(u);
    if (id === req.usuario.id_usuario && estado === 'INACTIVO') throw fallo(409, 'No puedes desactivar tu propia cuenta.');
    await validarUltimo(tx, u, publico(u).roles, estado);
    const actualizado = await tx.usuario.update({
      where: {
        id_usuario: id
      },
      data: {
        estado,
        version_seguridad: {
          increment: 1
        }
      },
      include
    });
    await tx.sesion.updateMany({
      where: {
        id_usuario: id,
        revocada_at: null
      },
      data: {
        revocada_at: new Date()
      }
    });
    await auditar(tx, {
      actor: req.usuario.id_usuario,
      accion: 'CAMBIAR_ESTADO_USUARIO',
      entidad: 'Usuario',
      referencia: id,
      cambios: {
        antes: u.estado,
        estado
      }
    });
    return publico(actualizado);
  });
}));
router.get('/bitacora', consultarAuditoria(prisma));
export default router;
