package com.college.backlog.repository;

import com.college.backlog.model.Registration;
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
    List<Registration> findAllByOrderByRegisteredAtDesc();

    @EntityGraph(attributePaths = {"student", "subjects", "examCycle"})
    List<Registration> findByStudent_RollNo(String rollNo);

    List<Registration> findByStudent_RollNoAndExamCycle_Id(String rollNo, Long examCycleId);

    // Fetch-joins the relations the list/PDF mappers touch per row; without
    // this, student/subjects/examCycle each fire a separate query per result
    @Override
    @EntityGraph(attributePaths = {"student", "subjects", "examCycle"})
    List<Registration> findAll(Specification<Registration> spec, Sort sort);
}