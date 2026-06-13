package com.college.backlog.controller;

import com.college.backlog.controller.dto.DepartmentRequest;
import com.college.backlog.controller.dto.SubjectCreateRequest;
import com.college.backlog.controller.dto.RegistrationSummaryResponse;
import com.college.backlog.controller.dto.RegistrationEventResponse;
import com.college.backlog.exception.ResourceNotFoundException;
import org.springframework.web.server.ResponseStatusException;
import com.college.backlog.model.Department;
import com.college.backlog.model.Registration;
import com.college.backlog.model.Subject;
import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.RegistrationEventRepository;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.repository.SubjectRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.service.RegistrationSpecification;
import com.college.backlog.service.PdfService;
import com.college.backlog.service.SubjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
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

    private Long resolveCallerDeptId(Authentication auth) {
        if (auth == null) return null;
        User user = userRepository.findById(auth.getName()).orElse(null);
        if (user == null || !DEPT_ROLES.contains(user.getRole()) || user.getDepartment() == null) return null;
        return user.getDepartment().getId();
    }

    @GetMapping("/registrations")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
    public List<RegistrationSummaryResponse> getFilteredRegistrations(
            @RequestParam Optional<Long> subjectId,
            @RequestParam Optional<String> subjectType,
            @RequestParam Optional<String> searchQuery,
            @RequestParam Optional<LocalDate> startDate,
            @RequestParam Optional<LocalDate> endDate,
            @RequestParam Optional<Long> examCycleId,
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
                examCycleId.orElse(null));

        List<Registration> registrations = registrationRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "registeredAt"));
        return registrations.stream().map(reg -> new RegistrationSummaryResponse(
            reg.getRegId(),
            reg.getStudent().getRollNo(),
            reg.getSnapName() != null ? reg.getSnapName() : reg.getStudent().getName(),
            reg.getSnapSemester() != null ? reg.getSnapSemester() : reg.getStudent().getCurrentSemester(),
            reg.getSnapYearOfJoining() != null ? reg.getSnapYearOfJoining() : reg.getStudent().getYearOfJoining(),
            reg.getSubjects().stream().map(Subject::getSubjectName).collect(Collectors.toList()),
            reg.getStatus().name(),
            reg.getRegisteredAt().toString(),
            reg.getVerifiedBy(),
            reg.getExamCycle() != null ? reg.getExamCycle().getName() : null
        )).collect(Collectors.toList());
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
    @PreAuthorize("hasAnyRole('ADMIN', 'DEPT_OFFICE')")
    public Subject addSubject(@Valid @RequestBody SubjectCreateRequest request) {
        return subjectService.createSubject(request);
    }

    @GetMapping("/departments")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'DEPT_OFFICE')")
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
        return departmentRepository.save(dept);
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
    public ResponseEntity<byte[]> exportRegistrationsPdf(
            @RequestParam Optional<Long> subjectId,
            @RequestParam Optional<String> subjectType,
            @RequestParam Optional<String> searchQuery,
            @RequestParam Optional<LocalDate> startDate,
            @RequestParam Optional<LocalDate> endDate,
            @RequestParam Optional<Long> examCycleId,
            Authentication authentication
    ) throws Exception {
        Long callerDeptId = resolveCallerDeptId(authentication);
        Specification<Registration> spec = new RegistrationSpecification(
                subjectId.orElse(null),
                callerDeptId,
                subjectType.orElse(null),
                searchQuery.orElse(null),
                startDate.orElse(null),
                endDate.orElse(null),
                examCycleId.orElse(null));

        List<Registration> registrations = registrationRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "registeredAt"));
        byte[] pdfBytes = pdfService.generateRegistrationsSummaryPdf(registrations);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "registrations-summary.pdf");

        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }
}
