import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi, fecha } from '../../api/adminApi';
export default function InventarioOperaciones() {
  const {
      token
    } = useAuth(),
    [ubicaciones, setUbicaciones] = useState([]),
    [movimientos, setMovimientos] = useState([]),
    [stock, setStock] = useState([]),
    [productos, setProductos] = useState([]),
    [error, setError] = useState(''),
    [mensaje, setMensaje] = useState(''),
    [revision, setRevision] = useState(0),
    [ocupado, setOcupado] = useState(false),
    [tipo, setTipo] = useState('recepciones'),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [datos, setDatos] = useState({
      id_presentacion: '',
      id_ubicacion: '',
      cantidad: '',
      numero_lote: '',
      fabricante_referencia: '',
      fecha_vencimiento: '',
      id_existencia: '',
      delta: '',
      motivo: ''
    });
  useEffect(() => {
    const c = new AbortController();
    Promise.all([adminApi('inventario', '/admin/ubicaciones', token, {
      signal: c.signal
    }), adminApi('inventario', '/admin/movimientos', token, {
      signal: c.signal
    }), adminApi('inventario', '/existencias/resumen', token, {
      signal: c.signal
    }), adminApi('catalogo', '/productos/admin', token, {
      signal: c.signal
    })]).then(([u, m, s, p]) => {
      setUbicaciones(u);
      setMovimientos(m);
      setStock(s);
      setProductos(p);
    }).catch(e => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, [token, revision]);
  async function guardar(e) {
    e.preventDefault();
    setOcupado(true);
    setError('');
    try {
      await adminApi('inventario', `/admin/${tipo}`, token, {
        method: 'POST',
        body: {
          ...datos,
          clave_idempotencia: key
        }
      });
      setMensaje('Movimiento registrado. Actualiza el resumen para ver el saldo nuevo.');
      setKey(crypto.randomUUID());
      setRevision(n => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  const presentaciones = productos.flatMap(p => (p.rel_presentacion_producto_id_producto || []).map(x => ({
    ...x,
    producto: p.nombre
  })));
  const campo = (nombre, label, type = 'text') => <label>{label}<input required type={type} value={datos[nombre]} onChange={e => setDatos({
      ...datos,
      [nombre]: e.target.value
    })} /></label>;
  return <section className="personal-card"><h2>Recepciones, ajustes y movimientos</h2>{error && <p role="alert" className="personal-error">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}<form className="admin-form" onSubmit={guardar}><label>Operación<select value={tipo} onChange={e => {
          setTipo(e.target.value);
          setKey(crypto.randomUUID());
        }}><option value="recepciones">Recibir mercadería</option><option value="ajustes">Ajustar existencia</option></select></label>{tipo === 'recepciones' ? <><label>Presentación<select required value={datos.id_presentacion} onChange={e => setDatos({
            ...datos,
            id_presentacion: e.target.value
          })}><option value="">Selecciona presentación</option>{presentaciones.filter(x => x.estado === 'ACTIVO' && x.permite_venta).map(p => <option value={p.id_presentacion_producto} key={p.id_presentacion_producto}>{p.producto} · {p.nombre || p.descripcion || `#${p.id_presentacion_producto}`}</option>)}</select></label><label>Ubicación<select required value={datos.id_ubicacion} onChange={e => setDatos({
            ...datos,
            id_ubicacion: e.target.value
          })}><option value="">Selecciona ubicación</option>{ubicaciones.filter(u => ['BODEGA', 'VENTA'].includes(u.tipo)).map(u => <option key={u.id_ubicacion_inventario} value={u.id_ubicacion_inventario}>{u.nombre}</option>)}</select></label>{campo('cantidad', 'Cantidad', 'number')}{campo('numero_lote', 'Número de lote')}{campo('fabricante_referencia', 'Referencia del fabricante')}{campo('fecha_vencimiento', 'Fecha de vencimiento', 'date')}</> : <><label>Existencia<select required value={datos.id_existencia} onChange={e => setDatos({
            ...datos,
            id_existencia: e.target.value
          })}><option value="">Selecciona existencia</option>{stock.map(s => <option key={s.id_existencia} value={s.id_existencia}>#{s.id_existencia} · presentación #{s.id_presentacion} · lote {s.lote.numero} · {s.ubicacion.nombre} · físico {s.cantidad_fisica}, reservado {s.cantidad_reservada}</option>)}</select></label>{campo('delta', 'Variación (+ entrada, − salida)', 'number')}{campo('motivo', 'Motivo del ajuste')}</>}<button disabled={ocupado}>{ocupado ? 'Guardando…' : 'Registrar movimiento'}</button></form><h3>Últimos 200 movimientos</h3><button disabled={ocupado} onClick={() => setRevision(n => n + 1)}>Actualizar movimientos</button><div className="personal-table"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Existencia / lote</th><th>Variación</th><th>Saldo físico</th><th>Documento</th><th>Usuario</th></tr></thead><tbody>{movimientos.map(m => <tr key={m.id_movimiento_inventario}><td>{fecha(m.fecha)}</td><td>{m.tipo}</td><td>#{m.id_existencia} · {m.ref_id_existencia.ref_id_lote.numero}</td><td>{m.delta}</td><td>{m.saldo_resultante}</td><td>{m.referencia_documento}<br />{m.motivo}</td><td>{m.id_actor || 'Sistema'}</td></tr>)}</tbody></table></div></section>;
}
