-- Drop brute-force login throttling (owner, 2026-08-17). Login is now credentials-only: correct
-- username+password (admin) or USN+DOB (student) gets in, with no failure counter, no 15-min lock,
-- and no 429. LoginThrottleService / LoginAttempt / LoginAttemptRepository are deleted in the same
-- change — the entity MUST go with the table or Hibernate `validate` fails the next boot.
--
-- login_throttle is created by V1__baseline.sql (fine: migrations replay in order, so a fresh DB
-- creates it and then drops it here — never edit V1 to "tidy" this, its checksum is validated).
--
-- login_attempts is the pre-baseline ancestor, keyed by IP alone so admin and student failures
-- cross-counted. It was never in the V1 baseline, so it does NOT exist on the local test DB and may
-- already be gone from Neon — IF EXISTS covers both, and this finally retires it.
DROP TABLE IF EXISTS public.login_throttle;
DROP TABLE IF EXISTS public.login_attempts;
