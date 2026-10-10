import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaTrash, FaPills } from 'react-icons/fa';
import HeaderPublico from '../../components/public/HeaderPublico';
import FooterPublico from '../../components/public/FooterPublico';
import { useCarrito } from '../../context/CarritoContext';
import { useAuth } from '../../context/AuthContext';

const dinero = (value, moneda) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda || 'GTQ' }).format(Number(value || 0));

function Cantidad({ item, bloqueado, cambiar }) {
  const [valor, setValor] = useState(String(item.cantidad));
  const [error, setError] = useState('');
  const guardar = async () => {
    const cantidad = Number(valor);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) { setError('Usa un entero entre 1 y 999.'); return; }
    setError('');
    if (cantidad === item.cantidad) return;
    if (!await cambiar(item.id_item_carrito, cantidad)) setValor(String(item.cantidad));
  };
  return <div><div className="gaby-cart-quantity">
    <button type="button" disabled={bloqueado || item.cantidad <= 1} aria-label={`Disminuir cantidad de ${item.nombre_producto}`} onClick={() => cambiar(item.id_item_carrito, item.cantidad - 1)}>−</button>
    <input aria-label={`Cantidad de ${item.nombre_producto}`} type="number" min="1" max="999" step="1" disabled={bloqueado} value={valor} onChange={e => { setValor(e.target.value); setError(''); }} onBlur={guardar} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
    <button type="button" disabled={bloqueado || item.cantidad >= 999} aria-label={`Aumentar cantidad de ${item.nombre_producto}`} onClick={() => cambiar(item.id_item_carrito, item.cantidad + 1)}>+</button>
  </div>{error && <small role="alert" className="gaby-cart-error-text">{error}</small>}</div>;
}

