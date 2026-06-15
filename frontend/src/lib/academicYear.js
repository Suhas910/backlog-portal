// Academic years are stored canonically as a single START year — e.g. 2025 means
// AY 2025-26. The "-26" is always start+1, so it is pure presentation: the int
// stays the single source of truth everywhere (DB, API, all comparisons / the
// year-binding equality check) and is only turned into a human label here.
// See docs/adr/backlog-progression.md.

// 2025 -> "2025-26". Returns "" for empty / non-numeric / non-positive input
// (callers render that as a placeholder).
export function formatAcademicYear(startYear) {
  const start = Number(startYear);
  if (!Number.isInteger(start) || start <= 0) return "";
  const endShort = String(start + 1).slice(-2).padStart(2, "0");
  return `${start}-${endShort}`;
}

// Accepts the span format and bare start years alike, so older "2025" inputs /
// CSV pastes keep working:
//   "2025-26" | "2025-2026" | "2025" | 2025  ->  2025
// Returns NaN when no 4-digit start year can be read; callers treat NaN / empty
// as "not provided".
export function parseAcademicYear(value) {
  if (value == null) return NaN;
  const match = String(value).trim().match(/^(\d{4})/);
  return match ? Number(match[1]) : NaN;
}
