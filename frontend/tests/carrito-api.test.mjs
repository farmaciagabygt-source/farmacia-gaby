import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const file=new URL('../src/api/carritoApi.js',import.meta.url);
const source=(await fs.readFile(file,'utf8')).replaceAll('import.meta.env','({})');
const {carritoApi,precioVigente,productosParaVenta}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const precio={importe:'100',desde:'2020-01-01',hasta:null,canal:'WEB',id_sucursal:null,ref_id_lista:{estado:'ACTIVO',moneda:'GTQ'},incluye_impuesto:false,tasa_impuesto:'0.12'};
test('Precios: vigencia, canal, moneda, lista y sucursal',()=>{
 const local={...precio,id_sucursal:2,importe:'90'};
 assert.equal(precioVigente([{...precio,hasta:'2021-01-01'},precio,local],2),local);
 assert.equal(precioVigente([local],1),null);
 assert.equal(precioVigente([precio],1,'USD'),null);
 assert.equal(precioVigente([{...precio,canal:'MOSTRADOR'}],1),null);
 assert.equal(precioVigente([{...precio,ref_id_lista:{estado:'INACTIVO',moneda:'GTQ'}}],1),null);
});
test('IDs reales, impuesto y existencias de la sucursal elegida',()=>{
 const products=[{id_producto:55,nombre:'Producto real',requiere_receta:true,rel_presentacion_producto_id_producto:[{id_presentacion_producto:77,nombre:'Presentación real',rel_precio_presentacion_id_presentacion:[precio]}]}];
 const stocks=[{id_presentacion:77,cantidad_disponible:4,sucursal:{id_sucursal:1}},{id_presentacion:77,cantidad_disponible:20,sucursal:{id_sucursal:2}}];
 const line=productosParaVenta(products,stocks,1)[0];assert.equal(line.idPresentacion,77);assert.equal(line.idProducto,55);assert.equal(line.stock,4);assert.ok(Math.abs(line.precio-112)<0.001);assert.equal(line.requiereReceta,true);
});
test('Producto sin precio vigente conserva disponibilidad de precio explícita',()=>{
 const line=productosParaVenta([{rel_presentacion_producto_id_producto:[{id_presentacion_producto:7}]}],[],1)[0];assert.equal(line.precio,null);assert.equal(line.stock,0);
});
test('JWT, invitado y cuerpos corresponden a los endpoints existentes',async()=>{
 const calls=[];globalThis.fetch=async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>({items:[]})}};
 await carritoApi.agregar({token:'jwt-de-prueba'},3,7,2);
 assert.equal(calls[0].url,'http://localhost:3004/items-carrito');assert.equal(calls[0].opts.headers.Authorization,'Bearer jwt-de-prueba');assert.equal(calls[0].opts.headers['x-token-invitado'],undefined);assert.deepEqual(JSON.parse(calls[0].opts.body),{id_carrito:3,id_presentacion:7,cantidad:2});
 await carritoApi.cantidad({invitado:'invitado-de-prueba'},8,3);assert.equal(calls[1].opts.method,'PUT');assert.equal(calls[1].url,'http://localhost:3004/items-carrito/8');assert.equal(calls[1].opts.headers['x-token-invitado'],'invitado-de-prueba');
 await carritoApi.abandonar({invitado:'invitado-de-prueba'},3);assert.equal(calls[2].url,'http://localhost:3004/carritos/3/abandonar');assert.equal(calls[2].opts.method,'PATCH');
});
test('Error del servidor conserva status y mensaje de stock',async()=>{
 globalThis.fetch=async()=>({ok:false,status:400,json:async()=>({message:'Solo hay 2 unidades disponibles en la sucursal'})});
 await assert.rejects(carritoApi.agregar({invitado:'prueba'},1,7,3),e=>e.status===400&&e.message.includes('2 unidades'));
});
