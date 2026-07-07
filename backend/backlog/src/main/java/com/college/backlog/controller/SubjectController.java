package com.college.backlog.controller;

import com.college.backlog.controller.dto.SubjectUpdateRequest;
import com.college.backlog.model.Subject;
import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
import com.college.backlog.repository.SubjectRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.service.SubjectService;
import com.college.backlog.service.SubjectSpecification;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.Set;

/**
 * View / edit / delete the subject catalog. Create lives in {@link AdminController}
 * (POST /api/admin/subjects); this adds the read-and-maintain side. Scope: ADMIN /
 * PRINCIPAL act on any department; HOD / DEPT_OFFICE are pinned to their own.
 */
@RestController
@RequestMapping("/api/admin/subjects")
@PreAuthorize("hasAnyRole('ADMIN','PRINCIPAL','HOD','DEPT_OFFICE')")
public class SubjectController {

    private static final Set<UserRole> DEPT_ROLES = Set.of(UserRole.HOD, UserRole.DEPT_OFFICE);

    // Page-size guards mirror AdminController: a cap so `size` can't be used to pull
    // the whole (ever-growing) catalog in one request, and a sane default page.
    private static final int MAX_PAGE_SIZE = 200;
    private static final int DEFAULT_PAGE_SIZE = 25;

    @Autowired private SubjectRepository subjectRepository;
    @Autowired private SubjectService subjectService;
    @Autowired private UserRepository userRepository;

    // Returns a Spring Page envelope ({content, totalPages, totalElements, number, ...}).
    // Previously an unbounded findAll, which timed out the client on an unfiltered
    // "load everything" once the catalog grew — hence pagination, matching /registrations.
    @GetMapping
    public Page<Subject> list(
            @RequestParam Optional<Long> deptId,
            @RequestParam Optional<Integer> academicYearOffered,
            @RequestParam Optional<Integer> semester,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            Authentication auth) {
        Long callerDeptId = resolveCallerDeptId(auth);
        // dept-scoped callers are pinned to their own department, ignoring any requested deptId
        Long effectiveDeptId = callerDeptId != null ? callerDeptId : deptId.orElse(null);
        SubjectSpecification spec = new SubjectSpecification(
            effectiveDeptId, academicYearOffered.orElse(null), semester.orElse(null));
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(
            Sort.Order.desc("academicYearOffered"),
            Sort.Order.asc("semester"),
            Sort.Order.asc("subjectName")));
        return subjectRepository.findAll(spec, pageable);
    }

    @PutMapping("/{id}")
    public Subject update(@PathVariable Long id,
                          @Valid @RequestBody SubjectUpdateRequest request,
                          Authentication auth) {
        return subjectService.updateSubject(id, request, resolveCallerDeptId(auth));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication auth) {
        subjectService.deleteSubject(id, resolveCallerDeptId(auth));
    }

    /** Dept id a dept-scoped caller is pinned to, or null for ADMIN/PRINCIPAL (unrestricted). */
    private Long resolveCallerDeptId(Authentication auth) {
        if (auth == null) return null;
        User user = userRepository.findById(auth.getName()).orElse(null);
        if (user == null || !DEPT_ROLES.contains(user.getRole()) || user.getDepartment() == null) {
            return null;
        }
        return user.getDepartment().getId();
    }
}
