package com.college.backlog.controller;

import com.college.backlog.model.Student;
import com.college.backlog.repository.StudentRepository;
import com.college.backlog.security.JwtService;
import com.college.backlog.security.LoginThrottleService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/student/auth")
public class StudentAuthController {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private LoginThrottleService throttle;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body, HttpServletRequest request) {

        String rollNo = body.getOrDefault("rollNo", "").trim();
        String dob = body.getOrDefault("dateOfBirth", "").trim();
        String clientIp = throttle.resolveClientIp(request);

        if (rollNo.isEmpty() || dob.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "USN and date of birth are required");
        }

        if (throttle.isLocked(clientIp)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many failed login attempts");
        }

        LocalDate dateOfBirth;
        try {
            dateOfBirth = LocalDate.parse(dob); // expects ISO yyyy-MM-dd
        } catch (DateTimeParseException e) {
            throttle.registerFailure(clientIp);
            throw invalidCredentials();
        }

        Student student = studentRepository.findByRollNo(rollNo).orElse(null);
        if (student == null
                || student.getDateOfBirth() == null
                || !student.getDateOfBirth().equals(dateOfBirth)) {
            throttle.registerFailure(clientIp);
            throw invalidCredentials();
        }

        throttle.clearFailures(clientIp);
        String token = jwtService.generateToken(student.getRollNo(), "STUDENT");

        Map<String, String> response = new HashMap<>();
        response.put("message", "Login success");
        response.put("token", token);
        response.put("rollNo", student.getRollNo());
        response.put("name", student.getName());
        return response;
    }

    private ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid USN or date of birth");
    }
}
