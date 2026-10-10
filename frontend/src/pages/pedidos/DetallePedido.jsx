import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import HeaderPublico from '../../components/public/HeaderPublico';
import FooterPublico from '../../components/public/FooterPublico';
import { useAuth } from '../../context/AuthContext';
import { useCarrito } from '../../context/CarritoContext';
import { dineroPedido, etiquetaEstado, fechaPedido, modalidadPedido } from '../../utils/pedidos';
import '../../styles/cliente.css';

export default function DetallePedido() {
  const { id } = useParams();
  const { token } = useAuth();
  return <Sesion key={`${token || 'invitado'}-${id}`} id={id} />;
}

function Sesion({ id }) {
  const { token } = useAuth();
  const { consultarPedido, operarPedido, cargando: preparandoSesion, esPersonal } = useCarrito();
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (preparandoSesion || esPersonal) return;
    let alive = true; const controller = new AbortController();
    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) { queueMicrotask(() => { if (alive) { setError('El número de pedido no es válido.'); setCargando(false); } }); }
    else consultarPedido(Number(id), controller.signal).then(data => { if (alive) { setPedido(data); setError(''); } }).catch(err => { if (alive) setError(err.status === 404 ? 'No encontramos este pedido en tu cuenta o navegador.' : err.message); }).finally(() => { if (alive) setCargando(false); });
    return () => { alive = false; controller.abort(); };
  }, [id, preparandoSesion, esPersonal, consultarPedido, intento]);
  const actualizar = () => { setCargando(true); setError(''); setIntento(n => n + 1); };
  const contacto = pedido?.rel_pedido_contacto_id_pedido?.[0];
  return <div className="cliente-page"><HeaderPublico /><main className="cliente-main"><Link className="cliente-back" to={token ? '/mis-pedidos' : '/productos'}>← {token ? 'Mis pedidos' : 'Volver al catálogo'}</Link>
    <div className="cliente-heading"><div><span className="cliente-eyebrow">FARMACIA GABY</span><h1>{pedido?.numero || 'Detalle del pedido'}</h1></div><button type="button" className="cliente-button secondary" onClick={actualizar} disabled={cargando || preparandoSesion || esPersonal}>Actualizar estado</button></div>
    {esPersonal ? <div className="cliente-note">Esta vista es para clientes e invitados.</div> : error ? <div className="cliente-note cliente-error" role="alert">{error}<p><button type="button" className="cliente-button secondary" onClick={actualizar}>Reintentar</button></p></div> : cargando || preparandoSesion ? <p role="status">Cargando detalle…</p> : pedido && <>
      {!token && <p className="cliente-note">Guarda este enlace. Puedes consultar este pedido de invitado desde el mismo navegador mientras conserves sus datos.</p>}
      <section className="cliente-panel"><span className={`pedido-badge ${pedido.estado}`}>{etiquetaEstado(pedido.estado)}</span><div className="pedido-meta"><span>Creado: {fechaPedido(pedido.created_at)}</span><span>{modalidadPedido(pedido.modalidad)}</span></div>{pedido.estado === 'PENDIENTE_CONFIRMACION' && <p>Selecciona el método de pago para confirmar tu solicitud.</p>}{pedido.estado === 'CONFIRMADO' && <p>Solicitud confirmada. Consulta abajo si el cobro está pendiente o confirmado.</p>}{pedido.estado === 'BORRADOR' && <Link to="/checkout" className="cliente-back">Retomar el intento de pedido →</Link>}{pedido.motivo_cancelacion && <p>Motivo de cancelación: {pedido.motivo_cancelacion}</p>}</section>
      <AccionesPedido pedido={pedido} onActualizar={actualizar} operarPedido={operarPedido} /><section className="cliente-panel"><h2>Productos</h2><ul className="pedido-productos">{pedido.rel_detalle_pedido_id_pedido.map(d => <li key={d.id_detalle_pedido}><div><h3>{d.nombre_producto}</h3><p>{d.presentacion} · Cantidad: {d.cantidad}</p></div><strong>{dineroPedido(d.total_linea, pedido.moneda)}</strong></li>)}</ul></section>
      <div className="salud-detail-grid"><section className="cliente-panel"><h2>Contacto y entrega</h2>{contacto ? <><p><strong>{contacto.comprador_nombre}</strong><br />{contacto.comprador_telefono}<br />{contacto.comprador_correo}</p>{pedido.modalidad === 'DOMICILIO' && <p>{contacto.destinatario && <>{contacto.destinatario}<br /></>}{contacto.direccion}<br />{[contacto.zona && `Zona ${contacto.zona}`, contacto.municipio, contacto.departamento].filter(Boolean).join(', ')}{contacto.referencias && <><br />Referencia: {contacto.referencias}</>}</p>}</> : <p>No hay contacto registrado.</p>}{pedido.rel_envio_id_pedido?.length ? pedido.rel_envio_id_pedido.map(e => <p key={e.id_envio}>Seguimiento interno: <strong>{e.numero_seguimiento}</strong><br />Estado del envío: {e.estado.replaceAll('_', ' ').toLowerCase()}{e.transportista && <><br />Transportista: {e.transportista}</>}</p>) : <p>{pedido.modalidad === 'DOMICILIO' ? (pedido.estado === 'CANCELADO' ? 'El pedido de entrega está cancelado.' : 'El seguimiento se asignará al confirmar la solicitud.') : 'Retiro en la sucursal seleccionada al crear el pedido.'}</p>}</section>
        <section className="cliente-panel pedido-total"><h2>Totales del pedido</h2><div><span>Base de productos</span><strong>{dineroPedido(pedido.subtotal, pedido.moneda)}</strong></div><div><span>Descuento</span><strong>{dineroPedido(pedido.descuento, pedido.moneda)}</strong></div><div><span>Impuesto</span><strong>{dineroPedido(pedido.impuesto, pedido.moneda)}</strong></div><div><span>Envío</span><strong>{dineroPedido(pedido.envio, pedido.moneda)}</strong></div><div className="total"><span>Total</span><strong>{dineroPedido(pedido.total, pedido.moneda)}</strong></div></section></div>
      {pedido.rel_pedido_facturacion_id_pedido?.[0] && <section className="cliente-panel"><h2>Datos solicitados para factura</h2><p><strong>{pedido.rel_pedido_facturacion_id_pedido[0].nombre}</strong><br/>{pedido.rel_pedido_facturacion_id_pedido[0].identificacion_fiscal}<br/>{pedido.rel_pedido_facturacion_id_pedido[0].direccion}<br/>{pedido.rel_pedido_facturacion_id_pedido[0].correo}</p><small>La farmacia debe emitir la factura correspondiente.</small></section>}
      <section className="cliente-panel"><h2>Historial del pedido</h2><ol className="pedido-timeline">{[...(pedido.rel_historial_pedido_id_pedido || [])].sort((a,b) => new Date(a.created_at) - new Date(b.created_at) || a.id_historial_pedido - b.id_historial_pedido).map(h => <li key={h.id_historial_pedido}><strong>{etiquetaEstado(h.estado_nuevo)}</strong><small>{fechaPedido(h.created_at)}</small></li>)}</ol>{!pedido.rel_historial_pedido_id_pedido?.length && <p>No hay cambios de estado registrados.</p>}</section>
    </>}
  </main><FooterPublico /></div>;
}

