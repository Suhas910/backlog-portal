package com.college.backlog.controller;

import com.college.backlog.controller.dto.RegistrationDetailsResponse;
import com.college.backlog.controller.dto.RegistrationRequest;
import com.college.backlog.controller.dto.VerificationResponse;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.Registration;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.service.RegistrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/register")
public class RegistrationController {

    @Autowired
    private RegistrationService registrationService;

    @Autowired
    private RegistrationRepository registrationRepository;

    @PostMapping
    public Map<String, String> register(@RequestBody RegistrationRequest request) {
        Registration reg = registrationService.register(
            request.getRollNo(), request.getName(), request.getEmail(),
            request.getPhone(), request.getYearOfJoining(), request.getCurrentSemester(),
            request.getBranch(), request.getSubjectIds()
        );

        return Map.of(
            "regId", reg.getRegId(),
            "status", reg.getStatus()
        );
    }

    @PutMapping("/verify/{regId}")
    public VerificationResponse verifyRegistration(@PathVariable String regId) {
        Registration reg = registrationRepository.findByRegId(regId)
            .orElseThrow(() -> new ResourceNotFoundException("Registration not found with ID: " + regId));

        reg.setStatus("VERIFIED");
        registrationRepository.save(reg);

        return new VerificationResponse(
            reg.getRegId(),
            reg.getStudent().getName(),
            reg.getStudent().getRollNo(),
            reg.getStatus()
        );
    }

    @GetMapping("/verify/{regId}")
    public RegistrationDetailsResponse getRegistrationById(@PathVariable String regId) {
        Registration reg = registrationRepository.findByRegId(regId)
            .orElseThrow(() -> new ResourceNotFoundException("Registration not found with ID: " + regId));

        List<String> subjectNames = reg.getSubjects()
            .stream()
            .map(s -> s.getSubjectName())
            .collect(Collectors.toList());

        return new RegistrationDetailsResponse(
            reg.getRegId(),
            reg.getStudent().getName(),
            reg.getStudent().getRollNo(),
            reg.getStudent().getEmail(),
            reg.getStudent().getCurrentSemester(),
            reg.getStudent().getYearOfJoining(),
            subjectNames,
            reg.getStatus(),
            reg.getRegisteredAt().toString()
        );
    }
}