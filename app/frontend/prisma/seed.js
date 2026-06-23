// Run with: node prisma/seed.js
// Requires DATABASE_URL in .env.local and migrations already applied.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ALICE_WALLET = "HbkHJYb4frYzUjEipaa3wKXyqGvuakPUnSJ2erg6K1Tf";
const BOB_WALLET   = "Abc1XYZ9mnpQrStUvWxYz1234567890abcDEFGHIJKLM";

// A fake PDA for an already-completed escrow (used in the Review record)
const COMPLETED_PDA = "CompLetedEscrowPDA111111111111111111111111111";
// The active escrow PDA (used in the Escrow record)
const ACTIVE_PDA    = "ActiveEscrowPDA222222222222222222222222222222";

async function main() {
  console.log("Seeding database...");

  // ── Users ───────────────────────────────────────────────────────────────────
  const alice = await prisma.user.upsert({
    where:  { walletAddress: ALICE_WALLET },
    update: {},
    create: {
      walletAddress: ALICE_WALLET,
      displayName:   "Alice (Client)",
      isClient:      true,
      skills:        ["project management", "web design"],
    },
  });
  console.log(`  User: ${alice.displayName}`);

  const bob = await prisma.user.upsert({
    where:  { walletAddress: BOB_WALLET },
    update: {},
    create: {
      walletAddress: BOB_WALLET,
      displayName:   "Bob (Freelancer)",
      isFreelancer:  true,
      skills:        ["react", "solana", "rust"],
      hourlyRate:    0.5,
    },
  });
  console.log(`  User: ${bob.displayName}`);

  // ── Escrow ──────────────────────────────────────────────────────────────────
  const escrow = await prisma.escrow.upsert({
    where:  { pda: ACTIVE_PDA },
    update: {},
    create: {
      pda:              ACTIVE_PDA,
      clientWallet:     ALICE_WALLET,
      freelancerWallet: BOB_WALLET,
      amountLamports:   BigInt("500000000"),
      title:            "Build Solana dApp UI",
      description:      "Build a Next.js frontend for a Solana escrow program.",
      status:           "ACTIVE",
      onChainCreatedAt: new Date(),
      lastSyncedAt:     new Date(),
    },
  });
  console.log(`  Escrow: ${escrow.title} (${escrow.status})`);

  // ── Notification ────────────────────────────────────────────────────────────
  const existing = await prisma.notification.findFirst({
    where: { recipientWallet: BOB_WALLET, escrowPda: ACTIVE_PDA },
  });
  if (!existing) {
    await prisma.notification.create({
      data: {
        recipientWallet: BOB_WALLET,
        type:            "ESCROW_CREATED",
        escrowPda:       ACTIVE_PDA,
        title:           "New escrow assigned to you",
        message:         "Alice has created a new escrow for 'Build Solana dApp UI' and assigned you as freelancer.",
      },
    });
    console.log("  Notification: ESCROW_CREATED → Bob");
  } else {
    console.log("  Notification: already exists, skipped");
  }

  // ── JobPost ─────────────────────────────────────────────────────────────────
  const existingJob = await prisma.jobPost.findFirst({
    where: { clientWallet: ALICE_WALLET, title: "Looking for Solana Developer" },
  });
  if (!existingJob) {
    await prisma.jobPost.create({
      data: {
        clientWallet:   ALICE_WALLET,
        title:          "Looking for Solana Developer",
        description:    "Need an experienced Rust and Solana developer to build a custom escrow program and integrate it with a Next.js frontend.",
        budgetSOL:      2.5,
        requiredSkills: ["rust", "solana", "anchor", "next.js"],
        status:         "OPEN",
      },
    });
    console.log("  JobPost: Looking for Solana Developer");
  } else {
    console.log("  JobPost: already exists, skipped");
  }

  // ── Review ──────────────────────────────────────────────────────────────────
  const review = await prisma.review.upsert({
    where:  { escrowPda: COMPLETED_PDA },
    update: {},
    create: {
      escrowPda:        COMPLETED_PDA,
      clientWallet:     ALICE_WALLET,
      freelancerWallet: BOB_WALLET,
      rating:           5,
      comment:          "Excellent work! Bob delivered the project on time and exceeded expectations. Highly recommended.",
    },
  });
  console.log(`  Review: ${review.rating}/5 stars`);

  console.log("\nSeed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
