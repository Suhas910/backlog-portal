package com.college.backlog.controller.dto;

// Read-only profile shown on the student dashboard. Deliberately omits DOB
// (it is a login secret) and password fields.
public class StudentProfileResponse {
    private String rollNo;
    private String name;
    private String email;
    private String branch;
    private String phone;          // may be null until the student sets it
    private int currentSemester;

    public StudentProfileResponse(String rollNo, String name, String email,
                                  String branch, String phone, int currentSemester) {
        this.rollNo = rollNo;
        this.name = name;
        this.email = email;
        this.branch = branch;
        this.phone = phone;
        this.currentSemester = currentSemester;
    }

    public String getRollNo() { return rollNo; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getBranch() { return branch; }
    public String getPhone() { return phone; }
    public int getCurrentSemester() { return currentSemester; }
}
