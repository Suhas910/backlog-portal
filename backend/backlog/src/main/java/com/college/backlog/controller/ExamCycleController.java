package com.college.backlog.controller;

import com.college.backlog.controller.dto.ExamCycleRequest;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.ExamCycle;
import com.college.backlog.repository.ExamCycleRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/exam-cycles")
@PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
public class ExamCycleController {

    @Autowired
    private ExamCycleRepository examCycleRepository;

    // Read is also open to PROCTOR (the registrations page's cycle filter needs
    // the list); the method-level annotation overrides the class-level one.
    // Activate/deactivate below stay closed to proctors.
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE', 'PROCTOR')")
    public List<ExamCycle> list() {
        return examCycleRepository.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExamCycle create(@Valid @RequestBody ExamCycleRequest request) {
        ExamCycle cycle = new ExamCycle(request.getName(), request.getExamMonthYear());
        return examCycleRepository.save(cycle);
    }

    // Opens registrations for exactly this cycle: close whatever is open, then
    // open the target — atomically, so there is never more than one active cycle.
    @PutMapping("/{id}/activate")
    @Transactional
    public ExamCycle activate(@PathVariable Long id) {
        ExamCycle target = examCycleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Exam cycle not found: " + id));
        examCycleRepository.deactivateAll();
        target.setActive(true);
        return examCycleRepository.save(target);
    }

    // Ends the cycle (closes registrations). With no active cycle, the portal
    // reports registrations as closed.
    @PutMapping("/{id}/deactivate")
    @Transactional
    public ExamCycle deactivate(@PathVariable Long id) {
        ExamCycle target = examCycleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Exam cycle not found: " + id));
        target.setActive(false);
        return examCycleRepository.save(target);
    }
}
