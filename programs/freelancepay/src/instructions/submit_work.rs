use anchor_lang::prelude::*;
use crate::constants::ESCROW_SEED;
use crate::error::ErrorCode;
use crate::state::{EscrowAccount, EscrowStatus};

#[derive(Accounts)]
pub struct SubmitWork<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.client.as_ref()],
        bump = escrow.bump,
        constraint = escrow.freelancer == freelancer.key() @ ErrorCode::NotFreelancer,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

pub fn handler(ctx: Context<SubmitWork>, work_description: String) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    require!(escrow.status == EscrowStatus::Active, ErrorCode::InvalidStatus);

    escrow.work_submission = work_description;
    escrow.status = EscrowStatus::Submitted;

    Ok(())
}
