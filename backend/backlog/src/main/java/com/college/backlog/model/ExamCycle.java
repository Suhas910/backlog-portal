package com.college.backlog.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import java.time.Instant;

@Entity
@Table(name = "exam_cycles")
public class ExamCycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "exam_month_year")
    private String examMonthYear;

    private boolean active;

    // Academic-year context of this cycle, used when stamping student progression.
    // academicYear: start year (2023 = AY 2023-24). term: ODD | EVEN.
    // Nullable/0 on legacy rows until an admin sets them. See ADR.
    @Column(name = "academic_year")
    @ColumnDefault("0")
    private int academicYear;

    @Column(name = "term")
    private String term;

    @Column(name = "created_at")
    private Instant createdAt;

    public ExamCycle() {}

    public ExamCycle(String name, String examMonthYear) {
        this.name = name;
        this.examMonthYear = examMonthYear;
        this.active = false;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getExamMonthYear() { return examMonthYear; }
    public void setExamMonthYear(String examMonthYear) { this.examMonthYear = examMonthYear; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public int getAcademicYear() { return academicYear; }
    public void setAcademicYear(int academicYear) { this.academicYear = academicYear; }

    public String getTerm() { return term; }
    public void setTerm(String term) { this.term = term; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
