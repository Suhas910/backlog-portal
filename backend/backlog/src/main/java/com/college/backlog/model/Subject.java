package com.college.backlog.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "subjects")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subject_name")
    private String subjectName;

    private int semester;

    @Column(name = "year_of_joining")
    private int yearOfJoining;

    @ManyToOne
    @JoinColumn(name = "dept_id")
    private Department department;
}
