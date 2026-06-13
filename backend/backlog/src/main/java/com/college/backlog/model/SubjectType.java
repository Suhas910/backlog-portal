package com.college.backlog.model;

import java.util.Locale;

/**
 * Kind of {@link Subject} offering. ELECTIVE subjects carry an eligible-department
 * list; REGULAR subjects belong to a single department.
 * Persisted as its name() via {@code @Enumerated(EnumType.STRING)}, with a DB
 * CHECK constraint as the database-level guard.
 */
public enum SubjectType {
    REGULAR,
    ELECTIVE;

    /**
     * Parses a request/query string into a SubjectType, or returns {@code null}
     * for null/blank/unknown input. Case-insensitive. Used at the HTTP boundary
     * where the value arrives as a plain String (filters, create requests).
     */
    public static SubjectType fromNullable(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return SubjectType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
