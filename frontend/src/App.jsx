import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegistrationPage from "./pages/RegistrationPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import { ThemeProvider } from "./context/ThemeContext";
import AddSubjectPage from "./pages/AddSubjectPage";
import ExamCyclePage from "./pages/ExamCyclePage";
import DepartmentsPage from "./pages/DepartmentsPage";
import StudentLoginPage from "./pages/StudentLoginPage";
import StudentDashboardPage from "./pages/StudentDashboardPage";
import ProtectedStudentRoute from "./components/ProtectedStudentRoute";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/student/login" element={<StudentLoginPage />} />
          <Route
            path="/student"
            element={
              <ProtectedStudentRoute>
                <StudentDashboardPage />
              </ProtectedStudentRoute>
            }
          />
          <Route
            path="/register"
            element={
              <ProtectedStudentRoute>
                <RegistrationPage />
              </ProtectedStudentRoute>
            }
          />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/add-subject"
            element={
              <ProtectedAdminRoute>
                <AddSubjectPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/exam-cycles"
            element={
              <ProtectedAdminRoute>
                <ExamCyclePage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedAdminRoute>
                <DepartmentsPage />
              </ProtectedAdminRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
