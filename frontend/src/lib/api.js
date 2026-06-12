import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

export function getAdminToken() {
  return sessionStorage.getItem("adminToken");
}

export function getAdminHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getStudentToken() {
  return sessionStorage.getItem("studentToken");
}

export function getStudentHeaders() {
  const token = getStudentToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearStudentSession() {
  sessionStorage.removeItem("studentToken");
  sessionStorage.removeItem("studentRollNo");
  sessionStorage.removeItem("studentName");
}

export function clearAdminSession() {
  sessionStorage.removeItem("adminToken");
  sessionStorage.removeItem("adminRole");
  sessionStorage.removeItem("adminUsername");
  sessionStorage.removeItem("adminDepartment");
}

// Student-scoped auth failures: if a student's token is missing/expired, send
// them back to login. Scoped by URL so admin flows (which handle their own 401s)
// are untouched. The student login endpoint itself is excluded.
function isStudentScopedUrl(url = "") {
  if (url.includes("/student/auth/")) return false;
  if (url.includes("/student")) return true;
  // POST /api/register (student submission), but not /register/verify (admin)
  if (url.includes("/register") && !url.includes("/register/verify")) return true;
  return false;
}

function isAdminScopedUrl(url = "") {
  if (url.includes("/auth/login")) return false; // the admin login call itself
  if (url.includes("/admin/")) return true; // /api/admin/**
  if (url.includes("/register/verify")) return true;
  return false;
}

// Centralized auth-failure handling: an expired/missing token sends the matching
// audience back to its login screen, scoped by URL so the two flows don't collide.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    if (status === 401 || status === 403) {
      if (isStudentScopedUrl(url)) {
        clearStudentSession();
        if (!window.location.pathname.startsWith("/student/login")) {
          window.location.assign("/student/login");
        }
      } else if (isAdminScopedUrl(url)) {
        clearAdminSession();
        if (!window.location.pathname.startsWith("/admin/login")) {
          window.location.assign("/admin/login");
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
