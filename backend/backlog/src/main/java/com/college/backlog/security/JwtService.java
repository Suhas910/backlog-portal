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

    // Absolute session ceiling: total lifetime via refresh regardless of activity, after which
    // a full re-login is required. Bounds how long a stolen token can be kept alive. Default 12h.
    @Value("${app.jwt.max-session-ms:43200000}")
    private long maxSessionMs;

    private SecretKey signingKey;

    // Fail fast at startup on a missing/weak secret (HS256 needs a 256-bit key), rather than
    // lazily on the first token operation with an opaque WeakKeyException.
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
     * Issue a token carrying {@code authTimeMillis}, the moment the session began: now on a fresh
     * login, the ORIGINAL value on a refresh, so the cap tracks the whole session rather than the
     * latest refresh. Expiry is capped at {@code authTime + maxSessionMs}, so no token outlives it.
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
     * Slide the session: re-mint from a still-valid token preserving its authTime, refusing once
     * the absolute cap is passed. Returns null past {@code maxSessionMs} (caller → 401, forcing a
     * fresh login). A legacy token with no authTime is treated as starting now — rollout grace.
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

    /** Seconds until expiry. Returned to the SPA on login/refresh to schedule the next refresh —
     *  it can't decode the exp itself from the httpOnly cookie. */
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