import crypto from 'node:crypto';
export function soloServicio(req,res,next){
 const esperada=process.env.SERVICE_API_KEY,recibida=req.headers['x-service-key'];
 if(typeof esperada!=='string'||esperada.length<32||typeof recibida!=='string')return res.status(401).json({message:'Se requiere una credencial de servicio.'});
 const hash=v=>crypto.createHash('sha256').update(v).digest();
 if(!crypto.timingSafeEqual(hash(esperada),hash(recibida)))return res.status(401).json({message:'Credencial de servicio inválida.'});
 next();
}
