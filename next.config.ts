import type { NextConfig } from "next";

const bucketUrl = process.env.NEXT_PUBLIC_S3_BUCKET_URL;
let s3Host: string | undefined;
let s3Protocol: "http" | "https" = "https";

try {
  if (bucketUrl) {
    const parsed = new URL(bucketUrl);
    s3Host = parsed.hostname;
    s3Protocol = parsed.protocol.replace(":", "") as "http" | "https";
  }
} catch {
  s3Host = undefined;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: s3Host
      ? [{ protocol: s3Protocol, hostname: s3Host, pathname: "/**" }]
      : [],
  },
};

export default nextConfig;