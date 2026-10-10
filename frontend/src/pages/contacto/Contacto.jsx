import { useFarmacia, diasSemana, horaFarmacia } from '../../hooks/useFarmacia';
import HeaderPublico from '../../components/public/HeaderPublico';
import FooterPublico from '../../components/public/FooterPublico';
export default function Contacto() {
  const {
    farmacia
  } = useFarmacia();
  return <><HeaderPublico /><main style={{
      maxWidth: 1100,
      margin: 'auto',
      padding: '40px 20px',
      minHeight: '65vh'
    }}><h1>Contacta a Farmacia Gaby</h1><section className="personal-card"><h2>Correo</h2><p><a href="mailto:farmacia.gaby.gt@gmail.com">farmacia.gaby.gt@gmail.com</a></p><p>Para consultas sobre un pedido, incluye su número en el correo.</p><h2>Teléfono y horarios</h2><p>Teléfono: {farmacia?.telefono || 'Pendiente de confirmar'}</p>{farmacia?.rel_horario_sucursal_id_sucursal?.length ? farmacia.rel_horario_sucursal_id_sucursal.map(h => <p key={h.id_horario_sucursal}>{diasSemana[h.dia_semana]}: {horaFarmacia(h.apertura_minuto)}–{horaFarmacia(h.cierre_minuto)}</p>) : <p>Horarios pendientes de confirmar.</p>}<h2>WhatsApp</h2><p>Actualmente no disponible.</p><a href="/sucursales">Ver ubicación de la farmacia</a></section></main><FooterPublico /></>;
}
