import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegistrationPage from "./pages/RegistrationPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import { ThemeProvider } from "./context/ThemeContext";
import AddSubjectPage from "./pages/AddSubjectPage";
import ExamCyclePage from "./pages/ExamCyclePage";
import DepartmentsPage from "./pages/DepartmentsPage";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/add-subject" element={<AddSubjectPage />} />
          <Route path="/admin/exam-cycles" element={<ExamCyclePage />} />
          <Route path="/admin/departments" element={<DepartmentsPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
