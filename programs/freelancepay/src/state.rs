use anchor_lang::prelude::*;

/// Tracks how many escrows a client wallet has created.
/// Seeds: ["client_profile", client_pubkey]
/// Initialize once with `initialize_client_profile` before first `create_escrow`.
#[account]
#[derive(InitSpace)]
pub struct ClientProfile {
    pub owner: Pubkey,
    pub escrow_count: u64,
    pub bump: u8,
}

/// One escrow contract between a client and a freelancer.
/// Seeds: ["escrow", client_pubkey, escrow_index.to_le_bytes()]
/// Multiple escrows can exist per client (different escrow_index values).
///
/// Field order is append-only — never reorder. memcmp queries depend on:
///   offset  8 → client    (32 bytes)
///   offset 40 → freelancer (32 bytes)
#[account]
#[derive(InitSpace)]
pub struct EscrowAccount {
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub amount: u64,
    #[max_len(100)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    #[max_len(500)]
    pub work_submission: String,
    pub status: EscrowStatus,
    pub created_at: i64,
    pub bump: u8,
    pub escrow_index: u64,
    #[max_len(300)]
    pub revision_note: String,
}

/// State machine:
///
///   Active ──submit_work──► Submitted ──approve_work──► Completed
///     │                         │
///   cancel_escrow         request_revision
///     │                         │
///     ▼                         ▼
///  Cancelled            RevisionRequested
///                               │
///                          submit_work
///                               │
///                               └──────────────────────► Submitted
///
/// Borsh encodes as u8. Append new variants at the END to preserve on-chain data.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum EscrowStatus {
    Active,           // 0
    Submitted,        // 1
    Completed,        // 2
    Cancelled,        // 3
    RevisionRequested, // 4
}
