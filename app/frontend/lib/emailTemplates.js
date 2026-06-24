const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ─── Base template ────────────────────────────────────────────────────────────
// All CSS is inline — email clients (Outlook, Gmail) strip <style> blocks.

function baseTemplate({ title, previewText, bodyHTML, wallet = "" }) {
  const crypto = require("crypto");
  const token = crypto
    .createHash("sha256")
    .update(wallet + (process.env.JWT_SECRET || ""))
    .digest("base64url");
  const unsubUrl = `${APP_URL}/api/email/unsubscribe?wallet=${encodeURIComponent(wallet)}&token=${token}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escHtml(title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#fbf5ea;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escHtml(previewText)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbf5ea;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:20px;text-align:center;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;color:#4f433c;letter-spacing:-0.5px;">
                Freelance<span style="text-decoration:underline;text-decoration-color:#9d7bc7;text-underline-offset:3px;">Pay</span>
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:2px solid #e7ddcb;border-radius:16px;padding:32px;">
              ${bodyHTML}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;color:#8a7c70;font-size:12px;line-height:1.6;">
              <p style="margin:0 0 4px;">This is an automated message from FreelancePay &middot; Powered by Solana Devnet</p>
              <p style="margin:0 0 4px;">You received this because you added your email to FreelancePay settings.</p>
              <p style="margin:0;"><a href="${unsubUrl}" style="color:#7d5a45;font-weight:700;">Unsubscribe</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ctaButton(text, url, bgColor = "#d6c8ec") {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
    <tr>
      <td style="background:${bgColor};border-radius:8px;border:2px solid #4f433c;">
        <a href="${escHtml(url)}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#4f433c;text-decoration:none;">${escHtml(text)}</a>
      </td>
    </tr>
  </table>`;
}

function escrowUrl(pda) {
  return `${APP_URL}/escrow/${pda}`;
}

// ─── 1. Work submitted (→ client) ────────────────────────────────────────────

function workSubmittedTemplate({ clientName, freelancerName, escrowTitle, amountSOL, pda }) {
  const url = escrowUrl(pda);
  const bodyHTML = `
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#4f433c;margin:0 0 8px;">Work submitted on your project</h2>
    <p style="color:#8a7c70;font-size:14px;margin:0 0 20px;">Hi ${escHtml(clientName)},</p>
    <p style="color:#4f433c;font-size:15px;line-height:1.6;margin:0 0 16px;">
      <strong>${escHtml(freelancerName)}</strong> has submitted their work for your project:
    </p>
    <div style="background:#f3effb;border:2px solid #d6c8ec;border-radius:12px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:14px;color:#8a7c70;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Project</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#4f433c;">${escHtml(escrowTitle)}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#8a7c70;">Amount locked: <strong style="color:#4f433c;">${escHtml(amountSOL)} SOL</strong></p>
    </div>
    <p style="color:#4f433c;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Review the submission and approve to release payment, or request revisions.
    </p>
    ${ctaButton("Review Submission →", url, "#d6c8ec")}`;

  return {
    subject: `📋 Work submitted: ${escrowTitle}`,
    html: baseTemplate({
      title: `Work submitted: ${escrowTitle}`,
      previewText: `${freelancerName} submitted work for "${escrowTitle}" — ${amountSOL} SOL waiting for your approval.`,
      bodyHTML,
      wallet: "", // filled in by sendWorkSubmittedEmail
    }),
  };
}

// ─── 2. Revision requested (→ freelancer) ────────────────────────────────────

function revisionRequestedTemplate({ freelancerName, clientName, escrowTitle, revisionNote, pda }) {
  const url = escrowUrl(pda);
  const bodyHTML = `
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#4f433c;margin:0 0 8px;">Revision requested</h2>
    <p style="color:#8a7c70;font-size:14px;margin:0 0 20px;">Hi ${escHtml(freelancerName)},</p>
    <p style="color:#4f433c;font-size:15px;line-height:1.6;margin:0 0 16px;">
      <strong>${escHtml(clientName)}</strong> has reviewed your work on <strong>${escHtml(escrowTitle)}</strong> and is requesting changes.
    </p>
    ${revisionNote ? `
    <div style="background:#fdf3ed;border-left:4px solid #f6c6a4;border-radius:4px;padding:14px 16px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#c9744a;text-transform:uppercase;letter-spacing:0.06em;">Client feedback</p>
      <p style="margin:0;font-size:14px;color:#4f433c;line-height:1.6;">${escHtml(revisionNote)}</p>
    </div>` : ""}
    <p style="color:#4f433c;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Your payment (${(revisionNote ? "" : "")}SOL) remains safely locked in escrow while you make the changes.
    </p>
    ${ctaButton("View Feedback & Resubmit →", url, "#f6c6a4")}`;

  return {
    subject: `↩ Revision requested: ${escrowTitle}`,
    html: baseTemplate({
      title: `Revision requested: ${escrowTitle}`,
      previewText: `${clientName} requested changes on "${escrowTitle}". View their feedback and resubmit.`,
      bodyHTML,
      wallet: "",
    }),
  };
}

