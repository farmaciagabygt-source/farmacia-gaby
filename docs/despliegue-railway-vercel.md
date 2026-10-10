# GabyFarma: publicar por GitHub, Railway y Vercel

Repositorio ya vinculado: https://github.com/mlopezg71-stack/farmacia-gaby
La preparación no publica ni contrata servicios. Conserva los datos locales y los pedidos 43–48.

## 1. GitHub

Revisar los cambios y subir el código cuando estén aprobados. No subir .env, .env.production, credenciales de pruebas, respaldos ni exports de bases. Los archivos .example son plantillas públicas sin claves. Los SQL históricos de services/docker/init son datos locales; no se ejecutan en Railway. El archivo de auth contiene datos de cuentas y hashes: se conserva localmente, excluido del índice de Git en esta preparación. No introducir nuevas claves en archivos versionados.

## 2. Railway: un PostgreSQL y cinco bases separadas

Crear un proyecto y un servicio PostgreSQL llamado **Postgres**. Crear cinco servicios del mismo repositorio con nombres exactos **auth**, **catalogo**, **inventario**, **pedidos**, **pagos**.

| Servicio | Root Directory | Config File Path desde raíz del repositorio |
|---|---|---|
| auth | /services/auth | /services/auth/railway.json |
| catalogo | /services/catalogo | /services/catalogo/railway.json |
| inventario | /services/inventario | /services/inventario/railway.json |
| pedidos | /services/pedidos | /services/pedidos/railway.json |
| pagos | /services/pagos | /services/pagos/railway.json |

En cada servicio: Dockerfile de su raíz, puerto **8080**, dominio público generado con destino **8080**, healthcheck **/health**, una réplica. Mantener siempre activo pedidos: contiene el proceso de vencimiento; no activar suspensión/serverless. No se usa Docker Compose en Railway.

Copiar services/SERVICIO/.env.railway.example al Raw Editor de Variables del servicio. Las referencias requieren esos nombres exactos. Reemplazar JWT_SECRET y SERVICE_API_KEY por **dos claves aleatorias distintas**, comunes a los cinco servicios. Generarlas con un gestor de contraseñas (64 caracteres) y guardarlas únicamente como variables de Railway. CORS_ORIGINS es el origen HTTPS exacto de Vercel, sin barra final; múltiples dominios se separan por coma. No admite comodines. Las URLs internas usan los dominios privados Railway y :8080. Las cinco APIs también necesitan dominio público porque el navegador de Vercel las consume.

DATABASE_URL referencia las variables privadas de Postgres pero usa una base distinta por servicio: gaby_auth, gaby_catalogo, gaby_inventario, gaby_pedidos, gaby_pagos. Si se cambia manualmente la contraseña de PostgreSQL y contiene símbolos de URL, codificarla para una URI. No copiar la URL localhost de desarrollo.

El comando previo npm run deploy:prepare crea únicamente la base indicada si no existe, aplica **prisma migrate deploy** y nunca ejecuta reset, db push ni carga dumps. Necesita un usuario PostgreSQL que pueda crear bases (el inicial del servicio). Las migraciones existentes incluyen los CHECK e índices adicionales. No ejecutar complemento-migracion.sql por separado. Si se importan bases existentes, comprobar su historial de migraciones antes; no resolver/baseline a ciegas.

Auth inicializa los roles existentes. En el primer despliegue, configurar INITIAL_ADMIN_EMAIL y INITIAL_ADMIN_PASSWORD (12–72 bytes, mayúscula, minúscula y número). Crea administrador solamente si no hay uno activo, nunca asciende una cuenta existente. Después retirar INITIAL_ADMIN_PASSWORD. Una contraseña no se imprime en registros. Las bases nuevas estarán vacías de catálogo, existencias y pedidos: registrar datos o acordar una importación antes de presentar compras en la nube. Los pedidos locales NO se copian automáticamente.

No hace falta Redis para la implementación actual: ningún servicio lo consume. Puede agregarse cuando exista una función que lo use. Gmail EMAIL_USER/EMAIL_PASS solo se necesitan para recuperar contraseña; sin configurarlos, no prometer recuperación por correo.

## 3. Vercel

Importar el mismo repositorio. Root Directory **frontend**. Framework **Vite**. Install npm ci; Build npm run build:production; Output dist. frontend/vercel.json ya configura todo y reescribe las rutas del cliente a index.html. El verificador está dentro de frontend y no depende de archivos fuera de esa raíz.

Configurar las cinco variables de frontend/.env.production.example en el entorno Production con los dominios públicos reales de Railway:

- VITE_AUTH_URL: URL HTTPS de auth **terminada en /api/auth**.
- VITE_CATALOGO_URL, VITE_INVENTARIO_URL, VITE_PEDIDOS_URL, VITE_PAGOS_URL: URL HTTPS del servicio correspondiente, sin /api/auth ni rutas inventadas.

Las VITE_* son públicas: nunca JWT_SECRET, SERVICE_API_KEY ni DATABASE_URL. Cada cambio de VITE_* necesita nuevo build/redeploy. El build falla si quedan placeholders o localhost. Para Preview, configurar URLs reales y añadir el dominio exacto de preview a CORS; no permitir todos los dominios vercel.app. El dominio definitivo de Vercel debe coincidir con CORS_ORIGINS en los cinco backends. Se puede crear primero el proyecto Vercel para conocer su dominio, configurar Railway y después desplegar Vercel.

## 4. Verificar después de publicar

Abrir /health de las cinco APIs. Comprobar frontend, registro/login, catálogo, precio/stock, carrito, retiro, efectivo pendiente/confirmado, preparación y entrega, acceso por roles y bitácora. Recargar directamente /productos, /carrito y /dashboard para verificar rutas. Probar devoluciones con pedidos sintéticos y verificar cuarentena. No confirmar dinero real en una prueba. El pago sigue siendo efectivo manual; no existe pasarela bancaria.

Los healthchecks actuales comprueban proceso HTTP; comprobar además consultas a base de datos y comunicación entre servicios. Activar respaldos del servicio PostgreSQL y verificar costos/uso del proyecto en Railway antes de contratar. No se ha certificado capacidad, concurrencia masiva ni disponibilidad comercial.

## Datos confirmados

Correo farmacia.gaby.gt@gmail.com; sin WhatsApp. Lunes a sábado 09:30–19:30; domingo 09:30–17:00. Teléfono pendiente. Tarifas zona 5/Q20/Q50/gratis Q200 siguen siendo ejemplos autorizados. La existencia con presentación #1 sigue marcada y requiere identificar su asociación.

## Documentación oficial consultada

- https://docs.railway.com/deployments/monorepo
- https://docs.railway.com/config-as-code/reference
- https://docs.railway.com/deployments/pre-deploy-command
- https://docs.railway.com/variables
- https://vercel.com/docs/frameworks/frontend/vite

## Verificación de esta preparación

Se construyeron las cinco imágenes. Las cinco migraciones se probaron contra un PostgreSQL temporal separado, tanto instalación inicial como repetición, y el contenedor de prueba se retiró. El frontend compila y el verificador rechaza variables ausentes y AUTH sin /api/auth. Pasaron las 20 pruebas existentes de identidad/permisos. Los siete contenedores locales están saludables y los pedidos 43–48 conservan sus estados.

La revisión npm audit de Auth registra siete alertas transitivas asociadas a la herramienta Prisma 7.8.0 (cuatro altas y tres moderadas). Se conserva la versión del proyecto; no se aplicó la degradación mayor sugerida ni audit fix --force. Revisar estas dependencias antes de uso comercial; esta preparación verifica despliegue, no certifica seguridad comercial.
