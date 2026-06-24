const crypto = require("crypto");
const prisma = require("../../../lib/prisma");

function generateToken(wallet) {
  return crypto
    .createHash("sha256")
    .update(wallet + (process.env.JWT_SECRET || ""))
    .digest("base64url");
}

function htmlPage(title, message, success = true) {
  const color = success ? "#c2d8b6" : "#f5bcc7";
  const border = success ? "#6db88a" : "#d9627b";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — FreelancePay</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; background: #fbf5ea; color: #4f433c; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border: 2px solid #e7ddcb; border-radius: 16px; padding: 40px 32px; max-width: 440px; width: 90%; text-align: center; box-shadow: 0 8px 24px rgba(79,67,60,.08); }
    .badge { display: inline-block; background: ${color}; border: 2px solid ${border}; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 700; margin-bottom: 16px; }
    h1 { font-family: Georgia, serif; font-size: 22px; margin: 0 0 12px; }
    p { font-size: 15px; color: #8a7c70; margin: 0 0 20px; }
    a { color: #7d5a45; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${success ? "✓ Done" : "⚠ Error"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">← Back to FreelancePay</a>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  const { wallet, token } = req.query;

  if (!wallet || !token) {
    res.setHeader("Content-Type", "text/html");
    res.status(400).end(htmlPage("Invalid link", "This unsubscribe link is missing required parameters.", false));
    return;
  }

  const expected = generateToken(wallet);
  if (token !== expected) {
    res.setHeader("Content-Type", "text/html");
    res.status(400).end(htmlPage("Invalid link", "This unsubscribe link is invalid or has expired.", false));
    return;
  }

  try {
    await prisma.user.update({
      where:  { walletAddress: wallet },
      data:   { emailNotificationsEnabled: false },
    });
  } catch {
    // User row may not exist — that's fine, they're already effectively unsubscribed
  }

  res.setHeader("Content-Type", "text/html");
  res.status(200).end(
    htmlPage(
      "You've been unsubscribed",
      "You will no longer receive email notifications from FreelancePay. You can re-enable them anytime in your account settings."
    )
  );
}
