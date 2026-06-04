package com.college.backlog.controller;

import com.college.backlog.controller.dto.RegistrationRequest;
import com.college.backlog.controller.dto.VerificationResponse;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.Registration;
import com.college.backlog.model.RegistrationEvent;
import com.college.backlog.model.User;
import com.college.backlog.repository.RegistrationEventRepository;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/register")
public class RegistrationController {

    private static final Set<String> DEPT_ROLES = Set.of("HOD", "DEPT_OFFICE");

    @Autowired
    private RegistrationService registrationService;

    @Autowired
    private RegistrationRepository registrationRepository;

    @Autowired
    private RegistrationEventRepository registrationEventRepository;

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
    public Map<String, String> register(@Valid @RequestBody RegistrationRequest request) {
        Registration reg = registrationService.register(
            request.getRollNo(), request.getName(), request.getEmail(),
            request.getPhone(), request.getCurrentSemester(),
            request.getSubjectIds()
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

        // state machine: only a pending registration can be actioned
        if (!"SUBMITTED".equals(reg.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This registration has already been actioned.");
        }

        String action = (body != null && "REJECTED".equals(body.get("action"))) ? "REJECTED" : "VERIFIED";
        reg.setStatus(action);

        String actor = authentication != null ? authentication.getName() : null;
        if (actor != null) {
            reg.setVerifiedBy(actor);
        }

        try {
            // @Version on Registration makes a concurrent action fail here instead of silently overwriting
            registrationRepository.saveAndFlush(reg);
        } catch (OptimisticLockingFailureException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This registration was just actioned by someone else.");
        }

        String actorRole = (actor != null)
            ? userRepository.findById(actor).map(User::getRole).orElse("ADMIN")
            : "ADMIN";
        registrationEventRepository.save(new RegistrationEvent(
            reg.getRegId(), action, actor, actorRole, null));

        return new VerificationResponse(
            reg.getRegId(),
            reg.getStudent().getName(),
            reg.getStudent().getRollNo(),
            reg.getStatus()
        );
    }

}