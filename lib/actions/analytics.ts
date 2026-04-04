"use server";

import { db } from "@/db";
import { account, session, user } from "@/db/schema/auth";
import { storageFile, storageFolder } from "@/db/schema/storage";
import { normalizeActionError } from "@/lib/action-utils";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-user";
import {
  getSignupInviteFromDb,
  isInviteExpired,
} from "@/lib/invite-db";
import { count, desc, eq, gt, sum } from "drizzle-orm";
import { headers } from "next/headers";

function toIso(d: Date | string | null | undefined): string {
  if (d == null) return new Date(0).toISOString();
  return d instanceof Date ? d.toISOString() : String(d);
}

function numSum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type AdminAnalyticsSnapshot = {
  generatedAt: string;
  users: {
    total: number;
    admins: number;
    banned: number;
    emailVerified: number;
  };
  accounts: { total: number };
  sessions: { total: number; activeNonExpired: number };
  storage: {
    folders: number;
    files: number;
    totalBytes: number;
  };
  signup: {
    dbInviteActive: boolean;
    dbInviteExpiresAt: string | null;
    envPassphraseConfigured: boolean;
    adminEmailsConfigured: boolean;
  };
  mimeTypes: { mimeType: string; files: number; bytes: number }[];
  topUploaders: {
    userId: string;
    name: string;
    email: string;
    fileCount: number;
    totalBytes: number;
  }[];
  recentFiles: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    s3Key: string;
    folderId: string | null;
    createdAt: string;
    uploadedBy: { id: string; name: string; email: string };
  }[];
  recentSessions: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    createdAt: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  }[];
};

export async function getAdminAnalyticsAction(): Promise<AdminAnalyticsSnapshot> {
  try {
    const sessionData = await auth.api.getSession({
      headers: await headers(),
    });
    if (!sessionData?.user || !isAdminUser(sessionData.user)) {
      throw new Error("Forbidden");
    }

    const now = new Date();

    const [
      [{ userTotal }],
      [{ adminTotal }],
      [{ bannedTotal }],
      [{ verifiedTotal }],
      [{ accountTotal }],
      [{ sessionTotal }],
      [{ activeSessionTotal }],
      [{ folderTotal }],
      [{ fileTotal }],
      [{ sumBytes }],
    ] = await Promise.all([
      db.select({ userTotal: count() }).from(user),
      db.select({ adminTotal: count() }).from(user).where(eq(user.role, "admin")),
      db
        .select({ bannedTotal: count() })
        .from(user)
        .where(eq(user.banned, true)),
      db
        .select({ verifiedTotal: count() })
        .from(user)
        .where(eq(user.emailVerified, true)),
      db.select({ accountTotal: count() }).from(account),
      db.select({ sessionTotal: count() }).from(session),
      db
        .select({ activeSessionTotal: count() })
        .from(session)
        .where(gt(session.expiresAt, now)),
      db.select({ folderTotal: count() }).from(storageFolder),
      db.select({ fileTotal: count() }).from(storageFile),
      db
        .select({ sumBytes: sum(storageFile.sizeBytes) })
        .from(storageFile),
    ]);

    const mimeRows = await db
      .select({
        mimeType: storageFile.mimeType,
        files: count(),
        bytes: sum(storageFile.sizeBytes),
      })
      .from(storageFile)
      .groupBy(storageFile.mimeType)
      .orderBy(desc(count(storageFile.id)));

    const fileCnt = count(storageFile.id);
    const bytesAgg = sum(storageFile.sizeBytes);
    const topUploadRows = await db
      .select({
        userId: storageFile.uploadedByUserId,
        name: user.name,
        email: user.email,
        fileCount: fileCnt,
        totalBytes: bytesAgg,
      })
      .from(storageFile)
      .innerJoin(user, eq(user.id, storageFile.uploadedByUserId))
      .groupBy(storageFile.uploadedByUserId, user.name, user.email)
      .orderBy(desc(fileCnt))
      .limit(10);

    const recentFileRows = await db
      .select({
        id: storageFile.id,
        name: storageFile.name,
        mimeType: storageFile.mimeType,
        sizeBytes: storageFile.sizeBytes,
        s3Key: storageFile.s3Key,
        folderId: storageFile.folderId,
        createdAt: storageFile.createdAt,
        uploaderId: user.id,
        uploaderName: user.name,
        uploaderEmail: user.email,
      })
      .from(storageFile)
      .innerJoin(user, eq(user.id, storageFile.uploadedByUserId))
      .orderBy(desc(storageFile.createdAt))
      .limit(40);

    const recentSessionRows = await db
      .select({
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        userName: user.name,
        userEmail: user.email,
      })
      .from(session)
      .innerJoin(user, eq(user.id, session.userId))
      .orderBy(desc(session.createdAt))
      .limit(40);

    const inviteDb = await getSignupInviteFromDb();
    const dbInviteActive = Boolean(
      inviteDb.hash && !isInviteExpired(inviteDb.expiresAtRaw),
    );

    return {
      generatedAt: now.toISOString(),
      users: {
        total: userTotal,
        admins: adminTotal,
        banned: bannedTotal,
        emailVerified: verifiedTotal,
      },
      accounts: { total: accountTotal },
      sessions: {
        total: sessionTotal,
        activeNonExpired: activeSessionTotal,
      },
      storage: {
        folders: folderTotal,
        files: fileTotal,
        totalBytes: numSum(sumBytes),
      },
      signup: {
        dbInviteActive,
        dbInviteExpiresAt: dbInviteActive
          ? inviteDb.expiresAtRaw ?? null
          : null,
        envPassphraseConfigured: Boolean(
          (process.env.SIGNUP_PASSPHRASE ?? "").trim(),
        ),
        adminEmailsConfigured: Boolean(
          (process.env.ADMIN_EMAILS ?? "").trim(),
        ),
      },
      mimeTypes: mimeRows.map((r) => ({
        mimeType: r.mimeType,
        files: r.files,
        bytes: numSum(r.bytes),
      })),
      topUploaders: topUploadRows.map((r) => ({
        userId: r.userId,
        name: r.name,
        email: r.email,
        fileCount: r.fileCount,
        totalBytes: numSum(r.totalBytes),
      })),
      recentFiles: recentFileRows.map((r) => ({
        id: r.id,
        name: r.name,
        mimeType: r.mimeType,
        sizeBytes: r.sizeBytes,
        s3Key: r.s3Key,
        folderId: r.folderId,
        createdAt: toIso(r.createdAt),
        uploadedBy: {
          id: r.uploaderId,
          name: r.uploaderName,
          email: r.uploaderEmail,
        },
      })),
      recentSessions: recentSessionRows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        userEmail: r.userEmail,
        createdAt: toIso(r.createdAt),
        expiresAt: toIso(r.expiresAt),
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
      })),
    };
  } catch (e) {
    throw normalizeActionError(e);
  }
}
