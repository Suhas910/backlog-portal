package com.college.backlog.service;

import com.college.backlog.model.*;
import com.college.backlog.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
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

    @Autowired
    private ExamCycleRepository examCycleRepository;

    @Autowired
    private RegistrationEventRepository registrationEventRepository;

    public Registration register(String rollNo, String name, String email,
                                  String phone, int yearOfJoining,
                                  int currentSemester, String branch, List<Long> subjectIds) {

        // an exam cycle must be open for registrations to be accepted
        ExamCycle cycle = examCycleRepository.findByActiveTrue()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                "Registrations are currently closed. No active exam cycle."));

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

        // duplicate guard: only one pending submission per student per exam cycle.
        // VERIFIED/REJECTED rows in the cycle may be followed by a new submission.
        for (Registration existing : registrationRepository
                .findByStudent_RollNoAndExamCycle_Id(rollNo, cycle.getId())) {
            if ("SUBMITTED".equals(existing.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You already have a pending registration for this exam cycle.");
            }
        }

        // upsert the student's "latest known identity" — details are editable across cycles;
        // historical fidelity is preserved by the per-registration snapshot below
        Student student = studentRepository.findByRollNo(rollNo).orElse(new Student());
        student.setRollNo(rollNo);
        student.setName(name);
        student.setEmail(email);
        student.setPhone(phone);
        student.setYearOfJoining(yearOfJoining);
        student.setCurrentSemester(currentSemester);
        student.setBranch(branch);
        if (student.getPasswordHash() == null) {
            student.setPasswordHash("");
        }
        studentRepository.save(student);

        // create registration with an immutable snapshot of the submitted details
        Registration reg = new Registration();
        reg.setRegId(UUID.randomUUID().toString());
        reg.setStudent(student);
        reg.setSubjects(subjects);
        reg.setRegisteredAt(LocalDateTime.now());
        reg.setStatus("SUBMITTED");
        reg.setExamCycle(cycle);
        reg.setSnapName(name);
        reg.setSnapEmail(email);
        reg.setSnapPhone(phone);
        reg.setSnapBranch(branch);
        reg.setSnapSemester(currentSemester);
        reg.setSnapYearOfJoining(yearOfJoining);

        Registration saved;
        try {
            // saveAndFlush so the partial-unique-index race backstop fires here, not later
            saved = registrationRepository.saveAndFlush(reg);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "You already have a pending registration for this exam cycle.");
        }

        registrationEventRepository.save(new RegistrationEvent(
            saved.getRegId(), "SUBMITTED", rollNo, "STUDENT", null));

        return saved;
    }
}