import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PersonalLayout from '../../layouts/PersonalLayout';
import { useAuth } from '../../context/AuthContext';
import { adminApi, fecha, textoEstado } from '../../api/adminApi';
export default function DashboardAdmin() {
  const {
      token,
      usuario
    } = useAuth(),
    [datos, setDatos] = useState(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([adminApi('catalogo', '/productos/admin', token, {
      signal: c.signal
    }), adminApi('inventario', '/existencias/resumen', token, {
      signal: c.signal
    }), adminApi('pedidos', '/pedidos', token, {
      signal: c.signal
    }), adminApi('auth', '/admin/resumen', token, {
      signal: c.signal
    })]).then(([productos, stock, pedidos, usuarios]) => setDatos({
      productos: productos.length,
      unidades: stock.filter(x=>productos.some(p=>p.estado==='PUBLICADO'&&p.rel_presentacion_producto_id_producto.some(y=>y.id_presentacion_producto===x.id_presentacion&&y.estado==='ACTIVO'&&y.permite_venta))).reduce((s,x)=>s+x.cantidad_disponible,0),
      pedidos,
      usuarios: usuarios.usuarios
    })).catch(e => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, [token, revision]);
  return <PersonalLayout titulo="Dashboard"><section className="personal-card"><h2>Bienvenido, {usuario.nombre_completo}</h2><p>Gestiona catálogo, inventario, pedidos, cobros y permisos del personal.</p><button onClick={() => {
        setError('');
        setRevision(n => n + 1);
      }}>Actualizar datos</button></section>{error && <p role="alert" className="personal-error">{error}</p>}{!datos && !error && <p>Cargando datos…</p>}{datos && <><div className="personal-stats">{[[datos.productos, 'Productos registrados', '/admin/catalogo'], [datos.unidades, 'Unidades vendibles', '/admin/inventario'], [datos.pedidos.length, 'Pedidos registrados', '/admin/pedidos'], [datos.usuarios, 'Usuarios del sistema', '/usuarios']].map(([n, label, to]) => <Link className="personal-card" to={to} key={to}><strong>{n}</strong><p>{label}</p></Link>)}</div><div className="personal-grid"><section className="personal-card"><h2>Pedidos recientes</h2>{datos.pedidos.slice(0, 5).map(p => <p key={p.id_pedido}><Link to={`/admin/pedidos/${p.id_pedido}`}>{p.numero}</Link><br />{p.rel_pedido_contacto_id_pedido?.[0]?.comprador_nombre} · {textoEstado(p.estado)}<br />{fecha(p.created_at)}</p>)}{!datos.pedidos.length && <p>No hay pedidos registrados.</p>}</section><section className="personal-card"><h2>Acciones rápidas</h2><div className="personal-tools">{[['Catálogo', '/admin/catalogo'], ['Inventario', '/admin/inventario'], ['Pedidos', '/admin/pedidos'], ['Pagos y reembolsos', '/admin/pagos'], ['Devoluciones', '/admin/devoluciones'], ['Usuarios', '/usuarios'], ['Bitácora', '/bitacora'], ['Mi farmacia', '/admin/sucursales']].map(([label, to]) => <Link key={to} to={to}>{label}</Link>)}</div></section></div></>}</PersonalLayout>;
}
