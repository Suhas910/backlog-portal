package com.college.backlog.service;

import com.college.backlog.model.*;
import com.college.backlog.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
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
                                  int currentSemester, String branch, List<Long> subjectIds) {

        // validate subjects before touching the DB
        List<Subject> subjects = subjectRepository.findAllById(subjectIds);

        if (subjects.size() != subjectIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "One or more selected subjects are invalid.");
        }

        for (Subject subject : subjects) {
            if ("ELECTIVE".equals(subject.getSubjectType())) {
                boolean eligible = subject.getEligibleDepartments().stream()
                    .anyMatch(d -> d.getDeptName().equals(branch));
                if (!eligible) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Not eligible for elective: " + subject.getSubjectName());
                }
            } else {
                if (subject.getDepartment() == null ||
                    !subject.getDepartment().getDeptName().equals(branch)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Subject '" + subject.getSubjectName() + "' does not belong to branch: " + branch);
                }
            }
        }

        // create student record only on first registration — never overwrite existing details
        Student student = studentRepository.findByRollNo(rollNo).orElse(null);
        if (student == null) {
            student = new Student();
            student.setRollNo(rollNo);
            student.setName(name);
            student.setEmail(email);
            student.setPhone(phone);
            student.setYearOfJoining(yearOfJoining);
            student.setCurrentSemester(currentSemester);
            student.setBranch(branch);
            student.setPasswordHash("");
            studentRepository.save(student);
        } else {
            // block only while a submission is still pending; VERIFIED/REJECTED may re-submit
            // (e.g. to add subjects they forgot)
            boolean hasVerified = false;
            for (Registration existing : registrationRepository.findByStudent_RollNo(rollNo)) {
                if ("SUBMITTED".equals(existing.getStatus())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "You already have a pending registration.");
                }
                if ("VERIFIED".equals(existing.getStatus())) {
                    hasVerified = true;
                }
            }
            // refresh details only if never verified — verified details are locked to the
            // physically-checked form, so they must not be overwritten by a later submission
            if (!hasVerified) {
                student.setName(name);
                student.setEmail(email);
                student.setPhone(phone);
                student.setYearOfJoining(yearOfJoining);
                student.setCurrentSemester(currentSemester);
                student.setBranch(branch);
                studentRepository.save(student);
            }
        }

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