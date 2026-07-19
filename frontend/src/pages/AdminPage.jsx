import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarRange,
  CircleDashed,
  Download,
  History,
  IdCard,
  LoaderCircle,
  LogOut,
  Search,
  Shield,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import ThemeToggle from "../components/ui/ThemeToggle";
import api, { getAdminHeaders, clearAdminSession, logoutAdmin } from "../lib/api";
import MobileActionBar from "../components/layout/MobileActionBar";

const PAGE_SIZE = 25;

function AdminPage() {
  const adminRole = sessionStorage.getItem("adminRole") || "";
  const adminDepartment = sessionStorage.getItem("adminDepartment") || "";
  const navigate = useNavigate();
  const isAdmin = ["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE", "PROCTOR"].includes(
    adminRole,
  );
  const adminToken = sessionStorage.getItem("adminToken");
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(
    ["HOD", "DEPT_OFFICE", "PROCTOR"].includes(adminRole) ? "SUBMITTED" : "ALL",
  );
  // server-side pagination: `page` is 0-based; pageInfo mirrors the Spring Page envelope
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0, number: 0 });
  // stat-card counts come from the server (summary-counts) so they reflect the whole
  // filtered set, not just the loaded page
  const [counts, setCounts] = useState({ total: 0, submitted: 0, verified: 0, rejected: 0 });
  const [verifyingRegId, setVerifyingRegId] = useState("");
  const [rejectingRegId, setRejectingRegId] = useState("");
  // two-step arm→confirm for rejecting an already-VERIFIED registration
  const [confirmRejectVerifiedId, setConfirmRejectVerifiedId] = useState("");
  const [rowErrors, setRowErrors] = useState({});
  const [isExporting, setIsExporting] = useState(false);

  // Filter states
  const [allSubjects, setAllSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  // searchInput is the raw text box value (updates per keystroke); searchFilter
  // is the debounced value the fetches actually key off, so typing fires one
  // request pair after the user pauses rather than one per keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [examCycles, setExamCycles] = useState([]);
  const [cycleFilter, setCycleFilter] = useState("");

  // The above filter states are the DRAFT (what the user is editing). The
  // registrations fetch keys off appliedFilters instead, so the table only
  // updates when the user clicks Apply — never mid-edit on a half-built combo.
  const [appliedFilters, setAppliedFilters] = useState({
    subjectId: "",
    subjectType: "",
    searchQuery: "",
    startDate: "",
    endDate: "",
    examCycleId: "",
  });

  // Audit history modal
  const [historyRegId, setHistoryRegId] = useState("");
  const [historyEvents, setHistoryEvents] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Monotonic counter shared by every registrations fetch (filter effect AND the
  // imperative post-action resync). Each call captures the next value and only
  // applies its response if still the latest — so out-of-order completions from
  // rapid filter changes are dropped instead of clobbering the table.
  const registrationsReqRef = useRef(0);
  // In-flight controllers: each new fetch aborts its predecessor (whose response
  // the seq guard would drop anyway), freeing the backend connection early.
  const registrationsAbortRef = useRef(null);
  const countsAbortRef = useRef(null);

  // Debounce the free-text search: push searchInput into searchFilter (the value
  // the effects depend on) only after the user pauses typing.
  useEffect(() => {
    const t = setTimeout(() => setSearchFilter(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!isAdmin || !adminToken) {
      return;
    }

    // ignore guards against a stale response landing after a newer filter change;
    // the AbortController goes further and cancels the superseded request itself,
    // so it stops consuming a backend connection instead of running to completion
    let ignore = false;
    const controller = new AbortController();
    // NOTE: eslint react-hooks/set-state-in-effect flags this setState. Intended
    // and correct — a leading loading flag for an API fetch, exactly the
    // "synchronize with an external system" case the rule carves out. Left as a
    // knowing lint error (not disabled).
    setLoadingSubjects(true);
    const subjectParams = new URLSearchParams();
    if (typeFilter) subjectParams.append("subjectType", typeFilter);
    if (searchFilter) subjectParams.append("searchQuery", searchFilter);
    if (startDateFilter) subjectParams.append("startDate", startDateFilter);
    if (endDateFilter) subjectParams.append("endDate", endDateFilter);

    api
      .get(`/admin/subjects-for-filter?${subjectParams.toString()}`, {
        headers: getAdminHeaders(),
        signal: controller.signal,
      })
      .then((res) => {
        if (ignore) return;
        // narrow the dropdown options live, but never auto-clear the user's
        // current selection — applying a now-unlisted subject just yields no rows
        setAllSubjects(res.data);
      })
      .catch((err) => {
        if (ignore || err.code === "ERR_CANCELED") return;
        console.error("Failed to fetch subjects list for filter", err);
        setAllSubjects([]);
      })
      .finally(() => {
        if (!ignore) setLoadingSubjects(false);
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [isAdmin, adminToken, typeFilter, searchFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    if (!isAdmin || !adminToken) return;
    let ignore = false;
    const controller = new AbortController();
    api
      .get("/admin/exam-cycles", { headers: getAdminHeaders(), signal: controller.signal })
      .then((res) => {
        if (ignore) return;
        setExamCycles(res.data);
        // default the filter to the active cycle so the list + PDF export both
        // scope to it; "All Cycles" stays an explicit opt-in.
        const active = Array.isArray(res.data) ? res.data.find((c) => c.active) : null;
        if (active) {
          // seed both draft and applied so the page auto-loads the active cycle
          setCycleFilter(String(active.id));
          setAppliedFilters((prev) => ({ ...prev, examCycleId: String(active.id) }));
        }
      })
      .catch((err) => {
        if (ignore || err.code === "ERR_CANCELED") return;
        console.error("Failed to fetch exam cycles", err);
        setExamCycles([]);
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [isAdmin, adminToken]);

  // shared filter params (everything except status/page) for both the list and
  // the counts endpoint, so the cards and the table stay on the same filtered set
  const appendFilterParams = useCallback((params) => {
    if (appliedFilters.subjectId) params.append("subjectId", appliedFilters.subjectId);
    if (appliedFilters.subjectType) params.append("subjectType", appliedFilters.subjectType);
    if (appliedFilters.searchQuery) params.append("searchQuery", appliedFilters.searchQuery);
    if (appliedFilters.startDate) params.append("startDate", appliedFilters.startDate);
    if (appliedFilters.endDate) params.append("endDate", appliedFilters.endDate);
    if (appliedFilters.examCycleId) params.append("examCycleId", appliedFilters.examCycleId);
  }, [appliedFilters]);

  const fetchRegistrations = useCallback(() => {
    if (!isAdmin || !adminToken) return Promise.resolve();
    // tag this request; only the latest one is allowed to apply its result
    const seq = ++registrationsReqRef.current;
    registrationsAbortRef.current?.abort();
    const controller = new AbortController();
    registrationsAbortRef.current = controller;
    const params = new URLSearchParams();
    appendFilterParams(params);
    // status filtering is now server-side (a page only holds part of the result)
    if (filter !== "ALL") params.append("status", filter);
    params.append("page", String(page));
    params.append("size", String(PAGE_SIZE));

    return api
      .get(`/admin/registrations?${params.toString()}`, {
        headers: getAdminHeaders(),
        signal: controller.signal,
      })
      .then((res) => {
        if (seq !== registrationsReqRef.current) return; // superseded
        setRegistrations(res.data.content || []);
        setPageInfo({
          totalPages: res.data.totalPages ?? 0,
          totalElements: res.data.totalElements ?? 0,
          number: res.data.number ?? 0,
        });
        setLoading(false);
      })
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return; // superseded request aborted
        console.error("Failed to fetch dashboard data:", error);
        // An auth failure invalidates the session regardless of ordering, so the
        // redirect is not gated on seq; only the success state-write is.
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearAdminSession();
          navigate("/admin/login");
        }
      });
  }, [navigate, isAdmin, adminToken, appendFilterParams, filter, page]);

  const fetchCounts = useCallback(() => {
    if (!isAdmin || !adminToken) return Promise.resolve();
    countsAbortRef.current?.abort();
    const controller = new AbortController();
    countsAbortRef.current = controller;
    const params = new URLSearchParams();
    appendFilterParams(params); // no status: cards span all statuses of the filtered set
    return api
      .get(`/admin/registrations/summary-counts?${params.toString()}`, {
        headers: getAdminHeaders(),
        signal: controller.signal,
      })
      .then((res) => setCounts(res.data))
      .catch((err) => {
        if (err.code === "ERR_CANCELED") return; // superseded request aborted
        console.error("Failed to fetch summary counts", err);
      });
  }, [isAdmin, adminToken, appendFilterParams]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // leaving the page cancels whatever is still in flight
  useEffect(
    () => () => {
      registrationsAbortRef.current?.abort();
      countsAbortRef.current?.abort();
    },
    [],
  );

  // ---- filter apply / clear (draft -> applied) ----
  const draftFilters = {
    subjectId: subjectFilter,
    subjectType: typeFilter,
    searchQuery: searchInput,
    startDate: startDateFilter,
    endDate: endDateFilter,
    examCycleId: cycleFilter,
  };
  const filtersDirty =
    JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);

  const applyFilters = () => {
    setPage(0); // a new filter set always starts from the first page
    setAppliedFilters(draftFilters);
  };

  const clearFilters = () => {
    // reset to defaults: the active cycle (the page's default scope), no other filters
    const activeId = examCycles.find((c) => c.active)?.id;
    const cyc = activeId != null ? String(activeId) : "";
    setSubjectFilter("");
    setTypeFilter("");
    setSearchInput("");
    setStartDateFilter("");
    setEndDateFilter("");
    setCycleFilter(cyc);
    setPage(0);
    setAppliedFilters({
      subjectId: "",
      subjectType: "",
      searchQuery: "",
      startDate: "",
      endDate: "",
      examCycleId: cyc,
    });
  };

  const clearRowError = (regId) =>
    setRowErrors((prev) => {
      if (!prev[regId]) return prev;
      const next = { ...prev };
      delete next[regId];
      return next;
    });

  // Verify/reject failures land here. The row is only mutated on success, so
  // there is nothing to roll back; instead we surface an inline per-row error.
  // When the server says the row's state moved underneath us (404 gone, 409/410
  // conflict — e.g. another admin already actioned it or the cycle closed), we
  // refetch so the table reflects the true server state rather than a stale row.
  const handleActionError = async (regId, err, fallback) => {
    console.error(err);
    const status = err.response?.status;
    setRowErrors((prev) => ({
      ...prev,
      [regId]: err.response?.data?.message || fallback,
    }));
    if (status === 404 || status === 409 || status === 410) {
      await Promise.all([fetchRegistrations(), fetchCounts()]);
    }
  };

  const handleVerify = async (regId) => {
    clearRowError(regId);
    setVerifyingRegId(regId);
    try {
      await api.put(
        `/register/verify/${regId}`,
        { action: "VERIFIED" },
        { headers: getAdminHeaders() },
      );
      // refetch: with server-side status filtering the row may leave the current
      // (e.g. SUBMITTED) page, and the stat cards need the fresh counts
      await Promise.all([fetchRegistrations(), fetchCounts()]);
    } catch (err) {
      await handleActionError(regId, err, "Failed to verify. Please refresh and try again.");
    } finally {
      setVerifyingRegId("");
    }
  };

  const handleReject = async (regId) => {
    clearRowError(regId);
    setRejectingRegId(regId);
    try {
      await api.put(
        `/register/verify/${regId}`,
        { action: "REJECTED" },
        { headers: getAdminHeaders() },
      );
      await Promise.all([fetchRegistrations(), fetchCounts()]);
    } catch (err) {
      await handleActionError(regId, err, "Failed to reject. Please refresh and try again.");
    } finally {
      setRejectingRegId("");
      setConfirmRejectVerifiedId("");
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
    // export the applied combination (what's shown), not unapplied draft edits
    const params = new URLSearchParams();
    if (appliedFilters.subjectId) params.append("subjectId", appliedFilters.subjectId);
    if (appliedFilters.subjectType) params.append("subjectType", appliedFilters.subjectType);
    if (appliedFilters.searchQuery) params.append("searchQuery", appliedFilters.searchQuery);
    if (appliedFilters.startDate) params.append("startDate", appliedFilters.startDate);
    if (appliedFilters.endDate) params.append("endDate", appliedFilters.endDate);
    if (appliedFilters.examCycleId) params.append("examCycleId", appliedFilters.examCycleId);

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

  // The table shows exactly the current server page — status filtering and paging
  // are server-side, so no client-side slicing.
  const filtered = registrations;

  // Stat cards come from the server counts endpoint: they span every status of the
  // filtered set (same filters as the list, minus the status tab), regardless of
  // which tab/page is open.
  const totalCount = counts.total;
  const pendingCount = counts.submitted;
  const verifiedCount = counts.verified;
  const rejectedCount = counts.rejected;

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
            {adminDepartment && (
              <div className="mt-2 flex flex-wrap gap-2">
                <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                  {adminDepartment}
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {adminRole !== "PROCTOR" && (
              <Link
                to="/admin/exam-cycles"
                className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
              >
                <CalendarRange size={14} /> Exam Cycles
              </Link>
            )}
            {["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE"].includes(adminRole) && (
              <Link
                to="/admin/manage-subjects"
                className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
              >
                <BookOpen size={14} /> Subjects
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
                <Users size={14} /> Users
              </Link>
            )}
            {["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE", "PROCTOR"].includes(adminRole) && (
              <Link
                to="/admin/students"
                className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
              >
                <IdCard size={14} /> {adminRole === "PROCTOR" ? "My Students" : "Students"}
              </Link>
            )}
            <ThemeToggle />
            <Link
              to="/"
              className="inline-flex items-center gap-1 rounded-full border border-white/35 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft size={14} /> Home
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logoutAdmin(); // expire the httpOnly cookie, then clear local state
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
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--stroke)] pt-4">
            <MagneticCta
              type="button"
              onClick={applyFilters}
              className="gap-2 rounded-xl"
              data-cy="admin-filters-apply"
            >
              <Search size={15} /> Apply filters
            </MagneticCta>
            <button
              type="button"
              onClick={clearFilters}
              data-cy="admin-filters-clear"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--color-primary)]"
            >
              <X size={15} /> Clear all filters
            </button>
            {filtersDirty && (
              <span
                className="text-xs font-semibold text-amber-600"
                data-cy="admin-filters-dirty"
              >
                Unapplied changes — click Apply
              </span>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-4 shadow-soft sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {["ALL", "SUBMITTED", "VERIFIED", "REJECTED"].map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => {
                    setPage(0); // switching status tab restarts at the first page
                    setFilter(f);
                  }}
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
                    <th className="px-4 py-3">Sem</th>
                    <th className="px-4 py-3">Cycle</th>
                    <th className="px-4 py-3">Subjects</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Acted By</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">History</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg) => (
                    <tr
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
                          <div className="flex flex-col gap-1.5">
                            <div className="flex flex-col items-start gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleVerify(reg.regId)}
                                disabled={verifyingRegId === reg.regId || rejectingRegId === reg.regId}
                                data-cy="admin-verify"
                                className="inline-flex w-15 items-center justify-center gap-1 rounded-lg bg-[var(--color-primary)] py-1 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                              >
                                {verifyingRegId === reg.regId ? (
                                  <LoaderCircle size={13} className="animate-spin" />
                                ) : (
                                  <BadgeCheck size={13} />
                                )}
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(reg.regId)}
                                disabled={rejectingRegId === reg.regId || verifyingRegId === reg.regId}
                                data-cy="admin-reject"
                                className="inline-flex w-15 items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                              >
                                {rejectingRegId === reg.regId ? (
                                  <LoaderCircle size={14} className="animate-spin" />
                                ) : (
                                  <XCircle size={14} />
                                )}
                                Reject
                              </button>
                            </div>
                            {rowErrors[reg.regId] && (
                              <p
                                className="text-sm font-medium text-red-600"
                                role="alert"
                                data-cy="admin-action-error"
                              >
                                {rowErrors[reg.regId]}
                              </p>
                            )}
                          </div>
                        ) : reg.status === "VERIFIED" ? (
                          <div className="flex flex-col gap-1.5">
                            {confirmRejectVerifiedId === reg.regId ? (
                              <div className="flex flex-col items-start gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleReject(reg.regId)}
                                  disabled={rejectingRegId === reg.regId}
                                  data-cy="admin-reject-verified-confirm"
                                  className="inline-flex w-14 items-center justify-center rounded-lg bg-red-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                >
                                  {rejectingRegId === reg.regId ? (
                                    <LoaderCircle size={14} className="animate-spin" />
                                  ) : (
                                    "Confirm"
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRejectVerifiedId("")}
                                  disabled={rejectingRegId === reg.regId}
                                  data-cy="admin-reject-verified-cancel"
                                  className="inline-flex w-14 items-center justify-center rounded-lg border border-[var(--stroke)] py-1.5 text-xs font-semibold text-[var(--text-main)] transition-colors hover:bg-[var(--surface-muted)] disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-start gap-1">
                                <span className="text-sm font-semibold text-[var(--color-primary)]">
                                  Verified
                                </span>
                                {adminRole !== "PRINCIPAL" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      clearRowError(reg.regId);
                                      setConfirmRejectVerifiedId(reg.regId);
                                    }}
                                    data-cy="admin-reject-verified"
                                    className="inline-flex w-14 items-center justify-center rounded-lg border border-red-200 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                                  >
                                    Reject
                                  </button>
                                ) : null}
                              </div>
                            )}
                            {rowErrors[reg.regId] && (
                              <p
                                className="text-sm font-medium text-red-600"
                                role="alert"
                                data-cy="admin-action-error"
                              >
                                {rowErrors[reg.regId]}
                              </p>
                            )}
                          </div>
                        ) : reg.status === "REJECTED" ? (
                          <span className="text-sm font-semibold text-red-600">
                            Rejected
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-[var(--text-muted)]">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && pageInfo.totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p
                className="text-xs text-[var(--text-muted)]"
                data-cy="admin-page-info"
              >
                Page {pageInfo.number + 1} of {pageInfo.totalPages} ·{" "}
                {pageInfo.totalElements} total
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page <= 0}
                  data-cy="admin-page-prev"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-semibold text-[var(--color-secondary)] transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft size={14} /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageInfo.totalPages - 1, p + 1))}
                  disabled={page >= pageInfo.totalPages - 1}
                  data-cy="admin-page-next"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-semibold text-[var(--color-secondary)] transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next <ArrowLeft size={14} className="rotate-180" />
                </button>
              </div>
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
