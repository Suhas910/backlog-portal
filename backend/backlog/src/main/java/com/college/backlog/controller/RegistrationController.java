package com.college.backlog.controller;

import com.college.backlog.model.Registration;
import com.college.backlog.service.RegistrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/register")
@CrossOrigin(origins = "http://localhost:5173")
public class RegistrationController {

    @Autowired
    private RegistrationService registrationService;

    @PostMapping
    public Map<String, String> register(@RequestBody Map<String, Object> body) {

        String rollNo = (String) body.get("rollNo");
        String name = (String) body.get("name");
        String email = (String) body.get("email");
        String phone = (String) body.get("phone");
        int yearOfJoining = (Integer) body.get("yearOfJoining");
        int currentSemester = (Integer) body.get("currentSemester");

        List<Long> subjectIds = ((List<Integer>) body.get("subjectIds"))
            .stream()
            .map(Long::valueOf)
            .toList();

        Registration reg = registrationService.register(
            rollNo, name, email, phone, yearOfJoining, currentSemester, subjectIds
        );

        return Map.of(
            "regId", reg.getRegId(),
            "qrToken", reg.getQrToken(),
            "status", reg.getStatus()
        );
    }
}