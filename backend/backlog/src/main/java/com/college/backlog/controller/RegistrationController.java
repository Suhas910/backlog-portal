package com.college.backlog.controller;

import com.college.backlog.model.Registration;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.service.RegistrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/register")
public class RegistrationController {

    @Autowired
    private RegistrationService registrationService;

    @Autowired
    private RegistrationRepository registrationRepository;

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
            "status", reg.getStatus()
        );
    }

    @PutMapping("/verify/{regId}")
    public Map<String, String> verifyRegistration(@PathVariable String regId) {
        Registration reg = registrationRepository.findByRegId(regId)
            .orElseThrow(() -> new RuntimeException("Registration not found with ID: " + regId));

        reg.setStatus("VERIFIED");
        registrationRepository.save(reg);

        return Map.of(
        "regId", reg.getRegId(),
        "studentName", reg.getStudent().getName(),
        "rollNo", reg.getStudent().getRollNo(),
        "status", "VERIFIED"
    );
}

    @GetMapping("/verify/{regId}")
    public Map<String, Object> getRegistrationById(@PathVariable String regId) {
        Registration reg = registrationRepository.findByRegId(regId)
            .orElseThrow(() -> new RuntimeException("Registration not found with ID: " + regId));

        List<String> subjectNames = reg.getSubjects()
        .stream()
        .map(s -> s.getSubjectName())
        .toList();

    return Map.of(
        "regId", reg.getRegId(),
        "studentName", reg.getStudent().getName(),
        "rollNo", reg.getStudent().getRollNo(),
        "email", reg.getStudent().getEmail(),
        "semester", reg.getStudent().getCurrentSemester(),
        "yearOfJoining", reg.getStudent().getYearOfJoining(),
        "subjects", subjectNames,
            "status", reg.getStatus(),
            "registeredAt", reg.getRegisteredAt().toString()
    );
}
}