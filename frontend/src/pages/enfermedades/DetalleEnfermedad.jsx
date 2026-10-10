import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import HeaderPublico from '../../components/public/HeaderPublico';
import FooterPublico from '../../components/public/FooterPublico';
import { enfermedadesPorSlug } from '../../data/enfermedades';
import { carritoApi } from '../../api/carritoApi';
import '../../styles/cliente.css';

export default function DetalleEnfermedad() {
  const { slug } = useParams();
  const ficha = enfermedadesPorSlug[slug];
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { let alive = true; carritoApi.categorias().then(data => { if (alive) setCategorias(data.filter(c => c.activa !== false).map(c => c.nombre)); }).catch(() => { if (alive) setError('El catálogo no está disponible ahora. La información de cuidados sigue disponible.'); }); return () => { alive = false; }; }, []);
  return <div className="cliente-page"><HeaderPublico /><main className="cliente-main"><Link className="cliente-back" to="/enfermedades">← Todas las enfermedades y necesidades</Link>
    {!ficha ? <section className="cliente-panel cliente-empty"><h1>Opción no encontrada</h1><p>Selecciona una de las fichas disponibles.</p></section> : <>
      <div className="cliente-heading"><div><span className="cliente-eyebrow">{ficha.grupo}</span><h1>{ficha.titulo}</h1><p className="cliente-lead">{ficha.descripcion}</p></div></div>
      <div className="cliente-note">Estos síntomas pueden tener otras causas. Esta ficha orienta sobre cuidados generales; no confirma un diagnóstico ni reemplaza una consulta. Para niños, embarazo o enfermedades crónicas, pide orientación antes de usar medicamentos.</div>
      <div className="salud-detail-grid" style={{ marginTop: 24 }}><section className="cliente-panel"><h2>Síntomas o necesidades habituales</h2><ul>{ficha.sintomas.map(s => <li key={s}>{s}</li>)}</ul></section><section className="cliente-panel"><h2>Cuidados que pueden ayudar</h2><ul>{ficha.cuidados.map(s => <li key={s}>{s}</li>)}</ul></section></div>
      <section className="cliente-panel"><h2>Tratamiento y orientación sugerida</h2><p>{ficha.tratamiento}</p><p>Antes de usar un medicamento, revisa el prospecto y consulta sobre contraindicaciones e interacciones. Esta ficha no indica dosis ni combinaciones personalizadas.</p></section>
      <section className="cliente-note cliente-warning"><h2>Cuándo buscar atención</h2><p>{ficha.consultar}</p></section>
      <section className="cliente-panel"><h2>Categorías relacionadas</h2><p>Explorar una categoría muestra productos del catálogo; no significa que todos sean adecuados para estos síntomas.</p>{error && <p role="status">{error}</p>}<div className="cliente-links">{ficha.categorias.filter(c => categorias.includes(c)).map(c => <Link className="cliente-chip" key={c} to={`/productos?categoria=${encodeURIComponent(c)}`}>{c} →</Link>)}</div>{!ficha.categorias.length && <p>Esta necesidad requiere orientación profesional antes de elegir un tratamiento.</p>}<Link className="cliente-back" to="/productos">Explorar el catálogo completo →</Link></section>
      <section className="cliente-panel cliente-sources"><h2>Fuente de información</h2><a href={ficha.fuente} target="_blank" rel="noopener noreferrer">{ficha.fuente.includes('medlineplus') ? 'MedlinePlus' : 'NHS'}: información sobre {ficha.titulo}</a><small>Fuente consultada el 10 de octubre de 2026. Algunos enlaces están en inglés.</small></section>
    </>}
  </main><FooterPublico /></div>;
}
