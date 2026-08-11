package com.college.backlog.service;

import com.college.backlog.model.Student;
import com.college.backlog.model.StudentSemesterTerm;
import com.college.backlog.repository.StudentRepository;
import com.college.backlog.repository.StudentSemesterTermRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single write path for "student X studied semester N in academic year Y". Promote Batch and CSV
 * import both funnel through {@link #recordProgression}, so the write-once and current-semester
 * rules can't diverge between them. See docs/adr/backlog-progression.md.
 */
@Service
public class ProgressionService {

    private static final Logger log = LoggerFactory.getLogger(ProgressionService.class);

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentSemesterTermRepository termRepository;

    /**
     * CONFLICT = a row already exists for this (rollNo, semester) but holds a DIFFERENT academic
     * year. Split out from SKIPPED_EXISTS deliberately: "already correct, nothing to do" and "we
     * are discarding a year that contradicts what we hold" are opposite events, and one enum value
     * for both meant the second inherited the first's silence.
     */
    public enum Outcome { CREATED, SKIPPED_EXISTS, CONFLICT }

    /**
     * @param heldAcademicYear the year already on file. Set only for CONFLICT (null otherwise), so
     *     callers can report both years — a conflict a human can't see both sides of is unactionable.
     */
    public record Result(Outcome outcome, Integer heldAcademicYear) {}

    /**
     * Stamp the academic year a student studied a semester, write-once: inserts a
     * (rollNo, semester) row only if absent, so a retake never overwrites the original
     * "first studied" year, and advances {@code currentSemester} if {@code semester} is higher
     * (current = highest semester entered).
     *
     * <p>A requested year that contradicts the stored one is NEVER written here and returns
     * CONFLICT. Overwriting is a deliberate, audited, per-student act — that is
     * {@link #overrideProgression}, which logs actor and previous→new. Letting a bulk CSV do it
     * would rewrite a cohort's history from one mis-mapped column with no trace.
     *
     * @throws IllegalArgumentException on invalid input — callers map it to a per-row error in
     *         bulk flows, or a 400 in single-row flows
     */
    @Transactional
    public Result recordProgression(String rollNo, int semester, int academicYear) {
        Student student = validate(rollNo, semester, academicYear);

        StudentSemesterTerm existing = termRepository.findByRollNoAndSemester(rollNo, semester)
                .orElse(null);
        Result result;
        if (existing == null) {
            termRepository.save(new StudentSemesterTerm(rollNo, semester, academicYear));
            result = new Result(Outcome.CREATED, null);
        } else if (existing.getAcademicYear() == academicYear) {
            result = new Result(Outcome.SKIPPED_EXISTS, null);
        } else {
            // logged at WARN: the row is dropped on purpose, but silently dropping department
            // ground truth is what made this invisible for the whole life of the import feature
            log.warn("PROGRESSION_CONFLICT rollNo={} semester={} held={} requested={} (not written)",
                    rollNo, semester, existing.getAcademicYear(), academicYear);
            result = new Result(Outcome.CONFLICT, existing.getAcademicYear());
        }

        // Current semester tracks the furthest the student has reached — advanced on CONFLICT too:
        // the student demonstrably sat this semester, the dispute is which YEAR, not whether.
        if (student.getCurrentSemester() < semester) {
            student.setCurrentSemester(semester);
            studentRepository.save(student);
        }
        return result;
    }

    /** Correct an existing (or missing) row — unlike recordProgression this OVERWRITES the
     *  academic year. Audited. Does not touch currentSemester. */
    @Transactional
    public void overrideProgression(String rollNo, int semester, int academicYear, String actor) {
        validate(rollNo, semester, academicYear);
        StudentSemesterTerm term = termRepository.findByRollNoAndSemester(rollNo, semester)
                .orElseGet(() -> new StudentSemesterTerm(rollNo, semester, academicYear));
        int previous = term.getAcademicYear();
        term.setAcademicYear(academicYear);
        termRepository.save(term);
        log.info("PROGRESSION_OVERRIDE actor={} rollNo={} semester={} {} -> {}",
                actor, rollNo, semester, previous, academicYear);
    }

    /**
     * Linear-default seed for one student: assume no detention and stamp every semester from
     * entry through 8 as {@code sem k -> admissionYear + floor((k - entrySem)/2)} — e.g. a 2024
     * intake with entry 1 gets 1-2:2024, 3-4:2025, 5-6:2026, 7-8:2027. A lateral entrant anchors
     * at their entry year; pre-entry semesters are never invented (they never sat them).
     *
     * <p>Seeds the whole plan up front, not just to currentSemester, so the timeline is complete
     * the moment a student is created; currentSemester is untouched. Write-once, so hand-corrected
     * rows (e.g. after a year-back) survive. 8 is the last semester, here and everywhere.
     * Assumes entry at the start of an academic year (odd semester) — the realistic lateral case;
     * anything else is a hand-correct.
     *
     * @return number of rows created
     */
    @Transactional
    public int backfillLinear(String rollNo) {
        Student student = studentRepository.findByRollNo(rollNo).orElse(null);
        if (student == null) {
            throw new IllegalArgumentException("Student not found: " + rollNo);
        }
        int admissionYear = admissionYearFromUsn(rollNo);
        if (admissionYear < 0) {
            throw new IllegalArgumentException("Cannot derive admission year from USN: " + rollNo);
        }
        int entry = Math.max(1, student.getEntrySemester());
        // one query for existing rows, not an exists-probe round trip per semester
        // (bulk backfill multiplies them)
        java.util.Set<Integer> recorded = termRepository.findByRollNo(rollNo).stream()
                .map(StudentSemesterTerm::getSemester)
                .collect(java.util.stream.Collectors.toSet());
        int created = 0;
        for (int sem = entry; sem <= Semesters.MAX; sem++) {
            if (!recorded.contains(sem)) {
                int ay = admissionYear + (sem - entry) / 2;
                termRepository.save(new StudentSemesterTerm(rollNo, sem, ay));
                created++;
            }
        }
        return created;
    }

    /**
     * Range-check a semester + academic year. Shared by the write path and the CSV import dry-run,
     * so the preview flags the rows apply would reject (no WOULD_CREATE that then errors).
     */
    public void validateSemesterAndYear(int semester, int academicYear) {
        Semesters.assertStudiable(semester);
        AcademicYears.assertInRange(academicYear);
    }

    private Student validate(String rollNo, int semester, int academicYear) {
        validateSemesterAndYear(semester, academicYear);
        return studentRepository.findByRollNo(rollNo)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + rollNo));
    }

    /** Admission year from USN 1MS<YY>..., or -1 if malformed. */
    public int admissionYearFromUsn(String rollNo) {
        return Usn.admissionYear(rollNo);
    }
}
