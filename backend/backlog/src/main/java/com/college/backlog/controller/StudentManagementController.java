package com.college.backlog.controller;

import com.college.backlog.controller.dto.*;
import com.college.backlog.model.Student;
import com.college.backlog.model.StudentSemesterTerm;
import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.StudentRepository;
import com.college.backlog.repository.StudentSemesterTermRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.service.EligibilityService;
import com.college.backlog.service.StudentManagementService;
import com.college.backlog.service.StudentSpecification;
import com.college.backlog.service.Usn;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin student-account management. Authorization mirrors ProgressionController:
 * ADMIN / PRINCIPAL act on any department; HOD / DEPT_OFFICE are pinned to students
 * of their own department (matched by the USN branch code). Enforced here on the
 * server — the UI only mirrors it. DOB is never returned (write-only credential).
 *
 * See docs/adr/backlog-progression.md.
 */
@RestController
@RequestMapping("/api/admin/students")
@PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
public class StudentManagementController {

    private static final Set<UserRole> DEPT_ROLES = Set.of(UserRole.HOD, UserRole.DEPT_OFFICE);

    @Autowired private StudentRepository studentRepository;
    @Autowired private StudentSemesterTermRepository termRepository;
    @Autowired private DepartmentRepository departmentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentManagementService studentService;
    @Autowired private EligibilityService eligibilityService;

    // ---- list ----

    @GetMapping
    public List<StudentSummaryResponse> list(
            @RequestParam Optional<Long> deptId,
            @RequestParam Optional<Integer> admissionYear,
            @RequestParam Optional<Integer> semester,
            @RequestParam Optional<String> query,
            Authentication auth) {
        User actor = requireActor(auth);
        String deptCode = effectiveDeptCode(actor, deptId.orElse(null));
        String rollNoLike = usnPattern(deptCode, admissionYear.orElse(null));

        StudentSpecification spec =
            new StudentSpecification(rollNoLike, semester.orElse(null), query.orElse(null));
        List<Student> students = studentRepository.findAll(spec, Sort.by("rollNo"));

        // batch the term lookup so progressionComplete is one query, not N
        Map<String, Set<Integer>> termsByRoll = termsByRoll(
            students.stream().map(Student::getRollNo).collect(Collectors.toList()));

        return students.stream()
            .map(s -> toSummary(s, termsByRoll.getOrDefault(s.getRollNo(), Set.of())))
            .collect(Collectors.toList());
    }

    // ---- create ----

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StudentSummaryResponse create(@Valid @RequestBody StudentCreateRequest req, Authentication auth) {
        User actor = requireActor(auth);
        String rollNo = studentService.normalizeUsn(req.getRollNo());
        req.setRollNo(rollNo);
        assertInScope(actor, rollNo);
        if (studentRepository.existsById(rollNo)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "A student with USN " + rollNo + " already exists.");
        }
        Student saved;
        try {
            saved = studentService.createStudent(req);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return toSummary(saved, termsByRoll(List.of(saved.getRollNo()))
            .getOrDefault(saved.getRollNo(), Set.of()));
    }

    // ---- edit ----

