// Save a PDF (axios blob response data) to the user's device. The naive anchor+download pattern
// has two mobile failure modes:
//  - iOS Safari consumes the blob URL asynchronously, so revoking right after click() can silently
//    cancel the download — revoke on a delay instead.
//  - Legacy/in-app WebKit ignores `download` on blob URLs; opening the blob in a tab hands off to
//    the built-in PDF viewer's own share/save UI.
// A failed download requested with responseType "blob" carries its JSON error body as a Blob, so
// err.response.data.message is undefined and the server's reason is silently lost — which matters
// most for the messages worth reading ("contact the department office", "no exam cycle is active").
// Reads the blob back as JSON, falling back when the body isn't JSON at all.
export async function readBlobErrorMessage(err, fallback) {
  const body = err?.response?.data;
  if (body instanceof Blob) {
    try {
      const parsed = JSON.parse(await body.text());
      if (parsed?.message) return parsed.message;
    } catch {
      // not JSON (an HTML error page, or an empty body) — use the fallback
    }
  }
  return body?.message || fallback;
}

export function savePdfBlob(data, filename) {
  const blob = new Blob([data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  if (typeof link.download === "undefined") {
    window.open(url, "_blank");
  } else {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}
