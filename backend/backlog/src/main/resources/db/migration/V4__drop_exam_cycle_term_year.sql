-- ============================================================================
-- V4 — Drop the vestigial exam_cycles.term and exam_cycles.academic_year columns.
--
-- These were added for an earlier design where an exam cycle carried its own
-- academic-year/term context ("ODD"/"EVEN") used when stamping student
-- progression. That design was superseded: progression's academic-year context
-- now comes entirely from the per-student student_semester_terms rows (the
-- year-binding model), so the ExamCycle columns were never wired up — nothing
-- ever collected, wrote, or read them. There was no input for them in Manage
-- Exam Cycles, the create DTO/constructor never set them, and no code reads
-- ExamCycle.getTerm()/getAcademicYear().
--
-- Dropping both columns and their matching JPA fields (ddl-auto=validate: the
-- entity mapping must match the schema, so these move together).
-- ============================================================================

ALTER TABLE public.exam_cycles
    DROP COLUMN IF EXISTS term;

ALTER TABLE public.exam_cycles
    DROP COLUMN IF EXISTS academic_year;
