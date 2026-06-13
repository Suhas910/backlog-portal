package com.college.backlog.controller.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SubjectCreateRequest {
    @NotBlank(message = "Subject name cannot be empty")
    private String subjectName;

    @NotBlank(message = "Course code cannot be empty")
    private String courseCode;

    @Min(value = 1, message = "Semester must be between 1 and 8")
    @Max(value = 8, message = "Semester must be between 1 and 8")
    private int semester;

    @Min(value = 0, message = "Credits cannot be negative")
    private int credits;

    @NotNull(message = "Academic year offered must be provided")
    private int academicYearOffered;

    @NotNull(message = "Department ID must be provided")
    private Long deptId;

    private String subjectType = "REGULAR";

    private java.util.List<Long> eligibleDeptIds = new java.util.ArrayList<>();

    // Getters and Setters
    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public int getSemester() { return semester; }
    public void setSemester(int semester) { this.semester = semester; }

    public int getCredits() { return credits; }
    public void setCredits(int credits) { this.credits = credits; }

    public int getAcademicYearOffered() { return academicYearOffered; }
    public void setAcademicYearOffered(int academicYearOffered) { this.academicYearOffered = academicYearOffered; }

    public Long getDeptId() { return deptId; }
    public void setDeptId(Long deptId) { this.deptId = deptId; }

    public String getSubjectType() { return subjectType; }
    public void setSubjectType(String subjectType) { this.subjectType = subjectType; }

    public java.util.List<Long> getEligibleDeptIds() { return eligibleDeptIds; }
    public void setEligibleDeptIds(java.util.List<Long> eligibleDeptIds) { this.eligibleDeptIds = eligibleDeptIds; }
}