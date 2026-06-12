import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Lock,
  LoaderCircle,
  GraduationCap,
  Briefcase,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { clearAdminSession } from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";

const DEPT_ROLES = new Set(["HOD", "DEPT_OFFICE"]);

function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [roleTitle, setRoleTitle] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      const validRoles = ["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE"];
      if (validRoles.includes(res.data.role) && res.data.token) {
        sessionStorage.setItem("adminRole", res.data.role);
        sessionStorage.setItem("adminToken", res.data.token);
        sessionStorage.setItem("adminUsername", username);
        if (res.data.departmentName) {
          sessionStorage.setItem("adminDepartment", res.data.departmentName);
        } else {
          sessionStorage.removeItem("adminDepartment");
        }

        // Accounts on a temp password (newly created, reset, or a seeded
        // default) must set their own password before doing anything else.
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
        clearAdminSession();
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

      <motion.div
        id="admin-login-main"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-md rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 pb-24 shadow-soft sm:p-8 md:pb-8"
      >
        <div className="mb-6 text-left">
          <BrandIdentity compact />
          <p className="mb-2 mt-4 inline-flex rounded-full border border-[var(--color-primary)]/30 bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
            Restricted Access
          </p>
          <h1 className="text-3xl font-semibold text-[var(--color-secondary)]">
            {step === 1 ? "Select Designation" : "Staff Login"}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-main)]">
            {step === 1
              ? "Please select your designation to continue."
              : `Sign in as ${roleTitle} to manage registrations.`}
          </p>
        </div>

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
                <h3 className="font-semibold text-[var(--color-secondary)]">
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
                <h3 className="font-semibold text-[var(--color-secondary)]">
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
                <h3 className="font-semibold text-[var(--color-secondary)]">
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
                <h3 className="font-semibold text-[var(--color-secondary)]">
                  Department Office
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-main)]">
                  Manage physical form submissions
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
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-secondary)] underline-offset-4 hover:underline"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>
      </motion.div>

      <MobileActionBar />
    </div>
  );
}

export default AdminLoginPage;
