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
        // a 3rd-year student (sem 6) may carry sems 3..6, not 1st-year backlogs
        assertThat(service.isEligible(6, 3)).isTrue();
        assertThat(service.isEligible(6, 6)).isTrue();
        assertThat(service.isEligible(6, 2)).isFalse();
        assertThat(service.isEligible(6, 7)).isFalse();
    }
}
