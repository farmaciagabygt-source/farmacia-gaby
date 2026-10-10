import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { obtenerProductosCatalogo } from './catalogoService.js';
import { construirMapaPresentaciones, seleccionarPrecioVigente } from './carritoService.js';
import { crearReservaInventario } from './inventarioService.js';

const fallo = (status, message) => Object.assign(new Error(message), { status });
const include = { rel_detalle_pedido_id_pedido: true, rel_pedido_contacto_id_pedido: true, rel_pedido_facturacion_id_pedido: true };
const decimal = value => new Prisma.Decimal(value);
export function validarCheckout(body) {
  const { id_carrito, id_sucursal, modalidad, clave_idempotencia, contacto } = body || {};
  if (![id_carrito, id_sucursal].every(n => Number.isSafeInteger(n) && n > 0)) throw fallo(400, 'Carrito y sucursal deben ser enteros positivos.');
  if (!['RETIRO', 'DOMICILIO'].includes(modalidad)) throw fallo(400, 'Selecciona retiro o domicilio.');
  if (typeof clave_idempotencia !== 'string' || !/^[A-Za-z0-9-]{16,80}$/.test(clave_idempotencia)) throw fallo(400, 'La clave de idempotencia debe tener entre 16 y 80 caracteres.');
  const limites = { comprador_nombre: 150, comprador_correo: 254, comprador_telefono: 25, destinatario: 150, telefono_entrega: 25, departamento: 100, municipio: 100, zona: 20, direccion: 500, referencias: 1000, instrucciones: 1000 };
  const normalizado = {};
  for (const [campo, limite] of Object.entries(limites)) {
    const valor = contacto?.[campo];
    if (valor != null && typeof valor !== 'string') throw fallo(400, `El campo ${campo} debe ser texto.`);
    if (valor?.trim().length > limite) throw fallo(400, `El campo ${campo} excede ${limite} caracteres.`);
    normalizado[campo] = valor?.trim() || null;
  }
  if (!normalizado.comprador_nombre || !normalizado.comprador_telefono) throw fallo(400, 'Nombre y teléfono son obligatorios.');
  if (!/^[+\d ()-]{7,25}$/.test(normalizado.comprador_telefono)) throw fallo(400, 'Escribe un teléfono válido.');
  if (normalizado.comprador_correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado.comprador_correo)) throw fallo(400, 'Escribe un correo válido.');
  if (modalidad === 'DOMICILIO' && ['departamento', 'municipio', 'zona', 'direccion'].some(k => !normalizado[k])) throw fallo(400, 'Completa departamento, municipio, zona y dirección.');
  let facturacion=null;
  if(body.facturacion!=null){
    if(typeof body.facturacion!=='object'||Array.isArray(body.facturacion))throw fallo(400,'Facturación inválida.');
    facturacion={};for(const [k,max] of Object.entries({nombre:200,identificacion_fiscal:30,direccion:500,correo:254})) {const v=body.facturacion[k];if(v!=null&&(typeof v!=='string'||v.trim().length>max))throw fallo(400,'Dato de facturación inválido.');facturacion[k]=v?.trim()||null;}
    if(!facturacion.nombre)throw fallo(400,'El nombre de facturación es obligatorio.');
    if(facturacion.correo&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(facturacion.correo))throw fallo(400,'Correo de facturación inválido.');
  }
  if(normalizado.telefono_entrega&&!/^[+\d ()-]{7,25}$/.test(normalizado.telefono_entrega))throw fallo(400,'Teléfono de entrega inválido.');
  return { id_carrito, id_sucursal, modalidad, clave_idempotencia, contacto: normalizado, facturacion };
}

export function calcularDetalle(producto, presentacion, precio, cantidad) {
  if (!presentacion.sku) throw fallo(409, 'La presentación no tiene SKU configurado.');
  const importe = decimal(precio.importe), tasa = decimal(precio.tasa_impuesto);
  const bruto = importe.mul(precio.incluye_impuesto ? 1 : decimal(1).plus(tasa)).mul(cantidad).toDecimalPlaces(2);
  const base = (precio.incluye_impuesto ? importe.div(decimal(1).plus(tasa)) : importe).mul(cantidad).toDecimalPlaces(2);
  return { id_presentacion: presentacion.id_presentacion_producto, sku: presentacion.sku, nombre_producto: producto.nombre, presentacion: presentacion.nombre, unidades_base: presentacion.unidades_base, cantidad, precio_unitario: importe, descuento: decimal(0), base_imponible: base, tasa_impuesto: tasa, impuesto: bruto.minus(base), total_linea: bruto, requiere_receta: producto.requiere_receta === true };
}

