package com.college.backlog.model;

/**
 * The action an audit row in {@link RegistrationEvent} records. Mirrors the
 * registration lifecycle transitions (a subset of {@link RegistrationStatus}
 * names, plus it is its own type so the audit log stays decoupled).
 * Persisted as its name() via {@code @Enumerated(EnumType.STRING)}, with a DB
 * CHECK constraint as the database-level guard.
 */
public enum EventAction {
    SUBMITTED,
    VERIFIED,
    REJECTED
}
