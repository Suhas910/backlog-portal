describe("Admin verification flow", () => {
  it("logs in as admin and verifies pending registration", () => {
    cy.intercept("POST", "/api/auth/login", {
      statusCode: 200,
      body: {
        message: "Login success",
        role: "ADMIN",
        token: "admin-jwt-token",
      },
    }).as("adminLogin");

    // dashboard requests carry query params, so the globs need a trailing *
    cy.intercept("GET", "/api/admin/registrations*", {
      statusCode: 200,
      body: [
        {
          regId: "REG-2026-1001",
          rollNo: "1MS22CS001",
          studentName: "Student One",
          semester: 4,
          yearOfJoining: 2022,
          subjects: ["Data Structures"],
          status: "SUBMITTED",
          registeredAt: "2026-04-20T10:20:00",
        },
      ],
    }).as("getRegistrations");

    // other dashboard calls — stubbed so they don't hit a real backend (403 noise)
    cy.intercept("GET", "/api/admin/exam-cycles*", { statusCode: 200, body: [] });
    cy.intercept("GET", "/api/admin/subjects-for-filter*", { statusCode: 200, body: [] });

    cy.intercept("PUT", "/api/register/verify/REG-2026-1001", {
      statusCode: 200,
      body: {
        regId: "REG-2026-1001",
        studentName: "Student One",
        rollNo: "1CS22CS001",
        status: "VERIFIED",
      },
    }).as("verifyRegistration");

    cy.visit("/admin/login");

    // the login page gates the credential form behind a designation selection;
    // the actual role is driven by the (mocked) login response below
    cy.contains("Principal / Registrar / COE").click();

    cy.get('[data-cy="admin-username"]').type("admin");
    cy.get('[data-cy="admin-password"]').type("password123");
    cy.get('[data-cy="admin-login-submit"]').click();

    cy.wait("@adminLogin");
    cy.wait("@getRegistrations");

    cy.get('[data-cy="admin-filter-submitted"]').click();
    cy.get('[data-cy="admin-verify"]').first().click();

    cy.wait("@verifyRegistration");
    cy.contains("Verified").should("exist");
  });
});
