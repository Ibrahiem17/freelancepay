use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the client can perform this action")]
    NotClient,
    #[msg("Only the freelancer can perform this action")]
    NotFreelancer,
    #[msg("Invalid escrow status for this operation")]
    InvalidStatus,
    #[msg("Work has already been submitted")]
    AlreadySubmitted,
}
