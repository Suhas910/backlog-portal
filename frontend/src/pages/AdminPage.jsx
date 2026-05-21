import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  CircleDashed,
  Download,
  LoaderCircle,
  LogOut,
  PlusCircle,
  Shield,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getAdminHeaders } from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";

function AdminPage() {
  const adminRole = sessionStorage.getItem("adminRole") || "";
  const navigate = useNavigate();
  const isAdmin = ["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE"].includes(
    adminRole,
  );
  const adminToken = sessionStorage.getItem("adminToken");
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [verifyingRegId, setVerifyingRegId] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // New filter states
  const [allSubjects, setAllSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  useEffect(() => {
    if (!isAdmin || !adminToken) {
      return;
    }

    setLoadingSubjects(true);
    const subjectParams = new URLSearchParams();
    if (searchFilter) subjectParams.append("searchQuery", searchFilter);
    if (startDateFilter) subjectParams.append("startDate", startDateFilter);
    if (endDateFilter) subjectParams.append("endDate", endDateFilter);

    api
      .get(`/admin/subjects-for-filter?${subjectParams.toString()}`, {
        headers: getAdminHeaders(),
      })
      .then((res) => {
        setAllSubjects(res.data);
        // If the currently selected subject filter is no longer in the new list, reset it.
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
  }, [isAdmin, adminToken, searchFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (subjectFilter) params.append("subjectId", subjectFilter);
    if (searchFilter) params.append("searchQuery", searchFilter);
    if (startDateFilter) params.append("startDate", startDateFilter);
    if (endDateFilter) params.append("endDate", endDateFilter);

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
    searchFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const handleVerify = async (regId) => {
    setVerifyingRegId(regId);
    try {
      await api.put(
        `/register/verify/${regId}`,
        {},
        { headers: getAdminHeaders() },
      );
      setRegistrations((current) =>
        current.map((reg) =>
          reg.regId === regId ? { ...reg, status: "VERIFIED" } : reg,
        ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyingRegId("");
    }
  };

  const handleExportPdf = () => {
    setIsExporting(true);
    const params = new URLSearchParams();
    if (subjectFilter) params.append("subjectId", subjectFilter);
    if (searchFilter) params.append("searchQuery", searchFilter);
    if (startDateFilter) params.append("startDate", startDateFilter);
    if (endDateFilter) params.append("endDate", endDateFilter);

    api
      .get(`/admin/export-pdf?${params.toString()}`, {
        headers: getAdminHeaders(),
        responseType: "blob", // Important parameter for file downloads
      })
      .then((res) => {
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
            <p className="mt-2 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              Admin Control Panel
            </p>
          </div>
          <div className="flex gap-2">
            {adminRole === "DEPT_OFFICE" && (
              <Link
                to="/admin/add-subject"
                className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
              >
                <PlusCircle size={14} /> Add Subject
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
                navigate("/admin/login");
              }}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-cta)] px-4 py-2 text-sm font-semibold text-white"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        </section>

        <section className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-4 shadow-soft">
          <h3 className="mb-3 text-lg font-semibold text-[var(--color-secondary)]">
            Filters
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                onChange={(e) => setSubjectFilter(e.target.value)}
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
              {["ALL", "SUBMITTED", "VERIFIED"].map((f) => (
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
                    <th className="px-4 py-3">Subjects</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Action</th>
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
                      <td className="px-4 py-3">{reg.subjects.join(", ")}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            reg.status === "VERIFIED"
                              ? "bg-[rgba(145,25,28,0.1)] text-[var(--color-primary)]"
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
                        {reg.status === "SUBMITTED" ? (
                          <MagneticCta
                            onClick={() => handleVerify(reg.regId)}
                            className="rounded-lg px-3 py-1.5 text-xs"
                            disabled={verifyingRegId === reg.regId}
                            data-cy="admin-verify"
                          >
                            {verifyingRegId === reg.regId ? (
                              <LoaderCircle
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <BadgeCheck size={14} />
                            )}
                            Verify
                          </MagneticCta>
                        ) : (
                          <span className="text-xs font-semibold text-[var(--color-primary)]">
                            Verified
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <MobileActionBar />
    </div>
  );
}

export default AdminPage;
