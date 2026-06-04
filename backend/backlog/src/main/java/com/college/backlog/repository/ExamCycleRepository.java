package com.college.backlog.repository;

import com.college.backlog.model.ExamCycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamCycleRepository extends JpaRepository<ExamCycle, Long> {
    Optional<ExamCycle> findByActiveTrue();
    List<ExamCycle> findAllByOrderByCreatedAtDesc();
}
