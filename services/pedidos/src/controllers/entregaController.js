import prisma from '../config/prisma.js';
import { cotizarCheckout } from '../services/checkoutService.js';
export async function cotizarPedido(req,res){try{res.json(await cotizarCheckout(req.body));}catch(e){res.status(e.status||500).json({message:e.status?e.message:'No se pudo calcular el total del pedido.'});}}
export async function configuracionEntrega(req,res){
 const id=Number(req.query.id_sucursal);if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({message:'Sucursal inválida.'});
 try{const ahora=new Date();const tarifas=await prisma.tarifaEntrega.findMany({where:{id_sucursal:id,desde:{lte:ahora},OR:[{hasta:null},{hasta:{gt:ahora}}],ref_id_zona:{activa:true}},include:{ref_id_zona:true},orderBy:{desde:'desc'}});
 res.json(tarifas.map(t=>({departamento:t.ref_id_zona.departamento,municipio:t.ref_id_zona.municipio,zonas:t.ref_id_zona.zonas,importe:t.importe,minimo_compra:t.minimo_compra,umbral_gratis:t.umbral_gratis,plazo_minutos:t.plazo_minutos})));}catch{res.status(500).json({message:'No se pudo consultar la cobertura de entrega.'});}
}
