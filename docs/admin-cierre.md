# Panel del personal de GabyFarma

Los cambios usan las tablas Prisma existentes. No se cambiaron esquemas ni se reinicializó PostgreSQL. Los pedidos de demostración 43–47 se conservan. También se conserva el pedido 48, con devoluciones y reembolso completo, para mostrar estas pantallas.

## Usuarios y permisos

Usuarios permite crear, consultar, editar roles y activar/desactivar cuentas. Una cuenta de cliente se separa de una de personal. La contraseña inicial requiere 12–72 caracteres, mayúscula, minúscula y número. No se muestran hashes de contraseña. Cambiar roles o estado incrementa `Usuario.version_seguridad`; los servicios consultan la identidad actual en Auth, por lo que una sesión anterior pierde acceso inmediatamente. Los tokens de cliente también vencen en dos horas con la configuración local.

No se permite desactivar la propia cuenta, quitarse el rol administrativo ni dejar al sistema sin administrador activo. Las modificaciones se serializan con un bloqueo transaccional.

| Rol | Operaciones |
|---|---|
| ADMINISTRADOR | Todos los módulos; autoriza devoluciones y reembolsos; configura farmacia y tarifas |
| CAJERO | Consulta pedidos/pagos/devoluciones; acepta pedidos con efectivo pendiente; confirma cobro y devolución de efectivo; cancela pedidos aún sin preparar |
| DESPACHO | Consulta pedidos; prepara, marca listo, despacha y confirma entrega; solicita devoluciones y recibe productos autorizados |
| INVENTARIO | Consulta catálogo para recibir mercadería; consulta existencias, registra recepciones y ajustes, consulta movimientos |
| CLIENTE | Compra y consulta exclusivamente sus pedidos; no accede al panel del personal |

Las comprobaciones en el backend siguen siendo obligatorias aunque se intente llamar directamente a una ruta oculta en el menú. Si Auth no responde, los servicios no conceden identidad. Las operaciones internas usan una clave distinta al JWT de los usuarios.

## Bitácora

La pantalla consulta `AuditoriaEvento` de auth, catálogo, inventario, pedidos y pagos. Muestra 50 eventos por servicio, permite filtrar y cargar anteriores. Registra accesos, gestión de usuarios, cambios de pedidos, reservas, cobros, movimientos, devoluciones, reembolsos y configuración. No contiene contraseñas, tokens, datos completos de contacto ni datos de tarjeta.

Los movimientos nuevos y los cambios operativos se auditan en su transacción. La auditoría de CRUD de catálogo es posterior a la respuesta y puede fallar si la base deja de estar disponible; el error queda en el registro del servicio. Los eventos antiguos que no fueron auditados no se inventan ni reconstruyen. Antes de producción conviene convertir esa auditoría de catálogo a transaccional y definir retención, exportación y monitoreo.

## Catálogo e inventario

Catálogo incorpora búsqueda por nombre/SKU, filtros por categoría y publicación, stock vendible y avisos de precios ausentes o tasas de impuesto incorrectas. Se conservan los formularios originales de producto, presentación y precio.

La tasa usa fracción: **0.12 equivale a 12 %**. El formulario y la validación de precios ya usan esa convención. Los precios existentes no fueron convertidos automáticamente: revisar los que muestren aviso. Los nuevos importes admiten hasta dos decimales.

Inventario diferencia físico, reservado y vendible. Lotes vencidos/bloqueados/retirados y ubicaciones inactivas, de cuarentena o tránsito no cuentan como vendibles. Las reservas tampoco toman existencias de cuarentena. Hay alertas de vencimiento a 90 días y de mínimos registrados. La presentación #1 de una existencia heredada no aparece en catálogo: se señala como alerta y no se remapea ni borra. Se requiere identificar su presentación correcta.

Recepción solicita presentación publicada, ubicación de bodega/venta activa, cantidad, lote, referencia del fabricante y vencimiento futuro. Ajustes solicitan variación entera y motivo; no pueden dejar físico por debajo de reservado. Ambas operaciones son idempotentes y generan movimiento y auditoría. Al entregar un pedido se registra movimiento VENTA. La tabla muestra los últimos 200 movimientos; no sustituye una contabilidad o módulo completo de compras/proveedores.

## Devoluciones y reembolsos

1. En Devoluciones, despacho o administrador selecciona un pedido COMPLETADO, cantidades, motivo y condición de los productos.
2. Administrador autoriza o rechaza. No se permite devolver más unidades que las entregadas, considerando solicitudes anteriores.
3. Despacho confirma recepción física. El servicio de inventario devuelve las unidades a una ubicación CUARENTENA, conservando el lote original. Un reintento no duplica unidades.
4. Administrador solicita en Pagos un reembolso vinculado a la devolución y por su importe de productos. El costo de envío no se añade automáticamente a una devolución de productos.
5. Administrador pasa el reembolso a PROCESANDO. Caja o administrador confirma únicamente cuando ya devolvió el dinero al cliente.
6. El pago queda REEMBOLSADO_PARCIAL o REEMBOLSADO según el acumulado. Administrador cierra la devolución después de confirmar el reembolso.

También se permite un reembolso administrativo de efectivo sin devolución de productos, con motivo. Los importes solicitados/en proceso reservan saldo para impedir excesos simultáneos. No se puede saltar este registro cambiando directamente el estado del pago a reembolsado. Un pedido entregado mantiene su historial COMPLETADO; una devolución no cancela retrospectivamente la entrega. Un pedido aún sin entregar puede cancelarse después del reembolso total y liberar su reserva.

Esto registra **efectivo manual**, no mueve dinero bancario. La política comercial de devoluciones y la decisión de liberar, desechar o devolver al proveedor los productos en cuarentena requieren definición de la farmacia. La aplicación no autoriza su reventa automáticamente.

## Farmacia y configuración

Correo confirmado: **farmacia.gaby.gt@gmail.com**. WhatsApp actualmente no disponible. Teléfono pendiente. Horario confirmado: lunes a sábado de 9:30 a. m. a 7:30 p. m.; domingo de 9:30 a. m. a 5:00 p. m. Mi farmacia permite editar contactos, dirección, horarios regulares del mismo día y las tarifas existentes. La página pública de sucursales y contacto consulta estos datos.

Se conservan los ejemplos autorizados de Guatemala, zona 5: envío Q20, mínimo Q50 y gratis desde Q200. Confirmarlos antes de publicar. No hay una pasarela real de tarjetas/transferencias: ese punto sigue pendiente.

## Verificación

Se verificaron roles y revocación mediante cuentas temporales separadas; 20 comprobaciones unitarias de identidad/permisos; 83 comprobaciones del ciclo integrado de recepción, pedido, efectivo, entrega, devolución, cuarentena y reembolso parcial/completo, incluidos duplicados y saldo concurrente. Se verificó la conservación de estados/totales de los pedidos 43–47. El frontend compila y las pantallas nuevas se revisaron con ESLint y navegador, incluyendo inventario a 390 px. Las cuentas temporales de personal se eliminan al finalizar; se conserva el cliente sintético ligado al pedido 48 y todos los pedidos de demostración.

Ver `produccion-pendientes.md` para preparar la publicación. No se ha publicado ni conectado una pasarela bancaria.
