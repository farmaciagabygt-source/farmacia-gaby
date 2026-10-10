import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { carritoApi } from '../api/carritoApi';
import '../styles/carrito.css';

const Context = createContext(null);
const GUEST_KEY = 'gaby.carrito.invitado.v1';
const BRANCH_KEY = 'gaby.carrito.sucursal.v1';

function tokenInvitado() {
  let token = localStorage.getItem(GUEST_KEY);
  if (!token) { token = crypto.randomUUID(); localStorage.setItem(GUEST_KEY, token); }
  return token;
}

export function CarritoProvider({ children }) {
  const { token } = useAuth();
  return <CarritoSession key={token || "invitado"}>{children}</CarritoSession>;
}

function CarritoSession({ children }) {
  const { token, usuario } = useAuth();
  const esPersonal = !!token && !usuario?.roles?.includes('CLIENTE');
  const [carrito, setCarrito] = useState(null);
  const [cargando, setCargando] = useState(!esPersonal);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(null);
  const [existencias, setExistencias] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [sucursal, setSucursal] = useState(() => { try { return Number(localStorage.getItem(BRANCH_KEY)) || null; } catch { return null; } });
  const estado = useRef({ epoch: 0, carrito: null, identidad: null, ocupado: false });

  useEffect(() => {
    let alive = true;
    Promise.all([carritoApi.existencias(), carritoApi.sucursales()]).then(([data, branches]) => {
      if (!alive) return;
      setExistencias(data);

      setSucursales(branches);
      setSucursal(current => branches.some(b => b.id_sucursal === current) ? current : branches[0]?.id_sucursal || null);
    }).catch(() => { if (alive) setError('No se pudieron cargar las sucursales y existencias. Intenta actualizar el carrito.'); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const current = estado.current;
    const epoch = ++current.epoch;
    estado.current.carrito = null;
    estado.current.ocupado = false;
    if (esPersonal) { estado.current.identidad = null; return; }
    try {
      const identidad = token ? { token } : { invitado: tokenInvitado() };
      estado.current.identidad = identidad;
      carritoApi.activo(identidad).then(data => {
        if (estado.current.epoch !== epoch) return;
        estado.current.carrito = data; setCarrito(data);
        if (data.id_sucursal) setSucursal(data.id_sucursal);
      }).catch(err => { if (estado.current.epoch === epoch && err.status !== 404) setError(err.message); })
        .finally(() => { if (estado.current.epoch === epoch) setCargando(false); });
    } catch { queueMicrotask(() => { if (current.epoch === epoch) { setError('Permite el almacenamiento del navegador para conservar tu carrito.'); setCargando(false); } }); }
    return () => { if (current.epoch === epoch) current.epoch++; };
  }, [token, esPersonal]);

  useEffect(() => { try { if (sucursal) localStorage.setItem(BRANCH_KEY, String(sucursal)); } catch { /* La preferencia es opcional; el carrito sigue en el servidor. */ } }, [sucursal]);
  useEffect(() => { if (!aviso) return; const timer = setTimeout(() => setAviso(null), 5500); return () => clearTimeout(timer); }, [aviso]);

  const ejecutar = useCallback(async (operation, message) => {
    if (estado.current.ocupado || cargando) return false;
    if (!estado.current.identidad || esPersonal) { setError('El carrito está disponible para clientes e invitados.'); return false; }
    const epoch = estado.current.epoch;
    estado.current.ocupado = true; setOcupado(true); setError(''); setAviso(null);
    try {
      const data = await operation(estado.current.identidad, estado.current.carrito);
      if (estado.current.epoch !== epoch) return false;
      estado.current.carrito = data; setCarrito(data);
      if (message) setAviso({ texto: message, tipo: 'success' });
      return true;
    } catch (err) {
      if (estado.current.epoch === epoch) { setError(err.message || 'No se pudo conectar. Intenta de nuevo.'); setAviso({ texto: err.message || 'No se pudo conectar. Intenta de nuevo.', tipo: 'error' }); }
      return false;
    } finally { if (estado.current.epoch === epoch) { estado.current.ocupado = false; setOcupado(false); } }
  }, [cargando, esPersonal]);

  const agregar = (id, cantidad = 1) => ejecutar(async (identidad, activo) => {
    if (!sucursal) throw new Error('Selecciona una sucursal disponible antes de agregar productos.');
    const epoch = estado.current.epoch;
    if (!activo || activo.estado !== 'ACTIVO') {
      activo = await carritoApi.crear(identidad, sucursal);
      if (estado.current.epoch !== epoch) throw new Error("La sesión cambió durante la operación.");
      estado.current.carrito = activo;
    }
    return carritoApi.agregar(identidad, activo.id_carrito, id, cantidad);
  }, 'Producto agregado al carrito.');
  const cambiarCantidad = (id, cantidad) => ejecutar(async identidad => {
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) throw new Error('La cantidad debe ser un entero entre 1 y 999.');
    return carritoApi.cantidad(identidad, id, cantidad);
  });
  const eliminar = id => ejecutar(identidad => carritoApi.eliminar(identidad, id), 'Producto eliminado.');
  const vaciar = () => ejecutar((identidad, activo) => carritoApi.vaciar(identidad, activo.id_carrito), 'Carrito vacío.');
  const abandonar = () => ejecutar(async (identidad, activo) => { if (activo) await carritoApi.abandonar(identidad, activo.id_carrito); return null; }, 'Carrito cerrado. Puedes comenzar uno nuevo.');
  const cambiarSucursal = value => ejecutar(async (identidad, activo) => {
    const id = Number(value);
    if (!sucursales.some(s => s.id_sucursal === id)) throw new Error('Selecciona una sucursal válida.');
    if (activo?.items.length) throw new Error('Vacía el carrito antes de cambiar de sucursal.');
    if (activo) await carritoApi.abandonar(identidad, activo.id_carrito);
    setSucursal(id); return null;
  });
  const actualizar = () => ejecutar(async identidad => {
    const stocks = await carritoApi.existencias(); setExistencias(stocks);
    const branches = await carritoApi.sucursales(); setSucursales(branches);
    if (!sucursal && branches[0]) setSucursal(branches[0].id_sucursal);
    try { return await carritoApi.activo(identidad); } catch (err) { if (err.status === 404) return null; throw err; }
  });
  const crearPedido = async body => {
    if (estado.current.ocupado || cargando || !estado.current.identidad || esPersonal) throw new Error('Espera a que termine la operación actual.');
    const epoch = estado.current.epoch;
    estado.current.ocupado = true; setOcupado(true);
    try {
      const resultado = await carritoApi.crearPedido(estado.current.identidad, body);
      if (estado.current.epoch !== epoch) throw new Error('La sesión cambió durante la operación.');
      estado.current.carrito = null; setCarrito(null);
      return resultado;
    } finally { if (estado.current.epoch === epoch) { estado.current.ocupado = false; setOcupado(false); } }
  };
  const consultarPedido = useCallback((id, signal) => {
    if (!estado.current.identidad) return Promise.reject(new Error('La sesión todavía no está disponible.'));
    return carritoApi.pedido(estado.current.identidad, id, signal);
  }, []);
  const operarPedido = useCallback((operacion, ...args) => {
    if (!estado.current.identidad) return Promise.reject(new Error('La sesión todavía no está disponible.'));
    if (!['cancelarPedido','iniciarPago','pagosPedido','cotizarPedido'].includes(operacion)) return Promise.reject(new Error('Operación inválida.'));
    return carritoApi[operacion](estado.current.identidad, ...args);
  }, []);
  const cotizarPedido = body => operarPedido('cotizarPedido', body);
  const value = { operarPedido, cotizarPedido, consultarPedido, crearPedido, sesionCarrito: token ? `cliente-${usuario?.id_cliente}` : "invitado", carrito, cargando, ocupado, error, sucursal: carrito?.id_sucursal || sucursal, sucursales, existencias, esPersonal, agregar, cambiarCantidad, eliminar, vaciar, abandonar, cambiarSucursal, actualizar };
  return <Context.Provider value={value}>{children}{aviso && <div className={`gaby-cart-toast ${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}><span>{aviso.texto}</span><button type="button" aria-label="Cerrar aviso" onClick={() => setAviso(null)}>×</button></div>}</Context.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCarrito() { const value = useContext(Context); if (!value) throw new Error('Falta CarritoProvider'); return value; }
