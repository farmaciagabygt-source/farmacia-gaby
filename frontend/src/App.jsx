import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CarritoProvider } from "./context/CarritoContext";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <CarritoProvider>
          <AppRoutes />
        </CarritoProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;