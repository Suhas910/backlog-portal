package com.college.backlog.security;

import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
import com.college.backlog.repository.UserRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PasswordChangeEnforcementFilterTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PasswordChangeEnforcementFilter filter =
            new PasswordChangeEnforcementFilter(userRepository);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String username, String role) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                username, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private User flaggedAdmin(String username) {
        User u = new User(username, "hash", UserRole.ADMIN);
        u.setMustChangePassword(true);
        return u;
    }

    private MockHttpServletRequest request(String method, String uri) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setMethod(method);
        req.setRequestURI(uri);
        return req;
    }

    @Test
    void flaggedAdminIsBlockedOnEveryOtherEndpoint() throws Exception {
        authenticateAs("admin", "ADMIN");
        when(userRepository.findById("admin")).thenReturn(Optional.of(flaggedAdmin("admin")));
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request("GET", "/api/admin/registrations"), response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("PASSWORD_CHANGE_REQUIRED");
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void flaggedAdminMayStillReachTheChangePasswordEndpoint() throws Exception {
        authenticateAs("admin", "ADMIN");
        when(userRepository.findById("admin")).thenReturn(Optional.of(flaggedAdmin("admin")));
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest req = request("POST", "/api/auth/change-password");
        filter.doFilter(req, response, chain);

        verify(chain, times(1)).doFilter(req, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void corsPreflightIsNeverBlocked() throws Exception {
        authenticateAs("admin", "ADMIN");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest req = request("OPTIONS", "/api/admin/registrations");
        filter.doFilter(req, response, chain);

        verify(chain, times(1)).doFilter(req, response);
        // short-circuits before any DB lookup
        verifyNoInteractions(userRepository);
    }

    @Test
    void studentsAreNotSubjectToTheAdminPasswordGate() throws Exception {
        authenticateAs("1MS22CS001", "STUDENT");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest req = request("GET", "/api/student/me");
        filter.doFilter(req, response, chain);

        verify(chain, times(1)).doFilter(req, response);
        verifyNoInteractions(userRepository);
    }

    @Test
    void adminWithoutTheFlagPassesThrough() throws Exception {
        authenticateAs("admin", "ADMIN");
        User notFlagged = new User("admin", "hash", UserRole.ADMIN); // mustChangePassword defaults false
        when(userRepository.findById("admin")).thenReturn(Optional.of(notFlagged));
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest req = request("GET", "/api/admin/registrations");
        filter.doFilter(req, response, chain);

        verify(chain, times(1)).doFilter(req, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void unauthenticatedRequestsAreNotGatedHere() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest req = request("GET", "/api/admin/registrations");
        filter.doFilter(req, response, chain);

        verify(chain, times(1)).doFilter(req, response);
        verifyNoInteractions(userRepository);
    }
}
