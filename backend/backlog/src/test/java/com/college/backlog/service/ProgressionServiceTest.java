package com.college.backlog.service;

import com.college.backlog.model.Student;
import com.college.backlog.model.StudentSemesterTerm;
import com.college.backlog.repository.StudentRepository;
import com.college.backlog.repository.StudentSemesterTermRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProgressionServiceTest {

    @Mock private StudentRepository studentRepository;
    @Mock private StudentSemesterTermRepository termRepository;
    @InjectMocks private ProgressionService service;

    private Student student(String rollNo, int currentSemester) {
        Student s = new Student();
        s.setRollNo(rollNo);
        s.setCurrentSemester(currentSemester);
        return s;
    }

    @Test
    void recordsWhenAbsentAndAdvancesCurrentSemester() {
        Student s = student("1MS24CS191", 2);
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        when(termRepository.existsByRollNoAndSemester("1MS24CS191", 3)).thenReturn(false);

        ProgressionService.Outcome outcome = service.recordProgression("1MS24CS191", 3, 2025);

        assertThat(outcome).isEqualTo(ProgressionService.Outcome.CREATED);
        verify(termRepository).save(any(StudentSemesterTerm.class));
        assertThat(s.getCurrentSemester()).isEqualTo(3);
        verify(studentRepository).save(s);
    }

    @Test
    void skipsExistingRowAndDoesNotLowerCurrentSemester() {
        Student s = student("1MS24CS191", 6);
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        when(termRepository.existsByRollNoAndSemester("1MS24CS191", 3)).thenReturn(true);

        ProgressionService.Outcome outcome = service.recordProgression("1MS24CS191", 3, 2025);

        assertThat(outcome).isEqualTo(ProgressionService.Outcome.SKIPPED_EXISTS);
        verify(termRepository, never()).save(any());
        assertThat(s.getCurrentSemester()).isEqualTo(6);
        verify(studentRepository, never()).save(any());
    }

    @Test
    void rejectsInvalidSemester() {
        assertThatThrownBy(() -> service.recordProgression("1MS24CS191", 0, 2025))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsUnknownStudent() {
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.recordProgression("1MS24CS191", 3, 2025))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void backfillLinearSeedsMissingSemestersWithDerivedYears() {
        Student s = student("1MS24CS191", 4); // admission 2024 from USN
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        when(termRepository.existsByRollNoAndSemester(eq("1MS24CS191"), anyInt())).thenReturn(false);

        int created = service.backfillLinear("1MS24CS191");

        // the full plan (sems 1..8) is seeded, not just up to currentSemester
        assertThat(created).isEqualTo(8);
        ArgumentCaptor<StudentSemesterTerm> captor = ArgumentCaptor.forClass(StudentSemesterTerm.class);
        verify(termRepository, times(8)).save(captor.capture());
        // regular (entry sem 1): 1,2 -> 2024 ; 3,4 -> 2025 ; 5,6 -> 2026 ; 7,8 -> 2027
        // (admissionYear + floor((k - entrySem)/2))
        assertThat(captor.getAllValues())
                .extracting(StudentSemesterTerm::getSemester, StudentSemesterTerm::getAcademicYear)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1, 2024),
                        org.assertj.core.groups.Tuple.tuple(2, 2024),
                        org.assertj.core.groups.Tuple.tuple(3, 2025),
                        org.assertj.core.groups.Tuple.tuple(4, 2025),
                        org.assertj.core.groups.Tuple.tuple(5, 2026),
                        org.assertj.core.groups.Tuple.tuple(6, 2026),
                        org.assertj.core.groups.Tuple.tuple(7, 2027),
                        org.assertj.core.groups.Tuple.tuple(8, 2027));
    }

    @Test
    void backfillLinearForLateralEntryStartsAtEntrySemesterAndAnchorsYearThere() {
        Student s = student("1MS24CS191", 6); // admission 2024 from USN
        s.setEntrySemester(3);                // lateral entrant: started at sem 3
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        when(termRepository.existsByRollNoAndSemester(eq("1MS24CS191"), anyInt())).thenReturn(false);

        int created = service.backfillLinear("1MS24CS191");

        // no sem 1-2 (never sat them); entry sem 3 anchors to the admission year and
        // the plan runs through sem 8
        assertThat(created).isEqualTo(6);
        ArgumentCaptor<StudentSemesterTerm> captor = ArgumentCaptor.forClass(StudentSemesterTerm.class);
        verify(termRepository, times(6)).save(captor.capture());
        // sem 3,4 -> 2024 ; 5,6 -> 2025 ; 7,8 -> 2026
        assertThat(captor.getAllValues())
                .extracting(StudentSemesterTerm::getSemester, StudentSemesterTerm::getAcademicYear)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(3, 2024),
                        org.assertj.core.groups.Tuple.tuple(4, 2024),
                        org.assertj.core.groups.Tuple.tuple(5, 2025),
                        org.assertj.core.groups.Tuple.tuple(6, 2025),
                        org.assertj.core.groups.Tuple.tuple(7, 2026),
                        org.assertj.core.groups.Tuple.tuple(8, 2026));
    }

    @Test
    void overrideCreatesRowWhenAbsent() {
        Student s = student("1MS24CS191", 6);
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        when(termRepository.findByRollNoAndSemester("1MS24CS191", 3)).thenReturn(Optional.empty());

        service.overrideProgression("1MS24CS191", 3, 2025, "admin");

        verify(termRepository).save(any(StudentSemesterTerm.class));
    }
}
