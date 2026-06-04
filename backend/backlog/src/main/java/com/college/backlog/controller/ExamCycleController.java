package com.college.backlog.controller;

import com.college.backlog.controller.dto.ExamCycleRequest;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.ExamCycle;
import com.college.backlog.repository.ExamCycleRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/exam-cycles")
@PreAuthorize("hasAnyRole('ADMIN', 'PRINCIPAL', 'HOD', 'DEPT_OFFICE')")
public class ExamCycleController {

    @Autowired
    private ExamCycleRepository examCycleRepository;

    @GetMapping
    public List<ExamCycle> list() {
        return examCycleRepository.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExamCycle create(@Valid @RequestBody ExamCycleRequest request) {
        ExamCycle cycle = new ExamCycle(request.getName(), request.getExamMonthYear());
        return examCycleRepository.save(cycle);
    }

    @PutMapping("/{id}/activate")
    public ExamCycle activate(@PathVariable Long id) {
        ExamCycle target = examCycleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Exam cycle not found: " + id));

        // exactly one active cycle at a time
        List<ExamCycle> all = examCycleRepository.findAll();
        for (ExamCycle c : all) {
            c.setActive(c.getId().equals(id));
        }
        examCycleRepository.saveAll(all);
        target.setActive(true);
        return target;
    }
}
