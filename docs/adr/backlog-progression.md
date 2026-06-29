# ADR: Backlog progression & academic-year subject binding

Status: Implemented (Phases 0–5 + tests/docs) — 2026-06-13. Extended 2026-06-16 with
academic-year display format, course-code prefix enforcement, subject cloning, and the Manage
Subjects page (all committed on `rejectStatus`). 2026-06-29: the Add / Clone / Manage subject UIs
were consolidated into one tabbed page at `/admin/manage-subjects` (`?tab=manage|add|clone`); the
standalone `AddSubjectPage`/`CloneSubjectsPage` and their `/admin/add-subject` + `/admin/clone-subjects`
routes were removed. Pure UI refactor — endpoints/services unchanged.
Branch: `rejectStatus` (committed)

Resolved (2026-06-16): `subjects.year_of_joining` retired (entity field removed; physical
`DROP COLUMN` applied on Neon) and issue #7 closed — `AddSubjectPage` relabeled to "Academic
Year Offered" with a corrected year range. Follow-up: `subjects.academic_year_offered` is now
enforced NOT NULL via db/migrations/2026-06-16-subjects-academic-year-not-null.sql (manual,
matching the schema to the entity's primitive-int mapping).

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
floor = max(currentSem <= 4 ? 1 : currentSem <= 6 ? 3 : 5, entrySemester)
eligible = { floor .. currentSem }
```

For a normal intake (`entrySemester = 1`, the default for every existing student) the table below
holds unchanged:

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

**Lateral entry (2026-06-29):** `Student.entrySemester` (int, default 1; `>1` = a migrant who joined
mid-degree) raises the floor to `max(normalFloor, entrySemester)`, so e.g. a transfer at
`entrySemester=3`, `currentSem=5` sees `{3,4,5}` — never the sems 1–2 they didn't study here. The
change is in `EligibilityService.eligibleSemesters(currentSemester, entrySemester)` (the one-arg
overload delegates with `entry=1`, so existing callers/tests are untouched), threaded through
`RegistrationService.register` and `StudentController`. Backward-compatible by construction.

## Data model

| Entity | Change |
|---|---|
| `Subject` | new `academicYearOffered: int` (`2023` = AY 2023-24; odd sems = fall term, even = spring). Offering = `(academicYearOffered, semester, department, courseCode)`. New years = new rows; old rows kept forever. Replaces overloaded `yearOfJoining`. |
| `StudentSemesterTerm` (**new**) | `rollNo` (FK), `semester` (1-8), `academicYear` (int). PK `(rollNo, semester)`. Write-once = "first studied". |
| `Student` | `currentSemester` becomes authoritative (no schema change). Later: new `entrySemester: int` (default 1; raises the eligibility floor for lateral-entry students — DB `NOT NULL DEFAULT 1` via db/migrations/2026-06-29-students-entry-semester-not-null.sql). |
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

## Academic-year representation

Stored canonically as a single **start-year `int`** (2025 = AY 2025-26) in every column
(`student_semester_terms.academic_year`, `subjects.academic_year_offered`,
`exam_cycles.academic_year`, `registrations.snap_academic_year`) and over the API — the
`-26` is always `start+1`, so it is pure presentation. The int stays the source of truth for
all comparisons, the year-binding equality check, and the `(course_code, academic_year_offered)`
unique key. Human-facing `YYYY-YY` formatting/parsing lives only in the frontend
(`frontend/src/lib/academicYear.js`), applied at the display + input edges (RegistrationPage,
AddSubjectPage, ManageProgressionPage). Inputs stay parse-tolerant of a bare `2025` too.

Course-code prefix (ENFORCED — Phase 1, 2026-06-16): the first two digits of a course code are the
academic-year start (`22CSL44` → 2022 → AY 2022-23), a hard institutional invariant. The year is
authoritative and stamps a **locked** two-digit prefix; the admin edits only the suffix
(`CourseCodeField` + the `academicYear.js` `buildCourseCode`/`courseCodeSuffix` helpers). The rule
lives once in `CourseCodes.java` (`prefixForYear`/`bumpPrefix`/`matchesYear`), shared by create,
clone, and (Phase 2) edit; `SubjectService.createSubject` validates `prefix == academicYearOffered`
and rejects mismatches as the server backstop. So prefix=year holds by construction *and* is
server-checked — this **superseded the earlier soft-warn** (the `academicYearFromCourseCode`
auto-fill helper was removed). Deliberately enforced at the **app layer, not a DB CHECK**: it's a
naming *convention* (more exception-prone than the structural uniqueness/FK rules that do live in
the DB), and app-layer enforcement stays cheaply relaxable if a genuine exception ever appears. The
year remains the canonical int the binding logic reads.

## Subject cloning (year rollover)

Setting up a new year's offerings is a clone, not a re-entry: `SubjectCloneController`
(`/api/admin/subjects/clone/preview` + `/apply`) + `SubjectCloneService` copy a department's
subjects from a source year into a target year, **bumping the course-code prefix and
`academicYearOffered`** to the target (the prefix=year invariant makes the bump mechanical).
Two phases: *preview* generates an editable draft (per-row `WOULD_CREATE` / `WOULD_SKIP`);
*apply* commits the admin-approved rows with **skip-existing** (the
`UNIQUE(course_code, academic_year_offered)` index is the backstop), so it's idempotent /
re-runnable. Each create runs in its own transaction so one bad row can't poison the batch.
Offerings are intentionally **independent flat rows** — no canonical-subject/offering split,
because name/code/credits all drift year to year (see the data-model discussion); the clone is
a starting template you edit, not a relational link.

Scope: **DEPT_OFFICE + HOD → own department; ADMIN + PRINCIPAL → any** (server-enforced via
`resolveDept`, mirroring `ProgressionController`). This expanded subject-creation rights: HOD and
PRINCIPAL now also get the single-subject `AddSubject` flow, and `AdminController.addSubject` now
enforces dept scope server-side (previously only pinned in the UI). The UI is the dept-scoped
**Clone tab** (`/admin/manage-subjects?tab=clone`, `CloneSubjectsTab`): department + source/target
year (span format) + semester selector (all default, odd/even/none shortcuts) → editable preview
grid → apply.

Maintenance — `SubjectController` (`GET/PUT/DELETE /api/admin/subjects`) + the **Manage tab**
(`/admin/manage-subjects?tab=manage`, `ManageTab`): list/filter the catalog (dept/year/semester) and **edit** or **delete**.
Edit changes name/credits/semester/type/eligibility and the course-code **suffix** (prefix locked
to the year via `CourseCodeField`); **`academic_year_offered` is denied** (it's the binding key) and
the dept can't be reassigned. **Delete is blocked (409) when any registration references the
subject** (`RegistrationRepository.existsBySubjects_Id`) — registrations are immutable history, so a
referenced subject is never deletable; discontinuation is handled by simply not cloning it forward.
Same dept-scoping. No soft-delete/archive flag (deliberately — "don't clone next year" covers it).

## Student account management (2026-06-29)

Admins create/manage student records (previously out-of-band). Standalone tabbed page
`/admin/students` (`?tab=manage|add|import`, shell `src/pages/students/StudentsPage.jsx`) →
`StudentManagementController` (`/api/admin/students`) + `StudentManagementService`. Dept-scoped by USN
branch code exactly like `ProgressionController` (ADMIN/PRINCIPAL broad; HOD/DEPT_OFFICE own-dept).
- **Create / edit / import:** create one, edit (name/email/phone/currentSemester[warns]/entrySemester
  — **USN and DOB are not editable here**), bulk CSV import (dry-run + per-row, batch-default
  semesters, skip-existing). `1 ≤ entrySemester ≤ currentSemester ≤ 8` enforced.
- **DOB is the login credential → write-only:** never returned by any endpoint (`StudentSummaryResponse`
  omits it); set at create, corrected via `POST /{rollNo}/reset-dob`.
- **Delete only if unreferenced** (409 via `RegistrationRepository.existsByStudent_RollNo`) — same
  immutable-history rule as subjects.
- **Progression is never auto-seeded** on create (no fabricated years — wrong years fail silently,
  missing years fail loud). Instead: a post-create warning + a **"gaps" filter** on the Progression
  page (`GET /api/admin/progression/gaps`) listing students missing term rows in their eligibility
  window, plus a per-row "progression incomplete" badge on the Students list. The gaps check already
  respects `entrySemester`, so a lateral entrant's pre-entry sems aren't flagged.
- All sensitive writes (create/update/delete/DOB-reset) are audit-logged (mirrors `PROGRESSION_OVERRIDE`).

## Cross-cutting

- Auth scope mirrors user-management: ADMIN/PRINCIPAL broad, HOD/DEPT_OFFICE own-dept.
- Within a phase: ship read/UI before submit-hardening so the UI is compliant before the
  server starts rejecting.
- Don't reintroduce the N+1 just fixed (`@EntityGraph` on `RegistrationRepository.findAll`).
- Biggest risk: backfill accuracy for detained students — linear default + correction + fail-closed.
