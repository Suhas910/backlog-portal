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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

    private StudentSemesterTerm term(String rollNo, int semester, int academicYear) {
        return new StudentSemesterTerm(rollNo, semester, academicYear);
    }

    @Test
    void recordsWhenAbsentAndAdvancesCurrentSemester() {
        Student s = student("1MS24CS191", 2);
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        when(termRepository.findByRollNoAndSemester("1MS24CS191", 3)).thenReturn(Optional.empty());

        ProgressionService.Result r = service.recordProgression("1MS24CS191", 3, 2025);

        assertThat(r.outcome()).isEqualTo(ProgressionService.Outcome.CREATED);
        assertThat(r.heldAcademicYear()).isNull();
        verify(termRepository).save(any(StudentSemesterTerm.class));
        assertThat(s.getCurrentSemester()).isEqualTo(3);
        verify(studentRepository).save(s);
    }

    @Test
    void skipsExistingRowWithTheSameYearAndDoesNotLowerCurrentSemester() {
        Student s = student("1MS24CS191", 6);
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        when(termRepository.findByRollNoAndSemester("1MS24CS191", 3))
                .thenReturn(Optional.of(term("1MS24CS191", 3, 2025)));

        ProgressionService.Result r = service.recordProgression("1MS24CS191", 3, 2025);

        // same year: genuinely nothing to do, and it must stay quiet
        assertThat(r.outcome()).isEqualTo(ProgressionService.Outcome.SKIPPED_EXISTS);
        assertThat(r.heldAcademicYear()).isNull();
        verify(termRepository, never()).save(any());
        assertThat(s.getCurrentSemester()).isEqualTo(6);
        verify(studentRepository, never()).save(any());
    }

    @Test
    void reportsConflictWhenTheStoredYearDiffersAndNeverOverwritesIt() {
        // the case the whole outcome exists for: backfillLinear seeded sem 5 as 2026 (no-detention
        // guess), the department's CSV says the student really sat it in 2025. Before CONFLICT this
        // returned SKIPPED_EXISTS and the 2025 was discarded without a trace.
        Student s = student("1MS24CS191", 5);
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        when(termRepository.findByRollNoAndSemester("1MS24CS191", 5))
                .thenReturn(Optional.of(term("1MS24CS191", 5, 2026)));

        ProgressionService.Result r = service.recordProgression("1MS24CS191", 5, 2025);

        assertThat(r.outcome()).isEqualTo(ProgressionService.Outcome.CONFLICT);
        // both years must reach the caller, or the report can't be acted on
        assertThat(r.heldAcademicYear()).isEqualTo(2026);
        // write-once holds: overwriting is overrideProgression's audited job, never a bulk import's
        verify(termRepository, never()).save(any());
    }

    @Test
    void conflictStillAdvancesCurrentSemester() {
        // the student demonstrably reached semester 7; the dispute is which YEAR, not whether.
        // Easy to break by moving the advance into the create branch.
        Student s = student("1MS24CS191", 6);
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        when(termRepository.findByRollNoAndSemester("1MS24CS191", 7))
                .thenReturn(Optional.of(term("1MS24CS191", 7, 2027)));

        assertThat(service.recordProgression("1MS24CS191", 7, 2026).outcome())
                .isEqualTo(ProgressionService.Outcome.CONFLICT);
        assertThat(s.getCurrentSemester()).isEqualTo(7);
        verify(studentRepository).save(s);
        verify(termRepository, never()).save(any());
    }

    @Test
    void rejectsInvalidSemester() {
        assertThatThrownBy(() -> service.recordProgression("1MS24CS191", 0, 2025))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsSemesterAboveEightAndNeverTouchesCurrentSemester() {
        // 8 is the last semester. recordProgression assigns this value to currentSemester, so
        // anything above 8 would leave the student with an empty eligibility window.
        assertThatThrownBy(() -> service.recordProgression("1MS24CS191", 9, 2025))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 1 and 8");
        // rejected before any write: no term row, and currentSemester untouched
        verify(termRepository, never()).save(any());
        verify(studentRepository, never()).save(any());
    }

    @Test
    void acceptsSemesterEightAsTheLastValidOne() {
        Student s = student("1MS24CS191", 7);
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        when(termRepository.findByRollNoAndSemester("1MS24CS191", 8)).thenReturn(Optional.empty());

        assertThat(service.recordProgression("1MS24CS191", 8, 2027).outcome())
                .isEqualTo(ProgressionService.Outcome.CREATED);
        assertThat(s.getCurrentSemester()).isEqualTo(8);
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
        when(termRepository.findByRollNo("1MS24CS191")).thenReturn(List.of()); // no rows yet

        int created = service.backfillLinear("1MS24CS191");

        // the full plan (1..8) is seeded, not just up to currentSemester
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
        when(termRepository.findByRollNo("1MS24CS191")).thenReturn(List.of()); // no rows yet

        int created = service.backfillLinear("1MS24CS191");

        // no sems 1-2 (never sat them); entry sem 3 anchors the admission year, plan runs to 8
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
    void backfillLinearPreservesExistingRowsWriteOnce() {
        Student s = student("1MS24CS191", 4); // admission 2024, entry sem 1
        when(studentRepository.findByRollNo("1MS24CS191")).thenReturn(Optional.of(s));
        // sems 1 and 3 already recorded, e.g. hand-corrected after a year-back
        when(termRepository.findByRollNo("1MS24CS191")).thenReturn(List.of(
                new StudentSemesterTerm("1MS24CS191", 1, 2024),
                new StudentSemesterTerm("1MS24CS191", 3, 2026)));

        int created = service.backfillLinear("1MS24CS191");

        // only the six missing rows are written; the existing two are never touched
        assertThat(created).isEqualTo(6);
        ArgumentCaptor<StudentSemesterTerm> captor = ArgumentCaptor.forClass(StudentSemesterTerm.class);
        verify(termRepository, times(6)).save(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(StudentSemesterTerm::getSemester)
                .containsExactly(2, 4, 5, 6, 7, 8);
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
