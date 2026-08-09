package com.college.backlog.controller;

import com.college.backlog.model.Student;
import com.college.backlog.repository.StudentRepository;
import com.college.backlog.security.JwtService;
import com.college.backlog.security.LoginThrottleService;
import com.college.backlog.security.SessionCookieService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/student/auth")
public class StudentAuthController {

    private static final String SCOPE = "STUDENT";

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private LoginThrottleService throttle;

    @Autowired
    private SessionCookieService sessionCookieService;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body,
                                     HttpServletRequest request, HttpServletResponse response) {

        String rollNo = body.getOrDefault("rollNo", "").trim();
        String dob = body.getOrDefault("dateOfBirth", "").trim();

        if (rollNo.isEmpty() || dob.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "USN and date of birth are required");
        }

        if (throttle.isLocked(SCOPE, rollNo, request)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many failed login attempts");
        }

        LocalDate dateOfBirth;
        try {
            dateOfBirth = LocalDate.parse(dob); // expects ISO yyyy-MM-dd
        } catch (DateTimeParseException e) {
            throttle.registerFailure(SCOPE, rollNo, request);
            throw invalidCredentials();
        }

        Student student = studentRepository.findByRollNo(rollNo).orElse(null);
        if (student == null
                || student.getDateOfBirth() == null
                || !student.getDateOfBirth().equals(dateOfBirth)) {
            throttle.registerFailure(SCOPE, rollNo, request);
            throw invalidCredentials();
        }

        throttle.clearFailures(SCOPE, rollNo, request);
        String token = jwtService.generateToken(student.getRollNo(), "STUDENT");
        sessionCookieService.write(response, SessionCookieService.STUDENT_COOKIE, token);

        Map<String, String> body2 = new HashMap<>();
        body2.put("message", "Login success");
        body2.put("expiresIn", String.valueOf(jwtService.secondsUntilExpiry(token)));
        body2.put("rollNo", student.getRollNo());
        body2.put("name", student.getName());
        return body2;
    }

    /** Log out: expire the student session cookie. */
    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletResponse response) {
        sessionCookieService.clear(response, SessionCookieService.STUDENT_COOKIE);
        Map<String, String> resp = new HashMap<>();
        resp.put("message", "Logged out");
        return resp;
    }

    /**
     * Slide the student session: re-mint a fresh-expiry token for an already-authenticated student
     * (a valid token must have authenticated the request), so an active one isn't logged out
     * mid-form at the 1h mark while an idle one falls back to re-login. The account is re-read,
     * so a since-deleted student cannot refresh.
     */
    @PostMapping("/refresh")
    public Map<String, String> refresh(HttpServletRequest request, HttpServletResponse response,
                                       Authentication auth) {
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        Student student = studentRepository.findByRollNo(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Student account not found"));
        String currentToken = sessionCookieService.read(request, SessionCookieService.STUDENT_COOKIE);
        // preserves the original session start and enforces the absolute cap
        String token = currentToken == null ? null
                : jwtService.refreshToken(currentToken, student.getRollNo(), "STUDENT");
        if (token == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired. Please sign in again.");
        }
        sessionCookieService.write(response, SessionCookieService.STUDENT_COOKIE, token);
        Map<String, String> resp = new HashMap<>();
        resp.put("expiresIn", String.valueOf(jwtService.secondsUntilExpiry(token)));
        resp.put("rollNo", student.getRollNo());
        resp.put("name", student.getName());
        return resp;
    }

    private ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid USN or date of birth");
    }
}
