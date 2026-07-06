package com.college.backlog.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;

/**
 * A {@link CookieCsrfTokenRepository} that keeps the {@code XSRF-TOKEN} cookie STABLE by
 * ignoring token-clearing writes (a {@code saveToken} with a null/empty token).
 *
 * Why this exists: the app is stateless (the JWT is re-authenticated on every request).
 * Spring Security's {@code SessionManagementFilter} therefore treats every request as a
 * fresh authentication and runs {@code CsrfAuthenticationStrategy}, which rotates the CSRF
 * token by first DELETING the cookie (saveToken(null)) and generating a new one. The new
 * token is deferred and never persisted before the response commits, so the cookie is left
 * deleted — and the next mutating request (with no intervening GET to re-mint it) fails the
 * CSRF check with 403, which the SPA treats as a session failure and logs the user out.
 * This surfaced as: fill two blank semesters on the Manage-students / Progression timeline,
 * save the first (works), save the second (403 → logout).
 *
 * Ignoring the clearing write keeps the double-submit token in place across requests. This
 * is safe: the CSRF token is a non-secret double-submit value validated cookie-vs-header on
 * each request, and rotate-on-login is a session-fixation defense that does not apply to a
 * stateless cookie token. (Our logout clears the JWT session cookie explicitly and does not
 * rely on clearing this one.)
 */
public class StableCsrfTokenRepository implements CsrfTokenRepository {

    private final CookieCsrfTokenRepository delegate;

    public StableCsrfTokenRepository(CookieCsrfTokenRepository delegate) {
        this.delegate = delegate;
    }

    @Override
    public CsrfToken generateToken(HttpServletRequest request) {
        return delegate.generateToken(request);
    }

    @Override
    public void saveToken(CsrfToken token, HttpServletRequest request, HttpServletResponse response) {
        if (token == null || token.getToken() == null || token.getToken().isEmpty()) {
            return; // skip the clearing write so the cookie survives the per-request rotation
        }
        delegate.saveToken(token, request, response);
    }

    @Override
    public CsrfToken loadToken(HttpServletRequest request) {
        return delegate.loadToken(request);
    }
}
