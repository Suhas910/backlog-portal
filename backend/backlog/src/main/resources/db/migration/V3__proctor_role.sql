-- ============================================================================
-- V3 — PROCTOR role + per-student proctor assignments.
--
-- A PROCTOR is a dept-pinned staff account that supervises an explicit set of
-- students (assignment list, not a cohort rule). One proctor per student —
-- roll_no is the PRIMARY KEY of the assignment table, so a second claim is a
-- key violation, surfaced by the app as a 409 naming the current proctor.
--
-- Two changes:
--   1. Widen the role CHECK constraints (users.role, registration_events.
--      actor_role) to admit 'PROCTOR' — both were frozen into the V1 baseline
--      with the original four roles. registration_events needs it because a
--      proctor may VERIFY/REJECT their students' registrations, and the audit
--      row records the actor's role.
--   2. The proctor_students assignment table. FKs cascade on delete from both
--      sides: deleting a proctor account frees their students for reassignment;
--      deleting a student removes the supervision row (a proctor assignment
--      must never block a student delete — it is not "history" the way
--      registrations are).
--
-- proctor_students IS a mapped JPA entity (ProctorAssignment), so its columns
-- must match the mapping (ddl-auto=validate). The CHECKs and FKs are DB-level
-- guards only, invisible to validate — same convention as the rest of the schema.
-- ============================================================================

ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE public.users
    ADD CONSTRAINT chk_users_role CHECK (((role)::text = ANY ((ARRAY[
        'ADMIN'::character varying,
        'PRINCIPAL'::character varying,
        'HOD'::character varying,
        'DEPT_OFFICE'::character varying,
        'PROCTOR'::character varying])::text[])));

ALTER TABLE public.registration_events
    DROP CONSTRAINT IF EXISTS chk_registration_events_actor_role;
ALTER TABLE public.registration_events
    ADD CONSTRAINT chk_registration_events_actor_role CHECK (((actor_role)::text = ANY ((ARRAY[
        'STUDENT'::character varying,
        'ADMIN'::character varying,
        'PRINCIPAL'::character varying,
        'HOD'::character varying,
        'DEPT_OFFICE'::character varying,
        'PROCTOR'::character varying])::text[])));

CREATE TABLE public.proctor_students (
    roll_no character varying(255) NOT NULL,
    proctor_username character varying(255) NOT NULL,
    assigned_by character varying(255),
    assigned_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    CONSTRAINT proctor_students_pkey PRIMARY KEY (roll_no),
    CONSTRAINT fk_proctor_students_student FOREIGN KEY (roll_no)
        REFERENCES public.students (roll_no) ON DELETE CASCADE,
    CONSTRAINT fk_proctor_students_proctor FOREIGN KEY (proctor_username)
        REFERENCES public.users (username) ON DELETE CASCADE
);

-- "all students of proctor X" lookup (the PK only covers roll_no access)
CREATE INDEX ix_proctor_students_proctor ON public.proctor_students (proctor_username);
