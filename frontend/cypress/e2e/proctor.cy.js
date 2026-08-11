// The PROCTOR role UI. A proctor gets a two-tab Students page (My Students / Claim Students):
// the claim picker (dept-pinned, minimal projection, one-proctor conflicts),
// remove-from-supervision instead of delete, and a trimmed dashboard nav. Staff (HOD+) get the
// extra Proctors tab with a target selector. All API responses are stubbed — the server-side scope
// rules have their own backend tests.
describe("Proctor role", () => {
  const seedProctor = (win) => {
    win.sessionStorage.setItem("adminRole", "PROCTOR");
    win.sessionStorage.setItem("adminToken", "admin-jwt-token");
    win.sessionStorage.setItem("adminUsername", "proc1");
    win.sessionStorage.setItem("adminDepartment", "Computer Science");
  };

  const stubDepartments = () =>
    cy.intercept("GET", "/api/departments", {
      statusCode: 200,
      body: [{ id: 1, deptName: "Computer Science", code: "CS" }],
    }).as("getDepartments");

  const claimable = (rollNo, name, proctored, mine) => ({
    rollNo,
    name,
    currentSemester: 3,
    proctored,
    mine,
  });

  it("shows the proctor tabs and the trimmed dashboard nav", () => {
    stubDepartments();
    cy.intercept("GET", "/api/admin/registrations*", {
      statusCode: 200,
      body: { content: [], number: 0, totalPages: 0, totalElements: 0 },
    });
    cy.intercept("GET", "/api/admin/registrations/summary-counts*", {
      statusCode: 200,
      body: { total: 0, submitted: 0, verified: 0, rejected: 0 },
    });
    cy.intercept("GET", "/api/admin/subjects-for-filter*", { statusCode: 200, body: [] });
    cy.intercept("GET", "/api/admin/departments", { statusCode: 200, body: [] });
    cy.intercept("GET", "/api/admin/exam-cycles", { statusCode: 200, body: [] });

    cy.visit("/admin", { onBeforeLoad: seedProctor });
    cy.contains("My Students").should("be.visible");
    cy.contains("Exam Cycles").should("not.exist");
    // anchor-scoped: the dashboard legitimately contains "Subjects" elsewhere, e.g. the
    // "All Subjects" filter
    cy.contains("a", "Subjects").should("not.exist");
    cy.contains("a", "Users").should("not.exist");
    cy.contains("Departments").should("not.exist");

    cy.contains("My Students").click();
    cy.location("pathname").should("eq", "/admin/students");
    cy.get('[data-cy="tab-manage"]').should("contain", "My Students");
    cy.get('[data-cy="tab-claim"]').should("contain", "Claim Students");
    cy.get('[data-cy="tab-add"]').should("not.exist");
    cy.get('[data-cy="tab-import"]').should("not.exist");
    cy.get('[data-cy="tab-progression"]').should("not.exist");
  });

  it("claims students via the picker, surfacing one-proctor conflicts", () => {
    stubDepartments();
    cy.intercept("GET", "/api/admin/proctor/students*", { statusCode: 200, body: [] }).as(
      "assigned",
    );
    cy.intercept("GET", "/api/admin/proctor/claimable*", {
      statusCode: 200,
      body: {
        content: [
          claimable("1MS24CS001", "Asha", false, false),
          claimable("1MS24CS002", "Bharat", true, false), // another proctor's
          claimable("1MS24CS003", "Chetan", true, true), // already mine
        ],
        number: 0,
        totalPages: 1,
        totalElements: 3,
      },
    }).as("claimable");
    cy.intercept("POST", "/api/admin/proctor/assignments", {
      statusCode: 200,
      body: {
        dryRun: false,
        created: 1,
        skipped: 0,
        errors: 0,
        results: [{ rollNo: "1MS24CS001", semester: null, status: "CREATED", message: null }],
      },
    }).as("claim");

    cy.visit("/admin/students?tab=claim", { onBeforeLoad: seedProctor });
    cy.wait("@getDepartments");

    cy.get('[data-cy="claim-year"]').type("2024");
    cy.get('[data-cy="claim-sem"]').select("Semester 3");
    cy.get('[data-cy="claim-load"]').click();
    cy.wait("@claimable")
      .its("request.url")
      .should("include", "admissionYear=2024")
      .and("include", "semester=3");

    // supervised students can't be selected, and badges say why
    cy.get('[data-cy="claim-select-1MS24CS002"]').should("be.disabled");
    cy.contains("Has a proctor").should("be.visible");
    cy.get('[data-cy="claim-select-1MS24CS003"]').should("be.disabled");
    cy.contains("Yours").should("be.visible");

    cy.get('[data-cy="claim-select-1MS24CS001"]').check();
    cy.get('[data-cy="claim-submit"]').click();
    cy.wait("@claim")
      .its("request.body")
      .should("deep.equal", { rollNos: ["1MS24CS001"] });
    cy.get('[data-cy="claim-results"]').should("contain", "Assigned 1");
  });

  it("removes a student from supervision (not delete) on the manage tab", () => {
    stubDepartments();
    cy.intercept("GET", "/api/admin/students*", {
      statusCode: 200,
      body: {
        content: [
          {
            rollNo: "1MS24CS001",
            name: "Asha",
            email: "1ms24cs001@msrit.edu",
            branch: "Computer Science",
            currentSemester: 3,
            entrySemester: 1,
            progressionComplete: true,
          },
        ],
        number: 0,
        totalPages: 1,
        totalElements: 1,
      },
    }).as("myStudents");
    cy.intercept("DELETE", "/api/admin/proctor/assignments/1MS24CS001", {
      statusCode: 204,
      body: {},
    }).as("unassign");

    cy.visit("/admin/students", { onBeforeLoad: seedProctor });
    cy.wait("@getDepartments");
    cy.get('[data-cy="students-load"]').click();
    cy.wait("@myStudents");

    cy.get('[data-cy="student-delete-1MS24CS001"]')
      .should("contain", "Remove")
      .and("not.contain", "Delete");
    cy.on("window:confirm", (text) => {
      expect(text).to.include("from your supervision");
      return true;
    });
    cy.get('[data-cy="student-delete-1MS24CS001"]').click();
    cy.wait("@unassign");
    cy.contains("Asha").should("not.exist");
  });

  it("lets staff manage a chosen proctor's assignments on the Proctors tab", () => {
    stubDepartments();
    const seedHod = (win) => {
      win.sessionStorage.setItem("adminRole", "HOD");
      win.sessionStorage.setItem("adminToken", "admin-jwt-token");
      win.sessionStorage.setItem("adminUsername", "hod_cs");
      win.sessionStorage.setItem("adminDepartment", "Computer Science");
    };
    cy.intercept("GET", "/api/admin/users", {
      statusCode: 200,
      body: [
        { username: "cs_office", role: "DEPT_OFFICE", departmentName: "Computer Science" },
        { username: "proc1", role: "PROCTOR", departmentName: "Computer Science" },
      ],
    }).as("users");
    cy.intercept("GET", "/api/admin/proctor/students*", {
      statusCode: 200,
      body: [
        {
          rollNo: "1MS24CS001",
          name: "Asha",
          currentSemester: 3,
          assignedBy: "proc1",
          assignedAt: "2026-07-16T10:00:00",
        },
      ],
    }).as("assigned");

    cy.visit("/admin/students?tab=proctors", { onBeforeLoad: seedHod });
    cy.wait("@users");

    // only proctor accounts appear in the selector
    cy.get('[data-cy="claim-proctor-select"] option').should("have.length", 2); // placeholder + proc1
    cy.get('[data-cy="claim-proctor-select"]').select("proc1");
    cy.get('[data-cy="assigned-load"]').click();
    cy.wait("@assigned").its("request.url").should("include", "proctor=proc1");
    cy.get('[data-cy="assigned-list"]').should("contain", "1MS24CS001");
  });
});
