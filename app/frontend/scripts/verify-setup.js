// Run from app/frontend: node scripts/verify-setup.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const { Connection, PublicKey } = require("@solana/web3.js");
const fs = require("fs");

const PROGRAM_ID = "5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX";
const RPC_URL = "https://api.devnet.solana.com";
const FRONTEND_ROOT = path.resolve(__dirname, "..");

const results = [];

function pass(label) {
  results.push({ label, status: "PASS", detail: "" });
}

function fail(label, detail) {
  results.push({ label, status: "FAIL", detail });
}

async function check1_nodeVersion() {
  const label = "Node.js version >= 18.0.0";
  const [major] = process.versions.node.split(".").map(Number);
  if (major >= 18) pass(label);
  else fail(label, `Found Node ${process.versions.node}`);
}

async function check2_npmPackages() {
  const label = "Required npm packages installed";
  const required = [
    "@coral-xyz/anchor",
    "@solana/web3.js",
    "@solana/wallet-adapter-react",
    "next",
    "react",
  ];
  const missing = required.filter(
    (pkg) => !fs.existsSync(path.join(FRONTEND_ROOT, "node_modules", pkg))
  );
  if (missing.length === 0) pass(label);
  else fail(label, `Missing: ${missing.join(", ")}`);
}

async function check3_devnetConnection() {
  const label = "Solana Devnet reachable (fetch slot)";
  try {
    const conn = new Connection(RPC_URL, "confirmed");
    const slot = await conn.getSlot();
    results.push({ label, status: "PASS", detail: `slot ${slot}` });
  } catch (e) {
    fail(label, e.message);
  }
}

async function check4_pinataJwt() {
  const label = "PINATA_JWT environment variable";
  const val = process.env.PINATA_JWT;
  if (val && val.trim().length > 0) {
    results.push({ label, status: "PASS", detail: "SET" });
  } else {
    results.push({ label, status: "FAIL", detail: "MISSING" });
  }
}

async function check5_programAccount() {
  const label = `Program account exists on Devnet (${PROGRAM_ID.slice(0, 8)}...)`;
  try {
    const conn = new Connection(RPC_URL, "confirmed");
    const info = await conn.getAccountInfo(new PublicKey(PROGRAM_ID));
    if (info !== null) pass(label);
    else fail(label, "getAccountInfo returned null");
  } catch (e) {
    fail(label, e.message);
  }
}

async function check6_idlFile() {
  const label = "IDL file exists at src/idl/freelancepay.json";
  const idlPath = path.join(FRONTEND_ROOT, "src/idl/freelancepay.json");
  if (fs.existsSync(idlPath)) pass(label);
  else fail(label, `Not found: ${idlPath}`);
}

async function check7_idlAddress() {
  const label = `IDL address field matches Program ID`;
  const idlPath = path.join(FRONTEND_ROOT, "src/idl/freelancepay.json");
  try {
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    if (idl.address === PROGRAM_ID) pass(label);
    else fail(label, `IDL has: ${idl.address}`);
  } catch (e) {
    fail(label, e.message);
  }
}

async function check8_globalsCss() {
  const label = "globals.css exists at styles/globals.css";
  const cssPath = path.join(FRONTEND_ROOT, "styles/globals.css");
  if (fs.existsSync(cssPath)) pass(label);
  else fail(label, `Not found: ${cssPath}`);
}

async function main() {
  console.log("\nFreelancePay — Environment Verification\n");

  await check1_nodeVersion();
  await check2_npmPackages();
  await check3_devnetConnection();
  await check4_pinataJwt();
  await check5_programAccount();
  await check6_idlFile();
  await check7_idlAddress();
  await check8_globalsCss();

  const labelW = 55;
  const divider = "─".repeat(labelW + 12);
  console.log(divider);
  console.log(
    `${"Check".padEnd(labelW)}${"Status".padEnd(8)}Detail`
  );
  console.log(divider);

  let anyFail = false;
  for (const { label, status, detail } of results) {
    const icon = status === "PASS" ? "✓" : "✗";
    const statusStr = `${icon} ${status}`;
    console.log(
      `${label.padEnd(labelW)}${statusStr.padEnd(8)}${detail}`
    );
    if (status === "FAIL") anyFail = true;
  }

  console.log(divider);
  const passed = results.filter((r) => r.status === "PASS").length;
  console.log(`\n${passed}/${results.length} checks passed.\n`);

  if (anyFail) process.exit(1);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
