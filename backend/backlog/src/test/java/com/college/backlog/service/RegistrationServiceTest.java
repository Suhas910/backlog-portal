package com.college.backlog.service;

import com.college.backlog.model.*;
import com.college.backlog.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Focused tests for the "one live pending registration per exam cycle" rule
 * (RegistrationService.MAX_PENDING_PER_CYCLE = 1) and its DB race backstop.
 * Everything upstream of the limit check is stubbed to a valid single-subject
 * submission so the tests exercise only the limit path.
 */
class RegistrationServiceTest {

    @Mock private RegistrationRepository registrationRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private ExamCycleRepository examCycleRepository;
    @Mock private RegistrationEventRepository registrationEventRepository;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private EligibilityService eligibilityService;
    @Mock private StudentSemesterTermRepository studentSemesterTermRepository;

    @InjectMocks private RegistrationService service;

    private static final String ROLL = "1MS22CS001";
    private ExamCycle cycle;
    private Subject subject;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        cycle = new ExamCycle("Cycle A", "May 2026");
        cycle.setId(10L);
        cycle.setActive(true);
        when(examCycleRepository.findByActiveTrue()).thenReturn(Optional.of(cycle));

        Student student = new Student();
        student.setRollNo(ROLL);
        student.setName("Alice");
        student.setPhone("9999999999");
        student.setCurrentSemester(4);
        student.setEntrySemester(1);
        when(studentRepository.findByRollNo(ROLL)).thenReturn(Optional.of(student));

        Department cs = new Department();
        cs.setId(1L);
        cs.setDeptName("Computer Science");
        cs.setCode("CS");
        when(departmentRepository.findByCodeIgnoreCase("CS")).thenReturn(Optional.of(cs));

        when(eligibilityService.eligibleSemesters(anyInt(), anyInt())).thenReturn(Set.of(4));

        subject = new Subject(100L, "Data Structures", "22CSL44", 4, 4, 2022, cs);
        subject.setSubjectType(SubjectType.REGULAR);
        when(subjectRepository.findAllById(List.of(100L))).thenReturn(List.of(subject));

        when(studentSemesterTermRepository.findByRollNoAndSemester(ROLL, 4))
                .thenReturn(Optional.of(new StudentSemesterTerm(ROLL, 4, 2022)));
    }

    @Test
    void secondPendingInSameCycleIsRejectedWith409() {
        // an existing SUBMITTED registration in this cycle -> at the limit of 1
        Registration existing = new Registration();
        existing.setStatus(RegistrationStatus.SUBMITTED);
        when(registrationRepository.findByStudent_RollNoAndExamCycle_Id(ROLL, 10L))
                .thenReturn(List.of(existing));

        ResponseStatusException ex = catchThrowableOfType(
                () -> service.register(ROLL, List.of(100L)), ResponseStatusException.class);

        assertThat(ex).isNotNull();
        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        // never attempts the insert once the limit is hit
        verify(registrationRepository, never()).saveAndFlush(any());
    }

    @Test
    void actionedRegistrationsInTheCycleDoNotCountTowardTheLimit() {
        // a VERIFIED + a REJECTED row exist, but zero SUBMITTED -> submission allowed
        Registration verified = new Registration();
        verified.setStatus(RegistrationStatus.VERIFIED);
        Registration rejected = new Registration();
        rejected.setStatus(RegistrationStatus.REJECTED);
        when(registrationRepository.findByStudent_RollNoAndExamCycle_Id(ROLL, 10L))
                .thenReturn(List.of(verified, rejected));
        when(registrationRepository.saveAndFlush(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        Registration saved = service.register(ROLL, List.of(100L));

        assertThat(saved.getStatus()).isEqualTo(RegistrationStatus.SUBMITTED);
        verify(registrationRepository).saveAndFlush(any());
    }

    @Test
    void concurrentInsertRaceIsMappedTo409ByTheUniqueIndexBackstop() {
        // count check passes (no SUBMITTED yet) but the DB partial unique index
        // rejects the concurrent insert -> surfaced as 409, not a 500
        when(registrationRepository.findByStudent_RollNoAndExamCycle_Id(ROLL, 10L))
                .thenReturn(List.of());
        when(registrationRepository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("duplicate key uq_pending_reg_per_cycle"));

        assertThatThrownBy(() -> service.register(ROLL, List.of(100L)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(registrationEventRepository, never()).save(any());
    }
}
