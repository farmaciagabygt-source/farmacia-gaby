const fs=require('node:fs');const crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const path=require('node:path'); const root=path.resolve(__dirname, '../../..');
const servicioKey=fs.readFileSync(path.join(root,'.env'),'utf8').split(/\r?\n/).find(l=>l.startsWith('SERVICE_API_KEY='))?.slice('SERVICE_API_KEY='.length).replace(/^['\"]|['\"]$/g,'');
const fixtures=[]; const invitados=[],carritos=[],keys=[],reservas=[];let count=0;
const check=(ok,label)=>{if(!ok)throw Error('FALLÓ '+label);count++;console.log('OK '+label)};
async function req(port,route,method='GET',body,invitado){const r=await fetch(`http://localhost:${port}${route}`,{method,headers:{Connection:'close','Content-Type':'application/json',...(port===3003&&method!=='GET'?{'x-service-key':servicioKey}:{}),...(invitado?{'x-token-invitado':invitado}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(40000)});return {status:r.status,data:await r.json()};}
function sql(db,text){const r=spawnSync('docker',['compose','exec','-T','postgres','sh','-c',`psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d ${db}`],{cwd:root,input:text,encoding:'utf8'});if(r.status)throw Error('SQL prueba: '+r.stderr);return r.stdout;}
async function nuevo(id,sucursal){const guest=crypto.randomUUID();invitados.push(guest);const c=await req(3004,'/carritos','POST',{id_sucursal:sucursal},guest);check(c.status===201,'carrito temporal');carritos.push(c.data.id_carrito);const a=await req(3004,'/items-carrito','POST',{id_carrito:c.data.id_carrito,id_presentacion:id,cantidad:1},guest);check(a.status===201,'producto real agregado');const key=crypto.randomUUID();keys.push(key);return {guest,body:{id_carrito:c.data.id_carrito,id_sucursal:sucursal,modalidad:'RETIRO',clave_idempotencia:key,contacto:{comprador_nombre:'PRUEBA CHECKOUT LOCAL',comprador_telefono:'00000000',comprador_correo:'checkout@example.invalid'}}};}
(async()=>{try{

 const productosIniciales=(await req(3002,'/productos')).data;
 for (const producto of [productosIniciales.find(p=>!p.requiere_receta),productosIniciales.find(p=>p.requiere_receta)].filter(Boolean)) {
   const tag='TEST-'+crypto.randomUUID();
   const id=Number(sql('gaby_catalogo',`INSERT INTO presentacion_producto (sku,nombre,tipo,unidades_base,permite_venta,estado,id_producto,updated_at) VALUES ('${tag}','PRUEBA CHECKOUT TEMPORAL','UNIDAD',1,true,'ACTIVO',${producto.id_producto},now()) RETURNING id_presentacion_producto;`).split('\n').find(l=>/^\s*\d+\s*$/.test(l)));
   fixtures.push({id,tag});
   sql('gaby_catalogo',`INSERT INTO precio_presentacion (importe,incluye_impuesto,tasa_impuesto,id_sucursal,canal,desde,id_lista,id_presentacion,updated_at) SELECT 12.34,false,0.12,null,'WEB',now(),id_lista,${id},now() FROM precio_presentacion LIMIT 1;`);
   const lote=Number(sql('gaby_inventario',`INSERT INTO lote (id_producto,numero,fabricante_referencia,fecha_vencimiento,estado,updated_at) VALUES (${producto.id_producto},'${tag}','TEST LOCAL','2027-12-31','DISPONIBLE',now()) RETURNING id_lote;`).split('\n').find(l=>/^\s*\d+\s*$/.test(l)));
   fixtures[fixtures.length-1].lote=lote;
   sql('gaby_inventario',`INSERT INTO existencia (id_presentacion,cantidad_fisica,cantidad_reservada,id_ubicacion,id_lote,updated_at) SELECT ${id},5,0,id_ubicacion,${lote},now() FROM existencia LIMIT 1;`);
 }
 const p=await req(3002,'/productos'),s=await req(3003,'/existencias/resumen');
 const opciones=p.data.flatMap(producto=>(producto.rel_presentacion_producto_id_producto||[]).flatMap(v=>s.data.filter(e=>e.id_presentacion===v.id_presentacion_producto&&e.cantidad_disponible>3&&fixtures.some(f=>f.id===v.id_presentacion_producto)&&v.rel_precio_presentacion_id_presentacion?.length).map(e=>({id:v.id_presentacion_producto,sucursal:e.sucursal.id_sucursal,recipe:producto.requiere_receta}))));
 check(opciones.length>0,'catálogo e inventario disponibles');
 for(const option of [opciones.find(o=>!o.recipe),opciones.find(o=>o.recipe)].filter(Boolean)){
  const test=await nuevo(option.id,option.sucursal);
  const r=await Promise.all([req(3004,'/pedidos','POST',test.body,test.guest),req(3004,'/pedidos','POST',test.body,test.guest)]);
  for(const response of r) if(response.data.reserva_inventario) reservas.push(response.data.reserva_inventario.id_reserva_inventario);
  if(!r.every(a=>[200,201].includes(a.status)))throw Error(JSON.stringify(r));
  check(r[0].data.pedido.id_pedido===r[1].data.pedido.id_pedido,'doble envío genera un pedido');
  const pedido=r[0].data.pedido;check(pedido.estado==='PENDIENTE_CONFIRMACION','pedido sin flujo de receta');
  check(Number(pedido.total)===Number(pedido.subtotal)+Number(pedido.impuesto)+Number(pedido.envio),'totales coherentes');
  check(pedido.rel_pedido_contacto_id_pedido[0].comprador_nombre===test.body.contacto.comprador_nombre,'contacto guardado junto al pedido');
  const otro=crypto.randomUUID();check((await req(3004,`/pedidos/${pedido.id_pedido}`,'GET',null,otro)).status===404,'otro invitado no consulta el pedido');
  check((await req(3004,`/pedidos-contacto/${pedido.id_pedido}`,'GET',null,otro)).status===404,'contacto ajeno protegido');
  check((await req(3004,`/pedidos-contacto/${pedido.id_pedido}`,'GET',null,test.guest)).status===200,'dueño consulta contacto');
  check((await req(3004,'/pedidos','POST',{...test.body,contacto:{...test.body.contacto,comprador_nombre:'OTRO'}},test.guest)).status===409,'clave reutilizada con datos distintos bloqueada');
  check((await req(3004,`/carritos/${test.body.id_carrito}/items`,'DELETE',null,test.guest)).status===400,'carrito convertido no se modifica');
  if(option.recipe)check(pedido.rel_detalle_pedido_id_pedido.some(d=>d.requiere_receta),'se conserva información original del catálogo');

  sql('gaby_pedidos',`BEGIN; UPDATE pedido SET estado='BORRADOR' WHERE id_pedido=${pedido.id_pedido}; DELETE FROM historial_pedido WHERE id_pedido=${pedido.id_pedido} AND evento_origen='RESERVADO-${pedido.id_pedido}'; COMMIT;`);
  const recuperado=await req(3004,'/pedidos','POST',test.body,test.guest);
  check([200,201].includes(recuperado.status)&&recuperado.data.pedido.id_pedido===pedido.id_pedido,'recuperación tras reserva confirmada sin finalizar pedido');
  const n=sql('gaby_inventario',`SELECT count(*) FROM reserva_inventario WHERE id_pedido=${pedido.id_pedido};`);check(/\s1\s/.test(n),'una sola reserva por pedido');
 }
 const o=opciones[0],test=await nuevo(o.id,o.sucursal);
 check((await req(3004,'/pedidos','POST',{...test.body,contacto:{}},test.guest)).status===400,'contacto incompleto rechazado');
 check((await req(3004,'/pedidos','POST',{...test.body,modalidad:'DOMICILIO',contacto:{...test.body.contacto,departamento:'SIN COBERTURA TEST',municipio:'SIN COBERTURA TEST',zona:'999',direccion:'DIRECCION DE PRUEBA'}},test.guest)).status===409,'domicilio sin tarifa no inventa envío gratuito');
 sql('gaby_pedidos',`UPDATE item_carrito SET cantidad=999 WHERE id_carrito=${test.body.id_carrito};`);
 const r=await req(3004,'/pedidos','POST',test.body,test.guest);check(r.status===409&&r.data.carrito_recuperado,'falta de stock devuelve carrito a edición');
 const active=await req(3004,'/carritos/activo','GET',null,test.guest);check(active.status===200&&active.data.id_carrito===test.body.id_carrito,'carrito recuperado conserva productos');
 console.log(count+' comprobaciones pasaron.');
 }finally{
  for(const id of [...new Set(reservas)]){const r=await req(3003,`/reservas/${id}/liberar`,'PATCH',{motivo:'Limpieza de prueba local checkout'});if(r.status!==200)throw Error('No se pudo liberar reserva de prueba '+id);}
  const claves=keys.map(k=>`'${k}'`).join(',');
  if(claves){const ids=sql('gaby_pedidos',`SELECT id_pedido FROM pedido WHERE clave_idempotencia IN (${claves});`).split('\n').filter(l=>/^\s*\d+\s*$/.test(l)).map(Number);if(ids.length){const list=ids.join(',');sql('gaby_inventario',`BEGIN; DELETE FROM evento_reserva WHERE id_reserva IN (SELECT id_reserva_inventario FROM reserva_inventario WHERE id_pedido IN (${list})); DELETE FROM reserva_detalle WHERE id_reserva IN (SELECT id_reserva_inventario FROM reserva_inventario WHERE id_pedido IN (${list})); DELETE FROM reserva_inventario WHERE id_pedido IN (${list}); COMMIT;`);sql('gaby_pedidos',`BEGIN; DELETE FROM historial_pedido WHERE id_pedido IN (${list}); DELETE FROM pedido_contacto WHERE id_pedido IN (${list}); DELETE FROM detalle_pedido WHERE id_pedido IN (${list}); DELETE FROM pedido WHERE id_pedido IN (${list}) AND clave_idempotencia IN (${claves}); COMMIT;`);}}
  if(carritos.length)sql('gaby_pedidos',`BEGIN; DELETE FROM item_carrito WHERE id_carrito IN (${carritos.join(',')}); DELETE FROM carrito WHERE id_carrito IN (${carritos.join(',')}); COMMIT;`);

  for(const f of fixtures){sql('gaby_inventario',`BEGIN; DELETE FROM existencia WHERE id_presentacion=${f.id} AND id_lote=${f.lote}; DELETE FROM lote WHERE id_lote=${f.lote} AND numero='${f.tag}'; COMMIT;`);sql('gaby_catalogo',`BEGIN; DELETE FROM precio_presentacion WHERE id_presentacion=${f.id}; DELETE FROM presentacion_producto WHERE id_presentacion_producto=${f.id} AND sku='${f.tag}'; COMMIT;`);}
  console.log('Pedidos, reservas, carritos y datos sintéticos de catálogo/inventario limpiados.');
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
