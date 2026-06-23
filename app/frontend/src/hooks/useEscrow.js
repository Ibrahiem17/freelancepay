import { useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import idl from "../idl/freelancepay.json";

const PROGRAM_ID = new PublicKey("5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX");
const ESCROW_SEED = Buffer.from("escrow");
const CLIENT_PROFILE_SEED = Buffer.from("client_profile");

function getStatus(statusObj) {
  return Object.keys(statusObj)[0];
}

export function useEscrow() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const getProgram = useCallback(() => {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return new Program(idl, provider);
  }, [connection, wallet]);

  const deriveClientProfilePDA = useCallback((clientPubkey) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [CLIENT_PROFILE_SEED, clientPubkey.toBytes()],
      PROGRAM_ID
    );
    return pda;
  }, []);

  const deriveEscrowPDA = useCallback((clientPubkey, escrowIndex) => {
    const indexBuf = Buffer.alloc(8);
    indexBuf.writeBigUInt64LE(BigInt(escrowIndex));
    const [pda] = PublicKey.findProgramAddressSync(
      [ESCROW_SEED, clientPubkey.toBytes(), indexBuf],
      PROGRAM_ID
    );
    return pda;
  }, []);

  const initializeClientProfile = useCallback(async () => {
    try {
      const program = getProgram();
      const profilePDA = deriveClientProfilePDA(wallet.publicKey);
      const signature = await program.methods
        .initializeClientProfile()
        .accounts({
          client: wallet.publicKey,
          clientProfile: profilePDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      return { success: true, signature };
    } catch (err) {
      console.error("initializeClientProfile:", err);
      return { success: false, error: err.message };
    }
  }, [getProgram, deriveClientProfilePDA, wallet.publicKey]);

  const createEscrow = useCallback(async (title, description, freelancerAddress, amountInSOL) => {
    try {
      const program = getProgram();
      const profilePDA = deriveClientProfilePDA(wallet.publicKey);

      // Initialize profile if it doesn't exist yet
      let profile = null;
      try {
        profile = await program.account.clientProfile.fetch(profilePDA);
      } catch {
        const initResult = await initializeClientProfile();
        if (!initResult.success) throw new Error(initResult.error);
        profile = { escrowCount: new BN(0) };
      }

      const escrowIndex = profile.escrowCount;
      const escrowPDA = deriveEscrowPDA(wallet.publicKey, escrowIndex.toNumber());
      const amountLamports = new BN(Math.round(amountInSOL * LAMPORTS_PER_SOL));

      const signature = await program.methods
        .createEscrow(title, description, new PublicKey(freelancerAddress), amountLamports, escrowIndex)
        .accounts({
          client: wallet.publicKey,
          clientProfile: profilePDA,
          escrow: escrowPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, signature, escrowPDA: escrowPDA.toBase58() };
    } catch (err) {
      console.error("createEscrow:", err);
      return { success: false, error: err.message };
    }
  }, [getProgram, deriveClientProfilePDA, deriveEscrowPDA, initializeClientProfile, wallet.publicKey]);

  const submitWork = useCallback(async (escrowPDA, workDescription) => {
    try {
      const program = getProgram();
      const signature = await program.methods
        .submitWork(workDescription)
        .accounts({
          freelancer: wallet.publicKey,
          escrow: new PublicKey(escrowPDA),
        })
        .rpc();
      return { success: true, signature };
    } catch (err) {
      console.error("submitWork:", err);
      return { success: false, error: err.message };
    }
  }, [getProgram, wallet.publicKey]);

  const approveWork = useCallback(async (escrowPDA, freelancerAddress) => {
    try {
      const program = getProgram();
      const signature = await program.methods
        .approveWork()
        .accounts({
          client: wallet.publicKey,
          freelancer: new PublicKey(freelancerAddress),
          escrow: new PublicKey(escrowPDA),
        })
        .rpc();
      return { success: true, signature };
    } catch (err) {
      console.error("approveWork:", err);
      return { success: false, error: err.message };
    }
  }, [getProgram, wallet.publicKey]);

  const requestRevision = useCallback(async (escrowPDA, message) => {
    try {
      const program = getProgram();
      const signature = await program.methods
        .requestRevision(message)
        .accounts({
          client: wallet.publicKey,
          escrow: new PublicKey(escrowPDA),
        })
        .rpc();
      return { success: true, signature };
    } catch (err) {
      console.error("requestRevision:", err);
      return { success: false, error: err.message };
    }
  }, [getProgram, wallet.publicKey]);

  const cancelEscrow = useCallback(async (escrowPDA) => {
    try {
      const program = getProgram();
      const signature = await program.methods
        .cancelEscrow()
        .accounts({
          client: wallet.publicKey,
          escrow: new PublicKey(escrowPDA),
        })
        .rpc();
      return { success: true, signature };
    } catch (err) {
      console.error("cancelEscrow:", err);
      return { success: false, error: err.message };
    }
  }, [getProgram, wallet.publicKey]);

  const fetchMyEscrowsAsClient = useCallback(async () => {
    try {
      const program = getProgram();
      // offset 8 = after discriminator; client pubkey is the first field
      const accounts = await program.account.escrowAccount.all([
        { memcmp: { offset: 8, bytes: wallet.publicKey.toBase58() } },
      ]);
      return accounts.map(mapEscrow);
    } catch (err) {
      console.error("fetchMyEscrowsAsClient:", err);
      return [];
    }
  }, [getProgram, wallet.publicKey]);

  const fetchMyEscrowsAsFreelancer = useCallback(async () => {
    try {
      const program = getProgram();
      // offset 40 = 8 (discriminator) + 32 (client pubkey)
      const accounts = await program.account.escrowAccount.all([
        { memcmp: { offset: 8 + 32, bytes: wallet.publicKey.toBase58() } },
      ]);
      return accounts.map(mapEscrow);
    } catch (err) {
      console.error("fetchMyEscrowsAsFreelancer:", err);
      return [];
    }
  }, [getProgram, wallet.publicKey]);

  const fetchEscrowByPDA = useCallback(async (pda) => {
    try {
      const program = getProgram();
      const a = await program.account.escrowAccount.fetch(new PublicKey(pda));
      return { pda, ...mapEscrowFields(a) };
    } catch (err) {
      console.error("fetchEscrowByPDA:", err);
      return null;
    }
  }, [getProgram]);

  return {
    createEscrow,
    initializeClientProfile,
    submitWork,
    approveWork,
    cancelEscrow,
    requestRevision,
    fetchMyEscrowsAsClient,
    fetchMyEscrowsAsFreelancer,
    fetchEscrowByPDA,
    deriveClientProfilePDA,
    deriveEscrowPDA,
    connected: !!wallet.publicKey,
    publicKey: wallet.publicKey,
  };
}

function mapEscrowFields(a) {
  return {
    client: a.client.toBase58(),
    freelancer: a.freelancer.toBase58(),
    title: a.title,
    description: a.description,
    workSubmission: a.workSubmission,
    revisionNote: a.revisionNote ?? "",
    amount: a.amount.toNumber(),
    status: getStatus(a.status),
    createdAt: a.createdAt.toNumber(),
    escrowIndex: a.escrowIndex.toNumber(),
  };
}

function mapEscrow(a) {
  return { pda: a.publicKey.toBase58(), ...mapEscrowFields(a.account) };
}
