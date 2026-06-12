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
 * Enforces the forced-password-change at the server, not just via the login
 * redirect. While an authenticated admin account has {@code mustChangePassword}
 * set, every API call is rejected with 403 {@code PASSWORD_CHANGE_REQUIRED}
 * except the change-password endpoint itself — so a user holding a valid token
 * cannot navigate past the change screen and keep using the temp password.
 *
 * Only admin-type principals are checked (students are unaffected), and a DB
 * lookup happens only for those, keeping the per-request cost off other traffic.
 */
@Component
public class PasswordChangeEnforcementFilter extends OncePerRequestFilter {

    private static final String CHANGE_PASSWORD_PATH = "/api/auth/change-password";
    private static final Set<String> ADMIN_AUTHORITIES =
            Set.of("ROLE_ADMIN", "ROLE_PRINCIPAL", "ROLE_HOD", "ROLE_DEPT_OFFICE");

    private final UserRepository userRepository;

    public PasswordChangeEnforcementFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (shouldEnforce(auth, request)) {
            User user = userRepository.findById(auth.getName()).orElse(null);
            if (user != null && user.isMustChangePassword()) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write(
                        "{\"message\":\"You must set a new password before continuing.\","
                        + "\"code\":\"PASSWORD_CHANGE_REQUIRED\"}");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private boolean shouldEnforce(Authentication auth, HttpServletRequest request) {
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return false; // never block CORS preflight
        }
        if (CHANGE_PASSWORD_PATH.equals(request.getRequestURI())) {
            return false; // the one endpoint a flagged user is allowed to hit
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> ADMIN_AUTHORITIES.contains(a.getAuthority()));
    }
}
