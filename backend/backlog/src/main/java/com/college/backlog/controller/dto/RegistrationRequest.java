package com.college.backlog.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.util.List;

public class RegistrationRequest {
    // USN format: 1MS<2-digit year><2-letter branch code><3-digit serial>, e.g. 1MS22CS001.
    // Year of joining and branch are derived from this server-side.
    @NotBlank(message = "USN is required")
    @Pattern(regexp = "^1MS\\d{2}[A-Za-z]{2}\\d{3}$",
             message = "USN must be in the format 1MS22CS001")
    private String rollNo;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid address")
    @Pattern(regexp = "^[A-Za-z0-9._%+-]+@msrit\\.edu$", flags = Pattern.Flag.CASE_INSENSITIVE,
             message = "Email must be a valid @msrit.edu address")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;

    @Positive(message = "Current semester is required")
    private int currentSemester;

    @NotEmpty(message = "At least one subject must be selected")
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

    public int getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(int currentSemester) { this.currentSemester = currentSemester; }

    public List<Long> getSubjectIds() { return subjectIds; }
    public void setSubjectIds(List<Long> subjectIds) { this.subjectIds = subjectIds; }
}
