-- ============================================================================
-- Manual migration: add the missing DB-level integrity constraints (issue #5).
-- Run ONCE on Neon (psql or the Neon SQL editor). NOT auto-run by the app —
-- it lives outside src/main/resources, so spring.sql.init never touches it.
--
-- WHY MANUAL: two of these (the single-active partial index and the
-- registration_events FK) cannot be expressed via JPA annotations, and the
-- other two would have ddl-auto=update auto-ALTER on the next boot and FAIL if
-- any existing row violates them. Run the DETECT query in each block first;
-- if it returns offending rows, clean them before running that block's DDL.
--
-- Every statement is idempotent / safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. registrations.exam_cycle_id must be NOT NULL
--    (every registration belongs to an exam cycle; the app already enforces an
--     active cycle on submit, this guarantees it at the DB level too)
-- ----------------------------------------------------------------------------
-- DETECT — must return 0. If > 0, assign those rows to a cycle or delete them
-- before running the ALTER (it will fail otherwise):
SELECT count(*) AS null_exam_cycle_registrations
FROM registrations
WHERE exam_cycle_id IS NULL;

-- APPLY (no-op if already NOT NULL):
ALTER TABLE registrations
    ALTER COLUMN exam_cycle_id SET NOT NULL;


-- ----------------------------------------------------------------------------
-- 2. subjects: one offering of a course per academic year
--    NOTE: a *global* unique on course_code would be WRONG — the same course is
--    legitimately offered in multiple academic years (that's what
--    academic_year_offered is for). The correct key is the COMPOSITE below.
--    When first applied (2026-06-13) the live table held ~89 junk rows
--    (re-imported curriculum duplicates + blank-code demo rows + test rows)
--    that had to be removed first — see the dedupe block at the end of this file.
-- ----------------------------------------------------------------------------
-- DETECT — must return 0 rows. If not, run the dedupe block (bottom of file)
-- and resolve any genuine (code, year) collisions before creating the index:
SELECT course_code, academic_year_offered, count(*) AS dupes
FROM subjects
WHERE course_code IS NOT NULL AND btrim(course_code) <> ''
GROUP BY course_code, academic_year_offered
HAVING count(*) > 1;

-- APPLY:
CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_code_year
    ON subjects (course_code, academic_year_offered);


-- ----------------------------------------------------------------------------
-- 3. exam_cycles.name unique
-- ----------------------------------------------------------------------------
-- DETECT — must return 0 rows:
SELECT name, count(*) AS dupes
FROM exam_cycles
GROUP BY name
HAVING count(*) > 1;

-- APPLY:
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_cycles_name
    ON exam_cycles (name);


-- ----------------------------------------------------------------------------
-- 4. At most one active exam cycle (DB guarantee for the app's single-active
--    rule — turns a concurrent double-activation into a clean unique violation
--    instead of two open cycles)
-- ----------------------------------------------------------------------------
-- DETECT — must return 0 or 1. If > 1, deactivate the extras first:
SELECT count(*) AS active_cycles
FROM exam_cycles
WHERE active = true;

-- APPLY (partial unique index — only one row may have active = true):
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_cycles_single_active
    ON exam_cycles (active)
    WHERE active = true;


-- ----------------------------------------------------------------------------
-- 5. registration_events.reg_id -> registrations.reg_id  (foreign key)
--    The audit log must reference a real registration.
-- ----------------------------------------------------------------------------
-- DETECT orphans — must return 0. Orphaned event rows must be removed (or their
-- registration restored) before the FK can be added:
SELECT count(*) AS orphan_events
FROM registration_events e
LEFT JOIN registrations r ON r.reg_id = e.reg_id
WHERE r.reg_id IS NULL;

-- APPLY:
-- 5a. Ensure reg_id carries a UNIQUE CONSTRAINT. Postgres requires the FK target
--     to be a PK or UNIQUE *constraint* (a bare unique index is not enough).
--     Hibernate's @Column(unique=true) usually already created one; this adds it
--     only if absent.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.conrelid = 'registrations'::regclass
          AND c.contype = 'u'
          AND a.attname = 'reg_id'
    ) THEN
        ALTER TABLE registrations
            ADD CONSTRAINT uq_registrations_reg_id UNIQUE (reg_id);
    END IF;
END $$;

-- 5b. Add the FK (guarded — Postgres has no ADD CONSTRAINT IF NOT EXISTS):
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_registration_events_reg_id'
    ) THEN
        ALTER TABLE registration_events
            ADD CONSTRAINT fk_registration_events_reg_id
            FOREIGN KEY (reg_id) REFERENCES registrations (reg_id);
    END IF;
END $$;


-- ============================================================================
-- Verify (optional) — list the new objects after running:
--   SELECT indexname FROM pg_indexes
--     WHERE indexname IN ('uq_subjects_code_year','uq_exam_cycles_name',
--                         'uq_exam_cycles_single_active');
--   SELECT conname FROM pg_constraint
--     WHERE conname IN ('uq_registrations_reg_id','fk_registration_events_reg_id');
-- ============================================================================


-- ============================================================================
-- DEDUPE BLOCK (block 2 prerequisite) — what was actually run on 2026-06-13 to
-- clear the subjects table before uq_subjects_code_year could be created.
-- Removes exact full-identity duplicate rows (re-imported curriculum), keeping
-- the lowest id, plus blank-course_code demo/test rows. A full backup is taken
-- first. SAFE only because every removed row was verified unreferenced by
-- registration_subjects (see DETECT #3/#4 logic). Re-runnable.
-- ============================================================================
-- BEGIN;
-- CREATE TABLE IF NOT EXISTS subjects_backup_20260613 AS SELECT * FROM subjects;
--
-- WITH ranked AS (
--   SELECT id, row_number() OVER (
--     PARTITION BY course_code, academic_year_offered, semester, dept_id, subject_name
--     ORDER BY id) AS rn
--   FROM subjects
--   WHERE course_code IS NOT NULL AND btrim(course_code) <> ''
-- )
-- , dead AS (
--   SELECT id FROM ranked WHERE rn > 1
--   UNION SELECT id FROM subjects WHERE course_code IS NULL OR btrim(course_code) = ''
-- )
-- DELETE FROM subject_eligible_departments WHERE subject_id IN (SELECT id FROM dead);
-- -- (registration_subjects refs were verified 0 before deleting)
-- DELETE FROM subjects WHERE id IN (SELECT id FROM dead);
-- COMMIT;
--
-- Any genuine (course_code, academic_year_offered) collisions that survive the
-- above (rows differing only in semester/dept/name) must be resolved by hand —
-- on 2026-06-13 the only one was a pair of "test subject" rows (ids 290/291),
-- both deleted. Once block-2 DETECT returns 0 rows, create uq_subjects_code_year.
-- ============================================================================
