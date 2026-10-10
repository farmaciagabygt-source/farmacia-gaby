import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HeaderPublico from '../../components/public/HeaderPublico';
import FooterPublico from '../../components/public/FooterPublico';
import { useAuth } from '../../context/AuthContext';
import { carritoApi } from '../../api/carritoApi';
import { dineroPedido, etiquetaEstado, fechaPedido, modalidadPedido } from '../../utils/pedidos';
import '../../styles/cliente.css';

export default function MisPedidos() {
  const { token, usuario } = useAuth();
  const cliente = !!token && usuario?.roles?.includes('CLIENTE');
  return <div className="cliente-page"><HeaderPublico /><main className="cliente-main"><Link className="cliente-back" to="/productos">← Seguir comprando</Link><h1>Mis pedidos</h1><p className="cliente-lead">Consulta los pedidos de tu cuenta y vuelve a abrir sus detalles cuando lo necesites.</p>
    {cliente ? <Lista key={token} token={token} /> : <section className="cliente-panel cliente-empty"><h2>Inicia sesión con tu cuenta de cliente</h2><p>Abre Mi cuenta en la parte superior para ver tus pedidos. Los pedidos de invitado se consultan desde su enlace de confirmación en el mismo navegador.</p><Link className="cliente-button" to="/productos">Explorar productos</Link></section>}
  </main><FooterPublico /></div>;
}

function Lista({ token }) {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  useEffect(() => { let alive = true; const controller = new AbortController(); carritoApi.misPedidos({ token }, controller.signal).then(data => { if (alive) { setPedidos(data); setError(''); } }).catch(err => { if (alive) setError(err.message); }).finally(() => { if (alive) setCargando(false); }); return () => { alive = false; controller.abort(); }; }, [token, intento]);
  const actualizar = () => { setCargando(true); setError(''); setIntento(n => n + 1); };
  return <><div className="cliente-heading"><span>{pedidos.length} pedidos en tu cuenta</span><button type="button" className="cliente-button secondary" onClick={actualizar} disabled={cargando}>Actualizar pedidos</button></div>
    {error && <div className="cliente-note cliente-error" role="alert">{error}<p><button type="button" className="cliente-button secondary" onClick={actualizar}>Reintentar</button></p></div>}
    {cargando ? <p role="status">Cargando pedidos…</p> : !error && !pedidos.length ? <section className="cliente-panel cliente-empty"><h2>Todavía no tienes pedidos</h2><p>Agrega productos al carrito y crea tu primer pedido.</p><Link className="cliente-button" to="/productos">Ver productos</Link></section> : !error && <div className="pedido-lista">{pedidos.map(p => <article className="cliente-panel" style={{ margin: 0 }} key={p.id_pedido}><div className="pedido-card-top"><div><h2>{p.numero}</h2><small>{fechaPedido(p.created_at)}</small></div><span className={`pedido-badge ${p.estado}`}>{etiquetaEstado(p.estado)}</span></div><div className="pedido-meta"><span>{modalidadPedido(p.modalidad)}</span><span>{p.rel_detalle_pedido_id_pedido.reduce((total, d) => total + d.cantidad, 0)} presentaciones</span><span>Total: <strong>{dineroPedido(p.total, p.moneda)}</strong></span></div><p>{p.rel_detalle_pedido_id_pedido.map(d => d.nombre_producto).join(' · ')}</p><Link className="cliente-button" to={`/mis-pedidos/${p.id_pedido}`}>Ver detalle de {p.numero}</Link></article>)}</div>}
  </>;
}
