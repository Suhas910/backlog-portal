package com.college.backlog.controller.dto;

import java.util.List;

// Linear-default backfill over a cohort (same selectors as promote). Seeds each student's whole
// plan, entry semester through 8, assuming no detention; write-once.
public class BackfillRequest {
    private Long deptId;
    private Integer admissionYear;
    private List<String> rollNos;
    private boolean dryRun;

    public Long getDeptId() { return deptId; }
    public void setDeptId(Long deptId) { this.deptId = deptId; }

    public Integer getAdmissionYear() { return admissionYear; }
    public void setAdmissionYear(Integer admissionYear) { this.admissionYear = admissionYear; }

    public List<String> getRollNos() { return rollNos; }
    public void setRollNos(List<String> rollNos) { this.rollNos = rollNos; }

    public boolean isDryRun() { return dryRun; }
    public void setDryRun(boolean dryRun) { this.dryRun = dryRun; }
}
