package com.college.backlog.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CourseCodesTest {

    @Test
    void prefixForYear() {
        assertThat(CourseCodes.prefixForYear(2022)).isEqualTo("22");
        assertThat(CourseCodes.prefixForYear(2005)).isEqualTo("05");
    }

    @Test
    void bumpPrefix() {
        assertThat(CourseCodes.bumpPrefix("22CSL44", 2023)).isEqualTo("23CSL44");
        assertThat(CourseCodes.bumpPrefix("  22CSL44 ", 2025)).isEqualTo("25CSL44");
        assertThat(CourseCodes.bumpPrefix("CSL44", 2025)).isEqualTo("CSL44");
        assertThat(CourseCodes.bumpPrefix(null, 2025)).isNull();
    }

    @Test
    void matchesYear() {
        assertThat(CourseCodes.matchesYear("22CSL44", 2022)).isTrue();
        assertThat(CourseCodes.matchesYear("23CSL44", 2022)).isFalse();
        assertThat(CourseCodes.matchesYear("CSL44", 2022)).isFalse();
        assertThat(CourseCodes.matchesYear(null, 2022)).isFalse();
    }
}
