# Preparación de publicación

La aplicación sigue funcionando localmente. No se realizó despliegue, publicación, push ni cambio de credenciales reales.

## Configuración preparada

- Todas las pantallas activas usan `VITE_AUTH_URL`, `VITE_CATALOGO_URL`, `VITE_INVENTARIO_URL`, `VITE_PEDIDOS_URL` y `VITE_PAGOS_URL`. Auth incluye `/api/auth`; las otras URL indican la raíz del servicio. Usar URLs HTTPS reales al construir el frontend. Nunca colocar `JWT_SECRET`, `SERVICE_API_KEY`, credenciales de correo o de PostgreSQL en variables VITE.
- `frontend/.env.example` documenta los valores locales. Para la publicación, crear `frontend/.env.production` con los cinco servicios y ejecutar `npm run build:production` desde frontend. La verificación rechaza localhost o URLs incompletas.
- Los cinco servicios reciben `NODE_ENV` y `CORS_ORIGINS`. En producción rechazan CORS sin dominios HTTPS explícitos y claves cortas. En local se permiten 5173 y el preview de pruebas 5174.
- Auth y servicios validan permisos actuales. La clave interna es independiente de la firma JWT. Configurar `AUTH_URL`, `CATALOGO_URL`, `INVENTARIO_URL`, `PEDIDOS_URL` y `PAGOS_URL` según la red privada de los servicios correspondientes. Conservar la separación de bases de datos.
- PostgreSQL y Redis locales se vinculan a 127.0.0.1; no se publican en todas las interfaces. Hay comprobaciones de salud y reinicio de los contenedores.

## Datos y operaciones que faltan antes de publicar

1. Confirmar teléfono, dirección, tarifas y cobertura con la farmacia. Horarios ya confirmados: lunes a sábado 9:30–19:30; domingo 9:30–17:00. Zona 5/Q20/Q50/Q200 sigue siendo ejemplo autorizado, no una tarifa comercial confirmada.
2. Establecer dominio, URLs HTTPS reales, cuentas de hosting y variables privadas de cada servicio. El repositorio no contiene esas credenciales. Configurar persistencia de PostgreSQL y Redis y comprobar recuperación de respaldos.
3. Configurar el remitente real de recuperación de contraseña. El correo de contacto confirmado no implica que haya credenciales SMTP configuradas para enviar desde esa cuenta.
4. Definir roles del personal real y política de devoluciones/cuarentena. Revisar precios heredados con tasa mayor a 1; no se modifican automáticamente.
5. Añadir límites de solicitudes a autenticación/recuperación, monitoreo y alertas; retención/exportación de bitácora; auditoría transaccional en catálogo. Revisar dependencias antes del lanzamiento.
6. Configurar el fallback de rutas del frontend y probar acceso directo a páginas como `/mis-pedidos` y `/admin/pedidos` en el hosting.
7. Hacer una prueba completa en un entorno separado con los dominios finales, correo y datos de prueba; la revisión local no certifica producción.

## Punto 5 pendiente: pasarela real

La farmacia debe elegir/contratar su proveedor. Después se implementan credenciales de prueba/producción, intentos de pago, callback/webhook firmado, idempotencia, conciliación y reembolsos del proveedor. No almacenar números de tarjeta ni CVV en GabyFarma. Hasta entonces, tarjetas y transferencias no se presentan como cobros reales.

Los registros manuales de efectivo funcionan para retiro/entrega. Solo confirmar un cobro o reembolso después del intercambio real de dinero.
