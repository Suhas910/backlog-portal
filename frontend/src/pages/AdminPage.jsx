import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import msritLogo from "../assets/MSRIT.png";

function AdminPage() {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    axios.get("http://localhost:8080/api/admin/registrations").then((res) => {
      setRegistrations(res.data);
      setLoading(false);
    });
  }, [isAdmin]);

  const handleVerify = async (qrToken) => {
    try {
      await axios.put(`http://localhost:8080/api/register/verify/${qrToken}`);
      alert("Verified successfully");
      window.location.reload();
    } catch (err) {
      alert("Verification failed");
      console.error(err);
    }
  };

  const filtered =
    filter === "ALL"
      ? registrations
      : registrations.filter((r) => r.status === filter);

  const totalCount = registrations.length;
  const pendingCount = registrations.filter((r) => r.status === "SUBMITTED").length;
  const verifiedCount = registrations.filter((r) => r.status === "VERIFIED").length;

  if (!isAdmin) {
    return (
      <div className="relative isolate min-h-screen overflow-hidden bg-[var(--bg)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(36,42,82,0.1),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(237,20,91,0.12),transparent_40%),linear-gradient(to_bottom,rgba(36,42,82,0.03),transparent_45%)]" />
        <div className="relative mx-auto w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-8 text-center shadow-[var(--shadow)]">
          <h1 className="mb-2 font-[var(--heading)] text-3xl font-semibold text-[var(--text-h)]">Access Denied</h1>
          <p className="mb-5 text-[var(--text)]">You must login as an admin to view this page.</p>
          <Link
            to="/admin/login"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:scale-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[var(--bg)] px-4 py-8 text-[var(--text)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(36,42,82,0.1),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(237,20,91,0.12),transparent_40%),linear-gradient(to_bottom,rgba(36,42,82,0.03),transparent_45%)]" />
      <div className="relative mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-[var(--brand-secondary)] px-4 py-4 text-white shadow-[var(--shadow)] sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={msritLogo}
              alt="MSRIT"
              className="h-10 w-auto rounded-md bg-white p-1.5 sm:h-11"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                Admin Flow
              </p>
              <h1 className="font-[var(--heading)] text-2xl font-semibold text-white sm:text-3xl">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-white/80">CS Department - backlog registrations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="inline-flex items-center rounded-xl border border-white/25 bg-white px-4 py-2 text-sm font-medium text-[var(--brand-secondary)] shadow-[var(--shadow)] transition-colors duration-200 hover:border-[var(--cta)] hover:text-[var(--cta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-secondary)]"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("isAdmin");
                window.location.href = "/admin/login";
              }}
              className="inline-flex items-center rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:scale-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-secondary)]"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:translate-y-[-2px]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text)]">Total</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--text-h)]">{totalCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:translate-y-[-2px]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text)]">Pending</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--text-h)]">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:translate-y-[-2px]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text)]">Verified</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--text-h)]">{verifiedCount}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[var(--shadow)] sm:p-6">
          <div className="mb-4 flex flex-wrap gap-2">
          {["ALL", "SUBMITTED", "VERIFIED"].map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setFilter(f)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.06em] transition-transform duration-200 motion-safe:hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
                  filter === f
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)]"
                }`}
            >
              {f}
            </button>
          ))}
          </div>

          {loading ? (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--social-bg)] px-4 py-3 text-sm">Loading registrations...</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[var(--social-bg)] text-xs uppercase tracking-[0.08em] text-[var(--text)]">
                    <th className="px-4 py-3">USN</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Semester</th>
                    <th className="px-4 py-3">Subjects</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg) => (
                    <tr key={reg.regId} className="border-t border-[var(--border)] align-top">
                      <td className="px-4 py-3 text-[var(--text-h)]">{reg.rollNo}</td>
                      <td className="px-4 py-3 text-[var(--text-h)]">{reg.studentName}</td>
                      <td className="px-4 py-3">{reg.semester}</td>
                      <td className="px-4 py-3">{reg.subjects.join(", ")}</td>
                      <td className="px-4 py-3">
                    <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            reg.status === "VERIFIED"
                              ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                              : "bg-[var(--social-bg)] text-[var(--text-h)]"
                          }`}
                    >
                      {reg.status}
                    </span>
                      </td>
                      <td className="px-4 py-3">{new Date(reg.registeredAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {reg.status === "SUBMITTED" ? (
                          <button
                            type="button"
                            onClick={() => handleVerify(reg.qrToken)}
                            className="inline-flex items-center rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:scale-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                          >
                            Verify
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-[var(--accent)]">Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminPage;
