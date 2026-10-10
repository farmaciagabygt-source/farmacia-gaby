import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';
import {rolesIniciales} from '../prisma/seed/roles.js';
try{
 await prisma.$transaction(async tx=>{
  await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(905101)::text');
  for(const rol of rolesIniciales)await tx.rol.upsert({where:{codigo:rol.codigo},update:{},create:{...rol,estado:'ACTIVO'}});
  const rol=await tx.rol.findUnique({where:{codigo:'ADMINISTRADOR'}});
  const administrador=await tx.usuarioRol.findFirst({where:{id_rol:rol.id_rol,ref_id_usuario:{estado:'ACTIVO'}}});
  if(administrador){console.log('Administrador existente conservado.');return;}
  const correo=(process.env.INITIAL_ADMIN_EMAIL||'').trim().toLowerCase(),password=process.env.INITIAL_ADMIN_PASSWORD||'';
  if(!/^[^ @]+@[^ @]+[.][^ @]+$/.test(correo)||password.length<12||Buffer.byteLength(password)>72||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))throw Error('Primer despliegue: configura INITIAL_ADMIN_EMAIL y INITIAL_ADMIN_PASSWORD segura (12–72 bytes, mayúscula, minúscula y número).');
  if(await tx.usuario.findUnique({where:{correo}}))throw Error('El correo inicial ya pertenece a una cuenta. No se cambian sus permisos.');
  await tx.usuario.create({data:{nombre_completo:'Administrador Farmacia Gaby',correo,password_hash:await bcrypt.hash(password,12),estado:'ACTIVO',rel_usuario_rol_id_usuario:{create:{id_rol:rol.id_rol}}}});
  console.log('Administrador inicial creado. Retira INITIAL_ADMIN_PASSWORD de Railway después del primer despliegue.');
 });
}finally{await prisma.$disconnect();}
