describe("Student registration flow", () => {
  // identity now comes from the authenticated account; the student logs in with
  // USN + date of birth, lands on the dashboard, then registers for subjects.
  const profile = {
    rollNo: "1MS22CS001",
    name: "Student One",
    email: "student1@msrit.edu",
    branch: "Computer Science",
    phone: "9876543210",
    currentSemester: 4,
  };

  function stubAuthedSession({ phone = profile.phone } = {}) {
    cy.intercept("POST", "/api/student/auth/login", {
      statusCode: 200,
      body: { message: "Login success", token: "student-jwt-token", rollNo: profile.rollNo, name: profile.name },
    }).as("studentLogin");

    cy.intercept("GET", "/api/student/me", {
      statusCode: 200,
      body: { ...profile, phone },
    }).as("getProfile");

    cy.intercept("GET", "/api/student/registrations", {
      statusCode: 200,
      body: [],
    }).as("getMyRegistrations");

    cy.intercept("GET", "/api/registration-status", {
      statusCode: 200,
      body: { open: true },
    }).as("getStatus");
  }

  function login() {
    cy.visit("/student/login");
    cy.get('[data-cy="student-usn"]').type(profile.rollNo);
    cy.get('[data-cy="student-dob"]').type("2004-05-15");
    cy.get('[data-cy="student-login-submit"]').click();
    cy.wait("@studentLogin");
    // dashboard loads the profile + the student's own registrations
    cy.wait("@getProfile");
    cy.wait("@getMyRegistrations");
  }

  it("logs in, registers, and shows submission success", () => {
    stubAuthedSession();

    cy.intercept("GET", "/api/subjects*", {
      statusCode: 200,
      body: [
        { id: 101, subjectName: "Data Structures", department: { deptName: "Computer Science" } },
        { id: 102, subjectName: "Operating Systems", department: { deptName: "Computer Science" } },
      ],
    }).as("getSubjects");

    cy.intercept("POST", "/api/register", {
      statusCode: 200,
      body: { regId: "REG-2026-1001", status: "SUBMITTED" },
    }).as("registerStudent");

    login();

    // dashboard shows the branch name with the USN-derived branch code in brackets
    cy.contains("Computer Science (CS)").should("be.visible");
    // and the student's current semester
    cy.contains("Current Semester").should("be.visible");
    cy.contains("Semester 4").should("be.visible");

    // go from the dashboard into the registration form
    cy.get('[data-cy="register-cta"]').click();
    cy.location("pathname").should("eq", "/register");

    // identity is shown locked, sourced from the account (no inputs to fill)
    cy.contains("Registering as").should("be.visible");
    cy.contains(profile.rollNo).should("be.visible");

    // pick curriculum year/semester, which loads subjects
    cy.get('[data-cy="reg-year"]').select("2024");
    cy.get('[data-cy="reg-semester"]').select("4");
    cy.wait("@getSubjects");

    cy.contains("label", "Data Structures").click();
    cy.get('[data-cy="reg-submit"]').click();

    cy.wait("@registerStudent")
      .its("request.body")
      .should((body) => {
        // the body carries only subject selection + semester — never identity
        expect(body).to.have.keys(["currentSemester", "subjectIds"]);
        expect(body.subjectIds).to.deep.equal([101]);
      });

    cy.contains("Registration Submitted").should("be.visible");
    cy.contains("REG-2026-1001").should("be.visible");
  });

  it("blocks registration until a phone number is set", () => {
    stubAuthedSession({ phone: null });

    login();

    cy.get('[data-cy="register-cta"]').click();
    cy.location("pathname").should("eq", "/register");

    // with no phone on the account, the form refuses and points to the dashboard
    cy.contains("Add your phone number").should("be.visible");
    cy.get('[data-cy="reg-submit"]').should("not.exist");
  });

  it("redirects unauthenticated visitors to the student login", () => {
    cy.visit("/register");
    cy.location("pathname").should("eq", "/student/login");
    cy.location("search").should("contain", "redirect");
  });
});
