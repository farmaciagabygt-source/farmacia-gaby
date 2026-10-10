import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PersonalLayout from '../../layouts/PersonalLayout';
import { useAuth } from '../../context/AuthContext';
import { adminApi, fecha } from '../../api/adminApi';
export default function Usuarios() {
  const {
      token,
      usuario
    } = useAuth(),
    [datos, setDatos] = useState(null),
    [error, setError] = useState(''),
    [buscar, setBuscar] = useState(''),
    [revision, setRevision] = useState(0),
    [ocupado, setOcupado] = useState(false),
    [seleccion, setSeleccion] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    adminApi('auth', '/admin/usuarios', token, {
      signal: c.signal
    }).then(setDatos).catch(e => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, [token, revision]);
  async function cambiar() {
    setOcupado(true);
    setError('');
    try {
      await adminApi('auth', `/admin/usuarios/${seleccion.id_usuario}/estado`, token, {
        method: 'PATCH',
        body: {
          estado: seleccion.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
        }
      });
      setSeleccion(null);
      setRevision(n => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  return <PersonalLayout titulo="Usuarios"><p>Gestiona las cuentas y los permisos de Farmacia Gaby. Los cambios de permisos invalidan la sesión anterior.</p><div className="personal-tools"><Link to="/usuarios/crear">Crear usuario</Link><input aria-label="Buscar usuario" placeholder="Nombre, correo o rol" value={buscar} onChange={e => setBuscar(e.target.value)} /><button onClick={() => setRevision(n => n + 1)}>Actualizar</button></div>{error && <p role="alert" className="personal-error">{error}</p>}{seleccion && <section className="personal-card"><p>¿{seleccion.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'} a {seleccion.nombre_completo}?</p><button disabled={ocupado} onClick={cambiar}>Confirmar cambio</button><button disabled={ocupado} onClick={() => setSeleccion(null)}>Volver</button></section>}{datos === null && !error && <p>Cargando usuarios…</p>}<section className="personal-card personal-table"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Roles</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr></thead><tbody>{datos?.filter(u => `${u.nombre_completo} ${u.correo} ${u.roles.join(' ')}`.toLowerCase().includes(buscar.toLowerCase())).map(u => <tr key={u.id_usuario}><td>{u.nombre_completo}</td><td>{u.correo}</td><td>{u.roles.join(', ')}</td><td>{u.estado}</td><td>{fecha(u.ultimo_acceso)}</td><td><Link to={`/usuarios/ver/${u.id_usuario}`}>Ver</Link> · <Link to={`/usuarios/editar/${u.id_usuario}`}>Editar</Link><br /><button disabled={ocupado || u.id_usuario === usuario.id_usuario} onClick={() => setSeleccion(u)}>{u.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table></section></PersonalLayout>;
}
