use anchor_lang::prelude::*;

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
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum EscrowStatus {
    Active,
    Submitted,
    Completed,
    Cancelled,
}
