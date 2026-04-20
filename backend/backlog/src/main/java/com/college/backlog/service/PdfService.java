package com.college.backlog.service;

import com.college.backlog.model.Registration;
import com.college.backlog.model.Subject;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class PdfService {

    public byte[] generateRegistrationPdf(Registration reg) throws Exception {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf);

        // ── Header ──
        Paragraph college = new Paragraph("Your College Name")
            .setBold()
            .setFontSize(18)
            .setTextAlignment(TextAlignment.CENTER);
        doc.add(college);

        Paragraph dept = new Paragraph("Department of Computer Science & Engineering")
            .setFontSize(12)
            .setTextAlignment(TextAlignment.CENTER);
        doc.add(dept);

        Paragraph title = new Paragraph("BACKLOG EXAMINATION REGISTRATION FORM")
            .setBold()
            .setFontSize(14)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(10)
            .setMarginBottom(20);
        doc.add(title);

        // ── Student Details Table ──
        Table detailsTable = new Table(UnitValue.createPercentArray(new float[]{35, 65}))
            .setWidth(UnitValue.createPercentValue(100))
            .setMarginBottom(20);

        addRow(detailsTable, "USN", reg.getStudent().getRollNo());
        addRow(detailsTable, "Student Name", reg.getStudent().getName());
        addRow(detailsTable, "Email", reg.getStudent().getEmail());
        addRow(detailsTable, "Phone", reg.getStudent().getPhone());
        addRow(detailsTable, "Year of Joining", String.valueOf(reg.getStudent().getYearOfJoining()));
        addRow(detailsTable, "Semester", String.valueOf(reg.getStudent().getCurrentSemester()));
        addRow(detailsTable, "Branch", reg.getStudent().getBranch());
        addRow(detailsTable, "Registration ID", reg.getRegId());
        addRow(detailsTable, "Date", reg.getRegisteredAt().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm")));
        addRow(detailsTable, "Status", reg.getStatus());

        doc.add(detailsTable);

        // ── Subjects Table ──
        Paragraph subTitle = new Paragraph("Subjects Registered for Backlog")
            .setBold()
            .setFontSize(13)
            .setMarginBottom(8);
        doc.add(subTitle);

        Table subjectsTable = new Table(UnitValue.createPercentArray(new float[]{10, 50, 40}))
            .setWidth(UnitValue.createPercentValue(100))
            .setMarginBottom(20);

        // header row
        subjectsTable.addHeaderCell(new Cell().add(new Paragraph("No.").setBold()));
        subjectsTable.addHeaderCell(new Cell().add(new Paragraph("Subject Name").setBold()));
        subjectsTable.addHeaderCell(new Cell().add(new Paragraph("Department").setBold()));

        int i = 1;
        for (Subject s : reg.getSubjects()) {
            subjectsTable.addCell(new Cell().add(new Paragraph(String.valueOf(i++))));
            subjectsTable.addCell(new Cell().add(new Paragraph(s.getSubjectName())));
            subjectsTable.addCell(new Cell().add(new Paragraph(s.getDepartment().getDeptName())));
        }
        doc.add(subjectsTable);

        // ── Signature Section ──
        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
            .setWidth(UnitValue.createPercentValue(100))
            .setMarginTop(30)
            .setMarginBottom(30);

        Cell proctorCell = new Cell().add(
            new Paragraph("Proctor Signature\n\n\n\n_____________________")
                .setTextAlignment(TextAlignment.CENTER)
        ).setBorder(new SolidBorder(1));

        Cell hodCell = new Cell().add(
            new Paragraph("HOD Signature\n\n\n\n_____________________")
                .setTextAlignment(TextAlignment.CENTER)
        ).setBorder(new SolidBorder(1));

        sigTable.addCell(proctorCell);
        sigTable.addCell(hodCell);
        doc.add(sigTable);

        // ── QR Code ──
        String qrContent = "http://localhost:5173/verify/" + reg.getQrToken();
        byte[] qrBytes = generateQrCode(qrContent, 150);

        Image qrImage = new Image(ImageDataFactory.create(qrBytes))
            .setWidth(100)
            .setHeight(100)
            .setHorizontalAlignment(HorizontalAlignment.CENTER);

        doc.add(new Paragraph("Scan to verify registration")
            .setTextAlignment(TextAlignment.CENTER)
            .setFontSize(10));
        doc.add(qrImage);

        doc.close();
        return baos.toByteArray();
    }

    private void addRow(Table table, String key, String value) {
        table.addCell(new Cell().add(new Paragraph(key).setBold())
            .setBackgroundColor(ColorConstants.LIGHT_GRAY));
        table.addCell(new Cell().add(new Paragraph(value != null ? value : "")));
    }

    private byte[] generateQrCode(String content, int size) throws Exception {
        QRCodeWriter qrWriter = new QRCodeWriter();
        BitMatrix matrix = qrWriter.encode(content, BarcodeFormat.QR_CODE, size, size);
        BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", out);
        return out.toByteArray();
    }
}