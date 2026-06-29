// Devnet program ID is the source of truth until mainnet is deployed.
const DEVNET_PROGRAM_ID = "5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX";

export const NETWORKS = {
  devnet: {
    name: "Practice Mode",
    cluster: "devnet",
    rpcUrl: process.env.NEXT_PUBLIC_DEVNET_RPC || "https://api.devnet.solana.com",
    programId: process.env.NEXT_PUBLIC_DEVNET_PROGRAM_ID || DEVNET_PROGRAM_ID,
    explorerBase: "https://explorer.solana.com/?cluster=devnet",
    isMainnet: false,
    warningMessage: "You are using Practice Mode. SOL here has no real value.",
    color: "var(--sage)",
  },
  mainnet: {
    name: "Real Money",
    cluster: "mainnet-beta",
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC || "https://api.mainnet-beta.solana.com",
    // Falls back to devnet ID pre-deployment — replace with real mainnet ID before launch
    programId: process.env.NEXT_PUBLIC_MAINNET_PROGRAM_ID || DEVNET_PROGRAM_ID,
    explorerBase: "https://explorer.solana.com",
    isMainnet: true,
    warningMessage: "⚠️ You are using Real SOL. All transactions are irreversible.",
    color: "var(--peach)",
  },
};

export const DEFAULT_NETWORK = "devnet";
