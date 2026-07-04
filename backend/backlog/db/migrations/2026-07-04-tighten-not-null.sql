-- ============================================================================
-- Tighten NOT NULL on columns the code always sets but that predate strictness.
-- These were applied directly on Neon on 2026-07-04; this file is the tracked
-- source-of-truth record so a fresh DB (or a future Flyway baseline) reproduces
-- the same state.
--
-- The entities deliberately do NOT declare `nullable=false` for these (adding it
-- would make ddl-auto=update auto-ALTER a populated table). The DB is the
-- enforcement point — `ddl-auto=update`/`validate` both tolerate the DB being
-- stricter than the entity, so there is no conflict.
--
-- Every statement is idempotent: `SET NOT NULL` on an already-NOT-NULL column is
-- a no-op. Run the DETECT block first; every count MUST be 0 before APPLY (a
-- single NULL row makes the corresponding ALTER fail).
--
-- Apply manually on Neon (this repo's db/migrations are NOT auto-run).
-- (`students.entry_semester` NOT NULL lives in its own migration,
--  2026-06-29-students-entry-semester-not-null.sql — also applied 2026-07-04.)
-- ============================================================================

-- DETECT — every count must be 0:
SELECT 'departments.dept_name'      AS col, count(*) AS nulls FROM departments WHERE dept_name IS NULL
UNION ALL SELECT 'departments.dept_code',        count(*) FROM departments WHERE dept_code IS NULL
UNION ALL SELECT 'students.current_semester',    count(*) FROM students    WHERE current_semester IS NULL
UNION ALL SELECT 'students.year_of_joining',     count(*) FROM students    WHERE year_of_joining IS NULL
UNION ALL SELECT 'subjects.credits',             count(*) FROM subjects    WHERE credits IS NULL
UNION ALL SELECT 'exam_cycles.academic_year',    count(*) FROM exam_cycles WHERE academic_year IS NULL;

-- APPLY (only if every count above is 0):
ALTER TABLE departments ALTER COLUMN dept_name        SET NOT NULL;
ALTER TABLE departments ALTER COLUMN dept_code        SET NOT NULL;  -- also UNIQUE; NOT NULL blocks multiple-NULL rows
ALTER TABLE students    ALTER COLUMN current_semester SET NOT NULL;
ALTER TABLE students    ALTER COLUMN year_of_joining  SET NOT NULL;
ALTER TABLE subjects    ALTER COLUMN credits          SET NOT NULL;  -- @ColumnDefault("0")
ALTER TABLE exam_cycles ALTER COLUMN academic_year    SET NOT NULL;  -- @ColumnDefault("0"); 0 = "not set yet" sentinel, never NULL

-- VERIFY — should return 0 rows (nothing still nullable):
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE table_schema='public' AND is_nullable='YES'
--     AND (table_name, column_name) IN (
--       ('departments','dept_name'), ('departments','dept_code'),
--       ('students','current_semester'), ('students','year_of_joining'),
--       ('subjects','credits'), ('exam_cycles','academic_year'));
-- ============================================================================
