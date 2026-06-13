package com.college.backlog.service;

import com.college.backlog.controller.dto.SubjectCreateRequest;
import com.college.backlog.exception.ResourceNotFoundException;
import com.college.backlog.model.*;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.SubjectRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SubjectService {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private EntityManager entityManager;

    @Transactional
    public Subject createSubject(SubjectCreateRequest request) {
        Department department = departmentRepository.findById(request.getDeptId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + request.getDeptId()));

        Subject subject = new Subject(null, request.getSubjectName(), request.getCourseCode(),
                request.getSemester(), request.getCredits(), request.getAcademicYearOffered(), department);

        // Unknown/blank types fall back to REGULAR — the create form only ever
        // sends REGULAR or ELECTIVE, and the DB CHECK constraint would reject
        // anything else anyway.
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

    public List<Subject> findDistinctSubjectsByRegistrationFilters(Long departmentId, String subjectType, String searchQuery, LocalDate startDate, LocalDate endDate) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Subject> query = cb.createQuery(Subject.class);
        Root<Registration> registrationRoot = query.from(Registration.class);
        Join<Registration, Subject> subjectJoin = registrationRoot.join("subjects");

        query.select(subjectJoin).distinct(true);

        List<Predicate> predicates = new ArrayList<>();

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
            Join<Registration, Student> studentJoin = registrationRoot.join("student");
            Predicate namePredicate = cb.like(cb.lower(studentJoin.get("name")), "%" + searchQuery.toLowerCase() + "%");
            Predicate usnPredicate = cb.like(cb.lower(studentJoin.get("rollNo")), "%" + searchQuery.toLowerCase() + "%");
            predicates.add(cb.or(namePredicate, usnPredicate));
        }

        if (startDate != null) {
            predicates.add(cb.greaterThanOrEqualTo(registrationRoot.get("registeredAt"), startDate.atStartOfDay()));
        }

        if (endDate != null) {
            predicates.add(cb.lessThanOrEqualTo(registrationRoot.get("registeredAt"), endDate.atTime(LocalTime.MAX)));
        }

        if (!predicates.isEmpty()) {
            query.where(cb.and(predicates.toArray(new Predicate[0])));
        }

        query.orderBy(cb.asc(subjectJoin.get("subjectName")));
        return entityManager.createQuery(query).getResultList();
    }
}