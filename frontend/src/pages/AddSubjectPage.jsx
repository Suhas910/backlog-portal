import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, LoaderCircle, PlusCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BrandIdentity from "../components/layout/BrandIdentity";
import MagneticCta from "../components/ui/MagneticCta";
import api, { getAdminHeaders } from "../lib/api";
import { formatAcademicYear } from "../lib/academicYear";
import MobileActionBar from "../components/layout/MobileActionBar";

function AddSubjectPage() {
  const navigate = useNavigate();
  const adminRole = sessionStorage.getItem("adminRole");
  const adminDepartment = sessionStorage.getItem("adminDepartment") || "";

  const [formData, setFormData] = useState({
    subjectName: "",
    courseCode: "",
    semester: "",
    credits: "",
    academicYearOffered: "",
    deptId: "",
  });
  const [subjectType, setSubjectType] = useState("REGULAR");
  const [eligibleDeptIds, setEligibleDeptIds] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (adminRole !== "DEPT_OFFICE" && adminRole !== "ADMIN") {
      navigate("/admin");
    }

    api
      .get("/departments")
      .then((res) => {
        setDepartments(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch departments", err);
        setError("Could not load departments. Please try again later.");
      });
  }, [adminRole, navigate]);

  useEffect(() => {
    if (adminRole === "DEPT_OFFICE" && adminDepartment && departments.length > 0) {
      const myDept = departments.find((d) => d.deptName === adminDepartment);
      if (myDept) {
        setFormData((prev) => ({ ...prev, deptId: String(myDept.id) }));
      }
    }
  }, [departments, adminRole, adminDepartment]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleEligibleDept = (id) => {
    setEligibleDeptIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    for (const key in formData) {
      if (formData[key] === "") {
        setError("All fields are required.");
        return;
      }
    }
    if (subjectType === "ELECTIVE" && eligibleDeptIds.length === 0) {
      setError("Please select at least one eligible department for an elective subject.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        semester: parseInt(formData.semester, 10),
        credits: parseInt(formData.credits, 10),
        academicYearOffered: parseInt(formData.academicYearOffered, 10),
        deptId: parseInt(formData.deptId, 10),
        subjectType,
        eligibleDeptIds: subjectType === "ELECTIVE" ? eligibleDeptIds : [],
      };

      await api.post("/admin/subjects", payload, {
        headers: getAdminHeaders(),
      });

      setSuccess(
        `Subject "${formData.subjectName}" has been added successfully!`,
      );
      setFormData((prev) => ({
        subjectName: "",
        courseCode: "",
        semester: "",
        credits: "",
        academicYearOffered: "",
        // DEPT_OFFICE's department is pinned; everyone else re-picks it
        deptId: adminRole === "DEPT_OFFICE" ? prev.deptId : "",
      }));
      setSubjectType("REGULAR");
      setEligibleDeptIds([]);
    } catch (apiError) {
      setError(
        apiError.response?.data?.message ||
          "Failed to add subject. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const availableYears = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - i + 1,
  );
  const inputClass =
    "w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]";

  return (
    <div className="min-h-screen bg-[var(--surface-1)] px-4 py-8 text-[var(--text-main)] sm:px-6 lg:px-8">
      <a
        href="#add-subject-main"
        className="sr-only left-4 top-4 z-[60] rounded-md bg-[var(--color-cta)] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed"
      >
        Skip to form
      </a>

      <div
        id="add-subject-main"
        className="mx-auto w-full max-w-3xl pb-24 md:pb-8"
      >
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--color-secondary)] p-4 text-white shadow-soft sm:px-6">
          <BrandIdentity compact />
          <Link
            to="/admin"
            aria-label="Back to admin dashboard"
            className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={15} className="mr-1" /> Dashboard
          </Link>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-5 shadow-soft sm:p-8"
        >
          <h1 className="mb-2 text-2xl font-semibold text-[var(--color-secondary)] sm:text-3xl">
            Add New Subject
          </h1>
          <p className="mb-6 text-sm text-[var(--text-main)]">
            Fill in the details below to add a new backlog subject to the
            system.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="subjectName"
                  className="text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  Subject Name *
                </label>
                <input
                  id="subjectName"
                  name="subjectName"
                  value={formData.subjectName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g., Advanced Algorithms"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="courseCode"
                  className="text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  Course Code *
                </label>
                <input
                  id="courseCode"
                  name="courseCode"
                  value={formData.courseCode}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g., 22CS51"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="semester"
                  className="text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  Semester *
                </label>
                <select
                  id="semester"
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="credits"
                  className="text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  Credits *
                </label>
                <input
                  id="credits"
                  name="credits"
                  type="number"
                  value={formData.credits}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g., 4"
                  min="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="academicYearOffered"
                  className="text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  Academic Year Offered *
                </label>
                <select
                  id="academicYearOffered"
                  name="academicYearOffered"
                  value={formData.academicYearOffered}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select Academic Year</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {formatAcademicYear(year)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="deptId"
                  className="text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  Department *
                </label>
                <select
                  id="deptId"
                  name="deptId"
                  value={formData.deptId}
                  onChange={handleChange}
                  className={inputClass}
                  disabled={departments.length === 0 || adminRole === "DEPT_OFFICE"}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.deptName}
                    </option>
                  ))}
                </select>
                {adminRole === "DEPT_OFFICE" && adminDepartment && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Locked to your department: {adminDepartment}
                  </p>
                )}
              </div>
            </div>

            {/* Subject type */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em]">
                Subject Type *
              </span>
              <div className="flex gap-3">
                {["REGULAR", "ELECTIVE"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSubjectType(type);
                      setEligibleDeptIds([]);
                    }}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      subjectType === type
                        ? "border-[var(--color-primary)] bg-[rgba(145,25,28,0.08)] text-[var(--color-primary)]"
                        : "border-[var(--stroke)] bg-[var(--surface-muted)] text-[var(--text-main)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Eligible departments — only for ELECTIVE */}
            {subjectType === "ELECTIVE" && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em]">
                  Eligible Departments *
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  Select which departments' students can register for this elective. The offering department is not included automatically.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {departments.map((dept) => {
                    const checked = eligibleDeptIds.includes(dept.id);
                    const isOfferingDept = String(dept.id) === String(formData.deptId);
                    return (
                      <label
                        key={dept.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                          checked
                            ? "border-[var(--color-primary)]/40 bg-[rgba(145,25,28,0.06)]"
                            : "border-[var(--stroke)] bg-[var(--surface-muted)] hover:border-[var(--color-primary)]/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEligibleDept(dept.id)}
                          className="h-4 w-4 accent-[var(--color-primary)]"
                        />
                        <span className="text-sm text-[var(--text-main)]">
                          {dept.deptName}
                          {isOfferingDept && (
                            <span className="ml-1.5 text-xs text-[var(--text-muted)]">
                              (Offering dept)
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              >
                {success}
              </p>
            )}

            <div className="border-t border-[var(--stroke)] pt-4">
              <MagneticCta
                type="submit"
                disabled={loading}
                className="w-full gap-2 rounded-xl"
                aria-label="Add new subject"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" /> Adding
                    Subject...
                  </>
                ) : (
                  <>
                    <PlusCircle size={16} /> Add Subject
                  </>
                )}
              </MagneticCta>
            </div>
          </form>
        </motion.div>
      </div>

      <MobileActionBar />
    </div>
  );
}

export default AddSubjectPage;
