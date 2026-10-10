import DevolucionesAdmin from '../pages/pedidos/DevolucionesAdmin';
import PedidosAdmin from '../pages/pedidos/PedidosAdmin';
import PedidoAdmin from '../pages/pedidos/PedidoAdmin';
import PagosAdmin from '../pages/pagos/PagosAdmin';
import FarmaciaAdmin from '../pages/sucursales/FarmaciaAdmin';
import { Routes, Route, Navigate } from "react-router-dom";

import MisPedidos from '../pages/pedidos/MisPedidos';
import DetallePedido from '../pages/pedidos/DetallePedido';
import Checkout from "../pages/carrito/Checkout";
import Carrito from "../pages/carrito/Carrito";
import Home from "../pages/home/Home";
import Productos from "../pages/productos/Productos";
import Categorias from "../pages/categorias/Categorias";
import EnfermedadesComunes from "../pages/enfermedades/EnfermedadesComunes";
import DetalleEnfermedad from "../pages/enfermedades/DetalleEnfermedad";
import Ofertas from "../pages/ofertas/Ofertas";
import Sucursales from "../pages/sucursales/Sucursales";
import Contacto from "../pages/contacto/Contacto";

import ForgotPassword from "../pages/auth/ForgotPassword";

import DashboardAdmin from "../pages/dashboard/DashboardAdmin";

import CatalogoAdmin from "../pages/catalogo/CatalogoAdmin";
import NuevoProducto from "../pages/catalogo/NuevoProducto";
import VisualizarProducto from "../pages/catalogo/VisualizarProducto";
import ModificarProducto from "../pages/catalogo/ModificarProducto";

import InventarioAdmin from "../pages/inventario/InventarioAdmin";

import Usuarios from "../pages/usuarios/Usuarios";
import UsuarioForm from "../pages/usuarios/UsuarioForm";
import UsuarioDetalle from "../pages/usuarios/UsuarioDetalle";

import Bitacora from "../pages/Bitacora/Bitacora";

import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";

const AppRoutes = () => {
  const { usuario } = useAuth();

  return (
    <Routes>
<Route path="/admin/devoluciones" element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR","CAJERO","DESPACHO"]}><DevolucionesAdmin/></ProtectedRoute>}/>
<Route path="/admin/pedidos" element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR","CAJERO","DESPACHO"]}><PedidosAdmin/></ProtectedRoute>}/>
<Route path="/admin/pedidos/:id" element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR","CAJERO","DESPACHO"]}><PedidoAdmin/></ProtectedRoute>}/>
<Route path="/admin/pagos" element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR","CAJERO"]}><PagosAdmin/></ProtectedRoute>}/>
<Route path="/admin/sucursales" element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><FarmaciaAdmin/></ProtectedRoute>}/>
      {/* HOME */}
      <Route
        path="/"
        element={
          usuario?.roles?.some(r=>["ADMINISTRADOR","CAJERO","DESPACHO","INVENTARIO"].includes(r))
            ? <Navigate to={usuario.roles.includes("ADMINISTRADOR")?"/dashboard":usuario.roles.includes("INVENTARIO")?"/admin/inventario":"/admin/pedidos"} replace />
            : <Home />
        }
      />

      {/* PRODUCTOS */}
      <Route path="/productos" element={<Productos />} />
      <Route path="/carrito" element={<Carrito />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/mis-pedidos" element={<MisPedidos />} />
      <Route path="/mis-pedidos/:id" element={<DetallePedido />} />
      <Route path="/pedido/:id" element={<DetallePedido />} />

      {/* CATEGORIAS */}
      <Route path="/categorias" element={<Categorias />} />

      {/* ENFERMEDADES COMUNES */}
      <Route
        path="/enfermedades"
        element={<EnfermedadesComunes />}
      />

      <Route
        path="/enfermedades-comunes"
        element={<EnfermedadesComunes />}
      />

      {/* DETALLE ENFERMEDADES */}
      <Route
        path="/enfermedades/:slug"
        element={<DetalleEnfermedad />}
      />

      {/* OFERTAS */}
      <Route
        path="/ofertas"
        element={<Ofertas />}
      />

      {/* SUCURSALES */}
      <Route
        path="/sucursales"
        element={<Sucursales />}
      />

      {/* CONTACTO */}
      <Route
        path="/contacto"
        element={<Contacto />}
      />

      {/* RECUPERAR CONTRASEÑA */}
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      {/* DASHBOARD */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <DashboardAdmin />
          </ProtectedRoute>
        }
      />

      {/* CATÁLOGO ADMINISTRATIVO */}
      <Route
        path="/admin/catalogo"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <CatalogoAdmin />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/catalogo/nuevo"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <NuevoProducto />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/catalogo/ver/:id"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <VisualizarProducto />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/catalogo/modificar/:id"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <ModificarProducto />
          </ProtectedRoute>
        }
      />

      {/* INVENTARIO ADMINISTRATIVO */}
      <Route
        path="/admin/inventario"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR","INVENTARIO"]}>
            <InventarioAdmin />
          </ProtectedRoute>
        }
      />

      {/* USUARIOS */}
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <Usuarios />
          </ProtectedRoute>
        }
      />

      <Route
        path="/usuarios/crear"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <UsuarioForm />
          </ProtectedRoute>
        }
      />

      <Route
        path="/usuarios/editar/:id"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <UsuarioForm />
          </ProtectedRoute>
        }
      />

      <Route
        path="/usuarios/ver/:id"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <UsuarioDetalle />
          </ProtectedRoute>
        }
      />

      {/* BITÁCORA */}
      <Route
        path="/bitacora"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}>
            <Bitacora />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;