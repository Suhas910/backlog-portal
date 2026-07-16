package com.college.backlog.model;

import java.util.Locale;

/**
 * Role of an admin-side {@link User}. These are the same plain strings used as
 * Spring Security authorities (no {@code ROLE_} prefix) — the JWT carries
 * {@code role.name()}, so the security layer is unchanged.
 * Persisted as its name() via {@code @Enumerated(EnumType.STRING)}, with a DB
 * CHECK constraint as the database-level guard.
 *
 * Note: STUDENT is deliberately NOT here — students are a separate table/auth
 * scope and never have a User row. The audit log's broader actor set lives in
 * {@link ActorRole}.
 */
public enum UserRole {
    ADMIN,
    PRINCIPAL,
    HOD,
    DEPT_OFFICE,
    // Dept-pinned like HOD/DEPT_OFFICE, but additionally scoped to an explicit
    // set of assigned students (proctor_students). See ProctorScopeService.
    PROCTOR;

    /**
     * Parses a request string into a UserRole, or returns {@code null} for
     * null/blank/unknown input. Case-insensitive. Used at the HTTP boundary
     * (user-management create) to reject bad roles with a 400.
     */
    public static UserRole fromNullable(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UserRole.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
