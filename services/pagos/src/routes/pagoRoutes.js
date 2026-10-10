import express from "express";

import {
    listarPagos,
    obtenerPago,
    crearPago,
    obtenerPagosPorPedido,
    cambiarEstadoPago,
    cancelarPagosPendientes,
} from "../controllers/pagoController.js";

const router = express.Router();

router.post('/',(req,res,next)=>req.origenServicio?next():res.status(403).json({message:'El pago se solicita desde el pedido.'}),crearPago);
router.get("/", listarPagos);
router.get("/pedido/:id_pedido", obtenerPagosPorPedido);
router.patch('/pedido/:id_pedido/cancelar-pendientes',(req,res,next)=>req.origenServicio?next():res.status(403).json({message:'Cancela desde el pedido para liberar inventario.'}),cancelarPagosPendientes);
router.get("/:id", obtenerPago);
router.patch("/:id/estado", cambiarEstadoPago);

export default router;