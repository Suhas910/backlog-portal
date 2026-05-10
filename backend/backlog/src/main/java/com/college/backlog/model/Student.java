package com.college.backlog.model;

import jakarta.persistence.*;

@Entity
@Table(name = "students")
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

    public Student() {}

    public Student(String rollNo, String name, String email, String phone, int yearOfJoining, int currentSemester, String branch, String passwordHash) {
        this.rollNo = rollNo;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.yearOfJoining = yearOfJoining;
        this.currentSemester = currentSemester;
        this.branch = branch;
        this.passwordHash = passwordHash;
    }

    public String getRollNo() { return rollNo; }
    public void setRollNo(String rollNo) { this.rollNo = rollNo; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public int getYearOfJoining() { return yearOfJoining; }
    public void setYearOfJoining(int yearOfJoining) { this.yearOfJoining = yearOfJoining; }

    public int getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(int currentSemester) { this.currentSemester = currentSemester; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}
