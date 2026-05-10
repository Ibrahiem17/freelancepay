import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "../src/idl/freelancepay.json";

const PROGRAM_ID = new PublicKey("5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX");
const DEVNET_RPC = "https://api.devnet.solana.com";

export function getConnection() {
  return new Connection(DEVNET_RPC, "confirmed");
}

export function getProvider(wallet) {
  const connection = getConnection();
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

export function getProgram(wallet) {
  const provider = getProvider(wallet);
  return new Program(idl, provider);
}

export { PROGRAM_ID };
