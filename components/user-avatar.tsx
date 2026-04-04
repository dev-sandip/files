"use client";

import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

function resolveAvatarSrc(
  image: string | null | undefined,
  userId: string | undefined,
): string | null {
  if (!image?.trim()) return null;

  const v = image.trim();
  const base = process.env.NEXT_PUBLIC_S3_BUCKET_URL?.replace(/\/$/, "") ?? "";

  const isHttp = v.startsWith("http://") || v.startsWith("https://");
  const isOurBucketUrl = Boolean(base && isHttp && v.startsWith(base));
  const isOurKey = v.startsWith("avatars/");

  if (userId && (isOurKey || isOurBucketUrl)) {
    return `/api/avatar/${userId}`;
  }

  if (isHttp) return v;

  return null;
}

export function UserAvatar({
  name,
  image,
  userId,
  className,
  size = 36,
}: {
  name: string;
  image?: string | null;
  /** Required for uploaded avatars (S3 key or legacy public URL). */
  userId?: string;
  className?: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() ?? "?";
  const dim = { width: size, height: size, minWidth: size, minHeight: size };

  const src = useMemo(
    () => resolveAvatarSrc(image, userId),
    [image, userId],
  );

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (src && !broken) {
    return (
      <img
        key={src}
        src={src}
        alt=""
        className={cn("rounded-full object-cover bg-muted", className)}
        style={dim}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className={cn(
        "rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium",
        className,
      )}
      style={dim}
      aria-hidden
    >
      {initial}
    </span>
  );
}
