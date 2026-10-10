FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Solo para generar Prisma: no se guarda una conexión de base de datos en la imagen.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npx prisma generate
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
