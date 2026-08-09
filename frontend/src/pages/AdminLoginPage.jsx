import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Lock,
  LoaderCircle,
  GraduationCap,
  Briefcase,
  Building2,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getAdminToken, logoutAdmin } from "../lib/api";
import { rememberExpiry } from "../lib/session";
import MobileActionBar from "../components/layout/MobileActionBar";

const DEPT_ROLES = new Set(["HOD", "DEPT_OFFICE", "PROCTOR"]);

function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "1";
  const [step, setStep] = useState(1);
  const [roleTitle, setRoleTitle] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in (e.g. back via "Admin Access") — skip the form and return to the dashboard.
  // The marker is only a presence hint: if the cookie really expired, the dashboard's 401
  // interceptor bounces back with ?expired=1, which clears the marker and suppresses this.
  useEffect(() => {
    if (!sessionExpired && getAdminToken()) {
      navigate("/admin", { replace: true });
    }
  }, [sessionExpired, navigate]);

  useEffect(() => {
    api.get("/departments").then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

  const handleRoleSelect = (title, role) => {
    setRoleTitle(title);
    setSelectedRole(role);
    setStep(2);
    setError("");
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }
    if (DEPT_ROLES.has(selectedRole) && !departmentId) {
      setError("Please select your department.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = { username, password };
      if (DEPT_ROLES.has(selectedRole) && departmentId) {
        payload.departmentId = departmentId;
      }

      const res = await api.post("/auth/login", payload);

      const validRoles = ["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE", "PROCTOR"];
      if (validRoles.includes(res.data.role)) {
        // the server set the JWT in an httpOnly cookie; store only a presence marker, UI state,
        // and the refresh schedule (expiresIn)
        sessionStorage.setItem("adminRole", res.data.role);
        sessionStorage.setItem("adminToken", "cookie");
        sessionStorage.setItem("adminUsername", username);
        rememberExpiry("admin", res.data.expiresIn);
        if (res.data.departmentName) {
          sessionStorage.setItem("adminDepartment", res.data.departmentName);
        } else {
          sessionStorage.removeItem("adminDepartment");
        }

        // accounts on a temp password (new, reset, or seeded) must set their own first
        if (res.data.mustChangePassword === "true") {
          navigate("/admin/change-password?forced=1");
          return;
        }

        const redirectUrl = searchParams.get("redirect");
        if (redirectUrl) {
          navigate(redirectUrl);
        } else {
          navigate("/admin");
        }
      } else {
        // login succeeded server-side (cookie set) but the role is unexpected — clear the
        // cookie too, not just local state
        logoutAdmin();
        setError("Unauthorized role.");
      }
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-10 sm:px-6 lg:px-8">
      <a
        href="#admin-login-main"
        className="sr-only left-4 top-4 z-[60] rounded-md bg-[var(--color-cta)] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed"
      >
        Skip to admin login
      </a>

      <div
        id="admin-login-main"
        className="mx-auto w-full max-w-md rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 pb-24 shadow-soft sm:p-8 md:pb-8"
      >
        <div className="mb-6 text-left">
          <div className="mb-4 flex items-center rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] px-4 py-3 text-white shadow-soft">
            <BrandIdentity compact />
          </div>
          <p className="mb-2 inline-flex rounded-full border border-[var(--color-primary)]/30 bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
            Restricted Access
          </p>
          <h1 className="admin-login-heading text-3xl font-semibold text-[var(--color-secondary)]">
            {step === 1 ? "Select Designation" : "Staff Login"}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-main)]">
            {step === 1
              ? "Please select your designation to continue."
              : `Sign in as ${roleTitle} to manage registrations.`}
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

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleRoleSelect("Administrator", "ADMIN")}
              className="flex items-center gap-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-4 text-left transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-[rgba(145,25,28,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--color-primary)] shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="admin-login-heading font-semibold text-[var(--color-secondary)]">
                  Administrator
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-main)]">
                  Full system access
                </p>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect("Principal / Registrar / COE", "PRINCIPAL")}
              className="flex items-center gap-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-4 text-left transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-[rgba(145,25,28,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--color-primary)] shadow-sm">
                <GraduationCap size={24} />
              </div>
              <div>
                <h3 className="admin-login-heading font-semibold text-[var(--color-secondary)]">
                  Principal / Registrar / COE
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-main)]">
                  High-level overview and final approvals
                </p>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect("Head of Department (HOD)", "HOD")}
              className="flex items-center gap-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-4 text-left transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-[rgba(145,25,28,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--color-primary)] shadow-sm">
                <Briefcase size={24} />
              </div>
              <div>
                <h3 className="admin-login-heading font-semibold text-[var(--color-secondary)]">
                  Head of Department (HOD)
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-main)]">
                  Department level verification and tracking
                </p>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect("Department Office", "DEPT_OFFICE")}
              className="flex items-center gap-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-4 text-left transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-[rgba(145,25,28,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--color-primary)] shadow-sm">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="admin-login-heading font-semibold text-[var(--color-secondary)]">
                  Department Office
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-main)]">
                  Manage physical form submissions
                </p>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect("Proctor", "PROCTOR")}
              className="flex items-center gap-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-4 text-left transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-[rgba(145,25,28,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              data-cy="role-proctor"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--color-primary)] shadow-sm">
                <UserCheck size={24} />
              </div>
              <div>
                <h3 className="admin-login-heading font-semibold text-[var(--color-secondary)]">
                  Proctor
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-main)]">
                  Supervise and manage your assigned students
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label
              htmlFor="admin-username"
              className="block text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]"
            >
              Username
            </label>
            <input
              id="admin-username"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              data-cy="admin-username"
            />

            <label
              htmlFor="admin-password"
              className="block text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              data-cy="admin-password"
            />

            {DEPT_ROLES.has(selectedRole) && (
              <>
                <label
                  htmlFor="admin-department"
                  className="block text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]"
                >
                  Department
                </label>
                <select
                  id="admin-department"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  data-cy="admin-department"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.deptName}
                    </option>
                  ))}
                </select>
              </>
            )}

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
              data-cy="admin-login-submit"
              aria-label="Admin login"
            >
              {loading ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Lock size={16} />
              )}{" "}
              Login
            </MagneticCta>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setUsername("");
                setPassword("");
                setDepartmentId("");
                setSelectedRole("");
                setError("");
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-[var(--text-main)] hover:text-[var(--color-primary)]"
            >
              <ArrowLeft size={14} /> Back to role selection
            </button>
          </div>
        )}

        <div className="mt-4 text-center">
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

export default AdminLoginPage;
