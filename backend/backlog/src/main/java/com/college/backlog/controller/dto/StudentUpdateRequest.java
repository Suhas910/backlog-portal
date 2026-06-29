package com.college.backlog.controller.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Edit an existing student. The USN (rollNo), email and dateOfBirth are NOT editable
 * here — the USN is the identity key, email is system-managed ({@code <usn>@msrit.edu}),
 * and DOB (the login credential) is changed only via the dedicated reset-DOB endpoint.
 * currentSemester is correctable (it changes the eligibility window — the UI warns);
 * validated 1 ≤ entry ≤ current ≤ 8.
 */
public class StudentUpdateRequest {

    @NotBlank
    private String name;

    private String phone;

    private int currentSemester;

    private int entrySemester = 1;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public int getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(int currentSemester) { this.currentSemester = currentSemester; }

    public int getEntrySemester() { return entrySemester; }
    public void setEntrySemester(int entrySemester) { this.entrySemester = entrySemester; }
}
