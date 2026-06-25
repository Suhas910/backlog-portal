import { academicYearPrefix, courseCodeSuffix } from "../../lib/academicYear";

// Course-code input with a locked two-digit academic-year prefix + an editable
// suffix. The prefix is derived from `year` (the binding key), so it can never
// disagree with it. The parent owns the full `value`; this emits the recomposed
// `prefix + suffix` on every edit. Disabled until a year is chosen, which enforces
// "pick the year first". See docs/adr/backlog-progression.md.
function CourseCodeField({
  id,
  year,
  value,
  onChange,
  disabled = false,
  inputClassName = "",
  dataCy,
  placeholder = "e.g. CSL44",
}) {
  const prefix = academicYearPrefix(year);
  const suffix = courseCodeSuffix(value);
  return (
    <div className="flex items-stretch">
      <span
        className="inline-flex select-none items-center rounded-l-xl border border-r-0 border-[var(--stroke)] bg-[var(--surface-muted)] px-3 text-sm font-semibold text-[var(--text-muted)]"
        title="Set automatically from the academic year"
      >
        {prefix || "YY"}
      </span>
      <input
        id={id}
        value={suffix}
        onChange={(e) => onChange(prefix + e.target.value)}
        disabled={disabled || !prefix}
        data-cy={dataCy}
        placeholder={placeholder}
        className={`${inputClassName} rounded-l-none`}
      />
    </div>
  );
}

export default CourseCodeField;