function mismoContenido(pedido, datos) {
  if (pedido.id_carrito !== datos.id_carrito || pedido.id_sucursal !== datos.id_sucursal || pedido.modalidad !== datos.modalidad) return false;
  const contacto = pedido.rel_pedido_contacto_id_pedido[0];
  const factura=pedido.rel_pedido_facturacion_id_pedido[0];
  const mismaFactura=datos.facturacion?Object.keys(datos.facturacion).every(k=>(factura?.[k]||null)===datos.facturacion[k]):!factura;
  return mismaFactura && Object.keys(datos.contacto).every(k => (contacto?.[k] || null) === datos.contacto[k]);
}

// El borrador persistido conserva los mismos IDs al recuperar una respuesta perdida.
// El bloqueo de PostgreSQL serializa reintentos incluso entre varias instancias.
async function finalizarReserva(id, datos) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${id}::bigint)::text`;
    let pedido = await tx.pedido.findUnique({ where: { id_pedido: id }, include });
    if (!mismoContenido(pedido, datos)) throw fallo(409, 'La clave ya fue utilizada con otros datos.');
    if (pedido.estado === 'CANCELADO') throw fallo(409, 'Este intento fue cancelado. Actualiza el carrito antes de intentar de nuevo.');
    if (!['BORRADOR', 'REVISION'].includes(pedido.estado)) return { status: 200, pedido };
    let reserva;
    try {
      reserva = await crearReservaInventario({ id_pedido: id, id_sucursal: pedido.id_sucursal, clave_idempotencia: `RESERVA-${pedido.clave_idempotencia}`, vence_at: new Date(Date.now() + 15 * 60000).toISOString(), detalles: pedido.rel_detalle_pedido_id_pedido.map(d => ({ id_detalle_pedido: d.id_detalle_pedido, id_presentacion: d.id_presentacion, cantidad: d.cantidad })) });
    } catch (error) {
      // Sólo un rechazo definitivo de stock permite devolver el carrito a edición.
      if (error.status === 409 && error.data?.message === 'Stock insuficiente para completar la reserva') {
        await tx.pedido.update({ where: { id_pedido: id }, data: { estado: 'CANCELADO', id_carrito: null, cancelado_at: new Date(), motivo_cancelacion: 'Existencias insuficientes' } });
        await tx.carrito.update({ where: { id_carrito: datos.id_carrito }, data: { estado: 'ACTIVO' } });
        await tx.historialPedido.create({ data: { id_pedido: id, estado_anterior: pedido.estado, estado_nuevo: 'CANCELADO', motivo: 'Existencias insuficientes; carrito recuperado', evento_origen: `STOCK-${id}` } });
        return { status: 409, message: 'No hay existencias suficientes. Actualiza las cantidades de tu carrito.', carrito_recuperado: true };
      }
      return { status: 503, message: 'No se pudo confirmar la reserva. Reintenta con los mismos datos; tu pedido no se duplicará.', reintentable: true, pedido };
    }
    if (reserva.estado !== 'ACTIVA' || new Date(reserva.vence_at) <= new Date()) return { status: 409, message: 'La reserva ya no está activa. El pedido requiere revisión.', pedido };
    const estado = 'PENDIENTE_CONFIRMACION';
    pedido = await tx.pedido.update({ where: { id_pedido: id }, data: { estado }, include });
    await tx.historialPedido.create({ data: { id_pedido: id, estado_anterior: 'BORRADOR', estado_nuevo: estado, motivo: 'Inventario reservado', evento_origen: `RESERVADO-${id}` } });
    return { status: 201, pedido, reserva_inventario: reserva };
  }, { timeout: 30000, maxWait: 30000 });
}

export async function crearPedidoCheckout(body) {
  const datos = validarCheckout(body);
  const existente = await prisma.pedido.findUnique({ where: { clave_idempotencia: datos.clave_idempotencia }, include });
  if (existente) return finalizarReserva(existente.id_pedido, datos);
  const { carrito, detalles, subtotal, impuesto, envio, total } = await prepararCheckout(body);
  if(body.total_esperado!=null && (typeof body.total_esperado!=='string'||!/^\d+(\.\d{1,2})?$/.test(body.total_esperado)||!decimal(body.total_esperado).eq(total)))throw fallo(409,'El total cambió. Calcula de nuevo antes de crear el pedido.');
  let pedido;
  try {
    pedido = await prisma.$transaction(async tx => {
      const cambiado = await tx.carrito.updateMany({ where: { id_carrito: datos.id_carrito, estado: 'ACTIVO', updated_at: carrito.updated_at }, data: { estado: 'CONVERTIDO' } });
      if (!cambiado.count) throw fallo(409, 'El carrito cambió. Actualízalo antes de continuar.');
      return tx.pedido.create({ data: { numero: `PED-${Date.now()}-${randomUUID().slice(0,8).toUpperCase()}`, id_cliente: carrito.id_cliente, id_sucursal: datos.id_sucursal, modalidad: datos.modalidad, estado: 'BORRADOR', moneda: carrito.moneda, subtotal, impuesto, descuento: decimal(0), envio, total: subtotal.plus(impuesto).plus(envio), clave_idempotencia: datos.clave_idempotencia, id_carrito: carrito.id_carrito, version_precios: 'catalogo', rel_detalle_pedido_id_pedido: { create: detalles }, rel_pedido_contacto_id_pedido: { create: datos.contacto }, ...(datos.facturacion?{rel_pedido_facturacion_id_pedido:{create:datos.facturacion}}:{}), rel_historial_pedido_id_pedido: { create: { estado_nuevo: 'BORRADOR', motivo: 'Creación desde carrito', evento_origen: `CREADO-${datos.clave_idempotencia}` } } }, include });
    });
  } catch (error) {
    const ganador = await prisma.pedido.findUnique({ where: { clave_idempotencia: datos.clave_idempotencia }, include });
    if (!ganador) throw error;
    pedido = ganador;
  }
  return finalizarReserva(pedido.id_pedido, datos);
}

async function prepararCheckout(body){
 const datos=validarCheckout(body);
  const carrito = await prisma.carrito.findUnique({ where: { id_carrito: datos.id_carrito }, include: { rel_item_carrito_id_carrito: true } });
  if (!carrito || carrito.estado !== 'ACTIVO' || carrito.vence_at <= new Date()) throw fallo(409, 'El carrito no está activo o venció.');
  if (carrito.id_sucursal !== datos.id_sucursal) throw fallo(400, 'La sucursal debe coincidir con la del carrito.');
  if (!carrito.rel_item_carrito_id_carrito.length) throw fallo(400, 'El carrito está vacío.');
  const mapa = construirMapaPresentaciones(await obtenerProductosCatalogo());
  const detalles = carrito.rel_item_carrito_id_carrito.map(item => {
    const encontrada = mapa.get(item.id_presentacion);
    if (!encontrada || encontrada.presentacion.estado !== 'ACTIVO' || !encontrada.presentacion.permite_venta) throw fallo(409, 'Un producto ya no está disponible. Actualiza el carrito.');
    const precio = seleccionarPrecioVigente(encontrada.presentacion.rel_precio_presentacion_id_presentacion, datos.id_sucursal, carrito.moneda);
    if (!precio) throw fallo(409, 'Un producto ya no tiene precio vigente.');
    return calcularDetalle(encontrada.producto, encontrada.presentacion, precio, item.cantidad);
  });
  const subtotal = detalles.reduce((s, d) => s.plus(d.base_imponible), decimal(0));
  const impuesto = detalles.reduce((s, d) => s.plus(d.impuesto), decimal(0));
  let envio = decimal(0);
  if (datos.modalidad === 'DOMICILIO') {
    const ahora = new Date();
    const tarifas = await prisma.tarifaEntrega.findMany({ where: { id_sucursal: datos.id_sucursal, desde: { lte: ahora }, OR: [{ hasta: null }, { hasta: { gt: ahora } }], ref_id_zona: { activa: true, departamento: datos.contacto.departamento, municipio: datos.contacto.municipio, zonas: { has: datos.contacto.zona } } }, orderBy: { desde: 'desc' } });
    if (!tarifas.length) throw fallo(409, 'No hay tarifa de entrega vigente para esa dirección. Puedes elegir retiro en sucursal.');
    const tarifa = tarifas[0], compra = subtotal.plus(impuesto);
    if (compra.lt(tarifa.minimo_compra)) throw fallo(409, `El mínimo de compra para entrega es ${tarifa.minimo_compra} ${carrito.moneda}.`);
    envio = tarifa.umbral_gratis != null && compra.gte(tarifa.umbral_gratis) ? decimal(0) : decimal(tarifa.importe);
  }

 return {datos,carrito,detalles,subtotal,impuesto,envio,total:subtotal.plus(impuesto).plus(envio)};
}
export async function cotizarCheckout(body){const c=await prepararCheckout(body);return {subtotal:c.subtotal,impuesto:c.impuesto,descuento:'0.00',envio:c.envio,total:c.total.toFixed(2),moneda:c.carrito.moneda,modalidad:c.datos.modalidad};}
