package com.college.backlog.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "departments")
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dept_name")
    private String deptName;

    // 2-letter branch code as it appears in the USN (e.g. "CS" in 1MS22CS001)
    @Column(name = "dept_code", unique = true)
    private String code;

    @Column(name = "contact_email")
    private String contactEmail;

    // Optimistic-lock version for concurrent-edit conflict detection on the
    // manage-departments page. @ColumnDefault("0") makes ddl-auto=update emit the
    // column with `default 0`, so the ADD COLUMN backfills existing department
    // rows (Postgres backfills on ADD COLUMN ... DEFAULT) — no manual Neon DDL.
    @Version
    @ColumnDefault("0")
    private Long version;

    public Department() {}

    public Department(Long id, String deptName, String contactEmail) {
        this.id = id;
        this.deptName = deptName;
        this.contactEmail = contactEmail;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDeptName() { return deptName; }
    public void setDeptName(String deptName) { this.deptName = deptName; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
