const origenes = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production') {
  if (!process.env.CORS_ORIGINS || origenes.includes('*') || origenes.some(s => !s.startsWith('https://'))) throw Error('Producción requiere CORS_ORIGINS con los dominios HTTPS del frontend.');
  if (!process.env.SERVICE_API_KEY || process.env.SERVICE_API_KEY.length < 32) throw Error('Producción requiere SERVICE_API_KEY de al menos 32 caracteres.');
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) throw Error('Producción requiere JWT_SECRET de al menos 32 caracteres.');
}
export const corsOptions = {
  origin: (origen, callback) => callback(null, !origen || origenes.includes(origen))
};
