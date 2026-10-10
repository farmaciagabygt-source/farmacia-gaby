import prisma from "../config/prisma.js";

// Crear envío de un pedido
import { conPedido } from '../services/pedidoOperacion.js';
export const crearEnvio=async(req,res)=>{try{
 const b=req.body||{};const resultado=await conPedido(Number(b.id_pedido),async(tx,p)=>{
  if(p.modalidad!=='DOMICILIO'||!['CONFIRMADO','PREPARANDO','LISTO','EN_ENTREGA'].includes(p.estado))throw Object.assign(new Error('El pedido no admite un envío.'),{status:409});
  if(await tx.envio.findFirst({where:{id_pedido:p.id_pedido}}))throw Object.assign(new Error('El pedido ya tiene un envío registrado.'),{status:409});
  if(typeof b.numero_seguimiento!=='string'||!b.numero_seguimiento.trim()||b.numero_seguimiento.length>100)throw Object.assign(new Error('Número de seguimiento inválido.'),{status:400});
  const c=p.rel_pedido_contacto_id_pedido[0];
  return tx.envio.create({data:{id_pedido:p.id_pedido,numero_seguimiento:b.numero_seguimiento.trim(),transportista:b.transportista||null,destino_historico:{destinatario:c.destinatario||c.comprador_nombre,telefono:c.telefono_entrega||c.comprador_telefono,departamento:c.departamento,municipio:c.municipio,zona:c.zona,direccion:c.direccion},costo:p.envio,estado:'PENDIENTE'}});
 });res.status(201).json(resultado);
 }catch(e){res.status(e.status||500).json({message:e.status?e.message:'No se pudo crear el envío.'});}};

// Obtener envío de un pedido
export const obtenerEnvioPorPedido = async (req, res) => {
    try {
        const { id_pedido } = req.params;

        const envio = await prisma.envio.findFirst({
            where: {
                id_pedido: Number(id_pedido),
            },
        });

        if (!envio) {
            return res.status(404).json({
                message: "Envío no encontrado",
            });
        }

        res.status(200).json(envio);
    } catch (error) {
        console.error("Error al obtener envío:", error);

        res.status(500).json({
            message: "Error al obtener el envío",
        });
    }
};