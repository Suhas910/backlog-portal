-- ============================================================================
-- Manual migration: DB-level CHECK constraints for the columns that back the
-- new Java enums (issue #4 — stringly-typed domain values).
-- Run ONCE on Neon (psql or the Neon SQL editor). NOT auto-run by the app —
-- it lives outside src/main/resources, so spring.sql.init never touches it.
--
-- WHY MANUAL: the entities now map these columns with @Enumerated(EnumType.STRING),
-- so Hibernate persists the enum name() into the same varchar columns. Hibernate
-- only emits the matching CHECK when CREATING a fresh table; under ddl-auto=update
-- it never adds a constraint to an existing column, so on the live (already
-- populated) Neon DB we add the checks here by hand. The values match the enum
-- constants exactly (RegistrationStatus, SubjectType, UserRole, EventAction,
-- ActorRole). A CHECK with `col IN (...)` still allows NULL (constraint is about
-- the *set of valid values*, not nullability — none of these columns is nullable
-- in practice today).
--
-- Every block runs a DETECT query first (must return 0). The 2026-06-13 live data
-- was already clean — every distinct value mapped onto a constant — so all blocks
-- applied without any cleanup. Each ADD is guarded, so the file is safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. registrations.status IN ('SUBMITTED','VERIFIED','REJECTED')
-- ----------------------------------------------------------------------------
-- DETECT — must return 0 (any out-of-set, non-null value blocks the ADD):
SELECT count(*) AS bad_status
FROM registrations
WHERE status IS NOT NULL
  AND status NOT IN ('SUBMITTED', 'VERIFIED', 'REJECTED');

-- APPLY:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_registrations_status') THEN
        ALTER TABLE registrations
            ADD CONSTRAINT chk_registrations_status
            CHECK (status IN ('SUBMITTED', 'VERIFIED', 'REJECTED'));
    END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 2. subjects.subject_type IN ('REGULAR','ELECTIVE')
-- ----------------------------------------------------------------------------
-- DETECT — must return 0:
SELECT count(*) AS bad_subject_type
FROM subjects
WHERE subject_type IS NOT NULL
  AND subject_type NOT IN ('REGULAR', 'ELECTIVE');

-- APPLY:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subjects_subject_type') THEN
        ALTER TABLE subjects
            ADD CONSTRAINT chk_subjects_subject_type
            CHECK (subject_type IN ('REGULAR', 'ELECTIVE'));
    END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 3. users.role IN ('ADMIN','PRINCIPAL','HOD','DEPT_OFFICE')
--    (these are also the Spring Security authority strings — STUDENT is a
--     separate auth scope with no User row, so it is intentionally excluded.)
-- ----------------------------------------------------------------------------
-- DETECT — must return 0:
SELECT count(*) AS bad_role
FROM users
WHERE role IS NOT NULL
  AND role NOT IN ('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE');

-- APPLY:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role') THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_role
            CHECK (role IN ('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE'));
    END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 4. registration_events.action IN ('SUBMITTED','VERIFIED','REJECTED')
-- ----------------------------------------------------------------------------
-- DETECT — must return 0:
SELECT count(*) AS bad_action
FROM registration_events
WHERE action IS NOT NULL
  AND action NOT IN ('SUBMITTED', 'VERIFIED', 'REJECTED');

-- APPLY:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_registration_events_action') THEN
        ALTER TABLE registration_events
            ADD CONSTRAINT chk_registration_events_action
            CHECK (action IN ('SUBMITTED', 'VERIFIED', 'REJECTED'));
    END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 5. registration_events.actor_role IN ('STUDENT','ADMIN','PRINCIPAL','HOD','DEPT_OFFICE')
--    (superset of users.role by the single STUDENT value — students submit.)
-- ----------------------------------------------------------------------------
-- DETECT — must return 0:
SELECT count(*) AS bad_actor_role
FROM registration_events
WHERE actor_role IS NOT NULL
  AND actor_role NOT IN ('STUDENT', 'ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE');

-- APPLY:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_registration_events_actor_role') THEN
        ALTER TABLE registration_events
            ADD CONSTRAINT chk_registration_events_actor_role
            CHECK (actor_role IN ('STUDENT', 'ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE'));
    END IF;
END $$;


-- ============================================================================
-- Verify (optional) — list the new constraints after running:
--   SELECT conname FROM pg_constraint
--     WHERE conname IN ('chk_registrations_status', 'chk_subjects_subject_type',
--                       'chk_users_role', 'chk_registration_events_action',
--                       'chk_registration_events_actor_role');
-- ============================================================================
