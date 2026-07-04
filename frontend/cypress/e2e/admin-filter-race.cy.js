describe("Admin dashboard — filter stale-response race", () => {
  it("keeps the latest filter result when an earlier request resolves last", () => {
    cy.intercept("POST", "/api/auth/login", {
      statusCode: 200,
      body: { message: "Login success", role: "ADMIN", token: "admin-jwt-token" },
    }).as("adminLogin");

    cy.intercept("GET", "/api/admin/exam-cycles*", { statusCode: 200, body: [] });
    cy.intercept("GET", "/api/admin/subjects-for-filter*", { statusCode: 200, body: [] });

    // The crux: the initial (unfiltered) registrations request is delayed so it
    // resolves AFTER the later search request — exactly the out-of-order arrival
    // that used to clobber the table. The narrow search returns only Alice; the
    // stale full list returns Alice + Bob. With the request-sequence guard, the
    // late full-list response must be dropped and the table must show only Alice.
    const ALICE = {
      regId: "REG-A",
      rollNo: "1MS22CS001",
      studentName: "Alice",
      semester: 4,
      subjects: ["Data Structures"],
      status: "SUBMITTED",
      registeredAt: "2026-04-20T10:20:00",
    };
    const BOB = {
      regId: "REG-B",
      rollNo: "1MS22CS002",
      studentName: "Bob",
      semester: 4,
      subjects: ["Data Structures"],
      status: "SUBMITTED",
      registeredAt: "2026-04-20T10:21:00",
    };

    // Alias the two requests separately so we can deterministically wait for the
    // SLOW stale one to land before asserting — otherwise the assertion could run
    // before it arrives and pass for the wrong reason.
    const pageOf = (rows) => ({
      content: rows,
      totalElements: rows.length,
      totalPages: 1,
      number: 0,
    });
    cy.intercept("GET", "/api/admin/registrations*", (req) => {
      if (req.query.searchQuery) {
        req.alias = "searchReg";
        req.reply({ delay: 50, statusCode: 200, body: pageOf([ALICE]) });
      } else {
        req.alias = "initialReg"; // stale, slow, broad response — lands last
        req.reply({ delay: 1000, statusCode: 200, body: pageOf([ALICE, BOB]) });
      }
    });
    // defined after the list intercept so it wins for the /summary-counts sub-path
    cy.intercept("GET", "/api/admin/registrations/summary-counts*", {
      statusCode: 200,
      body: { total: 2, submitted: 2, verified: 0, rejected: 0 },
    });

    cy.visit("/admin/login");
    cy.contains("Administrator").click();
    cy.get('[data-cy="admin-username"]').type("admin");
    cy.get('[data-cy="admin-password"]').type("password123");
    cy.get('[data-cy="admin-login-submit"]').click();
    cy.wait("@adminLogin");

    // type a search and Apply — fires the narrow request; the slow initial
    // request is still in flight and resolves ~1s later
    cy.get("#search-filter").type("Alice");
    cy.get('[data-cy="admin-filters-apply"]').click();

    cy.wait("@searchReg"); // narrow result [Alice] applied
    cy.contains("td", "Alice").should("exist");

    // now wait for the slow stale full-list response to actually arrive. With the
    // sequence guard it is dropped; without it, it would overwrite the table.
    cy.wait("@initialReg");
    cy.contains("td", "Alice").should("exist");
    cy.contains("td", "Bob").should("not.exist");
  });
});
