package com.college.backlog.controller;

import com.college.backlog.controller.dto.*;
import com.college.backlog.model.Department;
import com.college.backlog.model.Student;
import com.college.backlog.model.StudentSemesterTerm;
import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.StudentRepository;
import com.college.backlog.repository.StudentSemesterTermRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.service.EligibilityService;
import com.college.backlog.service.ProctorScopeService;
import com.college.backlog.service.ProgressionService;
import com.college.backlog.service.StudentManagementService;
import com.college.backlog.service.Usn;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Student progression maintenance. Both bulk flows (Promote Batch, CSV import)
 * and single-row corrections live here; all write through {@link ProgressionService}.
 *
 * Scope: ADMIN / PRINCIPAL act on any department; HOD / DEPT_OFFICE are restricted
 * to students of their own department (matched by the USN branch code). PROCTOR
 * may use only the per-student endpoints (view, per-semester override, current-
 * semester correction) and only on students assigned to them; the bulk flows
 * (gaps sweep, promote, CSV import, backfill) are refused for proctors. Enforced
 * here on the server — the UI only mirrors it.
 */
@RestController
@RequestMapping("/api/admin/progression")
@PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE', 'PROCTOR')")
public class ProgressionController {

    private static final Set<UserRole> DEPT_ROLES =
        Set.of(UserRole.HOD, UserRole.DEPT_OFFICE, UserRole.PROCTOR);

    private static final String BULK_REFUSED_FOR_PROCTORS =
        "Bulk progression tools are not available to proctors.";

    // Bulk operations must name an explicit cohort — one department + one admission
    // year (dept-scoped roles get the department implicitly) — or list specific
    // USNs. Without this, an unfiltered request degenerates to the whole-roster
    // pattern ("1MS____%") and walks every student. Applies to the dry-run too:
    // the preview is the expensive pass, and preview/apply must agree (parity).
    private static final int MAX_EXPLICIT_ROLLNOS = 500;

    @Autowired private ProgressionService progressionService;
    @Autowired private StudentRepository studentRepository;
    @Autowired private StudentSemesterTermRepository termRepository;
    @Autowired private DepartmentRepository departmentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EligibilityService eligibilityService;
    @Autowired private StudentManagementService studentService;
    @Autowired private ProctorScopeService proctorScope;

    // ---- view ----

    @GetMapping("/{rollNo}")
    public StudentProgressionResponse view(@PathVariable String rollNo, Authentication auth) {
        User actor = requireActor(auth);
        String roll = studentService.normalizeUsn(rollNo); // uppercase, so a lowercase entry still resolves
        assertInScope(actor, roll);
        proctorScope.assertSupervises(actor, roll);
        Student student = studentRepository.findByRollNo(roll)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found: " + roll));
        return toProgressionResponse(student);
    }

    // ---- progression gaps ----

    /**
     * Students missing a term row for one or more semesters in their eligibility
     * window — i.e. whose academic-year timeline isn't fully set (typically newly
     * added students). Dept-scoped like the rest of this controller. The eligibility
     * window already respects entrySemester, so a lateral entrant's pre-entry
     * semesters are not counted as gaps.
     */
    @GetMapping("/gaps")
    public List<StudentGapResponse> gaps(@RequestParam(required = false) Long deptId,
                                         @RequestParam(required = false) Integer admissionYear,
                                         Authentication auth) {
        User actor = requireActor(auth);
        proctorScope.rejectProctor(actor, BULK_REFUSED_FOR_PROCTORS);
        // at least a department, so the sweep (and its unbounded response) stays
        // one department wide; the admission year remains an optional narrower
        requireDeptScope(actor, deptId);
        List<Student> cohort = resolveCohort(actor, deptId, admissionYear, null);
        Map<String, Set<Integer>> termsByRoll = termsByRoll(cohort);

        List<StudentGapResponse> gaps = new ArrayList<>();
        for (Student s : cohort) {
            Set<Integer> recorded = termsByRoll.getOrDefault(s.getRollNo(), Set.of());
            List<Integer> missing = eligibilityService
                .eligibleSemesters(s.getCurrentSemester(), s.getEntrySemester()).stream()
                .filter(sem -> !recorded.contains(sem))
                .sorted()
                .collect(Collectors.toList());
            if (!missing.isEmpty()) {
                gaps.add(new StudentGapResponse(s.getRollNo(), s.getName(),
                        s.getCurrentSemester(), s.getEntrySemester(), missing));
            }
        }
        return gaps;
    }

    // ---- bulk promote ----

