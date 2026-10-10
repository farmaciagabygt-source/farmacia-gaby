import HeaderPublico from '../../components/public/HeaderPublico';
import FooterPublico from '../../components/public/FooterPublico';
import { useFarmacia, diasSemana, horaFarmacia } from '../../hooks/useFarmacia';
export default function Sucursales() {
  const {
    farmacia,
    error
  } = useFarmacia();
  return <><HeaderPublico /><main style={{
      maxWidth: 1100,
      margin: 'auto',
      padding: '40px 20px',
      minHeight: '65vh'
    }}><h1>Visita Farmacia Gaby</h1>{error && <p role="alert">{error}</p>}{farmacia ? <section className="personal-card"><h2>{farmacia.nombre}</h2><p>{farmacia.direccion}<br />{farmacia.departamento}, {farmacia.municipio}{farmacia.zona ? `, zona ${farmacia.zona}` : ''}</p><p>Teléfono: {farmacia.telefono || 'Pendiente de confirmar'}<br />Correo: <a href={`mailto:${farmacia.correo || 'farmacia.gaby.gt@gmail.com'}`}>{farmacia.correo || 'farmacia.gaby.gt@gmail.com'}</a><br />WhatsApp: actualmente no disponible.</p><h3>Horarios</h3>{farmacia.rel_horario_sucursal_id_sucursal.length ? farmacia.rel_horario_sucursal_id_sucursal.map(h => <p key={h.id_horario_sucursal}>{diasSemana[h.dia_semana]}: {horaFarmacia(h.apertura_minuto)}–{horaFarmacia(h.cierre_minuto)}{h.cierra_dia_siguiente ? ' (día siguiente)' : ''}</p>) : <p>Pendientes de confirmar.</p>}<p><a href="https://maps.app.goo.gl/nru647yTwkeaQSsq6" target="_blank" rel="noreferrer">Abrir ubicación en Google Maps</a> · <a href="https://waze.com/ul/h9fxeht6sf" target="_blank" rel="noreferrer">Abrir en Waze</a></p></section> : !error && <p>Cargando datos de la farmacia…</p>}</main><FooterPublico /></>;
}
