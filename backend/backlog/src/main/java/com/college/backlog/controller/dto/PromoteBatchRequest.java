package com.college.backlog.controller.dto;

import java.util.List;

// Bulk promotion to targetSemester for the given academic year. Cohort = (deptId and/or
// admissionYear) OR an explicit rollNos list; excludeRollNos are held back (detention).
// dryRun previews without writing.
public class PromoteBatchRequest {
    private Long deptId;            // optional dept filter
    private Integer admissionYear;  // optional 4-digit admission year (e.g. 2024)
    private List<String> rollNos;   // optional explicit list (overrides filters)
    private int targetSemester;
    private int academicYear;
    private List<String> excludeRollNos;
    private boolean dryRun;

    public Long getDeptId() { return deptId; }
    public void setDeptId(Long deptId) { this.deptId = deptId; }

    public Integer getAdmissionYear() { return admissionYear; }
    public void setAdmissionYear(Integer admissionYear) { this.admissionYear = admissionYear; }

    public List<String> getRollNos() { return rollNos; }
    public void setRollNos(List<String> rollNos) { this.rollNos = rollNos; }

    public int getTargetSemester() { return targetSemester; }
    public void setTargetSemester(int targetSemester) { this.targetSemester = targetSemester; }

    public int getAcademicYear() { return academicYear; }
    public void setAcademicYear(int academicYear) { this.academicYear = academicYear; }

    public List<String> getExcludeRollNos() { return excludeRollNos; }
    public void setExcludeRollNos(List<String> excludeRollNos) { this.excludeRollNos = excludeRollNos; }

    public boolean isDryRun() { return dryRun; }
    public void setDryRun(boolean dryRun) { this.dryRun = dryRun; }
}
