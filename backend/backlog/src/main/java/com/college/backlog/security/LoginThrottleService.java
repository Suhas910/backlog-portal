package com.college.backlog.security;

import com.college.backlog.model.LoginAttempt;
import com.college.backlog.repository.LoginAttemptRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;

/**
 * Brute-force throttling on the {@code login_throttle} table, shared by the admin and student
 * login flows. Counters are keyed {@code scope:username:ip} so admin and student failures never
 * cross-count, failures against different accounts never cross-count, and an attacker IP can only
 * lock out the (account, that-IP) pair rather than the victim's own IP.
 *
 * The client IP comes from {@link HttpServletRequest#getRemoteAddr()} only: there is no reverse
 * proxy in front of the app, so {@code X-Forwarded-For} is client-spoofable and deliberately ignored.
 */
@Service
public class LoginThrottleService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_DURATION_SECONDS = 900;

    private final LoginAttemptRepository loginAttemptRepository;

    public LoginThrottleService(LoginAttemptRepository loginAttemptRepository) {
        this.loginAttemptRepository = loginAttemptRepository;
    }

    public boolean isLocked(String scope, String username, HttpServletRequest request) {
        String key = throttleKey(scope, username, request);
        LoginAttempt attempt = loginAttemptRepository.findById(key).orElse(null);
        if (attempt == null || attempt.getLockedUntil() == null) {
            return false;
        }
        if (Instant.now().isAfter(attempt.getLockedUntil())) {
            loginAttemptRepository.delete(attempt);
            return false;
        }
        return true;
    }

    public void registerFailure(String scope, String username, HttpServletRequest request) {
        String key = throttleKey(scope, username, request);
        LoginAttempt attempt = loginAttemptRepository.findById(key)
                .orElse(new LoginAttempt(key));
        attempt.setAttempts(attempt.getAttempts() + 1);
        if (attempt.getAttempts() >= MAX_FAILED_ATTEMPTS) {
            attempt.setLockedUntil(Instant.now().plusSeconds(LOCK_DURATION_SECONDS));
            attempt.setAttempts(0);
        }
        loginAttemptRepository.save(attempt);
    }

    public void clearFailures(String scope, String username, HttpServletRequest request) {
        loginAttemptRepository.deleteById(throttleKey(scope, username, request));
    }

    private String throttleKey(String scope, String username, HttpServletRequest request) {
        String normalizedUser = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        return scope + ":" + normalizedUser + ":" + resolveClientIp(request);
    }

    private String resolveClientIp(HttpServletRequest request) {
        // getRemoteAddr() only — no reverse proxy, so X-Forwarded-For is untrusted
        return request.getRemoteAddr();
    }
}
