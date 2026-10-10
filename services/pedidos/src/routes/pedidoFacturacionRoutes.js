import express from "express";

import {
    crearPedidoFacturacion,
    obtenerPedidoFacturacion,
} from "../controllers/pedidoFacturacionController.js";

import { identificar, soloAdministrador } from '../middlewares/authMiddleware.js';
import { verificarPropietarioPedidoAuxiliar } from '../middlewares/propietarioMiddleware.js';
const router = express.Router();
router.use(identificar);


router.post("/", soloAdministrador, crearPedidoFacturacion);
router.get("/:id_pedido", verificarPropietarioPedidoAuxiliar, obtenerPedidoFacturacion);

export default router;