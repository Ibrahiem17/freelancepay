pub mod constants;
pub mod error;
pub mod state;

use anchor_lang::prelude::*;
use anchor_lang::system_program;

pub use constants::*;
pub use error::ErrorCode;
pub use state::*;

declare_id!("5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX");

#[program]
pub mod freelancepay {
    use super::*;

    pub fn create_escrow(
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

    pub fn submit_work(ctx: Context<SubmitWork>, work_description: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Active, ErrorCode::InvalidStatus);

        escrow.work_submission = work_description;
        escrow.status = EscrowStatus::Submitted;

        Ok(())
    }

    pub fn approve_work(ctx: Context<ApproveWork>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Submitted, ErrorCode::InvalidStatus);

        escrow.status = EscrowStatus::Completed;

        // close = freelancer transfers all lamports (rent + deposited amount) to freelancer

        Ok(())
    }

    pub fn cancel_escrow(ctx: Context<CancelEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Active, ErrorCode::InvalidStatus);

        escrow.status = EscrowStatus::Cancelled;

        // close = client transfers all lamports (rent + deposited amount) back to client

        Ok(())
    }
}

// ── CreateEscrow ────────────────────────────────────────────────────────────

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

// ── SubmitWork ───────────────────────────────────────────────────────────────

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

// ── ApproveWork ──────────────────────────────────────────────────────────────

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

// ── CancelEscrow ─────────────────────────────────────────────────────────────

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
