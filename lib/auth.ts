import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { getSignupInviteFromDb } from "@/lib/invite-db";
import { timingSafeStringEqual, verifyInvitePhrase } from "@/lib/invite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  emailAndPassword: { enabled: true },
  plugins: [nextCookies(), admin({ defaultRole: "user", adminRoles: ["admin"] })],
  databaseHooks: {
    user: {
      create: {
        after: async (created) => {
          const admins = (process.env.ADMIN_EMAILS ?? "")
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          if (
            created.email &&
            admins.includes(created.email.toLowerCase())
          ) {
            await db
              .update(userTable)
              .set({ role: "admin" })
              .where(eq(userTable.id, created.id));
          }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const body = ctx.body as { passphrase?: string } | undefined;
      const phrase =
        typeof body?.passphrase === "string" ? body.passphrase : "";

      const { hash: storedHash } = await getSignupInviteFromDb();
      const envPhrase = process.env.SIGNUP_PASSPHRASE;

      let valid = false;
      if (storedHash) {
        valid = verifyInvitePhrase(phrase, storedHash);
      }

      if (!valid && envPhrase) {
        valid = timingSafeStringEqual(phrase, envPhrase);
      }

      if (!valid) {
        throw new APIError("FORBIDDEN", {
          message:
            "Sign up requires a valid invitation phrase (unexpired, from an admin) or a configured server passphrase.",
        });
      }
    }),
  },
});
