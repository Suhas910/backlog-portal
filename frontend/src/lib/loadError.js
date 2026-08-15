// The shared failure ritual for a fetch-on-load. Its own module, not lib/api.js: that one is pure
// transport plus the auth interceptor, and this takes a setState callback.
//
// Three behaviours drifted while this was hand-written at ~10 sites — some skipped ERR_CANCELED,
// some skipped 401, some did neither, and the server's message was discarded about half the time.

/**
 * Report a failed load through `setError`, unless the page is already going away.
 *
 * Returns **true when the page is still alive** and the caller should finish its loading
 * transition; **false when it must leave `loading` SET**:
 *   - ERR_CANCELED — the request was superseded by a newer one, which owns the flag now.
 *   - 401 — the session lapsed and api.js is redirecting to the login screen. Clearing loading
 *     here paints the page's empty state ("no departments are configured") or a false error banner
 *     in the seconds before the redirect lands.
 *
 * The 401 case is deliberately NOT handled by suppressing it in the interceptor: doing that needs a
 * never-settling promise, which hangs every chain and skips `finally` blocks that do real cleanup.
 */
export function reportLoadError(err, setError, fallback) {
  if (err?.code === "ERR_CANCELED") return false;
  if (err?.response?.status === 401) return false;
  setError(err?.response?.data?.message || fallback);
  return true;
}
