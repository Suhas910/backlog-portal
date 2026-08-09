import { useState, useEffect } from "react";
import { ArrowLeft, CalendarRange, CheckCircle2, CircleSlash, LoaderCircle, PlusCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getAdminHeaders } from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";

function ExamCyclePage() {
  const navigate = useNavigate();
  const adminRole = sessionStorage.getItem("adminRole");
  const adminToken = sessionStorage.getItem("adminToken");
  const isAdmin = ["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE"].includes(adminRole);

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [examMonthYear, setExamMonthYear] = useState("");
  const [creating, setCreating] = useState(false);
  const [activatingId, setActivatingId] = useState(null);
  const [endingId, setEndingId] = useState(null);
  const [error, setError] = useState("");

  const loadCycles = () => {
    setLoading(true);
    api
      .get("/admin/exam-cycles", { headers: getAdminHeaders() })
      .then((res) => setCycles(res.data))
      .catch((err) => {
        console.error("Failed to load exam cycles", err);
        setError("Could not load exam cycles.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin || !adminToken) {
      navigate("/admin/login");
      return;
    }
    // NOTE: react-hooks/set-state-in-effect flags this (loadCycles setStates internally).
    // Intended and correct — fetch-on-mount into an external system, state lands in the async
    // .then/.finally. A knowing lint error, deliberately not disabled.
    loadCycles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Cycle name is required.");
      return;
    }
    setCreating(true);
    try {
      await api.post(
        "/admin/exam-cycles",
        { name: name.trim(), examMonthYear: examMonthYear.trim() },
        { headers: getAdminHeaders() },
      );
      setName("");
      setExamMonthYear("");
      loadCycles();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create exam cycle.");
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (id) => {
    setActivatingId(id);
    setError("");
    try {
      await api.put(`/admin/exam-cycles/${id}/activate`, {}, { headers: getAdminHeaders() });
      loadCycles();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to activate exam cycle.");
    } finally {
      setActivatingId(null);
    }
  };

  const handleEnd = async (id) => {
    setEndingId(id);
    setError("");
    try {
      await api.put(`/admin/exam-cycles/${id}/deactivate`, {}, { headers: getAdminHeaders() });
      loadCycles();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to end exam cycle.");
    } finally {
      setEndingId(null);
    }
  };

  if (!isAdmin || !adminToken) return null;

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-8 text-[var(--text-main)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl pb-24 md:pb-0">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] px-4 py-4 text-white shadow-soft sm:px-6">
          <div>
            <BrandIdentity compact />
            <p className="mt-2 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              Manage Exam Cycles
            </p>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 rounded-full border border-white/35 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </header>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <section className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft">
          <h3 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold text-[var(--color-secondary)]">
            <PlusCircle size={18} /> New Exam Cycle
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cycle-name" className="text-xs font-semibold uppercase tracking-[0.08em]">
                Cycle Name *
              </label>
              <input
                id="cycle-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. June 2026 Backlog Exams"
                className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cycle-my" className="text-xs font-semibold uppercase tracking-[0.08em]">
                Exam Month / Year
              </label>
              <input
                id="cycle-my"
                type="text"
                value={examMonthYear}
                onChange={(e) => setExamMonthYear(e.target.value)}
                placeholder="e.g. June 2026"
                className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>
            <div className="sm:col-span-2">
              <MagneticCta type="submit" disabled={creating} className="gap-2 rounded-xl">
                {creating ? <LoaderCircle size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                {creating ? "Creating..." : "Create Cycle"}
              </MagneticCta>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft">
          <h3 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold text-[var(--color-secondary)]">
            <CalendarRange size={18} /> Exam Cycles
          </h3>
          {loading ? (
            <p className="inline-flex items-center gap-2 text-sm">
              <LoaderCircle size={16} className="animate-spin" /> Loading...
            </p>
          ) : cycles.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No exam cycles yet. Create one above — registrations stay closed until a cycle is active.
            </p>
          ) : (
            <ul className="space-y-3">
              {cycles.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-main)]">
                      {c.name}
                      {c.active && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[rgba(145,25,28,0.1)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      )}
                    </p>
                    {c.examMonthYear && (
                      <p className="text-xs text-[var(--text-muted)]">{c.examMonthYear}</p>
                    )}
                  </div>
                  {c.active ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[var(--color-primary)]">Accepting registrations</span>
                      <button
                        type="button"
                        onClick={() => handleEnd(c.id)}
                        disabled={endingId === c.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                        data-cy="cycle-end"
                      >
                        {endingId === c.id ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <CircleSlash size={14} />
                        )}
                        End cycle
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleActivate(c.id)}
                      disabled={activatingId === c.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-secondary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary)] disabled:opacity-50"
                      data-cy="cycle-activate"
                    >
                      {activatingId === c.id ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Activate
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <MobileActionBar />
    </div>
  );
}

export default ExamCyclePage;
