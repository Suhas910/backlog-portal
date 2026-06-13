package com.college.backlog.controller.dto;

import java.util.List;

// A student's full progression map, for the admin view/correction screen.
public class StudentProgressionResponse {
    private String rollNo;
    private String name;
    private int currentSemester;
    private List<Term> terms;

    public StudentProgressionResponse(String rollNo, String name, int currentSemester, List<Term> terms) {
        this.rollNo = rollNo;
        this.name = name;
        this.currentSemester = currentSemester;
        this.terms = terms;
    }

    public String getRollNo() { return rollNo; }
    public String getName() { return name; }
    public int getCurrentSemester() { return currentSemester; }
    public List<Term> getTerms() { return terms; }

    public static class Term {
        private int semester;
        private int academicYear;

        public Term(int semester, int academicYear) {
            this.semester = semester;
            this.academicYear = academicYear;
        }

        public int getSemester() { return semester; }
        public int getAcademicYear() { return academicYear; }
    }
}
