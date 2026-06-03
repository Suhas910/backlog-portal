package com.college.backlog.controller;

import com.college.backlog.model.Subject;
import com.college.backlog.repository.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    @Autowired
    private SubjectRepository subjectRepository;

    @GetMapping
    public List<Subject> getSubjects(@RequestParam int year,
                                     @RequestParam int semester,
                                     @RequestParam Optional<String> branch) {
        List<Subject> all = subjectRepository.findByYearOfJoiningAndSemester(year, semester);

        if (branch.isEmpty() || branch.get().isBlank()) {
            return all;
        }

        String branchName = branch.get().trim();
        return all.stream().filter(s -> {
            if ("ELECTIVE".equals(s.getSubjectType())) {
                return s.getEligibleDepartments().stream()
                        .anyMatch(d -> branchName.equals(d.getDeptName()));
            } else {
                return s.getDepartment() != null && branchName.equals(s.getDepartment().getDeptName());
            }
        }).collect(Collectors.toList());
    }
}
