import {corsOptions} from './utils/corsOptions.js';
import {personal} from './utils/seguridad.js';
import {consultarAuditoria} from './utils/operacion.js';
import prisma from './config/prisma.js';
import express from "express";
import cors from "cors";
import pagoRoutes from "./routes/pagoRoutes.js";
import reembolsoRoutes from "./routes/reembolsoRoutes.js";

import { servicioOAdministrador } from "./middlewares/servicioMiddleware.js";

const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.get('/admin/bitacora',personal(['ADMINISTRADOR']),consultarAuditoria(prisma));


app.use("/pagos", servicioOAdministrador, pagoRoutes);
app.use("/reembolsos", servicioOAdministrador, reembolsoRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({
        service: "pagos",
        status: "OK",
        message: "Farmacia Gaby - Pagos Service funcionando",
    });
});

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
    console.log(`Pagos Service corriendo en puerto ${PORT}`);
});