import { useState, useCallback, useEffect } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import api, { getAdminHeaders } from "../../lib/api";
import { parseAcademicYear } from "../../lib/academicYear";
import { SemesterTimeline } from "./SemesterTimeline";

const inputClass =
  "w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";

const PAGE_SIZE = 25;

// Browse / edit / delete / reset-DOB the student roster. Presentational tab — the
// shell supplies departments + the dept-lock context.
function StudentsManageTab({ departments, adminDepartment, deptLocked, pinnedDeptId }) {
  const [fDeptId, setFDeptId] = useState("");
  const [fYear, setFYear] = useState("");
  const [fSemester, setFSemester] = useState("");
  const [fQuery, setFQuery] = useState("");

  const [students, setStudents] = useState(null); // null = not loaded yet
  // server-side pagination: mirrors the Spring Page envelope (0-based `number`)
  const [pageInfo, setPageInfo] = useState({ number: 0, totalPages: 0, totalElements: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const effectiveDeptId = deptLocked ? pinnedDeptId : fDeptId;

  // The endpoint is paginated: it returns a Page ({content, totalPages, ...}), never
  // a bare array. Loading the whole roster unfiltered previously timed the client
  // out; now each call pulls one page (default first). Filters reset to page 0.
  const load = useCallback(async (targetPage = 0) => {
    setError("");
    setBusy(true);
    try {
      const params = { page: targetPage, size: PAGE_SIZE };
      if (effectiveDeptId) params.deptId = Number(effectiveDeptId);
      if (fYear && /^\d{4}$/.test(fYear.trim())) params.admissionYear = Number(fYear.trim());
      if (fSemester) params.semester = Number(fSemester);
      if (fQuery.trim()) params.query = fQuery.trim();
      const res = await api.get("/admin/students", { headers: getAdminHeaders(), params });
      const data = res.data || {};
      setStudents(Array.isArray(data.content) ? data.content : []);
      setPageInfo({
        number: data.number ?? 0,
        totalPages: data.totalPages ?? 0,
        totalElements: data.totalElements ?? 0,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.code === "ECONNABORTED"
            ? "Loading timed out. Narrow the filters and try again."
            : "Could not load students."),
      );
    } finally {
      setBusy(false);
    }
  }, [effectiveDeptId, fYear, fSemester, fQuery]);

  const onUpdated = (updated) =>
    setStudents((prev) => prev.map((s) => (s.rollNo === updated.rollNo ? updated : s)));
  const onRemoved = (rollNo) =>
    setStudents((prev) => prev.filter((s) => s.rollNo !== rollNo));

  return (
    <>
      <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft sm:p-6">
        {deptLocked && adminDepartment && (
          <p className="mb-4 text-xs font-semibold text-[var(--color-primary)]">
            Scoped to {adminDepartment}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]">Department</label>
            <select
              className={inputClass}
              value={effectiveDeptId}
              onChange={(e) => setFDeptId(e.target.value)}
              disabled={deptLocked}
              data-cy="students-dept"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.deptName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]">Admission year</label>
            <input
              className={inputClass}
              type="text"
              placeholder="e.g. 2024"
              value={fYear}
              onChange={(e) => setFYear(e.target.value)}
              data-cy="students-year"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]">Semester</label>
            <select
              className={inputClass}
              value={fSemester}
              onChange={(e) => setFSemester(e.target.value)}
              data-cy="students-sem"
            >
              <option value="">All</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]">USN / name</label>
            <input
              className={inputClass}
              type="text"
              placeholder="search"
              value={fQuery}
              onChange={(e) => setFQuery(e.target.value)}
              data-cy="students-query"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert" data-cy="students-error">
            {error}
          </p>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => load(0)}
            disabled={busy}
            data-cy="students-load"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--color-primary)] disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Load students
          </button>
        </div>
      </section>

      {students && (
        <section className="mt-6 flex flex-col gap-3">
          {students.length === 0 ? (
            <p
              className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-3 text-sm"
              data-cy="students-empty"
            >
              No students match these filters.
            </p>
          ) : (
            <>
              {students.map((student) => (
                <StudentRow
                  key={student.rollNo}
                  student={student}
                  onUpdated={onUpdated}
                  onRemoved={onRemoved}
                />
              ))}
              {pageInfo.totalPages > 1 && (
                <Pager pageInfo={pageInfo} busy={busy} onGo={load} noun="students" />
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}

// Prev/next pager over a Spring Page envelope. `onGo(pageIndex)` re-fetches, keeping
// the current filters (the loader reads them from state).
function Pager({ pageInfo, busy, onGo, noun }) {
  const { number, totalPages, totalElements } = pageInfo;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-3 text-sm"
      data-cy={`${noun}-pager`}
    >
      <span className="text-[var(--text-muted)]">
        Page {number + 1} of {totalPages} · {totalElements} {noun}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onGo(number - 1)}
          disabled={busy || number <= 0}
          data-cy={`${noun}-prev`}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--color-primary)] disabled:opacity-40"
        >
          <ChevronLeft size={13} /> Prev
        </button>
        <button
          type="button"
          onClick={() => onGo(number + 1)}
          disabled={busy || number >= totalPages - 1}
          data-cy={`${noun}-next`}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--color-primary)] disabled:opacity-40"
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// Module scope so identity is stable across parent renders (keeps input focus).
function StudentRow({ student, onUpdated, onRemoved }) {
  const [mode, setMode] = useState("view"); // view | edit | dob
  const [showSems, setShowSems] = useState(false); // toggle the sem-year timeline
  const [name, setName] = useState(student.name || "");
  const [email, setEmail] = useState(student.email || "");
  const [phone, setPhone] = useState(student.phone || "");
  const [currentSemester, setCurrentSemester] = useState(String(student.currentSemester));
  const [entrySemester, setEntrySemester] = useState(String(student.entrySemester));
  const [dob, setDob] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const startEdit = () => {
    setName(student.name || "");
    setEmail(student.email || "");
    setPhone(student.phone || "");
    setCurrentSemester(String(student.currentSemester));
    setEntrySemester(String(student.entrySemester));
    setError("");
    setNotice("");
    setMode("edit");
  };

  const semesterChanged = Number(currentSemester) !== student.currentSemester;

  const save = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (Number(entrySemester) > Number(currentSemester)) {
      setError("Entry semester cannot be after the current semester.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.put(
        `/admin/students/${student.rollNo}`,
        {
          name: name.trim(),
          phone: phone.trim() || null,
          currentSemester: Number(currentSemester),
          entrySemester: Number(entrySemester),
        },
        { headers: getAdminHeaders() },
      );
      onUpdated(res.data);
      setMode("view");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const saveDob = async () => {
    if (!dob) {
      setError("Pick a date.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(
        `/admin/students/${student.rollNo}/reset-dob`,
        { dateOfBirth: dob },
        { headers: getAdminHeaders() },
      );
      setDob("");
      setMode("view");
      setNotice("Date of birth updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset date of birth.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${student.name} (${student.rollNo})?`)) return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`/admin/students/${student.rollNo}`, { headers: getAdminHeaders() });
      onRemoved(student.rollNo);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete.");
      setBusy(false);
    }
  };

  const card = "rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-4 shadow-soft";
  const semOptions = [1, 2, 3, 4, 5, 6, 7, 8];

  if (mode === "view") {
    return (
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-main)]">
              {student.name}{" "}
              <span className="font-mono text-xs text-[var(--text-muted)]">{student.rollNo}</span>
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {student.branch || "—"} · Sem {student.currentSemester}
              {student.entrySemester > 1 ? ` · entry sem ${student.entrySemester}` : ""}
              {student.email ? ` · ${student.email}` : ""}
              {student.phone ? ` · ${student.phone}` : ""}
            </p>
            {!student.progressionComplete && (
              <Link
                to="/admin/students?tab=progression"
                data-cy={`student-gap-${student.rollNo}`}
                className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                <AlertTriangle size={12} /> Progression incomplete
              </Link>
            )}
            {notice && <p className="mt-1.5 text-xs font-semibold text-[var(--color-primary)]">{notice}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowSems((v) => !v)}
              data-cy={`student-sems-${student.rollNo}`}
              aria-expanded={showSems}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                showSems
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-[var(--stroke)] hover:border-[var(--color-primary)]"
              }`}
            >
              <CalendarClock size={13} /> Semesters
            </button>
            <button
              type="button"
              onClick={startEdit}
              data-cy={`student-edit-${student.rollNo}`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--color-primary)]"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setDob("");
                setError("");
                setNotice("");
                setMode("dob");
              }}
              data-cy={`student-dob-${student.rollNo}`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--color-primary)]"
            >
              <KeyRound size={13} /> Reset DOB
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              data-cy={`student-delete-${student.rollNo}`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
            >
              {busy ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-600" role="alert" data-cy={`student-error-${student.rollNo}`}>
            {error}
          </p>
        )}
        {showSems && <StudentSemesters rollNo={student.rollNo} />}
      </div>
    );
  }

  if (mode === "dob") {
    return (
      <div className={card}>
        <p className="mb-2 text-sm font-semibold">
          Reset date of birth — {student.name} ({student.rollNo})
        </p>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          This is the student's login credential. The current value is never shown.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className={`${inputClass} max-w-xs`}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            data-cy={`student-dob-input-${student.rollNo}`}
          />
          <button
            type="button"
            onClick={saveDob}
            disabled={busy}
            data-cy={`student-dob-save-${student.rollNo}`}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm font-semibold transition-colors hover:border-[var(--color-primary)]"
          >
            <X size={14} /> Cancel
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  // edit mode
  return (
    <div className={card}>
      <p className="mb-3 text-sm font-semibold">
        Edit {student.rollNo}{" "}
        <span className="text-xs font-normal text-[var(--text-muted)]">
          (USN and DOB aren't editable here)
        </span>
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.08em]">Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} data-cy="student-edit-name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.08em]">
            Email <span className="font-normal normal-case text-[var(--text-muted)]">(auto, from USN)</span>
          </label>
          <input className={inputClass} value={email} readOnly tabIndex={-1} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.08em]">Phone</label>
          <input
            className={inputClass}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]">Current sem</label>
            <select
              className={inputClass}
              value={currentSemester}
              onChange={(e) => setCurrentSemester(e.target.value)}
              data-cy="student-edit-current-sem"
            >
              {semOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]">Entry sem</label>
            <select
              className={inputClass}
              value={entrySemester}
              onChange={(e) => setEntrySemester(e.target.value)}
              data-cy="student-edit-entry-sem"
            >
              {semOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {semesterChanged && (
        <p className="mt-3 inline-flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Changing the current semester changes
          which backlogs this student is eligible to register.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert" data-cy="student-edit-error">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          data-cy="student-save"
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
        <button
          type="button"
          onClick={() => setMode("view")}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm font-semibold transition-colors hover:border-[var(--color-primary)]"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

// Per-student sem-year timeline, loaded on demand under a student's card. Same view
// + edit as the Progression tab (shared SemesterTimeline), so an admin can correct a
// student's academic-year mapping (e.g. after a year-back) right from Manage Students.
// Current/entry semester stay editable in the row's Edit form and on the Progression
// page; this panel is only the per-semester academic years.
function StudentSemesters({ rollNo }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // NOTE: eslint react-hooks/set-state-in-effect flags the setBusy/setError below.
  // Intended and correct — leading busy/error reset for an API fetch, exactly the
  // "synchronize with an external system" case the rule carves out. Left as a
  // knowing lint error (not disabled).
  useEffect(() => {
    let ignore = false;
    setBusy(true);
    setError("");
    api
      .get(`/admin/progression/${rollNo}`, { headers: getAdminHeaders() })
      .then((res) => {
        if (!ignore) setData(res.data);
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || "Could not load semesters.");
      })
      .finally(() => {
        if (!ignore) setBusy(false);
      });
    return () => {
      ignore = true;
    };
  }, [rollNo]);

  const saveYear = async (semester, yearStr) => {
    const parsed = parseAcademicYear(yearStr);
    if (Number.isNaN(parsed)) {
      setError("Enter the academic year as a range or start year, e.g. 2024-25.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.put(
        `/admin/progression/${rollNo}/semester/${semester}`,
        { academicYear: parsed },
        { headers: getAdminHeaders() },
      );
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 border-t border-[var(--stroke)] pt-3" data-cy={`student-sems-panel-${rollNo}`}>
      <p className="mb-2 text-xs text-[var(--text-muted)]">
        Academic year the student studied each semester (entry through 8). Blank rows aren't set yet;
        semesters past the current one are muted but still editable.
      </p>
      {busy && !data ? (
        <p className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <LoaderCircle size={15} className="animate-spin" /> Loading semesters…
        </p>
      ) : data ? (
        <SemesterTimeline student={data} onSaveYear={saveYear} busy={busy} />
      ) : null}
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default StudentsManageTab;
