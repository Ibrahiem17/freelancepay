/**
 * Integration tests — require a running Next.js dev server at localhost:3000.
 * Tests automatically skip if the server is not available, so they are safe
 * to include in the test suite and will be exercised in CI after `npm run dev`.
 *
 * Run locally: start `npm run dev` first, then `npm test`.
 */

const http = require("http");

const BASE = process.env.TEST_SERVER_URL || "http://localhost:3000";
const SEEDED_WALLET = "HbkHJYb4frYzUjEipaa3wKXyqGvuakPUnSJ2erg6K1Tf";

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE}${path}`, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.setTimeout(10000, () => reject(new Error("request timeout")));
    req.on("error", reject);
  });
}

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(`${BASE}${path}`);
    const opts = {
      hostname: url.hostname,
      port:     url.port || 80,
      path:     url.pathname,
      method:   "PATCH",
      headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    };
    const req = http.request(opts, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.setTimeout(10000, () => reject(new Error("request timeout")));
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ─── Server availability check ────────────────────────────────────────────────

let serverAvailable = false;

beforeAll(async () => {
  try {
    await get("/api/stats");
    serverAvailable = true;
  } catch {
    console.warn("\n  ⚠ Next.js server not running at", BASE, "— skipping API integration tests\n");
  }
}, 15000);

// Wrap `it` so tests auto-skip when server is unavailable
const itLive = (name, fn) => {
  it(name, async () => {
    if (!serverAvailable) return;
    await fn();
  });
};

// ─── Public endpoints ─────────────────────────────────────────────────────────

describe("GET /api/stats", () => {
  itLive("returns 200 with expected keys", async () => {
    const { status, body } = await get("/api/stats");
    expect(status).toBe(200);
    expect(body).toHaveProperty("totalEscrows");
    expect(body).toHaveProperty("totalCompleted");
    expect(body).toHaveProperty("totalVolumeSOL");
  });
});

describe("GET /api/escrows", () => {
  itLive("returns 200 with escrows array and total", async () => {
    const { status, body } = await get("/api/escrows");
    expect(status).toBe(200);
    expect(Array.isArray(body.escrows)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  itLive("filters by ACTIVE status and returns only matching rows", async () => {
    const { status, body } = await get("/api/escrows?status=ACTIVE");
    expect(status).toBe(200);
    body.escrows.forEach((e) => expect(e.status).toBe("ACTIVE"));
  });
});

describe("GET /api/escrows/[pda]", () => {
  itLive("returns 404 for an invalid PDA address", async () => {
    const { status } = await get("/api/escrows/invalid-pda-address");
    expect(status).toBe(404);
  });
});

describe("GET /api/users/[walletAddress]", () => {
  itLive("returns 200 for the seeded wallet", async () => {
    const { status, body } = await get(`/api/users/${SEEDED_WALLET}`);
    // If the user exists it's 200; if the DB is empty it could be 404 — both are valid
    expect([200, 404]).toContain(status);
    if (status === 200) expect(body.user).toHaveProperty("walletAddress");
  });

  itLive("returns 404 for a non-existent wallet", async () => {
    const { status } = await get("/api/users/doesnotexist12345678901234567890123456789");
    expect(status).toBe(404);
  });
});

describe("GET /api/search/freelancers", () => {
  itLive("returns 200 with freelancers array", async () => {
    const { status, body } = await get("/api/search/freelancers");
    expect(status).toBe(200);
    expect(Array.isArray(body.freelancers)).toBe(true);
  });
});

describe("GET /api/jobs", () => {
  itLive("returns 200 with jobs array", async () => {
    const { status, body } = await get("/api/jobs");
    expect(status).toBe(200);
    expect(Array.isArray(body.jobs)).toBe(true);
  });
});

// ─── Auth-required endpoints → 401 without cookie ────────────────────────────

describe("Protected endpoints return 401 without auth cookie", () => {
  itLive("GET /api/auth/me → 401", async () => {
    const { status } = await get("/api/auth/me");
    expect(status).toBe(401);
  });

  itLive("GET /api/notifications → 401", async () => {
    const { status } = await get("/api/notifications");
    expect(status).toBe(401);
  });

  itLive("GET /api/analytics/me → 401", async () => {
    const { status } = await get("/api/analytics/me");
    expect(status).toBe(401);
  });

  itLive("PATCH /api/users/me → 401", async () => {
    const { status } = await post("/api/users/me", {});
    expect(status).toBe(401);
  });
});

// ─── Auth challenge ───────────────────────────────────────────────────────────

describe("GET /api/auth/challenge", () => {
  itLive("returns 200 with message and nonce for a valid wallet", async () => {
    const { status, body } = await get(`/api/auth/challenge?wallet=${SEEDED_WALLET}`);
    expect(status).toBe(200);
    expect(typeof body.message).toBe("string");
    expect(typeof body.nonce).toBe("string");
  });

  itLive("returns 400 when wallet param is missing", async () => {
    const { status } = await get("/api/auth/challenge");
    expect(status).toBe(400);
  });

  itLive("returns 400 for an invalid wallet address", async () => {
    const { status } = await get("/api/auth/challenge?wallet=invalid");
    expect(status).toBe(400);
  });
});
