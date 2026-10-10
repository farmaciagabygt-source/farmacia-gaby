import {auditar} from '../utils/operacion.js';
import prisma from '../config/prisma.js';
import { confirmarPedido, cancelarPedido } from './pedidosService.js';
const fallo=(status,message)=>Object.assign(new Error(message),{status});
const bloqueados=['AUTORIZADO','CONFIRMADO','REEMBOLSADO_PARCIAL'];
async function bloquear(tx,id){await tx.$queryRaw`SELECT pg_advisory_xact_lock(${id}::bigint)::text`;}
// No realiza callbacks: el servicio de pedidos coordina la liberación y el estado.
export async function cancelarPendientes(id){
 return prisma.$transaction(async tx=>{
  await bloquear(tx,id);
  const pagos=await tx.pago.findMany({where:{id_pedido:id}});
  if(pagos.some(p=>bloqueados.includes(p.estado)))throw fallo(409,'Hay un pago autorizado o confirmado. La farmacia debe revisar la cancelación.');
  const ids=pagos.filter(p=>p.estado==='PENDIENTE').map(p=>p.id_pago);
  await tx.intentoPago.updateMany({where:{id_pago:{in:ids},estado:'PENDIENTE'},data:{estado:'CANCELADO',finalizado_at:new Date()}});
  await tx.pago.updateMany({where:{id_pago:{in:ids},estado:'PENDIENTE'},data:{estado:'CANCELADO',version:{increment:1}}});
  return {cancelados:ids.length};
 });
}
export async function cambiarPago(id,estado,actor=null){
 const base=await prisma.pago.findUnique({where:{id_pago:id}});if(!base)throw fallo(404,'Pago no encontrado.');
 const permitido={PENDIENTE:['AUTORIZADO','CONFIRMADO','FALLIDO','CANCELADO'],AUTORIZADO:['CONFIRMADO','FALLIDO','CANCELADO']};
 // Se registra la autorización antes del callback para bloquear una cancelación concurrente.
 const pago=await prisma.$transaction(async tx=>{
  await bloquear(tx,base.id_pedido);const actual=await tx.pago.findUnique({where:{id_pago:id}});
  if(actual.estado===estado)return actual;
  if(!permitido[actual.estado]?.includes(estado))throw fallo(409,`No se permite cambiar el pago de ${actual.estado} a ${estado}.`);
  await auditar(tx,{actor,accion:'CAMBIAR_PAGO',entidad:'Pago',referencia:id,cambios:{antes:actual.estado,estado:estado==='CONFIRMADO'?'AUTORIZADO':estado,id_pedido:actual.id_pedido}});
  if(estado==='CONFIRMADO')return tx.pago.update({where:{id_pago:id},data:{estado:'AUTORIZADO',autorizado_at:actual.autorizado_at||new Date(),version:{increment:1}}});
  if(estado==='CANCELADO')return actual;
  await tx.intentoPago.updateMany({where:{id_pago:id,estado:{in:['PENDIENTE','AUTORIZADO']}},data:{estado:estado==='AUTORIZADO'?'AUTORIZADO':'FALLIDO',...(estado==='FALLIDO'?{finalizado_at:new Date()}: {})}});
  return tx.pago.update({where:{id_pago:id},data:{estado,...(estado==='AUTORIZADO'?{autorizado_at:new Date()}:{}),version:{increment:1}}});
 });
 if(pago.estado===estado)return pago;
 if(estado==='CONFIRMADO')await confirmarPedido(pago.id_pedido);
 else if(estado==='CANCELADO')await cancelarPedido(pago.id_pedido,null,'Pago cancelado por la farmacia');
 else return pago;
 return prisma.$transaction(async tx=>{
  await bloquear(tx,pago.id_pedido);
  const actual=await tx.pago.findUnique({where:{id_pago:id}});
  if(actual.estado===estado)return actual;
  if(estado==='CONFIRMADO'&&actual.estado!=='AUTORIZADO')throw fallo(409,'El pago cambió durante la confirmación.');
  await tx.intentoPago.updateMany({where:{id_pago:id,estado:{in:['PENDIENTE','AUTORIZADO']}},data:{estado,finalizado_at:new Date()}});
  await auditar(tx,{actor,accion:'CONFIRMAR_COBRO',entidad:'Pago',referencia:id,cambios:{estado,id_pedido:actual.id_pedido}});
  return tx.pago.update({where:{id_pago:id},data:{estado,...(estado==='CONFIRMADO'?{confirmado_at:new Date()}:{}),version:{increment:1}}});
 });
}
