#!/usr/bin/env node
/**
 * Pre-deployment verification script.
 * Run: node scripts/deploy-checklist.js
 */

const path = require("path");
const fs   = require("fs");
const https = require("https");

// Load env from .env.local, then .env.production if present
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env.production"), override: false });

const results = [];

function check(label, passed, detail = "") {
  const icon = passed ? "✓" : "✗";
  console.log(`  ${icon} ${label}${detail ? `  (${detail})` : ""}`);
  results.push(passed);
  return passed;
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = "";
      res.on("data", (d) => (body += d));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.setTimeout(8000, () => reject(new Error("timeout")));
    req.on("error", reject);
  });
}

async function run() {
  console.log("\n═══════════════════════════════════════════");
  console.log("   FreelancePay — Pre-Deploy Checklist");
  console.log("═══════════════════════════════════════════\n");

  // ── Environment Variables ───────────────────────────────────────────────────
  console.log("Environment Variables:");

  const dbUrl     = process.env.DATABASE_URL || "";
  const pinataJwt = process.env.PINATA_JWT   || "";
  const jwtSecret = process.env.JWT_SECRET   || "";
  const resendKey = process.env.RESEND_API_KEY || "";
  const cronSecret = process.env.CRON_SECRET  || "";
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || "";

  check("DATABASE_URL set and not localhost", !!dbUrl && !dbUrl.includes("localhost") && !dbUrl.includes("127.0.0.1"));
  check("PINATA_JWT length > 100",            pinataJwt.length > 100);
  check("JWT_SECRET length >= 32",            jwtSecret.length >= 32);
  check("RESEND_API_KEY starts with 're_'",   resendKey.startsWith("re_"));
  check("CRON_SECRET length >= 16",           cronSecret.length >= 16);
  check("NEXT_PUBLIC_APP_URL starts with 'https://'", appUrl.startsWith("https://"));

  // ── Security ─────────────────────────────────────────────────────────────
  console.log("\nSecurity:");

  check("JWT_SECRET is not the example placeholder",
    jwtSecret !== "replace-with-32-char-minimum-secret-string" && jwtSecret.length >= 32);
  check("NODE_ENV is 'production'", process.env.NODE_ENV === "production");

  // ── Connectivity ──────────────────────────────────────────────────────────
  console.log("\nConnectivity:");

  // Database
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    const t = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - t;
    await prisma.$disconnect();
    check("Database connection", true, `${ms}ms`);
  } catch (e) {
    check("Database connection", false, e.message.split("\n")[0].slice(0, 80));
  }

  // Solana Devnet
  try {
    const { Connection } = require("@solana/web3.js");
    const conn = new Connection("https://api.devnet.solana.com", "confirmed");
    const t = Date.now();
    const slot = await Promise.race([
      conn.getSlot(),
      new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 8000)),
    ]);
    check("Solana Devnet reachable", true, `slot ${slot}, ${Date.now() - t}ms`);
  } catch (e) {
    check("Solana Devnet reachable", false, e.message);
  }

  // Pinata
  if (pinataJwt) {
    try {
      const { status } = await httpsGet(
        "https://api.pinata.cloud/data/testAuthentication",
        { Authorization: `Bearer ${pinataJwt}` }
      );
      check("Pinata API authenticated", status === 200, `HTTP ${status}`);
    } catch (e) {
      check("Pinata API authenticated", false, e.message);
    }
  } else {
    check("Pinata API authenticated", false, "PINATA_JWT not set");
  }

  // ── Database Schema ───────────────────────────────────────────────────────
  console.log("\nDatabase:");

  if (dbUrl) {
    let prisma2;
    try {
      const { PrismaClient } = require("@prisma/client");
      prisma2 = new PrismaClient({ datasources: { db: { url: dbUrl } } });
      for (const [model, key] of [
        ["User", "user"], ["Escrow", "escrow"], ["Notification", "notification"],
        ["Review", "review"], ["JobPost", "jobPost"],
      ]) {
        try {
          await prisma2[key].count();
          check(`Table "${model}" exists`, true);
        } catch {
          check(`Table "${model}" exists`, false);
        }
      }
      await prisma2.$disconnect();
    } catch (e) {
      check("Database tables readable", false, e.message.split("\n")[0].slice(0, 80));
    }
  } else {
    ["User", "Escrow", "Notification", "Review", "JobPost"].forEach((t) =>
      check(`Table "${t}" exists`, false, "DATABASE_URL not set")
    );
  }

  const migrationsDir = path.resolve(__dirname, "../prisma/migrations");
  const hasMigrations =
    fs.existsSync(migrationsDir) && fs.readdirSync(migrationsDir).filter((f) => !f.startsWith(".")).length > 0;
  check("Prisma migrations exist", hasMigrations, hasMigrations ? migrationsDir : "no migrations found");

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter(Boolean).length;
  const total  = results.length;
  console.log("\n═══════════════════════════════════════════");
  if (passed === total) {
    console.log(`  ✓ ${passed}/${total} checks passed. Ready to deploy!`);
  } else {
    console.log(`  ✗ ${passed}/${total} checks passed. Fix the failures above before deploying.`);
  }
  console.log("═══════════════════════════════════════════\n");

  process.exit(passed === total ? 0 : 1);
}

run().catch((e) => {
  console.error("\nChecklist error:", e.message);
  process.exit(1);
});
