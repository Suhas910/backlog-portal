package com.college.backlog.service;

import com.college.backlog.controller.dto.StudentCreateRequest;
import com.college.backlog.controller.dto.StudentUpdateRequest;
import com.college.backlog.model.Department;
import com.college.backlog.model.Student;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.repository.StudentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudentManagementServiceTest {

    @Mock private StudentRepository studentRepository;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private RegistrationRepository registrationRepository;
    @InjectMocks private StudentManagementService service;

    private StudentCreateRequest req(String usn, int current, int entry) {
        StudentCreateRequest r = new StudentCreateRequest();
        r.setRollNo(usn);
        r.setName("Test Student");
        r.setDateOfBirth(LocalDate.of(2004, 5, 1));
        r.setCurrentSemester(current);
        r.setEntrySemester(entry);
        return r;
    }

    private void stubCsDept() {
        Department cs = new Department();
        cs.setDeptName("Computer Science");
        cs.setCode("CS");
        lenient().when(departmentRepository.findByCodeIgnoreCase("CS")).thenReturn(Optional.of(cs));
    }

    @Test
    void createStudentNormalizesUsnAndDerivesBranchYear() {
        stubCsDept();
        when(studentRepository.save(any(Student.class))).thenAnswer(i -> i.getArgument(0));

        Student s = service.createStudent(req("1ms22cs001", 3, 1));

        assertThat(s.getRollNo()).isEqualTo("1MS22CS001");
        assertThat(s.getBranch()).isEqualTo("Computer Science");
        assertThat(s.getYearOfJoining()).isEqualTo(2022);
        assertThat(s.getEntrySemester()).isEqualTo(1);
    }

    @Test
    void createAlwaysSetsInstitutionalEmail() {
        stubCsDept();
        when(studentRepository.save(any(Student.class))).thenAnswer(i -> i.getArgument(0));

        Student s = service.createStudent(req("1ms22cs001", 3, 1));

        assertThat(s.getEmail()).isEqualTo("1ms22cs001@msrit.edu");
    }

    @Test
    void updateReDerivesInstitutionalEmail() {
        Student s = new Student();
        s.setRollNo("1MS22CS001");
        s.setEmail("stale@example.com");
        when(studentRepository.save(any(Student.class))).thenAnswer(i -> i.getArgument(0));

        StudentUpdateRequest u = new StudentUpdateRequest();
        u.setName("New Name");
        u.setCurrentSemester(5);
        u.setEntrySemester(3);
        Student saved = service.updateStudent(s, u);

        assertThat(saved.getEmail()).isEqualTo("1ms22cs001@msrit.edu");
    }

    @Test
    void createRejectsMalformedUsn() {
        assertThatThrownBy(() -> service.createStudent(req("22CS001", 1, 1)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("1MS22CS001");
        verify(studentRepository, never()).save(any());
    }

    @Test
    void createRejectsUnknownBranch() {
        when(departmentRepository.findByCodeIgnoreCase("ZZ")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createStudent(req("1MS22ZZ001", 1, 1)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unknown branch");
    }

    @Test
    void createRejectsEntryAfterCurrent() {
        stubCsDept();
        assertThatThrownBy(() -> service.createStudent(req("1MS22CS001", 3, 5)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Entry semester");
        verify(studentRepository, never()).save(any());
    }

    @Test
    void createRejectsOutOfRangeSemester() {
        stubCsDept();
        assertThatThrownBy(() -> service.createStudent(req("1MS22CS001", 9, 1)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("between 1 and 8");
    }

    @Test
    void deleteRejectsReferencedStudent() {
        Student s = new Student();
        s.setRollNo("1MS22CS001");
        when(registrationRepository.existsByStudent_RollNo("1MS22CS001")).thenReturn(true);

        assertThatThrownBy(() -> service.deleteStudent(s))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("cannot be deleted");
        verify(studentRepository, never()).delete(any(Student.class));
    }

    @Test
    void deleteRemovesUnreferencedStudent() {
        Student s = new Student();
        s.setRollNo("1MS22CS001");
        when(registrationRepository.existsByStudent_RollNo("1MS22CS001")).thenReturn(false);

        service.deleteStudent(s);

        verify(studentRepository).delete(s);
    }

    @Test
    void updateAppliesEditableFieldsAndValidates() {
        Student s = new Student();
        s.setRollNo("1MS22CS001");
        when(studentRepository.save(any(Student.class))).thenAnswer(i -> i.getArgument(0));

        StudentUpdateRequest u = new StudentUpdateRequest();
        u.setName("New Name");
        u.setCurrentSemester(5);
        u.setEntrySemester(3);
        Student saved = service.updateStudent(s, u);

        assertThat(saved.getName()).isEqualTo("New Name");
        assertThat(saved.getCurrentSemester()).isEqualTo(5);
        assertThat(saved.getEntrySemester()).isEqualTo(3);
    }
}
