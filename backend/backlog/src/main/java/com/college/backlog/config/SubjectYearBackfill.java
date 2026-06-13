package com.college.backlog.config;

import com.college.backlog.repository.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phase 0 startup backfill: populate Subject.academicYearOffered from the legacy
 * yearOfJoining for any rows still on the default 0. Idempotent and cheap — once
 * every row is populated the UPDATE affects nothing, so it is safe to leave in
 * place across restarts. See docs/adr/backlog-progression.md.
 */
@Component
@Order(20)
public class SubjectYearBackfill implements CommandLineRunner {

    @Autowired
    private SubjectRepository subjectRepository;

    @Override
    @Transactional
    public void run(String... args) {
        subjectRepository.backfillAcademicYearOffered();
    }
}
