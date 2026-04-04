"use client";

import { adminListUsers, adminPost, type AdminListUser } from "@/lib/admin-http";
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
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function AdminUsersPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminListUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [banTarget, setBanTarget] = useState<AdminListUser | null>(null);
  const [banReasonInput, setBanReasonInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListUsers();
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(label: string, path: string, body: Record<string, unknown>) {
    const tid = toast.loading(label);
    try {
      await adminPost(path, body);
      toast.success("Done", { id: tid });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed", { id: tid });
    }
  }

  function openBanDialog(u: AdminListUser) {
    setBanReasonInput("");
    setBanTarget(u);
  }

  function confirmBan() {
    const u = banTarget;
    if (!u) return;
    const reason = banReasonInput.trim() || undefined;
    setBanTarget(null);
    void run("Banning user…", "/admin/ban-user", {
      userId: u.id,
      banReason: reason,
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">Users</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "…" : `${total} total`} · roles and bans
          </p>
        </div>
        <Link
          href="/files"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Back to files
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-12">Loading users…</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
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
                      disabled={self || isAdminRole}
                      onClick={() =>
                        void run(
                          "Promoting…",
                          "/admin/set-role",
                          { userId: u.id, role: "admin" },
                        )
                      }
                    >
                      Make admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={self || !isAdminRole}
                      onClick={() =>
                        void run(
                          "Updating role…",
                          "/admin/set-role",
                          { userId: u.id, role: "user" },
                        )
                      }
                    >
                      Make user
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={self || !!u.banned}
                      onClick={() => openBanDialog(u)}
                    >
                      Ban user
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={self || !u.banned}
                      onClick={() =>
                        void run(
                          "Unbanning…",
                          "/admin/unban-user",
                          { userId: u.id },
                        )
                      }
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
