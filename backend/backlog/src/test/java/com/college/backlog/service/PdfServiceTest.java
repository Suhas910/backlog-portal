package com.college.backlog.service;

import com.college.backlog.model.Registration;
import com.college.backlog.model.Student;
import com.college.backlog.model.Subject;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards the one place iText is used. Pure unit test — no Spring context, no DB.
 * Exists because the iText/BouncyCastle upgrade had no safety net: asserting on the EXTRACTED TEXT
 * (not the bytes, which carry a per-run document id) is what makes a version bump verifiable.
 */
class PdfServiceTest {

    private final PdfService service = new PdfService();

    private static Registration sampleRegistration() {
        Student student = new Student("1MS22CS001", "Asha Rao", "1MS22CS001@msrit.edu", "9999912345", 2022, 5, "CS");
        Subject s1 = new Subject(1L, "Data Structures", "22CSL44", 4, 4, 2022, null);
        Subject s2 = new Subject(2L, "Operating Systems", "22CS53", 3, 3, 2022, null);

        Registration reg = new Registration();
        reg.setRegId("REG-TEST-0001");
        reg.setStudent(student);
        reg.setSubjects(List.of(s1, s2));
        reg.setRegisteredAt(LocalDateTime.of(2026, 8, 10, 9, 30));
        reg.setSnapSemester(5);
        return reg;
    }

    private static String textOf(byte[] pdf) throws Exception {
        try (PdfDocument doc = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            StringBuilder sb = new StringBuilder();
            for (int page = 1; page <= doc.getNumberOfPages(); page++) {
                sb.append(PdfTextExtractor.getTextFromPage(doc.getPage(page)));
            }
            return sb.toString();
        }
    }

    @Test
    void producesAWellFormedPdf() throws Exception {
        byte[] pdf = service.generateRegistrationPdf(sampleRegistration());

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 5, StandardCharsets.ISO_8859_1)).isEqualTo("%PDF-");
        assertThat(new String(pdf, StandardCharsets.ISO_8859_1)).endsWith("%%EOF\n");
        // a blank/failed render collapses to a couple of hundred bytes
        assertThat(pdf.length).isGreaterThan(2_000);
    }

    @Test
    void rendersTheStudentAndSubjectDataOntoThePage() throws Exception {
        String text = textOf(service.generateRegistrationPdf(sampleRegistration()));

        assertThat(text).contains("1MS22CS001");
        assertThat(text).contains("ASHA RAO");           // the form upper-cases the name
        assertThat(text).contains("22CSL44", "22CS53");
        assertThat(text).contains("Data Structures", "Operating Systems");
    }

    @Test
    void printsTheSnapshotSemesterNotTheBacklogSemester() throws Exception {
        // snapSemester is the student's CURRENT semester at registration time (5 here), never the
        // semester of the backlog subject being registered (4 and 3). Regression guard: the form
        // used to print the backlog semester.
        Registration reg = sampleRegistration();
        String text = textOf(service.generateRegistrationPdf(reg));

        int labelAt = text.indexOf("CURRENT SEMESTER");
        assertThat(labelAt).isGreaterThan(-1);
        assertThat(text.substring(labelAt, Math.min(labelAt + 60, text.length()))).contains("5");
    }

    @Test
    void survivesARegistrationWithNoSubjects() throws Exception {
        Registration reg = sampleRegistration();
        reg.setSubjects(List.of());

        byte[] pdf = service.generateRegistrationPdf(reg);

        assertThat(new String(pdf, 0, 5, StandardCharsets.ISO_8859_1)).isEqualTo("%PDF-");
        assertThat(textOf(pdf)).contains("1MS22CS001");
    }
}
