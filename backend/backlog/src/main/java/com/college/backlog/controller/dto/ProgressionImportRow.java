package com.college.backlog.controller.dto;

// One row of a progression CSV import: which academic year a student studied a semester.
public class ProgressionImportRow {
    private String rollNo;
    private int semester;
    private int academicYear;

    public String getRollNo() { return rollNo; }
    public void setRollNo(String rollNo) { this.rollNo = rollNo; }

    public int getSemester() { return semester; }
    public void setSemester(int semester) { this.semester = semester; }

    public int getAcademicYear() { return academicYear; }
    public void setAcademicYear(int academicYear) { this.academicYear = academicYear; }
}
