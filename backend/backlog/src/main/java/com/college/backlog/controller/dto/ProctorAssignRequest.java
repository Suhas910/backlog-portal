package com.college.backlog.controller.dto;

import java.util.List;

// Batch claim/assign request. `proctor` is the target proctor's username —
// required for HOD/ADMIN/PRINCIPAL callers, and for a PROCTOR caller it must be
// absent or their own username (self-claim only).
public class ProctorAssignRequest {
    private List<String> rollNos;
    private String proctor;

    public List<String> getRollNos() { return rollNos; }
    public void setRollNos(List<String> rollNos) { this.rollNos = rollNos; }

    public String getProctor() { return proctor; }
    public void setProctor(String proctor) { this.proctor = proctor; }
}
