import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PersonalLayout from '../../layouts/PersonalLayout';
import { useAuth } from '../../context/AuthContext';
import { adminApi, dinero, fecha } from '../../api/adminApi';
export default function DevolucionesAdmin() {
  const {
      token,
      usuario
    } = useAuth(),
    admin = usuario.roles.includes('ADMINISTRADOR'),
    despacho = admin || usuario.roles.includes('DESPACHO'),
    [pedidos, setPedidos] = useState([]),
    [devoluciones, setDevoluciones] = useState([]),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [ocupado, setOcupado] = useState(false),
    [pedido, setPedido] = useState(''),
    [cantidades, setCantidades] = useState({}),
    [motivo, setMotivo] = useState(''),
    [condicion, setCondicion] = useState(''),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [confirmar, setConfirmar] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([adminApi('pedidos', '/pedidos', token, {
      signal: c.signal
    }), adminApi('pedidos', '/devoluciones', token, {
      signal: c.signal
    })]).then(([p, d]) => {
      setPedidos(p.filter(x => x.estado === 'COMPLETADO'));
      setDevoluciones(d);
    }).catch(e => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, [token, revision]);
  async function crear(e) {
    e.preventDefault();
    setOcupado(true);
    setError('');
    try {
      const detalles = Object.entries(cantidades).filter(([, q]) => Number(q) > 0).map(([id, q]) => ({
        id_detalle: Number(id),
        cantidad: Number(q),
        condicion
      }));
      await adminApi('pedidos', '/devoluciones', token, {
        method: 'POST',
        body: {
          id_pedido: Number(pedido),
          motivo,
          detalles,
          clave_idempotencia: key
        }
      });
      setPedido('');
      setCantidades({});
      setMotivo('');
      setCondicion('');
      setKey(crypto.randomUUID());
      setRevision(n => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  async function estado() {
    setOcupado(true);
    setError('');
    try {
      await adminApi('pedidos', `/devoluciones/${confirmar.id}/estado`, token, {
        method: 'PATCH',
        body: {
          estado: confirmar.estado
        }
      });
      setConfirmar(null);
      setRevision(n => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  const p = pedidos.find(x => x.id_pedido === Number(pedido));
  return <PersonalLayout titulo="Devoluciones"><p>El administrador autoriza la devolución; despacho registra los productos recibidos. Se guardan en cuarentena y no vuelven a venderse automáticamente. Caja confirma el efectivo devuelto.</p>{error && <p role="alert" className="personal-error">{error}</p>}{despacho && <form className="personal-card admin-form" onSubmit={crear}><h2>Solicitar devolución de un pedido entregado</h2><label>Pedido<select required value={pedido} onChange={e => {
          setPedido(e.target.value);
          setCantidades({});
          setKey(crypto.randomUUID());
        }}><option value="">Selecciona un pedido</option>{pedidos.map(p => <option key={p.id_pedido} value={p.id_pedido}>{p.numero}</option>)}</select></label>{p?.rel_detalle_pedido_id_pedido.map(d => <label key={d.id_detalle_pedido}>{d.nombre_producto} · {d.presentacion} · entregadas: {d.cantidad}<input aria-label={`Cantidad de ${d.nombre_producto}`} type="number" min="0" max={d.cantidad} step="1" value={cantidades[d.id_detalle_pedido] || ''} onChange={e => setCantidades({
          ...cantidades,
          [d.id_detalle_pedido]: e.target.value
        })} /></label>)}<label>Motivo<textarea required maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} /></label><label>Condición de los productos<textarea required maxLength={200} value={condicion} onChange={e => setCondicion(e.target.value)} /></label><button disabled={ocupado || !p}>Registrar solicitud</button></form>}{confirmar && <section className="personal-card"><p>Confirmar devolución #{confirmar.id}: {confirmar.estado}. {confirmar.estado === 'RECIBIDA' ? 'Confirma únicamente si recibiste físicamente estos productos.' : ''}</p><button disabled={ocupado} onClick={estado}>Confirmar</button><button disabled={ocupado} onClick={() => setConfirmar(null)}>Volver</button></section>}{devoluciones.map(d => <section className="personal-card" key={d.id_devolucion}><h2>Devolución #{d.id_devolucion} · {d.ref_id_pedido.numero}</h2><p>{d.estado} · {fecha(d.created_at)}<br />{d.motivo}</p><ul>{d.rel_detalle_devolucion_id_devolucion.map(x => <li key={x.id_detalle_devolucion}>{x.ref_id_detalle.nombre_producto}: {x.cantidad} · {x.condicion}</li>)}</ul><p>Importe de los productos: {dinero(d.maximo_reembolso)}</p><div className="personal-tools">{(d.estado === 'SOLICITADA' && admin ? ['AUTORIZADA', 'RECHAZADA'] : d.estado === 'AUTORIZADA' && despacho ? ['RECIBIDA'] : d.estado === 'RECIBIDA' && admin ? ['CERRADA'] : []).map(estado => <button disabled={ocupado} key={estado} onClick={() => setConfirmar({
          id: d.id_devolucion,
          estado
        })}>{estado}</button>)}{d.estado === 'RECIBIDA' && admin && <Link to={`/admin/pagos?pedido=${d.id_pedido}&devolucion=${d.id_devolucion}`}>Gestionar reembolso</Link>}<Link to={`/admin/pedidos/${d.id_pedido}`}>Ver pedido</Link></div></section>)}</PersonalLayout>;
}
