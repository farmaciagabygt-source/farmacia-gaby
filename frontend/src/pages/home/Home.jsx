import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCarrito } from "../../context/CarritoContext";
import { carritoApi, productosParaVenta } from "../../api/carritoApi";
import { destacadas } from '../../data/enfermedades';
import '../../styles/cliente.css';
import logo from "../../assets/FarmaciasGaby.png";
import HeaderPublico from "../../components/public/HeaderPublico";

import {
    FaPills,
    FaCapsules,
    FaShieldVirus,
    FaPumpSoap,
    FaHeartPulse,
    FaVirusCovid,
    FaStethoscope,
    FaBrain,
    FaEye,
    FaDroplet,
    FaVenusMars,
} from "react-icons/fa6";

import { FaAllergies } from "react-icons/fa";

import {
    MdMedicalServices,
    MdHealing,
    MdMedication,
    MdCategory,
} from "react-icons/md";

import {
    GiStomach,
    GiMedicines,
    GiMushroomGills,
} from "react-icons/gi";

const iconosCategorias = [
    {
        nombre: "Analgésicos y Antipiréticos",
        icono: FaPills,
    },
    {
        nombre: "Vitaminas y Suplementos",
        icono: FaCapsules,
    },
    {
        nombre: "Gastrointestinales",
        icono: GiStomach,
    },
    {
        nombre: "Antivirales",
        icono: FaShieldVirus,
    },
    {
        nombre: "Dermatológicos",
        icono: MdHealing,
    },
    {
        nombre: "Antisépticos y Desinfectantes",
        icono: FaPumpSoap,
    },
    {
        nombre: "Antiparasitarios",
        icono: FaVirusCovid,
    },
    {
        nombre: "Insumos Médicos",
        icono: MdMedicalServices,
    },
    {
        nombre: "Cardiovasculares y Metabólicos",
        icono: FaHeartPulse,
    },
    {
        nombre: "Antibióticos",
        icono: FaCapsules,
    },
    {
        nombre: "Respiratorios y Antigripales",
        icono: FaStethoscope,
    },

    // NUEVAS CATEGORÍAS
    {
        nombre: "Antiinflamatorios (AINEs)",
        icono: GiMedicines,
    },
    {
        nombre: "Antihistamínicos y Antialérgicos",
        icono: FaAllergies,
    },
    {
        nombre: "Corticoides",
        icono: MdMedication,
    },
    {
        nombre: "Neurológicos y Psiquiátricos",
        icono: FaBrain,
    },
    {
        nombre: "Oftalmológicos y Óticos",
        icono: FaEye,
    },
    {
        nombre: "Salud Sexual y Reproductiva",
        icono: FaVenusMars,
    },
    {
        nombre: "Hidratación y Sueros Orales",
        icono: FaDroplet,
    },
    {
        nombre: "Antimicóticos",
        icono: GiMushroomGills,
    },
    {
        nombre: "Otros / Varios",
        icono: MdCategory,
    },
];

const enfermedadesComunes = destacadas;

