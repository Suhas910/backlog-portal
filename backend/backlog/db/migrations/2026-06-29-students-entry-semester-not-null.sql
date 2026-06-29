-- ============================================================================
-- Manual migration: enforce students.entry_semester NOT NULL DEFAULT 1.
-- Run ONCE on Neon (psql or the Neon SQL editor). NOT auto-run by the app —
-- it lives outside src/main/resources, so spring.sql.init never touches it.
--
-- WHY MANUAL: the entity maps entry_semester as a primitive `int` with
-- @ColumnDefault("1"). When ddl-auto=update first boots with the new field it
-- runs `ALTER TABLE students ADD COLUMN entry_semester int DEFAULT 1`, and
-- Postgres backfills every existing row to 1 — so all current students keep the
-- normal eligibility floor (entry_semester=1 = no behaviour change). Expressing
-- nullable=false on the entity would instead make ddl-auto auto-ALTER on boot;
-- we close the gap at the DB level here so the schema matches the entity intent.
--
-- entry_semester is the semester a student first studied here (1 = normal intake,
-- >1 = lateral entry); it raises the backlog-eligibility floor. See
-- docs/adr/backlog-progression.md.
--
-- Every statement is idempotent / safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- students.entry_semester must be NOT NULL, defaulting to 1
-- ----------------------------------------------------------------------------
-- DETECT — must return 0. If > 0 (e.g. the column was added some other way),
-- backfill those rows to 1 before running the ALTER (it will fail otherwise):
SELECT count(*) AS null_entry_semester_students
FROM students
WHERE entry_semester IS NULL;

-- Backfill any stragglers to 1 (no-op when DETECT already returns 0):
UPDATE students
SET entry_semester = 1
WHERE entry_semester IS NULL;

-- APPLY (no-op if already set):
ALTER TABLE students
    ALTER COLUMN entry_semester SET DEFAULT 1;

ALTER TABLE students
    ALTER COLUMN entry_semester SET NOT NULL;


-- ============================================================================
-- Verify (optional) — should report is_nullable = NO, column_default = 1:
--   SELECT is_nullable, column_default FROM information_schema.columns
--     WHERE table_schema = 'public' AND table_name = 'students'
--       AND column_name = 'entry_semester';
-- ============================================================================
