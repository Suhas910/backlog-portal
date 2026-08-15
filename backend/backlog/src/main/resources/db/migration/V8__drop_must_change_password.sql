-- Drops the forced first-login password change. Accounts are now created and reset with a
-- derived default (username + "4321") that the holder may change whenever they like via
-- /api/auth/change-password, so nothing needs to remember that a change is still pending.
-- The column was boolean NOT NULL DEFAULT false and is read by nothing after this migration:
-- the entity field, UserResponse, the login payload and the enforcement branch of the old
-- PasswordChangeEnforcementFilter (now AccountExistenceFilter) all go in the same change.
ALTER TABLE public.users
    DROP COLUMN IF EXISTS must_change_password;
