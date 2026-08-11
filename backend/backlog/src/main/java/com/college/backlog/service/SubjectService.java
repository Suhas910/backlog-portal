package com.college.backlog.service;

import com.college.backlog.controller.dto.SubjectCreateRequest;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.*;
import com.college.backlog.controller.dto.SubjectUpdateRequest;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.repository.SubjectRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Service
public class SubjectService {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private RegistrationRepository registrationRepository;

    @Transactional
    public Subject createSubject(SubjectCreateRequest request) {
        // Authoritative year check — must run BEFORE the prefix check below, which only compares
        // the code against whatever year was sent and so accepts any absurd year with a matching
        // prefix (year 0 + "00CS44", year 9999 + "99CS44" both pass it). The DTO's @Min is only a
        // floor; the upper bound is relative to now and can't be expressed as an annotation.
        try {
            AcademicYears.assertInRange(request.getAcademicYearOffered());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        // prefix=year invariant: the code's first two digits are the academic-year start. The UI
        // locks the prefix; this is the server backstop against a crafted request.
        if (!CourseCodes.matchesYear(request.getCourseCode(), request.getAcademicYearOffered())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Course code must start with the academic year's two digits ("
                    + CourseCodes.prefixForYear(request.getAcademicYearOffered()) + ").");
        }

        Department department = departmentRepository.findById(request.getDeptId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + request.getDeptId()));

        Subject subject = new Subject(null, request.getSubjectName(), request.getCourseCode(),
                request.getSemester(), request.getCredits(), request.getAcademicYearOffered(), department);

        // unknown/blank falls back to REGULAR: the form only sends REGULAR or ELECTIVE, and the
        // DB CHECK would reject anything else
        SubjectType type = SubjectType.fromNullable(request.getSubjectType());
        if (type == null) {
            type = SubjectType.REGULAR;
        }
        subject.setSubjectType(type);

        if (type == SubjectType.ELECTIVE && request.getEligibleDeptIds() != null && !request.getEligibleDeptIds().isEmpty()) {
            List<Department> eligibleDepts = departmentRepository.findAllById(request.getEligibleDeptIds());
            subject.setEligibleDepartments(eligibleDepts);
        }

        return subjectRepository.save(subject);
    }

    /**
     * Edit a subject. The academic year is NOT editable (it is the binding key), so the
     * course-code prefix stays locked to it. callerDeptId is non-null for HOD/DEPT_OFFICE, who may
     * only touch their own department.
     */
    @Transactional
    public Subject updateSubject(Long id, SubjectUpdateRequest request, Long callerDeptId) {
        Subject subject = subjectRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + id));

        if (callerDeptId != null
                && (subject.getDepartment() == null || !callerDeptId.equals(subject.getDepartment().getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You can only edit subjects for your own department.");
        }

        // year is fixed, so the prefix must still match it — suffix-only edits
        if (!CourseCodes.matchesYear(request.getCourseCode(), subject.getAcademicYearOffered())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Course code must start with the academic year's two digits ("
                    + CourseCodes.prefixForYear(subject.getAcademicYearOffered()) + ").");
        }

        subject.setSubjectName(request.getSubjectName());
        subject.setCourseCode(request.getCourseCode());
        subject.setSemester(request.getSemester());
        subject.setCredits(request.getCredits());

        SubjectType type = SubjectType.fromNullable(request.getSubjectType());
        if (type == null) {
            type = SubjectType.REGULAR;
        }
        subject.setSubjectType(type);
        if (type == SubjectType.ELECTIVE
                && request.getEligibleDeptIds() != null && !request.getEligibleDeptIds().isEmpty()) {
            subject.setEligibleDepartments(departmentRepository.findAllById(request.getEligibleDeptIds()));
        } else {
            subject.setEligibleDepartments(new ArrayList<>());
        }

        try {
            return subjectRepository.saveAndFlush(subject);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Another subject with course code '" + request.getCourseCode()
                    + "' already exists for this academic year.");
        }
    }

    /** Delete a subject, dept-scoped; blocked if any registration references it, since removing
     *  it out from under a registration would corrupt that record. */
    @Transactional
    public void deleteSubject(Long id, Long callerDeptId) {
        Subject subject = subjectRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + id));

        if (callerDeptId != null
                && (subject.getDepartment() == null || !callerDeptId.equals(subject.getDepartment().getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You can only delete subjects for your own department.");
        }
        if (registrationRepository.existsBySubjects_Id(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This subject is referenced by existing registrations and cannot be deleted.");
        }
        subjectRepository.delete(subject);
    }

    /**
     * Options for the admin list's subject dropdown: the distinct subjects actually registered for
     * under the caller's other filters. Mirrors RegistrationSpecification's predicates — keep the
     * two in step, or the dropdown offers a subject that yields no rows.
     *
     * @param studentRollNos proctor scope; null = unrestricted. An EMPTY set means "assigned to
     *     nobody" and callers must short-circuit — an empty IN list is not valid SQL, and omitting
     *     the predicate would leak every department's subjects to a proctor.
     */
    public List<Subject> findDistinctSubjectsByRegistrationFilters(
            Long departmentId, String subjectType, String searchQuery, Integer semester,
            Collection<String> studentRollNos) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Subject> query = cb.createQuery(Subject.class);
        Root<Registration> registrationRoot = query.from(Registration.class);
        Join<Registration, Subject> subjectJoin = registrationRoot.join("subjects");

        query.select(subjectJoin).distinct(true);

        List<Predicate> predicates = new ArrayList<>();
        boolean needsStudent = (searchQuery != null && !searchQuery.isBlank()) || semester != null;
        Join<Registration, Student> studentJoin =
                needsStudent ? registrationRoot.join("student") : null;

        if (departmentId != null) {
            Predicate offeredBy = cb.equal(subjectJoin.join("department", JoinType.LEFT).get("id"), departmentId);
            Predicate eligibleFor = cb.equal(subjectJoin.join("eligibleDepartments", JoinType.LEFT).get("id"), departmentId);
            predicates.add(cb.or(offeredBy, eligibleFor));
        }

        SubjectType subjectTypeFilter = SubjectType.fromNullable(subjectType);
        if (subjectTypeFilter != null) {
            predicates.add(cb.equal(subjectJoin.get("subjectType"), subjectTypeFilter));
        }

        if (searchQuery != null && !searchQuery.isBlank()) {
            Predicate namePredicate = cb.like(cb.lower(studentJoin.get("name")), "%" + searchQuery.toLowerCase() + "%");
            Predicate usnPredicate = cb.like(cb.lower(studentJoin.get("rollNo")), "%" + searchQuery.toLowerCase() + "%");
            predicates.add(cb.or(namePredicate, usnPredicate));
        }

        if (semester != null) {
            // same COALESCE as RegistrationSpecification — match the displayed semester, not the
            // raw snapshot column
            predicates.add(cb.equal(
                    cb.coalesce(registrationRoot.get("snapSemester"), studentJoin.get("currentSemester")),
                    semester));
        }

        if (studentRollNos != null && !studentRollNos.isEmpty()) {
            predicates.add(registrationRoot.get("student").get("rollNo").in(studentRollNos));
        }

        if (!predicates.isEmpty()) {
            query.where(cb.and(predicates.toArray(new Predicate[0])));
        }

        query.orderBy(cb.asc(subjectJoin.get("subjectName")));
        return entityManager.createQuery(query).getResultList();
    }
}