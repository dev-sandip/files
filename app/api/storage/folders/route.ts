import { db } from "@/db";
import { storageFolder } from "@/db/schema/storage";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-user";
import { and, eq, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !isAdminUser(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  if (!name || name.includes("/") || name.includes("\\")) {
    return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
  }

  const parentId =
    parsed.data.parentId === undefined ||
    parsed.data.parentId === null ||
    parsed.data.parentId === ""
      ? null
      : parsed.data.parentId;

  if (parentId) {
    const parent = await db
      .select()
      .from(storageFolder)
      .where(eq(storageFolder.id, parentId))
      .limit(1);
    if (!parent.length) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }
  }

  const dup = await db
    .select({ id: storageFolder.id })
    .from(storageFolder)
    .where(
      and(
        eq(storageFolder.name, name),
        parentId === null
          ? isNull(storageFolder.parentId)
          : eq(storageFolder.parentId, parentId),
      ),
    )
    .limit(1);
  if (dup.length) {
    return NextResponse.json(
      { error: "A folder with this name already exists here" },
      { status: 409 },
    );
  }

  const id = uuidv4();
  await db.insert(storageFolder).values({
    id,
    name,
    parentId,
    createdByUserId: session.user.id,
  });

  return NextResponse.json({
    folder: { id, name, parentId, createdAt: new Date().toISOString() },
  });
}
