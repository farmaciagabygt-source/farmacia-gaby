import express from "express";

import {
    crearEnvio,
    obtenerEnvioPorPedido,
} from "../controllers/envioController.js";

import { identificar, soloAdministrador } from '../middlewares/authMiddleware.js';
import { verificarPropietarioPedidoAuxiliar } from '../middlewares/propietarioMiddleware.js';
const router = express.Router();
router.use(identificar);


router.post("/", soloAdministrador, crearEnvio);
router.get("/pedido/:id_pedido", verificarPropietarioPedidoAuxiliar, obtenerEnvioPorPedido);

export default router;