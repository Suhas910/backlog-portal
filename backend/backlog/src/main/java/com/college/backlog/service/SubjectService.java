package com.college.backlog.service;

import com.college.backlog.controller.dto.SubjectCreateRequest;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.Department;
import com.college.backlog.model.Subject;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubjectService {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Transactional
    public Subject createSubject(SubjectCreateRequest request) {
        Department department = departmentRepository.findById(request.getDeptId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + request.getDeptId()));

        Subject subject = new Subject(null, request.getSubjectName(), request.getCourseCode(),
                request.getSemester(), request.getCredits(), request.getYearOfJoining(), department);

        return subjectRepository.save(subject);
    }
}