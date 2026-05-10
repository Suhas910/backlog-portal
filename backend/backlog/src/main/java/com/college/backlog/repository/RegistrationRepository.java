package com.college.backlog.repository;

import com.college.backlog.model.Registration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegistrationRepository extends JpaRepository<Registration, Long> {
    Optional<Registration> findByRegId(String regId);
    List<Registration> findAllByOrderByRegisteredAtDesc();
}