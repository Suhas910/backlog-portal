package com.college.backlog.controller;

import com.college.backlog.controller.dto.SubjectCloneApplyRequest;
import com.college.backlog.controller.dto.SubjectCloneResult;
import com.college.backlog.controller.dto.SubjectClonePreviewRequest;
import com.college.backlog.controller.dto.SubjectClonePreviewResponse;
import com.college.backlog.model.Department;
import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.service.SubjectCloneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Year;
import java.util.Set;

/**
 * Clone a department's subject offerings into a new academic year. Scope: ADMIN /
 * PRINCIPAL may clone for any department; HOD / DEPT_OFFICE are pinned to their own
 * (mirrors the dept-scoping in {@link ProgressionController}). The server forces the
 * target year and re-validates the department, so a crafted request can't write
 * outside the caller's scope or into the wrong year.
 */
@RestController
@RequestMapping("/api/admin/subjects/clone")
@PreAuthorize("hasAnyRole('ADMIN','PRINCIPAL','HOD','DEPT_OFFICE')")
public class SubjectCloneController {

    private static final Set<UserRole> DEPT_ROLES = Set.of(UserRole.HOD, UserRole.DEPT_OFFICE);

    @Autowired private SubjectCloneService cloneService;
    @Autowired private UserRepository userRepository;
    @Autowired private DepartmentRepository departmentRepository;

    @PostMapping("/preview")
    public SubjectClonePreviewResponse preview(@RequestBody SubjectClonePreviewRequest req, Authentication auth) {
        Department dept = resolveDept(auth, req.getDeptId());
        validateYear(req.getSourceYear());
        validateYear(req.getTargetYear());
        return cloneService.preview(dept.getId(), req.getSourceYear(), req.getTargetYear(), req.getSemesters());
    }

    @PostMapping("/apply")
    public SubjectCloneResult apply(@RequestBody SubjectCloneApplyRequest req, Authentication auth) {
        Department dept = resolveDept(auth, req.getDeptId());
        validateYear(req.getTargetYear());
        return cloneService.apply(dept.getId(), req.getTargetYear(), req.getRows());
    }

    /** Department the caller may operate on — own dept for HOD/DEPT_OFFICE, any for ADMIN/PRINCIPAL. */
    private Department resolveDept(Authentication auth, Long requestedDeptId) {
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        User actor = userRepository.findById(auth.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
        if (DEPT_ROLES.contains(actor.getRole())) {
            if (actor.getDepartment() == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No department assigned to your account");
            }
            if (requestedDeptId != null && !requestedDeptId.equals(actor.getDepartment().getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Outside your department's scope.");
            }
            return actor.getDepartment();
        }
        if (requestedDeptId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department is required.");
        }
        return departmentRepository.findById(requestedDeptId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown department."));
    }

    private void validateYear(int year) {
        if (year < 2000 || year > Year.now().getValue() + 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Academic year " + year + " is out of range.");
        }
    }
}
