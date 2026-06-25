package com.college.backlog.service;

import com.college.backlog.controller.dto.SubjectCreateRequest;
import com.college.backlog.controller.dto.SubjectUpdateRequest;
import com.college.backlog.model.Subject;
import com.college.backlog.model.SubjectType;
import com.college.backlog.repository.DepartmentRepository;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.repository.SubjectRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubjectServiceTest {

    @Mock private SubjectRepository subjectRepository;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private EntityManager entityManager;
    @Mock private RegistrationRepository registrationRepository;
    @InjectMocks private SubjectService service;

    private Subject subject(long id, int year) {
        Subject s = new Subject();
        s.setId(id);
        s.setAcademicYearOffered(year);
        s.setCourseCode("22CSL44");
        s.setSemester(4);
        s.setCredits(4);
        s.setSubjectType(SubjectType.REGULAR);
        return s;
    }

    @Test
    void rejectsCourseCodeWhosePrefixDoesNotMatchTheYearOnCreate() {
        SubjectCreateRequest req = new SubjectCreateRequest();
        req.setSubjectName("Data Structures");
        req.setCourseCode("23CSL44");      // prefix 23 ...
        req.setSemester(4);
        req.setCredits(4);
        req.setAcademicYearOffered(2022);  // ... but the year is 2022
        req.setDeptId(1L);

        // validated before any repository interaction, so no stubbing is needed
        assertThatThrownBy(() -> service.createSubject(req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("two digits");
    }

    @Test
    void rejectsCourseCodeWhosePrefixDoesNotMatchTheYearOnUpdate() {
        when(subjectRepository.findById(10L)).thenReturn(Optional.of(subject(10L, 2022)));

        SubjectUpdateRequest req = new SubjectUpdateRequest();
        req.setSubjectName("Data Structures");
        req.setCourseCode("23CSL44"); // prefix 23 against a fixed year of 2022
        req.setSemester(4);
        req.setCredits(3);

        assertThatThrownBy(() -> service.updateSubject(10L, req, null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("two digits");
    }

    @Test
    void blocksDeleteWhenReferencedByRegistrations() {
        when(subjectRepository.findById(10L)).thenReturn(Optional.of(subject(10L, 2022)));
        when(registrationRepository.existsBySubjects_Id(10L)).thenReturn(true);

        assertThatThrownBy(() -> service.deleteSubject(10L, null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("referenced");

        verify(subjectRepository, never()).delete(any(Subject.class));
    }
}
