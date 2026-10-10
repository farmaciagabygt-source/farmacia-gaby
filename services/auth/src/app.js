import {corsOptions} from './utils/corsOptions.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import {verificarToken} from './middlewares/authMiddleware.js';
import {claveServicio} from './utils/seguridad.js';
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/auth/interno/identidad',(req,res,next)=>claveServicio(req)?next():res.status(401).json({message:'Credencial interna inválida.'}),verificarToken,(req,res)=>res.json(req.usuario));
app.use('/api/auth/admin',adminAuthRoutes);
/* RUTAS */
app.use("/api/auth", authRoutes);

/* HEALTH CHECK */
app.get("/health", (req, res) => {
    res.status(200).json({
        service: "auth",
        status: "OK",
        message: "Farmacia Gaby - Auth Service funcionando",
    });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Auth Service corriendo en puerto ${PORT}`);
});