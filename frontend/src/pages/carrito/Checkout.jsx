import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HeaderPublico from '../../components/public/HeaderPublico';
import FooterPublico from '../../components/public/FooterPublico';
import { useCarrito } from '../../context/CarritoContext';
import { useAuth } from '../../context/AuthContext';
import { carritoApi } from '../../api/carritoApi';
import { dineroPedido as dinero } from '../../utils/pedidos';
import '../../styles/cliente.css';

const campos={comprador_nombre:['Nombre completo',150],comprador_telefono:['Teléfono',25],comprador_correo:['Correo (opcional)',254],destinatario:['Persona que recibe (opcional)',150],telefono_entrega:['Teléfono de entrega (opcional)',25],departamento:['Departamento',100],municipio:['Municipio',100],zona:['Zona',20],direccion:['Dirección completa',500],referencias:['Referencias (opcional)',1000],instrucciones:['Instrucciones de entrega (opcional)',1000]};
const obligatorios=['comprador_nombre','comprador_telefono','departamento','municipio','zona','direccion'];
export default function Checkout(){
 const navigate=useNavigate();const {token}=useAuth();
 const {carrito,cargando,ocupado,crearPedido,cotizarPedido,actualizar,sucursales,sesionCarrito,esPersonal}=useCarrito();
 const storageKey=`gaby.checkout.v1.${sesionCarrito}`;
 const [pendiente,setPendiente]=useState(()=>{try{return JSON.parse(sessionStorage.getItem(storageKey));}catch{return null;}});
 const [modalidad,setModalidad]=useState(pendiente?.modalidad||'RETIRO');
 const [contacto,setContacto]=useState(pendiente?.contacto||{});
 const [facturar,setFacturar]=useState(!!pendiente?.facturacion);
 const [facturacion,setFacturacion]=useState(pendiente?.facturacion||{});
 const [direcciones,setDirecciones]=useState([]),[direccionId,setDireccionId]=useState('');
 const [cobertura,setCobertura]=useState(null),[errorCobertura,setErrorCobertura]=useState(''),[errorCuenta,setErrorCuenta]=useState('');
 const [cotizacion,setCotizacion]=useState(null),[error,setError]=useState(''),[enviando,setEnviando]=useState(false);
 const bloqueo=useRef(false),form=useRef(null);const branch=pendiente?.id_sucursal||carrito?.id_sucursal;
 useEffect(()=>{if(!token||pendiente)return;let alive=true;Promise.all([carritoApi.perfil({token}),carritoApi.direcciones({token})]).then(([p,d])=>{if(!alive)return;setDirecciones(d.direcciones||[]);setContacto(c=>({...c,comprador_nombre:c.comprador_nombre||p.usuario.nombre_completo,comprador_telefono:c.comprador_telefono||p.usuario.telefono||'',comprador_correo:c.comprador_correo||p.usuario.correo||''}));}).catch(e=>{if(alive)setErrorCuenta(e.message);});return()=>{alive=false;};},[token,pendiente]);
 useEffect(()=>{if(!branch)return;let alive=true;carritoApi.entrega(branch).then(d=>{if(alive){setCobertura(d);setErrorCobertura('');}}).catch(e=>{if(alive)setErrorCobertura(e.message);});return()=>{alive=false;};},[branch]);
 const cambiarContacto=(k,v)=>{setContacto(c=>({...c,[k]:v}));setCotizacion(null);};
 const elegirDireccion=id=>{setDireccionId(id);setCotizacion(null);const d=direcciones.find(x=>String(x.id_direccion_cliente)===id);if(d)setContacto(c=>({...c,destinatario:d.destinatario,telefono_entrega:d.telefono,departamento:d.departamento,municipio:d.municipio,zona:d.zona||'',direccion:d.direccion,referencias:d.referencias||''}));};
 const datos=()=>({id_carrito:carrito?.id_carrito,id_sucursal:branch,modalidad,contacto,facturacion:facturar?facturacion:null,clave_idempotencia:crypto.randomUUID()});
 const enviar=async e=>{
  e.preventDefault();if(bloqueo.current)return;bloqueo.current=true;setEnviando(true);setError('');
  try{
   if(!pendiente&&!cotizacion){setCotizacion(await cotizarPedido(datos()));return;}
   const body=pendiente||{...datos(),total_esperado:cotizacion.total};
   try{sessionStorage.setItem(storageKey,JSON.stringify(body));}catch{throw new Error('Permite el almacenamiento de esta pestaña para evitar pedidos duplicados.');}
   setPendiente(body);const r=await crearPedido(body);sessionStorage.removeItem(storageKey);setPendiente(null);navigate(`/pedido/${r.pedido.id_pedido}`,{replace:true});
  }catch(err){setError(err.message);if(err.data?.carrito_recuperado||err.status===400||(err.status===409&&!err.data?.pedido)){sessionStorage.removeItem(storageKey);setPendiente(null);setCotizacion(null);await actualizar();}}
  finally{bloqueo.current=false;setEnviando(false);}
 };
 const sucursal=sucursales.find(s=>s.id_sucursal===branch);const bloqueado=cargando||ocupado||enviando;
 const campo=(key,label,maxLength,obj,cambiar,required=false)=><label className="checkout-field" key={key}>{label}<input name={key} value={obj[key]||''} maxLength={maxLength} required={required} type={key.includes('correo')?'email':key.includes('telefono')?'tel':'text'} onChange={e=>cambiar(key,e.target.value)}/></label>;
 return <div className="gaby-cart-page"><HeaderPublico/><main className="gaby-cart-main"><Link className="gaby-cart-back" to="/carrito">← Volver al carrito</Link><h1>Revisar y crear mi pedido</h1><p>Elige cómo recibirlo y revisa el total antes de confirmar.</p>{error&&<div className="gaby-cart-message error" role="alert">{error}</div>}
 {esPersonal?<p>Este formulario está disponible para clientes e invitados.</p>:cargando?<p role="status">Cargando carrito…</p>:!carrito?.items?.length&&!pendiente?<section className="gaby-cart-empty"><h2>Necesitas productos en tu carrito</h2><Link to="/productos" className="gaby-cart-button">Explorar productos</Link></section>:<form ref={form} onSubmit={enviar} className="gaby-cart-layout">
 <section className="cliente-panel"><h2>Contacto y entrega</h2>{pendiente&&<p className="cliente-note">Reintentar recupera el pedido anterior con los mismos datos.</p>}
 <fieldset disabled={bloqueado||!!pendiente} className="checkout-fields">
 <label className="checkout-field">¿Cómo recibirás tus productos?<select value={modalidad} onChange={e=>{setModalidad(e.target.value);setCotizacion(null);}}><option value="RETIRO">Retiro en sucursal</option><option value="DOMICILIO">Entrega a domicilio</option></select></label>
 <div className="cliente-note"><strong>{sucursal?.nombre||`Sucursal ${branch}`}</strong>{sucursal?.direccion&&<p>{sucursal.direccion}<br/>{[sucursal.zona&&`Zona ${sucursal.zona}`,sucursal.municipio,sucursal.departamento].filter(Boolean).join(', ')}</p>}{modalidad==='RETIRO'&&<p>Retira cuando la farmacia marque el pedido como listo. Presenta el número de pedido. El retiro no tiene costo de envío.</p>}</div>
 {errorCuenta&&<p role="status">No se pudieron precargar tus datos: {errorCuenta}. Puedes ingresarlos aquí.</p>}
 {modalidad==='DOMICILIO'&&<label className="checkout-field">Usar una dirección guardada<select value={direccionId} onChange={e=>elegirDireccion(e.target.value)}><option value="">Ingresar o editar dirección</option>{direcciones.map(d=><option key={d.id_direccion_cliente} value={d.id_direccion_cliente}>{d.alias}{d.predeterminada?' · Predeterminada':''}</option>)}</select></label>}
 {Object.entries(campos).filter(([k])=>modalidad==='DOMICILIO'||k.startsWith('comprador_')).map(([k,[label,max]])=>campo(k,label,max,contacto,cambiarContacto,obligatorios.includes(k)))}
 {modalidad==='DOMICILIO'&&<>{!token&&<p>Inicia sesión para utilizar direcciones guardadas.</p>}{errorCobertura?<p role="alert">{errorCobertura}</p>:cobertura?.length?<div className="cliente-note"><strong>Cobertura configurada</strong>{cobertura.map((t,i)=><p key={i}>{t.departamento}, {t.municipio}: zonas {t.zonas.join(', ')}. Envío {dinero(t.importe)}. Compra mínima {dinero(t.minimo_compra)}.{t.umbral_gratis!=null&&` Gratis desde ${dinero(t.umbral_gratis)}.`}{t.plazo_minutos!=null&&` Plazo estimado: ${t.plazo_minutos} minutos.`}</p>)}</div>:cobertura&&<p className="cliente-note">La farmacia aún no tiene tarifas de domicilio configuradas para esta sucursal. Puedes elegir retiro.</p>}</>}
 <label className="checkout-check"><input type="checkbox" checked={facturar} onChange={e=>{setFacturar(e.target.checked);setCotizacion(null);}}/>Agregar datos para factura</label>
 {facturar&&Object.entries({nombre:['Nombre de facturación',200],identificacion_fiscal:['NIT o identificación fiscal (opcional)',30],direccion:['Dirección de facturación (opcional)',500],correo:['Correo de facturación (opcional)',254]}).map(([k,[l,max]])=>campo(k,l,max,facturacion,(key,v)=>{setFacturacion(f=>({...f,[key]:v}));setCotizacion(null);},k==='nombre'))}
 </fieldset></section>
 <aside className="gaby-cart-summary"><h2>Revisión final</h2>{carrito?.items?.map(item=><div key={item.id_item_carrito}><span>{item.nombre_producto} × {item.cantidad}</span><strong>{dinero(item.subtotal,carrito.moneda)}</strong></div>)}
 {cotizacion?<><div><span>Base de productos</span><strong>{dinero(cotizacion.subtotal,cotizacion.moneda)}</strong></div><div><span>Impuesto</span><strong>{dinero(cotizacion.impuesto,cotizacion.moneda)}</strong></div><div><span>Envío</span><strong>{dinero(cotizacion.envio,cotizacion.moneda)}</strong></div><div className="gaby-cart-total"><span>Total</span><strong>{dinero(cotizacion.total,cotizacion.moneda)}</strong></div></>:carrito&&<div className="gaby-cart-total"><span>Productos estimados</span><strong>{dinero(carrito.resumen.subtotal,carrito.moneda)}</strong></div>}
 <p>Primero calculamos el costo con los precios y la cobertura vigentes. Si cambia el total, debes revisarlo de nuevo.</p><p>Al crear el pedido se reservan existencias durante 15 minutos. Después puedes registrar efectivo al retirar o recibir desde su detalle.</p>
 <button type="submit" className="gaby-cart-button" disabled={bloqueado||(!pendiente&&carrito?.resumen.hay_items_no_disponibles)}>{enviando?'Procesando…':pendiente?'Recuperar mi pedido':cotizacion?'Crear mi pedido':'Calcular total'}</button>
 {cotizacion&&<button type="button" className="cliente-button secondary" disabled={bloqueado} onClick={()=>setCotizacion(null)}>Volver a revisar</button>}
 <small>Registrar efectivo no acredita el cobro; el personal de farmacia lo confirma al recibirlo.</small>
 </aside></form>}</main><FooterPublico/></div>;
}
