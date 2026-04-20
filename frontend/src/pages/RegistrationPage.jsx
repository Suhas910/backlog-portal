import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import msritLogo from "../assets/MSRIT.png";

function RegistrationPage() {
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

  // whenever year or semester changes, fetch subjects
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

    axios
      .get(`/api/subjects`, {
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
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
  };

  const handleSubmit = async () => {
    if (!formData.usn || !formData.name || !formData.email) {
      alert("Please fill in all required fields");
      return;
    }
    if (selectedSubjects.length === 0) {
      alert("Please select at least one subject");
      return;
    }

    try {
      const res = await axios.post("/api/register", {
        rollNo: formData.usn,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        yearOfJoining: parseInt(formData.yearOfJoining),
        currentSemester: parseInt(formData.semester),
        subjectIds: selectedSubjects,
      });
      setRegId(res.data.regId);
      setSubmitted(true);
    } catch (err) {
      alert("Submission failed. Please try again.");
      console.error(err);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`/api/pdf/${regId}`, "_blank");
  };

  // success screen
  if (submitted) {
    return (
      <div className="relative isolate min-h-screen overflow-hidden bg-[var(--bg)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(36,42,82,0.1),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(237,20,91,0.12),transparent_40%),linear-gradient(to_bottom,rgba(36,42,82,0.03),transparent_45%)]" />
        <div className="relative mx-auto w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-6 text-left shadow-[var(--shadow)] sm:p-8">
          <p className="mb-2 inline-flex rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            Submission Complete
          </p>
          <h2 className="mb-3 font-[var(--heading)] text-3xl font-semibold text-[var(--text-h)]">
            Registration Submitted
          </h2>
          <p className="mb-2 text-[var(--text)]">
            Your registration ID is: <strong>{regId}</strong>
          </p>
          <p className="mb-6 text-[var(--text)]">
            Please download your form, print it, and get it signed by your
            Proctor and HOD.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:scale-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              onClick={handleDownloadPdf}
            >
            Download PDF
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text-h)] shadow-[var(--shadow)] transition-colors duration-200 hover:border-[var(--cta)] hover:text-[var(--cta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(36,42,82,0.1),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(237,20,91,0.12),transparent_40%),linear-gradient(to_bottom,rgba(36,42,82,0.03),transparent_45%)]" />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-[var(--brand-secondary)] px-4 py-4 text-white shadow-[var(--shadow)] sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={msritLogo}
              alt="Ramaiah Institute of Technology"
              className="h-11 w-auto sm:h-12"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cta)]">
                Ramaiah Institute of Technology
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-white/80 sm:text-xs">
                Autonomous Institute, Affiliated to VTU
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                Student Flow
              </p>
              <h1 className="font-[var(--heading)] text-2xl font-semibold text-white sm:text-3xl">
                Backlog Registration
              </h1>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center rounded-xl border border-white/25 bg-white px-4 py-2 text-sm font-medium text-[var(--brand-secondary)] shadow-[var(--shadow)] transition-colors duration-200 hover:border-[var(--cta)] hover:text-[var(--cta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-secondary)]"
          >
            Home
          </Link>
        </header>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-[var(--shadow)] opacity-0 motion-safe:animate-[heroFade_600ms_ease-out_forwards] sm:p-8">
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-[var(--text)] sm:text-base">
            Fill in your details and choose backlog subjects for your current
            semester. Required fields are marked with *.
          </p>

          <section className="mb-8 border-t border-[var(--border)] pt-6">
            <h2 className="mb-4 font-[var(--heading)] text-xl font-semibold text-[var(--text-h)]">
              Student Details
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text)]">
                  USN *
                </label>
              <input
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-colors duration-200 placeholder:text-[var(--text)]/70 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                name="usn"
                placeholder="e.g. 1CS22CS001"
                value={formData.usn}
                onChange={handleChange}
              />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text)]">
                  Full Name *
                </label>
              <input
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-colors duration-200 placeholder:text-[var(--text)]/70 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                name="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
              />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text)]">
                  Email *
                </label>
              <input
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-colors duration-200 placeholder:text-[var(--text)]/70 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
              />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text)]">
                  Phone
                </label>
              <input
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-colors duration-200 placeholder:text-[var(--text)]/70 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                name="phone"
                placeholder="10 digit number"
                value={formData.phone}
                onChange={handleChange}
              />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text)]">
                  Year of Joining *
                </label>
              <select
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                name="yearOfJoining"
                value={formData.yearOfJoining}
                onChange={handleChange}
              >
                <option value="">Select year</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
              </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text)]">
                  Semester *
                </label>
              <select
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
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

          <section className="mb-6 border-t border-[var(--border)] pt-6">
            <h2 className="mb-4 font-[var(--heading)] text-xl font-semibold text-[var(--text-h)]">
              Select Backlog Subjects
            </h2>
          {!formData.yearOfJoining || !formData.semester ? (
              <p className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] px-4 py-3 text-sm">
              Select your year and semester above to see subjects.
            </p>
          ) : loadingSubjects ? (
              <p className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] px-4 py-3 text-sm">
                Loading subjects...
              </p>
          ) : subjectsError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {subjectsError}
              </p>
          ) : subjects.length === 0 ? (
              <p className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] px-4 py-3 text-sm">
              No subjects found for this year and semester.
            </p>
          ) : (
            subjects.map((subject) => (
              <div
                key={subject.id}
                  className={`mb-2 rounded-xl border p-3 transition-transform duration-200 motion-safe:hover:translate-y-[-2px] ${
                    selectedSubjects.includes(subject.id)
                      ? "border-[var(--accent-border)] bg-[var(--accent-bg)]"
                      : "border-[var(--border)] bg-[var(--social-bg)]"
                  }`}
              >
                  <div className="flex items-center gap-2">
                    <input
                  type="checkbox"
                  id={`subject-${subject.id}`}
                  checked={selectedSubjects.includes(subject.id)}
                  onChange={() => handleSubjectToggle(subject.id)}
                      className="h-4 w-4 accent-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                />
                <label
                  htmlFor={`subject-${subject.id}`}
                      className="flex flex-1 cursor-pointer items-center justify-between gap-3 text-sm text-[var(--text-h)] sm:text-base"
                >
                  <span>{subject.subjectName}</span>
                      <span className="text-xs text-[var(--text)] sm:text-sm">
                    {subject.department.deptName}
                  </span>
                </label>
                  </div>
              </div>
            ))
          )}
          </section>

          <button
            type="button"
            className="w-full rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          onClick={handleSubmit}
          disabled={selectedSubjects.length === 0}
        >
          Submit Registration
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegistrationPage;
