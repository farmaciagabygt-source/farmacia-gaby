# Pedidos conservados para presentación

Solicitado por el usuario el 10/10/2026. Datos ficticios locales, sin cargos bancarios.

43 | PED-1791631917467-849FF602 | CANCELADO
44 | PED-1791631918813-27187C92 | CANCELADO
45 | PED-1791631931351-FB61E297 | CANCELADO
46 | PED-1791631944883-534DF03D | COMPLETADO
47 | PED-1791631958135-B4A1CA51 | PREPARANDO

El pedido de efectivo pendiente está PREPARANDO para conservarlo frente al vencimiento automático de solicitudes sin atender. Permite mostrar el cobro en Pagos y después avanzar a listo/entrega. Los ejemplos completados y cancelados permanecen en el listado. Se conservan su producto, inventario, cuenta de cliente y cobertura ficticia necesaria para mantener las referencias.

No ejecutar la limpieza de ciclo-pedido-integracion.local.cjs mientras se necesiten estos ejemplos. El archivo de referencias y credenciales sintéticas está excluido de Git.

## Demostración administrativa adicional

Se conserva el pedido **48**, COMPLETADO, de un cliente/producto sintéticos separados. Su pago **22** figura REEMBOLSADO; sus devoluciones **1 y 2** están CERRADAS; dos unidades regresaron a CUARENTENA. Los reembolsos **1 y 3** están CONFIRMADOS y el reembolso concurrente de prueba **2** está CANCELADO. No son transacciones bancarias reales.

Consulta /admin/devoluciones, /admin/pagos?pedido=48 y /bitacora. No borrar este pedido durante la presentación. Las cuentas temporales privilegiadas usadas para verificar roles se retiran, conservando el cliente de demostración.
