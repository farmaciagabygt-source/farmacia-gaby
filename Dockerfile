
FROM node:20-alpine

WORKDIR /app

# Copiar los cinco microservicios y el script de arranque.
COPY services/ ./services/

# Instalar dependencias y generar el cliente Prisma de cada servicio.
RUN for service in auth catalogo inventario pedidos pagos; do \
    cd /app/services/$service && \
    npm ci && \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npx prisma generate || exit 1; \
    done

# Preparar el script de arranque.
RUN sed -i 's/\r$//' /app/services/docker/start-production.sh && \
    chmod +x /app/services/docker/start-production.sh

ENV NODE_ENV=production

# Puerto público previsto para el proxy de la API.
EXPOSE 8080

CMD ["/bin/sh", "/app/services/docker/start-production.sh"]
