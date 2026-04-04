"use client";

import {
  getFilePresignedUrlAction,
  getFileTextContentAction,
} from "@/lib/actions/preview";
import { getPreviewKind } from "@/lib/file-preview-kind";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

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

  const needPresign =
    kind === "image" ||
    kind === "video" ||
    kind === "audio" ||
    kind === "iframe";

  const {
    data: presignData,
    isLoading: presignLoading,
    error: presignError,
  } = useQuery({
    queryKey: ["preview-presign", file?.id],
    queryFn: () => getFilePresignedUrlAction(file!.id),
    enabled: !!file && needPresign,
  });

  const {
    data: textBody,
    isLoading: textLoading,
    error: textQueryError,
    isError: textIsError,
  } = useQuery({
    queryKey: ["preview-text", file?.id],
    queryFn: async () => {
      const r = await getFileTextContentAction(file!.id);
      if (!r.ok) {
        if (r.code === "too_large") {
          throw new Error(
            "This file is too large for text preview. Use Open in new tab.",
          );
        }
        throw new Error("Could not load file content");
      }
      return r.text;
    },
    enabled: !!file && kind === "text",
  });

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, onClose]);

  if (!file || !downloadPath) return null;

  const activeFile = file;
  const activePath = downloadPath;

  const presigned = presignData?.url ?? null;
  const presignErr =
    presignError instanceof Error ? presignError.message : presignError
      ? "Failed to load preview"
      : null;

  const textErr = textIsError
    ? textQueryError instanceof Error
      ? textQueryError.message
      : "Failed to load text"
    : null;

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
          title={activeFile.name}
          src={activePath}
          className="h-full w-full border-0"
        />
      );
    }

    if (kind === "image") {
      if (presignErr) {
        return <Fallback message={presignErr} href={activePath} />;
      }
      if (presignLoading || !presigned) return <Loading />;
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
        return <Fallback message={presignErr} href={activePath} />;
      }
      if (presignLoading || !presigned) return <Loading />;
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
        return <Fallback message={presignErr} href={activePath} />;
      }
      if (presignLoading || !presigned) return <Loading />;
      return (
        <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
          <p className="text-sm text-muted-foreground truncate max-w-full px-4">
            {activeFile.name}
          </p>
          <audio src={presigned} controls className="w-full max-w-md" />
        </div>
      );
    }

    if (kind === "text") {
      if (textErr) {
        return <Fallback message={textErr} href={activePath} />;
      }
      if (textLoading || textBody === undefined) return <Loading />;
      return (
        <pre className="h-full overflow-auto p-4 text-sm whitespace-pre-wrap break-words font-mono bg-muted/20">
          {textBody}
        </pre>
      );
    }

    if (kind === "iframe") {
      if (presignErr) {
        return <Fallback message={presignErr} href={activePath} />;
      }
      if (presignLoading || !presigned) return <Loading />;
      return (
        <iframe
          title={activeFile.name}
          src={presigned}
          sandbox=""
          className="h-full w-full border-0"
        />
      );
    }

    return (
      <Fallback
        message="There is no built-in preview for this file type. You can still open or download it."
        href={activePath}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${activeFile.name}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{activeFile.name}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <a
              href={activePath}
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
