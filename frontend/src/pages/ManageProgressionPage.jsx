import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  GraduationCap,
  LoaderCircle,
  Search,
  UploadCloud,
  Users,
  Wand2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getAdminHeaders } from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";

const DEPT_ROLES = new Set(["HOD", "DEPT_OFFICE"]);

const inputClass =
  "w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";

const STATUS_STYLES = {
  CREATED: "text-[var(--color-primary)]",
  WOULD_CREATE: "text-[var(--color-primary)]",
  SKIPPED_EXISTS: "text-[var(--text-muted)]",
  WOULD_SKIP: "text-[var(--text-muted)]",
  ERROR: "text-red-600",
};

function ResultTable({ result }) {
  if (!result) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-medium text-[var(--text-main)]">
        {result.dryRun ? "Preview" : "Applied"} — {result.created} created, {result.skipped} skipped,{" "}
        {result.errors} error(s)
      </p>
      <div className="max-h-72 overflow-auto rounded-xl border border-[var(--stroke)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[var(--surface-muted)] text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">USN</th>
              <th className="px-3 py-2">Sem</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {result.results.map((r, i) => (
              <tr key={`${r.rollNo}-${r.semester}-${i}`} className="border-t border-[var(--stroke)]">
                <td className="px-3 py-2 font-mono text-xs">{r.rollNo}</td>
                <td className="px-3 py-2">{r.semester ?? "—"}</td>
                <td className={`px-3 py-2 font-semibold ${STATUS_STYLES[r.status] || ""}`}>{r.status}</td>
                <td className="px-3 py-2 text-[var(--text-muted)]">{r.message || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManageProgressionPage() {
  const navigate = useNavigate();
  const adminRole = sessionStorage.getItem("adminRole") || "";
  const adminDepartment = sessionStorage.getItem("adminDepartment") || "";
  const deptLocked = DEPT_ROLES.has(adminRole);

  const [departments, setDepartments] = useState([]);
  const [pinnedDeptId, setPinnedDeptId] = useState("");

  // Promote Batch
  const [pDeptId, setPDeptId] = useState("");
  const [pAdmissionYear, setPAdmissionYear] = useState("");
  const [pTargetSem, setPTargetSem] = useState("");
  const [pAcademicYear, setPAcademicYear] = useState("");
  const [pExclude, setPExclude] = useState("");
  const [pBusy, setPBusy] = useState(false);
  const [pResult, setPResult] = useState(null);
  const [pError, setPError] = useState("");

  // CSV import
  const [csv, setCsv] = useState("");
  const [iBusy, setIBusy] = useState(false);
  const [iResult, setIResult] = useState(null);
  const [iError, setIError] = useState("");

  // Backfill
  const [bDeptId, setBDeptId] = useState("");
  const [bAdmissionYear, setBAdmissionYear] = useState("");
  const [bBusy, setBBusy] = useState(false);
  const [bResult, setBResult] = useState(null);
  const [bError, setBError] = useState("");

  // Student lookup / correction
  const [lookupRoll, setLookupRoll] = useState("");
  const [student, setStudent] = useState(null);
  const [sBusy, setSBusy] = useState(false);
  const [sError, setSError] = useState("");
  const [editSem, setEditSem] = useState("");
  const [editYear, setEditYear] = useState("");

  // only admin roles reach here; the server enforces the same
  useEffect(() => {
    if (!["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE"].includes(adminRole)) {
      navigate("/admin");
    }
    api.get("/departments").then((res) => setDepartments(res.data)).catch(() => {});
  }, [adminRole, navigate]);

  // pin dept for dept-scoped roles
  useEffect(() => {
    if (deptLocked && adminDepartment && departments.length > 0) {
      const mine = departments.find((d) => d.deptName === adminDepartment);
      if (mine) {
        const id = String(mine.id);
        setPinnedDeptId(id);
        setPDeptId(id);
        setBDeptId(id);
      }
    }
  }, [departments, deptLocked, adminDepartment]);

  const parseExclude = (text) =>
    text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);

  const runPromote = useCallback(
    async (dryRun) => {
      setPError("");
      if (!pTargetSem) {
        setPError("Target semester is required.");
        return;
      }
      if (!dryRun && !pAcademicYear) {
        setPError("Academic year is required to apply.");
        return;
      }
      setPBusy(true);
      try {
        const payload = {
          targetSemester: Number(pTargetSem),
          academicYear: pAcademicYear ? Number(pAcademicYear) : 0,
          dryRun,
          excludeRollNos: parseExclude(pExclude),
        };
        const deptId = deptLocked ? pinnedDeptId : pDeptId;
        if (deptId) payload.deptId = Number(deptId);
        if (pAdmissionYear) payload.admissionYear = Number(pAdmissionYear);
        const res = await api.post("/admin/progression/promote", payload, {
          headers: getAdminHeaders(),
        });
        setPResult(res.data);
      } catch (err) {
        setPError(err.response?.data?.message || "Promote failed.");
      } finally {
        setPBusy(false);
      }
    },
    [pTargetSem, pAcademicYear, pExclude, pDeptId, pAdmissionYear, deptLocked, pinnedDeptId],
  );

  const runImport = useCallback(
    async (dryRun) => {
      setIError("");
      const rows = csv
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !/^usn|^rollno/i.test(line))
        .map((line) => {
          const [rollNo, semester, academicYear] = line.split(",").map((c) => c.trim());
          return { rollNo, semester: Number(semester), academicYear: Number(academicYear) };
        });
      if (rows.length === 0) {
        setIError("Paste at least one row: USN,semester,academicYear");
        return;
      }
      setIBusy(true);
      try {
        const res = await api.post(
          "/admin/progression/import",
          { rows, dryRun },
          { headers: getAdminHeaders() },
        );
        setIResult(res.data);
      } catch (err) {
        setIError(err.response?.data?.message || "Import failed.");
      } finally {
        setIBusy(false);
      }
    },
    [csv],
  );

  const runBackfill = useCallback(
    async (dryRun) => {
      setBError("");
      setBBusy(true);
      try {
        const payload = { dryRun };
        const deptId = deptLocked ? pinnedDeptId : bDeptId;
        if (deptId) payload.deptId = Number(deptId);
        if (bAdmissionYear) payload.admissionYear = Number(bAdmissionYear);
        const res = await api.post("/admin/progression/backfill-linear", payload, {
          headers: getAdminHeaders(),
        });
        setBResult(res.data);
      } catch (err) {
        setBError(err.response?.data?.message || "Backfill failed.");
      } finally {
        setBBusy(false);
      }
    },
    [bDeptId, bAdmissionYear, deptLocked, pinnedDeptId],
  );

  const loadStudent = useCallback(async () => {
    setSError("");
    setStudent(null);
    if (!lookupRoll.trim()) return;
    setSBusy(true);
    try {
      const res = await api.get(`/admin/progression/${lookupRoll.trim()}`, {
        headers: getAdminHeaders(),
      });
      setStudent(res.data);
    } catch (err) {
      setSError(err.response?.data?.message || "Could not load student.");
    } finally {
      setSBusy(false);
    }
  }, [lookupRoll]);

  const saveOverride = async (semester, academicYear) => {
    if (!academicYear) {
      setSError("Enter an academic year.");
      return;
    }
    setSBusy(true);
    setSError("");
    try {
      const res = await api.put(
        `/admin/progression/${student.rollNo}/semester/${semester}`,
        { academicYear: Number(academicYear) },
        { headers: getAdminHeaders() },
      );
      setStudent(res.data);
      setEditSem("");
      setEditYear("");
    } catch (err) {
      setSError(err.response?.data?.message || "Could not save.");
    } finally {
      setSBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-8 text-[var(--text-main)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl pb-24 md:pb-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] p-4 text-white shadow-soft sm:px-6">
          <BrandIdentity compact />
          <Link
            to="/admin"
            className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={15} className="mr-1" /> Dashboard
          </Link>
        </header>

        <div className="mb-5">
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-[var(--color-secondary)] sm:text-3xl">
            <GraduationCap size={26} /> Student Progression
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Record which academic year each student studied a semester. This drives which
            subject set their backlogs resolve to.
            {deptLocked && adminDepartment ? ` Scoped to ${adminDepartment}.` : ""}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {/* Promote Batch */}
          <Card icon={<Users size={18} />} title="Promote a batch">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em]">Department</label>
                <DeptSelect
                  deptLocked={deptLocked}
                  pinnedDeptId={pinnedDeptId}
                  departments={departments}
                  value={pDeptId}
                  onChange={setPDeptId}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em]">
                  Admission year (optional)
                </label>
                <input
                  className={inputClass}
                  type="number"
                  placeholder="e.g. 2024"
                  value={pAdmissionYear}
                  onChange={(e) => setPAdmissionYear(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em]">Promote to semester</label>
                <select className={inputClass} value={pTargetSem} onChange={(e) => setPTargetSem(e.target.value)} data-cy="prog-promote-sem">
                  <option value="">Select semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em]">Academic year</label>
                <input
                  className={inputClass}
                  type="number"
                  placeholder="e.g. 2025 (= AY 2025–26)"
                  value={pAcademicYear}
                  onChange={(e) => setPAcademicYear(e.target.value)}
                  data-cy="prog-promote-ay"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.08em]">
                  Hold back (detained USNs, optional)
                </label>
                <input
                  className={inputClass}
                  placeholder="comma or space separated USNs"
                  value={pExclude}
                  onChange={(e) => setPExclude(e.target.value)}
                />
              </div>
            </div>
            {pError && <p className="mt-3 text-sm text-red-600" role="alert" data-cy="prog-promote-error">{pError}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runPromote(true)}
                disabled={pBusy}
                data-cy="prog-promote-preview"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--color-primary)] disabled:opacity-60"
              >
                {pBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Preview
              </button>
              <MagneticCta type="button" onClick={() => runPromote(false)} disabled={pBusy} className="gap-2 rounded-xl" data-cy="prog-promote-apply">
                <Users size={15} /> Apply promotion
              </MagneticCta>
            </div>
            <ResultTable result={pResult} />
          </Card>

          {/* CSV import */}
          <Card icon={<UploadCloud size={18} />} title="Import progression (CSV)">
            <p className="mb-2 text-xs text-[var(--text-muted)]">
              One row per line: <code>USN,semester,academicYear</code>. Existing rows are kept
              (write-once) — use the correction tool below to change one.
            </p>
            <textarea
              className={`${inputClass} min-h-32 font-mono`}
              placeholder={"1MS24CS191,1,2024\n1MS24CS191,2,2024"}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              data-cy="prog-import-csv"
            />
            {iError && <p className="mt-3 text-sm text-red-600">{iError}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runImport(true)}
                disabled={iBusy}
                data-cy="prog-import-preview"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--color-primary)] disabled:opacity-60"
              >
                {iBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Preview
              </button>
              <MagneticCta type="button" onClick={() => runImport(false)} disabled={iBusy} className="gap-2 rounded-xl">
                <UploadCloud size={15} /> Import
              </MagneticCta>
            </div>
            <ResultTable result={iResult} />
          </Card>

          {/* Backfill */}
          <Card icon={<Wand2 size={18} />} title="Backfill history (linear default)">
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              Seeds every semester up to each student's current semester assuming no detention
              (sem k → admission year + ⌊(k−1)/2⌋). Write-once, so hand-corrected rows are kept.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em]">Department</label>
                <DeptSelect
                  deptLocked={deptLocked}
                  pinnedDeptId={pinnedDeptId}
                  departments={departments}
                  value={bDeptId}
                  onChange={setBDeptId}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em]">
                  Admission year (optional)
                </label>
                <input
                  className={inputClass}
                  type="number"
                  placeholder="e.g. 2024"
                  value={bAdmissionYear}
                  onChange={(e) => setBAdmissionYear(e.target.value)}
                />
              </div>
            </div>
            {bError && <p className="mt-3 text-sm text-red-600">{bError}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runBackfill(true)}
                disabled={bBusy}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--color-primary)] disabled:opacity-60"
              >
                {bBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Preview
              </button>
              <MagneticCta type="button" onClick={() => runBackfill(false)} disabled={bBusy} className="gap-2 rounded-xl">
                <Wand2 size={15} /> Run backfill
              </MagneticCta>
            </div>
            <ResultTable result={bResult} />
          </Card>

          {/* Lookup & correct */}
          <Card icon={<Search size={18} />} title="View & correct a student">
            <div className="flex flex-wrap gap-3">
              <input
                className={`${inputClass} max-w-xs font-mono`}
                placeholder="USN e.g. 1MS24CS191"
                value={lookupRoll}
                onChange={(e) => setLookupRoll(e.target.value)}
                data-cy="prog-lookup-input"
              />
              <button
                type="button"
                onClick={loadStudent}
                disabled={sBusy}
                data-cy="prog-lookup-load"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--color-primary)] disabled:opacity-60"
              >
                {sBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Load
              </button>
            </div>
            {sError && <p className="mt-3 text-sm text-red-600">{sError}</p>}
            {student && (
              <div className="mt-4">
                <p className="mb-3 text-sm">
                  <span className="font-semibold">{student.name}</span> ({student.rollNo}) — current
                  semester <span className="font-semibold">{student.currentSemester}</span>
                </p>
                <div className="overflow-hidden rounded-xl border border-[var(--stroke)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      <tr>
                        <th className="px-3 py-2">Semester</th>
                        <th className="px-3 py-2">Academic year</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.terms.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-3 text-[var(--text-muted)]">
                            No progression rows yet.
                          </td>
                        </tr>
                      ) : (
                        student.terms.map((t) => (
                          <TermRow key={t.semester} term={t} onSave={saveOverride} busy={sBusy} />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* add / correct a specific semester */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.08em]">Semester</label>
                    <select className={`${inputClass} w-32`} value={editSem} onChange={(e) => setEditSem(e.target.value)}>
                      <option value="">Select</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.08em]">Academic year</label>
                    <input
                      className={`${inputClass} w-40`}
                      type="number"
                      placeholder="e.g. 2024"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => editSem && saveOverride(Number(editSem), editYear)}
                    disabled={sBusy || !editSem}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--color-primary)] disabled:opacity-60"
                  >
                    Set / correct
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <MobileActionBar />
    </div>
  );
}

