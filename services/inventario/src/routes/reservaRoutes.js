import express from "express";

import {
    crearReserva,



    obtenerReservaPorPedido,
} from "../controllers/reservaController.js";

import { confirmarReserva, consumirReserva, liberarReserva } from '../controllers/reservaTransicion.js';
import { soloServicio } from '../middlewares/servicioMiddleware.js';
const router = express.Router();

router.post("/", soloServicio, crearReserva);
router.get("/pedido/:id_pedido", obtenerReservaPorPedido);
router.patch("/:id/confirmar", soloServicio, confirmarReserva);
router.patch("/:id/consumir", soloServicio, consumirReserva);
router.patch("/:id/liberar", soloServicio, liberarReserva);

export default router;