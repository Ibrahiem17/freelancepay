const { randomUUID } = require("crypto");
const { storeNonce, checkRateLimit } = require("../../../lib/cache");

// Solana public key: 32–44 base58 chars
const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.query;
  if (!wallet || !WALLET_RE.test(wallet)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  if (!checkRateLimit(wallet)) {
    return res.status(429).json({ error: "Too many requests — try again in a minute" });
  }

  const nonce = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const message =
    `Welcome to FreelancePay\n\n` +
    `Sign this message to verify your wallet ownership.\n\n` +
    `Wallet: ${wallet}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

  storeNonce(wallet, nonce, message);

  return res.status(200).json({ message, nonce });
}
