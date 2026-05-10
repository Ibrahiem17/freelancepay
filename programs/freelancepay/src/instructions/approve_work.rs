use anchor_lang::prelude::*;
use crate::constants::ESCROW_SEED;
use crate::error::ErrorCode;
use crate::state::{EscrowAccount, EscrowStatus};

#[derive(Accounts)]
pub struct ApproveWork<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    /// CHECK: Recipient of payment — validated against escrow.freelancer
    #[account(
        mut,
        constraint = freelancer.key() == escrow.freelancer @ ErrorCode::NotFreelancer,
    )]
    pub freelancer: UncheckedAccount<'info>,

    #[account(
        mut,
        close = freelancer,
        seeds = [ESCROW_SEED, client.key().as_ref()],
        bump = escrow.bump,
        constraint = escrow.client == client.key() @ ErrorCode::NotClient,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

pub fn handler(ctx: Context<ApproveWork>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    require!(escrow.status == EscrowStatus::Submitted, ErrorCode::InvalidStatus);

    escrow.status = EscrowStatus::Completed;

    // close = freelancer transfers all remaining lamports (rent + amount) to freelancer

    Ok(())
}
