const { Resend } = require("resend");
const prisma = require("./prisma");
const {
  workSubmittedTemplate,
  revisionRequestedTemplate,
  paymentReleasedTemplate,
  escrowCreatedTemplate,
  escrowCancelledTemplate,
} = require("./emailTemplates");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Use Resend's sandbox sender for dev (no domain verification needed).
// For production: verify your domain in Resend dashboard and set NEXT_PUBLIC_APP_DOMAIN.
const FROM_ADDRESS = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `FreelancePay <noreply@${process.env.NEXT_PUBLIC_APP_DOMAIN}>`
  : "FreelancePay <onboarding@resend.dev>";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY env var not set");
  return new Resend(apiKey);
}

function lamportsToSOL(lamports) {
  return (Number(lamports.toString()) / 1_000_000_000).toFixed(4);
}

function truncateWallet(wallet) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

// ─── Core send wrapper ────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
    if (error) {
      console.error("Resend error:", error.message || error);
      return { success: false, error: error.message || "Resend error" };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error("sendEmail exception:", err.message);
    return { success: false, error: err.message };
  }
}

// ─── Recipient resolver ───────────────────────────────────────────────────────

async function getEmailRecipient(walletAddress) {
  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: { email: true, displayName: true, emailNotificationsEnabled: true },
  });
  if (!user?.email) return null;
  if (!user.emailNotificationsEnabled) return null;
  return { email: user.email, displayName: user.displayName || truncateWallet(walletAddress) };
}

async function getDisplayName(walletAddress) {
  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: { displayName: true },
  });
  return user?.displayName || truncateWallet(walletAddress);
}

// ─── Patch template wallet for unsubscribe link ───────────────────────────────

function injectWallet(html, walletAddress) {
  // Templates generate the unsubscribe URL with wallet="" as a placeholder.
  // Replace it after the fact since the wallet isn't known inside baseTemplate.
  const crypto = require("crypto");
  const token = crypto
    .createHash("sha256")
    .update(walletAddress + (process.env.JWT_SECRET || ""))
    .digest("base64url");
  const correctUrl = `${APP_URL}/api/email/unsubscribe?wallet=${encodeURIComponent(walletAddress)}&token=${token}`;
  // Replace the placeholder unsubscribe URL (wallet= is empty in templates)
  return html.replace(
    /\/api\/email\/unsubscribe\?wallet=&token=[^"']*/g,
    correctUrl.replace(/&/g, "&amp;")
  );
}

// ─── Event-specific senders ───────────────────────────────────────────────────

// ACTIVE → SUBMITTED: notify client
async function sendWorkSubmittedEmail(escrow) {
  try {
    const recipient = await getEmailRecipient(escrow.clientWallet);
    if (!recipient) return { success: false, reason: "no_email" };
    const freelancerName = await getDisplayName(escrow.freelancerWallet);
    const amountSOL = lamportsToSOL(escrow.amountLamports);
    const { subject, html } = workSubmittedTemplate({
      clientName: recipient.displayName,
      freelancerName,
      escrowTitle: escrow.title,
      amountSOL,
      pda: escrow.pda,
    });
    const result = await sendEmail({ to: recipient.email, subject, html: injectWallet(html, escrow.clientWallet) });
    if (result.success) console.log(`Email sent to ${escrow.clientWallet} (work submitted)`);
    return result;
  } catch (err) {
    console.error("sendWorkSubmittedEmail:", err.message);
    return { success: false, error: err.message };
  }
}

// SUBMITTED → REVISION_REQUESTED: notify freelancer
async function sendRevisionRequestedEmail(escrow, revisionNote) {
  try {
    const recipient = await getEmailRecipient(escrow.freelancerWallet);
    if (!recipient) return { success: false, reason: "no_email" };
    const clientName = await getDisplayName(escrow.clientWallet);
    const { subject, html } = revisionRequestedTemplate({
      freelancerName: recipient.displayName,
      clientName,
      escrowTitle: escrow.title,
      revisionNote: revisionNote || "",
      pda: escrow.pda,
    });
    const result = await sendEmail({ to: recipient.email, subject, html: injectWallet(html, escrow.freelancerWallet) });
    if (result.success) console.log(`Email sent to ${escrow.freelancerWallet} (revision requested)`);
    return result;
  } catch (err) {
    console.error("sendRevisionRequestedEmail:", err.message);
    return { success: false, error: err.message };
  }
}

// SUBMITTED → COMPLETED: notify freelancer
async function sendPaymentReleasedEmail(escrow) {
  try {
    const recipient = await getEmailRecipient(escrow.freelancerWallet);
    if (!recipient) return { success: false, reason: "no_email" };
    const amountSOL = lamportsToSOL(escrow.amountLamports);
    const { subject, html } = paymentReleasedTemplate({
      freelancerName: recipient.displayName,
      escrowTitle: escrow.title,
      amountSOL,
      pda: escrow.pda,
    });
    const result = await sendEmail({ to: recipient.email, subject, html: injectWallet(html, escrow.freelancerWallet) });
    if (result.success) console.log(`Email sent to ${escrow.freelancerWallet} (payment released)`);
    return result;
  } catch (err) {
    console.error("sendPaymentReleasedEmail:", err.message);
    return { success: false, error: err.message };
  }
}

// New escrow first indexed: notify freelancer
async function sendEscrowCreatedEmail(escrow) {
  try {
    const recipient = await getEmailRecipient(escrow.freelancerWallet);
    if (!recipient) return { success: false, reason: "no_email" };
    const clientName = await getDisplayName(escrow.clientWallet);
    const amountSOL = lamportsToSOL(escrow.amountLamports);
    const { subject, html } = escrowCreatedTemplate({
      clientName,
      freelancerName: recipient.displayName,
      escrowTitle: escrow.title,
      amountSOL,
      pda: escrow.pda,
    });
    const result = await sendEmail({ to: recipient.email, subject, html: injectWallet(html, escrow.freelancerWallet) });
    if (result.success) console.log(`Email sent to ${escrow.freelancerWallet} (escrow created)`);
    return result;
  } catch (err) {
    console.error("sendEscrowCreatedEmail:", err.message);
    return { success: false, error: err.message };
  }
}

// ACTIVE → CANCELLED: notify freelancer
async function sendEscrowCancelledEmail(escrow) {
  try {
    const recipient = await getEmailRecipient(escrow.freelancerWallet);
    if (!recipient) return { success: false, reason: "no_email" };
    const clientName = await getDisplayName(escrow.clientWallet);
    const { subject, html } = escrowCancelledTemplate({
      clientName,
      escrowTitle: escrow.title,
      pda: escrow.pda,
    });
    const result = await sendEmail({ to: recipient.email, subject, html: injectWallet(html, escrow.freelancerWallet) });
    if (result.success) console.log(`Email sent to ${escrow.freelancerWallet} (escrow cancelled)`);
    return result;
  } catch (err) {
    console.error("sendEscrowCancelledEmail:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendEmail,
  sendWorkSubmittedEmail,
  sendRevisionRequestedEmail,
  sendPaymentReleasedEmail,
  sendEscrowCreatedEmail,
  sendEscrowCancelledEmail,
};
