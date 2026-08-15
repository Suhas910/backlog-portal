// The batch-result DTO (created/skipped/errors counts + ProgressionRowResult rows) returned by bulk
// progression, student import, and proctor claim. Its own module, not BatchResultTable.jsx, because
// react-refresh/only-export-components bars a non-component export from a component file.

/**
 * The one place the missing-rows decision is made. A failed or empty run can legitimately answer
 * without `results`, so absence is coerced — but Array.isArray (not `?? []`) so a non-array, which
 * would mean a broken contract rather than an empty run, still fails loudly.
 */
export function batchRows(result) {
  return Array.isArray(result?.results) ? result.results : [];
}
