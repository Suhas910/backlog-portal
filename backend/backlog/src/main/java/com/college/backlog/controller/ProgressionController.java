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
import com.college.backlog.service.ProgressionService;
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
 * to students of their own department (matched by the USN branch code). Enforced
 * here on the server — the UI only mirrors it.
 */
@RestController
@RequestMapping("/api/admin/progression")
@PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
public class ProgressionController {

    private static final Set<UserRole> DEPT_ROLES = Set.of(UserRole.HOD, UserRole.DEPT_OFFICE);

    @Autowired private ProgressionService progressionService;
    @Autowired private StudentRepository studentRepository;
    @Autowired private StudentSemesterTermRepository termRepository;
    @Autowired private DepartmentRepository departmentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EligibilityService eligibilityService;

    // ---- view ----

    @GetMapping("/{rollNo}")
    public StudentProgressionResponse view(@PathVariable String rollNo, Authentication auth) {
        User actor = requireActor(auth);
        assertInScope(actor, rollNo);
        Student student = studentRepository.findByRollNo(rollNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found: " + rollNo));
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
        List<Student> cohort = resolveCohort(actor, deptId, admissionYear, null);

        Map<String, Set<Integer>> termsByRoll = cohort.isEmpty() ? Map.of()
            : termRepository.findByRollNoIn(
                    cohort.stream().map(Student::getRollNo).collect(Collectors.toList())).stream()
                .collect(Collectors.groupingBy(StudentSemesterTerm::getRollNo,
                    Collectors.mapping(StudentSemesterTerm::getSemester, Collectors.toSet())));

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
        if (req.getTargetSemester() < 1 || req.getTargetSemester() > 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "targetSemester must be between 1 and 8.");
        }
        Set<String> excluded = req.getExcludeRollNos() == null ? Set.of() : new java.util.HashSet<>(req.getExcludeRollNos());
        List<Student> cohort = resolveCohort(actor, req.getDeptId(), req.getAdmissionYear(), req.getRollNos());

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
                    boolean exists = termRepository.existsByRollNoAndSemester(roll, req.getTargetSemester());
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
            }
        }
        return new BatchResult(req.isDryRun(), created, skipped, errors, results);
    }

    // ---- linear backfill ----

    @PostMapping("/backfill-linear")
    public BatchResult backfillLinear(@RequestBody BackfillRequest req, Authentication auth) {
        User actor = requireActor(auth);
        List<Student> cohort = resolveCohort(actor, req.getDeptId(), req.getAdmissionYear(), req.getRollNos());

        List<ProgressionRowResult> results = new ArrayList<>();
        int created = 0, skipped = 0, errors = 0;
        for (Student s : cohort) {
            String roll = s.getRollNo();
            try {
                if (req.isDryRun()) {
                    int missing = countMissingLinear(roll, s.getEntrySemester(), s.getCurrentSemester());
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

    // ---- single-row correction ----

    @PutMapping("/{rollNo}/semester/{semester}")
    public StudentProgressionResponse override(@PathVariable String rollNo,
                                               @PathVariable int semester,
                                               @RequestBody ProgressionOverrideRequest req,
                                               Authentication auth) {
        User actor = requireActor(auth);
        assertInScope(actor, rollNo);
        try {
            progressionService.overrideProgression(rollNo, semester, req.getAcademicYear(), actor.getUsername());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        Student student = studentRepository.findByRollNo(rollNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found: " + rollNo));
        return toProgressionResponse(student);
    }

    // ---- helpers ----

    private User requireActor(Authentication auth) {
        if (auth == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        return userRepository.findById(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
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
        if (code != null && !code.equalsIgnoreCase(studentDeptCode(rollNo))) {
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
    // so a lateral entrant's pre-entry semesters aren't counted as missing. Mirrors
    // ProgressionService.backfillLinear's range so the preview matches the apply.
    private int countMissingLinear(String rollNo, int entrySemester, int currentSemester) {
        int missing = 0;
        for (int sem = Math.max(1, entrySemester); sem <= currentSemester && sem <= 8; sem++) {
            if (!termRepository.existsByRollNoAndSemester(rollNo, sem)) missing++;
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
