package com.college.backlog.controller.dto;

import java.util.List;

// Summary of a bulk progression op. With dryRun true nothing was written and the counts describe
// what would happen.
public class BatchResult {
    private boolean dryRun;
    private int created;
    private int skipped;
    // Rows whose academic year contradicts the stored one: not written, and NOT errors — the batch
    // succeeded, these rows need a human decision. Counted apart so a run of conflicts doesn't read
    // as a failed import (nor hide among the skips, which is the bug this outcome exists to fix).
    private int conflicts;
    private int errors;
    private List<ProgressionRowResult> results;

    public BatchResult(boolean dryRun, int created, int skipped, int conflicts, int errors,
                       List<ProgressionRowResult> results) {
        this.dryRun = dryRun;
        this.created = created;
        this.skipped = skipped;
        this.conflicts = conflicts;
        this.errors = errors;
        this.results = results;
    }

    public boolean isDryRun() { return dryRun; }
    public int getCreated() { return created; }
    public int getSkipped() { return skipped; }
    public int getConflicts() { return conflicts; }
    public int getErrors() { return errors; }
    public List<ProgressionRowResult> getResults() { return results; }
}
