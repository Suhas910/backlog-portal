import { useState, useEffect } from "react";
import { ArrowLeft, LogIn, LoaderCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getStudentToken } from "../lib/api";
import { rememberExpiry } from "../lib/session";
import MobileActionBar from "../components/layout/MobileActionBar";

const USN_PATTERN = /^1MS\d{2}[A-Z]{2}\d{3}$/;

function StudentLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "1";
  const [usn, setUsn] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in — skip the form for the dashboard. Same shape as the admin login: the
  // marker is a presence hint, and an expired cookie returns as ?expired=1 with the marker
  // already cleared by the 401 interceptor.
  useEffect(() => {
    if (!sessionExpired && getStudentToken()) {
      navigate("/student", { replace: true });
    }
  }, [sessionExpired, navigate]);

  const handleLogin = async () => {
    if (!usn || !dob) {
      setError("USN and date of birth are required.");
      return;
    }
    if (!USN_PATTERN.test(usn)) {
      setError("USN must be in the format 1MS22CS001.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await api.post("/student/auth/login", {
        rollNo: usn,
        dateOfBirth: dob, // native date input gives ISO yyyy-MM-dd
      });
      if (res.data.rollNo || res.data.name) {
        // the server set the JWT in an httpOnly cookie; store only a presence marker, UI state,
        // and the refresh schedule
        sessionStorage.setItem("studentToken", "cookie");
        sessionStorage.setItem("studentRollNo", res.data.rollNo || usn);
        sessionStorage.setItem("studentName", res.data.name || "");
        rememberExpiry("student", res.data.expiresIn);
        // Always land on the dashboard, even when the guard bounced the student here from a
        // deep link like /register: it is the home base (profile, status, past registrations),
        // and registration is one CTA click away.
        navigate("/student");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Invalid USN or date of birth.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-10 sm:px-6 lg:px-8">
      <div
        className="mx-auto w-full max-w-md rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 pb-24 shadow-soft sm:p-8 md:pb-8"
      >
        <div className="mb-6 text-left">
          <div className="mb-4 flex items-center rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] px-4 py-3 text-white shadow-soft">
            <BrandIdentity compact />
          </div>
          <p className="mb-2 inline-flex rounded-full border border-[var(--color-primary)]/30 bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
            Student Login
          </p>
          <h1 className="text-3xl font-semibold text-[var(--color-secondary)]">Sign in</h1>
          <p className="mt-2 text-sm text-[var(--text-main)]">
            Log in with your USN and date of birth to register for backlog exams and download your forms.
          </p>
        </div>

        {sessionExpired ? (
          <p
            role="status"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            data-cy="session-expired"
          >
            Your session expired. Please sign in again.
          </p>
        ) : null}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="student-usn"
              className="mb-1.5 block text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]"
            >
              USN
            </label>
            <input
              id="student-usn"
              placeholder="e.g. 1MS22CS001"
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              maxLength={10}
              className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              data-cy="student-usn"
            />
          </div>

          <div>
            <label
              htmlFor="student-dob"
              className="mb-1.5 block text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]"
            >
              Date of Birth
            </label>
            <input
              id="student-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              data-cy="student-dob"
            />
          </div>

          {error ? (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <MagneticCta
            onClick={handleLogin}
            className="mt-2 w-full gap-2 rounded-xl"
            disabled={loading}
            data-cy="student-login-submit"
            aria-label="Student login"
          >
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : <LogIn size={16} />} Login
          </MagneticCta>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="login-back-link inline-flex items-center gap-1 text-sm font-medium text-[var(--color-secondary)] underline-offset-4 hover:underline"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>
      </div>

      <MobileActionBar />
    </div>
  );
}

export default StudentLoginPage;
