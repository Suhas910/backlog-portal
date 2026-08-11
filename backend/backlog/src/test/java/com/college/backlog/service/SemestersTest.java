package com.college.backlog.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SemestersTest {

    @Test
    void acceptsTheWholeProgramme() {
        for (int sem = Semesters.MIN; sem <= Semesters.MAX; sem++) {
            assertThat(Semesters.isStudiable(sem)).as("semester %d", sem).isTrue();
        }
    }

    @Test
    void rejectsOutsideOneThroughEight() {
        assertThat(Semesters.isStudiable(Semesters.MIN - 1)).isFalse();
        assertThat(Semesters.isStudiable(Semesters.MAX + 1)).isFalse();
        assertThat(Semesters.isStudiable(-1)).isFalse();
    }

    @Test
    void rejectsZeroTheValueAnOmittedIntArrivesAs() {
        assertThat(Semesters.isStudiable(0)).isFalse();
    }

    @Test
    void assertStudiableThrowsWithTheRangeInTheMessage() {
        assertThatThrownBy(() -> Semesters.assertStudiable(9))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 1 and 8");
        assertThatCode(() -> Semesters.assertStudiable(8)).doesNotThrowAnyException();
    }

    @Test
    void keepsTheMessageProgressionImportAlreadyReturns() {
        // ProgressionService.validateSemesterAndYear delegates here; the CSV import dry-run
        // surfaces this string verbatim, so a reworded message changes what admins see.
        assertThatThrownBy(() -> Semesters.assertStudiable(9))
                .hasMessage("Semester must be between 1 and 8.");
    }
}
