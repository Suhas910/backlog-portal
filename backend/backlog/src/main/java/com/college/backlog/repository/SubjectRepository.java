package com.college.backlog.repository;

import com.college.backlog.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByYearOfJoiningAndSemester(int yearOfJoining, int semester);

    // Phase 2: subjects are resolved by the academic year a student actually
    // studied a semester (from their progression), not a client-supplied year.
    List<Subject> findByAcademicYearOfferedAndSemester(int academicYearOffered, int semester);

    // One-time backfill (Phase 0): copy the legacy curriculum year into the new
    // academic-year-offered column for rows that still hold the default 0.
    // Idempotent — once populated, the WHERE clause matches nothing.
    @Modifying
    @Query("UPDATE Subject s SET s.academicYearOffered = s.yearOfJoining "
         + "WHERE s.academicYearOffered = 0 AND s.yearOfJoining <> 0")
    int backfillAcademicYearOffered();
}
