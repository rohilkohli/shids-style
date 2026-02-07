import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 80, 85],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    const scriptEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'${scriptEval} https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  silent: true,
});
