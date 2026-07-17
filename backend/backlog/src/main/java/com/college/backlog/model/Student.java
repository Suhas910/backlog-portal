package com.college.backlog.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import java.time.LocalDate;

@Entity
@Table(name = "students")
public class Student {

    @Id
    @Column(name = "roll_no")
    private String rollNo;

    private String name;
    private String email;
    private String phone;

    // Used together with the USN as the student login credential.
    // Populated out-of-band (admin/import); never returned by any endpoint.
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "year_of_joining")
    private int yearOfJoining;

    @Column(name = "current_semester")
    private int currentSemester;

    // The semester the student first entered the programme here: 1 for a normal
    // intake, >1 for a lateral-entry/migrant student who joined mid-degree (e.g. 3
    // for a 2nd-year transfer). Raises the backlog-eligibility floor to
    // max(normalFloor, entrySemester) so a migrant is never offered semesters they
    // never studied here. @ColumnDefault("1") mirrors the column's `default 1` in
    // the Flyway V1 baseline so the mapping matches under ddl-auto=validate; NOT
    // NULL is enforced at the DB level (folded into the V1 baseline), not via
    // nullable=false here — schema constraints belong in a V__ migration. See
    // docs/adr/backlog-progression.md.
    @Column(name = "entry_semester")
    @ColumnDefault("1")
    private int entrySemester = 1;

    private String branch;

    public Student() {}

    public Student(String rollNo, String name, String email, String phone, int yearOfJoining, int currentSemester, String branch) {
        this.rollNo = rollNo;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.yearOfJoining = yearOfJoining;
        this.currentSemester = currentSemester;
        this.branch = branch;
    }

    public String getRollNo() { return rollNo; }
    public void setRollNo(String rollNo) { this.rollNo = rollNo; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public int getYearOfJoining() { return yearOfJoining; }
    public void setYearOfJoining(int yearOfJoining) { this.yearOfJoining = yearOfJoining; }

    public int getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(int currentSemester) { this.currentSemester = currentSemester; }

    public int getEntrySemester() { return entrySemester; }
    public void setEntrySemester(int entrySemester) { this.entrySemester = entrySemester; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

}
