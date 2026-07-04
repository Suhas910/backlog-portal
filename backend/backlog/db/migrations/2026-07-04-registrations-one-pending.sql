-- ============================================================================
-- Restore the "at most ONE pending (SUBMITTED) registration per student per
-- exam cycle" rule, enforced by a PARTIAL UNIQUE INDEX.
--
-- Background: 2026-06-30-registrations-allow-two-pending.sql DROPPED this index
-- to raise the app limit to two (a unique index can enforce "at most one" but
-- not "at most two"). We are back to one, so RegistrationService.MAX_PENDING_PER_CYCLE
-- is 1 again AND the index returns as the race backstop behind the app-level
-- count check (it powers the DataIntegrityViolation -> 409 path in register()).
--
-- Scope: per (roll_no, exam_cycle_id) — matches the app rule. VERIFIED/REJECTED
-- rows are excluded by the WHERE clause, so a student may re-register in the same
-- cycle once an earlier submission has been actioned.
--
-- Apply manually on Neon (this repo's db/migrations are NOT auto-run).
--
-- PRECONDITION: no (roll_no, exam_cycle_id) may currently have more than one
-- SUBMITTED row, or CREATE UNIQUE INDEX will fail. Confirmed clear at authoring
-- time (no live two-pending data). The DETECT query below surfaces any offenders
-- before you APPLY; resolve them (verify/reject the extras) first if it returns rows.
-- ============================================================================

-- DETECT — any (student, cycle) currently holding more than one SUBMITTED row?
-- Expected: zero rows. If not, action the duplicates before creating the index.
SELECT roll_no, exam_cycle_id, COUNT(*) AS pending_count
FROM registrations
WHERE status = 'SUBMITTED'
GROUP BY roll_no, exam_cycle_id
HAVING COUNT(*) > 1;

-- APPLY — idempotent; no-op if the index already exists.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_reg_per_cycle
  ON registrations (roll_no, exam_cycle_id)
  WHERE status = 'SUBMITTED';

-- VERIFY — the index should now be listed:
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename = 'registrations' AND indexname = 'uq_pending_reg_per_cycle';
