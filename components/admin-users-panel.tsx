"use client";

import {
  banUserAction,
  listAdminUsersAction,
  setUserRoleAction,
  unbanUserAction,
} from "@/lib/actions/admin";
import type { AdminListUser } from "@/lib/admin-types";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
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
import { MoreHorizontal } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AdminUsersPanel({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();
  const [banTarget, setBanTarget] = useState<AdminListUser | null>(null);
  const [banReasonInput, setBanReasonInput] = useState("");

  const { data, isPending: loading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listAdminUsersAction,
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    if (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load users",
      );
    }
  }, [error]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const roleMut = useMutation({
    mutationFn: setUserRoleAction,
    onSuccess: () => {
      toast.success("Done");
      void invalidate();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Request failed"),
  });

  const banMut = useMutation({
    mutationFn: banUserAction,
    onSuccess: () => {
      toast.success("Done");
      void invalidate();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Request failed"),
  });

  const unbanMut = useMutation({
    mutationFn: unbanUserAction,
    onSuccess: () => {
      toast.success("Done");
      void invalidate();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Request failed"),
  });

  const adminBusy =
    roleMut.isPending || banMut.isPending || unbanMut.isPending;

  function openBanDialog(u: AdminListUser) {
    setBanReasonInput("");
    setBanTarget(u);
  }

  function confirmBan() {
    const u = banTarget;
    if (!u) return;
    const reason = banReasonInput.trim() || undefined;
    setBanTarget(null);
    banMut.mutate({ userId: u.id, banReason: reason });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <Dialog
        open={banTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBanTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban user</DialogTitle>
            <DialogDescription>
              {banTarget
                ? `Optional note for ${banTarget.email}.`
                : "Optional ban reason."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ban-reason">Reason</Label>
            <Input
              id="ban-reason"
              value={banReasonInput}
              onChange={(e) => setBanReasonInput(e.target.value)}
              placeholder="Optional"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmBan();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBanTarget(null)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmBan}>
              Ban user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="mb-8 rounded-2xl border border-border/80 bg-card/50 p-5 shadow-sm ring-1 ring-black/[0.04] dark:bg-card/30 dark:ring-white/[0.06] sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Administration
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "…" : `${total} total`} · roles and bans
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-12">Loading users…</p>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card/30 shadow-sm dark:bg-card/15">
          {users.map((u) => {
            const self = u.id === currentUserId;
            const isAdminRole = (u.role ?? "user") === "admin";
            return (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    name={u.name}
                    image={u.image}
                    userId={u.id}
                    size={40}
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {u.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isAdminRole ? "admin" : "user"}
                      {u.banned ? " · banned" : ""}
                      {self ? " · you" : ""}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label="User actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      disabled={self || isAdminRole || adminBusy}
                      onClick={() => {
                        const tid = toast.loading("Promoting…");
                        roleMut.mutate(
                          { userId: u.id, role: "admin" },
                          { onSettled: () => toast.dismiss(tid) },
                        );
                      }}
                    >
                      Make admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={self || !isAdminRole || adminBusy}
                      onClick={() => {
                        const tid = toast.loading("Updating role…");
                        roleMut.mutate(
                          { userId: u.id, role: "user" },
                          { onSettled: () => toast.dismiss(tid) },
                        );
                      }}
                    >
                      Make user
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={self || !!u.banned || adminBusy}
                      onClick={() => openBanDialog(u)}
                    >
                      Ban user
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={self || !u.banned || adminBusy}
                      onClick={() => {
                        const tid = toast.loading("Unbanning…");
                        unbanMut.mutate(
                          { userId: u.id },
                          { onSettled: () => toast.dismiss(tid) },
                        );
                      }}
                    >
                      Unban user
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
