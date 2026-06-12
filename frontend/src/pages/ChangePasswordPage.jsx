import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, LoaderCircle, Lock } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getAdminHeaders } from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";

// Serves two flows:
//  - forced (?forced=1): user just logged in with a temp password and must
//    set their own before continuing. Back-navigation is hidden.
//  - voluntary: a logged-in admin changing their own password.
function ChangePasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forced = searchParams.get("forced") === "1";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post(
        "/auth/change-password",
        { currentPassword, newPassword },
        { headers: getAdminHeaders() },
      );
      navigate("/admin");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not change password.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]";

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-md rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 pb-24 shadow-soft sm:p-8 md:pb-8"
      >
        <div className="mb-6 text-left">
          <BrandIdentity compact />
          <p className="mb-2 mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/30 bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
            <KeyRound size={12} /> Change Password
          </p>
          <h1 className="text-3xl font-semibold text-[var(--color-secondary)]">
            {forced ? "Set a New Password" : "Change Password"}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-main)]">
            {forced
              ? "You're using a temporary password. Choose a new password to continue."
              : "Update the password for your account."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="current-password"
              className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]"
            >
              {forced ? "Temporary Password" : "Current Password"}
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="new-password"
              className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirm-password"
              className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <MagneticCta
            type="submit"
            disabled={loading}
            className="mt-2 w-full gap-2 rounded-xl"
            aria-label="Change password"
          >
            {loading ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Lock size={16} />
            )}{" "}
            Save New Password
          </MagneticCta>
        </form>

        {!forced && (
          <div className="mt-4 text-center">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-secondary)] underline-offset-4 hover:underline"
            >
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
          </div>
        )}
      </motion.div>

      <MobileActionBar />
    </div>
  );
}

export default ChangePasswordPage;
