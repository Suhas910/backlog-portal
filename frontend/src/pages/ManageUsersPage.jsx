import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  KeyRound,
  LoaderCircle,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getAdminHeaders } from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";

// Roles each actor is allowed to create. The server enforces the same rules;
// this only shapes the UI.
const CREATABLE_ROLES = {
  ADMIN: ["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE", "PROCTOR"],
  PRINCIPAL: ["HOD", "DEPT_OFFICE", "PROCTOR"],
  HOD: ["DEPT_OFFICE", "PROCTOR"],
};
const DEPT_ROLES = new Set(["HOD", "DEPT_OFFICE", "PROCTOR"]);
const ROLE_LABELS = {
  ADMIN: "Administrator",
  PRINCIPAL: "Principal / Registrar / COE",
  HOD: "Head of Department",
  DEPT_OFFICE: "Department Office",
  PROCTOR: "Proctor",
};

function ManageUsersPage() {
  const navigate = useNavigate();
  const adminRole = sessionStorage.getItem("adminRole") || "";
  const adminDepartment = sessionStorage.getItem("adminDepartment") || "";
  const creatableRoles = CREATABLE_ROLES[adminRole] || [];
  // HOD can only manage accounts in their own department — the server enforces
  // this; pinning the dropdown just keeps the UI honest about it.
  const deptLocked = adminRole === "HOD";

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState(creatableRoles[0] || "");
  const [newDeptId, setNewDeptId] = useState("");
  const [creating, setCreating] = useState(false);

  // One-time temp-password reveal + pending action state
  const [tempCredential, setTempCredential] = useState(null); // { username, tempPassword, label }
  const [busyUser, setBusyUser] = useState(""); // username currently being reset/deleted
  const [copied, setCopied] = useState(false);

  // Only ADMIN / PRINCIPAL / HOD may be here.
  useEffect(() => {
    if (!creatableRoles.length) {
      navigate("/admin");
    }
  }, [creatableRoles.length, navigate]);

  const loadUsers = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/users", { headers: getAdminHeaders() })
      .then((res) => setUsers(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Could not load users."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // NOTE: eslint react-hooks/set-state-in-effect flags this (loadUsers setStates
    // internally). Intended and correct — a fetch-on-mount into an external system;
    // state lands in the async .then/.finally. Left as a knowing lint error (not
    // disabled).
    loadUsers();
    api
      .get("/departments")
      .then((res) => setDepartments(res.data))
      .catch(() => {});
  }, [loadUsers]);

  // Pin the department to the HOD's own once departments are loaded.
  // NOTE: eslint react-hooks/set-state-in-effect flags the setNewDeptId below.
  // Intended and correct — this seeds an *editable* create-form field once the
  // async departments list arrives (the user can still change it when not
  // dept-locked, and it's reset after each create). That makes it initialization
  // of editable state, not pure derivation, so useMemo doesn't apply here. Left as
  // a knowing lint error (not disabled).
  useEffect(() => {
    if (deptLocked && adminDepartment && departments.length > 0) {
      const myDept = departments.find((d) => d.deptName === adminDepartment);
      if (myDept) {
        setNewDeptId(String(myDept.id));
      }
    }
  }, [departments, deptLocked, adminDepartment]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!newUsername.trim()) {
      setError("Username is required.");
      return;
    }
    if (DEPT_ROLES.has(newRole) && !newDeptId) {
      setError("Please select a department for this role.");
      return;
    }
    setCreating(true);
    try {
      const payload = { username: newUsername.trim(), role: newRole };
      if (DEPT_ROLES.has(newRole)) payload.departmentId = Number(newDeptId);
      const res = await api.post("/admin/users", payload, {
        headers: getAdminHeaders(),
      });
      setTempCredential({
        username: res.data.username,
        tempPassword: res.data.tempPassword,
        label: "Account created",
      });
      setNewUsername("");
      if (!deptLocked) setNewDeptId("");
      setNewRole(creatableRoles[0] || "");
      loadUsers();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not create user.");
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async (username) => {
    setError("");
    setBusyUser(username);
    try {
      const res = await api.post(
        `/admin/users/${encodeURIComponent(username)}/reset`,
        {},
        { headers: getAdminHeaders() },
      );
      setTempCredential({
        username: res.data.username,
        tempPassword: res.data.tempPassword,
        label: "Password reset",
      });
      loadUsers();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not reset password.");
    } finally {
      setBusyUser("");
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) {
      return;
    }
    setError("");
    setBusyUser(username);
    try {
      await api.delete(`/admin/users/${encodeURIComponent(username)}`, {
        headers: getAdminHeaders(),
      });
      loadUsers();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not delete user.");
    } finally {
      setBusyUser("");
    }
  };

  const copyTemp = () => {
    if (!tempCredential) return;
    navigator.clipboard?.writeText(tempCredential.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const inputClass =
    "w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]";

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-8 text-[var(--text-main)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl pb-24 md:pb-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] p-4 text-white shadow-soft sm:px-6">
          <BrandIdentity compact />
          <div className="flex gap-2">
            <Link
              to="/admin/change-password"
              className="inline-flex items-center gap-1 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <KeyRound size={15} className="mr-0.5" /> My Password
            </Link>
            <Link
              to="/admin"
              aria-label="Back to admin dashboard"
              className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft size={15} className="mr-1" /> Dashboard
            </Link>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-[var(--color-secondary)] sm:text-3xl">
              <Users size={26} /> Users
            </h1>
            <p className="text-sm text-[var(--text-main)]">
              Create, reset, and remove staff accounts you're authorised to
              manage.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* Create user */}
          <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-secondary)]">
              <UserPlus size={18} /> Create New User
            </h2>
            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="new-username"
                  className="text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  Username *
                </label>
                <input
                  id="new-username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., cse_office"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="new-role"
                  className="text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  Role *
                </label>
                <select
                  id="new-role"
                  value={newRole}
                  onChange={(e) => {
                    setNewRole(e.target.value);
                    if (!DEPT_ROLES.has(e.target.value) && !deptLocked) setNewDeptId("");
                  }}
                  className={inputClass}
                >
                  {creatableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="new-dept"
                  className="text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  Department {DEPT_ROLES.has(newRole) ? "*" : ""}
                </label>
                <select
                  id="new-dept"
                  value={newDeptId}
                  onChange={(e) => setNewDeptId(e.target.value)}
                  className={inputClass}
                  disabled={!DEPT_ROLES.has(newRole) || deptLocked}
                >
                  <option value="">
                    {DEPT_ROLES.has(newRole) ? "Select department" : "Not applicable"}
                  </option>
                  {(deptLocked
                    ? departments.filter((d) => d.deptName === adminDepartment)
                    : departments
                  ).map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.deptName}
                    </option>
                  ))}
                </select>
              </div>
              <MagneticCta
                type="submit"
                disabled={creating}
                className="w-full gap-2 rounded-xl"
                aria-label="Create user"
              >
                {creating ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <UserPlus size={16} />
                )}{" "}
                Create
              </MagneticCta>
            </form>
          </section>

          {/* User list */}
          <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-secondary)]">
              Existing Users
            </h2>

            {loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-muted)]">
                <LoaderCircle size={16} className="animate-spin" /> Loading
                users…
              </div>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                No users you can manage yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--stroke)] text-left text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      <th className="py-2.5 pr-4 font-semibold">Username</th>
                      <th className="py-2.5 pr-4 font-semibold">Role</th>
                      <th className="py-2.5 pr-4 font-semibold">Department</th>
                      <th className="py-2.5 pr-4 font-semibold">Status</th>
                      <th className="py-2.5 pr-4 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const busy = busyUser === u.username;
                      return (
                        <tr
                          key={u.username}
                          className="border-b border-[var(--stroke)] last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium text-[var(--text-main)]">
                            {u.username}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium">
                              {ROLE_LABELS[u.role] || u.role}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-[var(--text-muted)]">
                            {u.departmentName || "—"}
                          </td>
                          <td className="py-3 pr-4">
                            {u.mustChangePassword ? (
                              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                Pending first login
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-[rgba(145,25,28,0.08)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleReset(u.username)}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-main)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                              >
                                {busy ? (
                                  <LoaderCircle size={13} className="animate-spin" />
                                ) : (
                                  <KeyRound size={13} />
                                )}{" "}
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(u.username)}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </motion.div>
      </div>

      {/* One-time temp password modal */}
      {tempCredential && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 shadow-soft"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-secondary)]">
                {tempCredential.label}
              </h3>
              <button
                type="button"
                onClick={() => setTempCredential(null)}
                aria-label="Close"
                className="rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-sm text-[var(--text-main)]">
              Share this one-time password with{" "}
              <strong>{tempCredential.username}</strong>. It is shown{" "}
              <strong>only once</strong> and cannot be retrieved again. They'll
              be asked to set their own password on first login.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-3.5 py-3">
              <code className="flex-1 select-all font-mono text-base tracking-wide text-[var(--text-main)]">
                {tempCredential.tempPassword}
              </code>
              <button
                type="button"
                onClick={copyTemp}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-cta)] px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Copy size={13} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <MagneticCta
              onClick={() => setTempCredential(null)}
              className="mt-5 w-full rounded-xl"
              aria-label="Done"
            >
              Done
            </MagneticCta>
          </motion.div>
        </div>
      )}

      <MobileActionBar />
    </div>
  );
}

export default ManageUsersPage;
