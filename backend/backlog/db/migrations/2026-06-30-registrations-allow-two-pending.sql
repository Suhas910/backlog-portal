-- ============================================================================
-- Allow up to TWO pending (SUBMITTED) registrations per student per exam cycle.
--
-- The app previously enforced "only one pending per (student, exam cycle)" both
-- in RegistrationService AND via a manually-applied PARTIAL UNIQUE INDEX on Neon
-- (it backs the DataIntegrityViolation -> 409 path in register()). A unique index
-- can enforce "at most one" but cannot express "at most two", so to raise the
-- limit the index must be DROPPED — the cap (now 2) becomes app-enforced in
-- RegistrationService.MAX_PENDING_PER_CYCLE.
--
-- This script is idempotent: it finds and drops any UNIQUE index on `registrations`
-- whose definition references SUBMITTED, and is a no-op if none exists.
-- Apply manually on Neon (this repo's db/migrations are NOT auto-run).
--
-- Confirmed live index name (2026-06-30): uq_pending_reg_per_cycle
--   CREATE UNIQUE INDEX uq_pending_reg_per_cycle ON public.registrations
--     USING btree (roll_no, exam_cycle_id) WHERE status = 'SUBMITTED';
-- Equivalent targeted drop: DROP INDEX IF EXISTS uq_pending_reg_per_cycle;
-- ============================================================================

-- DETECT — list any single-pending unique index(es) before dropping:
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = current_schema()
  AND tablename = 'registrations'
  AND indexdef ILIKE '%UNIQUE%'
  AND indexdef ILIKE '%SUBMITTED%';

-- APPLY — drop them (guarded loop; safe to re-run):
DO $$
DECLARE idx record;
BEGIN
    FOR idx IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = 'registrations'
          AND indexdef ILIKE '%UNIQUE%'
          AND indexdef ILIKE '%SUBMITTED%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', idx.indexname);
        RAISE NOTICE 'Dropped single-pending unique index: %', idx.indexname;
    END LOOP;
END $$;

-- VERIFY — the DETECT query above should now return zero rows.
