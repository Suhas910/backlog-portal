package com.college.backlog.controller.dto;

import java.util.List;

/**
 * A student missing progression (StudentSemesterTerm) rows for one or more
 * semesters in their eligibility window — surfaced by the Progression "gaps" view
 * so staff can set the academic-year timeline for newly added students.
 */
public class StudentGapResponse {
    private final String rollNo;
    private final String name;
    private final int currentSemester;
    private final int entrySemester;
    private final List<Integer> missingSemesters;

    public StudentGapResponse(String rollNo, String name, int currentSemester,
                              int entrySemester, List<Integer> missingSemesters) {
        this.rollNo = rollNo;
        this.name = name;
        this.currentSemester = currentSemester;
        this.entrySemester = entrySemester;
        this.missingSemesters = missingSemesters;
    }

    public String getRollNo() { return rollNo; }
    public String getName() { return name; }
    public int getCurrentSemester() { return currentSemester; }
    public int getEntrySemester() { return entrySemester; }
    public List<Integer> getMissingSemesters() { return missingSemesters; }
}
