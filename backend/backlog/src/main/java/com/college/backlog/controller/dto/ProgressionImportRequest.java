package com.college.backlog.controller.dto;

import java.util.List;

public class ProgressionImportRequest {
    private List<ProgressionImportRow> rows;
    private boolean dryRun;

    public List<ProgressionImportRow> getRows() { return rows; }
    public void setRows(List<ProgressionImportRow> rows) { this.rows = rows; }

    public boolean isDryRun() { return dryRun; }
    public void setDryRun(boolean dryRun) { this.dryRun = dryRun; }
}
