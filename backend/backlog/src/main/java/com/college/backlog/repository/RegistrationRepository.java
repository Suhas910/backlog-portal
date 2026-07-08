package com.college.backlog.repository;

import com.college.backlog.model.Registration;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegistrationRepository extends JpaRepository<Registration, Long>, JpaSpecificationExecutor<Registration> {
    Optional<Registration> findByRegId(String regId);

    @EntityGraph(attributePaths = {"student", "subjects", "examCycle"})
    List<Registration> findByStudent_RollNo(String rollNo);

    List<Registration> findByStudent_RollNoAndExamCycle_Id(String rollNo, Long examCycleId);

    // Delete guard: is any registration referencing this subject? Blocks deletion
    // of a subject that students have already registered for.
    boolean existsBySubjects_Id(Long subjectId);

    // Delete guard: has this student ever registered? Blocks deletion of a student
    // referenced by immutable registration history.
    boolean existsByStudent_RollNo(String rollNo);

    // Fetch-joins the relations the PDF export touches per row; safe here because
    // this overload is unpaginated (export streams every matching row).
    @Override
    @EntityGraph(attributePaths = {"student", "subjects", "examCycle"})
    List<Registration> findAll(Specification<Registration> spec, Sort sort);

    // Paginated admin list. Only the ManyToOne relations are fetch-joined —
    // fetching the `subjects` collection here would force Hibernate to paginate
    // in memory. `subjects` is loaded per row via @BatchSize during mapping.
    @Override
    @EntityGraph(attributePaths = {"student", "examCycle"})
    Page<Registration> findAll(Specification<Registration> spec, Pageable pageable);
}