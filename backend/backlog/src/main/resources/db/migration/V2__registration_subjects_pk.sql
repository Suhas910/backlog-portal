-- ============================================================================
-- V2 — add a composite PRIMARY KEY (+ a subject_id index) to the many-to-many
-- join table registration_subjects.
--
-- Hibernate created this @ManyToMany link table with only two NOT NULL FK columns
-- (reg_id, subject_id) and no PK / unique / index — the framework default, frozen
-- into the V1 baseline. That leaves two gaps:
--   * nothing enforces that a (registration, subject) link is unique;
--   * Postgres does NOT auto-index FK *referencing* columns, so reg_id- and
--     subject_id-keyed lookups (loading a registration's subjects, and the
--     subject-delete guard existsBySubjects_Id) are sequential scans on an
--     append-only table.
--
-- The composite PK fixes uniqueness and indexes reg_id-leading access; the extra
-- index covers subject_id-only access (the PK leads with reg_id).
--
-- This is a DB-level tightening only — registration_subjects is not mapped as a
-- JPA entity (it's the @ManyToMany join), so Hibernate ddl-auto=validate is
-- unaffected (the DB is simply stricter than the mapping, like the other
-- DB-level constraints in this schema).
--
-- Precondition (fail-loud): ADD PRIMARY KEY errors if any duplicate
-- (reg_id, subject_id) pair exists. None can arise through the app — subjects are
-- set once from findAllById(subjectIds) (deduped by PK) and registrations are
-- immutable history — so this is expected to be a no-op check. If it ever does
-- fail, resolve the duplicates before the app can boot (do NOT auto-delete here).
-- Guarded so a re-run after a repair is safe.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'registration_subjects'::regclass
          AND contype = 'p'
    ) THEN
        ALTER TABLE registration_subjects
            ADD CONSTRAINT registration_subjects_pkey PRIMARY KEY (reg_id, subject_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_registration_subjects_subject_id
    ON registration_subjects (subject_id);
