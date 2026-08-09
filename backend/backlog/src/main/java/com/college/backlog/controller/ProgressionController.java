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
 * Student progression maintenance — bulk flows (promote, CSV import, backfill) and single-row
 * corrections; all write through {@link ProgressionService}.
 *
 * Scope, enforced here on the server (the UI only mirrors it): ADMIN/PRINCIPAL act on any
 * department; HOD/DEPT_OFFICE are pinned to their own (matched by USN branch code); PROCTOR gets
 * only the per-student endpoints (view, per-semester override, current-semester) and only for
 * assigned students — every bulk flow is refused.
 */
@RestController
@RequestMapping("/api/admin/progression")
@PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE', 'PROCTOR')")
public class ProgressionController {

    private static final Set<UserRole> DEPT_ROLES =
        Set.of(UserRole.HOD, UserRole.DEPT_OFFICE, UserRole.PROCTOR);

    private static final String BULK_REFUSED_FOR_PROCTORS =
        "Bulk progression tools are not available to proctors.";

    // Bulk ops must name an explicit cohort (dept + admission year, or a USN list); otherwise the
    // request degenerates to the whole-roster pattern "1MS____%". Enforced on the dry-run too —
    // the preview is the expensive pass, and preview/apply must agree.
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
        String roll = studentService.normalizeUsn(rollNo); // uppercase, so lowercase entry resolves
        assertInScope(actor, roll);
        proctorScope.assertSupervises(actor, roll);
        Student student = studentRepository.findByRollNo(roll)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found: " + roll));
        return toProgressionResponse(student);
    }

    // ---- progression gaps ----

    /**
     * Students missing a term row for any semester in their eligibility window (an incomplete
     * academic-year timeline). Dept-scoped like the rest of this controller. The window already
     * respects entrySemester, so a lateral entrant's pre-entry semesters aren't counted as gaps.
     */
    @GetMapping("/gaps")
    public List<StudentGapResponse> gaps(@RequestParam(required = false) Long deptId,
                                         @RequestParam(required = false) Integer admissionYear,
                                         Authentication auth) {
        User actor = requireActor(auth);
        proctorScope.rejectProctor(actor, BULK_REFUSED_FOR_PROCTORS);
        // at least a department, so the sweep and its unbounded response stay one dept wide;
        // admission year stays an optional narrowing
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
        // dry-run: one batched term lookup for the cohort, not an exists-probe round trip per student
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
                    // validate the year too, so the preview flags the rows recordProgression would
                    // reject — no WOULD_CREATE that then errors on apply (parity with import)
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
                    // validate without writing (student + semester + year range) — the same checks
                    // apply runs, so the preview can't say WOULD_CREATE for a row that then errors
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
                // defensive: an unexpected per-row failure becomes an ERROR row rather than
                // aborting the batch or surfacing as a request-level error
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
        // dry-run: one batched term lookup for the cohort, not up to 8 exists-probes per student
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
     * Set current (and entry) semester from the "View & correct" screen, returning the refreshed
     * progression view. Lives next to the per-semester corrections because changing current
     * semester shifts the eligibility window and extends the timeline below. Delegates to
     * StudentManagementService, keeping the 1 ≤ entry ≤ current ≤ 8 rule in one place.
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

    /** Bulk promote/backfill needs an explicit cohort: department (implicit for dept-scoped
     *  roles) AND admission year, or a bounded USN list. */
    private void requireBulkScope(User actor, Long deptId, Integer admissionYear, List<String> rollNos) {
        if (rollNos != null && !rollNos.isEmpty()) {
            if (rollNos.size() > MAX_EXPLICIT_ROLLNOS) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "At most " + MAX_EXPLICIT_ROLLNOS + " USNs per batch.");
            }
            return; // an explicit list is already bounded
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
        // A malformed USN has no branch code: that's an unknown identifier, not a scope violation.
        // 404 rather than 403, so a typo in the lookup box isn't read by the client as an auth
        // failure that clears the session and logs the user out.
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

        // dept-scoped callers are pinned to their own dept, ignoring any requested deptId
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

    // Rows backfill would create: entry semester (not 1) through 8, so a lateral entrant's
    // pre-entry semesters aren't counted missing. Reads the batched cohort lookup, no per-semester
    // queries. Range mirrors ProgressionService.backfillLinear so preview matches apply.
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
