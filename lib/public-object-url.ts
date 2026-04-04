import "server-only";

/** Public object URL for keys served from the configured bucket CDN/virtual host. */
export function publicObjectUrl(objectKey: string) {
  const base = process.env.NEXT_PUBLIC_S3_BUCKET_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("NEXT_PUBLIC_S3_BUCKET_URL is not set");
  }
  const path = objectKey.replace(/^\//, "");
  return `${base}/${path}`;
}
