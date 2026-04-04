"use client";

import { getPreviewKind } from "@/lib/file-preview-kind";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

export type PreviewFile = {
  id: string;
  name: string;
  mimeType: string;
};

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Loader2 className="size-8 animate-spin" />
    </div>
  );
}

function Fallback({
  message,
  href,
}: {
  message: string;
  href: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      <Button variant="secondary" asChild>
        <a href={href} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-4 mr-2" />
          Open or download
        </a>
      </Button>
    </div>
  );
}

export function FilePreviewPanel({
  file,
  onClose,
}: {
  file: PreviewFile | null;
  onClose: () => void;
}) {
  const downloadPath = file ? `/api/storage/files/${file.id}/download` : null;
  const kind = file ? getPreviewKind(file.mimeType, file.name) : "none";

  const [presigned, setPresigned] = useState<string | null>(null);
  const [presignErr, setPresignErr] = useState<string | null>(null);
  const [textBody, setTextBody] = useState<string | null>(null);
  const [textErr, setTextErr] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, onClose]);

  useEffect(() => {
    setPresigned(null);
    setPresignErr(null);
    setTextBody(null);
    setTextErr(null);
  }, [file?.id]);

  useEffect(() => {
    if (!file) return;
    const needPresign =
      kind === "image" ||
      kind === "video" ||
      kind === "audio" ||
      kind === "iframe";
    if (!needPresign) return;

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/storage/files/${file.id}/download`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!r.ok) throw new Error("Could not resolve file URL");
        const j = (await r.json()) as { url?: string };
        if (!j.url) throw new Error("Missing URL");
        if (!cancelled) setPresigned(j.url);
      } catch (e) {
        if (!cancelled) {
          setPresignErr(e instanceof Error ? e.message : "Failed to load preview");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, kind]);

  useEffect(() => {
    if (!file || kind !== "text") return;

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/storage/files/${file.id}/content`, {
          credentials: "include",
        });
        if (r.status === 413) {
          if (!cancelled) {
            setTextErr("This file is too large for text preview. Use Open in new tab.");
          }
          return;
        }
        if (!r.ok) throw new Error("Could not load file content");
        const t = await r.text();
        if (!cancelled) setTextBody(t);
      } catch (e) {
        if (!cancelled) {
          setTextErr(e instanceof Error ? e.message : "Failed to load text");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, kind]);

  if (!file || !downloadPath) return null;

  const label =
    kind === "pdf" ? "PDF"
    : kind === "image" ? "Image"
    : kind === "video" ? "Video"
    : kind === "audio" ? "Audio"
    : kind === "text" ? "Text"
    : kind === "iframe" ? "HTML"
    : "File";

  function previewBody() {
    if (kind === "pdf") {
      return (
        <iframe
          title={file.name}
          src={downloadPath}
          className="h-full w-full border-0"
        />
      );
    }

    if (kind === "image") {
      if (presignErr) {
        return <Fallback message={presignErr} href={downloadPath} />;
      }
      if (!presigned) return <Loading />;
      return (
        <div className="flex h-full items-center justify-center overflow-auto p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={presigned}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        </div>
      );
    }

    if (kind === "video") {
      if (presignErr) {
        return <Fallback message={presignErr} href={downloadPath} />;
      }
      if (!presigned) return <Loading />;
      return (
        <div className="flex h-full items-center justify-center overflow-auto p-4 bg-black/80">
          <video
            src={presigned}
            controls
            className="max-h-full max-w-full"
            playsInline
          />
        </div>
      );
    }

    if (kind === "audio") {
      if (presignErr) {
        return <Fallback message={presignErr} href={downloadPath} />;
      }
      if (!presigned) return <Loading />;
      return (
        <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
          <p className="text-sm text-muted-foreground truncate max-w-full px-4">
            {file.name}
          </p>
          <audio src={presigned} controls className="w-full max-w-md" />
        </div>
      );
    }

    if (kind === "text") {
      if (textErr) {
        return <Fallback message={textErr} href={downloadPath} />;
      }
      if (textBody === null) return <Loading />;
      return (
        <pre className="h-full overflow-auto p-4 text-sm whitespace-pre-wrap break-words font-mono bg-muted/20">
          {textBody}
        </pre>
      );
    }

    if (kind === "iframe") {
      if (presignErr) {
        return <Fallback message={presignErr} href={downloadPath} />;
      }
      if (!presigned) return <Loading />;
      return (
        <iframe
          title={file.name}
          src={presigned}
          sandbox=""
          className="h-full w-full border-0"
        />
      );
    }

    return (
      <Fallback
        message="There is no built-in preview for this file type. You can still open or download it."
        href={downloadPath}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${file.name}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <a
              href={downloadPath}
              target="_blank"
              rel="noopener noreferrer"
              className="gap-1"
            >
              <ExternalLink className="size-4" />
              New tab
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close preview"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 bg-muted/30">{previewBody()}</div>
    </div>
  );
}
