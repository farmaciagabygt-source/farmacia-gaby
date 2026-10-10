import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import HeaderPublico from "../../components/public/HeaderPublico";
import FooterPublico from "../../components/public/FooterPublico";

import { useCarrito } from "../../context/CarritoContext";
import { carritoApi, productosParaVenta } from "../../api/carritoApi";

import {
    FaCartPlus,
    FaCheckCircle,
    FaTags,
    FaPercent,
    FaClock,
} from "react-icons/fa";

const Ofertas = () => {
    const navigate = useNavigate();

    const {
        sucursal,
        existencias,
        cargando: cargandoCarrito,
    } = useCarrito();

    const [catalogoReal, setCatalogoReal] = useState([]);
    const [promociones, setPromociones] = useState([]);
    const [cargandoOfertas, setCargandoOfertas] = useState(true);
    const [errorOfertas, setErrorOfertas] = useState("");

    // ======================================================
    // CARGAR PRODUCTOS Y PROMOCIONES REALES
    // ======================================================

    useEffect(() => {
        let alive = true;

        Promise.all([
            carritoApi.productos(),
            carritoApi.promociones(),
        ])
            .then(([productos, promocionesReales]) => {
                if (alive) {
                    setCatalogoReal(productos);
                    setPromociones(promocionesReales);
                    setErrorOfertas("");
                }
            })
            .catch(() => {
                if (alive) {
                    setErrorOfertas(
                        "No se pudieron cargar las ofertas. Recarga la página para intentar de nuevo."
                    );
                }
            })
            .finally(() => {
                if (alive) {
                    setCargandoOfertas(false);
                }
            });

        return () => {
            alive = false;
        };
    }, []);

    // ======================================================
    // OFERTAS PORCENTUALES DIRECTAS POR SUCURSAL
    // ======================================================

    const ofertasReales = useMemo(() => {
        const ahora = Date.now();

        const promocionesAplicables = promociones
            .filter((promocion) => {
                const sucursales =
                    promocion.rel_promocion_sucursal_id_promocion || [];

                const aplicaSucursal =
                    sucursales.length === 0 ||
                    sucursales.some(
                        (item) =>
                            Number(item.id_sucursal) === Number(sucursal)
                    );

                const porcentaje = Number(promocion.valor);

                return (
                    promocion.tipo === "PORCENTAJE" &&
                    Number.isFinite(porcentaje) &&
                    porcentaje > 0 &&
                    porcentaje <= 100 &&
                    Number(promocion.minimo_compra || 0) === 0 &&
                    promocion.tope_descuento == null &&
                    new Date(promocion.desde).getTime() <= ahora &&
                    new Date(promocion.hasta).getTime() > ahora &&
                    aplicaSucursal
                );
            })
            .sort(
                (a, b) =>
                    Number(b.prioridad) - Number(a.prioridad) ||
                    Number(a.id_promocion) - Number(b.id_promocion)
            );

        const productos = productosParaVenta(
            catalogoReal,
            existencias,
            sucursal
        );

        return productos.flatMap((producto) => {
            if (
                producto.precio === null ||
                !Number.isFinite(producto.precio) ||
                producto.precio <= 0
            ) {
                return [];
            }

            const promocion = promocionesAplicables.find((item) =>
                (
                    item.rel_promocion_producto_id_promocion || []
                ).some(
                    (relacion) =>
                        Number(relacion.id_producto) ===
                        Number(producto.idProducto)
                )
            );

            if (!promocion) {
                return [];
            }

            const descuento = Number(promocion.valor);

            return [
                {
                    ...producto,
                    precioAnterior: producto.precio,
                    precioOferta: Math.round(
                        producto.precio * (1 - descuento / 100) * 100
                    ) / 100,
                    descuento,
                    disponible: producto.stock > 0,
                },
            ];
        });
    }, [catalogoReal, promociones, existencias, sucursal]);

    const cargando = cargandoOfertas || cargandoCarrito;

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#f8fafc",
            }}
        >
            <HeaderPublico />

            <main>
                {/* =========================================
                    HERO / BANNER
                ========================================= */}

                <section
                    style={{
                        background:
                            "linear-gradient(135deg, #174a8b 0%, #123d73 100%)",
                        color: "#ffffff",
                    }}
                >
                    <div
                        style={{
                            maxWidth: "1400px",
                            margin: "0 auto",
                            padding: "55px 35px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "35px",
                            flexWrap: "wrap",
                        }}
                    >
                        <div
                            style={{
                                maxWidth: "720px",
                            }}
                        >
                            <div
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    backgroundColor:
                                        "rgba(255,255,255,0.12)",
                                    padding: "7px 13px",
                                    borderRadius: "20px",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    marginBottom: "17px",
                                }}
                            >
                                <FaTags />

                                Promociones especiales
                            </div>

                            <h1
                                style={{
                                    margin: "0 0 12px",
                                    fontSize: "36px",
                                    fontWeight: "800",
                                }}
                            >
                                Ofertas y promociones
                            </h1>

                            <p
                                style={{
                                    margin: 0,
                                    color: "#d9e5f1",
                                    fontSize: "15px",
                                    lineHeight: "1.7",
                                }}
                            >
                                Aprovecha precios especiales en productos
                                seleccionados para el cuidado de tu salud y
                                bienestar.
                            </p>
                        </div>

                        <div
                            style={{
                                width: "115px",
                                height: "115px",
                                borderRadius: "50%",
                                backgroundColor:
                                    "rgba(255,255,255,0.12)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <FaPercent
                                style={{
                                    fontSize: "50px",
                                    color: "#ffffff",
                                }}
                            />
                        </div>
                    </div>
                </section>

                {/* =========================================
                    AVISO DE PROMOCIONES
                ========================================= */}

                <section
                    style={{
                        maxWidth: "1400px",
                        margin: "0 auto",
                        padding: "35px 35px 0",
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#fffaf0",
                            border: "1px solid #f5dfb3",
                            borderRadius: "12px",
                            padding: "16px 20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "13px",
                        }}
                    >
                        <FaClock
                            style={{
                                color: "#d49b28",
                                fontSize: "22px",
                                flexShrink: 0,
                            }}
                        />

                        <p
                            style={{
                                margin: 0,
                                color: "#80642b",
                                fontSize: "13px",
                                lineHeight: "1.5",
                            }}
                        >
                            Las promociones están sujetas a disponibilidad
                            de inventario y pueden cambiar sin previo aviso.
                        </p>
                    </div>
                </section>

                {/* =========================================
                    PRODUCTOS EN OFERTA
                ========================================= */}

                <section
                    style={{
                        maxWidth: "1400px",
                        margin: "0 auto",
                        padding: "40px 35px 70px",
                    }}
                >
                    <div
                        style={{
                            marginBottom: "28px",
                        }}
                    >
                        <h2
                            style={{
                                margin: "0 0 7px",
                                color: "#174a8b",
                                fontSize: "25px",
                                fontWeight: "800",
                            }}
                        >
                            Productos en oferta
                        </h2>

                        <p
                            style={{
                                margin: 0,
                                color: "#7b8794",
                                fontSize: "13px",
                            }}
                        >
                            Descubre los productos seleccionados con precios
                            especiales.
                        </p>
                    </div>

                    {/* CARGA, ERROR Y SIN OFERTAS */}

                    {cargando ? (
                        <p
                            style={{
                                color: "#7b8794",
                                fontSize: "13px",
                                textAlign: "center",
                                padding: "30px 0",
                            }}
                        >
                            Cargando ofertas…
                        </p>
                    ) : errorOfertas ? (
                        <p
                            role="alert"
                            style={{
                                color: "#e63946",
                                fontSize: "13px",
                                textAlign: "center",
                                padding: "30px 0",
                            }}
                        >
                            {errorOfertas}
                        </p>
                    ) : ofertasReales.length === 0 ? (
                        <p
                            style={{
                                color: "#7b8794",
                                fontSize: "13px",
                                textAlign: "center",
                                padding: "30px 0",
                            }}
                        >
                            Actualmente no hay ofertas disponibles para la
                            sucursal seleccionada.
                        </p>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(240px, 1fr))",
                                gap: "22px",
                            }}
                        >
                            {ofertasReales.map((producto) => (
                                <div
                                    key={producto.id}
                                    style={{
                                        position: "relative",
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "14px",
                                        overflow: "hidden",
                                        boxShadow:
                                            "0 4px 14px rgba(15, 23, 42, 0.04)",
                                    }}
                                >
                                    {/* DESCUENTO */}

                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "13px",
                                            left: "13px",
                                            zIndex: 2,
                                            backgroundColor: "#e63946",
                                            color: "#ffffff",
                                            padding: "6px 10px",
                                            borderRadius: "20px",
                                            fontSize: "11px",
                                            fontWeight: "800",
                                        }}
                                    >
                                        -{producto.descuento}%
                                    </div>

                                    {/* ÁREA VISUAL */}

                                    <div
                                        style={{
                                            height: "165px",
                                            backgroundColor: "#f5f9fc",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "90px",
                                                height: "115px",
                                                backgroundColor: "#ffffff",
                                                border: "2px solid #dce5ee",
                                                borderRadius: "10px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                textAlign: "center",
                                                color: "#174a8b",
                                                fontSize: "12px",
                                                fontWeight: "800",
                                                lineHeight: "1.4",
                                                padding: "10px",
                                            }}
                                        >
                                            <span>
                                                FARMACIA
                                                <br />
                                                GABY
                                            </span>
                                        </div>
                                    </div>

                                    {/* INFORMACIÓN */}

                                    <div
                                        style={{
                                            padding: "18px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                color: "#00a859",
                                                fontSize: "11px",
                                                fontWeight: "800",
                                                textTransform: "uppercase",
                                                marginBottom: "7px",
                                                minHeight: "28px",
                                            }}
                                        >
                                            {producto.categoria}
                                        </div>

                                        <h3
                                            style={{
                                                margin: "0 0 14px",
                                                color: "#174a8b",
                                                fontSize: "15px",
                                                lineHeight: "1.4",
                                                minHeight: "42px",
                                            }}
                                        >
                                            {producto.nombre}
                                        </h3>

                                        {/* PRECIO ANTERIOR */}

                                        <div
                                            style={{
                                                color: "#9ca3af",
                                                fontSize: "12px",
                                                marginBottom: "3px",
                                            }}
                                        >
                                            Antes:{" "}
                                            <span
                                                style={{
                                                    textDecoration:
                                                        "line-through",
                                                }}
                                            >
                                                Q
                                                {producto.precioAnterior.toFixed(
                                                    2
                                                )}
                                            </span>
                                        </div>

                                        {/* PRECIO OFERTA */}

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: "10px",
                                                marginBottom: "17px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: "#e63946",
                                                    fontSize: "22px",
                                                    fontWeight: "800",
                                                }}
                                            >
                                                Q
                                                {producto.precioOferta.toFixed(
                                                    2
                                                )}
                                            </span>

                                            <span
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                    color: producto.disponible
                                                        ? "#00a859"
                                                        : "#9ca3af",
                                                    fontSize: "11px",
                                                    fontWeight: "700",
                                                }}
                                            >
                                                {producto.disponible && (
                                                    <FaCheckCircle />
                                                )}

                                                {producto.disponible
                                                    ? "Disponible"
                                                    : "Sin existencias"}
                                            </span>
                                        </div>

                                        {/* BOTÓN */}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate("/productos")
                                            }
                                            style={{
                                                width: "100%",
                                                height: "42px",
                                                border: "none",
                                                borderRadius: "8px",
                                                backgroundColor: "#174a8b",
                                                color: "#ffffff",
                                                fontSize: "12px",
                                                fontWeight: "700",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "8px",
                                            }}
                                        >
                                            <FaCartPlus />

                                            Ver productos disponibles
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <FooterPublico />
        </div>
    );
};

export default Ofertas;