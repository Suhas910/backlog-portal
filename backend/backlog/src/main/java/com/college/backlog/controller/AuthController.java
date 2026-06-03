package com.college.backlog.controller;

import com.college.backlog.model.Department;
import com.college.backlog.model.User;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_DURATION_SECONDS = 900;

    private final ConcurrentHashMap<String, Integer> failedAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> lockedUntil = new ConcurrentHashMap<>();

    private static final Set<String> DEPT_ROLES = Set.of("HOD", "DEPT_OFFICE");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body) {

        String username = body.getOrDefault("username", "").trim();
        String password = body.getOrDefault("password", "");

        if (username.isEmpty() || password.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required");
        }

        if (isLocked(username)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many failed login attempts");
        }

        User user = userRepository.findById(username)
                .orElseThrow(() -> invalidCredentials(username));

        if (!matchesPassword(user, password)) {
            registerFailure(username);
            throw invalidCredentials(username);
        }

        if (DEPT_ROLES.contains(user.getRole())) {
            if (user.getDepartment() == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No department assigned to this account. Contact admin.");
            }
            String requestedDeptId = body.get("departmentId");
            if (requestedDeptId != null && !requestedDeptId.isBlank()) {
                try {
                    long reqId = Long.parseLong(requestedDeptId);
                    if (reqId != user.getDepartment().getId()) {
                        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid department for this account");
                    }
                } catch (NumberFormatException e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid departmentId format");
                }
            }
        }

        clearFailures(username);
        String token = jwtService.generateToken(user.getUsername(), user.getRole());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Login success");
        response.put("role", user.getRole());
        response.put("token", token);
        if (user.getDepartment() != null) {
            response.put("departmentId", String.valueOf(user.getDepartment().getId()));
            response.put("departmentName", user.getDepartment().getDeptName());
        }
        return response;
    }

    private boolean matchesPassword(User user, String rawPassword) {
        String storedPassword = user.getPassword();

        if (storedPassword == null || storedPassword.isBlank()) {
            return false;
        }

        if (isBcryptHash(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }

        boolean plainMatch = storedPassword.equals(rawPassword);
        if (plainMatch) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }
        return plainMatch;
    }

    private boolean isBcryptHash(String value) {
        return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
    }

    private ResponseStatusException invalidCredentials(String username) {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
    }

    private boolean isLocked(String username) {
        Instant lockExpiry = lockedUntil.get(username);
        if (lockExpiry == null) {
            return false;
        }
        if (Instant.now().isAfter(lockExpiry)) {
            lockedUntil.remove(username);
            failedAttempts.remove(username);
            return false;
        }
        return true;
    }

    private void registerFailure(String username) {
        int attempts = failedAttempts.merge(username, 1, Integer::sum);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            lockedUntil.put(username, Instant.now().plusSeconds(LOCK_DURATION_SECONDS));
            failedAttempts.remove(username);
        }
    }

    private void clearFailures(String username) {
        failedAttempts.remove(username);
        lockedUntil.remove(username);
    }
}
