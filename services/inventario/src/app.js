import {corsOptions} from './utils/corsOptions.js';
import farmaciaRoutes from './routes/farmaciaRoutes.js';
import {personal} from './utils/seguridad.js';
import {consultarAuditoria} from './utils/operacion.js';
import adminRoutes from './routes/adminRoutes.js';
import express from "express";
import cors from "cors";

import existenciaRoutes from "./routes/existenciaRoutes.js";
import reservaRoutes from "./routes/reservaRoutes.js";

import prisma from "./config/prisma.js";
const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.get('/admin/bitacora',personal(['ADMINISTRADOR']),consultarAuditoria(prisma));
app.use('/admin',adminRoutes);
app.use('/admin',farmaciaRoutes);


app.use("/existencias", existenciaRoutes);
app.use("/reservas", reservaRoutes);

app.get('/sucursales',async(req,res)=>{try{res.json(await prisma.sucursal.findMany({where:{estado:'ACTIVO'},select:{id_sucursal:true,codigo:true,nombre:true,direccion:true,departamento:true,municipio:true,zona:true,telefono:true,correo:true,zona_horaria:true,permite_retiro:true,permite_domicilio:true,rel_horario_sucursal_id_sucursal:true}}));}catch{res.status(500).json({message:'No se pudieron consultar las sucursales.'});}});
app.get("/health", (req, res) => {
    res.status(200).json({
        service: "inventario",
        status: "OK",
        message: "Farmacia Gaby - Inventario Service funcionando",
    });
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(`Inventario Service corriendo en puerto ${PORT}`);
});