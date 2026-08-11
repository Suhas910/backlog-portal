package com.college.backlog.controller.dto;

// Per-row outcome of a bulk progression op (promote/import/backfill).
// status: CREATED | SKIPPED_EXISTS | CONFLICT | ERROR | WOULD_CREATE | WOULD_SKIP | WOULD_CONFLICT.
public class ProgressionRowResult {
    private String rollNo;
    private Integer semester;
    private String status;
    private String message;
    // CONFLICT rows only: the year this row asked for, so the UI can offer to apply it through the
    // audited override endpoint. As a field rather than something scraped back out of `message` —
    // the message is prose for a human and must stay free to change.
    private Integer requestedAcademicYear;

    public ProgressionRowResult(String rollNo, Integer semester, String status, String message) {
        this(rollNo, semester, status, message, null);
    }

    public ProgressionRowResult(String rollNo, Integer semester, String status, String message,
                                Integer requestedAcademicYear) {
        this.rollNo = rollNo;
        this.semester = semester;
        this.status = status;
        this.message = message;
        this.requestedAcademicYear = requestedAcademicYear;
    }

    public String getRollNo() { return rollNo; }
    public Integer getSemester() { return semester; }
    public String getStatus() { return status; }
    public String getMessage() { return message; }
    public Integer getRequestedAcademicYear() { return requestedAcademicYear; }
}
