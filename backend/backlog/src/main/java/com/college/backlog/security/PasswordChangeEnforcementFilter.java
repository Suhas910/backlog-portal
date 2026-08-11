package com.college.backlog.security;

import com.college.backlog.model.User;
import com.college.backlog.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Two server-side checks on the admin principal's row, sharing the one lookup this filter already
 * costs. Only admin-type principals are checked — students are not rows in {@code users} at all.
 *
 * 1. <b>The account still exists.</b> {@link JwtAuthenticationFilter} is fully stateless (username
 *    AND role come from the token), so a deleted account keeps working until its token lapses.
 *    Verified: a deleted HOD's live cookie read and wrote another department's subjects, and a
 *    deleted ADMIN opened and closed registration college-wide. Answering 401 here revokes the
 *    session on the next request, for every admin endpoint at once — including the ones that never
 *    resolve a scope (exam cycles, department CRUD), which a per-controller check cannot reach.
 * 2. <b>The forced password change.</b> While an account has {@code mustChangePassword}, every API
 *    call but change-password is rejected 403 {@code PASSWORD_CHANGE_REQUIRED}, so a valid token
 *    can't navigate past the change screen and keep using the temp password.
 *
 * Two exemptions, for opposite reasons. Change-password is exempt from (2) only — a deleted account
 * has no password to set. Logout is exempt from BOTH: it merely expires the session cookie, and
 * blocking it left exactly the accounts that must be signed out (deleted, or stuck behind a forced
 * change) unable to do so, with the cookie alive until it timed out on its own.
 */
@Component
public class PasswordChangeEnforcementFilter extends OncePerRequestFilter {

    private static final String CHANGE_PASSWORD_PATH = "/api/auth/change-password";
    private static final String LOGOUT_PATH = "/api/auth/logout";
    private static final Set<String> ADMIN_AUTHORITIES =
            Set.of("ROLE_ADMIN", "ROLE_PRINCIPAL", "ROLE_HOD", "ROLE_DEPT_OFFICE", "ROLE_PROCTOR");

    private final UserRepository userRepository;

    public PasswordChangeEnforcementFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (isAdminRequest(auth, request) && !LOGOUT_PATH.equals(request.getRequestURI())) {
            User user = userRepository.findById(auth.getName()).orElse(null);
            if (user == null) {
                // The token is valid but its account is gone. 401, not 403: there is nothing to
                // grant, and the SPA's 401 interceptor signs them out — the correct outcome.
                write(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "{\"message\":\"Unknown account. Please sign in again.\"}");
                return;
            }
            if (user.isMustChangePassword() && !CHANGE_PASSWORD_PATH.equals(request.getRequestURI())) {
                write(response, HttpServletResponse.SC_FORBIDDEN,
                        "{\"message\":\"You must set a new password before continuing.\","
                        + "\"code\":\"PASSWORD_CHANGE_REQUIRED\"}");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private void write(HttpServletResponse response, int status, String json) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write(json);
    }

    /** An authenticated admin-type principal, on a request that may carry account state. */
    private boolean isAdminRequest(Authentication auth, HttpServletRequest request) {
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return false; // never block CORS preflight
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> ADMIN_AUTHORITIES.contains(a.getAuthority()));
    }
}
