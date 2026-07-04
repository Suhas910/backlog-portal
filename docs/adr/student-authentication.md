# ADR: Student authentication — USN + Date of Birth (no passwords)

Status: Accepted (design decision, owner-directed) — 2026-07-04.
Branch: `rejectStatus`.

## Decision

Students authenticate with their **USN + Date of Birth**. This is **intentional and
desired** — students will **not** be given passwords, and no password / OTP / 2FA
scheme is to be added for the student audience. Staff accounts are separate and keep
username + bcrypt password (with forced first-login change); this ADR is only about
the *student* login.

This supersedes the earlier review note that flagged USN+DOB as a security weakness
("issue B"). That concern is acknowledged (see Trade-offs) but the owner has chosen
this design deliberately. **Do not re-propose passwords/2FA for students** in future
reviews; treat USN+DOB as a fixed requirement.

## Rationale

- Students are a known, enrolled population; the USN and DOB are already on record,
  so login needs no separate credential distribution or reset workflow.
- Zero password-management burden for students or the department office (no resets,
  no "forgot password", no lockout support load).
- The portal's student-side surface is low-stakes: view eligibility, generate a
  pre-filled backlog form, download it. Identity is re-verified downstream when the
  signed form is submitted in person.

## How it works (correctness — no known handling problems)

- `POST /api/student/auth/login` takes `{ rollNo, dateOfBirth }`; DOB is parsed as
  ISO `yyyy-MM-dd` and compared to the stored value. USN format is validated
  (`1MS<YY><BR><NNN>`, see `Usn`).
- **DOB is write-only**: it is never returned by any endpoint (`StudentSummaryResponse`
  omits it); admins reset it via `POST /{rollNo}/reset-dob`.
- **Brute-force throttling** (`LoginThrottleService`): 5 failures per
  `scope:username:ip` → 15-minute lock. Admin and student failures never cross-count.
- Identity for all student actions comes from the authenticated session, never the
  request body.

The flow is correct as implemented — the decision is a security-posture trade-off,
not a bug.

## Trade-offs (accepted)

- DOB is low-entropy and immutable, and USNs are enumerable, so the credential is
  effectively a known-username + weak-secret pair. The per-IP throttle bounds a
  single attacker but does not impose a global per-account ceiling, so a distributed
  (many-IP) attacker has more room. **Accepted** given the low-stakes surface and the
  in-person downstream verification.
- Recommended defence-in-depth *if ever desired later* (all optional, none change the
  USN+DOB model): a global per-account attempt ceiling on top of the per-IP one, a
  failed-login-spike alert per USN, or a CAPTCHA after N failures. Not required.

## Related

- Auth transport: the JWT rides in an httpOnly cookie with CSRF protection (see the
  cookie-migration work on `rejectStatus`); this is orthogonal to the credential choice.
- `LoginThrottleService`, `StudentAuthController`, `Usn`.
