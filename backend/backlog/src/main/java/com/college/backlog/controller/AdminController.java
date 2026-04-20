package com.college.backlog.controller;

import com.college.backlog.model.Registration;
import com.college.backlog.repository.RegistrationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:5173")
public class AdminController {

    @Autowired
    private RegistrationRepository registrationRepository;

    @GetMapping("/registrations")
    public List<Map<String, Object>> getAllRegistrations() {
        List<Registration> registrations = registrationRepository.findAll();

        return registrations.stream().map(reg -> Map.of(
            "regId", reg.getRegId(),
            "qrToken", reg.getQrToken(),
            "rollNo", reg.getStudent().getRollNo(),
            "studentName", reg.getStudent().getName(),
            "semester", reg.getStudent().getCurrentSemester(),
            "yearOfJoining", reg.getStudent().getYearOfJoining(),
            "subjects", reg.getSubjects().stream()
                .map(s -> s.getSubjectName()).collect(Collectors.toList()),
            "status", reg.getStatus(),
            "registeredAt", reg.getRegisteredAt().toString()
        )).collect(Collectors.toList());
    }
}
