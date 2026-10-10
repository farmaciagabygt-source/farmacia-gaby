import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/FarmaciasGaby.png';
import '../styles/personal.css';
const A = ['ADMINISTRADOR'],
  P = ['ADMINISTRADOR', 'CAJERO', 'DESPACHO'],
  I = ['ADMINISTRADOR', 'INVENTARIO'],
  C = ['ADMINISTRADOR', 'CAJERO'];
export default function PersonalLayout({
  children,
  titulo
}) {
  const {
      usuario,
      logout
    } = useAuth(),
    navigate = useNavigate(),
    roles = usuario?.roles || [];
  const enlaces = [['Inicio', '/dashboard', A], ['Catálogo', '/admin/catalogo', A], ['Inventario', '/admin/inventario', I], ['Pedidos', '/admin/pedidos', P], ['Pagos', '/admin/pagos', C], ['Devoluciones', '/admin/devoluciones', P], ['Mi farmacia', '/admin/sucursales', A], ['Usuarios', '/usuarios', A], ['Bitácora', '/bitacora', A]];
  return <div className="personal-layout"><aside><img src={logo} alt="Farmacia Gaby" /><p>Panel del personal</p><nav>{enlaces.filter(([,, permitidos]) => roles.some(r => permitidos.includes(r))).map(([label, to]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav><button onClick={() => {
        logout();
        navigate('/');
      }}>Cerrar sesión</button></aside><main><header><h1>{titulo}</h1><span>{usuario?.nombre_completo}<br /><small>{roles.join(', ')}</small></span></header>{children}</main></div>;
}
