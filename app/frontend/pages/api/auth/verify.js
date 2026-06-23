const nacl = require("tweetnacl");
const { decode: bs58decode } = require("bs58").default;
const prisma = require("../../../lib/prisma");
const { generateJWT, setCookie } = require("../../../lib/auth");
const { consumeNonce } = require("../../../lib/cache");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet, signatureBase58, nonce } = req.body || {};
  if (!wallet || !signatureBase58 || !nonce) {
    return res.status(400).json({ error: "Missing wallet, signatureBase58, or nonce" });
  }

  // Retrieve and consume the stored message (single-use)
  const message = consumeNonce(wallet, nonce);
  if (!message) {
    return res.status(401).json({ error: "Invalid or expired nonce" });
  }

  // Verify ed25519 signature
  let valid = false;
  try {
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = bs58decode(signatureBase58);
    const pubKeyBytes = bs58decode(wallet);
    valid = nacl.sign.detached.verify(msgBytes, sigBytes, pubKeyBytes);
  } catch (err) {
    console.error("Signature decode error:", err.message);
    return res.status(400).json({ error: "Malformed signature or wallet" });
  }

  if (!valid) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Upsert user in database
  let user;
  try {
    user = await prisma.user.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet },
      update: {},
    });
  } catch (err) {
    console.error("DB upsert error:", err.message);
    return res.status(500).json({ error: "Database error" });
  }

  // Issue JWT and set httpOnly cookie
  const token = await generateJWT({ wallet, userId: user.id });
  setCookie(res, token);

  return res.status(200).json({
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: user.displayName,
      isFreelancer: user.isFreelancer,
      isClient: user.isClient,
      avatarUrl: user.avatarUrl,
    },
  });
}
