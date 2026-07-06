package com.college.backlog.controller.dto;

/**
 * Correct a student's current + entry semester from the progression "View & correct"
 * screen. Only these two fields — name/email/phone/DOB are managed elsewhere. Validated
 * 1 ≤ entry ≤ current ≤ 8 in the service (StudentManagementService.updateSemesters).
 */
public class SemesterUpdateRequest {

    private int currentSemester;
    private int entrySemester = 1;

    public int getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(int currentSemester) { this.currentSemester = currentSemester; }

    public int getEntrySemester() { return entrySemester; }
    public void setEntrySemester(int entrySemester) { this.entrySemester = entrySemester; }
}
