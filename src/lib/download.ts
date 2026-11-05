import type { ExportFile } from "../api/client";

/** Hand the file to the browser as a download, under the name the agent gave it. */
export function saveFile({ blob, filename }: ExportFile): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // The browser holds the blob once the download is under way; revoking on the same tick can cut it short
  // (Firefox, Safari). A minute later it is long done, and the URL costs nothing meanwhile.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
