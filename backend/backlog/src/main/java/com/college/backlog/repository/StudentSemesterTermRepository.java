package com.college.backlog.repository;

import com.college.backlog.model.StudentSemesterTerm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentSemesterTermRepository extends JpaRepository<StudentSemesterTerm, Long> {
    List<StudentSemesterTerm> findByRollNo(String rollNo);

    // Batched lookup so a roster/gaps view can fetch every student's terms in one
    // query instead of one per student.
    List<StudentSemesterTerm> findByRollNoIn(Collection<String> rollNos);
    Optional<StudentSemesterTerm> findByRollNoAndSemester(String rollNo, int semester);
    boolean existsByRollNoAndSemester(String rollNo, int semester);
}
