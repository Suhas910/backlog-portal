package com.college.backlog.model;

import jakarta.persistence.*;

@Entity
@Table(name = "subjects")
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subject_name")
    private String subjectName;

    @Column(name = "course_code")
    private String courseCode;

    private int semester;

    private int credits;

    @Column(name = "year_of_joining")
    private int yearOfJoining;

    @ManyToOne
    @JoinColumn(name = "dept_id")
    private Department department;

    public Subject() {}

    public Subject(Long id, String subjectName, String courseCode, int semester, int credits, int yearOfJoining, Department department) {
        this.id = id;
        this.subjectName = subjectName;
        this.courseCode = courseCode;
        this.semester = semester;
        this.credits = credits;
        this.yearOfJoining = yearOfJoining;
        this.department = department;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public int getSemester() { return semester; }
    public void setSemester(int semester) { this.semester = semester; }

    public int getCredits() { return credits; }
    public void setCredits(int credits) { this.credits = credits; }

    public int getYearOfJoining() { return yearOfJoining; }
    public void setYearOfJoining(int yearOfJoining) { this.yearOfJoining = yearOfJoining; }

    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }
}
