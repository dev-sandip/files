"use client";

import { searchStorageAction } from "@/lib/actions/search";
import type { SearchFileHit, SearchFolderHit } from "@/lib/actions/search";
import { folderHref } from "@/lib/files-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Folder, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
}

export function StorageSearch({ className }: { className?: string }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 280);
    return () => window.clearTimeout(t);
  }, [q]);

  const active = debounced.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ["storage-search", debounced],
    queryFn: () => searchStorageAction(debounced),
    enabled: active,
    staleTime: 15_000,
  });

  const folders = data?.folders ?? [];
  const files = data?.files ?? [];
  const hasResults = folders.length > 0 || files.length > 0;
  const showPanel = active && (isFetching || hasResults || debounced.length >= 2);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search all folders and files…"
          className="h-10 pl-9 pr-9 rounded-xl bg-background/80"
          aria-label="Search library"
          autoComplete="off"
        />
        {q ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 rounded-full"
            onClick={() => {
              setQ("");
              setDebounced("");
            }}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {showPanel ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[min(70vh,22rem)] overflow-y-auto rounded-2xl border border-border/60 bg-popover/95 py-2 text-sm shadow-lg backdrop-blur-md"
          role="listbox"
          aria-label="Search results"
        >
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 px-3 py-8 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          ) : !hasResults ? (
            <p className="px-3 py-6 text-center text-muted-foreground">
              No matches for “{debounced}”.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {folders.map((h) => (
                <SearchHitRow
                  key={`f-${h.id}`}
                  hit={h}
                  onNavigate={() => {
                    setQ("");
                    setDebounced("");
                  }}
                />
              ))}
              {files.map((h) => (
                <SearchHitRow
                  key={`file-${h.id}`}
                  hit={h}
                  onNavigate={() => {
                    setQ("");
                    setDebounced("");
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchHitRow({
  hit,
  onNavigate,
}: {
  hit: SearchFolderHit | SearchFileHit;
  onNavigate: () => void;
}) {
  if (hit.kind === "folder") {
    return (
      <li>
        <Link
          href={folderHref(hit.id)}
          prefetch
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 hover:bg-muted/60"
        >
          <Folder className="size-4 shrink-0 text-amber-600/80" />
          <span className="min-w-0 flex-1 truncate font-medium">{hit.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">Folder</span>
        </Link>
      </li>
    );
  }

  const parent = folderHref(hit.folderId);
  return (
    <li>
      <Link
        href={parent}
        prefetch
        onClick={onNavigate}
        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/60"
      >
        <FileText className="size-4 shrink-0 text-red-600/80" />
        <span className="min-w-0 flex-1 truncate font-medium">{hit.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatBytes(hit.sizeBytes)} · file
        </span>
      </Link>
    </li>
  );
}
