package com.college.backlog.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Student {

    @Id
    @Column(name = "roll_no")
    private String rollNo;

    private String name;
    private String email;
    private String phone;

    @Column(name = "year_of_joining")
    private int yearOfJoining;

    @Column(name = "current_semester")
    private int currentSemester;

    private String branch;

    @Column(name = "password_hash")
    private String passwordHash;
}


