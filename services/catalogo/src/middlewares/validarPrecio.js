export function validarPrecio(req, res, next) {
  const b = req.body;
  for (const campo of ['importe', 'tasa_impuesto']) {
    if (b[campo] == null) continue;
    const s = String(b[campo]),
      n = Number(s);
    if (!Number.isFinite(n) || n < 0 || !(campo === 'importe' ? /^\d{1,12}(\.\d{1,2})?$/ : /^\d{1,2}(\.\d{1,4})?$/).test(s) || campo === 'tasa_impuesto' && n > 1) return res.status(400).json({
      message: campo === 'importe' ? 'Importe inválido: usa hasta dos decimales.' : 'La tasa debe estar entre 0 y 1: escribe 0.12 para 12 %.'
    });
  }
  next();
}
