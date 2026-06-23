// End-to-end test for FreelancePay Solana program.
// Usage: node scripts/test-program.js
// Keypairs stored in scripts/keypairs/client.json and freelancer.json (auto-generated on first run).
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const { AnchorProvider, Program, BN, Wallet } = require("@coral-xyz/anchor");
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const idl = require("../src/idl/freelancepay.json");

const RPC_URL = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(idl.address);
const ESCROW_SEED = Buffer.from("escrow");
const CLIENT_PROFILE_SEED = Buffer.from("client_profile");
const KEYPAIRS_DIR = path.join(__dirname, "keypairs");

// ─── Results tracking ────────────────────────────────────────────────────────

const results = [];
let passed = 0;
let failed = 0;

function pass(label) {
  results.push(`  ✓ PASS  ${label}`);
  passed++;
}

function fail(label, detail = "") {
  results.push(`  ✗ FAIL  ${label}${detail ? " — " + detail : ""}`);
  failed++;
}

// ─── Keypair helpers ─────────────────────────────────────────────────────────

function loadOrCreate(name, connection) {
  fs.mkdirSync(KEYPAIRS_DIR, { recursive: true });
  const file = path.join(KEYPAIRS_DIR, `${name}.json`);
  if (fs.existsSync(file)) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file))));
  }
  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
  console.log(`  Generated ${name}.json: ${kp.publicKey.toBase58()}`);
  return kp;
}

async function ensureFunded(connection, kp, minSol = 1.5) {
  const bal = await connection.getBalance(kp.publicKey);
  if (bal / LAMPORTS_PER_SOL >= minSol) return;
  console.log(`  Airdropping 2 SOL to ${kp.publicKey.toBase58().slice(0, 8)}...`);
  const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
}

// ─── PDA helpers ─────────────────────────────────────────────────────────────

function deriveProfilePDA(clientKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [CLIENT_PROFILE_SEED, clientKey.toBytes()],
    PROGRAM_ID
  );
  return pda;
}

function deriveEscrowPDA(clientKey, index) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(index));
  const [pda] = PublicKey.findProgramAddressSync(
    [ESCROW_SEED, clientKey.toBytes(), buf],
    PROGRAM_ID
  );
  return pda;
}

// ─── Program builder ─────────────────────────────────────────────────────────

function makeProgram(connection, keypair) {
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program(idl, provider);
}

// ─── Main tests ──────────────────────────────────────────────────────────────

