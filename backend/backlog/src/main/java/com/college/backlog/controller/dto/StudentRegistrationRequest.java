package com.college.backlog.controller.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;

import java.util.List;

// Submitted by an authenticated student. Identity (USN, name, email, phone, DOB)
// is taken from the authenticated account, never from the request body.
public class StudentRegistrationRequest {

    @Positive(message = "Current semester is required")
    private int currentSemester;

    @NotEmpty(message = "At least one subject must be selected")
    private List<Long> subjectIds;

    public StudentRegistrationRequest() {}

    public int getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(int currentSemester) { this.currentSemester = currentSemester; }

    public List<Long> getSubjectIds() { return subjectIds; }
    public void setSubjectIds(List<Long> subjectIds) { this.subjectIds = subjectIds; }
}
