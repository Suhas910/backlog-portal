package com.college.backlog.controller;

import com.college.backlog.model.ExamCycle;
import com.college.backlog.repository.ExamCycleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Public endpoint so the registration page can tell upfront whether registrations
 * are open. Registrations are accepted only while an exam cycle is active
 * (see RegistrationService#register), so "open" mirrors that single source of truth.
 */
@RestController
@RequestMapping("/api/registration-status")
public class RegistrationStatusController {

    @Autowired
    private ExamCycleRepository examCycleRepository;

    @GetMapping
    public Map<String, Object> status() {
        Map<String, Object> response = new HashMap<>();
        ExamCycle cycle = examCycleRepository.findByActiveTrue().orElse(null);
        if (cycle == null) {
            response.put("open", false);
            return response;
        }
        response.put("open", true);
        response.put("cycleName", cycle.getName());
        response.put("examMonthYear", cycle.getExamMonthYear());
        return response;
    }
}
