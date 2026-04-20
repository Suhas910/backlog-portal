import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage"; // NEW
import RegistrationPage from "./pages/RegistrationPage";
import VerifyPage from "./pages/VerifyPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page (Student / Admin choice) */}
        <Route path="/" element={<HomePage />} />

        {/* Student flow */}
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/verify/:qrToken" element={<VerifyPage />} />

        {/* Admin flow */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
