package com.college.backlog.controller;

import com.college.backlog.controller.dto.StudentRegistrationRequest;
import com.college.backlog.controller.dto.VerificationResponse;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.ActorRole;
import com.college.backlog.model.EventAction;
import com.college.backlog.model.Registration;
import com.college.backlog.model.RegistrationEvent;
import com.college.backlog.model.RegistrationStatus;
import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
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

    private static final Set<UserRole> DEPT_ROLES = Set.of(UserRole.HOD, UserRole.DEPT_OFFICE);

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
    @PreAuthorize("hasRole('STUDENT')")
    public Map<String, String> register(@Valid @RequestBody StudentRegistrationRequest request,
                                        Authentication authentication) {
        // owner is taken from the authenticated token, never from the request body
        Registration reg = registrationService.register(
            authentication.getName(),
            request.getCurrentSemester(),
            request.getSubjectIds()
        );

        return Map.of(
            "regId", reg.getRegId(),
            "status", reg.getStatus().name()
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
        if (reg.getStatus() != RegistrationStatus.SUBMITTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This registration has already been actioned.");
        }

        RegistrationStatus action = (body != null && "REJECTED".equals(body.get("action")))
            ? RegistrationStatus.REJECTED : RegistrationStatus.VERIFIED;
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

        // UserRole is a subset of ActorRole by name, so the mapping is always valid.
        ActorRole actorRole = (actor != null)
            ? userRepository.findById(actor)
                .map(u -> ActorRole.valueOf(u.getRole().name())).orElse(ActorRole.ADMIN)
            : ActorRole.ADMIN;
        registrationEventRepository.save(new RegistrationEvent(
            reg.getRegId(), EventAction.valueOf(action.name()), actor, actorRole, null));

        return new VerificationResponse(
            reg.getRegId(),
            reg.getStudent().getName(),
            reg.getStudent().getRollNo(),
            reg.getStatus().name()
        );
    }

}