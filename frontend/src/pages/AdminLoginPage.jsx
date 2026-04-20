import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, LoaderCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";

function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", {
        username,
        password,
      });

      if (res.data.role === "ADMIN" && res.data.token) {
        sessionStorage.setItem("adminRole", "ADMIN");
        sessionStorage.setItem("adminToken", res.data.token);
        
        const redirectUrl = searchParams.get("redirect");
        if (redirectUrl) {
          navigate(redirectUrl);
        } else {
          navigate("/admin");
        }
      } else {
        sessionStorage.removeItem("adminRole");
        sessionStorage.removeItem("adminToken");
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
          <h1 className="text-3xl font-semibold text-[var(--color-secondary)]">Admin Login</h1>
          <p className="mt-2 text-sm text-[var(--text-main)]">
            Sign in to verify and manage backlog registrations.
          </p>
        </div>

        <div className="space-y-4">
          <label htmlFor="admin-username" className="block text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
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

          <label htmlFor="admin-password" className="block text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
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

          {error ? (
            <p role="alert" aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <MagneticCta
            onClick={handleLogin}
            className="mt-2 w-full gap-2 rounded-xl"
            disabled={loading}
            data-cy="admin-login-submit"
            aria-label="Admin login"
          >
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Lock size={16} />} Login
          </MagneticCta>
        </div>

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