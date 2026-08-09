package com.college.backlog.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * One brute-force throttle counter keyed {@code scope:username:ip}, on the {@code login_throttle}
 * table (see {@link com.college.backlog.security.LoginThrottleService}). Supersedes the older
 * {@code login_attempts} table, which keyed by IP alone so admin and student failures
 * cross-counted; that one can be dropped manually on Neon.
 */
@Entity
@Table(name = "login_throttle")
public class LoginAttempt {

    @Id
    @Column(name = "throttle_key")
    private String throttleKey;

    private int attempts;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    public LoginAttempt() {}

    public LoginAttempt(String throttleKey) {
        this.throttleKey = throttleKey;
        this.attempts = 0;
    }

    public String getThrottleKey() { return throttleKey; }
    public void setThrottleKey(String throttleKey) { this.throttleKey = throttleKey; }

    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }

    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
}
