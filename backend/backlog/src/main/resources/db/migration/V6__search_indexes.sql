-- ============================================================================
-- V6 — trigram indexes for the admin "contains" searches.
--
-- The registrations list and the student roster both filter with
-- lower(col) LIKE '%query%' (RegistrationSpecification / StudentSpecification).
-- A btree can only serve prefix patterns (verified 2026-07-19: the builtin
-- C.UTF-8 collation lets students_pkey index-serve the cohort '1MS24CS%'
-- lookups, so no pattern-ops index is needed) — but an infix '%q%' always
-- falls back to a sequential scan. pg_trgm GIN indexes make those "contains"
-- searches index-served, keyed on the SAME expression the queries use
-- (lower(...), matching cb.lower in the specifications).
--
-- pg_trgm ships with Postgres (available on Neon, v1.6) and only activates
-- here. DB-level only — invisible to Hibernate ddl-auto=validate, same
-- convention as V2/V5.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS ix_students_name_trgm
    ON public.students USING gin (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_students_roll_no_trgm
    ON public.students USING gin (lower(roll_no) gin_trgm_ops);
