package com.college.backlog.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EligibilityServiceTest {

    private final EligibilityService service = new EligibilityService();

    @Test
    void windowMatchesTheRuleForEverySemester() {
        assertThat(service.eligibleSemesters(1)).containsExactlyInAnyOrder(1);
        assertThat(service.eligibleSemesters(2)).containsExactlyInAnyOrder(1, 2);
        assertThat(service.eligibleSemesters(3)).containsExactlyInAnyOrder(1, 2, 3);
        assertThat(service.eligibleSemesters(4)).containsExactlyInAnyOrder(1, 2, 3, 4);
        assertThat(service.eligibleSemesters(5)).containsExactlyInAnyOrder(3, 4, 5);
        assertThat(service.eligibleSemesters(6)).containsExactlyInAnyOrder(3, 4, 5, 6);
        assertThat(service.eligibleSemesters(7)).containsExactlyInAnyOrder(5, 6, 7);
        assertThat(service.eligibleSemesters(8)).containsExactlyInAnyOrder(5, 6, 7, 8);
    }

    @Test
    void outOfRangeCurrentSemesterYieldsEmpty() {
        assertThat(service.eligibleSemesters(0)).isEmpty();
        assertThat(service.eligibleSemesters(9)).isEmpty();
        assertThat(service.eligibleSemesters(-3)).isEmpty();
    }

    @Test
    void isEligibleReflectsTheWindow() {
        // 3rd year (sem 6), normal intake: sems 3..6 only, no 1st-year backlogs
        assertThat(service.isEligible(6, 1, 3)).isTrue();
        assertThat(service.isEligible(6, 1, 6)).isTrue();
        assertThat(service.isEligible(6, 1, 2)).isFalse();
        assertThat(service.isEligible(6, 1, 7)).isFalse();
    }

    @Test
    void entrySemesterOfOneIsIdenticalToTheNormalWindow() {
        for (int cur = 1; cur <= 8; cur++) {
            assertThat(service.eligibleSemesters(cur, 1))
                .isEqualTo(service.eligibleSemesters(cur));
        }
    }

    @Test
    void entrySemesterRaisesTheFloorForLateralEntrants() {
        // migrant who joined at sem 3, now sem 5: never offered sems 1-2
        assertThat(service.eligibleSemesters(5, 3)).containsExactlyInAnyOrder(3, 4, 5);
        // joined at sem 3, now in sem 4: {3,4} (normal floor 1 raised to 3)
        assertThat(service.eligibleSemesters(4, 3)).containsExactlyInAnyOrder(3, 4);
        // entry below the normal floor has no effect (normal floor wins)
        assertThat(service.eligibleSemesters(6, 2)).containsExactlyInAnyOrder(3, 4, 5, 6);
        // entry equal to current: only that one semester
        assertThat(service.eligibleSemesters(5, 5)).containsExactlyInAnyOrder(5);
    }

    @Test
    void entryAwareIsEligibleExcludesPreEntrySemesters() {
        // entry 3, current 5: sem 2 excluded, sem 3 allowed
        assertThat(service.isEligible(5, 3, 2)).isFalse();
        assertThat(service.isEligible(5, 3, 3)).isTrue();
        assertThat(service.isEligible(5, 3, 5)).isTrue();
    }
}
