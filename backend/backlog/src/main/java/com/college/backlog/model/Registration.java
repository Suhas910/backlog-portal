package com.college.backlog.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "registrations")
@Data
@NoArgsConstructor
@AllArgsConstructor
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
            name = "reg_id", // Use the column name that exists in the database
            referencedColumnName = "reg_id" // Explicitly link to the 'reg_id' (UUID) column
        ),
        inverseJoinColumns = @JoinColumn(name = "subject_id")
    )
    private List<Subject> subjects;

    @Column(name = "registered_at")
    private LocalDateTime registeredAt;

    private String status;
}
