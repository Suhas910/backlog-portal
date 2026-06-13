describe("Department code edit — concurrent-edit conflict detection", () => {
  // Drop straight onto the page with an admin session in place, so the test
  // focuses on the save/conflict path rather than re-driving the login UI.
  const authedVisit = (path) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem("adminRole", "ADMIN");
        win.sessionStorage.setItem("adminToken", "admin-jwt-token");
      },
    });
  };

  it("resyncs to the server value when a code save hits a 409 conflict", () => {
    // First load: "CS" at version 0. The conflicting PUT flips the flag, so the
    // automatic resync afterwards returns the value another admin already saved
    // ("CX" at version 1). Keying off the PUT — not a call counter — keeps this
    // robust against however many fetches the page makes (StrictMode etc.).
    let conflictHit = false;
    cy.intercept("GET", "/api/admin/departments*", (req) => {
      req.reply({
        statusCode: 200,
        body: [
          {
            id: 1,
            deptName: "Computer Science",
            code: conflictHit ? "CX" : "CS",
            contactEmail: null,
            version: conflictHit ? 1 : 0,
          },
        ],
      });
    }).as("getDepartments");

    cy.intercept("PUT", "/api/admin/departments/1", (req) => {
      conflictHit = true;
      req.reply({
        statusCode: 409,
        body: {
          message:
            "This department was changed by someone else. Reload and try again.",
        },
      });
    }).as("updateConflict");

    authedVisit("/admin/departments");
    cy.wait("@getDepartments"); // initial load (CS, v0)

    // edit the code and save -> server rejects the stale write with 409
    cy.get('[data-cy="dept-code-input-1"]').clear().type("EC");
    cy.get('[data-cy="dept-save-1"]').click();

    cy.wait("@updateConflict");
    cy.wait("@getDepartments"); // automatic resync after the 409

    // conflict surfaced inline, and the field resynced to the other admin's value
    cy.get('[data-cy="dept-error"]').should("contain", "changed by someone else");
    cy.get('[data-cy="dept-code-input-1"]').should("have.value", "CX");
  });
});
