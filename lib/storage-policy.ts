import "server-only";

const MAX_BYTES = 100 * 1024 * 1024;

/** Block obviously dangerous upload extensions; other types are allowed up to size limit. */
const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "dll",
  "bat",
  "cmd",
  "msi",
  "com",
  "scr",
  "ps1",
  "vbs",
  "js",
  "jse",
  "wsf",
  "msc",
  "app",
  "deb",
  "rpm",
  "dmg",
  "pkg",
  "sh",
]);

export function assertUploadAllowed(filename: string, mimeType: string, size: number) {
  if (size <= 0 || size > MAX_BYTES) {
    throw new StoragePolicyError("File must be between 1 byte and 100 MB.");
  }
  const lower = filename.trim().toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot >= 0 ? lower.slice(dot + 1) : "";
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    throw new StoragePolicyError("This file type is not allowed for upload.");
  }
  if (!lower.includes(".")) {
    throw new StoragePolicyError("Files must include an extension (e.g. report.pdf).");
  }
}

export class StoragePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoragePolicyError";
  }
}
