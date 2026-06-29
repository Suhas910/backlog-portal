package com.college.backlog.service;

import com.college.backlog.model.Student;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Filters the student roster. {@code rollNoLike} is a USN SQL-LIKE pattern that the
 * controller builds from the (department branch code, admission year) filters — the
 * USN is the single source of branch + year, so dept-scoping rides on it too.
 * {@code semester} matches currentSemester; {@code query} is a free-text contains on
 * USN or name. Any argument may be null (= no filter).
 */
public class StudentSpecification implements Specification<Student> {

    private final String rollNoLike;
    private final Integer semester;
    private final String query;

    public StudentSpecification(String rollNoLike, Integer semester, String query) {
        this.rollNoLike = rollNoLike;
        this.semester = semester;
        this.query = query;
    }

    @Override
    public Predicate toPredicate(Root<Student> root, CriteriaQuery<?> q, CriteriaBuilder cb) {
        List<Predicate> predicates = new ArrayList<>();
        if (rollNoLike != null && !rollNoLike.isBlank()) {
            predicates.add(cb.like(root.get("rollNo"), rollNoLike));
        }
        if (semester != null) {
            predicates.add(cb.equal(root.get("currentSemester"), semester));
        }
        if (query != null && !query.isBlank()) {
            String like = "%" + query.trim().toLowerCase() + "%";
            predicates.add(cb.or(
                cb.like(cb.lower(root.get("rollNo")), like),
                cb.like(cb.lower(root.get("name")), like)));
        }
        return cb.and(predicates.toArray(new Predicate[0]));
    }
}
