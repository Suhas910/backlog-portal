package com.college.backlog.model;

/**
 * Who performed an action in a {@link RegistrationEvent}: either a STUDENT (on
 * submit) or one of the admin {@link UserRole}s (on verify/reject). It is a
 * superset of UserRole by the single STUDENT value, kept as its own type so the
 * append-only audit log is not coupled to the User role set.
 * Persisted as its name() via {@code @Enumerated(EnumType.STRING)}, with a DB
 * CHECK constraint as the database-level guard.
 */
public enum ActorRole {
    STUDENT,
    ADMIN,
    PRINCIPAL,
    HOD,
    DEPT_OFFICE
}