    @PutMapping("/{rollNo}")
    public StudentSummaryResponse update(@PathVariable String rollNo,
                                         @Valid @RequestBody StudentUpdateRequest req,
                                         Authentication auth) {
        User actor = requireActor(auth);
        Student student = loadInScope(actor, rollNo);
        Student saved;
        try {
            saved = studentService.updateStudent(student, req);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return toSummary(saved, termsByRoll(List.of(saved.getRollNo()))
            .getOrDefault(saved.getRollNo(), Set.of()));
    }

    // ---- reset DOB ----

    @PostMapping("/{rollNo}/reset-dob")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetDob(@PathVariable String rollNo,
                         @Valid @RequestBody ResetDobRequest req,
                         Authentication auth) {
        User actor = requireActor(auth);
        Student student = loadInScope(actor, rollNo);
        try {
            studentService.resetDob(student, req.getDateOfBirth());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // ---- delete (only if unreferenced) ----

    @DeleteMapping("/{rollNo}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String rollNo, Authentication auth) {
        User actor = requireActor(auth);
        Student student = loadInScope(actor, rollNo);
        try {
            studentService.deleteStudent(student);
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    // ---- bulk import ----

    @PostMapping("/import")
    public BatchResult importRows(@RequestBody StudentImportRequest req, Authentication auth) {
        User actor = requireActor(auth);
        String callerDeptCode = callerDeptCode(actor);
        List<ProgressionRowResult> results = new ArrayList<>();
        int created = 0, skipped = 0, errors = 0;

        List<StudentImportRow> rows = req.getRows() == null ? List.of() : req.getRows();
        for (StudentImportRow row : rows) {
            String roll = studentService.normalizeUsn(row.getRollNo());
            int currentSem = firstNonNull(row.getCurrentSemester(), req.getDefaultCurrentSemester(), 0);
            int entrySem = firstNonNull(row.getEntrySemester(), req.getDefaultEntrySemester(), 1);
            try {
                // validate USN + scope + ranges + branch up front (covers dry-run)
                studentService.validateUsn(roll);
                if (callerDeptCode != null && !callerDeptCode.equalsIgnoreCase(studentDeptCode(roll))) {
                    throw new IllegalArgumentException("Outside your department's scope.");
                }
                studentService.resolveBranchDept(roll);
                studentService.validateSemesters(currentSem, entrySem);
                if (row.getDateOfBirth() == null) {
                    throw new IllegalArgumentException("Date of birth is required.");
                }

                if (studentRepository.existsById(roll)) {
                    results.add(new ProgressionRowResult(roll, currentSem, "SKIPPED_EXISTS", null));
                    skipped++;
                } else if (req.isDryRun()) {
                    results.add(new ProgressionRowResult(roll, currentSem, "WOULD_CREATE", null));
                    created++;
                } else {
                    StudentCreateRequest create = new StudentCreateRequest();
                    create.setRollNo(roll);
                    create.setName(row.getName());
                    create.setPhone(row.getPhone());
                    create.setDateOfBirth(row.getDateOfBirth());
                    create.setCurrentSemester(currentSem);
                    create.setEntrySemester(entrySem);
                    studentService.createStudent(create);
                    results.add(new ProgressionRowResult(roll, currentSem, "CREATED", null));
                    created++;
                }
            } catch (IllegalArgumentException e) {
                results.add(new ProgressionRowResult(roll, currentSem, "ERROR", e.getMessage()));
                errors++;
            }
        }
        return new BatchResult(req.isDryRun(), created, skipped, errors, results);
    }

    // ---- helpers ----

    private User requireActor(Authentication auth) {
        if (auth == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        return userRepository.findById(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
    }

    /** Dept code a dept-scoped caller is pinned to, or null for ADMIN/PRINCIPAL. */
    private String callerDeptCode(User actor) {
        if (actor == null || !DEPT_ROLES.contains(actor.getRole()) || actor.getDepartment() == null) {
            return null;
        }
        return actor.getDepartment().getCode();
    }

    private String studentDeptCode(String rollNo) {
        return Usn.branchCode(rollNo);
    }

    /** The dept code to filter by: the caller's own (if scoped), else a requested deptId. */
    private String effectiveDeptCode(User actor, Long requestedDeptId) {
        String callerCode = callerDeptCode(actor);
        if (callerCode != null) return callerCode;
        if (requestedDeptId != null) {
            return departmentRepository.findById(requestedDeptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown department."))
                .getCode();
        }
        return null;
    }

    /** USN LIKE pattern from dept code + admission year, or null when neither is set. */
    private String usnPattern(String deptCode, Integer admissionYear) {
        if (deptCode == null && admissionYear == null) return null;
        String yy = admissionYear != null ? String.format("%02d", admissionYear % 100) : "__";
        String cc = deptCode != null ? deptCode.toUpperCase() : "__";
        return "1MS" + yy + cc + "%";
    }

    private void assertInScope(User actor, String rollNo) {
        String code = callerDeptCode(actor);
        if (code != null && !code.equalsIgnoreCase(studentDeptCode(rollNo))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Outside your department's scope.");
        }
    }

    private Student loadInScope(User actor, String rollNo) {
        String roll = studentService.normalizeUsn(rollNo);
        assertInScope(actor, roll);
        return studentRepository.findByRollNo(roll)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found: " + roll));
    }

    private Map<String, Set<Integer>> termsByRoll(List<String> rollNos) {
        if (rollNos.isEmpty()) return Map.of();
        return termRepository.findByRollNoIn(rollNos).stream()
            .collect(Collectors.groupingBy(StudentSemesterTerm::getRollNo,
                Collectors.mapping(StudentSemesterTerm::getSemester, Collectors.toSet())));
    }

    /** A student is progression-complete when every eligible semester has a term row. */
    private StudentSummaryResponse toSummary(Student s, Set<Integer> recordedSemesters) {
        Set<Integer> eligible =
            eligibilityService.eligibleSemesters(s.getCurrentSemester(), s.getEntrySemester());
        boolean complete = recordedSemesters.containsAll(eligible);
        return new StudentSummaryResponse(
            s.getRollNo(), s.getName(), s.getEmail(), s.getPhone(),
            s.getBranch(), s.getCurrentSemester(), s.getEntrySemester(), complete);
    }

    private int firstNonNull(Integer a, Integer b, int fallback) {
        if (a != null) return a;
        if (b != null) return b;
        return fallback;
    }
}