// ─── 3. Payment released (→ freelancer) ──────────────────────────────────────

function paymentReleasedTemplate({ freelancerName, escrowTitle, amountSOL, pda }) {
  const url = escrowUrl(pda);
  const explorerUrl = `https://explorer.solana.com/address/${pda}?cluster=devnet`;
  const bodyHTML = `
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#4f433c;margin:0 0 8px;">Payment released!</h2>
    <p style="color:#8a7c70;font-size:14px;margin:0 0 20px;">Hi ${escHtml(freelancerName)},</p>
    <p style="color:#4f433c;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Congratulations! Your client approved your work on <strong>${escHtml(escrowTitle)}</strong>. Your payment has been released.
    </p>
    <div style="background:#c2d8b6;border:2px solid #4f433c;border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#4f433c;text-transform:uppercase;letter-spacing:0.06em;">Amount received</p>
      <p style="margin:0;font-size:28px;font-weight:700;color:#4f433c;font-variant-numeric:tabular-nums;">${escHtml(amountSOL)} SOL</p>
    </div>
    <p style="color:#8a7c70;font-size:13px;text-align:center;margin:0 0 20px;">Funds have been transferred to your wallet on Solana Devnet.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="padding-right:8px;">
          ${ctaButton("View Contract", url, "#d6c8ec")}
        </td>
        <td>
          ${ctaButton("View on Explorer", explorerUrl, "#c2d8b6")}
        </td>
      </tr>
    </table>`;

  return {
    subject: `💸 Payment released: ${amountSOL} SOL received!`,
    html: baseTemplate({
      title: `Payment released: ${amountSOL} SOL`,
      previewText: `You received ${amountSOL} SOL for "${escrowTitle}". The payment has been transferred to your wallet.`,
      bodyHTML,
      wallet: "",
    }),
  };
}

// ─── 4. Escrow created (→ freelancer) ────────────────────────────────────────

function escrowCreatedTemplate({ clientName, freelancerName, escrowTitle, amountSOL, pda }) {
  const url = escrowUrl(pda);
  const bodyHTML = `
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#4f433c;margin:0 0 8px;">New contract for you</h2>
    <p style="color:#8a7c70;font-size:14px;margin:0 0 20px;">Hi ${escHtml(freelancerName)},</p>
    <p style="color:#4f433c;font-size:15px;line-height:1.6;margin:0 0 16px;">
      <strong>${escHtml(clientName)}</strong> has created a contract and locked funds in escrow for your project:
    </p>
    <div style="background:#f3effb;border:2px solid #d6c8ec;border-radius:12px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:14px;color:#8a7c70;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Project</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#4f433c;">${escHtml(escrowTitle)}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#8a7c70;">Funds secured: <strong style="color:#4f433c;">${escHtml(amountSOL)} SOL</strong></p>
    </div>
    <p style="color:#4f433c;font-size:14px;line-height:1.6;margin:0 0 4px;">
      The funds are safely locked in a Solana smart contract. Once you submit your work and the client approves, payment is released instantly.
    </p>
    ${ctaButton("View Contract →", url, "#d6c8ec")}`;

  return {
    subject: `🔒 New contract: ${escrowTitle}`,
    html: baseTemplate({
      title: `New contract: ${escrowTitle}`,
      previewText: `${clientName} locked ${amountSOL} SOL in escrow for "${escrowTitle}". View and accept the contract.`,
      bodyHTML,
      wallet: "",
    }),
  };
}

// ─── 5. Escrow cancelled (→ freelancer) ──────────────────────────────────────

function escrowCancelledTemplate({ clientName, escrowTitle, pda }) {
  const url = escrowUrl(pda);
  const bodyHTML = `
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#4f433c;margin:0 0 8px;">Contract cancelled</h2>
    <p style="color:#4f433c;font-size:15px;line-height:1.6;margin:0 0 16px;">
      <strong>${escHtml(clientName)}</strong> has cancelled the contract for <strong>${escHtml(escrowTitle)}</strong>.
    </p>
    <p style="color:#8a7c70;font-size:14px;line-height:1.6;margin:0 0 20px;">
      The locked funds have been returned to the client. This can only happen before any work is submitted — your completed submissions are always protected.
    </p>
    ${ctaButton("View Details →", url, "#f5bcc7")}`;

  return {
    subject: `❌ Contract cancelled: ${escrowTitle}`,
    html: baseTemplate({
      title: `Contract cancelled: ${escrowTitle}`,
      previewText: `${clientName} cancelled the contract "${escrowTitle}". Funds have been returned.`,
      bodyHTML,
      wallet: "",
    }),
  };
}

module.exports = {
  workSubmittedTemplate,
  revisionRequestedTemplate,
  paymentReleasedTemplate,
  escrowCreatedTemplate,
  escrowCancelledTemplate,
  baseTemplate,
  escHtml,
};
