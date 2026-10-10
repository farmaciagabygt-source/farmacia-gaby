import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PersonalLayout from '../../layouts/PersonalLayout';
import { useAuth } from '../../context/AuthContext';
import { adminApi, fecha } from '../../api/adminApi';
export default function UsuarioDetalle() {
  const {
      id
    } = useParams(),
    {
      token
    } = useAuth(),
    [dato, setDato] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    const c = new AbortController();
    adminApi('auth', `/admin/usuarios/${id}`, token, {
      signal: c.signal
    }).then(setDato).catch(e => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, [id, token]);
  return <PersonalLayout titulo="Detalle del usuario"><Link to="/usuarios">← Usuarios</Link>{error && <p role="alert" className="personal-error">{error}</p>}{dato ? <section className="personal-card"><h2>{dato.nombre_completo}</h2><p>{dato.correo}<br />{dato.telefono || 'Teléfono pendiente'}</p><p>Estado: {dato.estado}<br />Roles: {dato.roles.join(', ')}<br />Último acceso: {fecha(dato.ultimo_acceso)}<br />Registro: {fecha(dato.created_at)}</p><Link to={`/usuarios/editar/${id}`}>Editar usuario</Link></section> : !error && <p>Cargando…</p>}</PersonalLayout>;
}
