import { useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import idl from "../idl/freelancepay.json";

const PROGRAM_ID = new PublicKey("5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX");

function getStatus(statusObj) {
  return Object.keys(statusObj)[0]; // "active" | "submitted" | "completed" | "cancelled"
}

export function useEscrow() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const getProgram = useCallback(() => {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return new Program(idl, provider);
  }, [connection, wallet]);

  const deriveEscrowPDA = useCallback((clientPubkey) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode("escrow"), clientPubkey.toBytes()],
      PROGRAM_ID
    );
    return pda;
  }, []);

  const createEscrow = useCallback(async (title, description, freelancerAddress, amountInSOL) => {
    try {
      const program = getProgram();
      const escrowPDA = deriveEscrowPDA(wallet.publicKey);
      const amountLamports = new BN(Math.round(amountInSOL * LAMPORTS_PER_SOL));

      const signature = await program.methods
        .createEscrow(title, description, new PublicKey(freelancerAddress), amountLamports)
        .accounts({
          client: wallet.publicKey,
          escrow: escrowPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, signature, escrowPDA: escrowPDA.toBase58() };
    } catch (err) {
      console.error("createEscrow:", err);
      return { success: false, error: err.message };
    }
  }, [getProgram, deriveEscrowPDA, wallet.publicKey]);

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
      const accounts = await program.account.escrowAccount.all([
        { memcmp: { offset: 8, bytes: wallet.publicKey.toBase58() } },
      ]);
      return accounts.map((a) => ({
        pda: a.publicKey.toBase58(),
        client: a.account.client.toBase58(),
        freelancer: a.account.freelancer.toBase58(),
        title: a.account.title,
        description: a.account.description,
        workSubmission: a.account.workSubmission,
        revisionNote: a.account.revisionNote ?? "",
        amount: a.account.amount.toNumber(),
        status: getStatus(a.account.status),
        createdAt: a.account.createdAt.toNumber(),
      }));
    } catch (err) {
      console.error("fetchMyEscrowsAsClient:", err);
      return [];
    }
  }, [getProgram, wallet.publicKey]);

  const fetchMyEscrowsAsFreelancer = useCallback(async () => {
    try {
      const program = getProgram();
      const accounts = await program.account.escrowAccount.all([
        { memcmp: { offset: 8 + 32, bytes: wallet.publicKey.toBase58() } },
      ]);
      return accounts.map((a) => ({
        pda: a.publicKey.toBase58(),
        client: a.account.client.toBase58(),
        freelancer: a.account.freelancer.toBase58(),
        title: a.account.title,
        description: a.account.description,
        workSubmission: a.account.workSubmission,
        revisionNote: a.account.revisionNote ?? "",
        amount: a.account.amount.toNumber(),
        status: getStatus(a.account.status),
        createdAt: a.account.createdAt.toNumber(),
      }));
    } catch (err) {
      console.error("fetchMyEscrowsAsFreelancer:", err);
      return [];
    }
  }, [getProgram, wallet.publicKey]);

  const fetchEscrowByPDA = useCallback(async (pda) => {
    try {
      const program = getProgram();
      const a = await program.account.escrowAccount.fetch(new PublicKey(pda));
      return {
        pda,
        client: a.client.toBase58(),
        freelancer: a.freelancer.toBase58(),
        title: a.title,
        description: a.description,
        workSubmission: a.workSubmission,
        revisionNote: a.revisionNote ?? "",
        amount: a.amount.toNumber(),
        status: getStatus(a.status),
        createdAt: a.createdAt.toNumber(),
      };
    } catch (err) {
      console.error("fetchEscrowByPDA:", err);
      return null;
    }
  }, [getProgram]);

  return {
    createEscrow,
    submitWork,
    approveWork,
    cancelEscrow,
    requestRevision,
    fetchMyEscrowsAsClient,
    fetchMyEscrowsAsFreelancer,
    fetchEscrowByPDA,
    connected: !!wallet.publicKey,
    publicKey: wallet.publicKey,
  };
}
