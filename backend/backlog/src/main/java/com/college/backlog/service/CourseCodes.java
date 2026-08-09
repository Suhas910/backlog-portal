package com.college.backlog.service;

/**
 * The course-code to academic-year rule, in one place: a code's first two digits are the
 * academic-year start (22CSL44 -> 2022 -> AY 2022-23), a hard institutional invariant. Derives and
 * locks the prefix on create, clone, and edit so {@code prefix == academicYearOffered} can't drift.
 * See docs/adr/backlog-progression.md.
 */
public final class CourseCodes {

    private CourseCodes() {}

    /** Two-digit prefix for an academic-year start, e.g. 2022 -> "22". */
    public static String prefixForYear(int year) {
        return String.format("%02d", Math.floorMod(year, 100));
    }

    /** Swap the leading two-digit prefix for the target year's (22CSL44 -> 23CSL44). */
    public static String bumpPrefix(String code, int targetYear) {
        if (code == null) return null;
        String trimmed = code.trim();
        if (hasNumericPrefix(trimmed)) {
            return prefixForYear(targetYear) + trimmed.substring(2);
        }
        return trimmed;
    }

    /** True when the code's first two digits equal the academic-year start's last two. */
    public static boolean matchesYear(String code, int year) {
        if (code == null) return false;
        String trimmed = code.trim();
        return hasNumericPrefix(trimmed) && trimmed.startsWith(prefixForYear(year));
    }

    private static boolean hasNumericPrefix(String code) {
        return code.length() >= 2
            && Character.isDigit(code.charAt(0))
            && Character.isDigit(code.charAt(1));
    }
}
