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

import java.time.Year;

/**
 * Shared write path for student progression — the single place that records
 * "student X studied semester N in academic year Y". Both the Promote Batch
 * flow and the CSV import funnel through {@link #recordProgression} so the
 * write-once + current-semester rules can never diverge between them.
 *
 * See docs/adr/backlog-progression.md.
 */
@Service
public class ProgressionService {

    private static final Logger log = LoggerFactory.getLogger(ProgressionService.class);
    private static final int MIN_ACADEMIC_YEAR = 2000;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentSemesterTermRepository termRepository;

    public enum Outcome { CREATED, SKIPPED_EXISTS }

    /**
     * Stamp the academic year a student studied a semester, write-once.
     *
     * <ul>
     *   <li>Inserts a (rollNo, semester) row only if absent — a later retake never
     *       overwrites the original "first studied" year.</li>
     *   <li>Advances {@code currentSemester} to {@code semester} if it is higher
     *       (current semester = highest semester the student has entered).</li>
     * </ul>
     *
     * @throws IllegalArgumentException on invalid input (caller maps to a per-row
     *         error in bulk flows, or a 400 in single-row flows)
     */
    @Transactional
    public Outcome recordProgression(String rollNo, int semester, int academicYear) {
        Student student = validate(rollNo, semester, academicYear);

        Outcome outcome;
        if (termRepository.existsByRollNoAndSemester(rollNo, semester)) {
            outcome = Outcome.SKIPPED_EXISTS;
        } else {
            termRepository.save(new StudentSemesterTerm(rollNo, semester, academicYear));
            outcome = Outcome.CREATED;
        }

        // current semester tracks the furthest the student has reached
        if (student.getCurrentSemester() < semester) {
            student.setCurrentSemester(semester);
            studentRepository.save(student);
        }
        return outcome;
    }

    /**
     * Correct an existing (or missing) progression row — unlike recordProgression
     * this OVERWRITES the academic year. Audited. Does not touch currentSemester.
     */
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
     * Linear-default seed for one student: assume no detention and stamp every
     * semester from their entry semester through the final programme semester (8)
     * with the year derived from the admission year, so sem k -> admissionYear +
     * floor((k - entrySem)/2). For a regular student (entrySem 1) this is
     * admissionYear + floor((k-1)/2) — e.g. a 2024 intake gets sems 1-2 -> 2024,
     * 3-4 -> 2025, 5-6 -> 2026, 7-8 -> 2027. A lateral entrant anchors at their entry
     * year and the semesters below entry are never invented (they never sat them).
     * Seeds the whole plan up front (not just up to currentSemester) so the timeline
     * is complete the moment a student is created; currentSemester is left untouched.
     * Write-once, so any hand-corrected rows (e.g. after a year-back) are preserved.
     * Sems 9-10 are intentionally left empty (reserved for future extensibility).
     * (Assumes entry at the start of an academic year, i.e. an odd semester — the
     * realistic lateral case; anything else is a hand-correct.)
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
        int created = 0;
        for (int sem = entry; sem <= 8; sem++) {
            if (!termRepository.existsByRollNoAndSemester(rollNo, sem)) {
                int ay = admissionYear + (sem - entry) / 2;
                termRepository.save(new StudentSemesterTerm(rollNo, sem, ay));
                created++;
            }
        }
        return created;
    }

    /**
     * Range-check a semester + academic year. Shared by the write path and the CSV
     * import dry-run preview so the preview flags the same bad rows the apply would
     * reject (no WOULD_CREATE that then errors on apply).
     */
    public void validateSemesterAndYear(int semester, int academicYear) {
        // Term rows are permitted through semester 10: a student only *studies* to
        // sem 8, but the schema keeps 9-10 available for future extensibility, so a
        // recorded term for those is not rejected here. Eligibility/current-semester
        // are separately capped at 8 (EligibilityService, validateSemesters).
        if (semester < 1 || semester > 10) {
            throw new IllegalArgumentException("Semester must be between 1 and 10.");
        }
        if (academicYear < MIN_ACADEMIC_YEAR || academicYear > Year.now().getValue() + 1) {
            throw new IllegalArgumentException("Academic year " + academicYear + " is out of range.");
        }
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
