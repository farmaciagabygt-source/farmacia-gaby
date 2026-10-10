import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PersonalLayout from '../../layouts/PersonalLayout';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/adminApi';
function Formulario() {
  const {
      id
    } = useParams(),
    {
      token, usuario, logout
    } = useAuth(),
    navigate = useNavigate(),
    [roles, setRoles] = useState([]),
    [datos, setDatos] = useState({
      nombre_completo: '',
      correo: '',
      telefono: '',
      password: '',
      roles: ['CLIENTE']
    }),
    [cargado, setCargado] = useState(!id),
    [error, setError] = useState(''),
    [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([adminApi('auth', '/admin/roles', token, {
      signal: c.signal
    }), id ? adminApi('auth', `/admin/usuarios/${id}`, token, {
      signal: c.signal
    }) : Promise.resolve(null)]).then(([r, u]) => {
      setRoles(r);
      if (u) setDatos({
        ...u,
        telefono: u.telefono || ''
      });
      setCargado(true);
    }).catch(e => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, [id, token]);
  function rol(codigo) {
    setDatos(d => ({
      ...d,
      roles: codigo === 'CLIENTE' ? ['CLIENTE'] : d.roles.includes(codigo) ? d.roles.filter(r => r !== codigo) : [...d.roles.filter(r => r !== 'CLIENTE'), codigo]
    }));
  }
  async function guardar(e) {
    e.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    setError('');
    try {
      await adminApi('auth', `/admin/usuarios${id ? `/${id}` : ''}`, token, {
        method: id ? 'PUT' : 'POST',
        body: datos
      });
      if(Number(id)===usuario.id_usuario){logout();navigate('/');return;}
      navigate('/usuarios');
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  return <PersonalLayout titulo={id ? 'Editar usuario' : 'Crear usuario'}><Link to="/usuarios">← Usuarios</Link>{error && <p role="alert" className="personal-error">{error}</p>}{!cargado ? <p>Cargando…</p> : <form className="personal-card admin-form" onSubmit={guardar}>{[['nombre_completo', 'Nombre completo', 'text', 150], ['correo', 'Correo', 'email', 254], ['telefono', 'Teléfono', 'tel', 25], ...(!id ? [['password', 'Contraseña inicial', 'password', 72]] : [])].map(([campo, label, tipo, max]) => <label key={campo}>{label}<input autoComplete={campo === 'password' ? 'new-password' : 'off'} type={tipo} required={campo !== 'telefono'} maxLength={max} minLength={campo === 'password' ? 12 : undefined} value={datos[campo]} onChange={e => setDatos({
          ...datos,
          [campo]: e.target.value
        })} /></label>)}{!id && <p>Contraseña inicial: al menos 12 caracteres, mayúscula, minúscula y número.</p>}<fieldset><legend>Roles</legend>{roles.map(r => <label key={r.id_rol}><input type="checkbox" checked={datos.roles.includes(r.codigo)} onChange={() => rol(r.codigo)} />{r.nombre} ({r.codigo})</label>)}</fieldset><p>Una cuenta de cliente se mantiene separada de las cuentas del personal.</p><button disabled={ocupado || !datos.roles.length}>{ocupado ? 'Guardando…' : 'Guardar usuario'}</button></form>}</PersonalLayout>;
}
export default function UsuarioForm() {
  const {
    id
  } = useParams();
  return <Formulario key={id || 'nuevo'} />;
}
