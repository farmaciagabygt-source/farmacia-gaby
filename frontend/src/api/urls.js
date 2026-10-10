export const SERVICIOS = {
  auth: (import.meta.env.VITE_AUTH_URL || 'http://localhost:3001/api/auth').replace(/\/$/, ''),
  catalogo: (import.meta.env.VITE_CATALOGO_URL || 'http://localhost:3002').replace(/\/$/, ''),
  inventario: (import.meta.env.VITE_INVENTARIO_URL || 'http://localhost:3003').replace(/\/$/, ''),
  pedidos: (import.meta.env.VITE_PEDIDOS_URL || 'http://localhost:3004').replace(/\/$/, ''),
  pagos: (import.meta.env.VITE_PAGOS_URL || 'http://localhost:3005').replace(/\/$/, '')
};
