-- ============================================================================
-- V5 — performance indexes for the hot query paths, plus the missing PK on the
-- subject_eligible_departments join table (the same tightening V2 gave
-- registration_subjects).
--
-- Postgres does not auto-index FK *referencing* columns, and the V1 baseline
-- froze Hibernate's defaults (no secondary indexes at all), so every lookup
-- below was a sequential scan on an append-only, ever-growing table.
--
-- All changes are DB-level only — indexes and join-table constraints are
-- invisible to Hibernate ddl-auto=validate (same convention as V2/V3).
-- ============================================================================

-- registrations.id is the JPA @Id (a plain GENERATED IDENTITY column) but the
-- table's PK is reg_id, so `id` has NO index. Hibernate keys every UPDATE on the
-- @Id — i.e. each verify/reject runs `UPDATE ... WHERE id=? AND version=?` as a
-- full-table scan. Unique to match the identity semantics the mapping assumes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_registrations_id
    ON public.registrations (id);

-- Student-scoped reads: the student dashboard (findByStudent_RollNo, newest
-- first), the student-delete guard (existsByStudent_RollNo) and the proctor
-- roll_no IN (...) scope. The existing partial index uq_pending_reg_per_cycle
-- only covers status='SUBMITTED' rows, so none of these could use it.
CREATE INDEX IF NOT EXISTS ix_registrations_roll_no_registered_at
    ON public.registrations (roll_no, registered_at);

-- Admin dashboard default view: filter by exam cycle (the UI pins the active
-- cycle) + status tab, ordered by registered_at DESC — one index serves the
-- page query, its ORDER BY (backward scan) and the summary counts.
CREATE INDEX IF NOT EXISTS ix_registrations_cycle_status_time
    ON public.registrations (exam_cycle_id, status, registered_at);

-- Audit-history modal: findByRegIdOrderByTimestampAsc per registration.
CREATE INDEX IF NOT EXISTS ix_registration_events_reg_id_time
    ON public.registration_events (reg_id, "timestamp");

-- ---- subject_eligible_departments: PK + dept_id index ----------------------
-- Hibernate created this @ManyToMany link table with only two NOT NULL FK
-- columns and no PK / unique / index — the identical gap V2 closed for
-- registration_subjects. The composite PK enforces link uniqueness and indexes
-- subject_id-leading access (the EAGER eligibleDepartments loads); the extra
-- index covers dept_id-only access (the department-delete guard
-- existsByEligibleDepartments_Id).
--
-- Precondition (fail-loud): ADD PRIMARY KEY errors if any duplicate
-- (subject_id, dept_id) pair exists. None can arise through the app — the list
-- is set from findAllById (deduped by PK) and updates replace the collection
-- wholesale — so this is expected to be a no-op check. If it ever fails,
-- resolve the duplicates first (do NOT auto-delete here). Guarded so a re-run
-- after a repair is safe.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'subject_eligible_departments'::regclass
          AND contype = 'p'
    ) THEN
        ALTER TABLE public.subject_eligible_departments
            ADD CONSTRAINT subject_eligible_departments_pkey PRIMARY KEY (subject_id, dept_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_subject_eligible_departments_dept_id
    ON public.subject_eligible_departments (dept_id);

-- Department-delete guard existsByBranchIgnoreCase compares lower(branch); a
-- plain btree on branch can't serve that, a functional index can.
CREATE INDEX IF NOT EXISTS ix_students_branch_lower
    ON public.students (lower(branch));

-- Student-facing subject fetch: findByAcademicYearOfferedAndSemester (the
-- year-bound offering list). uq_subjects_code_year leads with course_code, so
-- it can't serve this.
CREATE INDEX IF NOT EXISTS ix_subjects_year_semester
    ON public.subjects (academic_year_offered, semester);
