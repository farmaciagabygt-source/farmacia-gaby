#!/bin/sh
set -eu

# Comunicación interna entre microservicios
export AUTH_URL="http://127.0.0.1:3001"
export CATALOGO_URL="http://127.0.0.1:3002"
export INVENTARIO_URL="http://127.0.0.1:3003"
export PEDIDOS_URL="http://127.0.0.1:3004"
export PAGOS_URL="http://127.0.0.1:3005"

# Iniciar los cinco microservicios de GabyFarma.
# Cada servicio conserva su propio directorio y puerto.

cd /app/services/auth
PORT=3001 npm start &
AUTH_PID=$!

cd /app/services/catalogo
PORT=3002 npm start &
CATALOGO_PID=$!

cd /app/services/inventario
PORT=3003 npm start &
INVENTARIO_PID=$!

cd /app/services/pedidos
PORT=3004 npm start &
PEDIDOS_PID=$!

cd /app/services/pagos
PORT=3005 npm start &
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