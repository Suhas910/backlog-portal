import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import msritLogo from "../assets/MSRIT.png";

function VerifyPage() {
  const { qrToken } = useParams();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    axios
      .get(`http://localhost:8080/api/register/verify/${qrToken}`)
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
      await axios.put(`http://localhost:8080/api/register/verify/${qrToken}`);
      setVerified(true);
      setRegistration((prev) => ({ ...prev, status: "VERIFIED" }));
    } catch {
      setError("Verification failed. Please try again.");
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-[var(--shadow)]">
          <p className="text-sm text-[var(--text)]">Loading verification details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-bg)] p-6 shadow-[var(--shadow)]">
          <p className="text-sm font-medium text-[var(--accent)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 text-[var(--text)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-[var(--shadow)] opacity-0 motion-safe:animate-[heroFade_600ms_ease-out_forwards] sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={msritLogo}
              alt="MSRIT"
              className="h-10 w-auto rounded-md border border-[var(--border)] bg-white p-1.5 sm:h-11"
            />
            <div>
              <p className="mb-2 inline-flex rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                Verification Portal
              </p>
              <h1 className="text-2xl font-semibold text-[var(--text-h)] sm:text-3xl">
                Backlog Registration Verification
              </h1>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.08em] ${
              verified
                ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                : "bg-[var(--social-bg)] text-[var(--text-h)]"
            }`}
          >
            {verified ? "VERIFIED" : "SUBMITTED"}
          </span>
        </div>

        <section className="mb-6 border-t border-[var(--border)] pt-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-h)]">Student Details</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">USN</p>
              <p className="mt-1 text-sm text-[var(--text-h)]">{registration.rollNo}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Name</p>
              <p className="mt-1 text-sm text-[var(--text-h)]">{registration.studentName}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Email</p>
              <p className="mt-1 break-all text-sm text-[var(--text-h)]">{registration.email}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Year of Joining</p>
              <p className="mt-1 text-sm text-[var(--text-h)]">{registration.yearOfJoining}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Semester</p>
              <p className="mt-1 text-sm text-[var(--text-h)]">{registration.semester}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Registration ID</p>
              <p className="mt-1 text-sm text-[var(--text-h)]">{registration.regId}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] p-3 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Registered At</p>
              <p className="mt-1 text-sm text-[var(--text-h)]">
                {new Date(registration.registeredAt).toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 border-t border-[var(--border)] pt-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-h)]">Registered Subjects</h2>
          {registration.subjects.map((subject, index) => (
            <div
              key={index}
              className="mb-2 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--social-bg)] px-3 py-2.5 transition-transform duration-200 motion-safe:hover:translate-y-[-2px]"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span>{subject}</span>
            </div>
          ))}
        </section>

        {!verified ? (
          <section className="border-t border-[var(--border)] pt-6">
            <p className="mb-4 text-sm text-[var(--text)]">
              Physical form received and signatures verified? Click below to mark as official.
            </p>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:scale-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? "Verifying..." : "Mark as Verified"}
            </button>
          </section>
        ) : (
          <section className="rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] p-4 text-center">
            <p className="text-sm font-semibold text-[var(--accent)]">
              This registration has been officially verified.
            </p>
          </section>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm font-medium text-[var(--cta)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyPage;