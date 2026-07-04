package com.college.backlog.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private SessionCookieService sessionCookieService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // The JWT now travels in an httpOnly cookie (not the Authorization header),
        // so it can't be read/stolen by page scripts. Pick the cookie that matches
        // the request's audience (student endpoints vs admin) so an admin+student
        // dual session in one browser resolves to the right identity.
        final String jwt = sessionCookieService.read(
                request, sessionCookieService.cookieNameForPath(request.getRequestURI()));
        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // Parsing verifies the signature and can throw on an expired/tampered/malformed
        // token (ExpiredJwtException et al). This runs in a servlet filter, so such an
        // exception would escape the DispatcherServlet and surface as a 500 rather than
        // being handled as "unauthenticated" — stranding any client whose token simply
        // expired. Treat any parse failure as anonymous and continue the chain; the
        // downstream authorization rules then produce a clean 401/403.
        String username;
        try {
            username = jwtService.getUsernameFromToken(jwt);
        } catch (Exception e) {
            filterChain.doFilter(request, response);
            return;
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (jwtService.validateToken(jwt)) {
                String role = jwtService.getRoleFromToken(jwt);
                List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(username, null, authorities);
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        filterChain.doFilter(request, response);
    }
}