export const estadosPedido = { BORRADOR: 'Reserva en proceso', PENDIENTE_RECETA: 'Pendiente de receta', PENDIENTE_CONFIRMACION: 'Pendiente de confirmación', CONFIRMADO: 'Confirmado', PREPARANDO: 'En preparación', LISTO: 'Listo', EN_ENTREGA: 'En entrega', COMPLETADO: 'Completado', CANCELADO: 'Cancelado', REVISION: 'En revisión' };
export const etiquetaEstado = estado => estadosPedido[estado] || estado || 'Sin estado';
export const dineroPedido = (valor, moneda = 'GTQ') => new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda }).format(Number(valor || 0));
export const fechaPedido = valor => valor ? new Date(valor).toLocaleString('es-GT', { timeZone: 'America/Guatemala' }) : 'Sin fecha';
export const modalidadPedido = valor => ({ RETIRO: 'Retiro en sucursal', DOMICILIO: 'Entrega a domicilio', MOSTRADOR: 'Mostrador' })[valor] || valor;
