package com.college.backlog.repository;

import com.college.backlog.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, String> {
    long countByRole(String role);
}