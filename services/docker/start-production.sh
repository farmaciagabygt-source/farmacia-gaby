#!/bin/sh
set -eu

# Comunicación interna entre microservicios
export AUTH_URL="http://127.0.0.1:3001"
export CATALOGO_URL="http://127.0.0.1:3002"
export INVENTARIO_URL="http://127.0.0.1:3003"
export PEDIDOS_URL="http://127.0.0.1:3004"
export PAGOS_URL="http://127.0.0.1:3005"

# Asignar una base de datos independiente a cada microservicio.
# Se conserva el servidor, usuario y contraseña de Railway.
database_url_for() {
  node -e '
    const url = new URL(process.env.DATABASE_URL);
    url.pathname = "/" + process.argv[1];
    console.log(url.toString());
  ' "$1"
}

AUTH_DB_URL=$(database_url_for gaby_auth)
CATALOGO_DB_URL=$(database_url_for gaby_catalogo)
INVENTARIO_DB_URL=$(database_url_for gaby_inventario)
PEDIDOS_DB_URL=$(database_url_for gaby_pedidos)
PAGOS_DB_URL=$(database_url_for gaby_pagos)
# Cada servicio conserva su propio directorio y puerto.

cd /app/services/auth
DATABASE_URL="$AUTH_DB_URL" PORT=3001 npm start &
AUTH_PID=$!

cd /app/services/catalogo
DATABASE_URL="$CATALOGO_DB_URL" PORT=3002 npm start &
CATALOGO_PID=$!

cd /app/services/inventario
DATABASE_URL="$INVENTARIO_DB_URL" PORT=3003 npm start &
INVENTARIO_PID=$!

cd /app/services/pedidos
DATABASE_URL="$PEDIDOS_DB_URL" PORT=3004 npm start &
PEDIDOS_PID=$!

cd /app/services/pagos
DATABASE_URL="$PAGOS_DB_URL" PORT=3005 npm start &
PAGOS_PID=$!

# Detener todos los procesos cuando se cierre el contenedor.
cleanup() {
kill "$AUTH_PID" "$CATALOGO_PID" "$INVENTARIO_PID" "$PEDIDOS_PID" "$PAGOS_PID" "${PROXY_PID:-}" 2>/dev/null || true
}

trap cleanup TERM INT EXIT

# Iniciar el proxy público de GabyFarma.
# Railway accederá a los microservicios mediante este puerto.
node /app/services/docker/proxy-production.mjs &
PROXY_PID=$!

# Mantener el contenedor activo.
wait