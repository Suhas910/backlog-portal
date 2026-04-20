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

    cy.intercept("GET", "/api/admin/registrations", {
      statusCode: 200,
      body: [
        {
          regId: "REG-2026-1001",
          qrToken: "token-abc",
          rollNo: "1CS22CS001",
          studentName: "Student One",
          semester: 4,
          yearOfJoining: 2024,
          subjects: ["Data Structures"],
          status: "SUBMITTED",
          registeredAt: "2026-04-20T10:20:00",
        },
      ],
    }).as("getRegistrations");

    cy.intercept("PUT", "/api/register/verify/token-abc", {
      statusCode: 200,
      body: {
        regId: "REG-2026-1001",
        studentName: "Student One",
        rollNo: "1CS22CS001",
        status: "VERIFIED",
      },
    }).as("verifyRegistration");

    cy.visit("/admin/login");

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
