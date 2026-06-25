// Role/department-scoped access on the admin dashboard. The server enforces the
// actual data scoping (these stubs can't prove that); what these tests lock down
// is the frontend-observable side of scoping — the department badge, the default
// filter for dept roles, role-gated navigation, and PRINCIPAL being read-only.
describe("Admin dashboard — role & department scoped access", () => {
  const seedSession = (win, role, department) => {
    win.sessionStorage.setItem("adminRole", role);
    win.sessionStorage.setItem("adminToken", "admin-jwt-token");
    win.sessionStorage.setItem("adminUsername", role.toLowerCase());
    if (department) win.sessionStorage.setItem("adminDepartment", department);
  };

  const stubDashboard = (registrations) => {
    cy.intercept("GET", "/api/admin/registrations*", {
      statusCode: 200,
      body: registrations,
    }).as("getRegistrations");
    cy.intercept("GET", "/api/admin/exam-cycles*", { statusCode: 200, body: [] });
    cy.intercept("GET", "/api/admin/subjects-for-filter*", { statusCode: 200, body: [] });
  };

  it("HOD: shows the department badge, defaults to the pending filter, and hides admin-only nav", () => {
    stubDashboard([
      {
        regId: "REG-S",
        rollNo: "1MS22CS001",
        studentName: "Pending Pam",
        semester: 4,
        subjects: ["Data Structures"],
        status: "SUBMITTED",
        registeredAt: "2026-04-20T10:20:00",
      },
      {
        regId: "REG-V",
        rollNo: "1MS22CS002",
        studentName: "Verified Vic",
        semester: 4,
        subjects: ["Operating Systems"],
        status: "VERIFIED",
        registeredAt: "2026-04-20T10:21:00",
      },
    ]);

    cy.visit("/admin", {
      onBeforeLoad: (win) => seedSession(win, "HOD", "Computer Science"),
    });
    cy.wait("@getRegistrations");

    // department badge in the header
    cy.contains("Computer Science").should("be.visible");

    // dept roles default to the SUBMITTED filter, so only the pending row shows
    cy.contains("td", "Pending Pam").should("exist");
    cy.contains("td", "Verified Vic").should("not.exist");

    // HOD can manage users, progression, and curriculum (add + clone subjects for
    // their own department), but not departments
    cy.contains("a", "Manage Users").should("exist");
    cy.contains("a", "Progression").should("exist");
    cy.contains("a", "Add Subject").should("exist");
    cy.contains("a", "Clone Subjects").should("exist");
    cy.contains("a", "Manage Subjects").should("exist");
    cy.contains("a", "Departments").should("not.exist");
  });

  it("PRINCIPAL: is read-only — a pending row exposes no verify/reject controls", () => {
    stubDashboard([
      {
        regId: "REG-S",
        rollNo: "1MS22CS001",
        studentName: "Pending Pam",
        semester: 4,
        subjects: ["Data Structures"],
        status: "SUBMITTED",
        registeredAt: "2026-04-20T10:20:00",
      },
    ]);

    cy.visit("/admin", {
      onBeforeLoad: (win) => seedSession(win, "PRINCIPAL"),
    });
    cy.wait("@getRegistrations");

    cy.contains("td", "Pending Pam").should("exist");
    cy.get('[data-cy="admin-verify"]').should("not.exist");
    cy.get('[data-cy="admin-reject"]').should("not.exist");
    cy.contains("Pending Verification").should("exist");
  });

  it("an expired token on a dashboard fetch redirects back to the admin login", () => {
    cy.intercept("GET", "/api/admin/registrations*", {
      statusCode: 401,
      body: { message: "Token expired" },
    }).as("getRegistrations");
    cy.intercept("GET", "/api/admin/exam-cycles*", { statusCode: 200, body: [] });
    cy.intercept("GET", "/api/admin/subjects-for-filter*", { statusCode: 200, body: [] });

    cy.visit("/admin", {
      onBeforeLoad: (win) => seedSession(win, "ADMIN"),
    });

    cy.location("pathname").should("eq", "/admin/login");
  });
});