// Defined at module scope (not inside ManageProgressionPage) so their identity is
// stable across renders — an inline definition makes every keystroke remount the
// card subtree and steal focus from the inputs inside it.
function Card({ icon, title, children }) {
  return (
    <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft sm:p-6">
      <h2 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold text-[var(--color-secondary)]">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function DeptSelect({ deptLocked, pinnedDeptId, departments, value, onChange }) {
  return (
    <select
      className={inputClass}
      value={deptLocked ? pinnedDeptId : value}
      onChange={(e) => onChange(e.target.value)}
      disabled={deptLocked}
    >
      <option value="">All departments</option>
      {departments.map((d) => (
        <option key={d.id} value={d.id}>
          {d.deptName}
        </option>
      ))}
    </select>
  );
}

function TermRow({ term, onSave, busy }) {
  const [year, setYear] = useState(String(term.academicYear));
  return (
    <tr className="border-t border-[var(--stroke)]">
      <td className="px-3 py-2">Semester {term.semester}</td>
      <td className="px-3 py-2">
        <input
          className={`${inputClass} w-32`}
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          data-cy={`prog-term-year-${term.semester}`}
        />
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => onSave(term.semester, year)}
          disabled={busy || year === String(term.academicYear)}
          data-cy={`prog-term-save-${term.semester}`}
          className="rounded-md border border-[var(--stroke)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold transition-colors hover:border-[var(--color-primary)] disabled:opacity-50"
        >
          Save
        </button>
      </td>
    </tr>
  );
}

export default ManageProgressionPage;
