const PAGOS_URL =
    process.env.PAGOS_URL || "http://pagos:3005";

export const crearPago = async (datosPago) => {
    const response = await fetch(
        `${PAGOS_URL}/pagos`,
        {
            method: "POST",
            signal: AbortSignal.timeout(10000),
            headers: {
                "Content-Type": "application/json",
                "x-service-key": process.env.SERVICE_API_KEY || "",
            },
            body: JSON.stringify(datosPago),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.message ||
            "Error al crear el pago"
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
};

export const obtenerPagosPorPedido = async (id_pedido) => {
    const response = await fetch(
        `${PAGOS_URL}/pagos/pedido/${id_pedido}`,
        { signal: AbortSignal.timeout(10000), headers: { "x-service-key": process.env.SERVICE_API_KEY || "" } }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.message ||
            "Error al obtener los pagos del pedido"
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
};
export async function cancelarPagosPendientes(id) {
 const r=await fetch(`${PAGOS_URL}/pagos/pedido/${id}/cancelar-pendientes`,{method:'PATCH',headers:{'x-service-key':process.env.SERVICE_API_KEY||''},signal:AbortSignal.timeout(10000)});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.message),{status:r.status,data});return data;
}
