package com.college.backlog.controller;

import com.college.backlog.controller.dto.PhoneUpdateRequest;
import com.college.backlog.controller.dto.RegistrationSummaryResponse;
import com.college.backlog.controller.dto.StudentProfileResponse;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.Department;
import com.college.backlog.model.Registration;
import com.college.backlog.model.Student;
import com.college.backlog.model.Subject;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.repository.StudentRepository;
import com.college.backlog.service.PdfService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RegistrationRepository registrationRepository;

    @Autowired
    private PdfService pdfService;

    @Autowired
    private DepartmentRepository departmentRepository;

    private Student currentStudent(Authentication auth) {
        return studentRepository.findByRollNo(auth.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Student account not found"));
    }

    @GetMapping("/me")
    public StudentProfileResponse getProfile(Authentication authentication) {
        return toProfile(currentStudent(authentication));
    }

    @PutMapping("/me/phone")
    public StudentProfileResponse updatePhone(@Valid @RequestBody PhoneUpdateRequest request,
                                              Authentication authentication) {
        Student s = currentStudent(authentication);
        s.setPhone(request.getPhone());
        studentRepository.save(s);
        return toProfile(s);
    }

    // Branch is derived from the USN's 2-letter code (single source of truth),
    // not read from the stored student row. currentSemester stays as stored
    // master data and is no longer written during registration.
    private StudentProfileResponse toProfile(Student s) {
        return new StudentProfileResponse(
            s.getRollNo(), s.getName(), s.getEmail(),
            deriveBranch(s.getRollNo()), s.getPhone(), s.getCurrentSemester());
    }

    private String deriveBranch(String rollNo) {
        if (rollNo == null || !rollNo.matches("^1MS\\d{2}[A-Za-z]{2}\\d{3}$")) {
            return null;
        }
        String code = rollNo.substring(5, 7).toUpperCase();
        return departmentRepository.findByCodeIgnoreCase(code)
            .map(Department::getDeptName)
            .orElse(null);
    }

    @GetMapping("/registrations")
    public List<RegistrationSummaryResponse> myRegistrations(Authentication authentication) {
        return registrationRepository.findByStudent_RollNo(authentication.getName()).stream()
            .sorted(Comparator.comparing(Registration::getRegisteredAt).reversed())
            .map(reg -> new RegistrationSummaryResponse(
                reg.getRegId(),
                reg.getStudent().getRollNo(),
                reg.getSnapName() != null ? reg.getSnapName() : reg.getStudent().getName(),
                reg.getSnapSemester() != null ? reg.getSnapSemester() : reg.getStudent().getCurrentSemester(),
                reg.getSnapYearOfJoining() != null ? reg.getSnapYearOfJoining() : reg.getStudent().getYearOfJoining(),
                reg.getSubjects().stream().map(Subject::getSubjectName).collect(Collectors.toList()),
                reg.getStatus(),
                reg.getRegisteredAt().toString(),
                reg.getVerifiedBy(),
                reg.getExamCycle() != null ? reg.getExamCycle().getName() : null))
            .collect(Collectors.toList());
    }

    @GetMapping("/registrations/{regId}/pdf")
    public ResponseEntity<byte[]> downloadOwnPdf(@PathVariable String regId,
                                                 Authentication authentication) throws Exception {
        Registration reg = registrationRepository.findByRegId(regId)
            .orElseThrow(() -> new ResourceNotFoundException("Registration not found with ID: " + regId));

        // ownership check: a student may only download their own form.
        // 404 (not 403) so a probing student cannot confirm that a regId exists.
        if (reg.getStudent() == null
                || !authentication.getName().equals(reg.getStudent().getRollNo())) {
            throw new ResourceNotFoundException("Registration not found with ID: " + regId);
        }

        byte[] pdfBytes = pdfService.generateRegistrationPdf(reg);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment",
            "backlog-registration-" + reg.getStudent().getRollNo() + ".pdf");

        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }
}
