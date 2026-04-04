import type { NextConfig } from "next";

const bucketUrl = process.env.NEXT_PUBLIC_S3_BUCKET_URL;
let s3Host: string | undefined;
try {
  if (bucketUrl) s3Host = new URL(bucketUrl).hostname;
} catch {
  s3Host = undefined;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: s3Host
      ? [{ protocol: "https", hostname: s3Host, pathname: "/**" }]
      : [],
  },
};

export default nextConfig;
