describe("Student registration flow", () => {
  it("registers student and shows submission success", () => {
    // registration is gated behind an open exam cycle status check
    cy.intercept("GET", "/api/registration-status", {
      statusCode: 200,
      body: { open: true },
    }).as("getStatus");

    // branch is derived from the USN's 2-letter code, matched against department codes
    cy.intercept("GET", "/api/departments", {
      statusCode: 200,
      body: [{ id: 1, deptName: "Computer Science", code: "CS" }],
    }).as("getDepartments");

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
        status: "SUBMITTED",
      },
    }).as("registerStudent");

    cy.visit("/register");
    cy.wait("@getDepartments");

    // Step 1 — student details. USN "1MS22CS001" => branch code "CS" => Computer Science.
    cy.get('[data-cy="reg-usn"]').type("1MS22CS001");
    cy.get('[data-cy="reg-name"]').type("Student One");
    cy.get('[data-cy="reg-email"]').type("student1@msrit.edu");
    cy.get('[data-cy="reg-phone"]').type("9876543210");

    // branch is auto-detected and shown read-only
    cy.get('[data-cy="reg-branch"]').should("contain.text", "Computer Science");

    // advance to step 2
    cy.get('[data-cy="reg-submit"]').click();

    // Step 2 — pick the curriculum year/semester, which loads subjects
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
