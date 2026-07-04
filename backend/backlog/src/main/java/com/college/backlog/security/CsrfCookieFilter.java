package com.college.backlog.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Forces the deferred CsrfToken to be resolved so {@link org.springframework.security.web.csrf.CookieCsrfTokenRepository}
 * actually writes the {@code XSRF-TOKEN} cookie on the response. Without this,
 * Spring Security 6 loads the token lazily and the SPA never receives a cookie to
 * echo back as the {@code X-XSRF-TOKEN} header. Runs on every request; cheap.
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            csrfToken.getToken(); // render the token -> repository writes the cookie
        }
        filterChain.doFilter(request, response);
    }
}
