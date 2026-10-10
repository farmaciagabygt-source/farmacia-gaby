import { useEffect, useState } from 'react';
import PersonalLayout from '../../layouts/PersonalLayout';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/adminApi';
import InventarioOperaciones from './InventarioOperaciones';
export default function InventarioAdmin() {
  const {
      token
    } = useAuth(),
    [datos, setDatos] = useState([]),
    [productos, setProductos] = useState([]),
    [error, setError] = useState(''),
    [buscar, setBuscar] = useState(''),
    [alertas, setAlertas] = useState(false),
    [revision, setRevision] = useState(0),
    [cargando, setCargando] = useState(true),
    [fechaConsulta, setFechaConsulta] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([adminApi('inventario', '/existencias/resumen', token, {
      signal: c.signal
    }), adminApi('catalogo', '/productos/admin', token, {
      signal: c.signal
    })]).then(([s, p]) => {
      setDatos(s);
      setFechaConsulta(Date.now());
      setProductos(p);
      setCargando(false);
    }).catch(e => {
      if (!c.signal.aborted) {
        setError(e.message);
        setCargando(false);
      }
    });
    return () => c.abort();
  }, [token, revision]);
  const mapa = new Map(productos.flatMap(p => p.rel_presentacion_producto_id_producto.map(x => [x.id_presentacion_producto, {
      nombre: p.nombre,
      presentacion: x.nombre
    }]))),
    aviso = s => {
      if(!mapa.has(s.id_presentacion))return "Sin correspondencia en catálogo";
      const dias = s.lote.fecha_vencimiento ? Math.ceil((new Date(s.lote.fecha_vencimiento) - fechaConsulta) / 86400000) : null;
      return !s.ubicacion.activa ? 'Ubicación inactiva' : s.ubicacion.tipo === 'CUARENTENA' ? 'Cuarentena' : s.lote.estado !== 'DISPONIBLE' ? s.lote.estado : dias != null && dias <= 0 ? 'Vencido' : dias != null && dias <= 90 ? 'Vence en menos de 90 días' : s.minimo != null && s.cantidad_disponible <= s.minimo ? 'Stock bajo' : '';
    };
  const lista = datos.filter(s => (!alertas || aviso(s)) && `${mapa.get(s.id_presentacion)?.nombre || s.id_presentacion} ${s.lote.numero} ${s.ubicacion.nombre}`.toLowerCase().includes(buscar.toLowerCase()));
  return <PersonalLayout titulo="Inventario"><p>Disponible para venta: {datos.reduce((n, s) => n + s.cantidad_disponible, 0)} · físico: {datos.reduce((n, s) => n + s.cantidad_fisica, 0)} · reservado: {datos.reduce((n, s) => n + s.cantidad_reservada, 0)}</p><div className="personal-tools"><input aria-label="Buscar inventario" placeholder="Producto, lote o ubicación" value={buscar} onChange={e => setBuscar(e.target.value)} /><label><input type="checkbox" checked={alertas} onChange={e => setAlertas(e.target.checked)} /> Solo alertas</label><button onClick={() => {
        setError('');
        setRevision(n => n + 1);
      }}>Actualizar resumen</button></div>{error && <p role="alert" className="personal-error">{error}</p>}{cargando && <p>Cargando inventario…</p>}<section className="personal-card personal-table"><table><thead><tr><th>Producto / presentación</th><th>Lote / vencimiento</th><th>Ubicación</th><th>Físico</th><th>Reservado</th><th>Vendible</th><th>Alerta</th></tr></thead><tbody>{lista.map(s => <tr key={s.id_existencia}><td>{mapa.get(s.id_presentacion)?.nombre || `Presentación #${s.id_presentacion}`}<br />{mapa.get(s.id_presentacion)?.presentacion}</td><td>{s.lote.numero}<br />{s.lote.fecha_vencimiento ? String(s.lote.fecha_vencimiento).slice(0, 10) : 'Sin vencimiento registrado'}</td><td>{s.sucursal.nombre}<br />{s.ubicacion.nombre} · {s.ubicacion.tipo}</td><td>{s.cantidad_fisica}</td><td>{s.cantidad_reservada}</td><td>{s.cantidad_disponible}</td><td>{aviso(s) || 'Normal'}</td></tr>)}</tbody></table></section><InventarioOperaciones /></PersonalLayout>;
}
