const PEDIDOS = (import.meta.env.VITE_PEDIDOS_URL || 'http://localhost:3004').replace(/\/$/, '');
const CATALOGO = (import.meta.env.VITE_CATALOGO_URL || 'http://localhost:3002').replace(/\/$/, '');
const AUTH = (import.meta.env.VITE_AUTH_URL || 'http://localhost:3001/api/auth').replace(/\/$/, '');
const INVENTARIO = (import.meta.env.VITE_INVENTARIO_URL || 'http://localhost:3003').replace(/\/$/, '');

async function request(url, { method = 'GET', body, identidad, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (identidad?.token) headers.Authorization = `Bearer ${identidad.token}`;
  else if (identidad?.invitado) headers['x-token-invitado'] = identidad.invitado;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  } catch { throw new Error('No se pudo conectar con el servicio. Verifica la conexión e intenta de nuevo.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('El servicio devolvió una respuesta inválida. Intenta de nuevo.'); }
  if (!response.ok) {
    const error = new Error(data.message || 'No fue posible completar la operación.');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const carritoApi = {
  perfil: identidad => request(`${AUTH}/perfil`, { identidad }),
  direcciones: identidad => request(`${AUTH}/direcciones`, { identidad }),
  sucursales: () => request(`${INVENTARIO}/sucursales`),
  entrega: id => request(`${PEDIDOS}/pedidos/entrega-configuracion?id_sucursal=${id}`),
  cotizarPedido: (identidad, body) => request(`${PEDIDOS}/pedidos/cotizacion`, {method:'POST', identidad, body}),
  cancelarPedido: (identidad, id, motivo) => request(`${PEDIDOS}/pedidos/${id}/cancelar`, {method:'PATCH', identidad, body:{motivo}}),
  iniciarPago: (identidad, id, metodo) => request(`${PEDIDOS}/pedidos/${id}/pago`, {method:'POST', identidad, body:{metodo}}),
  pagosPedido: (identidad, id, signal) => request(`${PEDIDOS}/pedidos/${id}/pagos`, {identidad, signal}),
  misPedidos: (identidad, signal) => request(`${PEDIDOS}/pedidos/mis-pedidos`, { identidad, signal }),
  pedido: (identidad, id, signal) => request(`${PEDIDOS}/pedidos/${id}`, { identidad, signal }),
  crearPedido: (identidad, body) => request(`${PEDIDOS}/pedidos`, { method: 'POST', identidad, body }),
  categorias: () => request(`${CATALOGO}/catalogos/categorias`),
  activo: identidad => request(`${PEDIDOS}/carritos/activo`, { identidad }),
  crear: (identidad, id_sucursal) => request(`${PEDIDOS}/carritos`, { method: 'POST', identidad, body: { moneda: 'GTQ', id_sucursal } }),
  agregar: (identidad, id_carrito, id_presentacion, cantidad) => request(`${PEDIDOS}/items-carrito`, { method: 'POST', identidad, body: { id_carrito, id_presentacion, cantidad } }),
  cantidad: (identidad, id, cantidad) => request(`${PEDIDOS}/items-carrito/${id}`, { method: 'PUT', identidad, body: { cantidad } }),
  eliminar: (identidad, id) => request(`${PEDIDOS}/items-carrito/${id}`, { method: 'DELETE', identidad }),
  vaciar: (identidad, id) => request(`${PEDIDOS}/carritos/${id}/items`, { method: 'DELETE', identidad }),
  abandonar: (identidad, id) => request(`${PEDIDOS}/carritos/${id}/abandonar`, { method: 'PATCH', identidad, body: {} }),
  productos: () => request(`${CATALOGO}/productos`),
  promociones: () => request(`${CATALOGO}/productos/promociones`),
  existencias: () => request(`${INVENTARIO}/existencias/resumen`),
};

export function precioVigente(precios = [], idSucursal, moneda = 'GTQ') {
  const ahora = Date.now();
  return precios.filter(p => new Date(p.desde).getTime() <= ahora && (!p.hasta || new Date(p.hasta).getTime() > ahora) && ['TODOS', 'WEB'].includes(p.canal) && (p.id_sucursal == null || p.id_sucursal === Number(idSucursal)) && p.ref_id_lista?.estado === 'ACTIVO' && p.ref_id_lista.moneda === moneda)
    .sort((a, b) => Number(b.id_sucursal != null) - Number(a.id_sucursal != null) || new Date(b.desde) - new Date(a.desde))[0] || null;
}

export function productosParaVenta(productos, existencias, sucursal) {
  return productos.flatMap(producto => (producto.rel_presentacion_producto_id_producto || []).map(p => {
    const precio = precioVigente(p.rel_precio_presentacion_id_presentacion, sucursal);
    const categoria = producto.rel_producto_categoria_id_producto || [];
    return {
      id: p.id_presentacion_producto, idPresentacion: p.id_presentacion_producto, idProducto: producto.id_producto,
      nombre: p.nombre || producto.nombre, sku: p.sku, categorias: categoria.map(c => c.ref_id_categoria?.nombre).filter(Boolean), categoria: (categoria.find(c => c.principal) || categoria[0])?.ref_id_categoria?.nombre || 'Sin categoría',
      requiereReceta: producto.requiere_receta === true,
      precio: precio ? Number(precio.importe) * (precio.incluye_impuesto ? 1 : 1 + Number(precio.tasa_impuesto)) : null,
      stock: existencias.filter(e => Number(e.id_presentacion) === p.id_presentacion_producto && Number(e.sucursal?.id_sucursal) === Number(sucursal)).reduce((sum, e) => sum + Math.max(0, Number(e.cantidad_disponible) || 0), 0),
      marca: producto.ref_id_marca?.nombre || null, laboratorio: producto.ref_id_laboratorio?.nombre || null,
    };
  }));
}
