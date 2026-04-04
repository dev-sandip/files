"use server";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/db";
import { storageFile } from "@/db/schema/storage";
import { normalizeActionError } from "@/lib/action-utils";
import { auth } from "@/lib/auth";
import { getPreviewKind } from "@/lib/file-preview-kind";
import { getBucket, S3 } from "@/lib/S3Client";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

const MAX_TEXT_BYTES = 512 * 1024;

export async function getFilePresignedUrlAction(fileId: string): Promise<{
  url: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const rows = await db
      .select()
      .from(storageFile)
      .where(eq(storageFile.id, fileId))
      .limit(1);
    const file = rows[0];
    if (!file) throw new Error("Not found");

    const bucket = getBucket();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: file.s3Key,
      ResponseContentType: file.mimeType || "application/pdf",
      ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    });

    const url = await getSignedUrl(S3, command, { expiresIn: 300 });
    return { url };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

export type TextPreviewResult =
  | { ok: true; text: string }
  | { ok: false; code: "too_large" | "not_text" | "not_found" | "empty" };

export async function getFileTextContentAction(
  fileId: string,
): Promise<TextPreviewResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const rows = await db
      .select()
      .from(storageFile)
      .where(eq(storageFile.id, fileId))
      .limit(1);
    const file = rows[0];
    if (!file) return { ok: false, code: "not_found" };

    if (getPreviewKind(file.mimeType ?? "", file.name) !== "text") {
      return { ok: false, code: "not_text" };
    }

    const out = await S3.send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: file.s3Key,
      }),
    );

    const len = out.ContentLength ?? 0;
    if (len > MAX_TEXT_BYTES) {
      return { ok: false, code: "too_large" };
    }

    if (!out.Body) return { ok: false, code: "empty" };

    const bytes = await out.Body.transformToByteArray();
    const text = new TextDecoder("utf-8").decode(bytes);
    return { ok: true, text };
  } catch (e) {
    throw normalizeActionError(e);
  }
}
