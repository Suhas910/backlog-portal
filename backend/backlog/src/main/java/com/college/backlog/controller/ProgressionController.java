package com.college.backlog.controller;

import com.college.backlog.controller.dto.ProgressionOverrideRequest;
import com.college.backlog.controller.dto.StudentProgressionResponse;
import com.college.backlog.model.Student;
import com.college.backlog.model.StudentSemesterTerm;
import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
import com.college.backlog.repository.StudentRepository;
import com.college.backlog.repository.StudentSemesterTermRepository;
import com.college.backlog.service.ProctorScopeService;
import com.college.backlog.service.ProgressionService;
import com.college.backlog.service.StudentManagementService;
import com.college.backlog.service.Usn;
import com.college.backlog.service.CallerScope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Per-student progression: view the academic-year-per-semester timeline and correct one semester.
 * Writes go through {@link ProgressionService#overrideProgression}, which is audited.
 *
 * The bulk flows (promote batch, CSV import, linear backfill, gaps sweep) were removed once
 * {@code StudentManagementService.createStudent} started seeding the full entry..8 timeline: with
 * every row present at creation there was nothing left for them to fill, so they could only ever
 * report "already recorded". The UI is the per-student Semesters panel on /admin/students.
 *
 * Scope, enforced here on the server (the UI only mirrors it): ADMIN/PRINCIPAL act on any
 * department; HOD/DEPT_OFFICE are pinned to their own (matched by USN branch code); PROCTOR is
 * additionally limited to assigned students.
 */
@RestController
@RequestMapping("/api/admin/progression")
@PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE', 'PROCTOR')")
public class ProgressionController {

    private static final Set<UserRole> DEPT_ROLES =
        Set.of(UserRole.HOD, UserRole.DEPT_OFFICE, UserRole.PROCTOR);

    @Autowired private CallerScope callerScope;
    @Autowired private ProgressionService progressionService;
    @Autowired private StudentRepository studentRepository;
    @Autowired private StudentSemesterTermRepository termRepository;
    @Autowired private StudentManagementService studentService;
    @Autowired private ProctorScopeService proctorScope;

    // ---- view ----

    @GetMapping("/{rollNo}")
    public StudentProgressionResponse view(@PathVariable String rollNo, Authentication auth) {
        User actor = callerScope.requireActor(auth);
        String roll = studentService.normalizeUsn(rollNo); // uppercase, so lowercase entry resolves
        assertInScope(actor, roll);
        proctorScope.assertSupervises(actor, roll);
        Student student = studentRepository.findByRollNo(roll)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found: " + roll));
        return toProgressionResponse(student);
    }

    // ---- single-row correction ----

    @PutMapping("/{rollNo}/semester/{semester}")
    public StudentProgressionResponse override(@PathVariable String rollNo,
                                               @PathVariable int semester,
                                               @RequestBody ProgressionOverrideRequest req,
                                               Authentication auth) {
        User actor = callerScope.requireActor(auth);
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

    /** The dept code a caller is restricted to; null ONLY if genuinely unrestricted
     *  (ADMIN/PRINCIPAL). A dept role without a department is unscopeable, not unrestricted. */
    private String callerDeptCode(User actor) {
        if (!DEPT_ROLES.contains(actor.getRole())) return null;
        return callerScope.requireDepartmentCode(actor);
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

    private StudentProgressionResponse toProgressionResponse(Student student) {
        List<StudentProgressionResponse.Term> terms = termRepository.findByRollNo(student.getRollNo()).stream()
                .sorted(Comparator.comparingInt(StudentSemesterTerm::getSemester))
                .map(t -> new StudentProgressionResponse.Term(t.getSemester(), t.getAcademicYear()))
                .collect(Collectors.toList());
        return new StudentProgressionResponse(student.getRollNo(), student.getName(),
                student.getCurrentSemester(), student.getEntrySemester(), terms);
    }
}
