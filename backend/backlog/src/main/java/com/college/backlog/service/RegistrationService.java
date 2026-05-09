package com.college.backlog.service;

import com.college.backlog.model.*;
import com.college.backlog.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class RegistrationService {

    @Autowired
    private RegistrationRepository registrationRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    public Registration register(String rollNo, String name, String email,
                                  String phone, int yearOfJoining,
                                  int currentSemester, List<Long> subjectIds) {

        // create or update student
        Student student = studentRepository.findByRollNo(rollNo)
            .orElse(new Student());
        student.setRollNo(rollNo);
        student.setName(name);
        student.setEmail(email);
        student.setPhone(phone);
        student.setYearOfJoining(yearOfJoining);
        student.setCurrentSemester(currentSemester);
        student.setBranch("CSE");
        student.setPasswordHash("");
        studentRepository.save(student);

        // fetch selected subjects
        List<Subject> subjects = subjectRepository.findAllById(subjectIds);

        // create registration
        Registration reg = new Registration();
        reg.setRegId(UUID.randomUUID().toString());
        reg.setStudent(student);
        reg.setSubjects(subjects);
        reg.setRegisteredAt(LocalDateTime.now());
        reg.setStatus("SUBMITTED");

        return registrationRepository.save(reg);
    }
}