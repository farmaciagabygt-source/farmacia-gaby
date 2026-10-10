import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi, dinero, fecha } from '../../api/adminApi';
export default function Reembolsos() {
  const {
      token,
      usuario
    } = useAuth(),
    [params] = useSearchParams(),
    admin = usuario.roles.includes('ADMINISTRADOR'),
    [datos, setDatos] = useState([]),
    [pagos, setPagos] = useState([]),
    [error, setError] = useState(''),
    [mensaje, setMensaje] = useState(''),
    [revision, setRevision] = useState(0),
    [ocupado, setOcupado] = useState(false),
    [confirmar, setConfirmar] = useState(null),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [form, setForm] = useState({
      id_pago: '',
      id_devolucion: params.get('devolucion') || '',
      monto: '',
      motivo: ''
    });
  useEffect(() => {
    const c = new AbortController();
    Promise.all([adminApi('pagos', '/reembolsos', token, {
      signal: c.signal
    }), adminApi('pagos', '/pagos', token, {
      signal: c.signal
    })]).then(([r, p]) => {
      setDatos(r);
      setPagos(p);
    }).catch(e => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, [token, revision]);
  async function solicitar(e) {
    e.preventDefault();
    setOcupado(true);
    setError('');
    try {
      await adminApi('pagos', '/reembolsos', token, {
        method: 'POST',
        body: {
          ...form,
          clave_idempotencia: key
        }
      });
      setMensaje('Reembolso solicitado. Debe pasar a procesando y confirmarse cuando el efectivo se haya devuelto.');
      setKey(crypto.randomUUID());
      setForm({
        ...form,
        monto: '',
        motivo: ''
      });
      setRevision(n => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  async function cambiar() {
    setOcupado(true);
    setError('');
    try {
      await adminApi('pagos', `/reembolsos/${confirmar.id}/estado`, token, {
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
  const filtrados = datos.filter(r => !params.get('pedido') || pagos.find(p => p.id_pago === r.id_pago)?.id_pedido === Number(params.get('pedido')));
  return <section className="personal-card"><h2>Reembolsos en efectivo</h2><p>La confirmación registra dinero devuelto por la farmacia. No ejecuta una devolución bancaria.</p>{error && <p role="alert" className="personal-error">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}{admin && <form className="admin-form" onSubmit={solicitar}><label>Pago confirmado<select required value={form.id_pago} onChange={e => setForm({
          ...form,
          id_pago: e.target.value
        })}><option value="">Selecciona pago</option>{pagos.filter(p => p.metodo === 'EFECTIVO' && ['CONFIRMADO', 'REEMBOLSADO_PARCIAL'].includes(p.estado) && (!params.get('pedido') || p.id_pedido === Number(params.get('pedido')))).map(p => <option key={p.id_pago} value={p.id_pago}>Pago #{p.id_pago} · pedido #{p.id_pedido} · {dinero(p.monto)}</option>)}</select></label><label>Devolución de productos (opcional)<input type="number" min="1" step="1" value={form.id_devolucion} onChange={e => setForm({
          ...form,
          id_devolucion: e.target.value
        })} /></label><label>Importe a devolver<input required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" value={form.monto} onChange={e => setForm({
          ...form,
          monto: e.target.value
        })} /></label><label>Motivo<textarea required maxLength={500} value={form.motivo} onChange={e => setForm({
          ...form,
          motivo: e.target.value
        })} /></label><button disabled={ocupado}>Solicitar reembolso</button></form>}{confirmar && <div className="personal-confirm"><p>{confirmar.estado === 'CONFIRMADO' ? `¿Ya devolviste ${dinero(confirmar.monto)} en efectivo al cliente?` : `Cambiar reembolso #${confirmar.id} a ${confirmar.estado}.`}</p><button disabled={ocupado} onClick={cambiar}>{confirmar.estado === 'CONFIRMADO' ? 'Sí, devolví el efectivo' : 'Confirmar cambio'}</button><button disabled={ocupado} onClick={() => setConfirmar(null)}>Volver</button></div>}<button disabled={ocupado} onClick={() => setRevision(n => n + 1)}>Actualizar reembolsos</button><div className="personal-table"><table><thead><tr><th>Reembolso</th><th>Pago</th><th>Devolución</th><th>Importe</th><th>Estado</th><th>Motivo / fecha</th><th>Acción</th></tr></thead><tbody>{filtrados.map(r => <tr key={r.id_reembolso}><td>#{r.id_reembolso}</td><td>#{r.id_pago}</td><td>{r.id_devolucion || 'Sin productos'}</td><td>{dinero(r.monto)}</td><td>{r.estado}</td><td>{r.motivo}<br />{fecha(r.confirmado_at || r.created_at)}</td><td>{(r.estado === 'SOLICITADO' && admin ? ['PROCESANDO', 'CANCELADO'] : r.estado === 'PROCESANDO' ? admin ? ['CONFIRMADO', 'FALLIDO', 'CANCELADO'] : ['CONFIRMADO'] : []).map(estado => <button disabled={ocupado} key={estado} onClick={() => setConfirmar({
                id: r.id_reembolso,
                estado,
                monto: r.monto
              })}>{estado === 'CONFIRMADO' ? 'Registrar efectivo devuelto' : estado}</button>)}</td></tr>)}</tbody></table></div></section>;
}
