# Vista de cliente de GabyFarma

Actualizado el 10 de octubre de 2026.

## Funcionalidades

- Carrito con catálogo, precios y stock reales; aislamiento de invitado/cliente y autorización del propietario.
- Checkout para retiro o domicilio. Precarga perfil y direcciones guardadas; admite destinatario, teléfono de entrega, instrucciones y datos opcionales de facturación con los modelos existentes.
- Cotización antes de crear: productos, impuestos, envío y total calculados por el servidor. Si cambia el total se solicita recalcular. Los reintentos conservan la clave y evitan duplicar pedidos o reservas.
- Mis pedidos, detalle, historial, pagos, datos de entrega y resumen imprimible. El resumen no constituye factura fiscal.
- Cancelación por el propietario antes de preparación, con motivo opcional. Cancela pagos pendientes y libera stock una sola vez. Un cobro autorizado o confirmado bloquea la cancelación automática; requiere gestión del personal.
- Vencimiento automático: reserva inicial de 15 minutos; al elegir efectivo, solicitud confirmada y reserva de 48 horas, con cobro todavía pendiente. El servicio pedidos revisa vencimientos al arrancar y cada 60 segundos. No cancela automáticamente pedidos ya cobrados o preparados.
- Efectivo al retirar/recibir. Confirmar la solicitud no confirma el cobro; solo personal autorizado o comunicación interna protegida puede registrarlo. Tarjetas y transferencias no se ofrecen sin pasarela real.
- Domicilio sincroniza envío interno al confirmar, preparar, despachar, completar o cancelar el pedido. El número interno no constituye rastreo de una transportadora. Retiro muestra la sucursal y dirección reales y solicita presentar el número del pedido cuando esté listo.
- Se retiró el flujo de carga/revisión de recetas y el bloqueo por receta para pedidos nuevos. Se conserva la marca original del catálogo; no se alteraron productos ni estados históricos masivamente.
- Categorías clickeables y 45 fichas de necesidades de salud, con búsqueda, orientación educativa, fuentes NHS/MedlinePlus y enlaces a categorías reales.

## Entrega de ejemplo autorizada

Sucursal 1, departamento Guatemala, municipio Guatemala, zona 5: Q20 por envío, mínimo de compra Q50, gratis desde Q200. Los límites se aplican sobre el importe de productos con impuesto, antes del envío. Fuera de la cobertura se rechaza la cotización. Son valores de ejemplo autorizados por el usuario, pendientes de sustituir por reglas reales antes de publicar. No se inventó un plazo de entrega.

La configuración local es reproducible con node scripts/configurar-entrega-ejemplo.local.cjs. Conserva historial de tarifas y evita duplicar la tarifa vigente. No ejecutar sobre producción sin revisar sucursal y tarifas.

## Integración y seguridad

Se conservaron los modelos Prisma existentes; no hubo migraciones. Inventario ahora protege crear/confirmar/consumir/liberar reservas mediante SERVICE_API_KEY, compartida con pedidos y pagos solo en el servidor. La autorización JWT/propietario sigue verificándose en pedidos. Las transiciones usan transacciones, bloqueo por pedido y control de estado para evitar doble consumo o carreras entre cancelar y cobrar.

Nuevas rutas: GET /sucursales en inventario; GET /pedidos/entrega-configuracion, POST /pedidos/cotizacion y PATCH /pedidos/:id/cancelar en pedidos; PATCH /pagos/pedido/:id_pedido/cancelar-pendientes para coordinación interna protegida. El checkout, pagos y cambio administrativo de estado reutilizan rutas existentes.

## Verificación

Compilación Vite y ESLint de archivos afectados correctos. Pasaron 81 comprobaciones de ciclo de pedido, 22 de concurrencia/entrega, 34 de regresión del checkout y 4 de tarifas. También se verificó en navegador seleccionar dirección, cotizar, crear con facturación, elegir efectivo y cancelar. Se limpian únicamente los datos sintéticos creados para las pruebas. La configuración autorizada de zona 5 se conserva.

Pruebas locales contra Docker y .env local, nunca contra producción:

1. node services/pedidos/tests/checkout-integracion.local.cjs
2. node services/pedidos/tests/ciclo-pedido-integracion.local.cjs --keep
3. node services/pedidos/tests/ciclo-pedido-carreras.local.cjs
4. node services/pedidos/tests/ciclo-pedido-integracion.local.cjs --cleanup

El archivo temporal contiene credenciales sintéticas y está excluido de Git. Si se interrumpe una prueba conservada, ejecutar --cleanup antes de repetir. Vite mantiene su advertencia existente por tamaño del paquete JavaScript.

## Siguiente trabajo

La vista administrativa de pedidos, cobros en efectivo y entrega/retiro ya está integrada; ver docs/personal.md. Quedan adaptación de Usuarios/Bitácora, permisos por puesto y edición de tarifas. Luego recuperación de contraseña, contactos/horarios reales, pasarela de pago si se requiere y configuración/verificación para publicación. No se publicó ni se subió esta etapa a Git.
