const fetchInventario=(url,options={})=>fetch(url,{...options,signal:options.signal||AbortSignal.timeout(10000)});
const INVENTARIO_URL =
    process.env.INVENTARIO_URL || "http://inventario:3003";

export const crearReservaInventario = async ({
    id_pedido,
    id_sucursal,
    clave_idempotencia,
    vence_at,
    detalles,
}) => {
    const response = await fetchInventario(
        `${INVENTARIO_URL}/reservas`,
        {
            method: "POST",
            signal: AbortSignal.timeout(20000),
            headers: {
                "Content-Type": "application/json",
                "x-service-key": process.env.SERVICE_API_KEY || "",
            },
            body: JSON.stringify({
                id_pedido,
                id_sucursal,
                clave_idempotencia,
                vence_at,
                detalles,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.message ||
            "Error al reservar inventario"
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
};
export const obtenerReservaPorPedido = async (id_pedido) => {
    const response = await fetchInventario(
        `${INVENTARIO_URL}/reservas/pedido/${id_pedido}`
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.message ||
            "Error al obtener la reserva de inventario"
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
};
export const confirmarReservaInventario = async (
    id_reserva,
    id_actor = null,
    vence_at = null
) => {
    const response = await fetchInventario(
        `${INVENTARIO_URL}/reservas/${id_reserva}/confirmar`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "x-service-key": process.env.SERVICE_API_KEY || "",
            },
            body: JSON.stringify({
                id_actor,
                ...(vence_at ? { vence_at } : {}),
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.message ||
            "Error al confirmar la reserva de inventario"
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
};

export const liberarReservaInventario = async (
    id_reserva,
    id_actor = null,
    motivo = null
) => {
    const response = await fetchInventario(
        `${INVENTARIO_URL}/reservas/${id_reserva}/liberar`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "x-service-key": process.env.SERVICE_API_KEY || "",
            },
            body: JSON.stringify({
                id_actor,
                motivo,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.message ||
            "Error al liberar la reserva de inventario"
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
};
export const consumirReservaInventario = async (
    id_reserva,
    id_actor = null
) => {
    const response = await fetchInventario(
        `${INVENTARIO_URL}/reservas/${id_reserva}/consumir`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "x-service-key": process.env.SERVICE_API_KEY || "",
            },
            body: JSON.stringify({
                id_actor,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.message ||
            "Error al consumir la reserva de inventario"
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
};

export const obtenerDisponibilidadPresentacion = async (
    id_presentacion,
    id_sucursal
) => {
    const response = await fetchInventario(
        `${INVENTARIO_URL}/existencias?id_presentacion=${id_presentacion}&id_sucursal=${id_sucursal}`
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.message ||
            "Error al consultar la disponibilidad de inventario"
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return Number(data.cantidad_disponible);
};
export async function obtenerSucursalInventario(id){const r=await fetchInventario(`${INVENTARIO_URL}/sucursales`);if(!r.ok)throw Object.assign(new Error('No se pudo consultar la sucursal.'),{status:503});return (await r.json()).find(s=>s.id_sucursal===id)||null;}
