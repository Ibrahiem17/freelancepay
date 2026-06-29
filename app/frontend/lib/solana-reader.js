const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { AnchorProvider, Program } = require("@coral-xyz/anchor");
const idl = require("../src/idl/freelancepay.json");

const RPC_URLS = {
  devnet:  process.env.DEVNET_RPC_URL  || "https://api.devnet.solana.com",
  mainnet: process.env.MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com",
};

const PROGRAM_IDS = {
  devnet:  process.env.DEVNET_PROGRAM_ID  || "5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX",
  mainnet: process.env.MAINNET_PROGRAM_ID || null,
};

// Dummy wallet — only needed to satisfy AnchorProvider; never signs anything
function makeDummyWallet() {
  const kp = Keypair.generate();
  return {
    publicKey: kp.publicKey,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  };
}

function getReadonlyProvider(network = "devnet") {
  const rpcUrl = RPC_URLS[network] || RPC_URLS.devnet;
  const connection = new Connection(rpcUrl, "confirmed");
  return new AnchorProvider(connection, makeDummyWallet(), { commitment: "confirmed" });
}

function getProgram(network = "devnet") {
  const programId = PROGRAM_IDS[network];
  if (!programId) throw new Error(`No program ID configured for network: ${network}`);
  const networkIdl = { ...idl, address: programId };
  return new Program(networkIdl, getReadonlyProvider(network));
}

// Converts Anchor's enum object { active: {} } → DB enum string "ACTIVE"
function parseStatus(statusObj) {
  const key = Object.keys(statusObj)[0];
  const map = {
    active:            "ACTIVE",
    submitted:         "SUBMITTED",
    completed:         "COMPLETED",
    cancelled:         "CANCELLED",
    revisionRequested: "REVISION_REQUESTED",
  };
  const result = map[key];
  if (!result) throw new Error(`Unknown escrow status key: ${key}`);
  return result;
}

// Fetches every EscrowAccount owned by the program on the given network
async function fetchAllEscrows(network = "devnet") {
  const program = getProgram(network);
  const accounts = await program.account.escrowAccount.all();

  return accounts.map(({ publicKey, account }) => ({
    pda: publicKey.toBase58(),
    account: {
      client:         account.client.toBase58(),
      freelancer:     account.freelancer.toBase58(),
      amount:         account.amount,
      title:          account.title,
      description:    account.description,
      workSubmission: account.workSubmission || null,
      status:         account.status,
      createdAt:      account.createdAt,
      bump:           account.bump,
      escrowIndex:    account.escrowIndex,
      revisionNote:   account.revisionNote || null,
    },
  }));
}

module.exports = { getReadonlyProvider, getProgram, fetchAllEscrows, parseStatus };
