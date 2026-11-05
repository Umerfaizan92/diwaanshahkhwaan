import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// Production Content-Security-Policy. Next.js inline bootstrap scripts need 'unsafe-inline';
// everything else is locked to this origin. Stripe Checkout is a full-page redirect, not an embed.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "object-src 'none'",
  ...((process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").startsWith("https://") ? ["upgrade-insecure-requests"] : []),
].join("; ");
if (process.env.NODE_ENV === "production" && process.env.DISABLE_CSP !== "true") securityHeaders.push({ key: "Content-Security-Policy", value: csp });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pg", "sharp"],
  images: { formats: ["image/avif", "image/webp"], minimumCacheTTL: 2678400 },
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
