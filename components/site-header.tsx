"use client";

import type { ReactNode } from "react";
import { generateInvitePhraseAction } from "@/lib/actions/invite";
import { authClient } from "@/lib/auth-client";
import { isAdminUser } from "@/lib/auth-user";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  FolderOpen,
  Gift,
  LogOut,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_35%,transparent)]"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const admin = isAdminUser(user);

  const libraryActive = pathname === "/" || pathname.startsWith("/files");
  const profileActive = pathname === "/profile";
  const analyticsActive = pathname.startsWith("/admin/analytics");
  const usersActive = pathname.startsWith("/admin/users");

  const isAuthPage = pathname === "/login" || pathname === "/register";

  const inviteMut = useMutation({
    mutationFn: generateInvitePhraseAction,
    onError: () => toast.error("Could not generate phrase"),
  });

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
      onError: () => toast.error("Could not generate phrase", { id: toastId }),
    });
  }

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 shadow-[0_1px_0_color-mix(in_oklch,var(--foreground)_6%,transparent)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 text-foreground"
        >
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary",
              "ring-1 ring-primary/20 transition-[transform,box-shadow] group-hover:bg-primary/16 group-hover:shadow-sm",
            )}
          >
            <FolderOpen className="size-[18px]" strokeWidth={2} aria-hidden />
          </span>
          <span className="font-semibold tracking-tight">Library</span>
        </Link>

        <nav
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden"
          aria-label="Main navigation"
        >
          {user ? (
            <>
              <NavLink href="/" active={libraryActive}>
                Library
              </NavLink>
              <NavLink href="/profile" active={profileActive}>
                Profile
              </NavLink>
              {admin ? (
                <>
                  <NavLink href="/admin/analytics" active={analyticsActive}>
                    <span className="inline-flex items-center gap-1.5">
                      <BarChart3 className="size-3.5 opacity-70" aria-hidden />
                      Analytics
                    </span>
                  </NavLink>
                  <NavLink href="/admin/users" active={usersActive}>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5 opacity-70" aria-hidden />
                      Users
                    </span>
                  </NavLink>
                </>
              ) : null}
            </>
          ) : isAuthPage ? (
            <>
              <NavLink href="/" active={false}>
                Home
              </NavLink>
              <NavLink href="/login" active={pathname === "/login"}>
                Sign in
              </NavLink>
              <NavLink href="/register" active={pathname === "/register"}>
                Register
              </NavLink>
            </>
          ) : (
            <>
              <NavLink href="/login" active={pathname === "/login"}>
                Sign in
              </NavLink>
              <NavLink href="/register" active={pathname === "/register"}>
                Register
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 gap-2 rounded-full pl-1.5 pr-2.5 sm:pr-3"
                  aria-label="Account menu"
                >
                  <UserAvatar
                    name={user.name}
                    image={user.image}
                    userId={user.id}
                    size={28}
                  />
                  <span className="hidden max-w-[7.5rem] truncate text-sm font-medium sm:inline">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                  {admin ? (
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                      Administrator
                    </p>
                  ) : null}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <UserRound className="size-4 opacity-70" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {admin ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/analytics" className="cursor-pointer">
                        <BarChart3 className="size-4 opacity-70" />
                        Analytics
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/users" className="cursor-pointer">
                        <Users className="size-4 opacity-70" />
                        Users
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={inviteMut.isPending}
                      onSelect={() => generateInvite()}
                    >
                      <Gift className="size-4 opacity-70" />
                      New invite phrase
                    </DropdownMenuItem>
                  </>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => void signOut()}
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : isPending ? (
            <div
              className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted/90"
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
