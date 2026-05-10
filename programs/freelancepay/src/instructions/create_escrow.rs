use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::ESCROW_SEED;
use crate::error::ErrorCode;
use crate::state::{EscrowAccount, EscrowStatus};

#[derive(Accounts)]
#[instruction(title: String, description: String, freelancer: Pubkey, amount: u64)]
pub struct CreateEscrow<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        init,
        payer = client,
        space = 8 + EscrowAccount::INIT_SPACE,
        seeds = [ESCROW_SEED, client.key().as_ref()],
        bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateEscrow>,
    title: String,
    description: String,
    freelancer: Pubkey,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidStatus);

    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    escrow.client = ctx.accounts.client.key();
    escrow.freelancer = freelancer;
    escrow.amount = amount;
    escrow.title = title;
    escrow.description = description;
    escrow.work_submission = String::new();
    escrow.status = EscrowStatus::Active;
    escrow.created_at = clock.unix_timestamp;
    escrow.bump = ctx.bumps.escrow;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.client.to_account_info(),
                to: escrow.to_account_info(),
            },
        ),
        amount,
    )?;

    Ok(())
}
