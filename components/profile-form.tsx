"use client";

import {
  changePasswordAction,
  setProfileImageKeyAction,
  updateProfileNameAction,
} from "@/lib/actions/profile";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
import { isAdminUser } from "@/lib/auth-user";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function ProfileForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending, refetch } = authClient.useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const user = session?.user;
  const admin = isAdminUser(user);

  const updateNameMut = useMutation({
    mutationFn: updateProfileNameAction,
    onSuccess: async () => {
      await refetch();
      router.refresh();
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const imageKeyMut = useMutation({
    mutationFn: setProfileImageKeyAction,
    onSuccess: async () => {
      await refetch();
      router.refresh();
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const passwordMut = useMutation({
    mutationFn: changePasswordAction,
  });

  const busy =
    updateNameMut.isPending ||
    imageKeyMut.isPending ||
    passwordMut.isPending;

  if (isPending || !user) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
    );
  }

  const displayName = nameDirty ? name : user.name;
  const displayImage = user.image;

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const nextName = nameDirty ? name.trim() : user.name;
    if (!nextName) {
      toast.error("Name is required");
      return;
    }
    const tid = toast.loading("Saving profile…");
    updateNameMut.mutate(nextName, {
      onSuccess: () => {
        toast.success("Profile updated", { id: tid });
        setNameDirty(false);
        setName("");
      },
      onError: (e) => {
        toast.error(
          e instanceof Error ? e.message : "Update failed",
          { id: tid },
        );
      },
    });
  }

  async function onAvatarSelected(f: File) {
    if (!user) return;
    const tid = toast.loading("Uploading photo…");
    try {
      const fd = new FormData();
      fd.set("file", f);
      const up = await fetch("/api/profile/avatar", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!up.ok) {
        const j = (await up.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? "Upload failed", { id: tid });
        return;
      }
      const { key } = (await up.json()) as { key: string };
      imageKeyMut.mutate(key, {
        onSuccess: () => toast.success("Photo updated", { id: tid }),
        onError: (e) => {
          toast.error(
            e instanceof Error ? e.message : "Could not save avatar",
            { id: tid },
          );
        },
      });
    } catch {
      toast.error("Upload failed", { id: tid });
    }
  }

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    const tid = toast.loading("Updating password…");
    passwordMut.mutate(
      { currentPassword, newPassword, revokeOtherSessions: false },
      {
        onSuccess: () => {
          toast.success("Password updated", { id: tid });
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (e) => {
          toast.error(
            e instanceof Error ? e.message : "Password change failed",
            { id: tid },
          );
        },
      },
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-medium">Profile</h1>
        <div className="flex items-center gap-3 text-sm">
          {admin ? (
            <>
              <Link
                href="/admin/analytics"
                className="text-muted-foreground underline-offset-2 hover:underline"
              >
                Analytics
              </Link>
              <Link
                href="/admin/users"
                className="text-muted-foreground underline-offset-2 hover:underline"
              >
                Users
              </Link>
            </>
          ) : null}
          <Link
            href="/files"
            className="text-muted-foreground underline-offset-2 hover:underline"
          >
            Files
          </Link>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={displayName}
            image={displayImage}
            userId={user.id}
            size={72}
          />
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void onAvatarSelected(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Change photo
            </Button>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, or GIF · max 2 MB
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={(e) => void saveProfile(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user.email} disabled className="opacity-80" />
          <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={nameDirty ? name : user.name}
            onChange={(e) => {
              setNameDirty(true);
              setName(e.target.value);
            }}
            required
            disabled={busy}
          />
        </div>
        <Button type="submit" disabled={busy}>
          Save profile
        </Button>
      </form>

      <form onSubmit={(e) => void changePassword(e)} className="space-y-4 pt-4 border-t border-border/60">
        <h2 className="text-sm font-medium">Password</h2>
        <div className="space-y-2">
          <Label htmlFor="cur">Current password</Label>
          <Input
            id="cur"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newp">New password</Label>
          <Input
            id="newp"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            disabled={busy}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newp2">Confirm new password</Label>
          <Input
            id="newp2"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            disabled={busy}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={busy}>
          Change password
        </Button>
      </form>
    </div>
  );
}
