// Airdrop 2 SOL to a wallet on Solana Devnet.
// Usage: node scripts/airdrop-devnet.js <WALLET_PUBLIC_KEY>
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");

const RPC_URL = "https://api.devnet.solana.com";
const AIRDROP_SOL = 2;

async function main() {
  const walletArg = process.argv[2];
  if (!walletArg) {
    console.error("Usage: node scripts/airdrop-devnet.js <WALLET_PUBLIC_KEY>");
    process.exit(1);
  }

  let pubkey;
  try {
    pubkey = new PublicKey(walletArg);
  } catch {
    console.error("Invalid public key:", walletArg);
    process.exit(1);
  }

  const conn = new Connection(RPC_URL, "confirmed");

  const beforeLamports = await conn.getBalance(pubkey);
  const beforeSol = beforeLamports / LAMPORTS_PER_SOL;
  console.log(`Wallet : ${pubkey.toBase58()}`);
  console.log(`Before : ${beforeSol.toFixed(4)} SOL`);
  console.log(`Requesting ${AIRDROP_SOL} SOL airdrop...`);

  const sig = await conn.requestAirdrop(pubkey, AIRDROP_SOL * LAMPORTS_PER_SOL);
  console.log(`Tx     : ${sig}`);

  const { blockhash, lastValidBlockHeight } =
    await conn.getLatestBlockhash("confirmed");
  await conn.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  const afterLamports = await conn.getBalance(pubkey);
  const afterSol = afterLamports / LAMPORTS_PER_SOL;
  console.log(`After  : ${afterSol.toFixed(4)} SOL`);
  console.log(
    `Delta  : +${(afterSol - beforeSol).toFixed(4)} SOL`
  );
  console.log(
    `\nExplorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`
  );
}

main().catch((e) => {
  console.error("Airdrop failed:", e.message);
  process.exit(1);
});
