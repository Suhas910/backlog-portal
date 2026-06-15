-- ============================================================================
-- Manual migration: enforce subjects.academic_year_offered NOT NULL (issue #7).
-- Run ONCE on Neon (psql or the Neon SQL editor). NOT auto-run by the app —
-- it lives outside src/main/resources, so spring.sql.init never touches it.
--
-- WHY MANUAL: the entity maps academic_year_offered as a primitive `int` with
-- @ColumnDefault("0"), but the live column is still NULLABLE (it was added to an
-- already-populated table). Expressing nullable=false on the entity would have
-- ddl-auto=update auto-ALTER on the next boot and FAIL if any row is NULL. This
-- closes the gap at the DB level so the schema matches the entity's intent.
--
-- Every statement is idempotent / safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- subjects.academic_year_offered must be NOT NULL
--    (every offering is bound to the academic year it was taught — see
--     docs/adr/backlog-progression.md; the app's read/submit paths already
--     rely on a concrete year, this guarantees it at the DB level too)
-- ----------------------------------------------------------------------------
-- DETECT — must return 0. If > 0, backfill those rows with their correct
-- academic year (or 0, matching the entity default) before running the ALTER
-- (it will fail otherwise):
SELECT count(*) AS null_academic_year_subjects
FROM subjects
WHERE academic_year_offered IS NULL;

-- APPLY (no-op if already NOT NULL):
ALTER TABLE subjects
    ALTER COLUMN academic_year_offered SET NOT NULL;


-- ============================================================================
-- Verify (optional) — should report is_nullable = NO after running:
--   SELECT is_nullable FROM information_schema.columns
--     WHERE table_schema = 'public' AND table_name = 'subjects'
--       AND column_name = 'academic_year_offered';
-- ============================================================================
