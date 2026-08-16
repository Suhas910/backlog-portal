package com.college.backlog.service;

/**
 * The studiable-semester range, in one place. A programme runs 1..8 and that single range governs
 * eligibility, current/entry semester, subject offerings, cloning and progression — see
 * docs/adr/backlog-progression.md.
 *
 * Keep it single. {@code StudentManagementService.validateSemesters} bounds
 * {@code Student.currentSemester} by this range and {@code EligibilityService} returns an EMPTY
 * window above 8, so a wider range anywhere silently locks the student out of registering.
 * {@code ProgressionService.backfillLinear} seeds up to {@link #MAX} for the same reason.
 *
 * Sibling of {@link AcademicYears} and {@link CourseCodes}. Enforced in application code only —
 * {@code student_semester_terms.semester} is a plain integer with no CHECK, by decision.
 */
public final class Semesters {

    public static final int MIN = 1;
    public static final int MAX = 8;

    private Semesters() {}

    public static boolean isStudiable(int semester) {
        return semester >= MIN && semester <= MAX;
    }

    /**
     * @throws IllegalArgumentException out of range — matching ProgressionService's existing
     *     contract, so its catch sites are unaffected. HTTP callers wrap it as a 400.
     */
    public static void assertStudiable(int semester) {
        if (!isStudiable(semester)) {
            throw new IllegalArgumentException(
                "Semester must be between " + MIN + " and " + MAX + ".");
        }
    }
}
