package com.college.backlog.security;

import com.college.backlog.model.LoginAttempt;
import com.college.backlog.repository.LoginAttemptRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LoginThrottleServiceTest {

    private final LoginAttemptRepository repo = mock(LoginAttemptRepository.class);
    private final LoginThrottleService service = new LoginThrottleService(repo);

    private MockHttpServletRequest request(String ip) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr(ip);
        return req;
    }

    @Test
    void lockEngagesOnTheFifthFailureAndResetsTheCounter() {
        // one short of the limit (MAX_FAILED_ATTEMPTS = 5)
        LoginAttempt existing = new LoginAttempt("ADMIN:admin:1.2.3.4");
        existing.setAttempts(4);
        when(repo.findById("ADMIN:admin:1.2.3.4")).thenReturn(Optional.of(existing));

        service.registerFailure("ADMIN", "admin", request("1.2.3.4"));

        ArgumentCaptor<LoginAttempt> saved = ArgumentCaptor.forClass(LoginAttempt.class);
        verify(repo).save(saved.capture());
        assertThat(saved.getValue().getLockedUntil()).isNotNull();
        assertThat(saved.getValue().getLockedUntil()).isAfter(Instant.now());
        // counter resets once the lock is applied
        assertThat(saved.getValue().getAttempts()).isZero();
    }

    @Test
    void failureBelowThresholdJustIncrementsAndDoesNotLock() {
        LoginAttempt existing = new LoginAttempt("STUDENT:1ms22cs001:9.9.9.9");
        existing.setAttempts(1);
        when(repo.findById("STUDENT:1ms22cs001:9.9.9.9")).thenReturn(Optional.of(existing));

        service.registerFailure("STUDENT", "1MS22CS001", request("9.9.9.9"));

        ArgumentCaptor<LoginAttempt> saved = ArgumentCaptor.forClass(LoginAttempt.class);
        verify(repo).save(saved.capture());
        assertThat(saved.getValue().getAttempts()).isEqualTo(2);
        assertThat(saved.getValue().getLockedUntil()).isNull();
    }

    @Test
    void isLockedTrueWhileTheWindowIsOpen() {
        LoginAttempt attempt = new LoginAttempt("ADMIN:admin:1.2.3.4");
        attempt.setLockedUntil(Instant.now().plusSeconds(120));
        when(repo.findById("ADMIN:admin:1.2.3.4")).thenReturn(Optional.of(attempt));

        assertThat(service.isLocked("ADMIN", "admin", request("1.2.3.4"))).isTrue();
    }

    @Test
    void isLockedFalseAndClearsRowOnceTheWindowHasElapsed() {
        LoginAttempt attempt = new LoginAttempt("ADMIN:admin:1.2.3.4");
        attempt.setLockedUntil(Instant.now().minusSeconds(1));
        when(repo.findById("ADMIN:admin:1.2.3.4")).thenReturn(Optional.of(attempt));

        assertThat(service.isLocked("ADMIN", "admin", request("1.2.3.4"))).isFalse();
        verify(repo).delete(attempt);   // stale lock is cleaned up
    }

    @Test
    void isLockedFalseWhenThereIsNoRowOrNoActiveLock() {
        when(repo.findById(any())).thenReturn(Optional.empty());
        assertThat(service.isLocked("ADMIN", "nobody", request("1.2.3.4"))).isFalse();

        LoginAttempt counting = new LoginAttempt("ADMIN:admin:1.2.3.4");
        counting.setAttempts(3); // failures recorded, but never locked
        when(repo.findById("ADMIN:admin:1.2.3.4")).thenReturn(Optional.of(counting));
        assertThat(service.isLocked("ADMIN", "admin", request("1.2.3.4"))).isFalse();
    }

    @Test
    void keyIsScopedByScopeNormalizedUsernameAndIp() {
        when(repo.findById(any())).thenReturn(Optional.empty());

        // mixed case + surrounding space on the username must normalize
        service.registerFailure("ADMIN", "  Admin  ", request("10.0.0.5"));

        verify(repo).findById("ADMIN:admin:10.0.0.5");
    }

    @Test
    void clearFailuresDeletesByTheSameKey() {
        service.clearFailures("STUDENT", "1MS22CS001", request("7.7.7.7"));
        verify(repo).deleteById("STUDENT:1ms22cs001:7.7.7.7");
        verify(repo, never()).delete(any());
    }

    @Test
    void differentScopesDoNotShareACounter() {
        when(repo.findById(any())).thenReturn(Optional.empty());

        service.isLocked("ADMIN", "shared", request("1.1.1.1"));
        service.isLocked("STUDENT", "shared", request("1.1.1.1"));

        verify(repo).findById(eq("ADMIN:shared:1.1.1.1"));
        verify(repo).findById(eq("STUDENT:shared:1.1.1.1"));
    }
}
