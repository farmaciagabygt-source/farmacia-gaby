import {auditar} from '../utils/operacion.js';
import prisma from '../config/prisma.js';
import { crearPago, obtenerPagosPorPedido, cancelarPagosPendientes } from './pagosService.js';
import { obtenerReservaPorPedido, confirmarReservaInventario, liberarReservaInventario, consumirReservaInventario } from './inventarioService.js';
const fallo=(status,message)=>Object.assign(new Error(message),{status});
const pendientes=['BORRADOR','PENDIENTE_RECETA','PENDIENTE_CONFIRMACION','REVISION'];
const include={rel_detalle_pedido_id_pedido:true,rel_pedido_contacto_id_pedido:true,rel_pedido_facturacion_id_pedido:true,rel_historial_pedido_id_pedido:true,rel_envio_id_pedido:true};
export async function conPedido(id,fn){
 if(!Number.isSafeInteger(id)||id<=0)throw fallo(400,'Pedido inválido.');
 return prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT pg_advisory_xact_lock(${id}::bigint)::text`;const p=await tx.pedido.findUnique({where:{id_pedido:id},include});if(!p)throw fallo(404,'Pedido no encontrado.');return fn(tx,p);},{timeout:45000,maxWait:45000});
}
async function reservaPedido(id){try{return await obtenerReservaPorPedido(id);}catch(e){if(e.status===404)return null;throw e;}}
async function registrar(tx,p,estado,motivo,id_actor=null){
 const data={estado,version:{increment:1},...(estado==='CANCELADO'?{cancelado_at:new Date(),motivo_cancelacion:motivo}:estado==='CONFIRMADO'?{confirmado_at:p.confirmado_at||new Date()}: {})};
 const actualizado=await tx.pedido.update({where:{id_pedido:p.id_pedido},data,include});
 await tx.historialPedido.create({data:{id_pedido:p.id_pedido,estado_anterior:p.estado,estado_nuevo:estado,motivo,id_actor,evento_origen:`OPERACION-${p.id_pedido}-${p.version}-${estado}`}});
 await auditar(tx,{actor:id_actor,accion:'CAMBIAR_PEDIDO',entidad:'Pedido',referencia:p.id_pedido,cambios:{antes:p.estado,estado}});
 if(p.modalidad==='DOMICILIO'){
  let envio=await tx.envio.findFirst({where:{id_pedido:p.id_pedido}});
  if(!envio&&estado==='CONFIRMADO'){
   const c=p.rel_pedido_contacto_id_pedido[0];
   if(!c?.direccion)throw fallo(409,'Faltan datos de entrega para confirmar este pedido.');
   envio=await tx.envio.create({data:{id_pedido:p.id_pedido,numero_seguimiento:`ENV-${p.numero}`,destino_historico:{destinatario:c.destinatario||c.comprador_nombre,telefono:c.telefono_entrega||c.comprador_telefono,departamento:c.departamento,municipio:c.municipio,zona:c.zona,direccion:c.direccion,referencias:c.referencias,instrucciones:c.instrucciones},costo:p.envio,estado:'PENDIENTE'}});
  }
  const destino={CONFIRMADO:'PENDIENTE',PREPARANDO:'PREPARANDO',EN_ENTREGA:'EN_RUTA',COMPLETADO:'ENTREGADO',CANCELADO:'CANCELADO'}[estado];
  if(envio&&destino){await tx.envio.update({where:{id_envio:envio.id_envio},data:{estado:destino,...(destino==='EN_RUTA'?{despachado_at:new Date()}:destino==='ENTREGADO'?{entregado_at:new Date()}: {})}});await tx.eventoEnvio.create({data:{id_envio:envio.id_envio,estado:destino,motivo:motivo,id_actor,clave_evento:`ENTREGA-${p.id_pedido}-${p.version}-${destino}`}});}
  return tx.pedido.findUnique({where:{id_pedido:p.id_pedido},include});
 }
 return actualizado;
}
async function cancelar(tx,p,motivo,actor,{vencimiento=false,personal=false}={}){
 if(p.estado==='CANCELADO')return p;
 if(!(pendientes.includes(p.estado)||p.estado==='CONFIRMADO'||(personal&&['PREPARANDO','LISTO','EN_ENTREGA'].includes(p.estado))))throw fallo(409,'Este pedido ya no puede cancelarse desde esta operación.');
 const r=await reservaPedido(p.id_pedido);
 if(vencimiento){
  if(r&&r.vence_at&&new Date(r.vence_at)>new Date()&&['ACTIVA','CONFIRMADA'].includes(r.estado))return p;
  if(!r&&p.created_at>new Date(Date.now()-30*60000))return p;
  if(r?.estado==='CONSUMIDA')return p;
 }
 // Pago e inventario aceptan reintentos. Si falla un servicio, el pedido conserva
 // su estado y el próximo intento reconcilia las operaciones ya realizadas.
 await cancelarPagosPendientes(p.id_pedido);
 if(r&&['ACTIVA','CONFIRMADA'].includes(r.estado))await liberarReservaInventario(r.id_reserva_inventario,actor,motivo);
 else if(r?.estado==='CONSUMIDA')throw fallo(409,'El inventario ya se entregó. Solicita atención a la farmacia.');
 return registrar(tx,p,'CANCELADO',motivo,actor);
}
export const cancelarPedidoCliente=(id,actor,motivo='Cancelado por el cliente')=>conPedido(id,(tx,p)=>cancelar(tx,p,motivo,actor));
export const vencerPedido=id=>conPedido(id,(tx,p)=>cancelar(tx,p,'Venció el plazo para confirmar o recibir el pedido',null,{vencimiento:true}));
export async function cambiarEstado(id,estado,motivo,actor,{servicio=false,roles=[]}={}){
 return conPedido(id,async(tx,p)=>{
  if(estado==='CONFIRMADO'&&servicio&&['PREPARANDO','LISTO','EN_ENTREGA','COMPLETADO'].includes(p.estado)){
   const pagos=await obtenerPagosPorPedido(id);
   if(!pagos.some(x=>['AUTORIZADO','CONFIRMADO'].includes(x.estado)&&Number(x.monto)===Number(p.total)&&x.moneda===p.moneda))throw fallo(409,'El cobro no coincide con el total y moneda del pedido.');
   return p;
  }
  if(p.estado===estado)return p;
  if(estado==='CANCELADO'&&roles.includes('CAJERO')&&!roles.includes('ADMINISTRADOR')&&!pendientes.includes(p.estado)&&p.estado!=='CONFIRMADO')throw fallo(403,'La cancelación de un pedido preparado requiere administrador.');
  if(estado==='CANCELADO')return cancelar(tx,p,motivo||'Pedido cancelado por la farmacia',actor,{personal:true});
  const siguientes={BORRADOR:['PENDIENTE_CONFIRMACION','REVISION'],PENDIENTE_RECETA:['PENDIENTE_CONFIRMACION','REVISION'],PENDIENTE_CONFIRMACION:['CONFIRMADO','REVISION'],CONFIRMADO:['PREPARANDO','REVISION'],PREPARANDO:['LISTO','REVISION'],LISTO:['EN_ENTREGA','COMPLETADO','REVISION'],EN_ENTREGA:['COMPLETADO','REVISION'],REVISION:['PENDIENTE_CONFIRMACION']};
  if(!siguientes[p.estado]?.includes(estado))throw fallo(409,`No se permite cambiar el pedido de ${p.estado} a ${estado}.`);
  if(estado==='EN_ENTREGA'&&p.modalidad!=='DOMICILIO')throw fallo(409,'Este pedido es de retiro en sucursal.');
  if(estado==='CONFIRMADO'||estado==='COMPLETADO'){
   const r=await reservaPedido(id);if(!r)throw fallo(409,'No existe reserva para este pedido.');
   if(estado==='CONFIRMADO'){
    const pagos=await obtenerPagosPorPedido(id);if(!pagos.some(x=>['AUTORIZADO','CONFIRMADO'].includes(x.estado)))throw fallo(409,'Registra o confirma el pago antes de confirmar el pedido.');
    if(r.estado!=='CONFIRMADA')await confirmarReservaInventario(r.id_reserva_inventario,actor);
   }else{
    const pagos=await obtenerPagosPorPedido(id);if(!pagos.some(x=>x.estado==='CONFIRMADO'))throw fallo(409,'El pago debe estar confirmado antes de entregar o completar el pedido.');
    if(r.estado!=='CONSUMIDA')await consumirReservaInventario(r.id_reserva_inventario,actor);
   }
  }
  return registrar(tx,p,estado,motivo||'Estado actualizado por la farmacia',actor);
 });
}
export async function iniciarPago(id,metodo){
 if(metodo!=='EFECTIVO')throw fallo(409,'En esta etapa está disponible efectivo al retirar o recibir. No hay una pasarela de tarjeta o transferencia configurada.');
 return conPedido(id,async(tx,p)=>{
  if(!['PENDIENTE_CONFIRMACION','CONFIRMADO'].includes(p.estado))throw fallo(409,'Este pedido no admite iniciar un pago.');
  const r=await reservaPedido(id);if(!r||!['ACTIVA','CONFIRMADA'].includes(r.estado)||new Date(r.vence_at)<=new Date())throw fallo(409,'La reserva venció. Actualiza el pedido para consultar su estado.');
  const pagos=await obtenerPagosPorPedido(id);const activo=pagos.find(x=>['PENDIENTE','AUTORIZADO','CONFIRMADO'].includes(x.estado));
  const pago=activo||await crearPago({id_pedido:id,id_cliente:p.id_cliente,monto:p.total,moneda:p.moneda,metodo,clave_idempotencia:`PAGO-${p.clave_idempotencia}-${pagos.length+1}`});
  if(p.estado==='PENDIENTE_CONFIRMACION'){
   if(r.estado==='ACTIVA')await confirmarReservaInventario(r.id_reserva_inventario,null,new Date(Date.now()+48*3600000).toISOString());
   p=await registrar(tx,p,'CONFIRMADO','Pago en efectivo pendiente de cobro; solicitud aceptada');
  }
  return {pedido:p,pago,message:'Pago en efectivo registrado como pendiente. La farmacia confirmará el cobro.'};
 });
}
export async function informacionOperacion(p){
 const r=await reservaPedido(p.id_pedido);
 return {reserva:r?{estado:r.estado,vence_at:r.vence_at}:null,puede_cancelar:[...pendientes,'CONFIRMADO'].includes(p.estado),metodos_disponibles:['EFECTIVO']};
}
export async function procesarVencimientos(){
 let cursor=0;
 while(true){const candidatos=await prisma.pedido.findMany({where:{id_pedido:{gt:cursor},estado:{in:[...pendientes,'CONFIRMADO']}},select:{id_pedido:true},orderBy:{id_pedido:'asc'},take:100});if(!candidatos.length)break;
 for(const p of candidatos){cursor=p.id_pedido;try{await vencerPedido(p.id_pedido);}catch(e){if(e.status!==409)console.error('Vencimiento pendiente de reintento:',p.id_pedido,e.message);}}
 }
}
export function iniciarVencimientos(){let ocupado=false;const ejecutar=async()=>{if(ocupado)return;ocupado=true;try{await procesarVencimientos();}catch(e){console.error('No se pudo revisar vencimientos:',e.message);}finally{ocupado=false;}};const timer=setInterval(ejecutar,60000);timer.unref();void ejecutar();}
