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
 *   floor = max(currentSem &lt;= 4 ? 1 : currentSem &lt;= 6 ? 3 : 5, entrySemester)
 *   eligible = { floor .. currentSem }
 * </pre>
 *
 * For a normal student (entrySemester = 1): 1-{1} 2-{1,2} 3-{1,2,3} 4-{1,2,3,4}
 * 5-{3,4,5} 6-{3,4,5,6} 7-{5,6,7} 8-{5,6,7,8}. {@code entrySemester} raises the
 * floor for a lateral-entry/migrant student so they are never offered semesters
 * they never studied here (e.g. entry 3, current 5 -&gt; {3,4,5}).
 *
 * Pure function of the (admin-maintained) current and entry semesters — see
 * docs/adr/backlog-progression.md.
 */
@Service
public class EligibilityService {

    /**
     * Backwards-compatible overload for a normal intake (entrySemester = 1).
     */
    public Set<Integer> eligibleSemesters(int currentSemester) {
        return eligibleSemesters(currentSemester, 1);
    }

    /** Semesters the student may register backlogs for, ascending. Empty if out of range. */
    public Set<Integer> eligibleSemesters(int currentSemester, int entrySemester) {
        Set<Integer> eligible = new LinkedHashSet<>();
        if (currentSemester < 1 || currentSemester > 8) {
            return eligible;
        }
        int normalFloor = currentSemester <= 4 ? 1 : currentSemester <= 6 ? 3 : 5;
        // a lateral entrant's window starts no earlier than the semester they joined
        int floor = Math.max(normalFloor, Math.max(entrySemester, 1));
        for (int sem = floor; sem <= currentSemester; sem++) {
            eligible.add(sem);
        }
        return eligible;
    }

    public boolean isEligible(int currentSemester, int targetSemester) {
        return eligibleSemesters(currentSemester).contains(targetSemester);
    }

    public boolean isEligible(int currentSemester, int entrySemester, int targetSemester) {
        return eligibleSemesters(currentSemester, entrySemester).contains(targetSemester);
    }
}
