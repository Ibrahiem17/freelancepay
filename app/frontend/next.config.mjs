/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// Content Security Policy — unsafe-eval is required by Next.js itself in dev
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} *.vercel.app`,
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com data:",
  "img-src 'self' data: gateway.pinata.cloud *.ipfs.io https:",
  [
    "connect-src 'self'",
    "api.devnet.solana.com",
    "rpc.ankr.com",
    "*.solana.com",
    "wss://api.devnet.solana.com",
    "https://api.coingecko.com",
  ].join(" "),
  "frame-ancestors 'none'",
]
  .join("; ")
  .trim();

const securityHeaders = [
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy",   value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},

  // Prisma must run in Node.js, not the Edge runtime
  serverExternalPackages: ["@prisma/client", "prisma"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "gateway.pinata.cloud" },
      { protocol: "https", hostname: "*.ipfs.io" },
    ],
  },

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
