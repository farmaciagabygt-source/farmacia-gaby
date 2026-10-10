import express from "express";

import {
    crearPedido,
    listarPedidos,
    listarMisPedidos,
    obtenerPedido,
    cambiarEstadoPedido,
    iniciarPagoPedido,
    consultarPagosPedido,
    cancelarPedido,
} from "../controllers/pedidoController.js";

import { identificar, soloCliente, soloPersonalPedidos } from "../middlewares/authMiddleware.js";
import { verificarPropietarioCarritoEnBody, verificarPropietarioPedido, ignorarIdClienteDelBody } from "../middlewares/propietarioMiddleware.js";

import { autorizarCambioEstadoPedido } from "../middlewares/servicioMiddleware.js";

import { cotizarPedido, configuracionEntrega } from '../controllers/entregaController.js';
const router = express.Router();

router.get("/entrega-configuracion", configuracionEntrega);
router.post("/cotizacion", identificar, verificarPropietarioCarritoEnBody, ignorarIdClienteDelBody, cotizarPedido);
router.post("/", identificar, verificarPropietarioCarritoEnBody, ignorarIdClienteDelBody, crearPedido);
router.get("/", identificar, soloPersonalPedidos, listarPedidos);
router.get("/mis-pedidos", identificar, soloCliente, listarMisPedidos);
router.get("/:id", identificar, verificarPropietarioPedido, obtenerPedido);
router.patch("/:id/cancelar", identificar, verificarPropietarioPedido, cancelarPedido);
router.patch("/:id/estado", autorizarCambioEstadoPedido, cambiarEstadoPedido);
router.post("/:id/pago", identificar, verificarPropietarioPedido, iniciarPagoPedido);
router.get("/:id/pagos", identificar, verificarPropietarioPedido, consultarPagosPedido);

export default router;