const { Connection, Keypair } = require("@solana/web3.js");
const { AnchorProvider, Program } = require("@coral-xyz/anchor");
const idl = require("../src/idl/freelancepay.json");

const RPC_URL = "https://api.devnet.solana.com";

// Dummy wallet — only needed to satisfy AnchorProvider; never signs anything
function makeDummyWallet() {
  const kp = Keypair.generate();
  return {
    publicKey: kp.publicKey,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  };
}

function getReadonlyProvider() {
  const connection = new Connection(RPC_URL, "confirmed");
  return new AnchorProvider(connection, makeDummyWallet(), { commitment: "confirmed" });
}

function getProgram() {
  return new Program(idl, getReadonlyProvider());
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

// Fetches every EscrowAccount owned by the program from Devnet
async function fetchAllEscrows() {
  const program = getProgram();
  const accounts = await program.account.escrowAccount.all();

  return accounts.map(({ publicKey, account }) => ({
    pda: publicKey.toBase58(),
    account: {
      client:         account.client.toBase58(),
      freelancer:     account.freelancer.toBase58(),
      amount:         account.amount,          // BN — convert to BigInt in indexer
      title:          account.title,
      description:    account.description,
      workSubmission: account.workSubmission || null,
      status:         account.status,          // raw Anchor enum object
      createdAt:      account.createdAt,       // BN (Unix timestamp seconds)
      bump:           account.bump,
      escrowIndex:    account.escrowIndex,
      revisionNote:   account.revisionNote || null,
    },
  }));
}

module.exports = { getReadonlyProvider, getProgram, fetchAllEscrows, parseStatus };
