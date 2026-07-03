package com.college.backlog.service;

/**
 * The USN (roll-number) format and its derivations, in one place. A USN is
 * {@code 1MS<YY><BR><NNN>} — e.g. {@code 1MS22CS001}: a fixed {@code 1MS} prefix,
 * a two-digit admission year, a two-letter branch code, and a three-digit serial.
 *
 * This is the single source of truth for that rule: validation and the year/branch
 * slicing used to live inline (and copy-pasted) across the registration, student,
 * and progression paths. Route every caller through here so the format can never
 * drift between endpoints.
 *
 * See docs/adr/backlog-progression.md.
 */
public final class Usn {

    private Usn() {}

    /** Canonical USN pattern, {@code 1MS<YY><BR><NNN>}. */
    public static final String REGEX = "^1MS\\d{2}[A-Za-z]{2}\\d{3}$";

    /** Whether the roll number is a well-formed USN. */
    public static boolean isValid(String rollNo) {
        return rollNo != null && rollNo.matches(REGEX);
    }

    /** Uppercase two-letter branch code (e.g. {@code CS}), or null if malformed. */
    public static String branchCode(String rollNo) {
        return isValid(rollNo) ? rollNo.substring(5, 7).toUpperCase() : null;
    }

    /** Full admission year from the two-digit {@code YY} (e.g. 2022), or -1 if malformed. */
    public static int admissionYear(String rollNo) {
        return isValid(rollNo) ? 2000 + Integer.parseInt(rollNo.substring(3, 5)) : -1;
    }
}
