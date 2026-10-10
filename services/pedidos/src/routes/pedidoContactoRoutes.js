import express from "express";

import {
    crearPedidoContacto,
    obtenerPedidoContacto,
} from "../controllers/pedidoContactoController.js";

import { identificar, soloAdministrador } from '../middlewares/authMiddleware.js';
import { verificarPropietarioPedidoAuxiliar } from '../middlewares/propietarioMiddleware.js';
const router = express.Router();
router.use(identificar);


router.post("/", soloAdministrador, crearPedidoContacto);
router.get("/:id_pedido", verificarPropietarioPedidoAuxiliar, obtenerPedidoContacto);

export default router;