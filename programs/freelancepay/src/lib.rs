/// FreelancePay — Solana escrow program
///
/// Security model:
///   initialize_client_profile  → anyone (creates their own profile)
///   create_escrow              → client only (locks SOL into PDA)
///   submit_work                → registered freelancer only
///   approve_work               → registered client only (releases SOL to freelancer)
///   cancel_escrow              → registered client only; only from Active state
///   request_revision           → registered client only; only from Submitted state
///
/// Multi-escrow: each client has a ClientProfile that tracks escrow_count.
/// Escrow PDA seeds: ["escrow", client_pubkey, escrow_index.to_le_bytes()]
/// Profile PDA seeds: ["client_profile", client_pubkey]
///
/// State machine (EscrowStatus):
///
///   Active ──submit_work──► Submitted ──approve_work──► Completed (account closed)
///     │                         │
///   cancel                request_revision
///   (closed)                    │
///                        RevisionRequested
///                               │
///                          submit_work
///                               └──► Submitted ...
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

    /// Creates a ClientProfile PDA for the signer. Call once per wallet before
    /// the first create_escrow. Fails if called again (PDA already exists).
    pub fn initialize_client_profile(ctx: Context<InitializeClientProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.client_profile;
        profile.owner = ctx.accounts.client.key();
        profile.escrow_count = 0;
        profile.bump = ctx.bumps.client_profile;
        Ok(())
    }

    /// Locks SOL in a new escrow at PDA ["escrow", client, escrow_index].
    /// `escrow_index` must equal client_profile.escrow_count (verified on-chain).
    /// The profile counter is incremented after the escrow is created.
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        title: String,
        description: String,
        freelancer: Pubkey,
        amount: u64,
        escrow_index: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidStatus);
        require!(
            escrow_index == ctx.accounts.client_profile.escrow_count,
            ErrorCode::InvalidStatus
        );

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
        escrow.escrow_index = escrow_index;
        escrow.revision_note = String::new();

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

        ctx.accounts.client_profile.escrow_count += 1;

        Ok(())
    }

    /// Records work submission and transitions status to Submitted.
    /// Allowed from Active or RevisionRequested states.
    pub fn submit_work(ctx: Context<SubmitWork>, work_description: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(
            escrow.status == EscrowStatus::Active
                || escrow.status == EscrowStatus::RevisionRequested,
            ErrorCode::InvalidStatus
        );

        escrow.work_submission = work_description;
        escrow.status = EscrowStatus::Submitted;

        Ok(())
    }

    /// Releases all SOL (amount + rent) to the freelancer and closes the account.
    /// Only callable from Submitted state.
    pub fn approve_work(ctx: Context<ApproveWork>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Submitted, ErrorCode::InvalidStatus);

        escrow.status = EscrowStatus::Completed;

        // Anchor's `close = freelancer` transfers all lamports and closes the account.

        Ok(())
    }

    /// Returns all SOL to the client and closes the account.
    /// Only callable from Active state (before any work is submitted).
    pub fn cancel_escrow(ctx: Context<CancelEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Active, ErrorCode::InvalidStatus);

        escrow.status = EscrowStatus::Cancelled;

        // Anchor's `close = client` transfers all lamports and closes the account.

        Ok(())
    }

    /// Records a revision request and transitions status to RevisionRequested.
    /// Only callable from Submitted state.
    pub fn request_revision(ctx: Context<RequestRevision>, message: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Submitted, ErrorCode::InvalidStatus);

        escrow.revision_note = message;
        escrow.status = EscrowStatus::RevisionRequested;

        Ok(())
    }
}

// ── InitializeClientProfile ──────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeClientProfile<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        init,
        payer = client,
        space = 8 + ClientProfile::INIT_SPACE,
        seeds = [CLIENT_PROFILE_SEED, client.key().as_ref()],
        bump,
    )]
    pub client_profile: Account<'info, ClientProfile>,

    pub system_program: Program<'info, System>,
}

// ── CreateEscrow ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(title: String, description: String, freelancer: Pubkey, amount: u64, escrow_index: u64)]
pub struct CreateEscrow<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        mut,
        seeds = [CLIENT_PROFILE_SEED, client.key().as_ref()],
        bump = client_profile.bump,
        constraint = client_profile.owner == client.key() @ ErrorCode::NotClient,
    )]
    pub client_profile: Account<'info, ClientProfile>,

    #[account(
        init,
        payer = client,
        space = 8 + EscrowAccount::INIT_SPACE,
        seeds = [ESCROW_SEED, client.key().as_ref(), &escrow_index.to_le_bytes()],
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
        constraint = escrow.freelancer == freelancer.key() @ ErrorCode::NotFreelancer,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

// ── ApproveWork ──────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ApproveWork<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    /// CHECK: Verified to be escrow.freelancer via constraint below.
    #[account(
        mut,
        constraint = freelancer.key() == escrow.freelancer @ ErrorCode::NotFreelancer,
    )]
    pub freelancer: UncheckedAccount<'info>,

    #[account(
        mut,
        close = freelancer,
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
        constraint = escrow.client == client.key() @ ErrorCode::NotClient,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

// ── RequestRevision ──────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct RequestRevision<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        mut,
        constraint = escrow.client == client.key() @ ErrorCode::NotClient,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}
