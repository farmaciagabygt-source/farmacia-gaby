# Carrito de GabyFarma — implementación local

Pantalla: /carrito. Desde /productos o los destacados de inicio se agrega una presentación real del catálogo.

## Uso

1. Seleccionar sucursal antes de agregar productos. Con productos en el carrito, vaciarlo primero para cambiar de sucursal.
2. Agregar productos. El encabezado muestra el total de unidades.
3. Cambiar cantidades con +, − o el campo numérico (guardar con Enter o al salir del campo). Se permiten enteros de 1 a 999; inventario verifica el stock al aumentarlas.
4. Eliminar una línea, vaciar con confirmación o cerrar el carrito con confirmación.
5. Actualizar para consultar nuevamente precios y existencias. El estado se recupera al recargar el navegador.

El invitado conserva un token aleatorio en localStorage. Clientes usan el JWT del login existente. Al cambiar de sesión se recarga el carrito de esa identidad; no se fusionan carritos automáticamente. Personal administrativo no compra desde su sesión administrativa. Los productos sin precio vigente se bloquean en el catálogo; productos despublicados o con cambios de precio se muestran con avisos en el carrito. No se reserva stock ni se crea un pedido desde esta pantalla.

Las tarjetas de ejemplo de ofertas y enfermedades dirigen al catálogo real. Sus IDs de muestra no se envían a pedidos ni sus descuentos se aplican como precios reales.

## Configuración

El módulo nuevo admite VITE_PEDIDOS_URL, VITE_CATALOGO_URL y VITE_INVENTARIO_URL; por defecto usa localhost:3004, localhost:3002 y localhost:3003. Otras pantallas del proyecto aún contienen URLs locales y requieren adaptación antes de publicar.

## Verificación

- Compilación del frontend completada.
- Pruebas del API: desde frontend ejecutar node --test tests/carrito-api.test.mjs.
- Revisión de código de los archivos modificados.
- Navegador + servicios Docker + PostgreSQL: agregar desde inicio y catálogo, contador, aumentar cantidad, rechazo de cantidad fraccionaria y exceso de stock, persistencia al recargar, eliminar, cancelar/confirmar vaciado y cerrar carrito.
- Diseño del carrito revisado en escritorio y móvil. El encabezado existente tiene limitaciones de ancho en móvil.
- La prueba interactiva se hizo como invitado. También se probaron login real, propietario, persistencia y aislamiento mediante API con una cuenta temporal de cliente, limpiada al terminar. La interfaz del cambio de sesión sigue pendiente de aceptación.
- Se cerró el carrito de prueba; no se crearon pedidos ni reservas.

## Integración de pedidos

El checkout, Mis pedidos, efectivo pendiente de cobro, cancelación, vencimiento y entrega/retiro están integrados. Ver docs/vista-cliente.md para el estado actual. La fusión automática de carritos y promociones requieren reglas propias.

## Comunicación protegida pedidos/pagos

SERVICE_API_KEY debe configurarse como secreto compartido en pedidos, pagos e inventario. Se generó localmente en .env excluido de Git; .env.example solo contiene el nombre vacío. No usar una variable VITE_ para este secreto. El servidor envía x-service-key; las llamadas administrativas requieren JWT con ADMINISTRADOR. Pagos solo puede confirmar o cancelar pedidos mediante el callback. El frontend mantiene los endpoints de pedidos para consultas y operaciones del propietario.

Verificación: node --test services/pedidos/tests/seguridad-servicios.test.cjs (desde la raíz). Pasaron ocho casos de autorización, 15 comprobaciones reales de cliente/seguridad y comunicación en ambas direcciones. No se crearon pedidos, pagos ni reservas. En esta fase no se validaron importes de un pago real, caducidad de reservas ni callbacks de un proveedor de pago. Revisar las alertas de dependencias antes de producción, sin aplicar actualizaciones mayores automáticas.


## Crear pedido desde el carrito

Entrar al carrito, pulsar **Continuar con mi pedido**, completar nombre y teléfono, elegir retiro o domicilio pulsar **Calcular total** y después **Crear mi pedido**. El resultado muestra número, estado, total y vencimiento de la reserva. No realiza cobros. El catálogo de inicio permite abrir cada categoría y conserva el filtro en la URL.

Se amplía el POST /pedidos existente con un objeto contacto que utiliza campos reales de PedidoContacto: comprador_nombre, comprador_telefono, comprador_correo y, para domicilio, departamento, municipio, zona, direccion y referencias. Los IDs son enteros positivos, modalidad RETIRO/DOMICILIO y clave_idempotencia de 16–80 caracteres. No acepta precios, impuestos ni propietario suministrados por el navegador.

El servidor guarda contacto, detalles y borrador en una transacción; congela el carrito, reserva inventario y finaliza PENDIENTE_CONFIRMACION. Los reintentos conservan la clave y comparan contacto, facturación, sucursal y modalidad. PostgreSQL serializa reintentos. Una respuesta perdida de inventario conserva el borrador para recuperar la misma reserva. Un rechazo definitivo por stock cancela ese intento, desvincula el carrito y lo devuelve a ACTIVO. Las modificaciones del carrito usan control de concurrencia con updated_at. Los impuestos y bases se redondean por línea para cumplir los CHECK existentes.

Domicilio utiliza TarifaEntrega y ZonaEntrega vigentes de la sucursal y la dirección exacta, aplica mínimo de compra y umbral_gratis; sin tarifa se rechaza sin crear pedido. La tarifa local de ejemplo para Guatemala zona 5 fue autorizada por el usuario: Q20, mínimo Q50 y gratis desde Q200. Una presentación sin SKU es rechazada porque DetallePedido exige ese dato; debe configurarse desde catálogo. No se modifica el catálogo existente durante integración.

Se protege lectura de contacto, facturación y envío por propietario; las escrituras auxiliares quedan para administrador. El contacto del cliente se guarda mediante el checkout. El cliente puede elegir efectivo con reserva vigente; se registra pago PENDIENTE y solicitud CONFIRMADA, sin declarar el cobro recibido. Se retiró el bloqueo por receta en pedidos nuevos.

Prueba manual local: node services/pedidos/tests/checkout-integracion.local.cjs. Crea presentaciones, precios, lotes, existencias, carritos y pedidos temporales; libera reservas y elimina únicamente esos registros. Incluye doble envío, una reserva, recuperación de finalización perdida, contacto, permisos, ausencia del bloqueo por receta, domicilio sin cobertura, stock insuficiente y recuperación del carrito.

La cancelación, el vencimiento, Mis pedidos y el efectivo ya están integrados; queda elegir una pasarela para otros métodos de pago y completar la vista operativa del personal. El formulario conserva el intento en sessionStorage mientras esa pestaña permanezca disponible; cerrar la pestaña pierde ese acceso de recuperación para invitados. La reserva bloquea las filas de existencias de la sucursal durante su transacción para evitar sobreventa entre pedidos simultáneos.
