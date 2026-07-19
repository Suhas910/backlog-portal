package com.college.backlog.controller;

import com.college.backlog.controller.dto.StudentRegistrationRequest;
import com.college.backlog.controller.dto.VerificationResponse;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.ActorRole;
import com.college.backlog.model.Registration;
import com.college.backlog.model.RegistrationStatus;
import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.service.ProctorScopeService;
import com.college.backlog.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
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
    private UserRepository userRepository;

    @Autowired
    private ProctorScopeService proctorScope;

    // Takes the already-loaded caller so verify doesn't fetch the same user row
    // twice (once for scoping, once for the audit actor role).
    private void checkDeptAccess(User user, Registration reg) {
        // a proctor's scope is the assigned STUDENT, not the subject's department
        if (user != null && user.getRole() == UserRole.PROCTOR) {
            proctorScope.assertSupervises(user, reg.getStudent().getRollNo());
            return;
        }
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
            request.getSubjectIds()
        );

        return Map.of(
            "regId", reg.getRegId(),
            "status", reg.getStatus().name()
        );
    }

    @PutMapping("/verify/{regId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD', 'DEPT_OFFICE', 'PROCTOR')")
    public VerificationResponse verifyRegistration(
            @PathVariable String regId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        Registration reg = registrationRepository.findByRegId(regId)
            .orElseThrow(() -> new ResourceNotFoundException("Registration not found with ID: " + regId));

        // load the caller once; used for both the scope check and the audit actor role
        User caller = authentication != null
            ? userRepository.findById(authentication.getName()).orElse(null)
            : null;
        checkDeptAccess(caller, reg);

        // require an explicit, known action — never default a typo to VERIFIED
        String requested = body != null ? body.get("action") : null;
        RegistrationStatus action;
        if ("VERIFIED".equals(requested)) {
            action = RegistrationStatus.VERIFIED;
        } else if ("REJECTED".equals(requested)) {
            action = RegistrationStatus.REJECTED;
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "action must be 'VERIFIED' or 'REJECTED'.");
        }

        String actor = authentication != null ? authentication.getName() : null;
        // UserRole is a subset of ActorRole by name, so the mapping is always valid.
        ActorRole actorRole = (caller != null)
            ? ActorRole.valueOf(caller.getRole().name())
            : ActorRole.ADMIN;

        // status flip + audit event committed atomically; the pending-state check
        // and the @Version optimistic-lock backstop both run inside that transaction
        reg = registrationService.applyVerification(regId, action, actor, actorRole);

        return new VerificationResponse(
            reg.getRegId(),
            reg.getStudent().getName(),
            reg.getStudent().getRollNo(),
            reg.getStatus().name()
        );
    }

}