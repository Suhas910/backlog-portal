package com.college.backlog.controller.dto;

import java.util.List;

public class RegistrationRequest {
    private String rollNo;
    private String name;
    private String email;
    private String phone;
    private int yearOfJoining;
    private int currentSemester;
    private String branch;
    private List<Long> subjectIds;

    public RegistrationRequest() {}

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

    public List<Long> getSubjectIds() { return subjectIds; }
    public void setSubjectIds(List<Long> subjectIds) { this.subjectIds = subjectIds; }
}
