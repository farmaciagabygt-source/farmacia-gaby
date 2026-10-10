import { useEffect, useState } from 'react';
import PersonalLayout from '../../layouts/PersonalLayout';
import { useAuth } from '../../context/AuthContext';
import { adminApi, dinero } from '../../api/adminApi';
const dias = [null, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  hora = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`,
  minutos = s => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
export default function FarmaciaAdmin() {
  const {
      token
    } = useAuth(),
    [datos, setDatos] = useState([]),
    [tarifas, setTarifas] = useState([]),
    [edicion, setEdicion] = useState(null),
    [tarifa, setTarifa] = useState(null),
    [horarios, setHorarios] = useState(null),
    [error, setError] = useState(''),
    [mensaje, setMensaje] = useState(''),
    [revision, setRevision] = useState(0),
    [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([adminApi('inventario', '/sucursales', token, {
      signal: c.signal
    }), adminApi('pedidos', '/admin/tarifas', token, {
      signal: c.signal
    })]).then(([s, t]) => {
      setDatos(s);
      setTarifas(t);
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
      if (edicion) await adminApi('inventario', `/admin/sucursales/${edicion.id_sucursal}`, token, {
        method: 'PUT',
        body: edicion
      });else if (tarifa) await adminApi('pedidos', `/admin/tarifas/${tarifa.id_tarifa_entrega}`, token, {
        method: 'PUT',
        body: tarifa
      });else await adminApi('inventario', `/admin/sucursales/${horarios.id}`, token, {
        method: 'PUT',
        body: {}
      });
      setEdicion(null);
      setTarifa(null);
      setMensaje('Configuración actualizada.');
      setRevision(n => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  async function guardarHorarios(e) {
    e.preventDefault();
    setOcupado(true);
    setError('');
    try {
      await adminApi('inventario', `/admin/sucursales/${horarios.id}/horarios`, token, {
        method: 'PUT',
        body: {
          horarios: horarios.items.filter(h => h.activo).map(h => ({
            dia_semana: h.dia,
            apertura_minuto: minutos(h.apertura),
            cierre_minuto: minutos(h.cierre)
          }))
        }
      });
      setHorarios(null);
      setMensaje('Horarios actualizados.');
      setRevision(n => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  return <PersonalLayout titulo="Mi farmacia">{error && <p role="alert" className="personal-error">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}{(edicion || tarifa) && <form className="personal-card admin-form" onSubmit={guardar}><h2>{edicion ? 'Datos de la farmacia' : 'Tarifa de entrega'}</h2>{(edicion ? ['nombre', 'direccion', 'departamento', 'municipio', 'zona', 'telefono', 'correo'] : ['importe', 'minimo_compra', 'umbral_gratis']).map(c => <label key={c}>{c.replaceAll('_', ' ')}<input required={edicion ? ['nombre', 'direccion', 'departamento', 'municipio'].includes(c) : c !== 'umbral_gratis'} type={c === 'correo' ? 'email' : 'text'} value={(edicion || tarifa)[c] ?? ''} onChange={e => edicion ? setEdicion({
          ...edicion,
          [c]: e.target.value
        }) : setTarifa({
          ...tarifa,
          [c]: e.target.value
        })} /></label>)}<button disabled={ocupado}>Guardar cambios</button><button type="button" disabled={ocupado} onClick={() => {
        setEdicion(null);
        setTarifa(null);
      }}>Volver</button></form>}{horarios && <form className="personal-card admin-form" onSubmit={guardarHorarios}><h2>Horarios regulares</h2><p>Los días sin seleccionar se consideran cerrados. Si todavía no tienes los horarios reales, vuelve sin guardar.</p>{horarios.items.map((h, i) => <div key={h.dia} className="personal-tools"><label><input type="checkbox" checked={h.activo} onChange={e => setHorarios({
            ...horarios,
            items: horarios.items.map((x, j) => j === i ? {
              ...x,
              activo: e.target.checked
            } : x)
          })} />{dias[h.dia]}</label>{['apertura', 'cierre'].map(c => <label key={c}>{c}<input type="time" required={h.activo} disabled={!h.activo} value={h[c]} onChange={e => setHorarios({
            ...horarios,
            items: horarios.items.map((x, j) => j === i ? {
              ...x,
              [c]: e.target.value
            } : x)
          })} /></label>)}</div>)}<button disabled={ocupado}>Guardar horarios</button><button type="button" onClick={() => setHorarios(null)}>Volver</button></form>}{datos.map(s => <section className="personal-card" key={s.id_sucursal}><h2>{s.nombre}</h2><p>{s.direccion}<br />{s.departamento}, {s.municipio}{s.zona ? `, zona ${s.zona}` : ''}<br />Teléfono: {s.telefono || 'Pendiente de confirmar'}<br />Correo: {s.correo || 'Pendiente de confirmar'}<br />WhatsApp: no disponible</p><div className="personal-tools"><button onClick={() => {
          setTarifa(null);
          setEdicion(s);
        }}>Editar datos</button><button onClick={() => setHorarios({
          id: s.id_sucursal,
          items: dias.slice(1).map((_, indice) => {
            const dia = indice + 1;
            const h = s.rel_horario_sucursal_id_sucursal.find(x => x.dia_semana === dia);
            return {
              dia,
              activo: !!h,
              apertura: h ? hora(h.apertura_minuto) : '',
              cierre: h ? hora(h.cierre_minuto) : ''
            };
          })
        })}>Configurar horarios</button></div><h3>Horarios</h3>{s.rel_horario_sucursal_id_sucursal.length ? s.rel_horario_sucursal_id_sucursal.map(h => <p key={h.id_horario_sucursal}>{dias[h.dia_semana]}: {hora(h.apertura_minuto)}–{hora(h.cierre_minuto)}</p>) : <p>Pendientes de confirmar.</p>}<h3>Entrega a domicilio</h3>{tarifas.filter(t => t.id_sucursal === s.id_sucursal).map(t => <div key={t.id_tarifa_entrega}><p>{t.ref_id_zona.departamento}, {t.ref_id_zona.municipio} · zonas {t.ref_id_zona.zonas.join(', ')} · envío {dinero(t.importe)} · mínimo {dinero(t.minimo_compra)}{t.umbral_gratis != null ? ` · gratis desde ${dinero(t.umbral_gratis)}` : ''}</p><button onClick={() => {
          setEdicion(null);
          setTarifa(t);
        }}>Editar tarifa</button></div>)}<p>Los valores de zona 5 son ejemplos autorizados. Confirma tarifas antes de publicar.</p></section>)}</PersonalLayout>;
}
