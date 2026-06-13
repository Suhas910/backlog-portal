# ADR: Backlog progression & academic-year subject binding

Status: Implemented (Phases 0–4 + tests/docs) — 2026-06-13
Branch: `rejectStatus` (uncommitted)

Deferred: retiring `subjects.year_of_joining` and issue #7 (AddSubjectPage relabel + range) —
bundled together; the retirement needs a manual Neon `DROP COLUMN` and is coupled to the
AddSubjectPage field. Tracked as a separate task.

## Context

Students register for backlog (re-exam) subjects. Two rules were unenforced:

1. **Which semesters** a student may register backlogs for, given their current semester.
2. **Which version** of a semester's subject list applies — subject lists for the same
   `(semester, branch)` change between academic years (syllabus revisions), and a student
   retaking a backlog must see the version from the year they actually studied that semester.

Before this work the student free-picked any year + any semester on the registration page
and the server validated only branch/elective membership of the chosen subjects
(`RegistrationService.register`). Subjects were served by exact match on an overloaded
`Subject.yearOfJoining` (`SubjectController`).

## Decisions

- **Binding model: academic-year-of-attendance.** Each backlog semester resolves to the
  academic year (AY) the student *first studied* that semester. Formulas break under
  year-backs/detentions, so an explicit per-student progression record is the source of truth.
- **Eligibility: computed from `Student.currentSemester`**, which is admin-maintained each
  term and held back on detention.
- **Retake version: "year they first studied it"** → progression rows are write-once.
- **Electives bind identically** to regular subjects, by `academicYearOffered`.
- **Progression maintenance: both** a "Promote Batch" admin UI and a CSV import, sharing one
  service method.
- **Backfill** of students already mid-degree: linear-default seeding + manual correction.

## Eligibility window (closed form)

```
floor = currentSem <= 4 ? 1 : currentSem <= 6 ? 3 : 5
eligible = { floor .. currentSem }
```

| currentSem | eligible      |
|------------|---------------|
| 1          | {1}           |
| 2          | {1,2}         |
| 3          | {1,2,3}       |
| 4          | {1,2,3,4}     |
| 5          | {3,4,5}       |
| 6          | {3,4,5,6}     |
| 7          | {5,6,7}       |
| 8          | {5,6,7,8}     |

Rationale: eligible = (current academic-year's sems) ∪ (previous academic-year's sems),
capped at the current sem. Promotion to 3rd year (sem 5) drops 1st-year backlogs by design.

## Data model

| Entity | Change |
|---|---|
| `Subject` | new `academicYearOffered: int` (`2023` = AY 2023-24; odd sems = fall term, even = spring). Offering = `(academicYearOffered, semester, department, courseCode)`. New years = new rows; old rows kept forever. Replaces overloaded `yearOfJoining`. |
| `StudentSemesterTerm` (**new**) | `rollNo` (FK), `semester` (1-8), `academicYear` (int). PK `(rollNo, semester)`. Write-once = "first studied". |
| `Student` | `currentSemester` becomes authoritative (no schema change). |
| `ExamCycle` | new `academicYear: int`, `term: ODD\|EVEN`. |
| `Registration` | optional `snapAcademicYear` (form immutability, Phase 4). |

Fail-closed: if an eligible semester has no progression row, the student gets a clear
"contact dept office" message — never a guessed year.

## Phased implementation

- **Phase 0 — Schema foundations.** Additive columns/tables, no behavior change. Add
  `subjects.academic_year_offered` as a NEW column (never rename `year_of_joining` —
  `ddl-auto` would drop it) and backfill; create `student_semester_term`; add
  `exam_cycles.academic_year` + `term`.
- **Phase 1 — Eligibility window** (independently shippable). `EligibilityService`; expose
  eligible sems on `/student/me`; constrain the `RegistrationPage` semester dropdown; reject
  out-of-window subjects in `RegistrationService.register`.
- **Phase 2 — Progression + AY binding (read path).** Rewrite `GET /api/subjects` to drop
  client `year`, resolve AY from `StudentSemesterTerm`, fail closed. Drop the year dropdown;
  show resolved AY read-only.
- **Phase 3 — Progression maintenance.** Shared
  `ProgressionService.recordProgression(rollNo, semester, academicYear)` (insert-if-absent,
  advance currentSemester); Promote Batch UI (cohort + target sem + AY, preview, detention
  hold, dept-scoped); CSV import (idempotent, dry-run + error report); linear-default backfill
  seeder; single-row override for corrections (audited).
- **Phase 4 — Submit hardening + snapshot.** Assert
  `subject.academicYearOffered == StudentSemesterTerm[student, subject.semester]`; add
  `snapAcademicYear`.
- **Phase 5 — Cleanup/tests/docs.** Retire `year_of_joining`; relabel `AddSubjectPage` field
  + fix year-range (known issue #7); unit/integration/Cypress tests (closes part of #17).

Dependency chain: Phase 0 → (1 ∥ 2-foundations) → 2 → 3 → 4 → 5. Phase 1 is shippable today.

## Cross-cutting

- Auth scope mirrors user-management: ADMIN/PRINCIPAL broad, HOD/DEPT_OFFICE own-dept.
- Within a phase: ship read/UI before submit-hardening so the UI is compliant before the
  server starts rejecting.
- Don't reintroduce the N+1 just fixed (`@EntityGraph` on `RegistrationRepository.findAll`).
- Biggest risk: backfill accuracy for detained students — linear default + correction + fail-closed.
