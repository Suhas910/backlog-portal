package com.college.backlog.model;

import jakarta.persistence.*;

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
}
