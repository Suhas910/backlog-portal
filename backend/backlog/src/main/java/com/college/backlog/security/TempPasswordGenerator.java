package com.college.backlog.security;

import java.security.SecureRandom;

/**
 * Generates short, human-typable one-time passwords for account creation and
 * admin resets. The plaintext is shown to the manager exactly once and never
 * persisted — only its bcrypt hash is stored.
 */
public final class TempPasswordGenerator {

    // Avoids visually ambiguous characters (0/O, 1/l/I) so a temp password read
    // off the screen and typed by hand isn't mis-entered.
    private static final char[] ALPHABET =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789".toCharArray();
    private static final int LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();

    private TempPasswordGenerator() {}

    public static String generate() {
        StringBuilder sb = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            sb.append(ALPHABET[RANDOM.nextInt(ALPHABET.length)]);
        }
        return sb.toString();
    }
}
