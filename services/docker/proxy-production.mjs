
import http from "node:http";

const rutas = [
    { prefijo: "/api/auth", puerto: 3001 },
    { prefijo: "/api/catalogo", puerto: 3002, quitarPrefijo: true },
    { prefijo: "/api/inventario", puerto: 3003, quitarPrefijo: true },
    { prefijo: "/api/pedidos", puerto: 3004, quitarPrefijo: true },
    { prefijo: "/api/pagos", puerto: 3005, quitarPrefijo: true },
];

const PORT = Number(process.env.PORT || 8080);

const servidor = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;

    if (pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            service: "gabyfarma-api",
            status: "OK",
        }));
        return;
    }

    const destino = rutas.find(
        ({ prefijo }) =>
            pathname === prefijo || pathname.startsWith(`${prefijo}/`)
    );

    if (!destino) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Ruta no encontrada" }));
        return;
    }

    const proxy = http.request(
        {
            hostname: "127.0.0.1",
            port: destino.puerto,
            method: req.method,
            headers: {
                ...req.headers,
                host: `127.0.0.1:${destino.puerto}`,
            },
            path: destino.quitarPrefijo
                ? req.url.replace(
                    new RegExp(`^${destino.prefijo}(?=/|\\?|$)`),
                    ""
                ) || "/"
                : req.url,
        },
        (respuesta) => {
            res.writeHead(respuesta.statusCode || 502, respuesta.headers);
            respuesta.pipe(res);
        }
    );

    proxy.on("error", () => {
        if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
        }
        res.end(JSON.stringify({
            message: "Servicio temporalmente no disponible",
        }));
    });

    req.pipe(proxy);
});

servidor.listen(PORT, "0.0.0.0", () => {
    console.log(`GabyFarma API escuchando en puerto ${PORT}`);
});
