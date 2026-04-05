"use client";

import {
  createFolderAction,
  deleteFileAction,
  deleteFolderAction,
  getFolderBreadcrumbsAction,
  getStorageFileInfoAction,
  getStorageFolderInfoAction,
  listStorageAction,
  renameFolderAction,
} from "@/lib/actions/storage";
import type {
  StorageFileInfo,
  StorageFileRow,
  StorageFolderInfo,
  StorageFolderRow,
} from "@/lib/actions/storage";
import { folderHref } from "@/lib/files-url";
import { generateInvitePhraseAction } from "@/lib/actions/invite";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StorageSearch } from "@/components/files/storage-search";
import { FilePreviewPanel } from "@/components/files/file-preview-panel";
import { UserAvatar } from "@/components/user-avatar";
import {
  ExternalLink,
  FileText,
  Folder,
  Info,
  Loader2,
  LogOut,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

type Crumb = { id: string | null; label: string };

type FolderRow = StorageFolderRow;
type FileRow = StorageFileRow;

type DeleteTarget =
  | { kind: "folder"; id: string; label: string }
  | { kind: "file"; id: string; label: string };

type InfoTarget =
  | { kind: "folder"; id: string }
  | { kind: "file"; id: string };

function formatDetailBytes(n: number): string {
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

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-border/50 py-2.5 text-sm last:border-0 sm:grid-cols-[minmax(0,7.5rem)_1fr] sm:gap-4">
      <div className="text-muted-foreground">{label}</div>
      <div className="break-all text-xs text-foreground">{children}</div>
    </div>
  );
}

function FileInfoBody({ info }: { info: StorageFileInfo }) {
  return (
    <div className="space-y-0">
      <DetailRow label="Name">{info.name}</DetailRow>
      <DetailRow label="File ID">{info.id}</DetailRow>
      <DetailRow label="MIME type">{info.mimeType}</DetailRow>
      <DetailRow label="Size">{formatDetailBytes(info.sizeBytes)}</DetailRow>
      <DetailRow label="S3 key">{info.s3Key}</DetailRow>
      <DetailRow label="Uploaded">
        {new Date(info.createdAt).toLocaleString()}
      </DetailRow>
      <DetailRow label="Uploaded by">
        {info.uploadedBy.name} · {info.uploadedBy.email}
        <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
          {info.uploadedBy.id}
        </span>
      </DetailRow>
      <DetailRow label="Location">
        {info.containingFolder ? (
          <>
            <Link
              href={folderHref(info.folderId)}
              className="text-primary underline-offset-2 hover:underline"
            >
              {info.containingFolder.name}
            </Link>
            <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
              folder ID: {info.folderId}
            </span>
          </>
        ) : (
          "Library root"
        )}
      </DetailRow>
    </div>
  );
}

function FolderInfoBody({ info }: { info: StorageFolderInfo }) {
  return (
    <div className="space-y-0">
      <DetailRow label="Name">{info.name}</DetailRow>
      <DetailRow label="Folder ID">{info.id}</DetailRow>
      <DetailRow label="Path">{info.path}</DetailRow>
      <DetailRow label="Created">
        {new Date(info.createdAt).toLocaleString()}
      </DetailRow>
      <DetailRow label="Created by">
        {info.createdBy.name} · {info.createdBy.email}
        <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
          {info.createdBy.id}
        </span>
      </DetailRow>
      <DetailRow label="Parent">
        {info.parent ? (
          <Link
            href={folderHref(info.parent.id)}
            className="text-primary underline-offset-2 hover:underline"
          >
            {info.parent.name}
          </Link>
        ) : (
          "— (library root)"
        )}
      </DetailRow>
      <DetailRow label="Contents">
        {info.stats.files} file{info.stats.files === 1 ? "" : "s"} ·{" "}
        {info.stats.subfolders} subfolder
        {info.stats.subfolders === 1 ? "" : "s"}
      </DetailRow>
    </div>
  );
}

