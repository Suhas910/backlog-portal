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

    List<Student> findByRollNoInOrderByRollNo(Collection<String> rollNos);

    // Department-delete guard: students carry their branch as the 2-letter code with no FK, so a
    // department can't be removed while students of that branch exist — they couldn't register.
    boolean existsByBranchIgnoreCase(String branch);
}