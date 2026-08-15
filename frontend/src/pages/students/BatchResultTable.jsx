// Shared render for the batch-result DTO (ProgressionRowResult rows + created/skipped/errors
// counts) that bulk progression, student import, and proctor claim all return. Three near-identical
// copies existed before; the guard below had to be written three times and had already drifted to a
// weaker operator in one of them.

import { batchRows } from "./batchResult";

// Superset of the statuses the three endpoints emit: progression adds the WOULD_* preview forms and
// the conflict pair, import and claim emit subsets.
const STATUS_STYLES = {
  CREATED: "text-primary-ink",
  WOULD_CREATE: "text-primary-ink",
  SKIPPED_EXISTS: "text-ink-muted",
  WOULD_SKIP: "text-ink-muted",
  // Amber, not red: a conflict is not a failure — the row needs a decision. amber-700, not -600:
  // measured 3.19:1 on white at this size, under the 4.5 AA floor (the adjacent red-600 gets 4.83).
  // Both share one dark re-tint in index.css, so this is a light-only correction.
  CONFLICT: "text-amber-700",
  WOULD_CONFLICT: "text-amber-700",
  ERROR: "text-red-600",
};

/**
 * @param verb        past-tense word for a real run ("Applied", "Imported"); a dry run says Preview
 * @param showConflicts  whether the summary carries the conflict count + banner (progression only)
 * @param renderRowAction  optional per-row trailing control in the Detail cell
 */
function BatchResultTable({ result, verb, showConflicts = false, renderRowAction, dataCy }) {
  if (!result) return null;

  const rows = batchRows(result);
  const conflicts = result.conflicts ?? 0;

  return (
    <div className="mt-4" data-cy={dataCy}>
      <p className="mb-2 text-sm font-medium text-ink">
        {result.dryRun ? "Preview" : verb} — {result.created} created, {result.skipped} skipped,{" "}
        {showConflicts ? `${conflicts} conflict(s), ` : ""}
        {result.errors} error(s)
      </p>
      {showConflicts && conflicts > 0 && (
        <p className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-ink">
          A conflict means the year on file disagrees with this row. Nothing was changed — the
          recorded year is what a student&apos;s backlog subjects resolve against, so overwriting it
          is a per-student decision. Apply the ones that are genuinely corrections.
        </p>
      )}
      <div className="max-h-72 overflow-auto rounded-xl border border-stroke">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface-muted text-xs uppercase tracking-[0.08em] text-ink-muted">
            <tr>
              <th className="px-3 py-2">USN</th>
              <th className="px-3 py-2">Sem</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.rollNo}-${r.semester ?? ""}-${i}`} className="border-t border-stroke">
                <td className="px-3 py-2 font-mono text-xs">{r.rollNo}</td>
                <td className="px-3 py-2">{r.semester ?? "—"}</td>
                <td className={`px-3 py-2 font-semibold ${STATUS_STYLES[r.status] || ""}`}>{r.status}</td>
                <td className="px-3 py-2 text-ink-muted">
                  {r.message || ""}
                  {renderRowAction?.(r)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BatchResultTable;
