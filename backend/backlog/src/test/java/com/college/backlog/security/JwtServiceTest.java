package com.college.backlog.security;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    // 48-char secret, comfortably over the 32-byte HS256 floor.
    private static final String SECRET = "test-secret-that-is-definitely-long-enough-1234567890";

    private JwtService newService(String secret, long expirationMs) {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "jwtSecret", secret);
        ReflectionTestUtils.setField(service, "jwtExpirationMs", expirationMs);
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
    void initFailsFastOnMissingOrWeakSecret() {
        assertThatThrownBy(() -> newService(null, 3_600_000L))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> newService("   ", 3_600_000L))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> newService("too-short", 3_600_000L))   // < 32 bytes
                .isInstanceOf(IllegalStateException.class);
    }
}
