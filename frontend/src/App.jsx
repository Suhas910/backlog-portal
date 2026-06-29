import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegistrationPage from "./pages/RegistrationPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import { ThemeProvider } from "./context/ThemeContext";
import ManageSubjectsPage from "./pages/manageSubjects/ManageSubjectsPage";
import ExamCyclePage from "./pages/ExamCyclePage";
import DepartmentsPage from "./pages/DepartmentsPage";
import ManageUsersPage from "./pages/ManageUsersPage";
import ManageProgressionPage from "./pages/ManageProgressionPage";
import StudentsPage from "./pages/students/StudentsPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
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
            path="/admin/manage-subjects"
            element={
              <ProtectedAdminRoute>
                <ManageSubjectsPage />
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
          <Route
            path="/admin/users"
            element={
              <ProtectedAdminRoute>
                <ManageUsersPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/progression"
            element={
              <ProtectedAdminRoute>
                <ManageProgressionPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedAdminRoute>
                <StudentsPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/change-password"
            element={
              <ProtectedAdminRoute>
                <ChangePasswordPage />
              </ProtectedAdminRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
