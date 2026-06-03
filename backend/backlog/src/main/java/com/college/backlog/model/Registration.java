package com.college.backlog.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "registrations")
public class Registration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reg_id", unique = true)
    private String regId;

    @ManyToOne
    @JoinColumn(name = "roll_no")
    private Student student;

    @ManyToMany
    @JoinTable(
        name = "registration_subjects",
        joinColumns = @JoinColumn(
            name = "reg_id",
            referencedColumnName = "reg_id"
        ),
        inverseJoinColumns = @JoinColumn(name = "subject_id")
    )
    private List<Subject> subjects;

    @Column(name = "registered_at")
    private LocalDateTime registeredAt;

    private String status;

    @Column(name = "verified_by")
    private String verifiedBy;

    public Registration() {}

    public Registration(Long id, String regId, Student student, List<Subject> subjects, LocalDateTime registeredAt, String status) {
        this.id = id;
        this.regId = regId;
        this.student = student;
        this.subjects = subjects;
        this.registeredAt = registeredAt;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRegId() { return regId; }
    public void setRegId(String regId) { this.regId = regId; }

    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }

    public List<Subject> getSubjects() { return subjects; }
    public void setSubjects(List<Subject> subjects) { this.subjects = subjects; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }
}
