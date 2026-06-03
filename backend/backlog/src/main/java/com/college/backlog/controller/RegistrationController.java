package com.college.backlog.controller;

import com.college.backlog.controller.dto.RegistrationDetailsResponse;
import com.college.backlog.controller.dto.RegistrationRequest;
import com.college.backlog.controller.dto.VerificationResponse;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.Registration;
import com.college.backlog.model.User;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.service.RegistrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/register")
public class RegistrationController {

    private static final Set<String> DEPT_ROLES = Set.of("HOD", "DEPT_OFFICE");

    @Autowired
    private RegistrationService registrationService;

    @Autowired
    private RegistrationRepository registrationRepository;

    @Autowired
    private UserRepository userRepository;

    private void checkDeptAccess(Authentication auth, Registration reg) {
        if (auth == null) return;
        User user = userRepository.findById(auth.getName()).orElse(null);
        if (user == null || !DEPT_ROLES.contains(user.getRole())) return;
        if (user.getDepartment() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No department assigned to your account");
        }
        Long userDeptId = user.getDepartment().getId();
        boolean hasAccess = reg.getSubjects().stream().anyMatch(s -> {
            if (s.getDepartment() != null && userDeptId.equals(s.getDepartment().getId())) return true;
            return s.getEligibleDepartments() != null &&
                   s.getEligibleDepartments().stream().anyMatch(d -> userDeptId.equals(d.getId()));
        });
        if (!hasAccess) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This registration does not belong to your department");
        }
    }

    @PostMapping
    public Map<String, String> register(@RequestBody RegistrationRequest request) {
        Registration reg = registrationService.register(
            request.getRollNo(), request.getName(), request.getEmail(),
            request.getPhone(), request.getYearOfJoining(), request.getCurrentSemester(),
            request.getBranch(), request.getSubjectIds()
        );

        return Map.of(
            "regId", reg.getRegId(),
            "status", reg.getStatus()
        );
    }

    @PutMapping("/verify/{regId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD', 'DEPT_OFFICE')")
    public VerificationResponse verifyRegistration(
            @PathVariable String regId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        Registration reg = registrationRepository.findByRegId(regId)
            .orElseThrow(() -> new ResourceNotFoundException("Registration not found with ID: " + regId));

        checkDeptAccess(authentication, reg);

        String action = (body != null && "REJECTED".equals(body.get("action"))) ? "REJECTED" : "VERIFIED";
        reg.setStatus(action);
        if (authentication != null) {
            reg.setVerifiedBy(authentication.getName());
        }
        registrationRepository.save(reg);

        return new VerificationResponse(
            reg.getRegId(),
            reg.getStudent().getName(),
            reg.getStudent().getRollNo(),
            reg.getStatus()
        );
    }

    @GetMapping("/verify/{regId}")
    public RegistrationDetailsResponse getRegistrationById(@PathVariable String regId, Authentication authentication) {
        Registration reg = registrationRepository.findByRegId(regId)
            .orElseThrow(() -> new ResourceNotFoundException("Registration not found with ID: " + regId));

        checkDeptAccess(authentication, reg);

        List<String> subjectNames = reg.getSubjects()
            .stream()
            .map(s -> s.getSubjectName())
            .collect(Collectors.toList());

        return new RegistrationDetailsResponse(
            reg.getRegId(),
            reg.getStudent().getName(),
            reg.getStudent().getRollNo(),
            reg.getStudent().getEmail(),
            reg.getStudent().getCurrentSemester(),
            reg.getStudent().getYearOfJoining(),
            subjectNames,
            reg.getStatus(),
            reg.getRegisteredAt().toString()
        );
    }
}