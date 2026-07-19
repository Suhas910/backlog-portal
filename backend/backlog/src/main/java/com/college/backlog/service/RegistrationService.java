package com.college.backlog.service;

import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.*;
import com.college.backlog.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class RegistrationService {

    /** Max simultaneous pending (SUBMITTED) registrations a student may hold per exam cycle.
     *  At 1, the partial unique index uq_pending_reg_per_cycle (roll_no, exam_cycle_id) WHERE
     *  status='SUBMITTED' enforces this at the DB level too — see
     *  db/migrations/2026-07-04-registrations-one-pending.sql. */
    private static final int MAX_PENDING_PER_CYCLE = 1;

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

    @Autowired
    private EligibilityService eligibilityService;

    @Autowired
    private StudentSemesterTermRepository studentSemesterTermRepository;

    @Autowired
    private EntityManager entityManager;

    /**
     * Status-bucketed counts for the admin dashboard cards: ONE {@code GROUP BY
     * status} query over the filtered set instead of one full count query per
     * status. {@code countDistinct} on the entity id keeps the numbers correct
     * when the specification's subjects join fans out rows. Statuses with no
     * matching rows are simply absent from the result.
     */
    public java.util.Map<RegistrationStatus, Long> countGroupedByStatus(Specification<Registration> spec) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        Root<Registration> root = query.from(Registration.class);
        Predicate predicate = spec.toPredicate(root, query, cb);
        query.multiselect(root.get("status"), cb.countDistinct(root.get("id")));
        if (predicate != null) {
            query.where(predicate);
        }
        query.groupBy(root.get("status"));

        java.util.Map<RegistrationStatus, Long> counts = new java.util.EnumMap<>(RegistrationStatus.class);
        for (Object[] row : entityManager.createQuery(query).getResultList()) {
            counts.put((RegistrationStatus) row[0], (Long) row[1]);
        }
        return counts;
    }

    // One transaction for the registration insert AND its SUBMITTED audit event —
    // an event-write failure rolls the registration back too, so history can never
    // gain a row without its audit trail. The unique-index race backstop below
    // still works: the catch rethrows immediately, and the transaction rolls back.
    @Transactional
    public Registration register(String rollNo, List<Long> subjectIds) {

        // an exam cycle must be open for registrations to be accepted
        ExamCycle cycle = examCycleRepository.findByActiveTrue()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                "Registrations are currently closed. No active exam cycle."));

        // year of joining and branch are encoded in the USN: 1MS<YY><BR><NNN>.
        // The USN format is validated upstream, so the substrings are safe here.
        if (!Usn.isValid(rollNo)) {
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

        int yearOfJoining = Usn.admissionYear(rollNo);
        String branchCode = Usn.branchCode(rollNo);
        Department department = departmentRepository.findByCodeIgnoreCase(branchCode)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Unknown branch code '" + branchCode + "' in USN. Contact the department office."));
        String branch = department.getDeptName();

        // semester-eligibility window is derived from the authoritative, admin-maintained
        // current semester on the student record — never from the client request.
        java.util.Set<Integer> eligibleSemesters =
            eligibilityService.eligibleSemesters(student.getCurrentSemester(), student.getEntrySemester());
        if (eligibleSemesters.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Your current semester is not set up for registration. Contact the department office.");
        }

        // validate subjects before touching the DB
        List<Subject> subjects = subjectRepository.findAllById(subjectIds);

        if (subjects.size() != subjectIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "One or more selected subjects are invalid.");
        }

        // one query for the whole progression (≤ a handful of rows per student)
        // instead of one findByRollNoAndSemester per selected subject
        java.util.Map<Integer, StudentSemesterTerm> termsBySemester =
            studentSemesterTermRepository.findByRollNo(rollNo).stream()
                .collect(java.util.stream.Collectors.toMap(
                    StudentSemesterTerm::getSemester, java.util.function.Function.identity()));

        for (Subject subject : subjects) {
            // backlog window: a subject's semester must be one the student may still
            // register for, given their current semester (mirrors the UI constraint)
            if (!eligibleSemesters.contains(subject.getSemester())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Subject '" + subject.getSubjectName() + "' is for semester "
                        + subject.getSemester() + ", which you are not eligible to register for.");
            }
            // year-binding: the subject must be the offering from the academic year the
            // student actually studied that semester. Fail closed if there is no
            // progression record — mirrors the read path so a crafted/stale request
            // cannot register a subject from a different year's offering.
            StudentSemesterTerm term = termsBySemester.get(subject.getSemester());
            if (term == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "We don't have a record of the academic year you studied semester "
                        + subject.getSemester() + ". Please contact the department office.");
            }
            if (subject.getAcademicYearOffered() != term.getAcademicYear()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Subject '" + subject.getSubjectName() + "' is not from your semester "
                        + subject.getSemester() + " offering (" + term.getAcademicYear() + ").");
            }
            if (subject.getSubjectType() == SubjectType.ELECTIVE) {
                // match on the immutable 2-letter branch code, not the human name
                boolean eligible = subject.getEligibleDepartments().stream()
                    .anyMatch(d -> branchCode.equalsIgnoreCase(d.getCode()));
                if (!eligible) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Not eligible for elective: " + subject.getSubjectName());
                }
            } else {
                if (subject.getDepartment() == null ||
                    !branchCode.equalsIgnoreCase(subject.getDepartment().getCode())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Subject '" + subject.getSubjectName() + "' does not belong to branch: " + branch);
                }
            }
        }

        // limit: at most MAX_PENDING_PER_CYCLE pending submission(s) per student per exam
        // cycle. VERIFIED/REJECTED rows in the cycle don't count toward the limit.
        long pendingCount = registrationRepository
                .countByStudent_RollNoAndExamCycle_IdAndStatus(
                    rollNo, cycle.getId(), RegistrationStatus.SUBMITTED);
        if (pendingCount >= MAX_PENDING_PER_CYCLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "You already have a pending registration for this exam cycle. "
                    + "Wait for it to be verified or rejected before submitting another.");
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
        reg.setStatus(RegistrationStatus.SUBMITTED);
        reg.setExamCycle(cycle);
        reg.setSnapName(student.getName());
        reg.setSnapEmail(student.getEmail());
        reg.setSnapPhone(student.getPhone());
        reg.setSnapBranch(branch);
        // "current semester of the student" on the printed form — snapshot the
        // authoritative, admin-maintained value from the account, never a client
        // value. (The form is for a backlog of an earlier semester; the label still
        // reflects where the student currently stands.)
        reg.setSnapSemester(student.getCurrentSemester());
        reg.setSnapYearOfJoining(yearOfJoining);
        // capture the academic-year offering when unambiguous (single-semester
        // submission); null if the selection spans multiple years
        java.util.Set<Integer> distinctAcademicYears = subjects.stream()
            .map(Subject::getAcademicYearOffered)
            .collect(java.util.stream.Collectors.toSet());
        reg.setSnapAcademicYear(distinctAcademicYears.size() == 1
            ? distinctAcademicYears.iterator().next() : null);

        Registration saved;
        try {
            // saveAndFlush so the partial-unique-index race backstop fires here, not later
            saved = registrationRepository.saveAndFlush(reg);
        } catch (DataIntegrityViolationException e) {
            // race backstop — a concurrent submit that slipped past the count check above
            // is caught here by the partial unique index uq_pending_reg_per_cycle
            // (db/migrations/2026-07-04-registrations-one-pending.sql).
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "You already have a pending registration for this exam cycle. "
                    + "Wait for it to be verified or rejected before submitting another.");
        }

        registrationEventRepository.save(new RegistrationEvent(
            saved.getRegId(), EventAction.SUBMITTED, rollNo, ActorRole.STUDENT, null));

        return saved;
    }

    /**
     * Action a pending registration: flip SUBMITTED -> VERIFIED/REJECTED and record
     * the audit event in ONE transaction, so the status change can never commit
     * without its event row. The registration is re-loaded and its state re-checked
     * inside the transaction; a concurrent action is caught either by that check or
     * by the {@code @Version} optimistic lock on the flush. Authorization (dept
     * scoping, role checks) stays with the caller.
     */
    @Transactional
    public Registration applyVerification(String regId, RegistrationStatus action,
                                          String actor, ActorRole actorRole) {
        if (action != RegistrationStatus.VERIFIED && action != RegistrationStatus.REJECTED) {
            throw new IllegalArgumentException("action must be VERIFIED or REJECTED");
        }
        Registration reg = registrationRepository.findByRegId(regId)
            .orElseThrow(() -> new ResourceNotFoundException("Registration not found with ID: " + regId));

        // state machine (one-way tightening — REJECTED is terminal):
        //   SUBMITTED -> VERIFIED | REJECTED
        //   VERIFIED  -> REJECTED           (override a completed verification)
        //   REJECTED  -> (nothing)          no un-reject, no re-verify
        RegistrationStatus current = reg.getStatus();
        boolean allowed = (action == RegistrationStatus.VERIFIED && current == RegistrationStatus.SUBMITTED)
            || (action == RegistrationStatus.REJECTED
                && (current == RegistrationStatus.SUBMITTED || current == RegistrationStatus.VERIFIED));
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This registration has already been actioned.");
        }

        reg.setStatus(action);
        if (actor != null) {
            reg.setVerifiedBy(actor);
        }
        try {
            // @Version on Registration makes a concurrent action fail here instead of silently overwriting
            registrationRepository.saveAndFlush(reg);
        } catch (OptimisticLockingFailureException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This registration was just actioned by someone else.");
        }

        registrationEventRepository.save(new RegistrationEvent(
            reg.getRegId(), EventAction.valueOf(action.name()), actor, actorRole, null));
        return reg;
    }
}