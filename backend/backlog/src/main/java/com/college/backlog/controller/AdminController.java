package com.college.backlog.controller;

import com.college.backlog.controller.dto.DepartmentRequest;
import com.college.backlog.controller.dto.SubjectCreateRequest;
import com.college.backlog.controller.dto.RegistrationSummaryResponse;
import com.college.backlog.controller.dto.RegistrationEventResponse;
import com.college.backlog.exception.ResourceNotFoundException;
import org.springframework.web.server.ResponseStatusException;
import com.college.backlog.model.Department;
import com.college.backlog.model.ExamCycle;
import com.college.backlog.model.Registration;
import com.college.backlog.model.RegistrationStatus;
import com.college.backlog.model.Subject;
import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.ExamCycleRepository;
import com.college.backlog.repository.RegistrationEventRepository;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.repository.SubjectRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.service.RegistrationSpecification;
import com.college.backlog.service.PdfService;
import com.college.backlog.service.SubjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final java.util.Set<UserRole> DEPT_ROLES = java.util.Set.of(UserRole.HOD, UserRole.DEPT_OFFICE);

    @Autowired
    private RegistrationRepository registrationRepository;

    @Autowired
    private SubjectService subjectService;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PdfService pdfService;

    @Autowired
    private RegistrationEventRepository registrationEventRepository;

    @Autowired
    private ExamCycleRepository examCycleRepository;

    private Long resolveCallerDeptId(Authentication auth) {
        if (auth == null) return null;
        User user = userRepository.findById(auth.getName()).orElse(null);
        if (user == null || !DEPT_ROLES.contains(user.getRole()) || user.getDepartment() == null) return null;
        return user.getDepartment().getId();
    }

    // Max page size a client can request — a guard so `size` can't be used to pull
    // the whole (append-only, ever-growing) table in one shot.
    private static final int MAX_PAGE_SIZE = 200;
    private static final int DEFAULT_PAGE_SIZE = 25;

    @GetMapping("/registrations")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
    public Page<RegistrationSummaryResponse> getFilteredRegistrations(
            @RequestParam Optional<Long> subjectId,
            @RequestParam Optional<String> subjectType,
            @RequestParam Optional<String> searchQuery,
            @RequestParam Optional<LocalDate> startDate,
            @RequestParam Optional<LocalDate> endDate,
            @RequestParam Optional<Long> examCycleId,
            @RequestParam Optional<String> status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            Authentication authentication
    ) {
        Long callerDeptId = resolveCallerDeptId(authentication);
        Specification<Registration> spec = new RegistrationSpecification(
                subjectId.orElse(null),
                callerDeptId,
                subjectType.orElse(null),
                searchQuery.orElse(null),
                startDate.orElse(null),
                endDate.orElse(null),
                examCycleId.orElse(null),
                parseStatus(status.orElse(null)));

        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "registeredAt"));
        return registrationRepository.findAll(spec, pageable).map(this::toSummary);
    }

    // Status-bucketed counts for the dashboard stat cards, over the SAME filters as
    // the list but WITHOUT the status filter — so the cards show the totals for the
    // filtered set regardless of which status tab is open. Cheap count queries; no
    // rows hydrated.
    @GetMapping("/registrations/summary-counts")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
    public Map<String, Long> getRegistrationSummaryCounts(
            @RequestParam Optional<Long> subjectId,
            @RequestParam Optional<String> subjectType,
            @RequestParam Optional<String> searchQuery,
            @RequestParam Optional<LocalDate> startDate,
            @RequestParam Optional<LocalDate> endDate,
            @RequestParam Optional<Long> examCycleId,
            Authentication authentication
    ) {
        Long callerDeptId = resolveCallerDeptId(authentication);
        long submitted = countByStatus(subjectId, callerDeptId, subjectType, searchQuery, startDate, endDate, examCycleId, RegistrationStatus.SUBMITTED);
        long verified = countByStatus(subjectId, callerDeptId, subjectType, searchQuery, startDate, endDate, examCycleId, RegistrationStatus.VERIFIED);
        long rejected = countByStatus(subjectId, callerDeptId, subjectType, searchQuery, startDate, endDate, examCycleId, RegistrationStatus.REJECTED);
        return Map.of(
            "total", submitted + verified + rejected,
            "submitted", submitted,
            "verified", verified,
            "rejected", rejected);
    }

    private long countByStatus(Optional<Long> subjectId, Long callerDeptId, Optional<String> subjectType,
                               Optional<String> searchQuery, Optional<LocalDate> startDate, Optional<LocalDate> endDate,
                               Optional<Long> examCycleId, RegistrationStatus status) {
        return registrationRepository.count(new RegistrationSpecification(
                subjectId.orElse(null), callerDeptId, subjectType.orElse(null), searchQuery.orElse(null),
                startDate.orElse(null), endDate.orElse(null), examCycleId.orElse(null), status));
    }

    /** Parse the optional status filter; blank/absent means "all statuses". 400 on an unknown value. */
    private RegistrationStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return RegistrationStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown status filter: " + status);
        }
    }

    private RegistrationSummaryResponse toSummary(Registration reg) {
        return new RegistrationSummaryResponse(
            reg.getRegId(),
            reg.getStudent().getRollNo(),
            reg.getSnapName() != null ? reg.getSnapName() : reg.getStudent().getName(),
            reg.getSnapSemester() != null ? reg.getSnapSemester() : reg.getStudent().getCurrentSemester(),
            reg.getSnapYearOfJoining() != null ? reg.getSnapYearOfJoining() : reg.getStudent().getYearOfJoining(),
            reg.getSubjects().stream().map(Subject::getSubjectName).collect(Collectors.toList()),
            reg.getStatus().name(),
            reg.getRegisteredAt().toString(),
            reg.getVerifiedBy(),
            reg.getExamCycle() != null ? reg.getExamCycle().getName() : null);
    }

    @GetMapping("/registrations/{regId}/events")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
    public List<RegistrationEventResponse> getRegistrationEvents(@PathVariable String regId) {
        return registrationEventRepository.findByRegIdOrderByTimestampAsc(regId).stream()
            .map(e -> new RegistrationEventResponse(
                e.getAction() != null ? e.getAction().name() : null,
                e.getActor(),
                e.getActorRole() != null ? e.getActorRole().name() : null,
                e.getTimestamp() != null ? e.getTimestamp().toString() : null,
                e.getNote()))
            .collect(Collectors.toList());
    }

    @PostMapping("/subjects")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
    public Subject addSubject(@Valid @RequestBody SubjectCreateRequest request, Authentication authentication) {
        // dept-scoped roles (HOD / DEPT_OFFICE) may only create subjects for their own
        // department — enforced here on the server, not just pinned in the UI.
        Long callerDeptId = resolveCallerDeptId(authentication);
        if (callerDeptId != null && !callerDeptId.equals(request.getDeptId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You can only add subjects for your own department.");
        }
        return subjectService.createSubject(request);
    }

    // Read is open to all admin-type roles (matches the other read endpoints here);
    // creating/editing departments below stays restricted to ADMIN/PRINCIPAL.
    @GetMapping("/departments")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
    public List<Department> getDepartments() {
        return departmentRepository.findAll(Sort.by("deptName"));
    }

    @PostMapping("/departments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL')")
    public Department addDepartment(@Valid @RequestBody DepartmentRequest request) {
        String code = request.getCode().trim().toUpperCase();
        if (departmentRepository.existsByCodeIgnoreCase(code)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "A department with code '" + code + "' already exists.");
        }
        Department dept = new Department();
        dept.setDeptName(request.getDeptName().trim());
        dept.setCode(code);
        dept.setContactEmail(request.getContactEmail() != null ? request.getContactEmail().trim() : null);
        return departmentRepository.save(dept);
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL')")
    public Department updateDepartment(@PathVariable Long id, @Valid @RequestBody DepartmentRequest request) {
        Department dept = departmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + id));
        // Conflict detection: the @Version lock only guards a race within this
        // request — it can't catch a stale-page overwrite, because we just loaded
        // the *current* row. So compare the version the client last saw against the
        // current one and reject if another admin has saved in between.
        if (request.getVersion() != null && !request.getVersion().equals(dept.getVersion())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This department was changed by someone else. Reload and try again.");
        }
        String code = request.getCode().trim().toUpperCase();
        // allow keeping the same code; only block if another department already owns it
        departmentRepository.findByCodeIgnoreCase(code).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A department with code '" + code + "' already exists.");
            }
        });
        dept.setDeptName(request.getDeptName().trim());
        dept.setCode(code);
        dept.setContactEmail(request.getContactEmail() != null ? request.getContactEmail().trim() : null);
        try {
            // saveAndFlush so a genuine concurrent write surfaces here as an
            // optimistic-lock failure (the @Version backstop for the narrow window
            // between the check above and the flush), not later. Rethrown as 409 —
            // otherwise the generic handler would map it to a 500.
            return departmentRepository.saveAndFlush(dept);
        } catch (ObjectOptimisticLockingFailureException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This department was just changed by someone else. Reload and try again.");
        }
    }

    @GetMapping("/all-subjects")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll(Sort.by("subjectName"));
    }

    @GetMapping("/subjects-for-filter")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
    public List<Subject> getSubjectsForFilter(
            @RequestParam Optional<String> subjectType,
            @RequestParam Optional<String> searchQuery,
            @RequestParam Optional<LocalDate> startDate,
            @RequestParam Optional<LocalDate> endDate,
            Authentication authentication
    ) {
        Long callerDeptId = resolveCallerDeptId(authentication);
        return subjectService.findDistinctSubjectsByRegistrationFilters(
                callerDeptId,
                subjectType.orElse(null),
                searchQuery.orElse(null),
                startDate.orElse(null),
                endDate.orElse(null));
    }

    @GetMapping("/export-pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
    public void exportRegistrationsPdf(
            @RequestParam Optional<Long> subjectId,
            @RequestParam Optional<String> subjectType,
            @RequestParam Optional<String> searchQuery,
            @RequestParam Optional<LocalDate> startDate,
            @RequestParam Optional<LocalDate> endDate,
            @RequestParam Optional<Long> examCycleId,
            Authentication authentication,
            HttpServletResponse response
    ) throws Exception {
        Long callerDeptId = resolveCallerDeptId(authentication);

        // Scope to a single exam cycle: the one explicitly selected, else the active
        // cycle. Without this the report would span every cycle. If nothing is
        // selected and no cycle is active, there is nothing to export.
        Long effectiveCycleId = examCycleId.orElseGet(() ->
                examCycleRepository.findByActiveTrue().map(ExamCycle::getId).orElse(null));

        List<Registration> registrations;
        if (effectiveCycleId == null) {
            registrations = List.of();
        } else {
            // the summary report covers only verified registrations — push the status
            // filter into the query so only those rows are hydrated (never load
            // pending/rejected just to discard them)
            Specification<Registration> spec = new RegistrationSpecification(
                    subjectId.orElse(null),
                    callerDeptId,
                    subjectType.orElse(null),
                    searchQuery.orElse(null),
                    startDate.orElse(null),
                    endDate.orElse(null),
                    effectiveCycleId,
                    RegistrationStatus.VERIFIED);

            registrations = registrationRepository
                    .findAll(spec, Sort.by(Sort.Direction.DESC, "registeredAt"));
        }

        // Stream the PDF straight to the response — no full-document byte[] buffered
        // in heap. Set headers before the first byte is written.
        response.setContentType(MediaType.APPLICATION_PDF_VALUE);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"registrations-summary.pdf\"");
        pdfService.generateRegistrationsSummaryPdf(registrations, response.getOutputStream());
    }
}
