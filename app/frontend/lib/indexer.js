const prisma = require("./prisma");
const { fetchAllEscrows, parseStatus } = require("./solana-reader");
const { emitNotification } = require("./eventBus");
const {
  sendWorkSubmittedEmail,
  sendRevisionRequestedEmail,
  sendPaymentReleasedEmail,
  sendEscrowCreatedEmail,
  sendEscrowCancelledEmail,
} = require("./email");

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getDisplayName(walletAddress) {
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { displayName: true },
    });
    if (user?.displayName) return user.displayName;
  } catch {}
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

async function ensureUser(walletAddress) {
  await prisma.user.upsert({
    where:  { walletAddress },
    create: { walletAddress },
    update: {},
  });
}

// ─── Notification creation ────────────────────────────────────────────────────

const TRANSITION_MAP = {
  "ACTIVE->SUBMITTED":              { recipient: "CLIENT",     type: "WORK_SUBMITTED"   },
  "SUBMITTED->REVISION_REQUESTED":  { recipient: "FREELANCER", type: "REVISION_REQUESTED" },
  "SUBMITTED->COMPLETED":           { recipient: "FREELANCER", type: "PAYMENT_RELEASED"  },
  "ACTIVE->CANCELLED":              { recipient: "FREELANCER", type: "ESCROW_CANCELLED"  },
  "REVISION_REQUESTED->SUBMITTED":  { recipient: "CLIENT",     type: "WORK_SUBMITTED"   },
};

async function createStatusChangeNotification(escrow, oldStatus, newStatus) {
  const transitionKey = `${oldStatus}->${newStatus}`;
  const rule = TRANSITION_MAP[transitionKey];
  if (!rule) return;

  const recipientWallet =
    rule.recipient === "CLIENT" ? escrow.clientWallet : escrow.freelancerWallet;

  await ensureUser(recipientWallet);

  const freelancerName = await getDisplayName(escrow.freelancerWallet);
  const amountSOL = (Number(escrow.amountLamports) / 1_000_000_000).toFixed(4);
  const title = escrow.title;

  let notifTitle, message;

  switch (transitionKey) {
    case "ACTIVE->SUBMITTED":
      notifTitle = "Work submitted";
      message    = `${freelancerName} submitted work for "${title}"`;
      break;
    case "SUBMITTED->REVISION_REQUESTED":
      notifTitle = "Revision requested";
      message    = `Your client requested changes on "${title}"`;
      break;
    case "SUBMITTED->COMPLETED":
      notifTitle = "Payment released!";
      message    = `You received ${amountSOL} SOL for "${title}"`;
      break;
    case "ACTIVE->CANCELLED":
      notifTitle = "Contract cancelled";
      message    = `The contract "${title}" was cancelled by the client`;
      break;
    case "REVISION_REQUESTED->SUBMITTED":
      notifTitle = "Work resubmitted";
      message    = `${freelancerName} resubmitted work for "${title}" after revisions`;
      break;
    default:
      return;
  }

  const notification = await prisma.notification.create({
    data: {
      recipientWallet,
      type:      rule.type,
      escrowPda: escrow.pda,
      title:     notifTitle,
      message,
    },
  });

  try {
    emitNotification(recipientWallet, {
      id:        notification.id,
      type:      notification.type,
      title:     notification.title,
      message:   notification.message,
      escrowPda: notification.escrowPda,
      createdAt: notification.createdAt.toISOString(),
      read:      false,
    });
  } catch {}

  try {
    switch (transitionKey) {
      case "ACTIVE->SUBMITTED":
      case "REVISION_REQUESTED->SUBMITTED":
        await sendWorkSubmittedEmail(escrow);
        break;
      case "SUBMITTED->REVISION_REQUESTED":
        await sendRevisionRequestedEmail(escrow, escrow.revisionNote || "");
        break;
      case "SUBMITTED->COMPLETED":
        await sendPaymentReleasedEmail(escrow);
        break;
      case "ACTIVE->CANCELLED":
        await sendEscrowCancelledEmail(escrow);
        break;
    }
  } catch {}
}

// ─── Main sync (network-aware) ────────────────────────────────────────────────

async function syncEscrows(network = "devnet") {
  const onChain = await fetchAllEscrows(network);

  let created = 0;
  let updated = 0;
  let statusChanges = 0;

  for (const { pda, account } of onChain) {
    const newStatus      = parseStatus(account.status);
    const amountLamports = BigInt(account.amount.toString());
    const onChainCreatedAt = new Date(Number(account.createdAt.toString()) * 1000);
    const workSubmission = account.workSubmission?.trim() || null;
    const revisionNote   = account.revisionNote?.trim()   || null;

    await ensureUser(account.client);
    await ensureUser(account.freelancer);

    // Look up existing escrow by PDA AND network to avoid cross-network collisions
    const existing = await prisma.escrow.findFirst({ where: { pda, network } });

    if (!existing) {
      await prisma.escrow.create({
        data: {
          pda,
          clientWallet:     account.client,
          freelancerWallet: account.freelancer,
          amountLamports,
          title:            account.title,
          description:      account.description,
          workSubmission,
          revisionNote,
          status:           newStatus,
          network,
          onChainCreatedAt,
          lastSyncedAt:     new Date(),
        },
      });
      created++;
      try {
        await sendEscrowCreatedEmail({
          pda,
          clientWallet:     account.client,
          freelancerWallet: account.freelancer,
          amountLamports,
          title:            account.title,
        });
      } catch {}
    } else {
      const oldStatus = existing.status;
      const statusChanged = oldStatus !== newStatus;

      await prisma.escrow.update({
        where: { id: existing.id },
        data: {
          status:        newStatus,
          workSubmission,
          revisionNote,
          lastSyncedAt:  new Date(),
        },
      });
      updated++;

      if (statusChanged) {
        statusChanges++;
        await createStatusChangeNotification(
          {
            pda,
            clientWallet:     account.client,
            freelancerWallet: account.freelancer,
            amountLamports,
            title:            account.title,
            revisionNote,
          },
          oldStatus,
          newStatus
        );
      }
    }
  }

  const synced = onChain.length;
  console.log(
    `[${network}] Synced ${synced} escrows — ${created} new, ${updated} updated, ${statusChanges} status changes`
  );
  return { network, synced, created, updated, statusChanges };
}

module.exports = { syncEscrows };
