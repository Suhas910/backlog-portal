import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, LoaderCircle, Moon, Sun } from "lucide-react";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getAdminHeaders } from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";
import { useTheme } from "../context/ThemeContext";

function VerifyPage() {
  const { qrToken } = useParams();
  const navigate = useNavigate();
  const adminToken = sessionStorage.getItem("adminToken");
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!adminToken) {
      navigate(`/admin/login?redirect=/verify/${qrToken}`);
    }
  }, [adminToken, qrToken, navigate]);

  useEffect(() => {
    api
      .get(`/register/verify/${qrToken}`)
      .then((res) => {
        setRegistration(res.data);
        setLoading(false);
        if (res.data.status === "VERIFIED") setVerified(true);
      })
      .catch(() => {
        setError("Invalid or expired QR code.");
        setLoading(false);
      });
  }, [qrToken]);

  const handleVerify = async () => {

    setVerifying(true);
    try {
      await api.put(`/register/verify/${qrToken}`, {}, { headers: getAdminHeaders() });
      setVerified(true);
      setRegistration((prev) => ({ ...prev, status: "VERIFIED" }));
    } catch {
      setError("Verification failed. Please try again.");
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-1)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto inline-flex w-full max-w-3xl items-center gap-2 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 shadow-soft">
          <LoaderCircle size={16} className="animate-spin" />
          <p className="text-sm text-[var(--text-main)]">Loading verification details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--surface-1)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 shadow-soft">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-8 text-[var(--text-main)] sm:px-6 lg:px-8">
      <a
        href="#verify-main"
        className="sr-only left-4 top-4 z-[60] rounded-md bg-[var(--color-cta)] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed"
      >
        Skip to verification details
      </a>

      <motion.div
        id="verify-main"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-4xl rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 pb-24 shadow-soft sm:p-8 md:pb-8"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <BrandIdentity compact />
            <p className="mb-2 mt-3 inline-flex rounded-full border border-[var(--color-primary)]/30 bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              Verification Portal
            </p>
            <h1 className="text-2xl font-semibold text-[var(--text-main)] sm:text-3xl">
              Backlog Registration Verification
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--stroke)] text-[var(--text-main)] transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.08em] ${
                verified
                  ? "bg-[rgba(145,25,28,0.1)] text-[var(--color-primary)]"
                  : "bg-[var(--surface-muted)] text-[var(--text-main)]"
              }`}
            >
              {verified ? "VERIFIED" : "SUBMITTED"}
            </span>
          </div>
        </div>

        <section className="mb-6 border-t border-[var(--stroke)] pt-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-main)]">Student Details</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">USN</p>
              <p className="mt-1 text-sm text-[var(--text-main)]">{registration.rollNo}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Name</p>
              <p className="mt-1 text-sm text-[var(--text-main)]">{registration.studentName}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Email</p>
              <p className="mt-1 break-all text-sm text-[var(--text-main)]">{registration.email}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Year of Joining</p>
              <p className="mt-1 text-sm text-[var(--text-main)]">{registration.yearOfJoining}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Semester</p>
              <p className="mt-1 text-sm text-[var(--text-main)]">{registration.semester}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Registration ID</p>
              <p className="mt-1 text-sm text-[var(--text-main)]">{registration.regId}</p>
            </div>
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-3 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Registered At</p>
              <p className="mt-1 text-sm text-[var(--text-main)]">
                {new Date(registration.registeredAt).toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 border-t border-[var(--stroke)] pt-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-main)]">Registered Subjects</h2>
          {registration.subjects.map((subject, index) => (
            <div
              key={index}
              className="mb-2 flex items-center gap-3 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-3 py-2.5 transition-transform duration-200 hover:translate-y-[-2px]"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span>{subject}</span>
            </div>
          ))}
        </section>

        {!verified ? (
          <section className="border-t border-[var(--stroke)] pt-6">
            <p className="mb-4 text-sm text-[var(--text-main)]">
              Physical form received and signatures verified? Click below to mark as official.
            </p>
            <MagneticCta
              onClick={handleVerify}
              disabled={verifying}
              className="w-full gap-2 rounded-xl"
              data-cy="verify-submit"
              aria-label="Mark registration as verified"
            >
              {verifying ? <LoaderCircle size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
              {verifying ? "Verifying..." : "Mark as Verified"}
            </MagneticCta>
          </section>
        ) : (
          <section className="rounded-xl border border-[var(--color-primary)]/30 bg-[rgba(145,25,28,0.08)] p-4 text-center">
            <p className="text-sm font-semibold text-[var(--color-primary)]">
              This registration has been officially verified.
            </p>
          </section>
        )}

        <div className="mt-6 text-center">
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

export default VerifyPage;
