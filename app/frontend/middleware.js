import { NextResponse } from "next/server";

/*
  PRODUCTION UPGRADE: Upstash Redis rate limiting
  Works across all serverless instances (unlike the in-memory Map below).

  npm install @upstash/ratelimit @upstash/redis

  import { Ratelimit } from "@upstash/ratelimit";
  import { Redis }     from "@upstash/redis";

  const limiters = {
    challenge: new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "60 s"), prefix: "fp:challenge" }),
    verify:    new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5,  "60 s"), prefix: "fp:verify" }),
    reviews:   new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5,  "60 s"), prefix: "fp:reviews" }),
    default:   new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(200,"60 s"), prefix: "fp:api" }),
  };

  // In middleware():
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const limiter = limiters[matchedKey] ?? limiters.default;
    const { success, reset } = await limiter.limit(ip);
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please wait before trying again." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } }
      );
    }
  }
*/

// ─── In-memory rate limiter (single-instance / development) ──────────────────
// ip → array of hit timestamps (ms)
const windows = new Map();
const WINDOW_MS = 60_000;
const CLEANUP_EVERY_MS = 5 * 60_000;
let lastCleanup = Date.now();

const RULES = [
  { test: /^\/api\/auth\/challenge/, max: 10 },
  { test: /^\/api\/auth\/verify/,    max: 5  },
  { test: /^\/api\/reviews/,         max: 5  },
  { test: /^\/api\/users\/avatar/,   max: 10 },
  { test: /^\/api\//,                max: 200 },
];

function limitFor(pathname) {
  for (const { test, max } of RULES) if (test.test(pathname)) return max;
  return null;
}

function hit(ip, max) {
  const now = Date.now();

  // Periodic sweep of stale entries
  if (now - lastCleanup > CLEANUP_EVERY_MS) {
    for (const [k, ts] of windows) {
      const fresh = ts.filter((t) => now - t < WINDOW_MS);
      fresh.length === 0 ? windows.delete(k) : windows.set(k, fresh);
    }
    lastCleanup = now;
  }

  const timestamps = (windows.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= max) {
    windows.set(ip, timestamps);
    return Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000); // retry-after seconds
  }

  timestamps.push(now);
  windows.set(ip, timestamps);
  return 0; // allowed
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const max = limitFor(pathname);
  if (!max) return NextResponse.next();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const retryAfter = hit(ip, max);
  if (retryAfter > 0) {
    return new NextResponse(
      JSON.stringify({ error: "Too many requests. Please wait before trying again." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