async function runHappyPath(connection, client, freelancer) {
  console.log("\n── Happy Path (full escrow lifecycle) ──────────────────────────");
  const clientProg = makeProgram(connection, client);
  const freelancerProg = makeProgram(connection, freelancer);
  const profilePDA = deriveProfilePDA(client.publicKey);

  // 1. Initialize client profile (skip if already exists)
  let currentCount = 0;
  try {
    const existing = await clientProg.account.clientProfile.fetch(profilePDA);
    currentCount = existing.escrowCount.toNumber();
    console.log(`  Profile exists (escrow_count=${currentCount})`);
  } catch {
    await clientProg.methods
      .initializeClientProfile()
      .accounts({ client: client.publicKey, clientProfile: profilePDA, systemProgram: SystemProgram.programId })
      .signers([client])
      .rpc();
    console.log("  Profile initialized");
  }

  const escrowIndex = currentCount;
  const escrowPDA = deriveEscrowPDA(client.publicKey, escrowIndex);

  // 2. create_escrow
  const AMOUNT_SOL = 0.1;
  const amountLamports = new BN(Math.round(AMOUNT_SOL * LAMPORTS_PER_SOL));
  try {
    await clientProg.methods
      .createEscrow("Test Job", "Test description", freelancer.publicKey, amountLamports, new BN(escrowIndex))
      .accounts({
        client: client.publicKey,
        clientProfile: profilePDA,
        escrow: escrowPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const e = await clientProg.account.escrowAccount.fetch(escrowPDA);
    const statusKey = Object.keys(e.status)[0];
    if (statusKey === "active" && e.amount.toNumber() === amountLamports.toNumber() && e.escrowIndex.toNumber() === escrowIndex) {
      pass("create_escrow — account active, amount correct, index stored");
    } else {
      fail("create_escrow", `status=${statusKey} amount=${e.amount} index=${e.escrowIndex}`);
    }
  } catch (err) {
    fail("create_escrow", err.message);
    return;
  }

  // 3. submit_work
  try {
    await freelancerProg.methods
      .submitWork("Work done! Note: test delivery")
      .accounts({ freelancer: freelancer.publicKey, escrow: escrowPDA })
      .signers([freelancer])
      .rpc();

    const e = await clientProg.account.escrowAccount.fetch(escrowPDA);
    const statusKey = Object.keys(e.status)[0];
    if (statusKey === "submitted" && e.workSubmission.length > 0) {
      pass("submit_work — status=submitted, workSubmission set");
    } else {
      fail("submit_work", `status=${statusKey}`);
    }
  } catch (err) {
    fail("submit_work", err.message);
    return;
  }

  // 4. request_revision
  try {
    await clientProg.methods
      .requestRevision("Please revise the header font")
      .accounts({ client: client.publicKey, escrow: escrowPDA })
      .signers([client])
      .rpc();

    const e = await clientProg.account.escrowAccount.fetch(escrowPDA);
    const statusKey = Object.keys(e.status)[0];
    if (statusKey === "revisionRequested" && e.revisionNote.length > 0) {
      pass("request_revision — status=revisionRequested, revisionNote set");
    } else {
      fail("request_revision", `status=${statusKey}`);
    }
  } catch (err) {
    fail("request_revision", err.message);
    return;
  }

  // 5. submit_work again (resubmit after revision)
  try {
    await freelancerProg.methods
      .submitWork("Revised: header font changed to Inter")
      .accounts({ freelancer: freelancer.publicKey, escrow: escrowPDA })
      .signers([freelancer])
      .rpc();

    const e = await clientProg.account.escrowAccount.fetch(escrowPDA);
    const statusKey = Object.keys(e.status)[0];
    if (statusKey === "submitted" && e.workSubmission.includes("Revised")) {
      pass("submit_work (resubmit) — status=submitted, workSubmission updated");
    } else {
      fail("submit_work (resubmit)", `status=${statusKey}`);
    }
  } catch (err) {
    fail("submit_work (resubmit)", err.message);
    return;
  }

  // 6. approve_work
  const freelancerBefore = await connection.getBalance(freelancer.publicKey);
  try {
    await clientProg.methods
      .approveWork()
      .accounts({ client: client.publicKey, freelancer: freelancer.publicKey, escrow: escrowPDA })
      .signers([client])
      .rpc();

    const accountInfo = await connection.getAccountInfo(escrowPDA);
    const freelancerAfter = await connection.getBalance(freelancer.publicKey);
    const delta = (freelancerAfter - freelancerBefore) / LAMPORTS_PER_SOL;

    if (accountInfo === null) {
      pass("approve_work — escrow account closed");
    } else {
      fail("approve_work", "account still exists after close");
    }

    if (delta > AMOUNT_SOL * 0.99) {
      pass(`approve_work — freelancer balance +${delta.toFixed(4)} SOL (includes rent)`);
    } else {
      fail("approve_work balance", `delta was only ${delta.toFixed(4)} SOL`);
    }
  } catch (err) {
    fail("approve_work", err.message);
    return;
  }

  // Verify profile count incremented
  try {
    const p = await clientProg.account.clientProfile.fetch(profilePDA);
    const newCount = p.escrowCount.toNumber();
    if (newCount === escrowIndex + 1) {
      pass(`profile counter incremented (${escrowIndex} → ${newCount})`);
    } else {
      fail("profile counter", `expected ${escrowIndex + 1}, got ${newCount}`);
    }
  } catch (err) {
    fail("profile counter check", err.message);
  }
}

async function runCancelPath(connection, client, freelancer) {
  console.log("\n── Cancel Path ─────────────────────────────────────────────────");
  const clientProg = makeProgram(connection, client);
  const profilePDA = deriveProfilePDA(client.publicKey);

  let currentCount = 0;
  try {
    const p = await clientProg.account.clientProfile.fetch(profilePDA);
    currentCount = p.escrowCount.toNumber();
  } catch {
    await clientProg.methods
      .initializeClientProfile()
      .accounts({ client: client.publicKey, clientProfile: profilePDA, systemProgram: SystemProgram.programId })
      .signers([client])
      .rpc();
  }

  const escrowIndex = currentCount;
  const escrowPDA = deriveEscrowPDA(client.publicKey, escrowIndex);
  const amountLamports = new BN(Math.round(0.05 * LAMPORTS_PER_SOL));

  try {
    await clientProg.methods
      .createEscrow("Cancel Test", "Cancel test description", freelancer.publicKey, amountLamports, new BN(escrowIndex))
      .accounts({
        client: client.publicKey,
        clientProfile: profilePDA,
        escrow: escrowPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();
    pass("cancel path — create_escrow succeeded");
  } catch (err) {
    fail("cancel path — create_escrow", err.message);
    return;
  }

  const clientBefore = await connection.getBalance(client.publicKey);

  try {
    await clientProg.methods
      .cancelEscrow()
      .accounts({ client: client.publicKey, escrow: escrowPDA })
      .signers([client])
      .rpc();

    const accountInfo = await connection.getAccountInfo(escrowPDA);
    const clientAfter = await connection.getBalance(client.publicKey);
    const delta = (clientAfter - clientBefore) / LAMPORTS_PER_SOL;

    if (accountInfo === null) {
      pass("cancel_escrow — account closed");
    } else {
      fail("cancel_escrow", "account still exists");
    }

    if (delta > 0.04) {
      pass(`cancel_escrow — client recovered ${delta.toFixed(4)} SOL`);
    } else {
      fail("cancel_escrow balance", `delta was ${delta.toFixed(4)} SOL (expected >0.04)`);
    }
  } catch (err) {
    fail("cancel_escrow", err.message);
  }
}

async function runMultiEscrowCheck(connection, client, freelancer) {
  console.log("\n── Multi-Escrow Coexistence Check ──────────────────────────────");
  const clientProg = makeProgram(connection, client);
  const profilePDA = deriveProfilePDA(client.publicKey);

  let profile;
  try {
    profile = await clientProg.account.clientProfile.fetch(profilePDA);
  } catch {
    await clientProg.methods
      .initializeClientProfile()
      .accounts({ client: client.publicKey, clientProfile: profilePDA, systemProgram: SystemProgram.programId })
      .signers([client])
      .rpc();
    profile = { escrowCount: new BN(0) };
  }

  const startCount = profile.escrowCount.toNumber();
  const pda0 = deriveEscrowPDA(client.publicKey, startCount);
  const pda1 = deriveEscrowPDA(client.publicKey, startCount + 1);
  const amountLamports = new BN(Math.round(0.05 * LAMPORTS_PER_SOL));

  try {
    // Create first escrow
    await clientProg.methods
      .createEscrow("Multi Test A", "First escrow", freelancer.publicKey, amountLamports, new BN(startCount))
      .accounts({ client: client.publicKey, clientProfile: profilePDA, escrow: pda0, systemProgram: SystemProgram.programId })
      .signers([client])
      .rpc();

    // Create second escrow immediately after
    await clientProg.methods
      .createEscrow("Multi Test B", "Second escrow", freelancer.publicKey, amountLamports, new BN(startCount + 1))
      .accounts({ client: client.publicKey, clientProfile: profilePDA, escrow: pda1, systemProgram: SystemProgram.programId })
      .signers([client])
      .rpc();

    const [e0, e1] = await Promise.all([
      clientProg.account.escrowAccount.fetch(pda0),
      clientProg.account.escrowAccount.fetch(pda1),
    ]);

    if (e0.title === "Multi Test A" && e1.title === "Multi Test B" && pda0.toBase58() !== pda1.toBase58()) {
      pass(`multi-escrow — 2 escrows coexist at different PDAs`);
      pass(`  PDA[${startCount}]: ${pda0.toBase58().slice(0, 16)}...`);
      pass(`  PDA[${startCount + 1}]: ${pda1.toBase58().slice(0, 16)}...`);
    } else {
      fail("multi-escrow coexistence", "PDAs identical or data wrong");
    }
  } catch (err) {
    fail("multi-escrow", err.message);
  }
}

async function main() {
  console.log("\nFreelancePay — Program Integration Tests\n");

  const connection = new Connection(RPC_URL, "confirmed");
  const client = loadOrCreate("client", connection);
  const freelancer = loadOrCreate("freelancer", connection);

  console.log(`Client    : ${client.publicKey.toBase58()}`);
  console.log(`Freelancer: ${freelancer.publicKey.toBase58()}`);

  console.log("\nFunding wallets if needed...");
  await ensureFunded(connection, client, 0.3);
  await ensureFunded(connection, freelancer, 0.1);

  await runHappyPath(connection, client, freelancer);
  await runCancelPath(connection, client, freelancer);
  await runMultiEscrowCheck(connection, client, freelancer);

  // Summary
  const total = passed + failed;
  console.log("\n" + "─".repeat(60));
  results.forEach((r) => console.log(r));
  console.log("─".repeat(60));
  console.log(`\n${passed}/${total} tests passed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
