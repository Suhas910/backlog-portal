import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  CalendarX,
  CheckCircle2,
  Download,
  LoaderCircle,
  Phone,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getStudentHeaders } from "../lib/api";
import { formatAcademicYear } from "../lib/academicYear";
import { savePdfBlob } from "../lib/downloadPdf";
import MobileActionBar from "../components/layout/MobileActionBar";

function RegistrationPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null); // null = loading
  const [profileError, setProfileError] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [regId, setRegId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [searchSemester, setSearchSemester] = useState("");
  // academic year the chosen semester resolved to, server-derived and shown read-only
  const [resolvedAcademicYear, setResolvedAcademicYear] = useState(null);
  // null = still checking; otherwise { open, cycleName?, examMonthYear? }
  const [regStatus, setRegStatus] = useState(null);

  // identity comes from the authenticated account, never a form
  useEffect(() => {
    api
      .get("/student/me", { headers: getStudentHeaders() })
      .then((res) => setProfile(res.data))
      .catch((err) => {
        // 401/403 redirects to login via the global interceptor
        if (![401, 403].includes(err.response?.status)) {
          setProfileError("Unable to load your profile. Please try again.");
          setProfile({});
        }
      });
  }, []);

  useEffect(() => {
    api
      .get("/registration-status")
      .then((res) => setRegStatus(res.data))
      // fail closed: without a confirmed open cycle, don't start a submission the backend
      // would reject anyway
      .catch(() => setRegStatus({ open: false }));
  }, []);

  // backlog semesters registerable, from the server-derived current semester
  const eligibleSemesters = useMemo(() => {
    const fromProfile = profile?.eligibleSemesters;
    return Array.isArray(fromProfile) ? fromProfile : [];
  }, [profile]);

  // The server resolves subjects from the student's progression — the academic year is not a
  // client choice, so only the semester is sent.
  // NOTE: react-hooks/set-state-in-effect flags the resets below. Intended and correct — this
  // fetches subjects for the chosen semester, clearing previous results before bailing when none
  // is selected. Both clear and fetch synchronize UI with an external system, the case the rule
  // carves out. A knowing lint error, deliberately not disabled.
  useEffect(() => {
    if (!searchSemester) {
      setSubjects([]);
      setResolvedAcademicYear(null);
      return;
    }

    let ignoreResponse = false;
    // abort a superseded fetch (semester re-picked before the reply landed) so it stops using a
    // backend connection — the flag alone only hid the response
    const controller = new AbortController();
    setLoadingSubjects(true);
    setSubjectsError("");

    api
      .get("/student/subjects", {
        headers: getStudentHeaders(),
        params: { semester: searchSemester },
        signal: controller.signal,
      })
      .then((res) => {
        if (ignoreResponse) return;
        setSubjects(Array.isArray(res.data?.subjects) ? res.data.subjects : []);
        setResolvedAcademicYear(res.data?.academicYear ?? null);
      })
      .catch((err) => {
        if (ignoreResponse || err.code === "ERR_CANCELED") return;
        setSubjects([]);
        setResolvedAcademicYear(null);
        // surface the server's explanation, e.g. a missing progression record
        setSubjectsError(
          err.response?.data?.message || "Unable to load subjects. Please try again.",
        );
        console.error("Failed to fetch subjects", err);
      })
      .finally(() => {
        if (ignoreResponse) return;
        setLoadingSubjects(false);
      });

    return () => {
      ignoreResponse = true;
      controller.abort();
    };
  }, [searchSemester]);

  const handleSubjectToggle = (subject) => {
    setSelectedSubjects((prev) =>
      prev.some((s) => s.id === subject.id) ? prev.filter((s) => s.id !== subject.id) : [...prev, subject],
    );
  };

  const handleSubmit = async () => {
    if (selectedSubjects.length === 0) {
      setSubmitError("Please select at least one subject.");
      return;
    }
    if (!searchSemester) {
      setSubmitError("Please select the semester you are registering for.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await api.post(
        "/register",
        {
          subjectIds: selectedSubjects.map((s) => s.id),
        },
        { headers: getStudentHeaders() },
      );
      setRegId(res.data.regId);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error.response?.data?.message || "Submission failed. Please review details and try again.",
      );
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/student/registrations/${regId}/pdf`, {
        headers: getStudentHeaders(),
        responseType: "blob",
      });
      savePdfBlob(res.data, `backlog-registration-${profile?.rollNo || regId}.pdf`);
    } catch {
      alert("Could not download the form. Please try again from your dashboard.");
    } finally {
      setDownloading(false);
    }
  };

  // ---- gated render states ----
  if (regStatus === null || profile === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-1)] px-4 text-[var(--text-muted)]">
        <p className="inline-flex items-center gap-2 text-sm">
          <LoaderCircle size={18} className="animate-spin" /> Loading...
        </p>
      </div>
    );
  }

  if (regStatus.open === false) {
    return (
      <CenteredCard icon={<CalendarX size={24} />} title="Registration Closed">
        <p className="mb-6 text-[var(--text-main)]">
          Backlog registration is not open right now. There is no active exam cycle accepting
          submissions. Please check back when your department announces the next registration window.
        </p>
        <BackLink to="/student" label="Back to Dashboard" />
      </CenteredCard>
    );
  }

  // phone is required and settable only in the dashboard
  if (!profile.phone) {
    return (
      <CenteredCard icon={<Phone size={24} />} title="Add your phone number">
        <p className="mb-6 text-[var(--text-main)]">
          You need a phone number on your profile before you can register for backlog exams. Please
          add it in your dashboard and come back.
        </p>
        <MagneticCta onClick={() => navigate("/student")} className="gap-2 rounded-xl">
          Go to Dashboard
        </MagneticCta>
      </CenteredCard>
    );
  }

  if (submitted) {
    return (
      <CenteredCard
        eyebrow="Submission Complete"
        title="Registration Submitted"
      >
        <p className="mb-2 text-[var(--text-main)]">
          Your registration ID is: <strong>{regId}</strong>
        </p>
        <p className="mb-6 text-[var(--text-main)]">
          Please download your form, print it, and get it signed by your Proctor and HOD.
        </p>
        <div className="flex flex-wrap gap-3">
          <MagneticCta onClick={handleDownloadPdf} disabled={downloading} className="gap-2">
            {downloading ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </MagneticCta>
          <Link
            to="/student"
            className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-[var(--surface-1)] px-5 py-3 text-sm font-semibold text-[var(--color-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
      </CenteredCard>
    );
  }

  // ---- main subject-selection form ----
  return (
    <div className="min-h-screen bg-[var(--surface-1)] text-[var(--text-main)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-6 lg:px-8 md:pb-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] p-4 text-white shadow-soft sm:px-6">
          <BrandIdentity compact />
          <Link
            to="/student"
            aria-label="Back to dashboard"
            className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={15} className="mr-1" /> Dashboard
          </Link>
        </header>

        <div
          className="rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft sm:p-8"
        >
          {/* locked identity summary */}
          <section className="mb-6">
            <h2 className="mb-3 text-xl font-semibold text-[var(--text-main)]">Registering as</h2>
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-muted)] p-4 sm:grid-cols-2">
              <LockedField label="Name" value={profile.name} />
              <LockedField label="USN" value={profile.rollNo} />
              <LockedField label="Email" value={profile.email} />
              <LockedField label="Branch" value={profile.branch} />
              <LockedField
                label="Current Semester"
                value={profile.currentSemester ? `Semester ${profile.currentSemester}` : ""}
              />
              <LockedField label="Phone" value={profile.phone} />
            </div>
            {profileError ? (
              <p className="mt-2 text-xs text-red-600">{profileError}</p>
            ) : null}
          </section>

          <section className="mb-6 border-t border-[var(--stroke)] pt-6">
            <h2 className="mb-4 text-xl font-semibold text-[var(--text-main)]">Selected Subjects</h2>
            {selectedSubjects.length === 0 ? (
              <p className="mb-6 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
                No subjects selected yet. Please search and add subjects below.
              </p>
            ) : (
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {selectedSubjects.map((subject) => (
                  <div
                    key={`sel-${subject.id}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-primary)]/30 bg-[rgba(145,25,28,0.08)] p-3 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-main)] sm:text-base">
                        {subject.subjectName}
                      </p>
                      <p className="text-xs text-[var(--text-main)] sm:text-sm">
                        <span className="font-mono">{subject.courseCode}</span> •{" "}
                        {subject.department?.deptName} • Sem {subject.semester || searchSemester} •{" "}
                        {subject.credits} {subject.credits === 1 ? "credit" : "credits"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSubjectToggle(subject)}
                      className="ml-3 shrink-0 rounded-md border border-[var(--stroke)] bg-[var(--surface-1)] px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedSubjects.length > 0 && (
              <div className="mb-6 flex items-center justify-between rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
                <span className="font-semibold text-[var(--text-main)]">
                  {selectedSubjects.length}{" "}
                  {selectedSubjects.length === 1 ? "subject" : "subjects"} selected
                </span>
                <span className="font-semibold text-[var(--text-main)]">
                  Total credits:{" "}
                  {selectedSubjects.reduce((sum, s) => sum + (s.credits || 0), 0)}
                </span>
              </div>
            )}

            <h2 className="mb-4 text-xl font-semibold text-[var(--text-main)]">Search Backlog Subjects</h2>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="searchSemester"
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]"
                >
                  Semester
                </label>
                <select
                  id="searchSemester"
                  className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
                  value={searchSemester}
                  onChange={(e) => setSearchSemester(e.target.value)}
                  data-cy="reg-semester"
                  disabled={eligibleSemesters.length === 0}
                >
                  <option value="">Select semester</option>
                  {eligibleSemesters.map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
                {eligibleSemesters.length === 0 ? (
                  <p className="mt-1 text-xs text-red-600">
                    Your current semester isn't set up yet. Please contact the department office.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                  Academic Year
                </span>
                <div className="flex h-[42px] items-center rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-3.5 text-sm text-[var(--text-main)]">
                  {resolvedAcademicYear
                    ? formatAcademicYear(resolvedAcademicYear)
                    : "Set automatically from your record"}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Resolved from the year you studied this semester.
                </p>
              </div>
            </div>

            {loadingSubjects ? (
              <p className="inline-flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
                <LoaderCircle size={16} className="animate-spin" /> Loading subjects...
              </p>
            ) : subjectsError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {subjectsError}
              </p>
            ) : subjects.length === 0 ? (
              <p className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
                {searchSemester
                  ? "No subjects found for the selected semester."
                  : "Select a semester to find subjects."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {subjects.map((subject) => {
                  const isSelected = selectedSubjects.some((s) => s.id === subject.id);
                  return (
                    <div
                      key={subject.id}
                      className={`rounded-xl border p-3 transition-transform duration-200 motion-safe:hover:translate-y-[-2px] ${
                        isSelected
                          ? "border-[var(--color-primary)]/45 bg-[rgba(145,25,28,0.08)] opacity-60"
                          : "border-[var(--stroke)] bg-[var(--surface-muted)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`subject-${subject.id}`}
                          checked={isSelected}
                          onChange={() => handleSubjectToggle(subject)}
                          className="h-4 w-4 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        />
                        <label
                          htmlFor={`subject-${subject.id}`}
                          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 text-sm text-[var(--text-main)] sm:text-base"
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{subject.subjectName}</span>
                            <span className="font-mono text-xs text-[var(--text-muted)]">
                              {subject.courseCode}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-xs text-[var(--text-main)] sm:text-sm">
                            {subject.department?.deptName}
                            <span className="block text-[var(--text-muted)]">
                              {subject.credits} {subject.credits === 1 ? "credit" : "credits"}
                            </span>
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {submitError ? (
            <p
              role="alert"
              aria-live="polite"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {submitError}
            </p>
          ) : null}

          <MagneticCta
            type="button"
            onClick={handleSubmit}
            disabled={selectedSubjects.length === 0 || submitting}
            className="w-full gap-2 rounded-xl disabled:cursor-not-allowed disabled:opacity-60"
            data-cy="reg-submit"
            aria-label="Submit registration"
          >
            {submitting ? (
              <>
                <LoaderCircle size={16} className="animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Submit Registration
              </>
            )}
          </MagneticCta>
        </div>
      </div>

      <MobileActionBar />
    </div>
  );
}

function LockedField({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-sm font-medium text-[var(--text-main)]">{value || "—"}</span>
    </div>
  );
}

function CenteredCard({ icon, eyebrow, title, children }) {
  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 w-full max-w-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] p-4 text-white shadow-soft sm:px-6">
          <BrandIdentity compact />
          <Link
            to="/student"
            aria-label="Back to dashboard"
            className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={15} className="mr-1" /> Dashboard
          </Link>
        </header>
      </div>
      <div
        className="mx-auto w-full max-w-2xl rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 shadow-soft sm:p-8"
      >
        {eyebrow ? (
          <p className="mb-2 inline-flex rounded-full border border-[var(--color-primary)]/30 bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
            {eyebrow}
          </p>
        ) : null}
        {icon ? (
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--color-primary)]">
            {icon}
          </span>
        ) : null}
        <h2 className="mb-3 text-3xl font-semibold text-[var(--color-secondary)]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function BackLink({ to, label }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--stroke)] bg-[var(--surface-1)] px-5 py-3 text-sm font-semibold text-[var(--color-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
    >
      <ArrowLeft size={16} /> {label}
    </Link>
  );
}

export default RegistrationPage;
