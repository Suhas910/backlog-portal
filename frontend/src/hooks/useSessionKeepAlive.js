import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SESSION_SCOPES, sessionExpiryMs, refreshSession } from "../lib/session";

// Refresh this long before the token expires, so the new one is in place first.
const REFRESH_LEAD_MS = 3 * 60 * 1000;
// If there's been no user interaction for this long, don't refresh — let the
// session lapse and send the user to a clean re-login (a real idle timeout).
const IDLE_LIMIT_MS = 30 * 60 * 1000;

/**
 * Keeps an *active* session from hard-expiring at the token's 1h mark. While a
 * protected page is mounted this schedules a token refresh just before expiry,
 * but only if the user has interacted recently; otherwise it lapses the session
 * and redirects to `<login>?expired=1` for a graceful re-login.
 *
 * @param {"admin"|"student"} scope
 */
export function useSessionKeepAlive(scope) {
  const navigate = useNavigate();
  const lastActivityRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const cfg = SESSION_SCOPES[scope];
    if (!cfg) return undefined;

    let cancelled = false;
    lastActivityRef.current = Date.now(); // treat mount as fresh activity
    const bump = () => {
      lastActivityRef.current = Date.now();
    };
    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((e) =>
      window.addEventListener(e, bump, { passive: true }),
    );

    const expireToLogin = () => {
      cfg.clear();
      navigate(`${cfg.loginPath}?expired=1`, { replace: true });
    };

    const schedule = () => {
      clearTimeout(timerRef.current);
      const exp = sessionExpiryMs(scope);
      if (!exp) return; // no active session — nothing to manage
      const fireIn = Math.max(exp - Date.now() - REFRESH_LEAD_MS, 0);
      timerRef.current = setTimeout(async () => {
        if (cancelled) return;
        // idle too long → let the session lapse rather than silently extend it
        if (Date.now() - lastActivityRef.current > IDLE_LIMIT_MS) {
          expireToLogin();
          return;
        }
        try {
          const token = await refreshSession(scope);
          if (cancelled) return;
          if (token) schedule();
          else expireToLogin();
        } catch {
          if (!cancelled) expireToLogin();
        }
      }, fireIn);
    };

    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      activityEvents.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [scope, navigate]);
}
