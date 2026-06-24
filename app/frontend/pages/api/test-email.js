const {
  sendWorkSubmittedEmail,
  sendRevisionRequestedEmail,
  sendPaymentReleasedEmail,
  sendEscrowCreatedEmail,
  sendEscrowCancelledEmail,
} = require("../../lib/email");
const { ok, err } = require("../../lib/api-helpers");

// DEV ONLY — returns 404 in production.
// POST { type, to } — sends a test email of the specified type to the given address.
// The recipient's emailNotificationsEnabled check is bypassed; the "to" address is used directly.

const SAMPLE_LAMPORTS = BigInt("2000000000"); // 2 SOL
const SAMPLE_PDA = "SamplePDA11111111111111111111111111111111111";

const SAMPLE_ESCROW = {
  pda:              SAMPLE_PDA,
  clientWallet:     "ClientWallet1111111111111111111111111111111",
  freelancerWallet: "FreelancerWallet111111111111111111111111111",
  amountLamports:   SAMPLE_LAMPORTS,
  title:            "Sample Project — Logo Design",
  revisionNote:     "Please use a slightly bolder font and increase the icon size by 20%.",
};

export default async function handler(req, res) {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).end();
    return;
  }

  if (req.method !== "POST") {
    err(res, "Method not allowed", 405);
    return;
  }

  const { type, to } = req.body || {};

  if (!type || !to) {
    err(res, "Body must include { type, to }", 400);
    return;
  }

  const VALID_TYPES = [
    "work_submitted",
    "revision_requested",
    "payment_released",
    "escrow_created",
    "escrow_cancelled",
  ];

  if (!VALID_TYPES.includes(type)) {
    err(res, `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`, 400);
    return;
  }

  // Patch the email module to bypass DB recipient lookup — send directly to `to`.
  // We do this by monkey-patching prisma inside the email module's scope would
  // be invasive; instead we call sendEmail directly with a built template.
  const {
    workSubmittedTemplate,
    revisionRequestedTemplate,
    paymentReleasedTemplate,
    escrowCreatedTemplate,
    escrowCancelledTemplate,
  } = require("../../lib/emailTemplates");
  const { sendEmail } = require("../../lib/email");

  const amountSOL = (Number(SAMPLE_LAMPORTS) / 1_000_000_000).toFixed(4);
  const clientName = "Alice (Client)";
  const freelancerName = "Bob (Freelancer)";

  let subject, html;

  switch (type) {
    case "work_submitted": {
      ({ subject, html } = workSubmittedTemplate({
        clientName,
        freelancerName,
        escrowTitle: SAMPLE_ESCROW.title,
        amountSOL,
        pda: SAMPLE_PDA,
      }));
      break;
    }
    case "revision_requested": {
      ({ subject, html } = revisionRequestedTemplate({
        freelancerName,
        clientName,
        escrowTitle: SAMPLE_ESCROW.title,
        revisionNote: SAMPLE_ESCROW.revisionNote,
        pda: SAMPLE_PDA,
      }));
      break;
    }
    case "payment_released": {
      ({ subject, html } = paymentReleasedTemplate({
        freelancerName,
        escrowTitle: SAMPLE_ESCROW.title,
        amountSOL,
        pda: SAMPLE_PDA,
      }));
      break;
    }
    case "escrow_created": {
      ({ subject, html } = escrowCreatedTemplate({
        clientName,
        freelancerName,
        escrowTitle: SAMPLE_ESCROW.title,
        amountSOL,
        pda: SAMPLE_PDA,
      }));
      break;
    }
    case "escrow_cancelled": {
      ({ subject, html } = escrowCancelledTemplate({
        clientName,
        escrowTitle: SAMPLE_ESCROW.title,
        pda: SAMPLE_PDA,
      }));
      break;
    }
  }

  // Inject a real-looking unsubscribe URL using the "to" address as a stand-in
  const crypto = require("crypto");
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = crypto
    .createHash("sha256")
    .update(to + (process.env.JWT_SECRET || ""))
    .digest("base64url");
  const correctUrl = `${APP_URL}/api/email/unsubscribe?wallet=${encodeURIComponent(to)}&token=${token}`;
  html = html.replace(
    /\/api\/email\/unsubscribe\?wallet=[^&"']*&amp;token=[^"']*/g,
    correctUrl.replace(/&/g, "&amp;")
  );

  const result = await sendEmail({ to, subject, html });
  ok(res, { sent: result.success, id: result.id, subject, type, to });
}
