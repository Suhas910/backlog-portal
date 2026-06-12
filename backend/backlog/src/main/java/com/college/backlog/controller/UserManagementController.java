package com.college.backlog.controller;

import com.college.backlog.controller.dto.CreateUserRequest;
import com.college.backlog.controller.dto.UserResponse;
import com.college.backlog.model.Department;
import com.college.backlog.model.User;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.security.TempPasswordGenerator;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Admin-facing user management. Authorization is enforced here on the server —
 * the UI only mirrors these rules.
 *
 * Who may manage whom:
 *   ADMIN      -> any user, any role
 *   PRINCIPAL  -> HOD and DEPT_OFFICE (any department)
 *   HOD        -> DEPT_OFFICE in the HOD's own department only
 *   DEPT_OFFICE-> no access
 *
 * Passwords are never returned. Create/reset issue a one-time temp password
 * (shown once) and force a change on next login. Self password changes go
 * through {@code POST /api/auth/change-password}, not this controller.
 */
@RestController
@RequestMapping("/api/admin/users")
public class UserManagementController {

    private static final Set<String> ALL_ROLES = Set.of("ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE");
    private static final Set<String> DEPT_ROLES = Set.of("HOD", "DEPT_OFFICE");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD')")
    public List<UserResponse> listUsers(Authentication auth) {
        User actor = requireActor(auth);
        return userRepository.findAll().stream()
                .filter(u -> !u.getUsername().equals(actor.getUsername())) // self managed via change-password
                .filter(u -> canManage(actor, u))
                .sorted((a, b) -> a.getUsername().compareToIgnoreCase(b.getUsername()))
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD')")
    public Map<String, String> createUser(@Valid @RequestBody CreateUserRequest req, Authentication auth) {
        User actor = requireActor(auth);

        String username = req.getUsername().trim();
        String role = req.getRole() == null ? "" : req.getRole().trim().toUpperCase();

        if (!ALL_ROLES.contains(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role");
        }
        if (!canManageRole(actor, role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to create this kind of user");
        }
        if (userRepository.existsById(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A user with that username already exists");
        }

        Department department = null;
        if (DEPT_ROLES.contains(role)) {
            if (req.getDepartmentId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department is required for this role");
            }
            department = departmentRepository.findById(req.getDepartmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown department"));
            // HOD may only create accounts within their own department.
            if ("HOD".equals(actor.getRole()) && !sameDept(actor, department.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only manage users in your own department");
            }
        }

        String tempPassword = TempPasswordGenerator.generate();
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setRole(role);
        user.setDepartment(department);
        user.setMustChangePassword(true);
        userRepository.save(user);

        return tempPasswordResponse(user, tempPassword);
    }

    @PostMapping("/{username}/reset")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD')")
    public Map<String, String> resetPassword(@PathVariable String username, Authentication auth) {
        User actor = requireActor(auth);
        User target = loadManageableTarget(actor, username);

        if (target.getUsername().equals(actor.getUsername())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use Change Password to update your own account");
        }

        String tempPassword = TempPasswordGenerator.generate();
        target.setPassword(passwordEncoder.encode(tempPassword));
        target.setMustChangePassword(true);
        userRepository.save(target);

        return tempPasswordResponse(target, tempPassword);
    }

    @DeleteMapping("/{username}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD')")
    public Map<String, String> deleteUser(@PathVariable String username, Authentication auth) {
        User actor = requireActor(auth);
        User target = loadManageableTarget(actor, username);

        if (target.getUsername().equals(actor.getUsername())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot delete your own account");
        }
        // Never allow the system to be left with no administrator.
        if ("ADMIN".equals(target.getRole()) && userRepository.countByRole("ADMIN") <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete the last administrator account");
        }

        userRepository.delete(target);
        Map<String, String> resp = new HashMap<>();
        resp.put("message", "User deleted");
        resp.put("username", target.getUsername());
        return resp;
    }

    // ---- helpers ----

    private User requireActor(Authentication auth) {
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return userRepository.findById(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
    }

    /** Loads a target the actor is allowed to manage, or throws 404/403. */
    private User loadManageableTarget(User actor, String username) {
        User target = userRepository.findById(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (!canManage(actor, target)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to manage this user");
        }
        return target;
    }

    private boolean canManage(User actor, User target) {
        if (!canManageRole(actor, target.getRole())) {
            return false;
        }
        // HOD is additionally constrained to their own department.
        if ("HOD".equals(actor.getRole())) {
            Long deptId = target.getDepartment() == null ? null : target.getDepartment().getId();
            return deptId != null && sameDept(actor, deptId);
        }
        return true;
    }

    private boolean canManageRole(User actor, String targetRole) {
        switch (actor.getRole()) {
            case "ADMIN":
                return ALL_ROLES.contains(targetRole);
            case "PRINCIPAL":
                return DEPT_ROLES.contains(targetRole);
            case "HOD":
                return "DEPT_OFFICE".equals(targetRole);
            default:
                return false;
        }
    }

    private boolean sameDept(User actor, Long deptId) {
        return actor.getDepartment() != null && actor.getDepartment().getId().equals(deptId);
    }

    private Map<String, String> tempPasswordResponse(User user, String tempPassword) {
        Map<String, String> resp = new HashMap<>();
        resp.put("username", user.getUsername());
        resp.put("role", user.getRole());
        resp.put("tempPassword", tempPassword);
        if (user.getDepartment() != null) {
            resp.put("departmentName", user.getDepartment().getDeptName());
        }
        return resp;
    }
}
