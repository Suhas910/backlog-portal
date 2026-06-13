import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarRange,
  CircleDashed,
  Download,
  GraduationCap,
  History,
  LoaderCircle,
  LogOut,
  PlusCircle,
  Shield,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getAdminHeaders } from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";

function AdminPage() {
  const adminRole = sessionStorage.getItem("adminRole") || "";
  const adminDepartment = sessionStorage.getItem("adminDepartment") || "";
  const navigate = useNavigate();
  const isAdmin = ["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE"].includes(
    adminRole,
  );
  const adminToken = sessionStorage.getItem("adminToken");
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(
    ["HOD", "DEPT_OFFICE"].includes(adminRole) ? "SUBMITTED" : "ALL",
  );
  const [verifyingRegId, setVerifyingRegId] = useState("");
  const [rejectingRegId, setRejectingRegId] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Filter states
  const [allSubjects, setAllSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [examCycles, setExamCycles] = useState([]);
  const [cycleFilter, setCycleFilter] = useState("");

  // Audit history modal
  const [historyRegId, setHistoryRegId] = useState("");
  const [historyEvents, setHistoryEvents] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin || !adminToken) {
      return;
    }

    setLoadingSubjects(true);
    const subjectParams = new URLSearchParams();
    if (typeFilter) subjectParams.append("subjectType", typeFilter);
    if (searchFilter) subjectParams.append("searchQuery", searchFilter);
    if (startDateFilter) subjectParams.append("startDate", startDateFilter);
    if (endDateFilter) subjectParams.append("endDate", endDateFilter);

    api
      .get(`/admin/subjects-for-filter?${subjectParams.toString()}`, {
        headers: getAdminHeaders(),
      })
      .then((res) => {
        setAllSubjects(res.data);
        if (
          subjectFilter &&
          !res.data.some((s) => String(s.id) === subjectFilter)
        ) {
          setSubjectFilter("");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch subjects list for filter", err);
        setAllSubjects([]);
      })
      .finally(() => {
        setLoadingSubjects(false);
      });
  }, [isAdmin, adminToken, typeFilter, searchFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    if (!isAdmin || !adminToken) return;
    api
      .get("/admin/exam-cycles", { headers: getAdminHeaders() })
      .then((res) => setExamCycles(res.data))
      .catch((err) => {
        console.error("Failed to fetch exam cycles", err);
        setExamCycles([]);
      });
  }, [isAdmin, adminToken]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (subjectFilter) params.append("subjectId", subjectFilter);
    if (typeFilter) params.append("subjectType", typeFilter);
    if (searchFilter) params.append("searchQuery", searchFilter);
    if (startDateFilter) params.append("startDate", startDateFilter);
    if (endDateFilter) params.append("endDate", endDateFilter);
    if (cycleFilter) params.append("examCycleId", cycleFilter);

    api
      .get(`/admin/registrations?${params.toString()}`, {
        headers: getAdminHeaders(),
      })
      .then((res) => {
        setRegistrations(res.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch dashboard data:", error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          sessionStorage.removeItem("adminRole");
          sessionStorage.removeItem("adminToken");
          navigate("/admin/login");
        }
      });
  }, [
    isAdmin,
    adminToken,
    navigate,
    subjectFilter,
    typeFilter,
    searchFilter,
    startDateFilter,
    endDateFilter,
    cycleFilter,
  ]);

  const handleVerify = async (regId) => {
    setVerifyingRegId(regId);
    try {
      await api.put(
        `/register/verify/${regId}`,
        { action: "VERIFIED" },
        { headers: getAdminHeaders() },
      );
      const adminUsername = sessionStorage.getItem("adminUsername") || "";
      setRegistrations((current) =>
        current.map((reg) =>
          reg.regId === regId
            ? { ...reg, status: "VERIFIED", verifiedBy: adminUsername }
            : reg,
        ),
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to verify. Please refresh and try again.");
    } finally {
      setVerifyingRegId("");
    }
  };

  const handleReject = async (regId) => {
    setRejectingRegId(regId);
    try {
      await api.put(
        `/register/verify/${regId}`,
        { action: "REJECTED" },
        { headers: getAdminHeaders() },
      );
      const adminUsername = sessionStorage.getItem("adminUsername") || "";
      setRegistrations((current) =>
        current.map((reg) =>
          reg.regId === regId
            ? { ...reg, status: "REJECTED", verifiedBy: adminUsername }
            : reg,
        ),
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to reject. Please refresh and try again.");
    } finally {
      setRejectingRegId("");
    }
  };

  const openHistory = async (regId) => {
    setHistoryRegId(regId);
    setHistoryEvents([]);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/admin/registrations/${regId}/events`, {
        headers: getAdminHeaders(),
      });
      setHistoryEvents(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExportPdf = () => {
    setIsExporting(true);
    const params = new URLSearchParams();
    if (subjectFilter) params.append("subjectId", subjectFilter);
    if (typeFilter) params.append("subjectType", typeFilter);
    if (searchFilter) params.append("searchQuery", searchFilter);
    if (startDateFilter) params.append("startDate", startDateFilter);
    if (endDateFilter) params.append("endDate", endDateFilter);
    if (cycleFilter) params.append("examCycleId", cycleFilter);

    api
      .get(`/admin/export-pdf?${params.toString()}`, {
        headers: getAdminHeaders(),
        responseType: "blob", // Important parameter for file downloads
      })
      .then((res) => {
        // A 200 that isn't a PDF (e.g. an HTML error page) must not be
        // saved to disk as a .pdf
        const contentType = res.headers["content-type"] || "";
        if (!contentType.includes("application/pdf")) {
          throw new Error(`Unexpected export content type: ${contentType}`);
        }
        const url = window.URL.createObjectURL(
          new Blob([res.data], { type: "application/pdf" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `registrations-summary-${Date.now()}.pdf`,
        );
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error("Failed to export PDF", err);
        alert("Failed to export PDF. Please try again.");
      })
      .finally(() => {
        setIsExporting(false);
      });
  };

  const filtered =
    filter === "ALL"
      ? registrations
      : registrations.filter((r) => r.status === filter);

  const totalCount = registrations.length;
  const pendingCount = registrations.filter(
    (r) => r.status === "SUBMITTED",
  ).length;
  const verifiedCount = registrations.filter(
    (r) => r.status === "VERIFIED",
  ).length;
  const rejectedCount = registrations.filter(
    (r) => r.status === "REJECTED",
  ).length;

  if (!isAdmin || !adminToken) {
    return (
      <div className="min-h-screen bg-[var(--surface-1)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-8 text-center shadow-soft">
          <h1 className="mb-2 text-3xl font-semibold text-[var(--color-secondary)]">
            Access Denied
          </h1>
          <p className="mb-5 text-[var(--text-main)]">
            You must login as an admin to view this page.
          </p>
          <Link
            to="/admin/login"
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-cta)] px-5 py-3 text-sm font-semibold text-white"
          >
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-8 text-[var(--text-main)] sm:px-6 lg:px-8">
      <a
        href="#admin-main"
        className="sr-only left-4 top-4 z-[60] rounded-md bg-[var(--color-cta)] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed"
      >
        Skip to admin table
      </a>

      <div id="admin-main" className="mx-auto w-full max-w-7xl pb-24 md:pb-0">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] px-4 py-4 text-white shadow-soft sm:px-6">
          <div>
            <BrandIdentity compact />
            <div className="mt-2 flex flex-wrap gap-2">
              <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                Admin Control Panel
              </p>
              {adminDepartment && (
                <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                  {adminDepartment}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin/exam-cycles"
              className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
            >
              <CalendarRange size={14} /> Exam Cycles
            </Link>
            {(adminRole === "DEPT_OFFICE" || adminRole === "ADMIN") && (
              <Link
                to="/admin/add-subject"
                className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
              >
                <PlusCircle size={14} /> Add Subject
              </Link>
            )}
            {(adminRole === "ADMIN" || adminRole === "PRINCIPAL") && (
              <Link
                to="/admin/departments"
                className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
              >
                <Building2 size={14} /> Departments
              </Link>
            )}
            {["ADMIN", "PRINCIPAL", "HOD"].includes(adminRole) && (
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
              >
                <Users size={14} /> Manage Users
              </Link>
            )}
            {["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE"].includes(adminRole) && (
              <Link
                to="/admin/progression"
                className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
              >
                <GraduationCap size={14} /> Progression
              </Link>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-1 rounded-full border border-white/35 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft size={14} /> Home
            </Link>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("adminRole");
                sessionStorage.removeItem("adminToken");
                sessionStorage.removeItem("adminUsername");
                sessionStorage.removeItem("adminDepartment");
                navigate("/admin/login");
              }}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-cta)] px-4 py-2 text-sm font-semibold text-white"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-4 shadow-soft">
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-main)]">
              <Users size={13} /> Total
            </p>
            <p className="mt-1 text-3xl font-semibold text-[var(--color-secondary)]">
              {totalCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-4 shadow-soft">
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-main)]">
              <CircleDashed size={13} /> Pending
            </p>
            <p className="mt-1 text-3xl font-semibold text-[var(--color-secondary)]">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-4 shadow-soft">
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-main)]">
              <Shield size={13} /> Verified
            </p>
            <p className="mt-1 text-3xl font-semibold text-[var(--color-secondary)]">
              {verifiedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-4 shadow-soft">
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-main)]">
              <XCircle size={13} /> Rejected
            </p>
            <p className="mt-1 text-3xl font-semibold text-red-600">
              {rejectedCount}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-4 shadow-soft">
          <h3 className="mb-3 text-lg font-semibold text-[var(--color-secondary)]">
            Filters
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Exam Cycle Filter */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="cycle-filter"
                className="text-xs font-semibold uppercase tracking-[0.08em]"
              >
                Exam Cycle
              </label>
              <select
                id="cycle-filter"
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <option value="">All Cycles</option>
                {examCycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.active ? " (active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Type Filter */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="type-filter"
                className="text-xs font-semibold uppercase tracking-[0.08em]"
              >
                Subject Type
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setSubjectFilter("");
                }}
                className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <option value="">All Types</option>
                <option value="REGULAR">Regular</option>
                <option value="ELECTIVE">Elective</option>
              </select>
            </div>

            {/* Subject Filter */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="subject-filter"
                className="text-xs font-semibold uppercase tracking-[0.08em]"
              >
                Filter by Subject
              </label>
              <select
                id="subject-filter"
                value={subjectFilter}
                onChange={(e) => {
                  const id = e.target.value;
                  setSubjectFilter(id);
                  if (id) {
                    const subject = allSubjects.find(
                      (s) => String(s.id) === id,
                    );
                    if (subject) setTypeFilter(subject.subjectType);
                  }
                }}
                className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                disabled={loadingSubjects}
              >
                <option value="">
                  {loadingSubjects ? "Loading..." : "All Subjects"}
                </option>
                {allSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjectName} ({s.courseCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Filter */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="search-filter"
                className="text-xs font-semibold uppercase tracking-[0.08em]"
              >
                Search by USN / Name
              </label>
              <input
                id="search-filter"
                type="text"
                placeholder="Enter USN or name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>

            {/* Date Filters */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="start-date-filter"
                className="text-xs font-semibold uppercase tracking-[0.08em]"
              >
                Start Date
              </label>
              <input
                id="start-date-filter"
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="end-date-filter"
                className="text-xs font-semibold uppercase tracking-[0.08em]"
              >
                End Date
              </label>
              <input
                id="end-date-filter"
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-4 shadow-soft sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {["ALL", "SUBMITTED", "VERIFIED", "REJECTED"].map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.06em] transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)] ${
                    filter === f
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--stroke)] bg-[var(--surface-1)] text-[var(--color-secondary)]"
                  }`}
                  data-cy={`admin-filter-${f.toLowerCase()}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-secondary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary)] disabled:opacity-50"
            >
              {isExporting ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Export PDF
            </button>
          </div>

          {loading ? (
            <p className="inline-flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
              <LoaderCircle size={16} className="animate-spin" /> Loading
              registrations...
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)]">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[var(--surface-muted)] text-xs uppercase tracking-[0.08em] text-[var(--text-main)]">
                    <th className="px-4 py-3">USN</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Semester</th>
                    <th className="px-4 py-3">Cycle</th>
                    <th className="px-4 py-3">Subjects</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Verified By</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">History</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg) => (
                    <motion.tr
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={reg.regId}
                      className="border-t border-[var(--stroke)] align-top"
                    >
                      <td className="px-4 py-3 text-[var(--text-main)]">
                        {reg.rollNo}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-main)]">
                        {reg.studentName}
                      </td>
                      <td className="px-4 py-3">{reg.semester}</td>
                      <td className="px-4 py-3">
                        {reg.examCycle ? (
                          <span className="text-xs text-[var(--text-main)]">
                            {reg.examCycle}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{reg.subjects.join(", ")}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            reg.status === "VERIFIED"
                              ? "bg-[rgba(145,25,28,0.1)] text-[var(--color-primary)]"
                              : reg.status === "REJECTED"
                                ? "bg-red-50 text-red-600"
                                : "bg-[var(--surface-muted)] text-[var(--color-secondary)]"
                          }`}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(reg.registeredAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {reg.verifiedBy ? (
                          <span className="text-xs text-[var(--text-main)]">
                            {reg.verifiedBy}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {reg.status === "SUBMITTED" && adminRole !== "PRINCIPAL" ? (
                          <div className="flex gap-1.5">
                            <MagneticCta
                              onClick={() => handleVerify(reg.regId)}
                              className="rounded-lg px-3 py-1.5 text-xs"
                              disabled={verifyingRegId === reg.regId || rejectingRegId === reg.regId}
                              data-cy="admin-verify"
                            >
                              {verifyingRegId === reg.regId ? (
                                <LoaderCircle size={14} className="animate-spin" />
                              ) : (
                                <BadgeCheck size={14} />
                              )}
                              Verify
                            </MagneticCta>
                            <button
                              type="button"
                              onClick={() => handleReject(reg.regId)}
                              disabled={rejectingRegId === reg.regId || verifyingRegId === reg.regId}
                              data-cy="admin-reject"
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                              {rejectingRegId === reg.regId ? (
                                <LoaderCircle size={14} className="animate-spin" />
                              ) : (
                                <XCircle size={14} />
                              )}
                              Reject
                            </button>
                          </div>
                        ) : reg.status === "VERIFIED" ? (
                          <span className="text-xs font-semibold text-[var(--color-primary)]">
                            Verified
                          </span>
                        ) : reg.status === "REJECTED" ? (
                          <span className="text-xs font-semibold text-red-600">
                            Rejected
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-[var(--text-muted)]">
                            Pending Verification
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openHistory(reg.regId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-semibold text-[var(--color-secondary)] transition-colors hover:bg-[var(--surface-muted)]"
                        >
                          <History size={14} /> View
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {historyRegId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setHistoryRegId("")}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-[var(--color-secondary)]">
                <History size={18} /> Registration History
              </h3>
              <button
                type="button"
                onClick={() => setHistoryRegId("")}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)]"
                aria-label="Close history"
              >
                <X size={18} />
              </button>
            </div>

            {historyLoading ? (
              <p className="inline-flex items-center gap-2 text-sm text-[var(--text-main)]">
                <LoaderCircle size={16} className="animate-spin" /> Loading history...
              </p>
            ) : historyEvents.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No history recorded for this registration.
              </p>
            ) : (
              <ol className="space-y-3">
                {historyEvents.map((ev, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-3 py-2.5"
                  >
                    <span
                      className={`mt-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        ev.action === "VERIFIED"
                          ? "bg-[rgba(145,25,28,0.1)] text-[var(--color-primary)]"
                          : ev.action === "REJECTED"
                            ? "bg-red-50 text-red-600"
                            : "bg-[var(--surface-1)] text-[var(--color-secondary)]"
                      }`}
                    >
                      {ev.action}
                    </span>
                    <div className="text-sm">
                      <p className="text-[var(--text-main)]">
                        {ev.actor || "unknown"}
                        <span className="text-[var(--text-muted)]">
                          {" "}
                          ({ev.actorRole})
                        </span>
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {ev.timestamp
                          ? new Date(ev.timestamp).toLocaleString()
                          : ""}
                      </p>
                      {ev.note && (
                        <p className="mt-1 text-xs text-[var(--text-main)]">
                          {ev.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      <MobileActionBar />
    </div>
  );
}

export default AdminPage;
