package com.college.backlog.controller.dto;

/**
 * Roster row for the admin Students list. Deliberately omits dateOfBirth — DOB is
 * the student login credential and is never returned by any endpoint (write-only).
 * {@code progressionComplete} is false when the student is missing a term row for
 * any semester in their eligibility window (see the Progression "gaps" view).
 */
public class StudentSummaryResponse {
    private final String rollNo;
    private final String name;
    private final String email;
    private final String phone;
    private final String branch;
    private final int currentSemester;
    private final int entrySemester;
    private final boolean progressionComplete;

    public StudentSummaryResponse(String rollNo, String name, String email, String phone,
                                  String branch, int currentSemester, int entrySemester,
                                  boolean progressionComplete) {
        this.rollNo = rollNo;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.branch = branch;
        this.currentSemester = currentSemester;
        this.entrySemester = entrySemester;
        this.progressionComplete = progressionComplete;
    }

    public String getRollNo() { return rollNo; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getBranch() { return branch; }
    public int getCurrentSemester() { return currentSemester; }
    public int getEntrySemester() { return entrySemester; }
    public boolean isProgressionComplete() { return progressionComplete; }
}
