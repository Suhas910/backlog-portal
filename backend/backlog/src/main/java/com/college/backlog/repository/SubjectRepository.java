package com.college.backlog.repository;

import com.college.backlog.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {

    // Phase 2: subjects are resolved by the academic year a student actually
    // studied a semester (from their progression), not a client-supplied year.
    List<Subject> findByAcademicYearOfferedAndSemester(int academicYearOffered, int semester);
}
