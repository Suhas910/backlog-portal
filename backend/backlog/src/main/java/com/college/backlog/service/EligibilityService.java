package com.college.backlog.service;

import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Backlog semester-eligibility rule. A student may register backlogs only for the
 * semesters in their current academic year plus the previous one, capped at their
 * current semester — so promotion into a new year retires the oldest year's backlogs.
 *
 * <pre>
 *   floor = currentSem &lt;= 4 ? 1 : currentSem &lt;= 6 ? 3 : 5
 *   eligible = { floor .. currentSem }
 * </pre>
 *
 * 1-{1} 2-{1,2} 3-{1,2,3} 4-{1,2,3,4} 5-{3,4,5} 6-{3,4,5,6} 7-{5,6,7} 8-{5,6,7,8}
 *
 * Pure function of the (admin-maintained) current semester — see
 * docs/adr/backlog-progression.md.
 */
@Service
public class EligibilityService {

    /** Semesters the student may register backlogs for, ascending. Empty if out of range. */
    public Set<Integer> eligibleSemesters(int currentSemester) {
        Set<Integer> eligible = new LinkedHashSet<>();
        if (currentSemester < 1 || currentSemester > 8) {
            return eligible;
        }
        int floor = currentSemester <= 4 ? 1 : currentSemester <= 6 ? 3 : 5;
        for (int sem = floor; sem <= currentSemester; sem++) {
            eligible.add(sem);
        }
        return eligible;
    }

    public boolean isEligible(int currentSemester, int targetSemester) {
        return eligibleSemesters(currentSemester).contains(targetSemester);
    }
}
