import { useState, useCallback } from "react";
import {
  AlertTriangle,
  LoaderCircle,
  Search,
  UploadCloud,
  Users,
  Wand2,
} from "lucide-react";
import MagneticCta from "../../components/ui/MagneticCta";
import api, { getAdminHeaders } from "../../lib/api";
import { parseAcademicYear } from "../../lib/academicYear";
import { SemesterTimeline } from "./SemesterTimeline";
import BatchResultTable from "./BatchResultTable";

const inputClass =
  "w-full rounded-xl border border-stroke bg-surface-1 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-60";

const isConflict = (status) => status === "CONFLICT" || status === "WOULD_CONFLICT";

/**
 * Per-row result list. Conflict rows get a one-click fix that writes the row's year through the
 * audited single-row override — the bulk paths deliberately have no overwrite power, so without
 * this the report would be a dead end the admin has to re-key by hand.
 */
function ResultTable({ result, onApplyCorrection }) {
  const [applying, setApplying] = useState("");
  const [applied, setApplied] = useState({});

  const apply = async (r) => {
    const key = `${r.rollNo}-${r.semester}`;
    setApplying(key);
    try {
      await onApplyCorrection(r.rollNo, r.semester, r.requestedAcademicYear);
      setApplied((prev) => ({ ...prev, [key]: "done" }));
    } catch (err) {
      setApplied((prev) => ({
        ...prev,
        [key]: err.response?.data?.message || "Could not apply.",
      }));
    } finally {
      setApplying("");
    }
  };

  // the conflict fix, as the shared table's per-row trailing control
  const rowAction = (r) => {
    if (!isConflict(r.status) || r.requestedAcademicYear == null || !onApplyCorrection) return null;
    const key = `${r.rollNo}-${r.semester}`;
    return (
      <span className="ml-2 inline-flex items-center gap-2">
        {applied[key] === "done" ? (
          <span className="text-xs font-semibold text-primary-ink">
            Applied {r.requestedAcademicYear}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => apply(r)}
            disabled={applying === key}
            data-cy={`progression-apply-conflict-${r.rollNo}-${r.semester}`}
            className="rounded-lg border border-amber-300 px-2 py-0.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
          >
            {applying === key ? "Applying..." : `Use ${r.requestedAcademicYear}`}
          </button>
        )}
        {applied[key] && applied[key] !== "done" && (
          <span className="text-xs font-medium text-red-600">{applied[key]}</span>
        )}
      </span>
    );
  };

  return (
    <BatchResultTable result={result} verb="Applied" showConflicts renderRowAction={rowAction} />
  );
}

