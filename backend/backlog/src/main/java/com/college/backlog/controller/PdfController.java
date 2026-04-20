package com.college.backlog.controller;

import com.college.backlog.model.Registration;
import com.college.backlog.repository.RegistrationRepository;
import com.college.backlog.service.PdfService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pdf")
public class PdfController {

    @Autowired
    private RegistrationRepository registrationRepository;

    @Autowired
    private PdfService pdfService;

    @GetMapping("/{regId}")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable String regId) throws Exception {

        Registration reg = registrationRepository.findById(regId)
            .orElseThrow(() -> new RuntimeException("Registration not found"));

        byte[] pdfBytes = pdfService.generateRegistrationPdf(reg);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment",
            "backlog-registration-" + reg.getStudent().getRollNo() + ".pdf");

        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }
}