    @PostMapping("/promote")
    public BatchResult promote(@RequestBody PromoteBatchRequest req, Authentication auth) {
        User actor = requireActor(auth);
        proctorScope.rejectProctor(actor, BULK_REFUSED_FOR_PROCTORS);
        if (req.getTargetSemester() < 1 || req.getTargetSemester() > 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "targetSemester must be between 1 and 8.");
        }
        requireBulkScope(actor, req.getDeptId(), req.getAdmissionYear(), req.getRollNos());
        Set<String> excluded = req.getExcludeRollNos() == null ? Set.of() : new java.util.HashSet<>(req.getExcludeRollNos());
        List<Student> cohort = resolveCohort(actor, req.getDeptId(), req.getAdmissionYear(), req.getRollNos());
        // dry-run: one batched term lookup for the whole cohort instead of an
        // exists-probe per student (each probe is a round trip to the DB)
        Map<String, Set<Integer>> recordedByRoll = req.isDryRun() ? termsByRoll(cohort) : Map.of();

        List<ProgressionRowResult> results = new ArrayList<>();
        int created = 0, skipped = 0, errors = 0;
        for (Student s : cohort) {
            String roll = s.getRollNo();
            if (excluded.contains(roll)) {
                results.add(new ProgressionRowResult(roll, req.getTargetSemester(), "WOULD_SKIP", "held back"));
                skipped++;
                continue;
            }
            if (s.getCurrentSemester() >= req.getTargetSemester()) {
                results.add(new ProgressionRowResult(roll, req.getTargetSemester(), "WOULD_SKIP",
                        "already at or beyond semester " + req.getTargetSemester()));
                skipped++;
                continue;
            }
            try {
                if (req.isDryRun()) {
                    // validate the academic year too, so the preview flags the same
                    // bad rows the apply (recordProgression) would reject — no
                    // WOULD_CREATE that then errors on apply (parity with the import path)
                    progressionService.validateSemesterAndYear(req.getTargetSemester(), req.getAcademicYear());
                    boolean exists = recordedByRoll.getOrDefault(roll, Set.of()).contains(req.getTargetSemester());
                    results.add(new ProgressionRowResult(roll, req.getTargetSemester(),
                            exists ? "WOULD_SKIP" : "WOULD_CREATE",
                            "promote to semester " + req.getTargetSemester()));
                    if (exists) skipped++; else created++;
                } else {
                    ProgressionService.Outcome outcome =
                            progressionService.recordProgression(roll, req.getTargetSemester(), req.getAcademicYear());
                    results.add(new ProgressionRowResult(roll, req.getTargetSemester(), outcome.name(), null));
                    if (outcome == ProgressionService.Outcome.CREATED) created++; else skipped++;
                }
            } catch (IllegalArgumentException e) {
                results.add(new ProgressionRowResult(roll, req.getTargetSemester(), "ERROR", e.getMessage()));
                errors++;
            }
        }
        return new BatchResult(req.isDryRun(), created, skipped, errors, results);
    }

    // ---- CSV import ----

    @PostMapping("/import")
    public BatchResult importRows(@RequestBody ProgressionImportRequest req, Authentication auth) {
        User actor = requireActor(auth);
        proctorScope.rejectProctor(actor, BULK_REFUSED_FOR_PROCTORS);
        String callerDeptCode = callerDeptCode(actor);
        List<ProgressionRowResult> results = new ArrayList<>();
        int created = 0, skipped = 0, errors = 0;

        for (ProgressionImportRow row : req.getRows() == null ? List.<ProgressionImportRow>of() : req.getRows()) {
            String roll = row.getRollNo() == null ? "" : row.getRollNo().trim();
            try {
                if (callerDeptCode != null && !callerDeptCode.equalsIgnoreCase(studentDeptCode(roll))) {
                    throw new IllegalArgumentException("Outside your department's scope.");
                }
                if (req.isDryRun()) {
                    // validate without writing: student + semester + academic-year range
                    // (same checks the apply path runs, so the preview can't say
                    // WOULD_CREATE for a row that would then error on apply)
                    studentRepository.findByRollNo(roll)
                            .orElseThrow(() -> new IllegalArgumentException("Student not found: " + roll));
                    progressionService.validateSemesterAndYear(row.getSemester(), row.getAcademicYear());
                    boolean exists = termRepository.existsByRollNoAndSemester(roll, row.getSemester());
                    results.add(new ProgressionRowResult(roll, row.getSemester(),
                            exists ? "WOULD_SKIP" : "WOULD_CREATE", null));
                    if (exists) skipped++; else created++;
                } else {
                    ProgressionService.Outcome outcome =
                            progressionService.recordProgression(roll, row.getSemester(), row.getAcademicYear());
                    results.add(new ProgressionRowResult(roll, row.getSemester(), outcome.name(), null));
                    if (outcome == ProgressionService.Outcome.CREATED) created++; else skipped++;
                }
            } catch (IllegalArgumentException e) {
                results.add(new ProgressionRowResult(roll, row.getSemester(), "ERROR", e.getMessage()));
                errors++;
            } catch (RuntimeException e) {
                // Defensive: an unexpected per-row failure is reported as an ERROR row, not
                // allowed to abort the batch or surface as a request-level error.
                results.add(new ProgressionRowResult(roll, row.getSemester(), "ERROR", "Could not import this row."));
                errors++;
            }
        }
        return new BatchResult(req.isDryRun(), created, skipped, errors, results);
    }

    // ---- linear backfill ----

    @PostMapping("/backfill-linear")
    public BatchResult backfillLinear(@RequestBody BackfillRequest req, Authentication auth) {
        User actor = requireActor(auth);
        proctorScope.rejectProctor(actor, BULK_REFUSED_FOR_PROCTORS);
        requireBulkScope(actor, req.getDeptId(), req.getAdmissionYear(), req.getRollNos());
        List<Student> cohort = resolveCohort(actor, req.getDeptId(), req.getAdmissionYear(), req.getRollNos());
        // dry-run: one batched term lookup for the whole cohort instead of up to
        // 8 exists-probes per student
        Map<String, Set<Integer>> recordedByRoll = req.isDryRun() ? termsByRoll(cohort) : Map.of();

        List<ProgressionRowResult> results = new ArrayList<>();
        int created = 0, skipped = 0, errors = 0;
        for (Student s : cohort) {
            String roll = s.getRollNo();
            try {
                if (req.isDryRun()) {
                    int missing = countMissingLinear(
                            recordedByRoll.getOrDefault(roll, Set.of()), s.getEntrySemester());
                    results.add(new ProgressionRowResult(roll, null,
                            missing > 0 ? "WOULD_CREATE" : "WOULD_SKIP", missing + " row(s)"));
                    if (missing > 0) created += missing; else skipped++;
                } else {
                    int n = progressionService.backfillLinear(roll);
                    results.add(new ProgressionRowResult(roll, null,
                            n > 0 ? "CREATED" : "SKIPPED_EXISTS", n + " row(s)"));
                    if (n > 0) created += n; else skipped++;
                }
            } catch (IllegalArgumentException e) {
                results.add(new ProgressionRowResult(roll, null, "ERROR", e.getMessage()));
                errors++;
            }
        }
        return new BatchResult(req.isDryRun(), created, skipped, errors, results);
    }

    // ---- current / entry semester correction ----

    /**
     * Update just the student's current (and entry) semester from the "View & correct"
     * screen, returning the refreshed progression view. Changing the current semester
     * shifts the eligibility window and extends the timeline shown below — hence it lives
     * next to the per-semester year corrections. Delegates to StudentManagementService so
     * the 1 ≤ entry ≤ current ≤ 8 validation stays in one place.
     */
    @PutMapping("/{rollNo}/current-semester")
    public StudentProgressionResponse setCurrentSemester(@PathVariable String rollNo,
                                                         @RequestBody SemesterUpdateRequest req,
                                                         Authentication auth) {
        User actor = requireActor(auth);
        String roll = studentService.normalizeUsn(rollNo);
        assertInScope(actor, roll);
        proctorScope.assertSupervises(actor, roll);
        Student student = studentRepository.findByRollNo(roll)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found: " + roll));
        try {
            student = studentService.updateSemesters(student, req.getCurrentSemester(), req.getEntrySemester());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return toProgressionResponse(student);
    }

    // ---- single-row correction ----

    @PutMapping("/{rollNo}/semester/{semester}")
    public StudentProgressionResponse override(@PathVariable String rollNo,
                                               @PathVariable int semester,
                                               @RequestBody ProgressionOverrideRequest req,
                                               Authentication auth) {
        User actor = requireActor(auth);
        String roll = studentService.normalizeUsn(rollNo);
        assertInScope(actor, roll);
        proctorScope.assertSupervises(actor, roll);
        try {
            progressionService.overrideProgression(roll, semester, req.getAcademicYear(), actor.getUsername());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        Student student = studentRepository.findByRollNo(roll)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found: " + roll));
        return toProgressionResponse(student);
    }

    // ---- helpers ----

    private User requireActor(Authentication auth) {
        if (auth == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        return userRepository.findById(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
    }

    /**
     * Bulk promote/backfill must target one explicit cohort: a department (implicit
     * for dept-scoped roles) AND an admission year — or a bounded list of USNs.
     */
    private void requireBulkScope(User actor, Long deptId, Integer admissionYear, List<String> rollNos) {
        if (rollNos != null && !rollNos.isEmpty()) {
            if (rollNos.size() > MAX_EXPLICIT_ROLLNOS) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "At most " + MAX_EXPLICIT_ROLLNOS + " USNs per batch.");
            }
            return; // an explicitly-listed cohort is bounded by the request
        }
        boolean missingDept = callerDeptCode(actor) == null && deptId == null;
        boolean missingYear = admissionYear == null;
        if (missingDept || missingYear) {
            String needed = missingDept && missingYear ? "a department and an admission year"
                    : missingDept ? "a department" : "an admission year";
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Bulk operations need an explicit cohort: select " + needed
                    + " (or list specific USNs).");
        }
    }

    /** Gaps sweep needs at least a department (implicit for dept-scoped roles). */
    private void requireDeptScope(User actor, Long deptId) {
        if (callerDeptCode(actor) == null && deptId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Select a department to check for gaps.");
        }
    }

    /** Batched (rollNo -> recorded semesters) lookup for a cohort — one query, not N. */
    private Map<String, Set<Integer>> termsByRoll(List<Student> cohort) {
        if (cohort.isEmpty()) return Map.of();
        return termRepository.findByRollNoIn(
                cohort.stream().map(Student::getRollNo).collect(Collectors.toList())).stream()
            .collect(Collectors.groupingBy(StudentSemesterTerm::getRollNo,
                Collectors.mapping(StudentSemesterTerm::getSemester, Collectors.toSet())));
    }

    /** The dept code a caller is restricted to, or null if unrestricted (ADMIN/PRINCIPAL). */
    private String callerDeptCode(User actor) {
        if (actor == null || !DEPT_ROLES.contains(actor.getRole()) || actor.getDepartment() == null) {
            return null;
        }
        return actor.getDepartment().getCode();
    }

    private String studentDeptCode(String rollNo) {
        return Usn.branchCode(rollNo);
    }

    private void assertInScope(User actor, String rollNo) {
        String code = callerDeptCode(actor);
        if (code == null) return; // ADMIN / PRINCIPAL: unrestricted
        String studentCode = studentDeptCode(rollNo);
        // A malformed USN yields no branch code — that's a bad/unknown identifier, not a
        // department-scope violation. Surface it as 404 (not found) rather than 403, so a
        // typo in the lookup box can't be read by the client as an auth failure that
        // clears the session and logs the user out.
        if (studentCode == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found: " + rollNo);
        }
        if (!code.equalsIgnoreCase(studentCode)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Outside your department's scope.");
        }
    }

    private List<Student> resolveCohort(User actor, Long deptId, Integer admissionYear, List<String> rollNos) {
        String callerDeptCode = callerDeptCode(actor);

        if (rollNos != null && !rollNos.isEmpty()) {
            List<String> trimmed = rollNos.stream().map(String::trim).collect(Collectors.toList());
            return studentRepository.findByRollNoInOrderByRollNo(trimmed).stream()
                    .filter(s -> callerDeptCode == null || callerDeptCode.equalsIgnoreCase(studentDeptCode(s.getRollNo())))
                    .collect(Collectors.toList());
        }

        // dept-scoped callers are pinned to their own department, ignoring any requested deptId
        String deptCode = callerDeptCode;
        if (deptCode == null && deptId != null) {
            Department dept = departmentRepository.findById(deptId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown department."));
            deptCode = dept.getCode();
        }

        String yy = admissionYear != null ? String.format("%02d", admissionYear % 100) : "__";
        String cc = deptCode != null ? deptCode : "__";
        String pattern = "1MS" + yy + cc + "%";
        return studentRepository.findByRollNoLikeOrderByRollNo(pattern);
    }

    // Count how many rows backfill would create — from the entry semester (not sem 1)
    // through the final programme semester (8), so a lateral entrant's pre-entry
    // semesters aren't counted as missing. Reads the batched per-cohort term lookup
    // (no per-semester queries). Mirrors ProgressionService.backfillLinear's range
    // so the preview matches the apply.
    private int countMissingLinear(Set<Integer> recordedSemesters, int entrySemester) {
        int missing = 0;
        for (int sem = Math.max(1, entrySemester); sem <= 8; sem++) {
            if (!recordedSemesters.contains(sem)) missing++;
        }
        return missing;
    }

    private StudentProgressionResponse toProgressionResponse(Student student) {
        List<StudentProgressionResponse.Term> terms = termRepository.findByRollNo(student.getRollNo()).stream()
                .sorted(Comparator.comparingInt(StudentSemesterTerm::getSemester))
                .map(t -> new StudentProgressionResponse.Term(t.getSemester(), t.getAcademicYear()))
                .collect(Collectors.toList());
        return new StudentProgressionResponse(student.getRollNo(), student.getName(),
                student.getCurrentSemester(), student.getEntrySemester(), terms);
    }
}
