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

    @Autowired
    private DepartmentRepository departmentRepository;

    public Registration register(String rollNo, int currentSemester, List<Long> subjectIds) {

        // an exam cycle must be open for registrations to be accepted
        ExamCycle cycle = examCycleRepository.findByActiveTrue()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                "Registrations are currently closed. No active exam cycle."));

        // year of joining and branch are encoded in the USN: 1MS<YY><BR><NNN>.
        // The USN format is validated upstream, so the substrings are safe here.
        if (rollNo == null || !rollNo.matches("^1MS\\d{2}[A-Za-z]{2}\\d{3}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "USN must be in the format 1MS22CS001.");
        }

        // the owner is an authenticated student; identity (name/email/phone) comes
        // from the account, never from the request — so a USN cannot be impersonated
        // or have its record overwritten by the submission.
        Student student = studentRepository.findByRollNo(rollNo)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Student account not found."));

        // phone is set only from the dashboard; a missing phone blocks registration.
        // Server-side guard — cannot be bypassed by a crafted request.
        if (student.getPhone() == null || !student.getPhone().matches("^[0-9]{10}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Add your phone number in your profile before registering.");
        }

        int yearOfJoining = 2000 + Integer.parseInt(rollNo.substring(3, 5));
        String branchCode = rollNo.substring(5, 7).toUpperCase();
        Department department = departmentRepository.findByCodeIgnoreCase(branchCode)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Unknown branch code '" + branchCode + "' in USN. Contact the department office."));
        String branch = department.getDeptName();

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

        // the student row is immutable identity (set at import; phone via dashboard).
        // branch/year are derived from the USN at read time, and the per-registration
        // semester lives in the snapshot below — so registration writes nothing to it.

        // create registration with an immutable snapshot of the account details
        Registration reg = new Registration();
        reg.setRegId(UUID.randomUUID().toString());
        reg.setStudent(student);
        reg.setSubjects(subjects);
        reg.setRegisteredAt(LocalDateTime.now());
        reg.setStatus("SUBMITTED");
        reg.setExamCycle(cycle);
        reg.setSnapName(student.getName());
        reg.setSnapEmail(student.getEmail());
        reg.setSnapPhone(student.getPhone());
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