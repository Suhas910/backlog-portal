package com.college.backlog.controller;

import com.college.backlog.model.Department;
import com.college.backlog.model.LoginAttempt;
import com.college.backlog.model.User;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.LoginAttemptRepository;
import com.college.backlog.repository.UserRepository;
import com.college.backlog.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_DURATION_SECONDS = 900;

    private static final Set<String> DEPT_ROLES = Set.of("HOD", "DEPT_OFFICE");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LoginAttemptRepository loginAttemptRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body, HttpServletRequest request) {

        String username = body.getOrDefault("username", "").trim();
        String password = body.getOrDefault("password", "");
        String clientIp = resolveClientIp(request);

        if (username.isEmpty() || password.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required");
        }

        if (isLocked(clientIp)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many failed login attempts");
        }

        User user = userRepository.findById(username).orElse(null);
        if (user == null) {
            registerFailure(clientIp);
            throw invalidCredentials(username);
        }

        if (!matchesPassword(user, password)) {
            registerFailure(clientIp);
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

        clearFailures(clientIp);
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

    private boolean isLocked(String ip) {
        LoginAttempt attempt = loginAttemptRepository.findById(ip).orElse(null);
        if (attempt == null || attempt.getLockedUntil() == null) {
            return false;
        }
        if (Instant.now().isAfter(attempt.getLockedUntil())) {
            loginAttemptRepository.delete(attempt);
            return false;
        }
        return true;
    }

    private void registerFailure(String ip) {
        LoginAttempt attempt = loginAttemptRepository.findById(ip)
                .orElse(new LoginAttempt(ip));
        attempt.setAttempts(attempt.getAttempts() + 1);
        if (attempt.getAttempts() >= MAX_FAILED_ATTEMPTS) {
            attempt.setLockedUntil(Instant.now().plusSeconds(LOCK_DURATION_SECONDS));
            attempt.setAttempts(0);
        }
        loginAttemptRepository.save(attempt);
    }

    private void clearFailures(String ip) {
        loginAttemptRepository.deleteById(ip);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // X-Forwarded-For may be a comma-separated list; the first entry is the original client
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
