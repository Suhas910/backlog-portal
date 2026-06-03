package com.college.backlog.controller.dto;

import java.util.List;

public class RegistrationSummaryResponse {
    private String regId;
    private String rollNo;
    private String studentName;
    private int semester;
    private int yearOfJoining;
    private List<String> subjects;
    private String status;
    private String registeredAt;
    private String verifiedBy;

    public RegistrationSummaryResponse(String regId, String rollNo, String studentName, int semester, int yearOfJoining, List<String> subjects, String status, String registeredAt, String verifiedBy) {
        this.regId = regId;
        this.rollNo = rollNo;
        this.studentName = studentName;
        this.semester = semester;
        this.yearOfJoining = yearOfJoining;
        this.subjects = subjects;
        this.status = status;
        this.registeredAt = registeredAt;
        this.verifiedBy = verifiedBy;
    }

    // Getters
    public String getRegId() { return regId; }
    public String getRollNo() { return rollNo; }
    public String getStudentName() { return studentName; }
    public int getSemester() { return semester; }
    public int getYearOfJoining() { return yearOfJoining; }
    public List<String> getSubjects() { return subjects; }
    public String getStatus() { return status; }
    public String getRegisteredAt() { return registeredAt; }
    public String getVerifiedBy() { return verifiedBy; }
}