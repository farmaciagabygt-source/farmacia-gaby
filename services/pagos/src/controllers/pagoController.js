import prisma from "../config/prisma.js";
import { cambiarPago, cancelarPendientes } from "../services/pagoOperacion.js";

import {
    confirmarPedido,
    cancelarPedido,
} from "../services/pedidosService.js";

// Listar pagos
export const listarPagos = async (req, res) => {
    try {
        const pagos = await prisma.pago.findMany({
            include: {
                rel_intento_pago_id_pago: true,
                rel_reembolso_id_pago: true,
            },
            orderBy: {
                created_at: "desc",
            },
        });

        res.status(200).json(pagos);
    } catch (error) {
        console.error("Error al listar pagos:", error);

        res.status(500).json({
            message: "Error al listar los pagos",
        });
    }
};

// Obtener pago por ID
export const obtenerPago = async (req, res) => {
    try {
        const { id } = req.params;

        const pago = await prisma.pago.findUnique({
            where: {
                id_pago: Number(id),
            },
            include: {
                rel_intento_pago_id_pago: true,
                rel_reembolso_id_pago: true,
            },
        });

        if (!pago) {
            return res.status(404).json({
                message: "Pago no encontrado",
            });
        }

        res.status(200).json(pago);
    } catch (error) {
        console.error("Error al obtener pago:", error);

        res.status(500).json({
            message: "Error al obtener el pago",
        });
    }
};

// Crear pago
export const crearPago = async (req, res) => {
    try {
        const {
            id_pedido,
            id_cliente,
            monto,
            moneda,
            metodo,
            clave_idempotencia,
        } = req.body;

        if (
            !id_pedido ||
            monto === undefined ||
            monto === null ||
            !metodo ||
            !clave_idempotencia
        ) {
            return res.status(400).json({
                message:
                    "id_pedido, monto, metodo y clave_idempotencia son obligatorios",
            });
        }

        if (Number(monto) <= 0) {
            return res.status(400).json({
                message: "El monto debe ser mayor que 0",
            });
        }

        const metodosPermitidos = [
            "EFECTIVO",
            "TARJETA",
            "TRANSFERENCIA",
            "OTRO",
        ];

        if (!metodosPermitidos.includes(metodo)) {
            return res.status(400).json({
                message: "Método de pago no válido",
            });
        }

        const pagoExistente = await prisma.pago.findUnique({
            where: {
                clave_idempotencia,
            },
        });

        if (pagoExistente) {
            return res.status(200).json(pagoExistente);
        }

        const pago = await prisma.pago.create({
            data: {
                id_pedido: Number(id_pedido),
                id_cliente:
                    id_cliente !== undefined &&
                        id_cliente !== null
                        ? Number(id_cliente)
                        : null,
                monto,
                moneda: moneda ?? "GTQ",
                metodo,
                clave_idempotencia,
                rel_intento_pago_id_pago: {
                    create: {
                        proveedor: metodo === "EFECTIVO" ? "EFECTIVO_MANUAL" : "SIMULADO",
                        clave_idempotencia:
                            `INTENTO-${clave_idempotencia}`,
                        monto,
                    },
                },
            },
            include: {
                rel_intento_pago_id_pago: true,
            },
        });

        res.status(201).json(pago);
    } catch (error) {
        console.error("Error al crear pago:", error);

        res.status(500).json({
            message: "Error al crear el pago",
        });
    }
};

// Obtener pagos por pedido
export const obtenerPagosPorPedido = async (req, res) => {
    try {
        const { id_pedido } = req.params;

        const pagos = await prisma.pago.findMany({
            where: {
                id_pedido: Number(id_pedido),
            },
            include: {
                rel_intento_pago_id_pago: true,
                rel_reembolso_id_pago: true,
            },
            orderBy: {
                created_at: "desc",
            },
        });

        res.status(200).json(pagos);
    } catch (error) {
        console.error(
            "Error al obtener pagos del pedido:",
            error
        );

        res.status(500).json({
            message:
                "Error al obtener los pagos del pedido",
        });
    }
};

// Cambiar estado de un pago
export const cambiarEstadoPago = async(req,res)=>{try{if(!req.origenServicio){const pago=await prisma.pago.findUnique({where:{id_pago:Number(req.params.id)}});if(!pago)return res.status(404).json({message:'Pago no encontrado.'});if(pago.metodo!=='EFECTIVO')return res.status(409).json({message:'Los cobros bancarios requieren una pasarela real.'});if(!req.usuario.roles.includes('ADMINISTRADOR')&&req.body?.estado!=='CONFIRMADO')return res.status(403).json({message:'Caja solo confirma efectivo recibido.'});}res.json(await cambiarPago(Number(req.params.id),req.body?.estado,req.usuario?.id_usuario??null));}catch(e){res.status(e.status||500).json({message:e.data?.message||e.message});}};
export const cancelarPagosPendientes = async(req,res)=>{try{const id=Number(req.params.id_pedido);if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({message:'Pedido inválido.'});res.json(await cancelarPendientes(id));}catch(e){res.status(e.status||500).json({message:e.message});}};
