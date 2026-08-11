-- V7: the four IDENTITY snapshot columns on registrations become NOT NULL.
--
-- Why: a registration is immutable history — it snapshots the student so the past cannot be
-- rewritten. But the snap_* columns were nullable, and six read sites fell back to the LIVE student
-- row when one was null, so an old record (including the signed PDF) could print today's values.
-- The fallback was the bug; NOT NULL makes it unreachable by construction, and those six sites are
-- deleted in the same change.
--
-- Scope is deliberately narrow: only the columns those read paths actually fell back on.
-- snap_email, snap_phone and snap_academic_year stay nullable — making snap_phone NOT NULL would
-- bake in "a registration must have a phone", which is true today only as a side effect of a
-- validation rule and would need another migration to undo.
--
-- Safety: RegistrationService.register() writes all four on every insert, and there is no other
-- code path that creates a registration. Verified before writing this: Neon had 3 registrations
-- and the local test DB 4, with zero nulls in any snap_* column.
--
-- If this migration ever DOES fail with "column contains null values", that is a real data problem
-- and the fix is NOT to backfill from the students table — copying today's values in would
-- manufacture history, which is the exact thing this convention exists to prevent. Investigate the
-- offending rows instead:
--   SELECT reg_id, roll_no, registered_at FROM registrations
--    WHERE snap_name IS NULL OR snap_semester IS NULL
--       OR snap_year_of_joining IS NULL OR snap_branch IS NULL;

ALTER TABLE registrations ALTER COLUMN snap_name           SET NOT NULL;
ALTER TABLE registrations ALTER COLUMN snap_semester       SET NOT NULL;
ALTER TABLE registrations ALTER COLUMN snap_year_of_joining SET NOT NULL;
ALTER TABLE registrations ALTER COLUMN snap_branch         SET NOT NULL;
