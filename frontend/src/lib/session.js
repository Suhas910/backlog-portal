// Sliding-session helpers. The JWT is in an httpOnly cookie now, so JS can't read
// its `exp`. Instead login/refresh return `expiresIn` (seconds); we persist the
// derived `expiresAt` and schedule the next refresh from it. See useSessionKeepAlive.
import api, { clearAdminSession, clearStudentSession } from "./api";

// Per-audience wiring. The two flows keep separate cookies/endpoints/login screens.
export const SESSION_SCOPES = {
  admin: {
    expiresKey: "adminExpiresAt",
    clear: clearAdminSession,
    refreshUrl: "/auth/refresh",
    loginPath: "/admin/login",
  },
  student: {
    expiresKey: "studentExpiresAt",
    clear: clearStudentSession,
    refreshUrl: "/student/auth/refresh",
    loginPath: "/student/login",
  },
};

// Persisted absolute expiry (ms since epoch) for a scope, or null if none/invalid.
export function sessionExpiryMs(scope) {
  const cfg = SESSION_SCOPES[scope];
  if (!cfg) return null;
  const raw = sessionStorage.getItem(cfg.expiresKey);
  const value = Number(raw);
  return raw && Number.isFinite(value) ? value : null;
}

// Store expiresAt from an `expiresIn` (seconds) — called on login and refresh.
export function rememberExpiry(scope, expiresInSeconds) {
  const cfg = SESSION_SCOPES[scope];
  const secs = Number(expiresInSeconds);
  if (cfg && Number.isFinite(secs)) {
    sessionStorage.setItem(cfg.expiresKey, String(Date.now() + secs * 1000));
  }
}

// Ask the server for a fresh-expiry cookie (the browser sends the current cookie;
// axios adds the CSRF header). Updates the stored expiry. Returns true on success.
// Throws if the request fails (e.g. the absolute cap was hit) — caller handles it.
export async function refreshSession(scope) {
  const cfg = SESSION_SCOPES[scope];
  if (!cfg) return false;
  const res = await api.post(cfg.refreshUrl);
  const expiresIn = Number(res.data?.expiresIn);
  if (Number.isFinite(expiresIn)) {
    rememberExpiry(scope, expiresIn);
    return true;
  }
  return false;
}
