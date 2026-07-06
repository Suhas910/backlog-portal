import axios from "axios";

// The JWT now travels in an httpOnly cookie the browser attaches automatically —
// it is never readable by JS (so it can't be stolen via XSS). withCredentials sends
// that cookie; the xsrf* options make axios echo the readable XSRF-TOKEN cookie back
// as the X-XSRF-TOKEN header so Spring's CSRF check passes on mutating requests.
const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// NOTE: these sessionStorage values are NOT the credential. The real token is in the
// httpOnly cookie. "adminToken"/"studentToken" hold only a presence marker ("cookie")
// so the existing "is a session present?" checks and route guards keep working; the
// other keys are UI state (role/name) + the refresh schedule (expiresAt).
export function getAdminToken() {
  return sessionStorage.getItem("adminToken"); // presence marker, not the JWT
}

export function getStudentToken() {
  return sessionStorage.getItem("studentToken"); // presence marker, not the JWT
}

// Auth is cookie-based now, so no Authorization header is needed. Kept as no-ops so
// the many `{ headers: getAdminHeaders() }` call sites don't all need editing.
export function getAdminHeaders() {
  return {};
}

export function getStudentHeaders() {
  return {};
}

export function clearStudentSession() {
  ["studentToken", "studentRollNo", "studentName", "studentExpiresAt"].forEach((k) =>
    sessionStorage.removeItem(k),
  );
}

export function clearAdminSession() {
  ["adminToken", "adminRole", "adminUsername", "adminDepartment", "adminExpiresAt"].forEach((k) =>
    sessionStorage.removeItem(k),
  );
}

// Best-effort server logout (expires the httpOnly cookie) then local cleanup. The
// logout endpoints are CSRF-exempt and succeed even with a lapsed session.
export async function logoutAdmin() {
  try {
    await api.post("/auth/logout");
  } catch {
    /* clear locally regardless */
  }
  clearAdminSession();
}

export async function logoutStudent() {
  try {
    await api.post("/student/auth/logout");
  } catch {
    /* clear locally regardless */
  }
  clearStudentSession();
}

// Student-scoped auth failures: if a student's session is missing/expired, send
// them back to login. Scoped by URL so admin flows (which handle their own 401s)
// are untouched. The student login endpoint itself is excluded.
function isStudentScopedUrl(url = "") {
  if (url.includes("/student/auth/")) return false;
  // Admin-side endpoints are never student-scoped. This guard is load-bearing: the
  // admin student-management URLs are "/admin/students/**", which contain the
  // substring "/student" — without excluding "/admin/" first, a 401/403 on e.g.
  // the bulk import (/admin/students/import) would be misread as a student auth
  // failure and bounce the admin to the STUDENT login page.
  if (url.includes("/admin/")) return false;
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

// Centralized auth-failure handling: an expired/missing session sends the matching
// audience back to its login screen, scoped by URL so the two flows don't collide.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    // Server-side forced password change: the account is still authenticated but
    // restricted until it sets a new password. Route to the change screen rather
    // than logging out — clearing the session would strand them.
    if (status === 403 && error.response?.data?.code === "PASSWORD_CHANGE_REQUIRED") {
      if (!window.location.pathname.startsWith("/admin/change-password")) {
        window.location.assign("/admin/change-password?forced=1");
      }
      return Promise.reject(error);
    }
    if (status === 401 || status === 403) {
      // a 401 on an authenticated call means the session lapsed/was invalid — flag it
      // so the login screen can explain the redirect. 403 is a real authz denial.
      const expiredSuffix = status === 401 ? "?expired=1" : "";
      if (isStudentScopedUrl(url)) {
        clearStudentSession();
        if (!window.location.pathname.startsWith("/student/login")) {
          window.location.assign("/student/login" + expiredSuffix);
        }
      } else if (isAdminScopedUrl(url)) {
        clearAdminSession();
        if (!window.location.pathname.startsWith("/admin/login")) {
          window.location.assign("/admin/login" + expiredSuffix);
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
