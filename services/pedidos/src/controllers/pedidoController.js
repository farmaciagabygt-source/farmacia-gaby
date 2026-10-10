import prisma from "../config/prisma.js";
import { obtenerSucursalInventario } from "../services/inventarioService.js";
import { cambiarEstado, iniciarPago, informacionOperacion, cancelarPedidoCliente } from "../services/pedidoOperacion.js";

import {
    crearPago,
    obtenerPagosPorPedido,
} from "../services/pagosService.js";
// Listar pedidos
export const listarPedidos = async (req, res) => {
    try {
        const pedidos = await prisma.pedido.findMany({
            orderBy: {
                created_at: "desc",
            },
            include: {
                rel_detalle_pedido_id_pedido: true,
                rel_pedido_contacto_id_pedido: true,
                rel_pedido_facturacion_id_pedido: true,
                rel_historial_pedido_id_pedido: true,
                rel_envio_id_pedido: true,
            },
        });

        res.status(200).json(pedidos);
    } catch (error) {
        console.error("Error al listar pedidos:", error);

        res.status(500).json({
            message: "Error al listar los pedidos",
        });
    }
};

// Obtener pedido por ID
export const obtenerPedido = async (req, res) => {
    try {
        const { id } = req.params;

        const pedido = await prisma.pedido.findUnique({
            where: {
                id_pedido: Number(id),
            },
            include: {
                rel_detalle_pedido_id_pedido: true,
                rel_pedido_contacto_id_pedido: true,
                rel_pedido_facturacion_id_pedido: true,
                rel_historial_pedido_id_pedido: true,
                rel_envio_id_pedido: true,
            },
        });

        if (!pedido) {
            return res.status(404).json({
                message: "Pedido no encontrado",
            });
        }

        res.status(200).json({ ...pedido, sucursal: await obtenerSucursalInventario(pedido.id_sucursal), operacion: await informacionOperacion(pedido) });
    } catch (error) {
        console.error("Error al obtener pedido:", error);

        res.status(500).json({
            message: "Error al obtener el pedido",
        });
    }
};

import { randomUUID } from "crypto";


import {
    obtenerReservaPorPedido,
    confirmarReservaInventario,
    liberarReservaInventario,
    consumirReservaInventario,
} from "../services/inventarioService.js";

import { crearPedidoCheckout } from '../services/checkoutService.js';
export const crearPedido = async (req, res) => {
  try { const { status, ...resultado } = await crearPedidoCheckout(req.body); return res.status(status).json(resultado); }
  catch (error) { console.error('Error al crear pedido:', error.message); return res.status(error.status || 500).json({ message: error.status ? error.message : 'No se pudo crear el pedido. Reintenta con los mismos datos.' }); }
};

// Cambiar estado de un pedido
export const cambiarEstadoPedido=async(req,res)=>{try{res.json(await cambiarEstado(Number(req.params.id),req.body?.estado,req.body?.motivo,req.body?.id_actor,{servicio:!!req.origenServicio,roles:req.usuario?.roles||[]}));}catch(e){res.status(e.status||500).json({message:e.data?.message||e.message});}};
export const iniciarPagoPedido=async(req,res)=>{try{if(req.identidad?.tipo==='PERSONAL'&&!req.identidad.roles.some(r=>['ADMINISTRADOR','CAJERO'].includes(r)))return res.status(403).json({message:'Solo caja puede aceptar el pago en efectivo.'});res.status(200).json(await iniciarPago(Number(req.params.id),req.body?.metodo));}catch(e){res.status(e.status||500).json({message:e.data?.message||e.message});}};
export const cancelarPedido=async(req,res)=>{try{if(req.body?.motivo!=null&&(typeof req.body.motivo!=='string'||req.body.motivo.length>500))return res.status(400).json({message:'El motivo debe ser texto de hasta 500 caracteres.'});res.json(await cancelarPedidoCliente(Number(req.params.id),req.identidad?.id_usuario??null,req.body?.motivo?.trim()||'Cancelado por el cliente'));}catch(e){res.status(e.status||500).json({message:e.data?.message||e.message});}};

// Consultar pagos de un pedido
export const consultarPagosPedido = async (req, res) => {
    try {
        const { id } = req.params;

        const pedido = await prisma.pedido.findUnique({
            where: {
                id_pedido: Number(id),
            },
        });

        if (!pedido) {
            return res.status(404).json({
                message: "Pedido no encontrado",
            });
        }

        const pagos = await obtenerPagosPorPedido(
            pedido.id_pedido
        );

        res.status(200).json({
            pedido: {
                id_pedido: pedido.id_pedido,
                numero: pedido.numero,
                total: pedido.total,
                moneda: pedido.moneda,
                estado: pedido.estado,
            },
            pagos: pagos.map(p=>({id_pago:p.id_pago,monto:p.monto,moneda:p.moneda,metodo:p.metodo,estado:p.estado,created_at:p.created_at,confirmado_at:p.confirmado_at})),
        });
    } catch (error) {
        console.error(
            "Error al consultar pagos del pedido:",
            error
        );

        res.status(error.status || 500).json({
            message:
                error.data?.message ??
                "Error al consultar los pagos del pedido",
        });
    }
};

export const listarMisPedidos = async (req, res) => {
    try {
        const pedidos = await prisma.pedido.findMany({
            where: {
                id_cliente: req.identidad.id_cliente,
            },
            orderBy: {
                created_at: "desc",
            },
            include: {
                rel_detalle_pedido_id_pedido: true,
                rel_envio_id_pedido: true,
            },
        });

        res.status(200).json(pedidos);
    } catch (error) {
        console.error("Error al listar mis pedidos:", error);

        res.status(500).json({
            message: "Error al listar los pedidos",
        });
    }
};