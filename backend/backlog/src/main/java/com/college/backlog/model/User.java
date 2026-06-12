package com.college.backlog.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "users")
public class User {

    @Id
    private String username;

    private String password;

    private String role;

    // When true, the user is forced to set a new password on their next login.
    // Set on account creation, on admin password reset, and on the seeded default
    // accounts so the weak default passwords cannot survive first login.
    // @ColumnDefault makes the generated DDL emit `default false`, so the NOT NULL
    // column can be added to the already-populated users table (existing rows get false).
    @Column(name = "must_change_password", nullable = false)
    @ColumnDefault("false")
    private boolean mustChangePassword = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dept_id", nullable = true)
    private Department department;

    public User() {}

    public User(String username, String password, String role) {
        this.username = username;
        this.password = password;
        this.role = role;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }
}
