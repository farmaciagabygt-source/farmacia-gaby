# Farmacia Gaby

## Descripción

Plataforma web de comercio electrónico y gestión administrativa para Farmacia Gaby, desarrollada como proyecto del curso Seminario de Tecnologías de Información de la Universidad Mariano Gálvez de Guatemala.

El sistema permite integrar en una misma plataforma los servicios orientados al cliente y los procesos internos de la farmacia, contribuyendo a su Transformación Digital.

## Tecnologías

### Backend

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT
- Redis
- Railway

### Frontend

- React
- Vite
- React Router DOM
- Axios
- Vercel

### Infraestructura y DevOps

- Docker
- Docker Compose
- Jenkins (CI/CD)
- Git y GitHub

## Estructura del proyecto

- `services/auth/` - Microservicio de autenticación.
- `services/catalogo/` - Microservicio de catálogo de productos.
- `services/inventario/` - Microservicio de inventario.
- `services/pedidos/` - Microservicio de pedidos.
- `services/pagos/` - Microservicio de pagos.
- `services/docker/` - Configuración y scripts de infraestructura.
- `frontend/` - Aplicación web React.
- `docs/` - Documentación del proyecto.
- `Dockerfile` - Construcción del contenedor unificado de producción.
- `docker-compose.yml` - Orquestación de servicios en desarrollo local.

## Arquitectura del proyecto

El sistema utiliza una arquitectura basada en microservicios para separar las principales funcionalidades de la plataforma.

### Microservicios

- **Auth:** autenticación, usuarios y control de acceso.
- **Catálogo:** administración de productos, categorías, presentaciones y precios.
- **Inventario:** control de existencias, sucursales y reservas.
- **Pedidos:** gestión de carritos, pedidos, facturación y envíos.
- **Pagos:** administración de pagos y reembolsos.

### Puertos de los microservicios

- Auth - Puerto 3001
- Catálogo - Puerto 3002
- Inventario - Puerto 3003
- Pedidos - Puerto 3004
- Pagos - Puerto 3005
- Frontend - Puerto 5173 (desarrollo)
- Proxy HTTP - Puerto 8080 (producción prevista)

### Infraestructura

- **PostgreSQL:** sistema de gestión de base de datos, con cinco bases independientes para los microservicios.
- **Redis:** servicio de almacenamiento en memoria.
- **Docker:** contenedorización de los servicios.
- **Docker Compose:** orquestación del entorno local.
- **Railway:** plataforma prevista para alojar el backend, PostgreSQL y Redis.
- **Vercel:** plataforma prevista para alojar el frontend.

Para producción se está preparando un contenedor Docker unificado que ejecutará los cinco microservicios mediante un proxy HTTP, conservando su separación lógica y funcional.

## Instalación

### Clonar el repositorio

```bash
git clone https://github.com/mlopezg71-stack/farmacia-gaby.git
cd farmacia-gaby
```

### Configurar el entorno

Configurar el archivo `.env` con las variables necesarias para los microservicios, PostgreSQL y Redis.

### Backend

Iniciar los microservicios y la infraestructura mediante Docker Compose:

```bash
docker compose up -d --build
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Ejecución con Docker

Para iniciar los servicios:

```bash
docker compose up -d
```

Para verificar el estado de los contenedores:

```bash
docker compose ps
```

Para detener los servicios:

```bash
docker compose down
```

## Variables de entorno

El backend utiliza variables de entorno para las conexiones a bases de datos, autenticación y comunicación interna.

```dotenv
DATABASE_URL=tu_url_de_base_de_datos
JWT_SECRET=tu_clave_secreta_jwt
JWT_EXPIRES_IN=2h
SERVICE_API_KEY=tu_clave_interna_de_servicio
CORS_ORIGINS=http://localhost:5173
```

Cada microservicio utiliza su propia conexión `DATABASE_URL`.

El frontend utiliza variables de entorno para configurar las direcciones de las API correspondientes.

Las credenciales reales deben mantenerse fuera del repositorio.

## Funcionalidades implementadas

### Autenticación

- Registro e inicio de sesión de clientes.
- Autenticación mediante JWT.
- Recuperación y restablecimiento de contraseña.
- Gestión de información de cuenta.
- Gestión de direcciones.
- Control de acceso por roles.
- Protección de rutas administrativas.

### Catálogo

- Gestión administrativa de productos.
- Creación, visualización y modificación de productos.
- Gestión de categorías.
- Gestión de marcas y laboratorios.
- Gestión de presentaciones.
- Gestión de precios.
- Asociación de categorías a productos.
- Publicación y control de visibilidad de productos.
- Catálogo público conectado con la base de datos.

### Inventario

- Consulta de existencias.
- Control de stock físico, reservado y disponible.
- Control de mínimos y máximos.
- Gestión de lotes y existencias por sucursal.
- Reservas de inventario.
- Confirmación, consumo y liberación de reservas.
- Dashboard administrativo de inventario.

### Pedidos

- Gestión de carrito.
- Gestión de productos del carrito.
- Creación y consulta de pedidos.
- Información de contacto y facturación.
- Gestión de envíos.
- Integración con catálogo, inventario y pagos.

### Pagos

- Gestión de pagos.
- Gestión de reembolsos.
- Integración con pedidos.

### Frontend

- Página principal de Farmacia Gaby.
- Catálogo público de productos.
- Búsqueda y filtrado de productos.
- Categorías.
- Enfermedades comunes.
- Ofertas.
- Sucursales.
- Contacto.
- Dashboard administrativo.
- Gestión de usuarios.
- Gestión de catálogo.
- Gestión de inventario.
- Bitácora.

## Estado

Proyecto en desarrollo, con funcionalidades implementadas y despliegue en producción en preparación mediante Docker, Railway y Vercel.

## Autores

**Grupo No. 6**

- Marcous Samir Andree Lopez Gonzalez   — 0900-18-13299
- Daniel Alejandro Morales Arias        — 0900-22-3068
- Diego Morales Arias                   — 0900-22-3088
- Christian Alexander Sierra Elias      — 0900-22-1815

## Universidad

Universidad Mariano Gálvez de Guatemala  
Seminario de Tecnologías de Información  
2026
