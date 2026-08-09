package com.college.backlog.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "users")
public class User {

    @Id
    private String username;

    private String password;

    // Stored as the enum name (varchar), used verbatim as the Spring Security authority and JWT
    // role claim, with a DB CHECK constraint on the values.
    @Enumerated(EnumType.STRING)
    private UserRole role;

    // Forces a new password on next login. Set on account creation, admin password reset, and
    // seeded accounts, so a weak default can't survive first login. @ColumnDefault emits
    // `default false` in DDL, letting this NOT NULL column be added to the populated users table.
    @Column(name = "must_change_password", nullable = false)
    @ColumnDefault("false")
    private boolean mustChangePassword = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dept_id", nullable = true)
    private Department department;

    public User() {}

    public User(String username, String password, UserRole role) {
        this.username = username;
        this.password = password;
        this.role = role;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }
}
