import { useState, useEffect } from "react";
import { ArrowLeft, GraduationCap, UploadCloud, UserPlus, Users } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BrandIdentity from "../../components/layout/BrandIdentity";
import api from "../../lib/api";
import MobileActionBar from "../../components/layout/MobileActionBar";
import StudentsManageTab from "./StudentsManageTab";
import AddStudentTab from "./AddStudentTab";
import ImportStudentsTab from "./ImportStudentsTab";

const DEPT_ROLES = new Set(["HOD", "DEPT_OFFICE"]);
const ALLOWED_ROLES = ["ADMIN", "PRINCIPAL", "HOD", "DEPT_OFFICE"];

const TABS = [
  { key: "manage", label: "Manage", icon: Users },
  { key: "add", label: "Add", icon: UserPlus },
  { key: "import", label: "Import", icon: UploadCloud },
];
const TAB_KEYS = new Set(TABS.map((t) => t.key));

// Admin student-account management behind one route as three tabs (Manage / Add /
// Import). The shell owns what the tabs share — the role guard, the single
// departments fetch, and dept-pin resolution — so each tab is presentational.
// All auth/dept scope is enforced server-side on /api/admin/students/**.
function StudentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const adminRole = sessionStorage.getItem("adminRole") || "";
  const adminDepartment = sessionStorage.getItem("adminDepartment") || "";
  const deptLocked = DEPT_ROLES.has(adminRole);

  const [departments, setDepartments] = useState([]);
  const [pinnedDeptId, setPinnedDeptId] = useState("");

  const tabParam = searchParams.get("tab");
  const activeTab = TAB_KEYS.has(tabParam) ? tabParam : "manage";
  const setActiveTab = (key) => setSearchParams({ tab: key }, { replace: true });

  useEffect(() => {
    if (!ALLOWED_ROLES.includes(adminRole)) {
      navigate("/admin");
      return;
    }
    api.get("/departments").then((res) => setDepartments(res.data)).catch(() => {});
  }, [adminRole, navigate]);

  useEffect(() => {
    if (deptLocked && adminDepartment && departments.length > 0) {
      const mine = departments.find((d) => d.deptName === adminDepartment);
      if (mine) {
        setPinnedDeptId(String(mine.id));
      }
    }
  }, [departments, deptLocked, adminDepartment]);

  const shared = { departments, adminRole, adminDepartment, deptLocked, pinnedDeptId };

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-8 text-[var(--text-main)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl pb-24 md:pb-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] p-4 text-white shadow-soft sm:px-6">
          <BrandIdentity compact />
          <Link
            to="/admin"
            className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={15} className="mr-1" /> Dashboard
          </Link>
        </header>

        <div className="mb-3">
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-[var(--color-secondary)] sm:text-3xl">
            <GraduationCap size={26} /> Students
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create and manage student accounts. After adding a student, set their academic-year
            progression so their backlogs resolve to the right year.
            {deptLocked && adminDepartment ? ` Scoped to ${adminDepartment}.` : ""}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Student management">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActiveTab(t.key)}
                data-cy={`tab-${t.key}`}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  on
                    ? "border-[var(--color-primary)] bg-[rgba(145,25,28,0.08)] text-[var(--color-primary)]"
                    : "border-[var(--stroke)] bg-[var(--surface-muted)] text-[var(--text-main)] hover:border-[var(--color-primary)]"
                }`}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "manage" && <StudentsManageTab {...shared} />}
        {activeTab === "add" && <AddStudentTab {...shared} />}
        {activeTab === "import" && <ImportStudentsTab {...shared} />}
      </div>

      <MobileActionBar />
    </div>
  );
}

export default StudentsPage;
