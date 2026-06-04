package com.college.backlog.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "login_attempts")
public class LoginAttempt {

    @Id
    @Column(name = "ip_address")
    private String ipAddress;

    private int attempts;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    public LoginAttempt() {}

    public LoginAttempt(String ipAddress) {
        this.ipAddress = ipAddress;
        this.attempts = 0;
    }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }

    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
}