const Home = () => {
    const {
        agregar,
        ocupado,
        cargando,
        sucursal,
        existencias,
        esPersonal,
    } = useCarrito();

    const [categoriasReales, setCategoriasReales] = useState([]);

    useEffect(() => {
        let alive = true;

        carritoApi.categorias()
            .then((data) => {
                if (alive) {
                    setCategoriasReales(
                        data.filter((c) => c.activa !== false)
                    );
                }
            })
            .catch(() => { });

        return () => {
            alive = false;
        };
    }, []);

    const categorias = categoriasReales.map((c) => ({
        ...c,
        icono:
            iconosCategorias.find((i) => i.nombre === c.nombre)?.icono ||
            MdCategory,
    }));

    const [catalogoReal, setCatalogoReal] = useState([]);
    const [errorCatalogo, setErrorCatalogo] = useState("");

    const [promociones, setPromociones] = useState([]);
    const [errorPromociones, setErrorPromociones] = useState("");
    const [cargandoPromociones, setCargandoPromociones] = useState(true);

    useEffect(() => {
        let activo = true;

        carritoApi.promociones()
            .then((data) => {
                if (activo) setPromociones(data);
            })
            .catch((error) => {
                if (activo) setErrorPromociones(error.message);
            })
            .finally(() => {
                if (activo) setCargandoPromociones(false);
            });

        return () => {
            activo = false;
        };
    }, []);
    useEffect(() => {
        let alive = true;

        carritoApi.productos()
            .then((data) => {
                if (alive) {
                    setCatalogoReal(data);
                }
            })
            .catch(() => {
                if (alive) {
                    setErrorCatalogo(
                        "No se pudieron cargar los productos destacados. Puedes intentar desde el catálogo."
                    );
                }
            });

        return () => {
            alive = false;
        };
    }, []);
    const productosDestacados = useMemo(() => {
        const destacados = catalogoReal.filter(
            (producto) => producto.destacado === true
        );

        return productosParaVenta(destacados, existencias, sucursal)
            .filter((producto) => producto.precio !== null && producto.stock > 0)
            .slice(0, 4);
    }, [catalogoReal, existencias, sucursal]);
    const navigate = useNavigate();

    const styles = {
        page: {
            minHeight: "100vh",
            backgroundColor: "#ffffff",
            fontFamily: "Arial, sans-serif",
        },

        header: {
            width: "100%",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e8e8e8",
        },

        headerMain: {
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "16px 35px",
            display: "flex",
            alignItems: "center",
            gap: "35px",
        },

        logo: {
            width: "185px",
            height: "65px",
            objectFit: "contain",
            cursor: "pointer",
        },

        searchContainer: {
            flex: 1,
            position: "relative",
        },

        search: {
            width: "100%",
            height: "48px",
            border: "1px solid #d8d8d8",
            borderRadius: "24px",
            padding: "0 55px 0 22px",
            fontSize: "15px",
            outline: "none",
            boxSizing: "border-box",
            backgroundColor: "#f8f9fa",
        },

        searchButton: {
            position: "absolute",
            right: "5px",
            top: "5px",
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: "#00a651",
            color: "#ffffff",
            fontSize: "17px",
            cursor: "pointer",
        },

        actions: {
            display: "flex",
            alignItems: "center",
            gap: "25px",
        },

        action: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            color: "#174a8b",
            fontWeight: "600",
            fontSize: "14px",
            whiteSpace: "nowrap",
        },

        actionIcon: {
            fontSize: "23px",
        },

        cart: {
            position: "relative",
        },

        cartBadge: {
            position: "absolute",
            top: "-10px",
            right: "-10px",
            backgroundColor: "#00a651",
            color: "#ffffff",
            width: "19px",
            height: "19px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: "bold",
        },

        nav: {
            backgroundColor: "#174a8b",
        },

        navContent: {
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 35px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "45px",
            height: "48px",
        },

        navItem: {
            color: "#ffffff",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
        },

        hero: {
            background: "linear-gradient(135deg, #eef8ff 0%, #f0fff6 100%)",
            borderBottom: "1px solid #e8eef3",
        },

        heroContent: {
            maxWidth: "1400px",
            minHeight: "390px",
            margin: "0 auto",
            padding: "45px 60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "50px",
            boxSizing: "border-box",
        },

        heroText: {
            flex: 1,
            maxWidth: "620px",
        },

        heroBadge: {
            display: "inline-block",
            backgroundColor: "#e2f7eb",
            color: "#008f49",
            padding: "8px 15px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "700",
            marginBottom: "18px",
        },

        heroTitle: {
            margin: "0 0 16px 0",
            color: "#123d73",
            fontSize: "46px",
            lineHeight: "1.08",
            fontWeight: "800",
        },

        heroHighlight: {
            color: "#00a651",
        },

        heroDescription: {
            margin: "0 0 28px 0",
            maxWidth: "540px",
            color: "#5f6b7a",
            fontSize: "17px",
            lineHeight: "1.6",
        },

        heroActions: {
            display: "flex",
            alignItems: "center",
            gap: "14px",
        },

        heroPrimaryButton: {
            border: "none",
            borderRadius: "9px",
            padding: "14px 24px",
            backgroundColor: "#174a8b",
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
        },

        heroSecondaryButton: {
            border: "1px solid #00a651",
            borderRadius: "9px",
            padding: "13px 24px",
            backgroundColor: "#ffffff",
            color: "#008f49",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
        },

        heroVisual: {
            width: "390px",
            height: "260px",
            borderRadius: "28px",
            backgroundColor: "#ffffff",
            boxShadow: "0 15px 45px rgba(23, 74, 139, 0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
        },

        heroCross: {
            fontSize: "110px",
            fontWeight: "800",
            color: "#00a651",
            lineHeight: 1,
        },

        heroCircleOne: {
            position: "absolute",
            width: "130px",
            height: "130px",
            borderRadius: "50%",
            backgroundColor: "#e8f3ff",
            top: "-45px",
            right: "-30px",
        },

        heroCircleTwo: {
            position: "absolute",
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            backgroundColor: "#e7f8ef",
            bottom: "-25px",
            left: "-20px",
        },

        temporaryContent: {
            height: "500px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#777777",
        },
    };

    return (
        <div style={styles.page}>
            {/* HEADER */}
            <HeaderPublico />

            {/* BANNER PRINCIPAL */}
            <main>
                <section style={styles.hero}>
                    <div style={styles.heroContent}>

                        <div style={styles.heroText}>
                            <span style={styles.heroBadge}>
                                Farmacia Gaby
                            </span>

                            <h1 style={styles.heroTitle}>
                                Cuidando la
                                <br />
                                <span style={styles.heroHighlight}>
                                    salud del hogar
                                </span>
                            </h1>

                            <p style={styles.heroDescription}>
                                Encuentra productos para el cuidado de tu salud,
                                bienestar y cuidado personal de forma rápida y sencilla.
                            </p>

                            <div style={styles.heroActions}>
                                <button
                                    type="button"
                                    style={styles.heroPrimaryButton}
                                    onClick={() => navigate("/productos")}
                                >
                                    Ver productos
                                </button>

                                <button
                                    type="button"
                                    style={styles.heroSecondaryButton}
                                    onClick={() => navigate("/ofertas")}
                                >
                                    Ver ofertas
                                </button>
                            </div>
                        </div>

                        <div style={styles.heroVisual}>
                            <div style={styles.heroCircleOne}></div>
                            <div style={styles.heroCircleTwo}></div>

                            <span style={styles.heroCross}>+</span>
                        </div>

                    </div>
                </section>

                {/* CATEGORÍAS */}
                <section
                    id="categorias"
                    style={{
                        maxWidth: "1400px",
                        margin: "0 auto",
                        padding: "55px 35px",
                    }}
                >
                    <div
                        style={{
                            textAlign: "center",
                            marginBottom: "35px",
                        }}
                    >
                        <h2
                            style={{
                                margin: "0 0 10px 0",
                                color: "#174a8b",
                                fontSize: "30px",
                                fontWeight: "800",
                            }}
                        >
                            Compra por categoría
                        </h2>

                        <p
                            style={{
                                margin: 0,
                                color: "#6b7280",
                                fontSize: "15px",
                            }}
                        >
                            Encuentra fácilmente los productos que necesitas
                        </p>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                            gap: "18px",
                        }}
                    >
                        {categorias.map((categoria) => (
                            <button
                                type="button"
                                onClick={() => navigate(`/productos?categoria=${encodeURIComponent(categoria.nombre)}`)}
                                key={categoria.nombre}
                                style={{
                                    minHeight: "135px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "14px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "12px",
                                    padding: "20px",
                                    boxSizing: "border-box",
                                    cursor: "pointer",
                                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.04)",
                                    textAlign: "center",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "34px",
                                        color: "#00a651",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <categoria.icono />
                                </div>

                                <span
                                    style={{
                                        color: "#174a8b",
                                        fontSize: "14px",
                                        fontWeight: "700",
                                        lineHeight: "1.3",
                                    }}
                                >
                                    {categoria.nombre}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            </main>

            {/* OFERTAS DESTACADAS */}
            <section
                style={{
                    backgroundColor: "#f7f9fc",
                    borderTop: "1px solid #edf0f4",
                    borderBottom: "1px solid #edf0f4",
                }}
            >
                <div
                    style={{
                        maxWidth: "1400px",
                        margin: "0 auto",
                        padding: "55px 35px",
                    }}
                >
                    {/* ENCABEZADO */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "space-between",
                            gap: "20px",
                            marginBottom: "32px",
                        }}
                    >
                        <div>
                            <span
                                style={{
                                    display: "inline-block",
                                    color: "#00a651",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.8px",
                                    marginBottom: "8px",
                                }}
                            >
                                Ahorra en tus compras
                            </span>

                            <h2
                                style={{
                                    margin: "0 0 8px 0",
                                    color: "#174a8b",
                                    fontSize: "30px",
                                    fontWeight: "800",
                                }}
                            >
                                Ofertas destacadas
                            </h2>

                            <p
                                style={{
                                    margin: 0,
                                    color: "#6b7280",
                                    fontSize: "15px",
                                }}
                            >
                                Descubre promociones y precios especiales disponibles en
                                Farmacia Gaby.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/ofertas")}
                            style={{
                                border: "1px solid #174a8b",
                                backgroundColor: "#ffffff",
                                color: "#174a8b",
                                borderRadius: "8px",
                                padding: "11px 18px",
                                fontSize: "14px",
                                fontWeight: "700",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Ver todas las ofertas
                        </button>
                    </div>

                    {/* OFERTAS VIGENTES */}
                    {cargandoPromociones ? (
                        <p style={{ color: "#6b7280" }}>
                            Cargando ofertas...
                        </p>
                    ) : errorPromociones ? (
                        <p role="alert" style={{ color: "#c62828" }}>
                            {errorPromociones}
                        </p>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                                gap: "22px",
                            }}
                        >
                            {promociones
                                .filter((promocion) => {
                                    const sucursales =
                                        promocion.rel_promocion_sucursal_id_promocion || [];

                                    return (
                                        sucursales.length === 0 ||
                                        sucursales.some(
                                            (s) => Number(s.id_sucursal) === Number(sucursal)
                                        )
                                    );
                                })
                                .slice(0, 4)
                                .map((promocion) => (
                                    <article
                                        key={promocion.id_promocion}
                                        style={{
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "15px",
                                            padding: "25px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "16px",
                                            boxShadow: "0 5px 18px rgba(23, 74, 139, 0.06)",
                                        }}
                                    >
                                        <span
                                            style={{
                                                alignSelf: "flex-start",
                                                backgroundColor: "#eaf8f0",
                                                color: "#008f49",
                                                borderRadius: "20px",
                                                padding: "8px 14px",
                                                fontWeight: "800",
                                                fontSize: "18px",
                                            }}
                                        >
                                            {promocion.tipo === "PORCENTAJE"
                                                ? `${Number(promocion.valor)}% de descuento`
                                                : promocion.tipo === "MONTO"
                                                    ? `Q${Number(promocion.valor).toFixed(2)} de descuento`
                                                    : promocion.tipo === "PRECIO_FIJO"
                                                        ? `Precio especial: Q${Number(promocion.valor).toFixed(2)}`
                                                        : "Oferta en combo"}
                                        </span>

                                        <h3
                                            style={{
                                                margin: 0,
                                                color: "#174a8b",
                                                fontSize: "18px",
                                                lineHeight: "1.4",
                                            }}
                                        >
                                            {promocion.nombre}
                                        </h3>

                                        <div style={{ flex: 1 }}>
                                            {(
                                                promocion.rel_promocion_producto_id_promocion || []
                                            ).map((relacion) => {
                                                const producto = catalogoReal.find(
                                                    (p) =>
                                                        Number(p.id_producto) ===
                                                        Number(relacion.id_producto)
                                                );

                                                return producto ? (
                                                    <p
                                                        key={producto.id_producto}
                                                        style={{
                                                            margin: "0 0 8px",
                                                            color: "#25364a",
                                                            fontSize: "14px",
                                                            lineHeight: "1.5",
                                                        }}
                                                    >
                                                        {producto.nombre}
                                                    </p>
                                                ) : null;
                                            })}
                                        </div>

                                        <p
                                            style={{
                                                margin: 0,
                                                color: "#6b7280",
                                                fontSize: "13px",
                                            }}
                                        >
                                            Vigente hasta{" "}
                                            {new Date(promocion.hasta).toLocaleDateString(
                                                "es-GT",
                                                { timeZone: "America/Guatemala" }
                                            )}
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => navigate("/productos")}
                                            style={{
                                                border: "none",
                                                borderRadius: "8px",
                                                padding: "12px",
                                                backgroundColor: "#174a8b",
                                                color: "#ffffff",
                                                fontWeight: "700",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Ver productos
                                        </button>
                                    </article>
                                ))}

                            {promociones.filter((promocion) => {
                                const sucursales =
                                    promocion.rel_promocion_sucursal_id_promocion || [];

                                return (
                                    sucursales.length === 0 ||
                                    sucursales.some(
                                        (s) => Number(s.id_sucursal) === Number(sucursal)
                                    )
                                );
                            }).length === 0 && (
                                    <p style={{ color: "#6b7280" }}>
                                        No hay ofertas vigentes para esta sucursal.
                                    </p>
                                )}
                        </div>
                    )}
                </div>
            </section>

            {/* PRODUCTOS DESTACADOS */}
            <section
                style={{
                    backgroundColor: "#ffffff",
                }}
            >
                <div
                    style={{
                        maxWidth: "1400px",
                        margin: "0 auto",
                        padding: "60px 35px",
                    }}
                >
                    {/* ENCABEZADO */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-end",
                            gap: "20px",
                            marginBottom: "32px",
                        }}
                    >
                        <div>
                            <span
                                style={{
                                    display: "inline-block",
                                    color: "#00a651",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.8px",
                                    marginBottom: "8px",
                                }}
                            >
                                Conoce nuestro catálogo
                            </span>

                            <h2
                                style={{
                                    margin: "0 0 8px 0",
                                    color: "#174a8b",
                                    fontSize: "30px",
                                    fontWeight: "800",
                                }}
                            >
                                Productos destacados
                            </h2>

                            <p
                                style={{
                                    margin: 0,
                                    color: "#6b7280",
                                    fontSize: "15px",
                                }}
                            >
                                Encuentra productos disponibles para el cuidado de tu salud
                                y bienestar.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/productos")}
                            style={{
                                border: "1px solid #174a8b",
                                backgroundColor: "#ffffff",
                                color: "#174a8b",
                                borderRadius: "8px",
                                padding: "11px 18px",
                                fontSize: "14px",
                                fontWeight: "700",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Ver todos los productos
                        </button>
                    </div>

                    {/* PRODUCTOS */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                            gap: "22px",
                        }}
                    >
                        {errorCatalogo && <p role="alert">{errorCatalogo}</p>}
                        {!errorCatalogo && productosDestacados.length === 0 && <p>No hay productos destacados disponibles en esta sucursal. <a href="/productos">Explorar catálogo</a></p>}
                        {productosDestacados.map((producto) => (
                            <article
                                key={producto.id}
                                style={{
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "15px",
                                    overflow: "hidden",
                                    boxShadow: "0 5px 18px rgba(23, 74, 139, 0.06)",
                                }}
                            >
                                {/* IMAGEN TEMPORAL */}
                                <div
                                    style={{
                                        height: "190px",
                                        backgroundColor: "#f6f8fb",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderBottom: "1px solid #edf0f4",
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
                                            color: "#174a8b",
                                            fontSize: "12px",
                                            fontWeight: "800",
                                            textAlign: "center",
                                            lineHeight: "1.4",
                                            padding: "10px",
                                            boxSizing: "border-box",
                                        }}
                                    >
                                        FARMACIA
                                        <br />
                                        GABY
                                    </div>
                                </div>

                                {/* INFORMACIÓN */}
                                <div
                                    style={{
                                        padding: "22px",
                                    }}
                                >
                                    <span
                                        style={{
                                            display: "block",
                                            color: "#00a651",
                                            fontSize: "12px",
                                            fontWeight: "700",
                                            marginBottom: "8px",
                                        }}
                                    >
                                        {producto.categoria}
                                    </span>

                                    <h3
                                        style={{
                                            margin: "0 0 16px 0",
                                            color: "#25364a",
                                            fontSize: "15px",
                                            lineHeight: "1.45",
                                            minHeight: "65px",
                                            fontWeight: "700",
                                        }}
                                    >
                                        {producto.nombre}
                                    </h3>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "10px",
                                            marginBottom: "18px",
                                        }}
                                    >
                                        <strong
                                            style={{
                                                color: "#174a8b",
                                                fontSize: "22px",
                                            }}
                                        >
                                            Q{producto.precio.toFixed(2)}
                                        </strong>

                                        <span
                                            style={{
                                                color: "#008f49",
                                                backgroundColor: "#eaf8f0",
                                                borderRadius: "20px",
                                                padding: "6px 10px",
                                                fontSize: "11px",
                                                fontWeight: "700",
                                            }}
                                        >
                                            Disponible
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={ocupado || cargando || esPersonal || !sucursal}
                                        onClick={() => agregar(producto.idPresentacion)}
                                        style={{
                                            width: "100%",
                                            border: "none",
                                            borderRadius: "8px",
                                            padding: "12px",
                                            backgroundColor: "#174a8b",
                                            color: "#ffffff",
                                            fontSize: "14px",
                                            fontWeight: "700",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Agregar al carrito
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ENFERMEDADES COMUNES */}
            <section
                id="enfermedades-comunes"
                style={{
                    background: "linear-gradient(135deg, #f4f9ff 0%, #f4fcf7 100%)",
                    borderTop: "1px solid #e8eef3",
                    borderBottom: "1px solid #e8eef3",
                }}
            >
                <div
                    style={{
                        maxWidth: "1400px",
                        margin: "0 auto",
                        padding: "60px 35px",
                    }}
                >
                    {/* ENCABEZADO */}
                    <div
                        style={{
                            maxWidth: "720px",
                            marginBottom: "35px",
                        }}
                    >
                        <span
                            style={{
                                display: "inline-block",
                                color: "#00a651",
                                fontSize: "13px",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "0.8px",
                                marginBottom: "8px",
                            }}
                        >
                            Encuentra lo que necesitas
                        </span>

                        <h2
                            style={{
                                margin: "0 0 10px 0",
                                color: "#174a8b",
                                fontSize: "30px",
                                fontWeight: "800",
                            }}
                        >
                            Enfermedades y necesidades comunes
                        </h2>

                        <p
                            style={{
                                margin: 0,
                                color: "#6b7280",
                                fontSize: "15px",
                                lineHeight: "1.6",
                            }}
                        >
                            Explora productos disponibles según una necesidad común de
                            salud y encuentra fácilmente las opciones relacionadas en
                            nuestro catálogo.
                        </p>
                    </div>

                    {/* OPCIONES */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
                            gap: "20px",
                        }}
                    >
                        {enfermedadesComunes.map(item => <Link key={item.slug} className="salud-card" to={`/enfermedades/${item.slug}`}><h3>{item.titulo}</h3><p>{item.descripcion}</p><span>Información y cuidados →</span></Link>)}
                    </div>

                    <Link to="/enfermedades" className="cliente-button secondary" style={{ marginTop: 24 }}>Ver todas las enfermedades y necesidades</Link>
                    {/* ACLARACIÓN */}
                    <p
                        style={{
                            margin: "25px 0 0",
                            color: "#7b8794",
                            fontSize: "12px",
                            lineHeight: "1.5",
                        }}
                    >
                        Esta sección facilita la búsqueda de productos del catálogo y no
                        sustituye la evaluación, diagnóstico o indicación de un profesional
                        de la salud.
                    </p>
                </div>
            </section>

            {/* BANNER SECUNDARIO */}
            <section
                style={{
                    backgroundColor: "#ffffff",
                    padding: "60px 35px",
                }}
            >
                <div
                    style={{
                        maxWidth: "1330px",
                        minHeight: "250px",
                        margin: "0 auto",
                        borderRadius: "22px",
                        background: "linear-gradient(135deg, #174a8b 0%, #123d73 100%)",
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        boxSizing: "border-box",
                        padding: "45px 55px",
                    }}
                >
                    {/* DECORACIÓN */}
                    <div
                        style={{
                            position: "absolute",
                            width: "260px",
                            height: "260px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(255,255,255,0.06)",
                            right: "-60px",
                            top: "-90px",
                        }}
                    />

                    <div
                        style={{
                            position: "absolute",
                            width: "160px",
                            height: "160px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(0,166,81,0.35)",
                            right: "150px",
                            bottom: "-90px",
                        }}
                    />

                    {/* CONTENIDO */}
                    <div
                        style={{
                            position: "relative",
                            zIndex: 1,
                            maxWidth: "650px",
                        }}
                    >
                        <span
                            style={{
                                display: "inline-block",
                                marginBottom: "12px",
                                color: "#8ee0b4",
                                fontSize: "13px",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                            }}
                        >
                            Farmacia Gaby
                        </span>

                        <h2
                            style={{
                                margin: "0 0 14px",
                                color: "#ffffff",
                                fontSize: "32px",
                                lineHeight: "1.2",
                                fontWeight: "800",
                            }}
                        >
                            Todo lo que necesitas para cuidar de ti y tu familia
                        </h2>

                        <p
                            style={{
                                margin: "0 0 24px",
                                maxWidth: "590px",
                                color: "#dce8f5",
                                fontSize: "15px",
                                lineHeight: "1.6",
                            }}
                        >
                            Explora nuestro catálogo y encuentra medicamentos, vitaminas,
                            productos de cuidado personal e insumos para el bienestar del
                            hogar.
                        </p>

                        <button
                            type="button"
                            onClick={() => navigate("/productos")}
                            style={{
                                border: "none",
                                borderRadius: "8px",
                                padding: "13px 22px",
                                backgroundColor: "#00a651",
                                color: "#ffffff",
                                fontSize: "14px",
                                fontWeight: "700",
                                cursor: "pointer",
                            }}
                        >
                            Explorar productos
                        </button>
                    </div>
                </div>
            </section>

            {/* UBICACIÓN */}
            <section
                style={{
                    backgroundColor: "#f7f9fc",
                    borderTop: "1px solid #edf0f4",
                }}
            >
                <div
                    style={{
                        maxWidth: "1400px",
                        margin: "0 auto",
                        padding: "60px 35px",
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e4e9ef",
                            borderRadius: "18px",
                            padding: "42px 45px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "50px",
                            boxShadow: "0 6px 22px rgba(23, 74, 139, 0.05)",
                        }}
                    >
                        {/* INFORMACIÓN */}
                        <div
                            style={{
                                flex: 1,
                                maxWidth: "720px",
                            }}
                        >
                            <span
                                style={{
                                    display: "inline-block",
                                    color: "#00a651",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.8px",
                                    marginBottom: "10px",
                                }}
                            >
                                Farmacia Gaby
                            </span>

                            <h2
                                style={{
                                    margin: "0 0 13px",
                                    color: "#174a8b",
                                    fontSize: "29px",
                                    fontWeight: "800",
                                }}
                            >
                                Visítanos
                            </h2>

                            <p
                                style={{
                                    margin: "0 0 8px",
                                    color: "#25364a",
                                    fontSize: "16px",
                                    fontWeight: "700",
                                    lineHeight: "1.6",
                                }}
                            >
                                31 avenida 28-47 Local A Zona 5
                            </p>

                            <p
                                style={{
                                    margin: 0,
                                    color: "#6b7280",
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                }}
                            >
                                Colonia Santa Ana, Guatemala, Guatemala
                            </p>
                        </div>

                        {/* ACCIONES */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                flexWrap: "wrap",
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => navigate("/sucursales")}
                                style={{
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "13px 22px",
                                    backgroundColor: "#174a8b",
                                    color: "#ffffff",
                                    fontSize: "14px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                }}
                            >
                                Ver ubicación
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/contacto")}
                                style={{
                                    border: "1px solid #00a651",
                                    borderRadius: "8px",
                                    padding: "12px 22px",
                                    backgroundColor: "#ffffff",
                                    color: "#008f49",
                                    fontSize: "14px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                }}
                            >
                                Contáctanos
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer
                style={{
                    backgroundColor: "#123d73",
                    color: "#ffffff",
                }}
            >
                <div
                    style={{
                        maxWidth: "1400px",
                        margin: "0 auto",
                        padding: "55px 35px 35px",
                    }}
                >
                    {/* CONTENIDO PRINCIPAL */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr",
                            gap: "50px",
                            paddingBottom: "40px",
                        }}
                    >
                        {/* FARMACIA GABY */}
                        <div>
                            <img
                                src={logo}
                                alt="Farmacia Gaby"
                                style={{
                                    width: "175px",
                                    height: "65px",
                                    objectFit: "contain",
                                    backgroundColor: "#ffffff",
                                    borderRadius: "10px",
                                    padding: "6px 12px",
                                    boxSizing: "border-box",
                                    marginBottom: "20px",
                                }}
                            />

                            <p
                                style={{
                                    margin: "0 0 10px",
                                    fontSize: "16px",
                                    fontWeight: "700",
                                }}
                            >
                                Cuidando la salud del hogar
                            </p>

                            <p
                                style={{
                                    margin: 0,
                                    maxWidth: "310px",
                                    color: "#c9d8e8",
                                    fontSize: "13px",
                                    lineHeight: "1.7",
                                }}
                            >
                                Encuentra medicamentos, vitaminas, productos de cuidado
                                personal e insumos para el bienestar de tu familia.
                            </p>
                        </div>

                        {/* NAVEGACIÓN */}
                        <div>
                            <h3
                                style={{
                                    margin: "0 0 18px",
                                    fontSize: "15px",
                                }}
                            >
                                Navegación
                            </h3>

                            {[
                                ["Inicio", "/"],
                                ["Productos", "/productos"],
                                ["Categorías", "/categorias"],
                                ["Enfermedades comunes", "/enfermedades"],
                                ["Ofertas", "/ofertas"],
                                ["Sucursales", "/sucursales"],
                                ["Contáctanos", "/contacto"],
                            ].map(([texto, ruta]) => (
                                <button
                                    key={texto}
                                    type="button"
                                    onClick={() => navigate(ruta)}
                                    style={{
                                        display: "block",
                                        border: "none",
                                        padding: "5px 0",
                                        backgroundColor: "transparent",
                                        color: "#c9d8e8",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        textAlign: "left",
                                    }}
                                >
                                    {texto}
                                </button>
                            ))}
                        </div>

                        {/* ATENCIÓN */}
                        <div>
                            <h3
                                style={{
                                    margin: "0 0 18px",
                                    fontSize: "15px",
                                }}
                            >
                                Atención al cliente
                            </h3>

                            <p
                                style={{
                                    margin: "0 0 10px",
                                    color: "#c9d8e8",
                                    fontSize: "13px",
                                    lineHeight: "1.6",
                                }}
                            >
                                Teléfono:
                                <br />
                                Pendiente de confirmar
                            </p>

                            <p
                                style={{
                                    margin: "0 0 10px",
                                    color: "#c9d8e8",
                                    fontSize: "13px",
                                    lineHeight: "1.6",
                                }}
                            >
                                WhatsApp:
                                <br />
                                Pendiente de confirmar
                            </p>

                            <p
                                style={{
                                    margin: 0,
                                    color: "#c9d8e8",
                                    fontSize: "13px",
                                    lineHeight: "1.6",
                                }}
                            >
                                Correo:
                                <br />
                                Pendiente de confirmar
                            </p>
                        </div>

                        {/* UBICACIÓN Y HORARIO */}
                        <div>
                            <h3
                                style={{
                                    margin: "0 0 18px",
                                    fontSize: "15px",
                                }}
                            >
                                Visítanos
                            </h3>

                            <p
                                style={{
                                    margin: "0 0 16px",
                                    color: "#c9d8e8",
                                    fontSize: "13px",
                                    lineHeight: "1.7",
                                }}
                            >
                                31 avenida 28-47 Local A Zona 5
                                <br />
                                Colonia Santa Ana
                                <br />
                                Guatemala, Guatemala
                            </p>

                            <h3
                                style={{
                                    margin: "20px 0 10px",
                                    fontSize: "14px",
                                }}
                            >
                                Horarios de atención
                            </h3>

                            <p
                                style={{
                                    margin: 0,
                                    color: "#c9d8e8",
                                    fontSize: "13px",
                                    lineHeight: "1.7",
                                }}
                            >
                                Lunes a viernes: Pendiente
                                <br />
                                Sábado: Pendiente
                                <br />
                                Domingo: Pendiente
                            </p>
                        </div>
                    </div>

                    {/* PARTE INFERIOR */}
                    <div
                        style={{
                            borderTop: "1px solid rgba(255,255,255,0.15)",
                            paddingTop: "25px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "20px",
                            flexWrap: "wrap",
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                color: "#aebfd1",
                                fontSize: "12px",
                            }}
                        >
                            © 2026 Farmacia Gaby. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </footer>

        </div>
    );
};

export default Home;