package com.college.backlog.repository;

import com.college.backlog.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, String>, JpaSpecificationExecutor<Student> {
    Optional<Student> findByRollNo(String rollNo);

    // Cohort selection keys off the USN (the single source of truth for branch +
    // admission year). Patterns use SQL LIKE wildcards, e.g. "1MS24CS%" for the
    // 2024 CS batch, "1MS__CS%" for all CS years.
    List<Student> findByRollNoLikeOrderByRollNo(String pattern);
    List<Student> findByRollNoInOrderByRollNo(Collection<String> rollNos);

    // Department-delete guard: students carry their branch as the 2-letter code
    // (no FK), so a department can't be removed while students of that branch exist
    // — they'd be left unable to register.
    boolean existsByBranchIgnoreCase(String branch);
}