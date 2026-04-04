export type PreviewKind =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "text"
  | "iframe"
  | "none";

const IMAGE_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "avif",
]);

const VIDEO_EXT = new Set(["mp4", "webm", "ogv", "mov", "m4v", "mkv"]);

const AUDIO_EXT = new Set([
  "mp3",
  "wav",
  "ogg",
  "oga",
  "m4a",
  "aac",
  "flac",
  "opus",
]);

/** Decide how to preview a file in the browser (best-effort). */
export function getPreviewKind(mimeType: string, fileName: string): PreviewKind {
  const m = (mimeType || "").toLowerCase().trim();
  const ext =
    fileName.includes(".") ?
      fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
    : "";

  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("image/") || m === "image/svg+xml" || ext === "svg")
    return "image";

  if (m.startsWith("video/") || VIDEO_EXT.has(ext)) return "video";
  if (m.startsWith("audio/") || AUDIO_EXT.has(ext)) return "audio";

  if (
    m.startsWith("text/") ||
    m === "application/json" ||
    m === "application/xml" ||
    m === "application/javascript" ||
    m === "application/xhtml+xml" ||
    m.includes("+json") ||
    m.includes("+xml")
  ) {
    return "text";
  }

  if (
    [
      "json",
      "csv",
      "txt",
      "md",
      "log",
      "xml",
      "yaml",
      "yml",
      "toml",
      "ini",
      "env",
      "ts",
      "tsx",
      "jsx",
      "css",
      "scss",
      "less",
      "c",
      "h",
      "cpp",
      "rs",
      "go",
      "py",
      "rb",
      "java",
      "kt",
      "swift",
    ].includes(ext)
  ) {
    return "text";
  }

  if (IMAGE_EXT.has(ext)) return "image";

  if (m === "text/html" || ext === "html" || ext === "htm") return "iframe";

  return "none";
}
