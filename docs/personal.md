# Gestión del personal

Actualizado el 10/10/2026. Acceso mediante sesión con rol ADMINISTRADOR. Los roles CAJERO, INVENTARIO y DESPACHO todavía requieren definir permisos antes de habilitar estas nuevas operaciones.

## Dashboard

Los contadores consultan catálogo administrativo, inventario, pedidos y el nuevo GET /api/auth/admin/resumen protegido. Inventario suma existencias disponibles en ubicaciones activas, lotes DISPONIBLE y no vencidos. Los pedidos recientes provienen del listado real. Una consulta fallida muestra error y No disponible; no sustituye un fallo por cero.

## Pedidos y efectivo

/admin/pedidos: búsqueda por número, comprador o teléfono; filtros de estado y modalidad; acceso al detalle. /admin/pedidos/:id muestra productos, contacto, destino o sucursal, facturación solicitada, totales, pagos, reserva y historial.

1. Para una solicitud pendiente se puede Aceptar con efectivo. Crea/reutiliza el pago PENDIENTE, confirma la solicitud y mantiene la reserva 48 horas. No declara recibido el dinero.
2. Comenzar preparación → Marcar listo. Para domicilio, Despachar a domicilio.
3. Abrir Ver cobros del pedido. En /admin/pagos, Registrar efectivo recibido → Sí, recibí el dinero. Solo registrar dinero efectivamente recibido.
4. Regresar al pedido y confirmar retiro entregado o entrega realizada. Requiere pago confirmado y consume la reserva una sola vez.

El cobro posterior a preparación, listo o despacho conserva el estado operativo. Reintentar la confirmación es idempotente. El callback protegido de pagos valida que el importe y moneda coincidan al notificar pedidos avanzados; una operación administrativa no permite regresar esos pedidos a CONFIRMADO.

Cancelar desde el pedido libera reserva y cancela pagos pendientes. Si hay pago autorizado, confirmado o reembolsado, se bloquea esa cancelación; reembolsos y devoluciones necesitan un flujo posterior. No existe cobro bancario desde estos botones.

## Mi farmacia

/admin/sucursales muestra la única sucursal activa y las tarifas configuradas. No administra apertura de múltiples sucursales. Se mantienen las rutas antiguas del menú de catálogo e inventario, sin alterar su funcionalidad.

## Configuración

Las nuevas consultas admiten VITE_PEDIDOS_URL, VITE_PAGOS_URL, VITE_CATALOGO_URL, VITE_INVENTARIO_URL y VITE_AUTH_URL; auth incluye /api/auth. Los secretos internos nunca se envían al navegador. No hubo cambios de modelos Prisma ni migraciones.

## Pruebas

Compilación y revisión ESLint de archivos afectados correctas. 81 comprobaciones del ciclo existente, 35 administrativas y 25 de concurrencia/entrega pasaron. Se verificó en navegador iniciar sesión con una cuenta temporal autorizada, contadores reales, búsqueda, aceptar efectivo, preparar, listo, despachar, confirmar cobro y entregar. Los registros sintéticos se retiran al cerrar la prueba.

La prueba ciclo-pedido-carreras.local.cjs incluye cobro después de despacho, bloqueo de entrega sin cobro y conservación del estado. identidad-personal.test.cjs verifica clasificación por JWT y rechazo de tokens inválidos. La cuenta con ADMINISTRADOR y CLIENTE usa identidad PERSONAL en pedidos, coherente con el acceso administrativo del frontend.

## Pendientes identificados

Usuarios y Bitácora conservan pantallas heredadas: llaman /usuarios y /bitacora mediante axiosConfig, cuya base por defecto es localhost:3000/api. Esas rutas no existen en los cinco servicios actuales. UsuarioForm todavía incluye disponibilidad de médicos. Requieren adaptación a usuarios/roles/auditoría de la farmacia; el contador de usuarios está conectado, su administración completa no.

Luego: permisos por puesto, devoluciones y reembolsos, edición de tarifas/horarios/contactos reales, notificaciones al cliente, pruebas móviles y preparación para producción. Tarjetas y transferencias requieren proveedor real. Persisten la advertencia de tamaño de Vite y URLs locales en pantallas anteriores. No se realizó publicación ni push a Git en esta etapa.
