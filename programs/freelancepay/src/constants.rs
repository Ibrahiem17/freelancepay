pub const ESCROW_SEED: &[u8] = b"escrow";

pub const ESCROW_ACCOUNT_SIZE: usize = 8   // discriminator
    + 32  // client: Pubkey
    + 32  // freelancer: Pubkey
    + 8   // amount: u64
    + 4 + 100  // title: String (max 100 chars)
    + 4 + 500  // description: String (max 500 chars)
    + 4 + 500  // work_submission: String (max 500 chars)
    + 1   // status: EscrowStatus
    + 8   // created_at: i64
    + 1;  // bump: u8
