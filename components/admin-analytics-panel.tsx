"use client";

import { getAdminAnalyticsAction } from "@/lib/actions/analytics";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const digits = v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${units[i]}`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function AdminAnalyticsPanel() {
  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: getAdminAnalyticsAction,
  });

  useEffect(() => {
    if (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load analytics",
      );
    }
  }, [error]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {isPending
              ? "Loading…"
              : data
                ? `Snapshot · ${new Date(data.generatedAt).toLocaleString()}`
                : "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Link
            href="/admin/users"
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            Users
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            Files
          </Link>
        </div>
      </div>

      {isPending || !data ? (
        <p className="text-sm text-muted-foreground py-12">
          Loading analytics…
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Overview</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Users"
                value={String(data.users.total)}
                hint={`${data.users.admins} admin · ${data.users.banned} banned · ${data.users.emailVerified} verified email`}
              />
              <StatCard
                label="Linked accounts"
                value={String(data.accounts.total)}
                hint="Better Auth account rows (password / OAuth)"
              />
              <StatCard
                label="Sessions"
                value={String(data.sessions.total)}
                hint={`${data.sessions.activeNonExpired} not expired yet`}
              />
              <StatCard
                label="Storage"
                value={formatBytes(data.storage.totalBytes)}
                hint={`${data.storage.files} files · ${data.storage.folders} folders`}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Sign-up &amp; access</h2>
            <div className="rounded-lg border border-border/60 divide-y divide-border/60 text-sm">
              <div className="flex flex-wrap justify-between gap-2 px-3 py-2.5">
                <span className="text-muted-foreground">DB invite phrase</span>
                <span className="font-medium">
                  {data.signup.dbInviteActive ? "Active" : "None / expired"}
                  {data.signup.dbInviteExpiresAt
                    ? ` · expires ${new Date(data.signup.dbInviteExpiresAt).toLocaleString()}`
                    : ""}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 px-3 py-2.5">
                <span className="text-muted-foreground">
                  <code className="text-xs">SIGNUP_PASSPHRASE</code> env
                </span>
                <span className="font-medium">
                  {data.signup.envPassphraseConfigured ? "Set" : "Not set"}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 px-3 py-2.5">
                <span className="text-muted-foreground">
                  <code className="text-xs">ADMIN_EMAILS</code> env
                </span>
                <span className="font-medium">
                  {data.signup.adminEmailsConfigured ? "Set" : "Not set"}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Files by MIME type</h2>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">MIME</th>
                    <th className="px-3 py-2 font-medium tabular-nums">Files</th>
                    <th className="px-3 py-2 font-medium tabular-nums">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.mimeTypes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-muted-foreground"
                      >
                        No files yet
                      </td>
                    </tr>
                  ) : (
                    data.mimeTypes.map((r) => (
                      <tr key={r.mimeType}>
                        <td className="px-3 py-2 max-w-[280px] truncate font-mono text-xs">
                          {r.mimeType || "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{r.files}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatBytes(r.bytes)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Top uploaders</h2>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium tabular-nums">
                      Files
                    </th>
                    <th className="px-3 py-2 font-medium tabular-nums">
                      Total size
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.topUploaders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-muted-foreground"
                      >
                        No uploads yet
                      </td>
                    </tr>
                  ) : (
                    data.topUploaders.map((r) => (
                      <tr key={r.userId}>
                        <td className="px-3 py-2">
                          <p className="font-medium truncate max-w-[220px]">
                            {r.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                            {r.email}
                          </p>
                          <p className="text-[10px] text-muted-foreground/80 font-mono mt-0.5 truncate max-w-[320px]">
                            {r.userId}
                          </p>
                        </td>
                        <td className="px-3 py-2 tabular-nums align-top">
                          {r.fileCount}
                        </td>
                        <td className="px-3 py-2 tabular-nums align-top">
                          {formatBytes(r.totalBytes)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Recent files</h2>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Uploader</th>
                    <th className="px-3 py-2 font-medium tabular-nums">Size</th>
                    <th className="px-3 py-2 font-medium">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.recentFiles.map((f) => (
                    <tr key={f.id}>
                      <td className="px-3 py-2 align-top max-w-[200px]">
                        <p className="font-medium truncate">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[360px]">
                          {f.s3Key}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.mimeType}
                          {f.folderId ? ` · folder ${f.folderId}` : " · root"}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top max-w-[180px]">
                        <p className="truncate">{f.uploadedBy.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {f.uploadedBy.email}
                        </p>
                      </td>
                      <td className="px-3 py-2 tabular-nums align-top whitespace-nowrap">
                        {formatBytes(f.sizeBytes)}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(f.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Recent sessions</h2>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">Expires</th>
                    <th className="px-3 py-2 font-medium">IP</th>
                    <th className="px-3 py-2 font-medium">User agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.recentSessions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 align-top max-w-[200px]">
                        <p className="truncate">{s.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.userEmail}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground/80 truncate">
                          {s.userId}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top text-xs whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 align-top text-xs whitespace-nowrap">
                        {new Date(s.expiresAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 align-top text-xs font-mono">
                        {s.ipAddress ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-xs max-w-[240px]">
                        <span className="line-clamp-2 break-all text-muted-foreground">
                          {s.userAgent ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
