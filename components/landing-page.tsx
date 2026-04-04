import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Lock,
  Shield,
  Sparkles,
} from "lucide-react";
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
    text: "Admins curate uploads and structure; everyone else can view and open what’s shared.",
  },
  {
    icon: Lock,
    title: "Invite-only signup",
    text: "New accounts need a valid invitation phrase—no open registration by default.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,color-mix(in_oklch,var(--chart-2)_12%,transparent),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath fill='none' stroke='%23000' stroke-opacity='0.06' d='M0 0h28v28H0z'/%3E%3C/svg%3E")`,
        }}
      />

      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-5 pb-16 pt-24 sm:px-8 sm:pt-28">
        <header className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur-sm">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            Private team library
          </p>
          <h1
            className="max-w-2xl font-[family-name:var(--font-sans)] text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            One place for shared files—organized, controlled, and easy to open.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sign in to browse the library. Administrators manage folders and uploads;
            viewers get a calm, read-only experience with previews for common formats.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-2xl px-6">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-2xl px-6 bg-background/80 backdrop-blur-sm"
            >
              <Link href="/register">Register with invite</Link>
            </Button>
          </div>
        </header>

        <section
          className="grid gap-4 sm:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both"
          aria-labelledby="features-heading"
        >
          <h2 id="features-heading" className="sr-only">
            What you get
          </h2>
          {features.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-3xl border border-border/70 bg-card/40 p-6 shadow-xs backdrop-blur-sm transition-colors hover:border-border hover:bg-card/70"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="font-medium tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {text}
              </p>
            </article>
          ))}
        </section>

        <footer className="mt-auto pt-24 text-center text-xs text-muted-foreground animate-in fade-in duration-700 delay-300 fill-mode-both">
          <p className="font-medium text-foreground/90">Sandip Sapkota</p>
          <p className="mt-2">
            <a
              href="mailto:contact@thesandip.dev"
              className="underline underline-offset-2 hover:text-foreground"
            >
              contact@thesandip.dev
            </a>
            <span className="mx-2 opacity-40" aria-hidden>
              ·
            </span>
            <a
              href="https://github.com/dev-sandip"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              GitHub
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
