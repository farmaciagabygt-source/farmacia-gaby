import {validarPrecio} from '../middlewares/validarPrecio.js';
import express from "express";

import {
    listarPreciosPresentacion,
    obtenerPrecio,
    crearPrecio,
    modificarPrecio,
} from "../controllers/precioController.js";

import {
    verificarToken,
    soloAdministrador,
} from "../middlewares/authMiddleware.js";

const router = express.Router();


// ======================================================
// CONSULTAS
// ======================================================

router.get(
    "/presentacion/:idPresentacion",
    listarPreciosPresentacion
);

router.get(
    "/:id",
    obtenerPrecio
);


// ======================================================
// ADMINISTRACIÓN
// ======================================================

router.post(
    "/",
    verificarToken,
    soloAdministrador,
    validarPrecio,
    crearPrecio
);

router.put(
    "/:id",
    verificarToken,
    soloAdministrador,
    validarPrecio,
    modificarPrecio
);


export default router;