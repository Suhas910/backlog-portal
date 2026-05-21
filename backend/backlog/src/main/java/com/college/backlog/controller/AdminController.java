package com.college.backlog.controller;

import com.college.backlog.controller.dto.SubjectCreateRequest;
import com.college.backlog.controller.dto.RegistrationSummaryResponse;
import com.college.backlog.model.Department;
import com.college.backlog.model.Registration;
import com.college.backlog.model.Subject;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.service.SubjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private RegistrationRepository registrationRepository;

    @Autowired
    private SubjectService subjectService;

    @Autowired
    private DepartmentRepository departmentRepository;

    @GetMapping("/registrations")
    public List<RegistrationSummaryResponse> getAllRegistrations() {
        List<Registration> registrations = registrationRepository.findAllByOrderByRegisteredAtDesc();

        return registrations.stream().map(reg -> new RegistrationSummaryResponse(
            reg.getRegId(),
            reg.getStudent().getRollNo(),
            reg.getStudent().getName(),
            reg.getStudent().getCurrentSemester(),
            reg.getStudent().getYearOfJoining(),
            reg.getSubjects().stream().map(Subject::getSubjectName).collect(Collectors.toList()),
            reg.getStatus(),
            reg.getRegisteredAt().toString()
        )).collect(Collectors.toList());
    }

    @PostMapping("/subjects")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('DEPT_OFFICE')")
    public Subject addSubject(@Valid @RequestBody SubjectCreateRequest request) {
        return subjectService.createSubject(request);
    }

    @GetMapping("/departments")
    @PreAuthorize("hasAuthority('DEPT_OFFICE')")
    public List<Department> getDepartments() {
        return departmentRepository.findAll();
    }
}
