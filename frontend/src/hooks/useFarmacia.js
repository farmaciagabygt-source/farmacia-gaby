import { useEffect, useState } from 'react';
import { SERVICIOS } from '../api/urls';
export const diasSemana = [null, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const horaFarmacia = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export function useFarmacia() {
  const [farmacia, setFarmacia] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    const c = new AbortController();
    fetch(SERVICIOS.inventario + '/sucursales', {
      signal: AbortSignal.any([c.signal, AbortSignal.timeout(10000)])
    }).then(async r => {
      if (!r.ok) throw Error('No se pudo consultar la farmacia.');
      return r.json();
    }).then(s => setFarmacia(s.find(x => x.id_sucursal === 1) || s[0] || null)).catch(e => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, []);
  return {
    farmacia,
    error
  };
}