export function FileLibrary({
  userId,
  userName,
  userImage,
  isAdmin,
  folderId = null,
}: {
  userId: string;
  userName: string;
  userImage?: string | null;
  isAdmin: boolean;
  folderId?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  /** Directory whose contents we list (URL segment). */
  const parentId = folderId;

  const [folderName, setFolderName] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [renameTarget, setRenameTarget] = useState<FolderRow | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [infoTarget, setInfoTarget] = useState<InfoTarget | null>(null);
  const { data: sessionData } = authClient.useSession();
  const liveUser = sessionData?.user;
  const displayName = liveUser?.name ?? userName;
  const displayImage = liveUser?.image ?? userImage ?? null;

  const {
    data: storageData,
    isPending: storageLoading,
    error: storageError,
  } = useQuery({
    queryKey: ["storage", parentId],
    queryFn: () => listStorageAction(parentId),
  });

  const {
    data: crumbsData,
    isPending: crumbsLoading,
    error: crumbsError,
  } = useQuery({
    queryKey: ["storage-breadcrumbs", folderId],
    queryFn: () => getFolderBreadcrumbsAction(folderId),
    enabled: folderId != null,
  });

  const crumbs: Crumb[] =
    folderId == null
      ? [{ id: null, label: "Library" }]
      : (crumbsData?.crumbs ?? [
          { id: null, label: "Library" },
          { id: folderId, label: "…" },
        ]);

  const treeLoading =
    storageLoading || (folderId != null && crumbsLoading);

  const folders = storageData?.folders ?? [];
  const files = storageData?.files ?? [];

  useEffect(() => {
    const err = storageError ?? crumbsError;
    if (!err) return;
    const msg = err instanceof Error ? err.message : "";
    if (/folder not found/i.test(msg)) {
      toast.error("Folder not found");
      router.replace("/");
      return;
    }
    toast.error(msg || "Could not load library");
  }, [storageError, crumbsError, router]);

  const invalidateStorage = () => {
    void queryClient.invalidateQueries({ queryKey: ["storage"] });
    void queryClient.invalidateQueries({ queryKey: ["storage-breadcrumbs"] });
    void queryClient.invalidateQueries({ queryKey: ["storage-search"] });
  };

  const detailQuery = useQuery({
    queryKey: ["storage-detail", infoTarget?.kind, infoTarget?.id],
    queryFn: async () => {
      if (!infoTarget) throw new Error("No selection");
      if (infoTarget.kind === "file") {
        const data = await getStorageFileInfoAction(infoTarget.id);
        return { kind: "file" as const, data };
      }
      const data = await getStorageFolderInfoAction(infoTarget.id);
      return { kind: "folder" as const, data };
    },
    enabled: infoTarget != null,
  });

  const createFolderMut = useMutation({
    mutationFn: (name: string) =>
      createFolderAction({ name, parentId }),
    onSuccess: () => void invalidateStorage(),
  });

  const deleteFolderMut = useMutation({
    mutationFn: deleteFolderAction,
    onSuccess: () => void invalidateStorage(),
    onError: () => toast.error("Could not delete folder"),
  });

  const deleteFileMut = useMutation({
    mutationFn: deleteFileAction,
    onSuccess: () => void invalidateStorage(),
    onError: () => toast.error("Could not delete file"),
  });

  const renameFolderMut = useMutation({
    mutationFn: (input: { folderId: string; name: string }) =>
      renameFolderAction(input),
    onSuccess: () => {
      void invalidateStorage();
    },
  });

  const inviteMut = useMutation({
    mutationFn: generateInvitePhraseAction,
    onError: () => toast.error("Could not generate phrase"),
  });

  const busy =
    createFolderMut.isPending ||
    deleteFolderMut.isPending ||
    deleteFileMut.isPending ||
    renameFolderMut.isPending ||
    inviteMut.isPending ||
    uploadBusy;

  function createFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderName.trim()) return;
    const toastId = toast.loading("Creating folder…");
    createFolderMut.mutate(folderName.trim(), {
      onSuccess: () => {
        setFolderName("");
        toast.success("Folder created", { id: toastId });
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Could not create folder",
          { id: toastId },
        );
      },
    });
  }

  function generateInvite() {
    const toastId = toast.loading("Generating invitation phrase…");
    inviteMut.mutate(undefined, {
      onSuccess: (data) => {
        const expHint = data.expiresAt
          ? `Valid until ${new Date(data.expiresAt).toLocaleString()}`
          : undefined;
        void (async () => {
          try {
            await navigator.clipboard.writeText(data.phrase);
            toast.success("Copied invitation phrase to clipboard", {
              id: toastId,
              description: expHint,
            });
          } catch {
            toast.message(data.message, {
              id: toastId,
              description: [data.phrase, expHint].filter(Boolean).join(" · "),
            });
          }
        })();
      },
      onError: () =>
        toast.error("Could not generate phrase", { id: toastId }),
    });
  }

  function openRenameDialog(f: FolderRow) {
    setRenameInput(f.name);
    setRenameTarget(f);
  }

  function confirmRename() {
    const f = renameTarget;
    if (!f) return;
    const next = renameInput.trim();
    if (!next) {
      toast.error("Folder name is required");
      return;
    }
    const toastId = toast.loading("Renaming folder…");
    renameFolderMut.mutate(
      { folderId: f.id, name: next },
      {
        onSuccess: () => {
          setRenameTarget(null);
          toast.success("Folder renamed", { id: toastId });
        },
        onError: (e) => {
          toast.error(
            e instanceof Error ? e.message : "Could not rename folder",
            { id: toastId },
          );
        },
      },
    );
  }

  function executeDelete(target: DeleteTarget) {
    if (target.kind === "folder") {
      const toastId = toast.loading("Deleting folder…");
      deleteFolderMut.mutate(target.id, {
        onSuccess: () => toast.success("Folder deleted", { id: toastId }),
        onError: () => toast.error("Could not delete folder", { id: toastId }),
      });
      return;
    }
    const toastId = toast.loading("Deleting file…");
    deleteFileMut.mutate(target.id, {
      onSuccess: () => toast.success("File deleted", { id: toastId }),
      onError: () => toast.error("Could not delete file", { id: toastId }),
    });
  }

  async function putFileToStorage(f: File): Promise<boolean> {
    const toastId = toast.loading(`Preparing upload: ${f.name}`);
    try {
      const prep = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: f.name,
          contentType: f.type || "application/octet-stream",
          size: f.size,
          folderId: parentId,
        }),
      });
      if (!prep.ok) {
        const j = (await prep.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? "Upload not allowed", { id: toastId });
        return false;
      }
      const { presignedUrl } = (await prep.json()) as { presignedUrl: string };

      const contentType = f.type || "application/octet-stream";
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            toast.loading(`Uploading ${f.name}… ${pct}%`, { id: toastId });
          } else {
            toast.loading(`Uploading ${f.name}…`, { id: toastId });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else
            reject(
              new Error(xhr.responseText || `Upload failed (${xhr.status})`),
            );
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(f);
      });

      toast.success(`Uploaded ${f.name}`, { id: toastId });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload to storage failed";
      toast.error(message, { id: toastId });
      return false;
    }
  }

  async function uploadStagedFiles() {
    if (!stagedFiles.length) return;
    setUploadBusy(true);
    try {
      for (const f of stagedFiles) {
        await putFileToStorage(f);
      }
      await invalidateStorage();
    } finally {
      setUploadBusy(false);
      setStagedFiles([]);
      setUploadDialogOpen(false);
    }
  }

  const onDrop = useCallback((accepted: File[]) => {
    setStagedFiles((prev) => {
      const map = new Map(
        prev.map((f) => [`${f.name}:${f.size}:${f.lastModified}`, f]),
      );
      for (const f of accepted) {
        map.set(`${f.name}:${f.size}:${f.lastModified}`, f);
      }
      return [...map.values()];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noKeyboard: true,
  });

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === "folder"
                ? "Delete this folder?"
                : "Delete this file?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "folder"
                ? `“${deleteTarget.label}” and everything inside it will be removed. This cannot be undone.`
                : `“${deleteTarget?.label ?? ""}” will be removed. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={(e) => {
                e.preventDefault();
                const t = deleteTarget;
                setDeleteTarget(null);
                if (t) void executeDelete(t);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
            <DialogDescription>
              {renameTarget
                ? `New name for “${renameTarget.name}”.`
                : "Enter a new folder name."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-folder">Name</Label>
            <Input
              id="rename-folder"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              disabled={busy}
              placeholder="Folder name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameTarget(null)}
              disabled={renameFolderMut.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmRename}
              disabled={renameFolderMut.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={infoTarget !== null}
        onOpenChange={(open) => {
          if (!open) setInfoTarget(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Details</DialogTitle>
            <DialogDescription>
              {infoTarget?.kind === "file"
                ? "Metadata for this file."
                : infoTarget?.kind === "folder"
                  ? "Metadata for this folder."
                  : ""}
            </DialogDescription>
          </DialogHeader>
          {detailQuery.isPending ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : detailQuery.error ? (
            <p className="text-sm text-destructive py-4">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Could not load details"}
            </p>
          ) : detailQuery.data?.kind === "file" ? (
            <FileInfoBody info={detailQuery.data.data} />
          ) : detailQuery.data?.kind === "folder" ? (
            <FolderInfoBody info={detailQuery.data.data} />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) setStagedFiles([]);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload files</DialogTitle>
            <DialogDescription>
              Drag and drop files here or click to browse. Uploads go into{" "}
              <span className="font-medium text-foreground">
                {crumbs[crumbs.length - 1]?.label ?? "Library"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div
            {...getRootProps()}
            className={cn(
              "cursor-pointer rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:bg-muted/50",
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto size-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              {isDragActive ? "Drop files here" : "Drop files or click to select"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Multiple files supported · same rules as before (size & type checks
              on the server)
            </p>
          </div>
          {stagedFiles.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 px-3 py-2 text-sm">
              {stagedFiles.map((f) => (
                <li
                  key={`${f.name}-${f.size}-${f.lastModified}`}
                  className="flex items-center justify-between gap-2 py-1"
                >
                  <span className="truncate">{f.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setStagedFiles([]);
              }}
              disabled={uploadBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={uploadBusy || stagedFiles.length === 0}
              onClick={() => void uploadStagedFiles()}
            >
              {uploadBusy
                ? "Uploading…"
                : stagedFiles.length
                  ? `Upload ${stagedFiles.length} file${stagedFiles.length === 1 ? "" : "s"}`
                  : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FilePreviewPanel
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
      <header className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            name={displayName}
            image={displayImage}
            userId={liveUser?.id ?? userId}
            size={44}
          />
          <div className="min-w-0">
            <h1 className="text-lg font-medium tracking-tight">Files</h1>
            <p className="text-sm text-muted-foreground truncate">
              {displayName}
              {isAdmin ? " · admin" : " · view only"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/profile">Profile</Link>
          </Button>
          {isAdmin ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/analytics">Analytics</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/users">Users</Link>
              </Button>
            </>
          ) : null}
          {isAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => generateInvite()}
            >
              New invite phrase
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
          >
            <LogOut className="size-4 mr-1" />
            Sign out
          </Button>
        </div>
      </header>

      <StorageSearch className="w-full max-w-xl pb-2" />

      <nav className="flex flex-wrap gap-1 text-sm py-4 text-muted-foreground">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span
              key={`${c.id ?? "root"}-${i}`}
              className="flex items-center gap-1"
            >
              {i > 0 && <span className="opacity-50">/</span>}
              {last ? (
                <span className="text-foreground font-medium">{c.label}</span>
              ) : (
                <Link
                  href={folderHref(c.id)}
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {isAdmin && (
        <section className="space-y-4 pb-8">
          <form
            onSubmit={(e) => void createFolder(e)}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="space-y-1 flex-1 min-w-[12rem]">
              <Label htmlFor="newfolder" className="text-xs">
                New folder
              </Label>
              <Input
                id="newfolder"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. Invoices"
                disabled={busy}
              />
            </div>
            <Button type="submit" size="sm" disabled={busy}>
              Create
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setStagedFiles([]);
                setUploadDialogOpen(true);
              }}
            >
              <Upload className="size-4 mr-1" />
              Upload files
            </Button>
          </form>
        </section>
      )}

      {treeLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <ul className="space-y-1">
          {folders.map((f) => (
            <li key={f.id} className="rounded-md hover:bg-muted/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={busy}
                    className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Folder className="size-4 shrink-0 text-amber-600/80" />
                    <span className="truncate font-medium">{f.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuItem
                    onSelect={() => router.push(folderHref(f.id))}
                  >
                    Open folder
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setInfoTarget({ kind: "folder", id: f.id })}
                  >
                    <Info className="size-4 opacity-70" />
                    Info
                  </DropdownMenuItem>
                  {isAdmin ? (
                    <>
                      <DropdownMenuItem onSelect={() => openRenameDialog(f)}>
                        <Pencil className="size-4 opacity-70" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => {
                          setPreviewFile(null);
                          setDeleteTarget({
                            kind: "folder",
                            id: f.id,
                            label: f.name,
                          });
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
          {files.map((file) => (
            <li key={file.id} className="rounded-md hover:bg-muted/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={busy}
                    className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FileText className="size-4 shrink-0 text-red-600/80" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {(file.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuItem onSelect={() => setPreviewFile(file)}>
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={`/api/storage/files/${file.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-4 opacity-70" />
                      Download
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      setInfoTarget({ kind: "file", id: file.id })
                    }
                  >
                    <Info className="size-4 opacity-70" />
                    Info
                  </DropdownMenuItem>
                  {isAdmin ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() =>
                          setDeleteTarget({
                            kind: "file",
                            id: file.id,
                            label: file.name,
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
          {!folders.length && !files.length && (
            <li className="text-sm text-muted-foreground py-10 text-center">
              {isAdmin
                ? "This folder is empty. Create a folder or upload files."
                : "No files here yet."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
