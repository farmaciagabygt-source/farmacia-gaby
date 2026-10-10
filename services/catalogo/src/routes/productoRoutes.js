import express from "express";

import {
    listarProductosPublicos,
    listarPromocionesPublicas,
    listarProductosAdmin,
    obtenerProductoAdmin,
    crearProducto,
    modificarProducto,
    cambiarEstadoProducto,
} from "../controllers/productoController.js";

import {
    verificarToken,
    soloAdministrador,
    leerCatalogo,
} from "../middlewares/authMiddleware.js";

const router = express.Router();


// ======================================================
// ADMINISTRACIÓN
// ======================================================

router.get(
    "/admin",
    verificarToken,
    leerCatalogo,
    listarProductosAdmin
);

router.get(
    "/admin/:id",
    verificarToken,
    leerCatalogo,
    obtenerProductoAdmin
);

router.post(
    "/admin",
    verificarToken,
    soloAdministrador,
    crearProducto
);

router.put(
    "/admin/:id",
    verificarToken,
    soloAdministrador,
    modificarProducto
);

router.patch(
    "/admin/:id/estado",
    verificarToken,
    soloAdministrador,
    cambiarEstadoProducto
);


// ======================================================
// PÚBLICO
// ======================================================

router.get(
    "/promociones",
    listarPromocionesPublicas
);

router.get(
    "/",
    listarProductosPublicos
);

export default router;