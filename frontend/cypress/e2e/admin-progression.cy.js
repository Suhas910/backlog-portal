// Coverage for the Progression tab of Manage Students (promote batch, CSV import,
// lookup & correct, and dept pinning). Sessions are seeded so each test lands
// straight on the tab and exercises one tool.
describe("Manage Students — Progression tab", () => {
  const seed = (win, role, department) => {
    win.sessionStorage.setItem("adminRole", role);
    win.sessionStorage.setItem("adminToken", "admin-jwt-token");
    win.sessionStorage.setItem("adminUsername", role.toLowerCase());
    if (department) win.sessionStorage.setItem("adminDepartment", department);
  };

  const visitAs = (role, department, departments = []) => {
    cy.intercept("GET", "/api/departments", {
      statusCode: 200,
      body: departments,
    }).as("getDepartments");
    cy.visit("/admin/students?tab=progression", {
      onBeforeLoad: (win) => seed(win, role, department),
    });
    cy.wait("@getDepartments");
  };

  it("previews a batch promotion (dry run) and renders the result table", () => {
    cy.intercept("POST", "/api/admin/progression/promote", {
      statusCode: 200,
      body: {
        dryRun: true,
        created: 1,
        skipped: 0,
        errors: 0,
        results: [
          { rollNo: "1MS24CS191", semester: 5, status: "WOULD_CREATE", message: "" },
        ],
      },
    }).as("promote");

    visitAs("ADMIN", null, [{ id: 1, deptName: "Computer Science" }]);
    cy.get('[data-cy="prog-tab-bulk"]').click();

    // a batch must name its cohort: department + admission year
    cy.get('[data-cy="prog-promote-dept"]').select("Computer Science");
    cy.get('[data-cy="prog-promote-admyear"]').type("2024");
    cy.get('[data-cy="prog-promote-sem"]').select("5");
    // entered in span format; the client parses it back to the start-year int
    cy.get('[data-cy="prog-promote-ay"]').type("2025-26");
    cy.get('[data-cy="prog-promote-preview"]').click();

    cy.wait("@promote")
      .its("request.body")
      .should("deep.equal", {
        targetSemester: 5,
        academicYear: 2025,
        dryRun: true,
        excludeRollNos: [],
        deptId: 1,
        admissionYear: 2024,
      });

    cy.contains("Preview — 1 created, 0 skipped, 0 error(s)").should("be.visible");
    cy.contains("td", "1MS24CS191").should("be.visible");
    cy.contains("td", "WOULD_CREATE").should("be.visible");
  });

  it("validates the promote form before calling the server", () => {
    visitAs("ADMIN", null, [{ id: 1, deptName: "Computer Science" }]);
    cy.get('[data-cy="prog-tab-bulk"]').click();

    // preview with no target semester -> client-side error, no request
    cy.get('[data-cy="prog-promote-preview"]').click();
    cy.get('[data-cy="prog-promote-error"]').should("contain", "Target semester is required");

    // apply with a semester but no academic year -> apply-specific error
    cy.get('[data-cy="prog-promote-sem"]').select("5");
    cy.get('[data-cy="prog-promote-apply"]').click();
    cy.get('[data-cy="prog-promote-error"]').should(
      "contain",
      "Academic year is required to apply",
    );

    // a batch needs an explicit cohort: department first, then admission year
    cy.get('[data-cy="prog-promote-preview"]').click();
    cy.get('[data-cy="prog-promote-error"]').should("contain", "Select a department");

    cy.get('[data-cy="prog-promote-dept"]').select("Computer Science");
    cy.get('[data-cy="prog-promote-preview"]').click();
    cy.get('[data-cy="prog-promote-error"]').should("contain", "Admission year is required");
  });

  it("requires a department before finding gaps", () => {
    visitAs("ADMIN", null, [{ id: 1, deptName: "Computer Science" }]);

    cy.get('[data-cy="prog-gaps-find"]').click();
    cy.get('[data-cy="prog-gaps-error"]').should("contain", "Select a department");
  });

  it("previews a CSV import", () => {
    cy.intercept("POST", "/api/admin/progression/import", {
      statusCode: 200,
      body: {
        dryRun: true,
        created: 2,
        skipped: 0,
        errors: 0,
        results: [
          { rollNo: "1MS24CS191", semester: 1, status: "WOULD_CREATE", message: "" },
          { rollNo: "1MS24CS191", semester: 2, status: "WOULD_CREATE", message: "" },
        ],
      },
    }).as("importProg");

    visitAs("ADMIN");
    cy.get('[data-cy="prog-tab-bulk"]').click();

    cy.get('[data-cy="prog-import-csv"]').type(
      "1MS24CS191,1,2024-25\n1MS24CS191,2,2024-25",
    );
    cy.get('[data-cy="prog-import-preview"]').click();

    cy.wait("@importProg")
      .its("request.body")
      .should("deep.equal", {
        dryRun: true,
        rows: [
          { rollNo: "1MS24CS191", semester: 1, academicYear: 2024 },
          { rollNo: "1MS24CS191", semester: 2, academicYear: 2024 },
        ],
      });

    cy.contains("Preview — 2 created, 0 skipped, 0 error(s)").should("be.visible");
  });

  it("looks up a student and corrects one semester's academic year", () => {
    cy.intercept("GET", "/api/admin/progression/1MS24CS191", {
      statusCode: 200,
      body: {
        rollNo: "1MS24CS191",
        name: "Progression Pat",
        currentSemester: 3,
        terms: [{ semester: 1, academicYear: 2023 }],
      },
    }).as("lookup");

    cy.intercept(
      "PUT",
      "/api/admin/progression/1MS24CS191/semester/1",
      {
        statusCode: 200,
        body: {
          rollNo: "1MS24CS191",
          name: "Progression Pat",
          currentSemester: 3,
          terms: [{ semester: 1, academicYear: 2024 }],
        },
      },
    ).as("override");

    visitAs("ADMIN");

    cy.get('[data-cy="prog-lookup-input"]').type("1MS24CS191");
    cy.get('[data-cy="prog-lookup-load"]').click();
    cy.wait("@lookup");

    cy.contains("Progression Pat").should("be.visible");
    // years are shown in span format; the stored start-year int 2023 -> "2023-24"
    cy.get('[data-cy="prog-term-year-1"]').should("have.value", "2023-24");

    // change the year and save -> PUT carries the parsed start-year int
    cy.get('[data-cy="prog-term-year-1"]').clear().type("2024-25");
    cy.get('[data-cy="prog-term-save-1"]').click();

    cy.wait("@override")
      .its("request.body")
      .should("deep.equal", { academicYear: 2024 });

    cy.get('[data-cy="prog-term-year-1"]').should("have.value", "2024-25");
  });

  it("shows every semester through sem 8, with missing ones blank and editable", () => {
    cy.intercept("GET", "/api/admin/progression/1MS24CS191", {
      statusCode: 200,
      body: {
        rollNo: "1MS24CS191",
        name: "Progression Pat",
        currentSemester: 3,
        entrySemester: 1,
        terms: [{ semester: 1, academicYear: 2024 }],
      },
    }).as("lookup");

    cy.intercept("PUT", "/api/admin/progression/1MS24CS191/semester/2", {
      statusCode: 200,
      body: {
        rollNo: "1MS24CS191",
        name: "Progression Pat",
        currentSemester: 3,
        entrySemester: 1,
        terms: [
          { semester: 1, academicYear: 2024 },
          { semester: 2, academicYear: 2024 },
        ],
      },
    }).as("setSem2");

    visitAs("ADMIN");

    cy.get('[data-cy="prog-lookup-input"]').type("1MS24CS191");
    cy.get('[data-cy="prog-lookup-load"]').click();
    cy.wait("@lookup");

    // sem 1 is prefilled; sems 2 and 3 render blank + flagged; the timeline runs all
    // the way to sem 8 (sems past the current one are shown but muted)
    cy.get('[data-cy="prog-term-year-1"]').should("have.value", "2024-25");
    cy.get('[data-cy="prog-term-year-2"]').should("have.value", "");
    cy.get('[data-cy="prog-term-missing-2"]').should("contain", "not set");
    cy.get('[data-cy="prog-term-year-3"]').should("have.value", "");
    cy.get('[data-cy="prog-term-missing-3"]').should("exist");
    cy.get('[data-cy="prog-term-year-8"]').should("exist");

    // fill a blank row -> PUT override carries the parsed start-year int
    cy.get('[data-cy="prog-term-year-2"]').type("2024-25");
    cy.get('[data-cy="prog-term-save-2"]').click();
    cy.wait("@setSem2").its("request.body").should("deep.equal", { academicYear: 2024 });
  });

  it("pins the department for a dept-scoped role (HOD)", () => {
    visitAs("HOD", "Computer Science", [
      { id: 1, deptName: "Computer Science" },
      { id: 2, deptName: "Electronics" },
    ]);

    cy.contains("Scoped to Computer Science").should("be.visible");
    // the department selects are locked to the HOD's own department
    cy.get("select:disabled").should("exist");
  });
});
