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
    <div className="relative min-h-screen bg-background text-foreground">
      <main className="relative mx-auto flex min-h-screen max-w-[900px] flex-col px-6 pb-16 pt-[18vh] sm:px-12">

        {/* Hero */}
        <header className="mb-24">
          <h1 className="mb-6 max-w-[640px] text-[clamp(36px,5.5vw,58px)] font-semibold leading-[1.07] tracking-tight">
            One place for shared files.{" "}
            <span className="font-normal text-muted-foreground">
              Organized, controlled, easy to open.
            </span>
          </h1>

          <p className="mb-10 max-w-[400px] text-base leading-relaxed text-muted-foreground">
            Sign in to browse the library. Admins manage folders and uploads;
            viewers get a calm, read-only experience.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-full px-6 text-sm font-medium transition-opacity hover:opacity-85"
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
              >
                <path d="M2 6.5h9M7.5 2.5l4 4-4 4" />
              </svg>
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center rounded-full border border-border px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Register with invite
            </Link>
          </div>
        </header>

        {/* Divider */}
        <div className="mb-10 h-px bg-border" />

        {/* Features */}
        <section className="mb-auto grid gap-px bg-border sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex flex-col gap-4 bg-background px-7 py-8 transition-colors hover:bg-accent/40"
            >
              <div
                className="flex size-9 items-center justify-center rounded-lg"
                style={{ background: "#e6f0eb", border: "1px solid #c2ddd0" }}
              >
                <Icon
                  className="size-[17px]"
                  strokeWidth={1.6}
                  style={{ color: "#2a6b4a" }}
                />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium">{title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
          <p className="text-sm font-medium">Sandip Sapkota</p>
          <div className="flex gap-5">
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
