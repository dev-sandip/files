import { FolderOpen, Lock, Shield } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: FolderOpen,
    title: "Folders & files",
    text: "Browse a single library with clear structure—documents, media, and more.",
  },
  {
    icon: Shield,
    title: "Roles",
    text: "Admins curate uploads and structure; everyone else can view and open what's shared.",
  },
  {
    icon: Lock,
    title: "Invite-only",
    text: "New accounts need a valid invitation phrase—no open registration by default.",
  },
];

export function LandingPage() {
  return (
    <div className="relative min-h-0 flex-1 bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(48vh,420px)] bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_65%)]"
      />
      <main className="relative mx-auto flex min-h-0 max-w-6xl flex-col px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:pt-20">

        <header className="mb-20 max-w-2xl">
          <h1 className="mb-6 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-tight">
            One place for shared files.{" "}
            <span className="font-normal text-muted-foreground">
              Organized, controlled, easy to open.
            </span>
          </h1>

          <p className="mb-10 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sign in to browse the library. Admins manage folders and uploads;
            viewers get a calm, read-only experience.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-full px-7 text-sm font-medium shadow-md transition-[transform,box-shadow] hover:shadow-lg active:scale-[0.98]"
              style={{ background: "#2a6b4a", color: "#ffffff" }}
            >
              Sign in
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M2 6.5h9M7.5 2.5l4 4-4 4" />
              </svg>
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-full border border-border/90 bg-card/60 px-7 text-sm font-medium shadow-sm backdrop-blur-sm transition-colors hover:bg-accent/80"
            >
              Register with invite
            </Link>
          </div>
        </header>

        <section className="mb-auto grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/40 p-6 shadow-sm ring-1 ring-black/[0.03] transition-[box-shadow,background] hover:bg-card/60 hover:shadow-md dark:bg-card/25 dark:ring-white/[0.05] dark:hover:bg-card/35"
            >
              <div
                className="flex size-10 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-[1.02]"
                style={{
                  background: "#e6f0eb",
                  color: "#2a6b4a",
                  // ringColor: "#c2ddd0",
                }}
              >
                <Icon className="size-[18px]" strokeWidth={1.65} aria-hidden />
              </div>
              <div>
                <p className="mb-1.5 font-medium">{title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </section>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-border/80 pt-10">
          <p className="text-sm font-medium">Sandip Sapkota</p>
          <div className="flex flex-wrap gap-6">
            <a
              href="mailto:contact@thesandip.dev"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              contact@thesandip.dev
            </a>
            <a
              href="https://github.com/dev-sandip"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </footer>

      </main>
    </div>
  );
}