function AccionesPedido({ pedido, onActualizar, operarPedido }) {
  const [pagos, setPagos] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [motivo, setMotivo] = useState('');
  const bloqueo = useRef(false);
  useEffect(() => { let alive = true; const controller = new AbortController(); operarPedido('pagosPedido', pedido.id_pedido, controller.signal).then(r => { if (alive) setPagos(r.pagos); }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setCargando(false); }); return () => { alive = false; controller.abort(); }; }, [pedido.id_pedido, operarPedido]);
  const accion = async tipo => {
    if (bloqueo.current) return; bloqueo.current = true; setOcupado(true); setError('');
    try { await operarPedido(tipo, pedido.id_pedido, tipo === 'cancelarPedido' ? motivo : 'EFECTIVO'); onActualizar(); }
    catch (e) { setError(e.message); }
    finally { bloqueo.current = false; setOcupado(false); }
  };
  const cobrado = pagos.some(p => ['AUTORIZADO','CONFIRMADO','REEMBOLSADO_PARCIAL','REEMBOLSADO'].includes(p.estado));
  const activo = pagos.find(p => ['PENDIENTE','AUTORIZADO','CONFIRMADO'].includes(p.estado));
  const cancelable = pedido.operacion?.puede_cancelar && !cobrado;
  return <section className="cliente-panel"><h2>Pago y gestión del pedido</h2>
    {cargando ? <p role="status">Consultando pagos…</p> : <>
      {pagos.length ? pagos.map(p => <div key={p.id_pago} className="cliente-note"><strong>Pago #{p.id_pago} · {p.metodo.toLowerCase()}</strong><p>{p.estado === 'PENDIENTE' ? 'Pendiente de cobro: se paga al retirar o recibir.' : p.estado === 'AUTORIZADO' ? 'Confirmación del cobro en proceso. Actualiza el estado.' : p.estado === 'CONFIRMADO' ? 'Cobro confirmado por la farmacia.' : `Estado: ${p.estado.toLowerCase().replaceAll('_',' ')}`}<br />Importe: {dineroPedido(p.monto,p.moneda)}{p.confirmado_at && <><br />Confirmado: {fechaPedido(p.confirmado_at)}</>}</p></div>) : <p>Todavía no hay un pago registrado.</p>}
      {!activo && pedido.estado === 'PENDIENTE_CONFIRMACION' && <p>Está disponible efectivo al retirar o recibir. Registrar este método confirma la solicitud y conserva las existencias durante 48 horas; no registra un cobro.</p>}
      {pedido.operacion?.reserva && ['ACTIVA','CONFIRMADA'].includes(pedido.operacion.reserva.estado) && !cobrado && <p>Plazo para este pedido: <strong>{fechaPedido(pedido.operacion.reserva.vence_at)}</strong>. Si vence sin cobro ni atención, se cancela y libera las existencias.</p>}
      <div className="pedido-acciones">{!activo && pedido.estado === 'PENDIENTE_CONFIRMACION' && <button type="button" className="cliente-button" disabled={ocupado || cargando} onClick={() => accion('iniciarPago')}>Elegir efectivo al {pedido.modalidad === 'RETIRO' ? 'retirar' : 'recibir'}</button>}{cancelable && !confirmar && <button type="button" className="cliente-button danger" disabled={ocupado || cargando} onClick={() => setConfirmar(true)}>Cancelar pedido</button>}<button type="button" className="cliente-button secondary" onClick={() => window.print()}>Imprimir resumen</button></div>
      {confirmar && cancelable && <div className="cliente-note"><strong>¿Cancelar este pedido y liberar sus productos reservados?</strong><p><label>Motivo (opcional)<br /><input value={motivo} maxLength={500} onChange={e => setMotivo(e.target.value)} disabled={ocupado}/></label></p><div className="pedido-acciones"><button type="button" className="cliente-button danger" disabled={ocupado} onClick={() => accion('cancelarPedido')}>{ocupado ? 'Cancelando…' : 'Sí, cancelar pedido'}</button><button type="button" className="cliente-button secondary" disabled={ocupado} onClick={() => setConfirmar(false)}>Conservar pedido</button></div></div>}
    </>}
    {error && <p role="alert" className="cliente-error">{error}</p>}
    <small>El resumen del pedido no es una factura fiscal ni acredita un cobro pendiente.</small>
  </section>;
}
