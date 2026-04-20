import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, LoaderCircle } from "lucide-react";
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
    yearOfJoining: "",
    semester: "",
  });
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [regId, setRegId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
  }, []);

  useEffect(() => {
    if (!formData.yearOfJoining || !formData.semester) {
      setSubjects([]);
      setSelectedSubjects([]);
      setSubjectsError("");
      setLoadingSubjects(false);
      return;
    }

    let ignoreResponse = false;
    setLoadingSubjects(true);
    setSubjectsError("");

    api
      .get("/subjects", {
        params: {
          year: formData.yearOfJoining,
          semester: formData.semester,
        },
      })
      .then((res) => {
        if (ignoreResponse) return;
        setSubjects(Array.isArray(res.data) ? res.data : []);
        setSelectedSubjects([]);
      })
      .catch((err) => {
        if (ignoreResponse) return;
        setSubjects([]);
        setSelectedSubjects([]);
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
  }, [formData.yearOfJoining, formData.semester]);

  const handleChange = (e) => {
    const next = { ...formData, [e.target.name]: e.target.value };

    if (["yearOfJoining", "semester"].includes(e.target.name)) {
      setSubjectsError("");
      if (!next.yearOfJoining || !next.semester) {
        setSubjects([]);
        setSelectedSubjects([]);
      }
    }

    setFormData(next);
  };

  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId],
    );
  };

  const handleSubmit = async () => {
    if (currentStep === 1) {
      if (!formData.usn || !formData.name || !formData.email) {
        setSubmitError("Please fill in all required fields.");
        return;
      }
      if (!formData.yearOfJoining || !formData.semester) {
        setSubmitError("Please select year and semester.");
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
        yearOfJoining: parseInt(formData.yearOfJoining, 10),
        currentSemester: parseInt(formData.semester, 10),
        subjectIds: selectedSubjects,
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
              : "Select one or more backlog subjects for your chosen semester."}
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
                    placeholder="e.g. 1CS22CS001"
                    value={formData.usn}
                    onChange={handleChange}
                    data-cy="reg-usn"
                  />
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
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    data-cy="reg-email"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                    Phone
                  </label>
                  <input
                    id="phone"
                    className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    name="phone"
                    placeholder="10 digit number"
                    value={formData.phone}
                    onChange={handleChange}
                    data-cy="reg-phone"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="yearOfJoining" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                    Year of Joining *
                  </label>
                  <select
                    id="yearOfJoining"
                    className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    name="yearOfJoining"
                    value={formData.yearOfJoining}
                    onChange={handleChange}
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
                  <label htmlFor="semester" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-main)]">
                    Semester *
                  </label>
                  <select
                    id="semester"
                    className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    data-cy="reg-semester"
                  >
                    <option value="">Select semester</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>
              </div>
            </section>
          ) : (
            <section className="mb-6 border-t border-[var(--stroke)] pt-6">
              <h2 className="mb-4 text-xl font-semibold text-[var(--text-main)]">Select Backlog Subjects</h2>
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
                  No subjects found for this year and semester.
                </p>
              ) : (
                subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className={`mb-2 rounded-xl border p-3 transition-transform duration-200 motion-safe:hover:translate-y-[-2px] ${
                      selectedSubjects.includes(subject.id)
                        ? "border-[var(--color-primary)]/45 bg-[rgba(145,25,28,0.08)]"
                        : "border-[var(--stroke)] bg-[var(--surface-muted)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`subject-${subject.id}`}
                        checked={selectedSubjects.includes(subject.id)}
                        onChange={() => handleSubjectToggle(subject.id)}
                        className="h-4 w-4 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      />
                      <label
                        htmlFor={`subject-${subject.id}`}
                        className="flex flex-1 cursor-pointer items-center justify-between gap-3 text-sm text-[var(--text-main)] sm:text-base"
                      >
                        <span>{subject.subjectName}</span>
                        <span className="text-xs text-[var(--text-main)] sm:text-sm">{subject.department.deptName}</span>
                      </label>
                    </div>
                  </div>
                ))
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
