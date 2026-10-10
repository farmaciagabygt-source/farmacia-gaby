import {corsOptions} from './utils/corsOptions.js';
import tarifaRoutes from './routes/tarifaRoutes.js';
import {personal} from './utils/seguridad.js';
import {consultarAuditoria} from './utils/operacion.js';
import prisma from './config/prisma.js';
import devolucionRoutes from './routes/devolucionRoutes.js';
import express from "express";
import cors from "cors";

import carritoRoutes from "./routes/carritoRoutes.js";
import itemCarritoRoutes from "./routes/itemCarritoRoutes.js";
import pedidoRoutes from "./routes/pedidoRoutes.js";
import pedidoContactoRoutes from "./routes/pedidoContactoRoutes.js";
import pedidoFacturacionRoutes from "./routes/pedidoFacturacionRoutes.js";
import envioRoutes from "./routes/envioRoutes.js";

import { iniciarVencimientos } from "./services/pedidoOperacion.js";
const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.get('/admin/bitacora',personal(['ADMINISTRADOR']),consultarAuditoria(prisma));
app.use('/devoluciones',devolucionRoutes);
app.use('/admin/tarifas',tarifaRoutes);


app.use("/carritos", carritoRoutes);
app.use("/items-carrito", itemCarritoRoutes);
app.use("/pedidos", pedidoRoutes);
app.use("/pedidos-contacto", pedidoContactoRoutes);
app.use("/pedidos-facturacion", pedidoFacturacionRoutes);
app.use("/envios", envioRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({
        service: "pedidos",
        status: "OK",
        message: "Farmacia Gaby - Pedidos Service funcionando",
    });
});

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
    iniciarVencimientos();
    console.log(`Pedidos Service corriendo en puerto ${PORT}`);
});