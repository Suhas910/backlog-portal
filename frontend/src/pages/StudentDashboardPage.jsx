import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Download,
  LoaderCircle,
  LogOut,
  Pencil,
  Phone,
  Check,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getStudentHeaders, logoutStudent } from "../lib/api";

function statusBadgeClass(status) {
  if (status === "VERIFIED")
    return "border-[var(--color-primary)]/30 bg-[rgba(145,25,28,0.08)] text-[var(--color-primary)]";
  if (status === "REJECTED") return "border-red-200 bg-red-50 text-red-600";
  return "border-[var(--stroke)] bg-[var(--surface-muted)] text-[var(--text-main)]";
}

function StudentDashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const [downloadingId, setDownloadingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [meRes, regRes] = await Promise.all([
        api.get("/student/me", { headers: getStudentHeaders() }),
        api.get("/student/registrations", { headers: getStudentHeaders() }),
      ]);
      setProfile(meRes.data);
      setRegistrations(Array.isArray(regRes.data) ? regRes.data : []);
    } catch (err) {
      // 401/403 is handled globally (redirect to login); show other errors here
      if (![401, 403].includes(err.response?.status)) {
        setError("Unable to load your dashboard. Please refresh and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // NOTE: eslint react-hooks/set-state-in-effect flags this (load setStates
  // internally). Intended and correct — a fetch-on-mount into an external system;
  // state lands in the async body/finally. Left as a knowing lint error (not
  // disabled).
  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    await logoutStudent(); // expire the httpOnly cookie, then clear local state
    navigate("/student/login");
  };

  const startEditPhone = () => {
    setPhoneInput(profile?.phone || "");
    setPhoneError("");
    setEditingPhone(true);
  };

  const savePhone = async () => {
    if (!/^[0-9]{10}$/.test(phoneInput)) {
      setPhoneError("Phone number must be exactly 10 digits.");
      return;
    }
    setSavingPhone(true);
    setPhoneError("");
    try {
      const res = await api.put(
        "/student/me/phone",
        { phone: phoneInput },
        { headers: getStudentHeaders() },
      );
      setProfile(res.data);
      setEditingPhone(false);
    } catch (err) {
      setPhoneError(err.response?.data?.message || "Could not update phone number.");
    } finally {
      setSavingPhone(false);
    }
  };

  const downloadPdf = async (regId) => {
    setDownloadingId(regId);
    try {
      const res = await api.get(`/student/registrations/${regId}/pdf`, {
        headers: getStudentHeaders(),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `backlog-registration-${profile?.rollNo || regId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (![401, 403].includes(err.response?.status)) {
        alert("Could not download the form. Please try again.");
      }
    } finally {
      setDownloadingId("");
    }
  };

  // branch code is the 2-letter code embedded in the USN (e.g. 1MS22CS001 -> CS)
  const branchCode = profile?.rollNo ? profile.rollNo.slice(5, 7) : "";
  const branchLabel = profile?.branch
    ? `${profile.branch}${branchCode ? ` (${branchCode})` : ""}`
    : "";

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] p-4 text-white shadow-soft sm:px-6">
          <BrandIdentity compact />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <LogOut size={15} /> Log out
          </button>
        </header>

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <LoaderCircle size={18} className="animate-spin" /> Loading your dashboard...
          </p>
        ) : error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : (
          <>
            {/* Profile */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft sm:p-6"
            >
              <h1 className="mb-1 text-2xl font-semibold text-[var(--color-secondary)]">
                {profile?.name || "Student"}
              </h1>
              <p className="mb-4 text-sm text-[var(--text-muted)]">{profile?.rollNo}</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email" value={profile?.email} />
                <Field label="Branch" value={branchLabel} />
                <Field
                  label="Current Semester"
                  value={profile?.currentSemester ? `Semester ${profile.currentSemester}` : ""}
                />

                {/* Phone — the only editable field */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Phone
                  </span>
                  {editingPhone ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={phoneInput}
                        onChange={(e) =>
                          setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10 digit number"
                        className="w-44 rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2 text-sm text-[var(--text-main)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        data-cy="phone-input"
                      />
                      <button
                        type="button"
                        onClick={savePhone}
                        disabled={savingPhone}
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        data-cy="phone-save"
                      >
                        {savingPhone ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPhone(false)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm font-semibold text-[var(--text-main)]"
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm ${
                          profile?.phone ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"
                        }`}
                        data-cy="phone-value"
                      >
                        <Phone size={14} /> {profile?.phone || "Not set"}
                      </span>
                      <button
                        type="button"
                        onClick={startEditPhone}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
                        data-cy="phone-edit"
                      >
                        <Pencil size={13} /> {profile?.phone ? "Edit" : "Add phone"}
                      </button>
                    </div>
                  )}
                  {phoneError ? (
                    <p className="text-xs text-red-600">{phoneError}</p>
                  ) : !profile?.phone ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      Add your phone number before registering for backlog exams.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 border-t border-[var(--stroke)] pt-5">
                <MagneticCta
                  onClick={() => navigate("/register")}
                  className="gap-2 rounded-xl"
                  data-cy="register-cta"
                >
                  Register for backlog subjects <ArrowRight size={16} />
                </MagneticCta>
              </div>
            </motion.section>

            {/* Submissions */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft sm:p-6"
            >
              <h2 className="mb-4 text-xl font-semibold text-[var(--text-main)]">
                Your Submissions
              </h2>
              {registrations.length === 0 ? (
                <p className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-main)]">
                  You have no registrations yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {registrations.map((reg) => (
                    <li
                      key={reg.regId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-4"
                    >
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(
                              reg.status,
                            )}`}
                          >
                            {reg.status}
                          </span>
                          {reg.examCycle ? (
                            <span className="text-xs text-[var(--text-muted)]">{reg.examCycle}</span>
                          ) : null}
                        </div>
                        <p className="truncate text-sm text-[var(--text-main)]">
                          {(reg.subjects || []).join(", ") || "No subjects"}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {reg.registeredAt ? new Date(reg.registeredAt).toLocaleString() : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadPdf(reg.regId)}
                        disabled={downloadingId === reg.regId}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-4 py-2 text-sm font-semibold text-[var(--color-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60"
                        data-cy="download-pdf"
                      >
                        {downloadingId === reg.regId ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Download size={15} />
                        )}
                        Download form
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-sm text-[var(--text-main)]">{value || "—"}</span>
    </div>
  );
}

export default StudentDashboardPage;
