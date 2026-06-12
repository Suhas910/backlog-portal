package com.college.backlog.security;

import com.college.backlog.model.LoginAttempt;
import com.college.backlog.repository.LoginAttemptRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * IP-based brute-force throttling backed by the {@code login_attempts} table.
 * Shared by admin and student login flows.
 */
@Service
public class LoginThrottleService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_DURATION_SECONDS = 900;

    private final LoginAttemptRepository loginAttemptRepository;

    public LoginThrottleService(LoginAttemptRepository loginAttemptRepository) {
        this.loginAttemptRepository = loginAttemptRepository;
    }

    public boolean isLocked(String ip) {
        LoginAttempt attempt = loginAttemptRepository.findById(ip).orElse(null);
        if (attempt == null || attempt.getLockedUntil() == null) {
            return false;
        }
        if (Instant.now().isAfter(attempt.getLockedUntil())) {
            loginAttemptRepository.delete(attempt);
            return false;
        }
        return true;
    }

    public void registerFailure(String ip) {
        LoginAttempt attempt = loginAttemptRepository.findById(ip)
                .orElse(new LoginAttempt(ip));
        attempt.setAttempts(attempt.getAttempts() + 1);
        if (attempt.getAttempts() >= MAX_FAILED_ATTEMPTS) {
            attempt.setLockedUntil(Instant.now().plusSeconds(LOCK_DURATION_SECONDS));
            attempt.setAttempts(0);
        }
        loginAttemptRepository.save(attempt);
    }

    public void clearFailures(String ip) {
        loginAttemptRepository.deleteById(ip);
    }

    public String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // X-Forwarded-For may be a comma-separated list; the first entry is the original client
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
