import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HeaderPublico from '../../components/public/HeaderPublico';
import FooterPublico from '../../components/public/FooterPublico';
import { enfermedades, gruposEnfermedades } from '../../data/enfermedades';
import '../../styles/cliente.css';

const normalizar = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export default function EnfermedadesComunes() {
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState('Todas');
  const resultados = useMemo(() => enfermedades.filter(e => (grupo === 'Todas' || grupo === e.grupo) && normalizar(`${e.titulo} ${e.descripcion} ${e.sintomas.join(' ')}`).includes(normalizar(busqueda.trim()))), [grupo, busqueda]);
  return <div className="cliente-page"><HeaderPublico /><main className="cliente-main">
    <span className="cliente-eyebrow">CUIDADOS E INFORMACIÓN DE SALUD</span><h1>Enfermedades y necesidades comunes</h1>
    <p className="cliente-lead">Conoce síntomas frecuentes, cuidados sugeridos y cuándo buscar atención. Abre una tarjeta para consultar su información y las categorías relacionadas del catálogo.</p>
    <div className="cliente-note">Información orientativa, principalmente para adultos. La elección de medicamentos debe considerar edad, embarazo, enfermedades y otros tratamientos. Consulta al médico o farmacéutico para una recomendación individual.</div>
    <div className="cliente-filters"><label htmlFor="buscar-necesidad">Buscar enfermedad, necesidad o síntoma</label><input id="buscar-necesidad" type="search" placeholder="Por ejemplo: sinusitis, piel, diarrea…" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
    <div className="cliente-filters" aria-label="Filtrar por grupo">{['Todas', ...gruposEnfermedades].map(g => <button type="button" className="cliente-chip" key={g} aria-pressed={grupo === g} onClick={() => setGrupo(g)}>{g}</button>)}</div>
    <p role="status">{resultados.length} opciones encontradas</p>
    {!resultados.length && <div className="cliente-panel cliente-empty"><h2>No encontramos esa opción</h2><p>Prueba otro término o selecciona Todas.</p></div>}
    {gruposEnfermedades.map(g => { const fichas = resultados.filter(e => e.grupo === g); return fichas.length ? <section key={g} aria-label={g}><h2 className="pedido-section-title">{g} <small>({fichas.length})</small></h2><div className="salud-grid">{fichas.map(e => <Link className="salud-card" key={e.slug} to={`/enfermedades/${e.slug}`}><h3>{e.titulo}</h3><p>{e.descripcion}</p><span>Información y cuidados →</span></Link>)}</div></section> : null; })}
  </main><FooterPublico /></div>;
}