export default function Carrito() {
  const { sesionCarrito, carrito, cargando, ocupado, error, sucursal, sucursales, esPersonal, actualizar, cambiarCantidad, eliminar, vaciar, abandonar, cambiarSucursal } = useCarrito();
  const { token } = useAuth();
  const [pedidoPendiente] = useState(() => { try { return !!sessionStorage.getItem(`gaby.checkout.v1.${sesionCarrito}`); } catch { return false; } });
  const [confirmacion, setConfirmacion] = useState(null);
  const items = carrito?.items || [];
  const bloqueado = ocupado || cargando || (carrito && carrito.estado !== 'ACTIVO');
  return <div className="gaby-cart-page"><HeaderPublico /><main className="gaby-cart-main">
    <Link className="gaby-cart-back" to="/productos">← Seguir comprando</Link>
    <div className="gaby-cart-heading"><div><span className="gaby-cart-eyebrow">FARMACIA GABY</span><h1><FaShoppingCart /> Mi carrito</h1><p>Revisa tus productos, cantidades y precios vigentes.</p></div><button className="gaby-cart-button secondary" type="button" disabled={ocupado || cargando || esPersonal} onClick={actualizar}>Actualizar carrito</button></div>
    {esPersonal ? <div className="gaby-cart-empty"><h2>Carrito para clientes e invitados</h2><p>Inicia sesión con una cuenta de cliente o cierra sesión para comprar como invitado.</p></div> : <>
      <div className="gaby-cart-branch"><label htmlFor="cart-sucursal">Sucursal</label><select id="cart-sucursal" value={sucursal || ''} disabled={bloqueado || items.length > 0} onChange={e => cambiarSucursal(e.target.value)}><option value="" disabled>Selecciona una sucursal</option>{sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}</select><small>{items.length ? 'Vacía el carrito para cambiar de sucursal.' : 'Las existencias se consultan en la sucursal seleccionada.'}</small></div>
      {pedidoPendiente && <div className="gaby-cart-message"><p>Hay un intento de pedido pendiente de completar.</p><Link className="gaby-cart-button" to="/checkout">Continuar con el pedido pendiente</Link></div>}
      {!token && <p className="gaby-cart-note">Tu carrito de invitado se conserva en este navegador. Al iniciar sesión verás el carrito de tu cuenta; ambos se mantienen separados.</p>}
      {error && <div className="gaby-cart-message error" role="alert">{error}</div>}
      {cargando ? <div className="gaby-cart-empty" role="status">Cargando tu carrito…</div> : items.length === 0 ? <div className="gaby-cart-empty"><FaShoppingCart /><h2>Tu carrito está vacío</h2><p>Encuentra productos en el catálogo y agrégalos a tu carrito.</p><Link className="gaby-cart-button" to="/productos">Explorar productos</Link></div> : <div className="gaby-cart-layout">
        <section className="gaby-cart-items" aria-label="Productos del carrito">
          <div className="gaby-cart-items-title"><h2>Productos ({items.length})</h2><button type="button" className="gaby-cart-text-button" disabled={bloqueado} onClick={() => setConfirmacion('vaciar')}>Vaciar carrito</button></div>
          {items.map(item => <article className="gaby-cart-item" key={item.id_item_carrito}>
            <div className="gaby-cart-product-icon"><FaPills /></div>
            <div className="gaby-cart-description"><h3>{item.nombre_producto || 'Producto no disponible'}</h3><p>{item.presentacion}</p>{item.sku && <small>SKU: {item.sku}</small>}{!item.disponible && <p className="gaby-cart-error-text">{item.motivo_no_disponible}</p>}{item.precio_cambio && <p className="gaby-cart-warning">El precio cambió de {dinero(item.precio_observado, carrito.moneda)} a {dinero(item.precio_actual, carrito.moneda)}.</p>}<p className="gaby-cart-unit-price">{item.precio_actual == null ? 'Sin precio vigente' : `${dinero(item.precio_actual, carrito.moneda)} por presentación`}</p></div>
            <Cantidad key={`${item.id_item_carrito}-${item.cantidad}`} item={item} bloqueado={bloqueado || !item.disponible} cambiar={cambiarCantidad} />
            <div className="gaby-cart-line-total"><strong>{dinero(item.subtotal, carrito.moneda)}</strong><button type="button" className="gaby-cart-text-button" disabled={bloqueado} onClick={() => eliminar(item.id_item_carrito)} aria-label={`Eliminar ${item.nombre_producto || 'producto'}`}><FaTrash /> Eliminar</button></div>
          </article>)}
        </section>
        <aside className="gaby-cart-summary"><h2>Resumen del carrito</h2><div><span>Presentaciones</span><strong>{carrito.resumen.cantidad_unidades}</strong></div><div className="gaby-cart-total"><span>Subtotal mostrado</span><strong>{dinero(carrito.resumen.subtotal, carrito.moneda)}</strong></div><p>Envío y ajustes se determinarán al crear el pedido. El carrito todavía no reserva existencias.</p>{carrito.resumen.hay_items_no_disponibles && <p className="gaby-cart-warning">El subtotal excluye los productos no disponibles.</p>}<Link className="gaby-cart-button" to="/checkout">Continuar con mi pedido</Link><Link className="gaby-cart-text-button" to="/productos">Agregar más productos</Link><button className="gaby-cart-text-button" type="button" disabled={bloqueado} onClick={() => setConfirmacion('abandonar')}>Cerrar este carrito</button><small>Válido hasta {new Date(carrito.vence_at).toLocaleString('es-GT', { timeZone: 'America/Guatemala' })}.</small></aside>
      </div>}
      {confirmacion && <div className="gaby-cart-message confirmation" role="alert"><p>{confirmacion === 'vaciar' ? '¿Eliminar todos los productos del carrito?' : '¿Cerrar este carrito y comenzar uno nuevo?'}</p><div><button className="gaby-cart-button" type="button" disabled={ocupado} onClick={async () => { const ok = await (confirmacion === 'vaciar' ? vaciar() : abandonar()); if (ok) setConfirmacion(null); }}>Sí, continuar</button><button className="gaby-cart-button secondary" type="button" disabled={ocupado} onClick={() => setConfirmacion(null)}>Cancelar</button></div></div>}
    </>}
  </main><FooterPublico /></div>;
}
