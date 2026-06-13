package com.college.backlog.model;

/**
 * Lifecycle state of a {@link Registration}.
 * Persisted as its name() via {@code @Enumerated(EnumType.STRING)} — the column
 * stays a varchar, and a matching DB CHECK constraint
 * (db/migrations/2026-06-13-add-enum-check-constraints.sql) guards the values
 * at the database level too.
 */
public enum RegistrationStatus {
    SUBMITTED,
    VERIFIED,
    REJECTED
}
