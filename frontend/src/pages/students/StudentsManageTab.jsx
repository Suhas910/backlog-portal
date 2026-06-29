import { useState, useCallback } from "react";
import {
  AlertTriangle,
  Check,
  KeyRound,
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import api, { getAdminHeaders } from "../../lib/api";

const inputClass =
  "w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";

// Browse / edit / delete / reset-DOB the student roster. Presentational tab — the
// shell supplies departments + the dept-lock context.
function StudentsManageTab({ departments, adminDepartment, deptLocked, pinnedDeptId }) {
  const [fDeptId, setFDeptId] = useState("");
  const [fYear, setFYear] = useState("");
  const [fSemester, setFSemester] = useState("");
  const [fQuery, setFQuery] = useState("");

  const [students, setStudents] = useState(null); // null = not loaded yet
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const effectiveDeptId = deptLocked ? pinnedDeptId : fDeptId;

  const load = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const params = {};
      if (effectiveDeptId) params.deptId = Number(effectiveDeptId);
      if (fYear && /^\d{4}$/.test(fYear.trim())) params.admissionYear = Number(fYear.trim());
      if (fSemester) params.semester = Number(fSemester);
      if (fQuery.trim()) params.query = fQuery.trim();
      const res = await api.get("/admin/students", { headers: getAdminHeaders(), params });
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load students.");
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
            onClick={load}
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
            students.map((student) => (
              <StudentRow
                key={student.rollNo}
                student={student}
                onUpdated={onUpdated}
                onRemoved={onRemoved}
              />
            ))
          )}
        </section>
      )}
    </>
  );
}

// Module scope so identity is stable across parent renders (keeps input focus).
function StudentRow({ student, onUpdated, onRemoved }) {
  const [mode, setMode] = useState("view"); // view | edit | dob
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
                to="/admin/progression"
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

export default StudentsManageTab;
