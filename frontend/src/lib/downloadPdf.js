// Save a PDF (axios blob response data) to the user's device.
//
// The naive anchor+download pattern has two mobile failure modes:
//  - iOS Safari consumes the blob URL asynchronously, so revoking it right
//    after click() can silently cancel the download. The URL is revoked on a
//    delay instead.
//  - Legacy/in-app WebKit browsers ignore the `download` attribute on blob
//    URLs; opening the blob in a tab lets the built-in PDF viewer's own
//    share/save UI take over.
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
