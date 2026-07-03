package com.college.backlog.controller.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

// Submitted by an authenticated student. Identity (USN, name, email, phone, DOB) and
// the student's current semester are taken from the authenticated account, never from
// the request body — only the subject selection is client-supplied.
public class StudentRegistrationRequest {

    @NotEmpty(message = "At least one subject must be selected")
    private List<Long> subjectIds;

    public StudentRegistrationRequest() {}

    public List<Long> getSubjectIds() { return subjectIds; }
    public void setSubjectIds(List<Long> subjectIds) { this.subjectIds = subjectIds; }
}
