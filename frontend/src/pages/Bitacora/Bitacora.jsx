import { useEffect, useState } from 'react';
import PersonalLayout from '../../layouts/PersonalLayout';
import { useAuth } from '../../context/AuthContext';
import { adminApi, fecha } from '../../api/adminApi';
const servicios = ['auth', 'catalogo', 'inventario', 'pedidos', 'pagos'];
export default function Bitacora() {
  const {
      token
    } = useAuth(),
    [datos, setDatos] = useState([]),
    [cursores, setCursores] = useState({}),
    [errores, setErrores] = useState([]),
    [servicio, setServicio] = useState(''),
    [buscar, setBuscar] = useState(''),
    [revision, setRevision] = useState(0),
    [cargando, setCargando] = useState(true);
  useEffect(() => {
    const c = new AbortController();
    Promise.allSettled(servicios.map(async s => ({
      servicio: s,
      ...(await adminApi(s, s === 'auth' ? '/admin/bitacora' : '/admin/bitacora', token, {
        signal: c.signal
      }))
    }))).then(r => {
      if (c.signal.aborted) return;
      const ok = r.filter(x => x.status === 'fulfilled').map(x => x.value);
      setDatos(ok.flatMap(x => x.items.map(e => ({
        ...e,
        servicio: x.servicio
      }))));
      setCursores(Object.fromEntries(ok.map(x => [x.servicio, x.nextCursor])));
      setErrores(r.flatMap((x, i) => x.status === 'rejected' ? [`${servicios[i]}: ${x.reason.message}`] : []));
      setCargando(false);
    });
    return () => c.abort();
  }, [token, revision]);
  async function mas(s) {
    setCargando(true);
    try {
      const r = await adminApi(s, `/admin/bitacora?cursor=${cursores[s]}`, token);
      setDatos(d => [...d, ...r.items.map(e => ({
        ...e,
        servicio: s
      }))]);
      setCursores(c => ({
        ...c,
        [s]: r.nextCursor
      }));
    } catch (e) {
      setErrores(d => [...d, `${s}: ${e.message}`]);
    } finally {
      setCargando(false);
    }
  }
  const lista = datos.filter(d => (!servicio || d.servicio === servicio) && `${d.accion} ${d.entidad} ${d.referencia} ${d.id_actor ?? 'sistema'}`.toLowerCase().includes(buscar.toLowerCase())).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return <PersonalLayout titulo="Bitácora"><p>Eventos registrados por los servicios de GabyFarma. Se cargan los últimos 50 de cada servicio; puedes consultar los anteriores. Las acciones previas que no generaron auditoría no se reconstruyen.</p><div className="personal-tools"><select aria-label="Servicio" value={servicio} onChange={e => setServicio(e.target.value)}><option value="">Todos los servicios</option>{servicios.map(s => <option key={s}>{s}</option>)}</select><input aria-label="Buscar evento" placeholder="Acción, entidad, referencia o usuario" value={buscar} onChange={e => setBuscar(e.target.value)} /><button disabled={cargando} onClick={() => setRevision(n => n + 1)}>Actualizar</button></div>{errores.map((e, i) => <p role="alert" className="personal-error" key={i}>{e}</p>)}{cargando && <p>Cargando eventos…</p>}<section className="personal-card personal-table"><table><thead><tr><th>Fecha</th><th>Servicio</th><th>Usuario</th><th>Acción</th><th>Entidad / referencia</th><th>Resultado</th><th>Cambios</th></tr></thead><tbody>{lista.map(e => <tr key={`${e.servicio}-${e.id_auditoria_evento}`}><td>{fecha(e.created_at)}</td><td>{e.servicio}</td><td>{e.id_actor ?? e.actor_sistema ?? 'Sistema'}</td><td>{e.accion}</td><td>{e.entidad} #{e.referencia}</td><td>{e.resultado}</td><td><details><summary>Ver cambios</summary><pre>{JSON.stringify(e.cambios_sanitizados, null, 2)}</pre></details></td></tr>)}</tbody></table>{!lista.length && !cargando && <p>No hay eventos registrados que coincidan.</p>}</section><div className="personal-tools">{servicios.filter(s => (!servicio || s === servicio) && cursores[s]).map(s => <button key={s} disabled={cargando} onClick={() => mas(s)}>Eventos anteriores de {s}</button>)}</div></PersonalLayout>;
}
