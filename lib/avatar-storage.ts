import "server-only";

/** Return S3 object key if this `user.image` value is our upload; otherwise null (e.g. OAuth URL). */
export function userImageToS3Key(image: string | null | undefined): string | null {
  if (!image || !image.trim()) return null;
  const v = image.trim();
  if (v.startsWith("avatars/")) return v;

  if (v.startsWith("http://") || v.startsWith("https://")) {
    const base = process.env.NEXT_PUBLIC_S3_BUCKET_URL?.replace(/\/$/, "");
    if (!base) return null;
    if (!v.startsWith(base)) return null;
    const rest = v.slice(base.length).replace(/^\//, "");
    return rest || null;
  }

  return null;
}

export function isExternalAvatarUrl(image: string | null | undefined): boolean {
  if (!image) return false;
  const v = image.trim();
  if (v.startsWith("http://") || v.startsWith("https://")) {
    const base = process.env.NEXT_PUBLIC_S3_BUCKET_URL?.replace(/\/$/, "");
    if (base && v.startsWith(base)) return false;
    return true;
  }
  return false;
}
