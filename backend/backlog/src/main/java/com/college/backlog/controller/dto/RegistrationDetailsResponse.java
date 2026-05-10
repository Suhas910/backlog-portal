package com.college.backlog.controller.dto;

import java.util.List;

public class RegistrationDetailsResponse {
    private String regId;
    private String studentName;
    private String rollNo;
    private String email;
    private int semester;
    private int yearOfJoining;
    private List<String> subjects;
    private String status;
    private String registeredAt;

    public RegistrationDetailsResponse() {}

    public RegistrationDetailsResponse(String regId, String studentName, String rollNo, String email, int semester, int yearOfJoining, List<String> subjects, String status, String registeredAt) {
        this.regId = regId;
        this.studentName = studentName;
        this.rollNo = rollNo;
        this.email = email;
        this.semester = semester;
        this.yearOfJoining = yearOfJoining;
        this.subjects = subjects;
        this.status = status;
        this.registeredAt = registeredAt;
    }

    public String getRegId() { return regId; }
    public void setRegId(String regId) { this.regId = regId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getRollNo() { return rollNo; }
    public void setRollNo(String rollNo) { this.rollNo = rollNo; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public int getSemester() { return semester; }
    public void setSemester(int semester) { this.semester = semester; }

    public int getYearOfJoining() { return yearOfJoining; }
    public void setYearOfJoining(int yearOfJoining) { this.yearOfJoining = yearOfJoining; }

    public List<String> getSubjects() { return subjects; }
    public void setSubjects(List<String> subjects) { this.subjects = subjects; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(String registeredAt) { this.registeredAt = registeredAt; }
}
