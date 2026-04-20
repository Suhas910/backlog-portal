package com.college.backlog.controller;

import com.college.backlog.model.Subject;
import com.college.backlog.repository.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    @Autowired
    private SubjectRepository subjectRepository;

    @GetMapping
    public List<Subject> getSubjects(@RequestParam int year,
                                     @RequestParam int semester) {
        return subjectRepository.findByYearOfJoiningAndSemester(year, semester);
    }
}
