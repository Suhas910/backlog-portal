import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarX, CheckCircle2, Download, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";

function RegistrationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    usn: "",
    name: "",
    email: "",
    phone: "",
  });
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [regId, setRegId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [searchYear, setSearchYear] = useState("");
  const [searchSemester, setSearchSemester] = useState("");
  // null = still checking; otherwise { open, cycleName?, examMonthYear? }
  const [regStatus, setRegStatus] = useState(null);

  useEffect(() => {
    api.get("/departments").then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get("/registration-status")
      .then((res) => setRegStatus(res.data))
      // if the check fails, fall back to "open" so a flaky network never blocks a real student
      .catch(() => setRegStatus({ open: true }));
  }, []);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
  }, []);

  // USN format: 1MS<2-digit year><2-letter branch code><3-digit serial>, e.g. 1MS22CS001
  const USN_PATTERN = /^1MS\d{2}[A-Z]{2}\d{3}$/;
  const usnValid = USN_PATTERN.test(formData.usn);

  // Branch is derived from the USN's branch code, matched against department codes.
  const derivedBranch = useMemo(() => {
    if (!usnValid) return "";
    const code = formData.usn.slice(5, 7).toUpperCase();
    const dept = departments.find((d) => (d.code || "").toUpperCase() === code);
    return dept ? dept.deptName : "";
  }, [formData.usn, usnValid, departments]);

  useEffect(() => {
    if (!searchYear || !searchSemester || currentStep !== 2) {
      return;
    }

    let ignoreResponse = false;
    setLoadingSubjects(true);
    setSubjectsError("");

    api
      .get("/subjects", {
        params: {
          year: searchYear,
          semester: searchSemester,
          ...(derivedBranch ? { branch: derivedBranch } : {}),
        },
      })
      .then((res) => {
        if (ignoreResponse) return;
        setSubjects(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (ignoreResponse) return;
        setSubjects([]);
        setSubjectsError("Unable to load subjects. Please try again.");
        console.error("Failed to fetch subjects", err);
      })
      .finally(() => {
        if (ignoreResponse) return;
        setLoadingSubjects(false);
      });

    return () => {
      ignoreResponse = true;
    };
  }, [searchYear, searchSemester, currentStep, derivedBranch]);

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === "usn") {
      value = value.toUpperCase();
      // changing the USN can change the derived branch, so drop any picked subjects
      setSelectedSubjects([]);
    }
    if (e.target.name === "email") value = value.toLowerCase();
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubjectToggle = (subject) => {
    setSelectedSubjects((prev) =>
      prev.some((s) => s.id === subject.id) ? prev.filter((s) => s.id !== subject.id) : [...prev, subject],
    );
  };

  const handleSubmit = async () => {
    if (currentStep === 1) {
      if (!formData.usn || !formData.name || !formData.email || !formData.phone) {
        setSubmitError("Please fill in all required fields.");
        return;
      }
      if (!usnValid) {
        setSubmitError("USN must be in the format 1MS22CS001.");
        return;
      }
      if (!derivedBranch) {
        setSubmitError("We couldn't recognise the branch code in your USN. Please check it or contact the department office.");
        return;
      }
      if (!formData.email.toLowerCase().endsWith("@msrit.edu")) {
        setSubmitError("Email must be a valid @msrit.edu address.");
        return;
      }
      if (!/^[0-9]{10}$/.test(formData.phone)) {
        setSubmitError("Phone number must be exactly 10 digits.");
        return;
      }
      setSubmitError("");
      setCurrentStep(2);
      return;
    }

    if (selectedSubjects.length === 0) {
      setSubmitError("Please select at least one subject.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await api.post("/register", {
        rollNo: formData.usn,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        // branch and year of joining are derived from the USN server-side
        currentSemester: parseInt(searchSemester || "0", 10),
        subjectIds: selectedSubjects.map((s) => s.id),
      });
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

  const handleDownloadPdf = () => {
    window.open(`/api/pdf/${regId}`, "_blank");
  };

  if (regStatus === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-1)] px-4 text-[var(--text-muted)]">
        <p className="inline-flex items-center gap-2 text-sm">
          <LoaderCircle size={18} className="animate-spin" /> Checking registration status...
        </p>
      </div>
    );
  }

  if (regStatus.open === false) {
    return (
      <div className="min-h-screen bg-[var(--surface-1)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto mb-6 w-full max-w-2xl">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] p-4 text-white shadow-soft sm:px-6">
            <BrandIdentity compact />
            <Link
              to="/"
              aria-label="Back to home page"
              className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft size={15} className="mr-1" /> Home
            </Link>
          </header>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="mx-auto w-full max-w-2xl rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 shadow-soft sm:p-8"
        >
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--color-primary)]">
            <CalendarX size={24} />
          </span>
          <h2 className="mb-3 text-3xl font-semibold text-[var(--color-primary)]">Registration Closed</h2>
          <p className="mb-6 text-[var(--text-main)]">
            Backlog registration is not open right now. There is no active exam cycle accepting
            submissions. Please check back when your department announces the next registration window.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--stroke)] bg-[var(--surface-1)] px-5 py-3 text-sm font-semibold text-[var(--color-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--surface-1)] px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-2xl rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 shadow-soft sm:p-8"
        >
          <p className="mb-2 inline-flex rounded-full border border-[var(--color-primary)]/30 bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
            Submission Complete
          </p>
          <h2 className="mb-3 text-3xl font-semibold text-[var(--color-secondary)]">Registration Submitted</h2>
          <p className="mb-2 text-[var(--text-main)]">
            Your registration ID is: <strong>{regId}</strong>
          </p>
          <p className="mb-6 text-[var(--text-main)]">
            Please download your form, print it, and get it signed by your Proctor and HOD.
          </p>
          <div className="flex flex-wrap gap-3">
            <MagneticCta onClick={handleDownloadPdf} className="gap-2">
              <Download size={16} /> Download PDF
            </MagneticCta>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-[var(--surface-1)] px-5 py-3 text-sm font-semibold text-[var(--color-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <ArrowLeft size={16} /> Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-1)] text-[var(--text-main)]">
      <a
        href="#registration-main"
        className="sr-only left-4 top-4 z-[60] rounded-md bg-[var(--color-cta)] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed"
      >
        Skip to registration form
      </a>

      <div id="registration-main" className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-6 lg:px-8 md:pb-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] p-4 text-white shadow-soft sm:px-6">
          <BrandIdentity compact />
          <Link
            to="/"
            aria-label="Back to home page"
            className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={15} className="mr-1" /> Home
          </Link>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft sm:p-8"
        >
          <div className="mb-8 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                  currentStep >= 1
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--text-main)]"
                }`}
              >
                1
              </div>
              <span className="text-sm font-semibold text-[var(--text-main)]">Student Details</span>
            </div>
            <div
              className={`h-1 flex-1 rounded-full ${
                currentStep >= 2 ? "bg-[var(--color-primary)]" : "bg-[var(--surface-muted)]"
              }`}
            />
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                  currentStep >= 2
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--text-main)]"
                }`}
              >
                2
              </div>
              <span className="text-sm font-semibold text-[var(--text-main)]">Select Subjects</span>
            </div>
          </div>

          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-[var(--text-main)] sm:text-base">
            {currentStep === 1
              ? "Fill in your details first. In the next step, you will select your backlog subjects."
              : "Search and add your backlog subjects below. You can change the year and semester to add subjects from different batches before submitting."}
          </p>

          {currentStep === 1 ? (
            <section className="mb-6 border-t border-[var(--stroke)] pt-6">
              <h2 className="mb-4 text-xl font-semibold text-[var(--text-main)]">Student Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="usn" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                    USN *
                  </label>
                  <input
                    id="usn"
                    className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    name="usn"
                    placeholder="e.g. 1MS22CS001"
                    value={formData.usn}
                    onChange={handleChange}
                    maxLength={10}
                    data-cy="reg-usn"
                  />
                  {formData.usn && !usnValid && (
                    <p className="text-xs text-red-600">USN must be in the format 1MS22CS001.</p>
                  )}
                  {usnValid && (
                    derivedBranch ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        Branch: <span className="font-semibold text-[var(--text-main)]">{derivedBranch}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-red-600">
                        Branch code "{formData.usn.slice(5, 7)}" is not recognised. Contact the department office.
                      </p>
                    )
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    name="name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={handleChange}
                    maxLength={60}
                    data-cy="reg-name"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                    Email *
                  </label>
                  <input
                    id="email"
                    className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    name="email"
                  placeholder="usn@msrit.edu"
                    value={formData.email}
                    onChange={handleChange}
                    maxLength={26}
                    data-cy="reg-email"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                    Phone *
                  </label>
                  <input
                    id="phone"
                    className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    name="phone"
                    placeholder="10 digit number"
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData((prev) => ({ ...prev, phone: val }));
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    data-cy="reg-phone"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                    Branch
                  </label>
                  <div
                    className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-3.5 py-2.5 text-sm text-[var(--text-main)]"
                    data-cy="reg-branch"
                  >
                    {derivedBranch || (
                      <span className="text-[var(--text-muted)]">Detected from your USN</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Your branch is determined automatically from your USN.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <section className="mb-6 border-t border-[var(--stroke)] pt-6">
              <h2 className="mb-4 text-xl font-semibold text-[var(--text-main)]">Selected Subjects</h2>
              {selectedSubjects.length === 0 ? (
                <p className="mb-6 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
                  No subjects selected yet. Please search and add subjects below.
                </p>
              ) : (
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedSubjects.map((subject) => (
                    <div key={`sel-${subject.id}`} className="flex items-center justify-between rounded-xl border border-[var(--color-primary)]/30 bg-[rgba(145,25,28,0.08)] p-3 shadow-sm">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-main)] sm:text-base">{subject.subjectName}</p>
                        <p className="text-xs text-[var(--text-main)] sm:text-sm">{subject.department?.deptName} • Sem {subject.semester || searchSemester}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSubjectToggle(subject)}
                        className="ml-3 shrink-0 rounded-md bg-[var(--surface-1)] px-2 py-1 text-xs font-semibold text-red-600 border border-[var(--stroke)] transition-colors hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="mb-4 text-xl font-semibold text-[var(--text-main)]">Search Backlog Subjects</h2>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="searchYear" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                    Curriculum Year Offering
                  </label>
                  <select
                    id="searchYear"
                    className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    value={searchYear}
                    onChange={(e) => setSearchYear(e.target.value)}
                    data-cy="reg-year"
                  >
                    <option value="">Select year</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="searchSemester" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                    Semester
                  </label>
                  <select
                    id="searchSemester"
                    className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    value={searchSemester}
                    onChange={(e) => setSearchSemester(e.target.value)}
                    data-cy="reg-semester"
                  >
                    <option value="">Select semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
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
                  No subjects found for the selected year and semester.
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
                            className="h-4 w-4 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                          />
                          <label
                            htmlFor={`subject-${subject.id}`}
                            className="flex flex-1 cursor-pointer items-center justify-between gap-3 text-sm text-[var(--text-main)] sm:text-base"
                          >
                            <span>{subject.subjectName}</span>
                            <span className="text-xs text-[var(--text-main)] sm:text-sm">{subject.department?.deptName}</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {submitError ? (
            <p
              role="alert"
              aria-live="polite"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {submitError}
            </p>
          ) : null}

          <div className="flex gap-3">
            {currentStep === 2 ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setSubmitError("");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-5 py-3 text-sm font-semibold text-[var(--color-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : null}

            <MagneticCta
              type="button"
              onClick={handleSubmit}
              disabled={currentStep === 2 && (selectedSubjects.length === 0 || submitting)}
              className={`gap-2 rounded-xl ${currentStep === 2 ? "w-full" : "flex-1"} disabled:cursor-not-allowed disabled:opacity-60`}
              data-cy="reg-submit"
              aria-label={currentStep === 1 ? "Continue to subject selection" : "Submit registration"}
            >
              {currentStep === 1 ? (
                <>
                  Continue <ArrowRight size={16} />
                </>
              ) : submitting ? (
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
        </motion.div>
      </div>

      <MobileActionBar />
    </div>
  );
}

export default RegistrationPage;