// Progression tools as a presentational tab in the Manage Students shell. The shell owns the role
// guard, departments fetch, and dept-pin resolution (passed via props); this only renders the
// tools. Dept scope is enforced server-side on /api/admin/progression/**. The internal Find/Bulk
// toggle is local state, not a URL tab, so it can't collide with the shell's ?tab=.
function ProgressionTab({ departments, adminDepartment, deptLocked, pinnedDeptId }) {
  // "find" (gaps + per-student correct) vs "bulk" (promote / import / backfill)
  const [tab, setTab] = useState("find");

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

  // Progression gaps
  const [gDeptId, setGDeptId] = useState("");
  const [gAdmissionYear, setGAdmissionYear] = useState("");
  const [gBusy, setGBusy] = useState(false);
  const [gError, setGError] = useState("");
  const [gaps, setGaps] = useState(null);

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
      const academicYear = pAcademicYear ? parseAcademicYear(pAcademicYear) : 0;
      if (pAcademicYear && Number.isNaN(academicYear)) {
        setPError("Enter the academic year as a range or start year, e.g. 2025-26.");
        return;
      }
      // bulk ops target one explicit cohort (dept + admission year), mirroring the server guard
      // that rejects an unscoped batch with 400
      const deptId = deptLocked ? pinnedDeptId : pDeptId;
      if (!deptId) {
        setPError("Select a department — a batch targets one department at a time.");
        return;
      }
      if (!pAdmissionYear) {
        setPError("Admission year is required — a batch targets one intake at a time.");
        return;
      }
      setPBusy(true);
      try {
        const payload = {
          targetSemester: Number(pTargetSem),
          academicYear,
          dryRun,
          excludeRollNos: parseExclude(pExclude),
          deptId: Number(deptId),
          admissionYear: Number(pAdmissionYear),
        };
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
          return { rollNo, semester: Number(semester), academicYear: parseAcademicYear(academicYear) };
        });
      if (rows.length === 0) {
        setIError("Paste at least one row: USN,semester,academicYear (e.g. 1MS24CS191,1,2024-25)");
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
      // same explicit-cohort rule as promote; mirrors the server-side 400 guard
      const deptId = deptLocked ? pinnedDeptId : bDeptId;
      if (!deptId) {
        setBError("Select a department — a batch targets one department at a time.");
        return;
      }
      if (!bAdmissionYear) {
        setBError("Admission year is required — a batch targets one intake at a time.");
        return;
      }
      setBBusy(true);
      try {
        const payload = {
          dryRun,
          deptId: Number(deptId),
          admissionYear: Number(bAdmissionYear),
        };
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

  const loadStudentRoll = useCallback(async (roll) => {
    setSError("");
    setStudent(null);
    // USNs are stored and validated uppercase; normalize so a lowercase entry still resolves and
    // can't hit the dept-scope 403 path that logs the user out
    const r = (roll || "").trim().toUpperCase();
    if (!r) return;
    setSBusy(true);
    try {
      const res = await api.get(`/admin/progression/${r}`, {
        headers: getAdminHeaders(),
      });
      setStudent(res.data);
    } catch (err) {
      setSError(err.response?.data?.message || "Could not load student.");
    } finally {
      setSBusy(false);
    }
  }, []);

  const loadStudent = useCallback(() => loadStudentRoll(lookupRoll), [lookupRoll, loadStudentRoll]);

  // jump from a gaps row into the correction tool, pre-loaded with that student
  const fixGap = (roll) => {
    setLookupRoll(roll);
    loadStudentRoll(roll);
  };

  const runGaps = useCallback(async () => {
    setGError("");
    // the gaps sweep needs at least a department; year stays an optional narrowing
    const deptId = deptLocked ? pinnedDeptId : gDeptId;
    if (!deptId) {
      setGError("Select a department to check for gaps.");
      return;
    }
    setGBusy(true);
    try {
      const params = { deptId: Number(deptId) };
      if (gAdmissionYear) params.admissionYear = Number(gAdmissionYear);
      const res = await api.get("/admin/progression/gaps", {
        headers: getAdminHeaders(),
        params,
      });
      setGaps(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setGError(err.response?.data?.message || "Could not load gaps.");
    } finally {
      setGBusy(false);
    }
  }, [deptLocked, pinnedDeptId, gDeptId, gAdmissionYear]);

  const saveSemesters = async (currentSemester, entrySemester) => {
    setSBusy(true);
    setSError("");
    try {
      const res = await api.put(
        `/admin/progression/${student.rollNo}/current-semester`,
        { currentSemester, entrySemester },
        { headers: getAdminHeaders() },
      );
      setStudent(res.data);
    } catch (err) {
      setSError(err.response?.data?.message || "Could not update semester.");
    } finally {
      setSBusy(false);
    }
  };

  const saveOverride = async (semester, academicYear) => {
    if (!academicYear) {
      setSError("Enter an academic year.");
      return;
    }
    const parsed = parseAcademicYear(academicYear);
    if (Number.isNaN(parsed)) {
      setSError("Enter the academic year as a range or start year, e.g. 2024-25.");
      return;
    }
    setSBusy(true);
    setSError("");
    try {
      const res = await api.put(
        `/admin/progression/${student.rollNo}/semester/${semester}`,
        { academicYear: parsed },
        { headers: getAdminHeaders() },
      );
      setStudent(res.data);
    } catch (err) {
      setSError(err.response?.data?.message || "Could not save.");
    } finally {
      setSBusy(false);
    }
  };

  // Resolve one conflict row from a bulk result. Goes through the same single-row override the
  // timeline uses — audited (PROGRESSION_OVERRIDE logs actor and previous→new) and one student at a
  // time, which is the whole reason the bulk paths don't overwrite. Errors surface per row.
  const applyCorrection = useCallback(async (rollNo, semester, academicYear) => {
    await api.put(
      `/admin/progression/${rollNo}/semester/${semester}`,
      { academicYear },
      { headers: getAdminHeaders() },
    );
  }, []);

  return (
    <div>
      <p className="mb-4 text-sm text-ink-muted">
        Record which academic year each student studied a semester. This drives which subject set
        their backlogs resolve to.
        {deptLocked && adminDepartment ? ` Scoped to ${adminDepartment}.` : ""}
      </p>

      <div className="mb-5 inline-flex rounded-2xl border border-stroke bg-surface-1 p-1 shadow-soft">
        {[
          { key: "find", label: "Find & correct" },
          { key: "bulk", label: "Bulk tools" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            data-cy={`prog-tab-${t.key}`}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-primary text-white"
                : "text-secondary-ink hover:bg-surface-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {tab === "bulk" && (
          <>
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
                    dataCy="prog-promote-dept"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em]">
                    Admission year
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    placeholder="e.g. 2024"
                    value={pAdmissionYear}
                    onChange={(e) => setPAdmissionYear(e.target.value)}
                    data-cy="prog-promote-admyear"
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
                    type="text"
                    placeholder="e.g. 2025-26"
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
                  className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-surface-muted px-4 py-2 text-sm font-semibold transition-colors hover:border-primary disabled:opacity-60"
                >
                  {pBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Preview
                </button>
                <MagneticCta type="button" onClick={() => runPromote(false)} disabled={pBusy} className="gap-2 rounded-xl" data-cy="prog-promote-apply">
                  <Users size={15} /> Apply promotion
                </MagneticCta>
              </div>
              <ResultTable result={pResult} onApplyCorrection={applyCorrection} />
            </Card>

            {/* CSV import */}
            <Card icon={<UploadCloud size={18} />} title="Import progression (CSV)">
              <p className="mb-2 text-xs text-ink-muted">
                One row per line: <code>USN,semester,academicYear</code> (academic year as
                <code> 2024-25</code> or just <code>2024</code>). Existing rows are kept
                (write-once) — use the correction tool below to change one.
              </p>
              <textarea
                className={`${inputClass} min-h-32 font-mono`}
                placeholder={"1MS24CS191,1,2024-25\n1MS24CS191,2,2024-25"}
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
                  className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-surface-muted px-4 py-2 text-sm font-semibold transition-colors hover:border-primary disabled:opacity-60"
                >
                  {iBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Preview
                </button>
                <MagneticCta type="button" onClick={() => runImport(false)} disabled={iBusy} className="gap-2 rounded-xl">
                  <UploadCloud size={15} /> Import
                </MagneticCta>
              </div>
              <ResultTable result={iResult} onApplyCorrection={applyCorrection} />
            </Card>

            {/* Backfill */}
            <Card icon={<Wand2 size={18} />} title="Backfill history (linear default)">
              <p className="mb-3 text-xs text-ink-muted">
                Seeds every semester from each student's entry semester through semester 8,
                assuming no detention (sem k → admission year + ⌊(k−entry)/2⌋). Write-once, so
                hand-corrected rows are kept.
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
                    dataCy="prog-backfill-dept"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em]">
                    Admission year
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    placeholder="e.g. 2024"
                    value={bAdmissionYear}
                    onChange={(e) => setBAdmissionYear(e.target.value)}
                    data-cy="prog-backfill-admyear"
                  />
                </div>
              </div>
              {bError && <p className="mt-3 text-sm text-red-600">{bError}</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => runBackfill(true)}
                  disabled={bBusy}
                  className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-surface-muted px-4 py-2 text-sm font-semibold transition-colors hover:border-primary disabled:opacity-60"
                >
                  {bBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Preview
                </button>
                <MagneticCta type="button" onClick={() => runBackfill(false)} disabled={bBusy} className="gap-2 rounded-xl">
                  <Wand2 size={15} /> Run backfill
                </MagneticCta>
              </div>
              <ResultTable result={bResult} />
            </Card>
          </>
        )}

        {tab === "find" && (
          <>
            {/* Progression gaps */}
            <Card icon={<AlertTriangle size={18} />} title="Find students missing progression">
              <p className="mb-3 text-xs text-ink-muted">
                Students with no academic-year row for one or more semesters in their eligibility
                window — typically newly added students. Pick one to set its timeline below.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em]">Department</label>
                  <DeptSelect
                    deptLocked={deptLocked}
                    pinnedDeptId={pinnedDeptId}
                    departments={departments}
                    value={gDeptId}
                    onChange={setGDeptId}
                    dataCy="prog-gaps-dept"
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
                    value={gAdmissionYear}
                    onChange={(e) => setGAdmissionYear(e.target.value)}
                  />
                </div>
              </div>
              {gError && <p className="mt-3 text-sm text-red-600" data-cy="prog-gaps-error">{gError}</p>}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={runGaps}
                  disabled={gBusy}
                  data-cy="prog-gaps-find"
                  className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-surface-muted px-4 py-2 text-sm font-semibold transition-colors hover:border-primary disabled:opacity-60"
                >
                  {gBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Find gaps
                </button>
              </div>
              {gaps && (
                <div className="mt-4">
                  {gaps.length === 0 ? (
                    <p
                      className="rounded-xl border border-stroke bg-surface-muted px-4 py-3 text-sm"
                      data-cy="prog-gaps-empty"
                    >
                      No students are missing progression for this selection.
                    </p>
                  ) : (
                    <div className="max-h-72 overflow-auto rounded-xl border border-stroke">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-surface-muted text-xs uppercase tracking-[0.08em] text-ink-muted">
                          <tr>
                            <th className="px-3 py-2">USN</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Missing sems</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {gaps.map((g) => (
                            <tr key={g.rollNo} className="border-t border-stroke">
                              <td className="px-3 py-2 font-mono text-xs">{g.rollNo}</td>
                              <td className="px-3 py-2">{g.name}</td>
                              <td className="px-3 py-2">{g.missingSemesters.join(", ")}</td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => fixGap(g.rollNo)}
                                  data-cy={`prog-gaps-fix-${g.rollNo}`}
                                  className="rounded-md border border-stroke bg-surface-1 px-3 py-1 text-xs font-semibold transition-colors hover:border-primary"
                                >
                                  Fix
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Lookup & correct */}
            <Card icon={<Search size={18} />} title="View & correct a student">
              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputClass} max-w-xs font-mono`}
                  placeholder="USN e.g. 1MS24CS191"
                  value={lookupRoll}
                  onChange={(e) => setLookupRoll(e.target.value.toUpperCase())}
                  data-cy="prog-lookup-input"
                />
                <button
                  type="button"
                  onClick={loadStudent}
                  disabled={sBusy}
                  data-cy="prog-lookup-load"
                  className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-surface-muted px-4 py-2 text-sm font-semibold transition-colors hover:border-primary disabled:opacity-60"
                >
                  {sBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Load
                </button>
              </div>
              {sError && <p className="mt-3 text-sm text-red-600">{sError}</p>}
              {student && (
                <div className="mt-4">
                  <p className="mb-3 text-sm">
                    <span className="font-semibold">{student.name}</span>{" "}
                    <span className="font-mono text-xs text-ink-muted">{student.rollNo}</span>
                  </p>
                  <SemesterEditor
                    key={`${student.rollNo}-${student.currentSemester}-${student.entrySemester}`}
                    student={student}
                    onSave={saveSemesters}
                    busy={sBusy}
                  />
                  <p className="mb-3 mt-4 text-xs text-ink-muted">
                    Every semester from entry through semester 8 is listed below — all are editable.
                    Rows showing a dash have no academic year recorded yet; semesters past the current
                    one are muted (not yet reached) but can still be set.
                  </p>
                  <SemesterTimeline student={student} onSaveYear={saveOverride} busy={sBusy} />
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// Module scope, not inside ProgressionTab, so identity is stable across renders — an inline
// definition remounts the card subtree on every keystroke and steals focus from its inputs.
function Card({ icon, title, children }) {
  return (
    <section className="rounded-3xl border border-stroke bg-surface-1 p-5 shadow-soft sm:p-6">
      <h2 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold text-secondary-ink">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function DeptSelect({ deptLocked, pinnedDeptId, departments, value, onChange, dataCy }) {
  return (
    <select
      className={inputClass}
      value={deptLocked ? pinnedDeptId : value}
      onChange={(e) => onChange(e.target.value)}
      disabled={deptLocked}
      data-cy={dataCy}
    >
      {/* a department is required everywhere this select appears (bulk cohort +
          gaps sweep), so there is deliberately no "all departments" option */}
      <option value="">Select department…</option>
      {departments.map((d) => (
        <option key={d.id} value={d.id}>
          {d.deptName}
        </option>
      ))}
    </select>
  );
}

// Inline editor for current + entry semester, above the timeline table so the admin corrects it
// where the year-per-semester map is shown. Keyed on the student's sems in the parent so it
// re-inits after a save. Changing current semester widens/narrows the eligibility window and rows.
function SemesterEditor({ student, onSave, busy }) {
  const semOptions = [1, 2, 3, 4, 5, 6, 7, 8];
  const [current, setCurrent] = useState(String(student.currentSemester));
  const [entry, setEntry] = useState(String(student.entrySemester));

  const changed =
    Number(current) !== student.currentSemester || Number(entry) !== student.entrySemester;
  const invalid = Number(entry) > Number(current);

  return (
    <div className="rounded-xl border border-stroke bg-surface-muted p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.08em]">Current semester</label>
          <select
            className={`${inputClass} w-32`}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            data-cy="prog-current-sem"
          >
            {semOptions.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.08em]">Entry semester</label>
          <select
            className={`${inputClass} w-32`}
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            data-cy="prog-entry-sem"
          >
            {semOptions.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => onSave(Number(current), Number(entry))}
          disabled={busy || !changed || invalid}
          data-cy="prog-current-sem-save"
          className="rounded-md border border-stroke bg-surface-1 px-3 py-2 text-xs font-semibold transition-colors hover:border-primary disabled:opacity-50"
        >
          Save semester
        </button>
      </div>
      {invalid && (
        <p className="mt-2 text-xs text-red-600" data-cy="prog-sem-invalid">
          Entry semester cannot be after the current semester.
        </p>
      )}
      {changed && !invalid && (
        <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-amber-700">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> Changing the current semester changes
          which backlogs this student is eligible to register.
        </p>
      )}
    </div>
  );
}

export default ProgressionTab;
