package com.college.backlog.service;

import com.college.backlog.model.Registration;
import com.college.backlog.model.Student;
import com.college.backlog.model.Subject;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class RegistrationSpecification implements Specification<Registration> {

    private final Long subjectId;
    private final String searchQuery;
    private final LocalDate startDate;
    private final LocalDate endDate;

    public RegistrationSpecification(Long subjectId, String searchQuery, LocalDate startDate, LocalDate endDate) {
        this.subjectId = subjectId;
        this.searchQuery = searchQuery;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    @Override
    public Predicate toPredicate(Root<Registration> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
        List<Predicate> predicates = new ArrayList<>();

        if (subjectId != null) {
            predicates.add(cb.equal(root.join("subjects").get("id"), subjectId));
        }

        if (searchQuery != null && !searchQuery.isBlank()) {
            Join<Registration, Student> studentJoin = root.join("student");
            Predicate namePredicate = cb.like(cb.lower(studentJoin.get("name")), "%" + searchQuery.toLowerCase() + "%");
            Predicate usnPredicate = cb.like(cb.lower(studentJoin.get("rollNo")), "%" + searchQuery.toLowerCase() + "%");
            predicates.add(cb.or(namePredicate, usnPredicate));
        }

        if (startDate != null) { predicates.add(cb.greaterThanOrEqualTo(root.get("registeredAt"), startDate.atStartOfDay())); }
        if (endDate != null) { predicates.add(cb.lessThanOrEqualTo(root.get("registeredAt"), endDate.atTime(LocalTime.MAX))); }

        return cb.and(predicates.toArray(new Predicate[0]));
    }
}