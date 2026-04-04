# Files

Private file library on **Next.js**, **Better Auth**, **PostgreSQL** (Drizzle), and **S3-compatible storage**. Admins manage folders and uploads; signed-in users can browse and preview. Sign-up is gated by an invitation phrase (database and/or env).

## Features

- **Authentication** — Email/password via Better Auth; sessions and admin plugin.
- **Invites** — Register only with a valid phrase (admin-generated and/or `SIGNUP_PASSPHRASE`); optional admin email list for auto-promotion (`ADMIN_EMAILS`).
- **Storage** — Folders and files in Postgres metadata; blobs in S3 (presigned upload, authorized download/preview).
- **Roles** — Admin: create folders, upload, delete, generate invites, user admin actions. Non-admin: view library and open/previews.
- **Profiles** — Name, password, avatar (stored in S3 under `avatars/{userId}/…`; served via `/api/avatar/[userId]`; previous avatar object removed on re-upload).

## Stack

- Next.js 15 (App Router), React 19, TypeScript  
- Better Auth + Drizzle ORM + `pg`  
- AWS SDK v3 for S3 (`S3_BUCKET_NAME`, optional `AWS_ENDPOINT_URL_S3` for R2/MinIO)  
- Tailwind CSS v4, shadcn-style UI (radix-ui), Sonner toasts  

## Prerequisites

- Node.js 20+ recommended  
- PostgreSQL  
- An S3-compatible bucket and credentials (via standard AWS SDK env, e.g. `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, or your provider’s equivalents)

## Setup

```bash
pnpm install
# Create .env with the variables listed below
```

Apply the database schema (use your usual Drizzle workflow), for example:

```bash
pnpm exec drizzle-kit push
# or generate + migrate, depending on how you manage migrations
```

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_URL` | Public origin of the app (e.g. `http://localhost:3000`) |
| `BETTER_AUTH_SECRET` | Secret for Better Auth (sessions/crypto) |
| `S3_BUCKET_NAME` | Bucket name |
| `NEXT_PUBLIC_S3_BUCKET_URL` | Public base URL for the bucket (optional; used for legacy URL-style `user.image` and helpers) |
| `AWS_REGION` | Region (default `auto`; set as needed for your provider) |
| `AWS_ENDPOINT_URL_S3` | Custom S3 endpoint (e.g. R2/MinIO) when not using AWS default |
| `SIGNUP_PASSPHRASE` | Optional static passphrase accepted at sign-up alongside DB invites |
| `ADMIN_EMAILS` | Comma-separated emails promoted to admin on **user creation** |

Do not commit real secrets; keep them in `.env` locally and in your host’s secret store in production.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | ESLint |

## License

Private project — use and license as you define.
