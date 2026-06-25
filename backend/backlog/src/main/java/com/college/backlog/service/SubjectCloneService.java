package com.college.backlog.service;

import com.college.backlog.controller.dto.SubjectCloneApplyRequest;
import com.college.backlog.controller.dto.SubjectCloneResult;
import com.college.backlog.controller.dto.SubjectClonePreviewResponse;
import com.college.backlog.controller.dto.SubjectCreateRequest;
import com.college.backlog.model.Department;
import com.college.backlog.model.Subject;
import com.college.backlog.repository.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Clones a department's subject offerings from one academic year to the next: each
 * source row is copied with its course-code prefix and academic_year_offered bumped
 * to the target year. {@code preview} generates the editable draft; {@code apply}
 * commits the admin-approved rows with skip-existing (the
 * (course_code, academic_year_offered) uniqueness is the backstop).
 *
 * See docs/adr/backlog-progression.md.
 */
@Service
public class SubjectCloneService {

    private static final List<Integer> ALL_SEMESTERS = List.of(1, 2, 3, 4, 5, 6, 7, 8);

    @Autowired private SubjectRepository subjectRepository;
    @Autowired private SubjectService subjectService;

    public SubjectClonePreviewResponse preview(Long deptId, int sourceYear, int targetYear, List<Integer> semesters) {
        List<Integer> sems = (semesters == null || semesters.isEmpty()) ? ALL_SEMESTERS : semesters;
        List<Subject> sources = subjectRepository
            .findByDepartment_IdAndAcademicYearOfferedAndSemesterInOrderBySemesterAscSubjectNameAsc(
                deptId, sourceYear, sems);

        List<SubjectClonePreviewResponse.Row> rows = new ArrayList<>();
        for (Subject s : sources) {
            String newCode = CourseCodes.bumpPrefix(s.getCourseCode(), targetYear);
            boolean exists = newCode != null
                && subjectRepository.existsByCourseCodeAndAcademicYearOffered(newCode, targetYear);
            List<Long> eligible = s.getEligibleDepartments() == null ? List.of()
                : s.getEligibleDepartments().stream().map(Department::getId).collect(Collectors.toList());
            rows.add(new SubjectClonePreviewResponse.Row(
                s.getSubjectName(), newCode, s.getSemester(), s.getCredits(),
                s.getSubjectType() != null ? s.getSubjectType().name() : "REGULAR",
                eligible,
                exists ? "WOULD_SKIP" : "WOULD_CREATE",
                exists ? "Already exists for the target year" : null));
        }
        return new SubjectClonePreviewResponse(sourceYear, targetYear, deptId, rows);
    }

    // NOT @Transactional: each createSubject runs in its own transaction, so one
    // duplicate or bad row doesn't roll back / poison the rest of the batch.
    public SubjectCloneResult apply(Long deptId, int targetYear, List<SubjectCloneApplyRequest.Row> rows) {
        int created = 0, skipped = 0, errors = 0;
        List<SubjectCloneResult.ResultRow> results = new ArrayList<>();
        if (rows != null) {
            for (SubjectCloneApplyRequest.Row row : rows) {
                String code = row.getCourseCode() == null ? "" : row.getCourseCode().trim();
                try {
                    if (code.isEmpty()) {
                        throw new IllegalArgumentException("Course code is required.");
                    }
                    if (row.getSemester() < 1 || row.getSemester() > 8) {
                        throw new IllegalArgumentException("Semester must be between 1 and 8.");
                    }
                    if (subjectRepository.existsByCourseCodeAndAcademicYearOffered(code, targetYear)) {
                        results.add(new SubjectCloneResult.ResultRow(code, row.getSemester(), "SKIPPED_EXISTS", null));
                        skipped++;
                        continue;
                    }
                    SubjectCreateRequest req = new SubjectCreateRequest();
                    req.setSubjectName(row.getSubjectName());
                    req.setCourseCode(code);
                    req.setSemester(row.getSemester());
                    req.setCredits(row.getCredits());
                    req.setAcademicYearOffered(targetYear); // forced server-side, never from the row
                    req.setDeptId(deptId);
                    req.setSubjectType(row.getSubjectType());
                    req.setEligibleDeptIds(row.getEligibleDeptIds() != null
                        ? row.getEligibleDeptIds() : new ArrayList<>());
                    subjectService.createSubject(req);
                    results.add(new SubjectCloneResult.ResultRow(code, row.getSemester(), "CREATED", null));
                    created++;
                } catch (DataIntegrityViolationException e) {
                    // race backstop: the unique index rejected a concurrent duplicate
                    results.add(new SubjectCloneResult.ResultRow(code, row.getSemester(), "SKIPPED_EXISTS", "Already exists"));
                    skipped++;
                } catch (org.springframework.web.server.ResponseStatusException e) {
                    // e.g. the prefix=year validation in createSubject (shouldn't happen
                    // since the prefix is locked to the target year, but kept defensive)
                    results.add(new SubjectCloneResult.ResultRow(code, row.getSemester(), "ERROR", e.getReason()));
                    errors++;
                } catch (IllegalArgumentException e) {
                    results.add(new SubjectCloneResult.ResultRow(code, row.getSemester(), "ERROR", e.getMessage()));
                    errors++;
                }
            }
        }
        return new SubjectCloneResult(created, skipped, errors, results);
    }
}
