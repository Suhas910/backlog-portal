package com.college.backlog.service;

import com.college.backlog.model.Registration;
import com.college.backlog.model.Student;
import com.college.backlog.model.Subject;
import com.college.backlog.model.SubjectType;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class RegistrationSpecification implements Specification<Registration> {

    private final Long subjectId;
    private final Long departmentId;
    private final String subjectType;
    private final String searchQuery;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final Long examCycleId;

    public RegistrationSpecification(Long subjectId, Long departmentId, String subjectType, String searchQuery, LocalDate startDate, LocalDate endDate, Long examCycleId) {
        this.subjectId = subjectId;
        this.departmentId = departmentId;
        this.subjectType = subjectType;
        this.searchQuery = searchQuery;
        this.startDate = startDate;
        this.endDate = endDate;
        this.examCycleId = examCycleId;
    }

    @Override
    public Predicate toPredicate(Root<Registration> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
        List<Predicate> predicates = new ArrayList<>();
        query.distinct(true);

        if (subjectId != null || departmentId != null || (subjectType != null && !subjectType.isBlank())) {
            Join<Registration, Subject> subjectJoin = root.join("subjects", JoinType.LEFT);
            if (subjectId != null) {
                predicates.add(cb.equal(subjectJoin.get("id"), subjectId));
            }
            if (departmentId != null) {
                Predicate offeredBy = cb.equal(
                        subjectJoin.join("department", JoinType.LEFT).get("id"), departmentId);
                Predicate eligibleFor = cb.equal(
                        subjectJoin.join("eligibleDepartments", JoinType.LEFT).get("id"), departmentId);
                predicates.add(cb.or(offeredBy, eligibleFor));
            }
            SubjectType subjectTypeFilter = SubjectType.fromNullable(subjectType);
            if (subjectTypeFilter != null) {
                predicates.add(cb.equal(subjectJoin.get("subjectType"), subjectTypeFilter));
            }
        }

        if (searchQuery != null && !searchQuery.isBlank()) {
            Join<Registration, Student> studentJoin = root.join("student", JoinType.LEFT);
            Predicate namePredicate = cb.like(cb.lower(studentJoin.get("name")), "%" + searchQuery.toLowerCase() + "%");
            Predicate usnPredicate = cb.like(cb.lower(studentJoin.get("rollNo")), "%" + searchQuery.toLowerCase() + "%");
            predicates.add(cb.or(namePredicate, usnPredicate));
        }

        if (startDate != null) { predicates.add(cb.greaterThanOrEqualTo(root.get("registeredAt"), startDate.atStartOfDay())); }
        if (endDate != null) { predicates.add(cb.lessThanOrEqualTo(root.get("registeredAt"), endDate.atTime(LocalTime.MAX))); }

        if (examCycleId != null) {
            predicates.add(cb.equal(root.join("examCycle", JoinType.LEFT).get("id"), examCycleId));
        }

        return cb.and(predicates.toArray(new Predicate[0]));
    }
}