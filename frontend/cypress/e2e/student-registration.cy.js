describe("Student registration flow", () => {
  it("registers student and shows submission success", () => {
    cy.intercept("GET", "/api/subjects*", {
      statusCode: 200,
      body: [
        {
          id: 101,
          subjectName: "Data Structures",
          department: { deptName: "Computer Science" },
        },
        {
          id: 102,
          subjectName: "Operating Systems",
          department: { deptName: "Computer Science" },
        },
      ],
    }).as("getSubjects");

    cy.intercept("POST", "/api/register", {
      statusCode: 200,
      body: {
        regId: "REG-2026-1001",
        qrToken: "token-123",
        status: "SUBMITTED",
      },
    }).as("registerStudent");

    cy.visit("/register");

    cy.get('[data-cy="reg-usn"]').type("1CS22CS001");
    cy.get('[data-cy="reg-name"]').type("Student One");
    cy.get('[data-cy="reg-email"]').type("student1@example.edu");
    cy.get('[data-cy="reg-phone"]').type("9876543210");

    cy.get('[data-cy="reg-year"]').select("2024");
    cy.get('[data-cy="reg-semester"]').select("4");

    cy.wait("@getSubjects");

    cy.contains("label", "Data Structures").click();
    cy.get('[data-cy="reg-submit"]').click();

    cy.wait("@registerStudent");

    cy.contains("Registration Submitted").should("be.visible");
    cy.contains("REG-2026-1001").should("be.visible");
  });
});
