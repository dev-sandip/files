/** Compact folder URLs: `/files/<32 hex>` (no dashes). Accepts dashed UUIDs too. */

export function folderHref(folderId: string | null | undefined): string {
  if (folderId == null || folderId === "") return "/files";
  return `/files/${folderId.replace(/-/g, "").toLowerCase()}`;
}

/** @returns canonical dashed UUID or null if invalid */
export function parseFilesFolderSegment(segment: string): string | null {
  const hex = segment.trim().toLowerCase().replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
