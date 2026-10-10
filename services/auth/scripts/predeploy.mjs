import 'dotenv/config';
import pg from 'pg';
import {spawnSync} from 'node:child_process';
const service=process.env.GABY_SERVICE;
const required={auth:[],catalogo:['AUTH_URL'],inventario:['AUTH_URL','CATALOGO_URL'],pedidos:['AUTH_URL','CATALOGO_URL','INVENTARIO_URL','PAGOS_URL'],pagos:['AUTH_URL','PEDIDOS_URL']};
if(!Object.hasOwn(required,service))throw Error('GABY_SERVICE inválido.');
const db=new URL(process.env.DATABASE_URL||'');
if(!['postgres:','postgresql:'].includes(db.protocol)||!db.pathname.startsWith('/')||!/^[a-zA-Z0-9_]+$/.test(db.pathname.slice(1)))throw Error('DATABASE_URL inválida.');
if(process.env.NODE_ENV==='production'){
 if(['localhost','127.0.0.1','postgres'].includes(db.hostname))throw Error('DATABASE_URL debe apuntar a PostgreSQL de Railway.');
 for(const key of ['JWT_SECRET','SERVICE_API_KEY'])if(!process.env[key]||process.env[key].length<32||/cambiar_esta|change_me|ejemplo/i.test(process.env[key]))throw Error(key+' requiere una clave nueva de 32 caracteres o más.');
 const origins=(process.env.CORS_ORIGINS||'').split(',');
 for(const value of origins){const u=new URL(value.trim());if(u.protocol!=='https:'||u.origin!==value.trim()||u.hostname==='localhost')throw Error('CORS_ORIGINS requiere los orígenes HTTPS exactos de Vercel.');}
 for(const key of required[service]){const u=new URL(process.env[key]||'');if(!['http:','https:'].includes(u.protocol)||['localhost','127.0.0.1'].includes(u.hostname))throw Error(key+' requiere la URL del servicio de Railway.');}
}
// Un PostgreSQL y cinco bases independientes. Nunca borra ni reinicializa bases existentes.
const nombre=db.pathname.slice(1),adminUrl=new URL(db);adminUrl.pathname='/postgres';
const client=new pg.Client({connectionString:adminUrl.href});
try{await client.connect();await client.query('SELECT pg_advisory_lock(hashtext($1))',['gabyfarma-crear-'+nombre]);const existe=await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[nombre]);if(!existe.rowCount){await client.query('CREATE DATABASE "'+nombre+'"');console.log('Base independiente creada: '+nombre);}else console.log('Base existente conservada: '+nombre);}finally{await client.end();}
const r=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{stdio:'inherit',env:process.env});if(r.status!==0)process.exit(r.status||1);
if(service==='auth'){await import('./bootstrap-admin.mjs');}
console.log('Migraciones completadas para '+service);process.exit(0);
