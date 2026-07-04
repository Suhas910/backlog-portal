package com.college.backlog.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    // Absolute session ceiling: the total time a session may live via refresh,
    // regardless of activity. After this a full re-login is required. Bounds how
    // long a stolen/refreshed token can be kept alive. Default 12h (a work day).
    @Value("${app.jwt.max-session-ms:43200000}")
    private long maxSessionMs;

    private SecretKey signingKey;

    // Fail fast at startup if the secret is missing or too weak for HS256 (which
    // requires a 256-bit / 32-byte key), instead of failing lazily on the first
    // token operation with an opaque WeakKeyException.
    @PostConstruct
    void init() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret is not configured.");
        }
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "app.jwt.secret must be at least 32 bytes (256 bits) for HS256. "
                + "Generate a strong secret, e.g. `openssl rand -base64 48`.");
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    private SecretKey getSigningKey() {
        return signingKey;
    }

    /** Fresh login: stamps the session start (authTime) at the current instant. */
    public String generateToken(String username, String role) {
        return generateToken(username, role, System.currentTimeMillis());
    }

    /**
     * Issue a token carrying {@code authTimeMillis} — the moment the session first
     * began. On a fresh login this is now; on a refresh the ORIGINAL value is passed
     * through unchanged, so the absolute cap tracks the whole session, not the latest
     * refresh. The expiry is capped at {@code authTime + maxSessionMs} so no token can
     * ever outlive the absolute ceiling.
     */
    public String generateToken(String username, String role, long authTimeMillis) {
        long now = System.currentTimeMillis();
        long expiry = Math.min(now + jwtExpirationMs, authTimeMillis + maxSessionMs);
        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .claim("authTime", authTimeMillis)
                .issuedAt(new Date(now))
                .expiration(new Date(expiry))
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    /** Session-start (authTime) claim in millis, or null on a legacy token without it. */
    public Long getAuthTimeFromToken(String token) {
        return extractClaim(token, claims -> {
            Object v = claims.get("authTime");
            return v instanceof Number ? ((Number) v).longValue() : null;
        });
    }

    /**
     * Slide the session: re-mint from a still-valid token, preserving its original
     * authTime, but refuse once the absolute cap is exceeded. Returns the new token,
     * or null if the session has lived longer than {@code maxSessionMs} (caller → 401,
     * forcing a fresh login). A legacy token with no authTime is treated as starting
     * now (a one-time grace during rollout).
     */
    public String refreshToken(String oldToken, String username, String role) {
        Long claimed = getAuthTimeFromToken(oldToken);
        long authTime = claimed != null ? claimed : System.currentTimeMillis();
        if (System.currentTimeMillis() - authTime > maxSessionMs) {
            return null;
        }
        return generateToken(username, role, authTime);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String getUsernameFromToken(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String getRoleFromToken(String token) {
        return extractClaim(token, claims -> (String) claims.get("role"));
    }

    private Date getExpirationDateFromToken(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Seconds until this token expires. Returned to the SPA on login/refresh so the
     * keepalive can schedule the next refresh — it can no longer read the (httpOnly-
     * cookie) token to decode the exp itself.
     */
    public long secondsUntilExpiry(String token) {
        return Math.max(0, (getExpirationDateFromToken(token).getTime() - System.currentTimeMillis()) / 1000);
    }

    private boolean isTokenExpired(String token) {
        return getExpirationDateFromToken(token).before(new Date());
    }

    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }
}