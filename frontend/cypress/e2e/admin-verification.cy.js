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

  it("shows an inline per-row error when verify fails (no rollback needed)", () => {
    cy.intercept("POST", "/api/auth/login", {
      statusCode: 200,
      body: { message: "Login success", role: "ADMIN", token: "admin-jwt-token" },
    }).as("adminLogin");

    cy.intercept("GET", "/api/admin/registrations*", {
      statusCode: 200,
      body: [
        {
          regId: "REG-2026-1001",
          rollNo: "1MS22CS001",
          studentName: "Student One",
          semester: 4,
          subjects: ["Data Structures"],
          status: "SUBMITTED",
          registeredAt: "2026-04-20T10:20:00",
        },
      ],
    }).as("getRegistrations");
    cy.intercept("GET", "/api/admin/exam-cycles*", { statusCode: 200, body: [] });
    cy.intercept("GET", "/api/admin/subjects-for-filter*", { statusCode: 200, body: [] });

    // A non-conflict failure (500): the server state did not move, so we expect
    // an inline error and the row to stay SUBMITTED with its buttons intact.
    cy.intercept("PUT", "/api/register/verify/REG-2026-1001", {
      statusCode: 500,
      body: { message: "Verification service unavailable" },
    }).as("verifyFails");

    cy.visit("/admin/login");
    cy.contains("Administrator").click();
    cy.get('[data-cy="admin-username"]').type("admin");
    cy.get('[data-cy="admin-password"]').type("password123");
    cy.get('[data-cy="admin-login-submit"]').click();

    cy.wait("@adminLogin");
    cy.wait("@getRegistrations");

    cy.get('[data-cy="admin-verify"]').first().click();
    cy.wait("@verifyFails");

    // inline error surfaced, no alert(), row not rolled forward
    cy.get('[data-cy="admin-action-error"]').should(
      "contain",
      "Verification service unavailable",
    );
    cy.get('[data-cy="admin-verify"]').should("exist");
    cy.contains("td", "Verified").should("not.exist");
  });

  it("resyncs the row from the server when verify hits a 409 conflict", () => {
    cy.intercept("POST", "/api/auth/login", {
      statusCode: 200,
      body: { message: "Login success", role: "ADMIN", token: "admin-jwt-token" },
    }).as("adminLogin");

    // The row reads SUBMITTED until the conflicting PUT fires; the post-conflict
    // resync then returns it already VERIFIED (as if another admin actioned it
    // underneath us). Keying off the PUT — not a call counter — keeps this robust
    // against however many initial fetches the page makes (StrictMode, filters).
    let conflictHit = false;
    cy.intercept("GET", "/api/admin/registrations*", (req) => {
      req.reply({
        statusCode: 200,
        body: [
          {
            regId: "REG-2026-1001",
            rollNo: "1MS22CS001",
            studentName: "Student One",
            semester: 4,
            subjects: ["Data Structures"],
            status: conflictHit ? "VERIFIED" : "SUBMITTED",
            verifiedBy: conflictHit ? "otheradmin" : null,
            registeredAt: "2026-04-20T10:20:00",
          },
        ],
      });
    }).as("getRegistrations");
    cy.intercept("GET", "/api/admin/exam-cycles*", { statusCode: 200, body: [] });
    cy.intercept("GET", "/api/admin/subjects-for-filter*", { statusCode: 200, body: [] });

    cy.intercept("PUT", "/api/register/verify/REG-2026-1001", (req) => {
      conflictHit = true;
      req.reply({
        statusCode: 409,
        body: { message: "Already actioned by another admin" },
      });
    }).as("verifyConflict");

    cy.visit("/admin/login");
    cy.contains("Administrator").click();
    cy.get('[data-cy="admin-username"]').type("admin");
    cy.get('[data-cy="admin-password"]').type("password123");
    cy.get('[data-cy="admin-login-submit"]').click();

    cy.wait("@adminLogin");
    cy.wait("@getRegistrations"); // initial SUBMITTED load

    cy.get('[data-cy="admin-verify"]').first().click();
    cy.wait("@verifyConflict");
    cy.wait("@getRegistrations"); // automatic resync after the 409

    // row now reflects true server state — verified, action buttons gone
    cy.contains("td", "Verified").should("exist");
    cy.get('[data-cy="admin-verify"]').should("not.exist");
  });

  it("redirects unauthenticated visitors to the admin login", () => {
    cy.visit("/admin");
    cy.location("pathname").should("eq", "/admin/login");
    cy.location("search").should("contain", "redirect");
  });

  it("logs in via the Administrator path", () => {
    cy.intercept("POST", "/api/auth/login", {
      statusCode: 200,
      body: { message: "Login success", role: "ADMIN", token: "admin-jwt-token" },
    }).as("adminLogin");
    cy.intercept("GET", "/api/admin/registrations*", { statusCode: 200, body: [] }).as("getRegistrations");
    cy.intercept("GET", "/api/admin/exam-cycles*", { statusCode: 200, body: [] });
    cy.intercept("GET", "/api/admin/subjects-for-filter*", { statusCode: 200, body: [] });

    cy.visit("/admin/login");
    cy.contains("Administrator").click();

    // ADMIN has no department step
    cy.get('[data-cy="admin-department"]').should("not.exist");
    cy.get('[data-cy="admin-username"]').type("admin");
    cy.get('[data-cy="admin-password"]').type("password123");
    cy.get('[data-cy="admin-login-submit"]').click();

    cy.wait("@adminLogin");
    cy.location("pathname").should("eq", "/admin");
  });
});
