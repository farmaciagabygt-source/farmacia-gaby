import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PersonalLayout from '../../layouts/PersonalLayout';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/adminApi';
export default function CatalogoAdmin() {
  const {
      token
    } = useAuth(),
    [datos, setDatos] = useState([]),
    [stock, setStock] = useState([]),
    [error, setError] = useState(''),
    [cargando, setCargando] = useState(true),
    [buscar, setBuscar] = useState(''),
    [estado, setEstado] = useState(''),
    [categoria, setCategoria] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([adminApi('catalogo', '/productos/admin', token, {
      signal: c.signal
    }), adminApi('inventario', '/existencias/resumen', token, {
      signal: c.signal
    })]).then(([p, s]) => {
      setDatos(p);
      setStock(s);
      setCargando(false);
    }).catch(e => {
      if (!c.signal.aborted) {
        setError(e.message);
        setCargando(false);
      }
    });
    return () => c.abort();
  }, [token, revision]);
  const categorias = [...new Set(datos.flatMap(p => p.rel_producto_categoria_id_producto.map(c => c.ref_id_categoria.nombre)))].sort(),
    disponible = p => p.rel_presentacion_producto_id_producto.reduce((n, x) => n + stock.filter(s => s.id_presentacion === x.id_presentacion_producto).reduce((a, s) => a + s.cantidad_disponible, 0), 0),
    lista = datos.filter(p => (!estado || p.estado === estado) && (!categoria || p.rel_producto_categoria_id_producto.some(c => c.ref_id_categoria.nombre === categoria)) && `${p.nombre} ${p.slug} ${p.rel_presentacion_producto_id_producto.map(x => x.sku || '').join(' ')}`.toLowerCase().includes(buscar.toLowerCase()));
  return <PersonalLayout titulo="Catálogo"><div className="personal-tools"><Link to="/admin/catalogo/nuevo">Nuevo producto</Link><input aria-label="Buscar producto" placeholder="Producto o SKU" value={buscar} onChange={e => setBuscar(e.target.value)} /><select aria-label="Estado" value={estado} onChange={e => setEstado(e.target.value)}><option value="">Todos los estados</option>{['BORRADOR', 'PUBLICADO', 'ARCHIVADO'].map(s => <option key={s}>{s}</option>)}</select><select aria-label="Categoría" value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas las categorías</option>{categorias.map(c => <option key={c}>{c}</option>)}</select><button onClick={() => {
        setError('');
        setRevision(n => n + 1);
      }}>Actualizar</button></div>{error && <p role="alert" className="personal-error">{error}</p>}{cargando && <p>Cargando catálogo…</p>}<section className="personal-card personal-table"><p>{lista.length} productos encontrados</p><table><thead><tr><th>Producto</th><th>Categorías</th><th>Estado / web</th><th>Presentaciones</th><th>Stock vendible</th><th>Revisión</th><th>Acciones</th></tr></thead><tbody>{lista.map(p => {
            const ps = p.rel_presentacion_producto_id_producto,
              impuesto = ps.some(x => x.rel_precio_presentacion_id_presentacion.some(precio => Number(precio.tasa_impuesto) > 1));
            return <tr key={p.id_producto}><td>{p.nombre}<br />{p.slug}</td><td>{p.rel_producto_categoria_id_producto.map(c => c.ref_id_categoria.nombre).join(', ') || 'Sin categoría'}</td><td>{p.estado}<br />{p.visible_web ? 'Visible en web' : 'Oculto en web'}</td><td>{ps.length}</td><td>{disponible(p)}</td><td>{impuesto ? 'Revisar tasa de impuesto (0.12 = 12 %)' : !ps.length ? 'Agregar presentación' : ps.every(x => !x.rel_precio_presentacion_id_presentacion.length) ? 'Sin precios registrados' : '—'}</td><td><Link to={`/admin/catalogo/ver/${p.id_producto}`}>Ver</Link> · <Link to={`/admin/catalogo/modificar/${p.id_producto}`}>Editar</Link></td></tr>;
          })}</tbody></table>{!lista.length && !cargando && <p>No hay productos que coincidan.</p>}</section></PersonalLayout>;
}
