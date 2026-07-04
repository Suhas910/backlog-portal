package com.college.backlog.security;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    // 48-char secret, comfortably over the 32-byte HS256 floor.
    private static final String SECRET = "test-secret-that-is-definitely-long-enough-1234567890";

    private static final long TWELVE_HOURS = 12L * 60 * 60 * 1000;

    private JwtService newService(String secret, long expirationMs) {
        return newService(secret, expirationMs, TWELVE_HOURS);
    }

    private JwtService newService(String secret, long expirationMs, long maxSessionMs) {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "jwtSecret", secret);
        ReflectionTestUtils.setField(service, "jwtExpirationMs", expirationMs);
        ReflectionTestUtils.setField(service, "maxSessionMs", maxSessionMs);
        ReflectionTestUtils.invokeMethod(service, "init");
        return service;
    }

    @Test
    void roundTripsSubjectAndRole() {
        JwtService service = newService(SECRET, 3_600_000L);
        String token = service.generateToken("1MS22CS001", "STUDENT");

        assertThat(service.validateToken(token)).isTrue();
        assertThat(service.getUsernameFromToken(token)).isEqualTo("1MS22CS001");
        assertThat(service.getRoleFromToken(token)).isEqualTo("STUDENT");
    }

    @Test
    void expiredTokenFailsValidationInsteadOfThrowing() {
        // negative lifetime => the token is already expired the moment it is minted
        JwtService service = newService(SECRET, -1_000L);
        String token = service.generateToken("admin", "ADMIN");

        assertThat(service.validateToken(token)).isFalse();
    }

    @Test
    void tamperedTokenFailsValidation() {
        JwtService service = newService(SECRET, 3_600_000L);
        String token = service.generateToken("admin", "ADMIN");
        // flip the last character of the signature
        char last = token.charAt(token.length() - 1);
        String tampered = token.substring(0, token.length() - 1) + (last == 'a' ? 'b' : 'a');

        assertThat(service.validateToken(tampered)).isFalse();
    }

    @Test
    void tokenSignedWithADifferentSecretIsRejected() {
        JwtService issuer = newService(SECRET, 3_600_000L);
        JwtService other = newService("a-completely-different-secret-key-abcdefghijklmnop", 3_600_000L);
        String token = issuer.generateToken("admin", "ADMIN");

        assertThat(other.validateToken(token)).isFalse();
    }

    @Test
    void garbageTokenFailsValidation() {
        JwtService service = newService(SECRET, 3_600_000L);
        assertThat(service.validateToken("not-a-jwt")).isFalse();
    }

    @Test
    void tokenCarriesTheSessionStartAuthTime() {
        JwtService service = newService(SECRET, 3_600_000L);
        long before = System.currentTimeMillis();
        String token = service.generateToken("admin", "ADMIN");
        long after = System.currentTimeMillis();

        Long authTime = service.getAuthTimeFromToken(token);
        assertThat(authTime).isNotNull();
        assertThat(authTime).isBetween(before, after);
    }

    @Test
    void refreshPreservesTheOriginalAuthTimeWhileReissuing() {
        // a token whose session began 2h ago, still valid (1h expiry from now)
        JwtService service = newService(SECRET, 3_600_000L, TWELVE_HOURS);
        long startedAt = System.currentTimeMillis() - (2L * 60 * 60 * 1000);
        String old = service.generateToken("admin", "ADMIN", startedAt);

        String refreshed = service.refreshToken(old, "admin", "ADMIN");

        assertThat(refreshed).isNotNull();
        assertThat(service.validateToken(refreshed)).isTrue();
        // authTime carried through unchanged -> the absolute cap tracks the whole session
        assertThat(service.getAuthTimeFromToken(refreshed)).isEqualTo(startedAt);
    }

    @Test
    void refreshIsRefusedOnceTheAbsoluteCapIsExceeded() {
        // issuer mints a still-valid token whose session began 2h ago
        JwtService issuer = newService(SECRET, 3_600_000L, TWELVE_HOURS);
        long startedAt = System.currentTimeMillis() - (2L * 60 * 60 * 1000);
        String old = issuer.generateToken("admin", "ADMIN", startedAt);

        // a service with a 1h cap sees that session as too old to slide -> null (=> 401)
        JwtService cappedAt1h = newService(SECRET, 3_600_000L, 60L * 60 * 1000);
        assertThat(cappedAt1h.refreshToken(old, "admin", "ADMIN")).isNull();
    }

    @Test
    void tokenExpiryNeverOutlivesTheAbsoluteCap() {
        // 1h token lifetime, but a 1-minute absolute cap and a session that began 30s ago
        JwtService service = newService(SECRET, 3_600_000L, 60_000L);
        long startedAt = System.currentTimeMillis() - 30_000L;
        String token = service.generateToken("admin", "ADMIN", startedAt);

        Date expiry = ReflectionTestUtils.invokeMethod(service, "getExpirationDateFromToken", token);
        // capped at authTime + 1min (~30s away), far below the 1h token lifetime
        assertThat(expiry.getTime()).isLessThanOrEqualTo(startedAt + 60_000L + 1_000L);
    }

    @Test
    void initFailsFastOnMissingOrWeakSecret() {
        assertThatThrownBy(() -> newService(null, 3_600_000L))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> newService("   ", 3_600_000L))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> newService("too-short", 3_600_000L))   // < 32 bytes
                .isInstanceOf(IllegalStateException.class);
    }
}
