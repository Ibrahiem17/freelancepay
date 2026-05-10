use anchor_lang::prelude::*;
use crate::constants::ESCROW_SEED;
use crate::error::ErrorCode;
use crate::state::{EscrowAccount, EscrowStatus};

#[derive(Accounts)]
pub struct CancelEscrow<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        mut,
        close = client,
        seeds = [ESCROW_SEED, client.key().as_ref()],
        bump = escrow.bump,
        constraint = escrow.client == client.key() @ ErrorCode::NotClient,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

pub fn handler(ctx: Context<CancelEscrow>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    require!(escrow.status == EscrowStatus::Active, ErrorCode::InvalidStatus);

    escrow.status = EscrowStatus::Cancelled;

    // close = client transfers all remaining lamports (rent + amount) back to client

    Ok(())
}
