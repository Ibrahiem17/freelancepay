# FreelancePay — Code Walkthrough

> Pure code tour. Business context, tech-stack rationale, and architecture overview are in `CLAUDE.md`. Everything here is about what the code does and why it is written the way it is.

---

## Table of Contents

1. [Dead / unreachable code](#dead--unreachable-code)
2. [`programs/freelancepay/src/state.rs`](#programsfreelancepaysrcstaters)
3. [`programs/freelancepay/src/error.rs`](#programsfreelancepaysrcerrorrs)
4. [`programs/freelancepay/src/constants.rs`](#programsfreelancepaysrcconstantsrs)
5. [`programs/freelancepay/src/lib.rs`](#programsfreelancepaysrclibrs)
6. [`app/frontend/src/idl/freelancepay.json`](#appfrontendsrcidlfreelancepay.json--idl-cross-check)
7. [`app/frontend/pages/_app.js`](#appfrontendpages_appjs)
8. [`app/frontend/pages/_document.js`](#appfrontendpages_documentjs)
9. [`app/frontend/src/hooks/useEscrow.js`](#appfrontendsrchooksusescrowjs)
10. [`app/frontend/pages/index.js`](#appfrontendpagesindexjs)
11. [`app/frontend/pages/how-it-works.js`](#appfrontendpageshow-it-worksjs)
12. [`app/frontend/pages/client.js`](#appfrontendpagesclientjs)
13. [`app/frontend/pages/freelancer.js`](#appfrontendpagesfreelancerjs)
14. [`app/frontend/pages/escrow/[id].js`](#appfrontendpagesescrowidjs)
15. [`app/frontend/components/Layout.js`](#appfrontendcomponentslayoutjs)
16. [`app/frontend/components/Navbar.js`](#appfrontendcomponentsnavbarjs)
17. [`app/frontend/components/Toast.js`](#appfrontendcomponentstoastjs)
18. [`app/frontend/utils/anchor.js`](#appfrontendutilsanchorjs)
19. [`app/frontend/utils/ipfs.js`](#appfrontendutilsipfsjs)
20. [`app/frontend/pages/api/upload.js`](#appfrontendpagesapiuploadjs)
21. [`app/frontend/pages/api/hello.js`](#appfrontendpagesapihellosjs)
22. [`app/frontend/styles/globals.css`](#appfrontendstyleglobalscss)

---

## Dead / unreachable code

`lib.rs` declares only three modules: `pub mod constants; pub mod error; pub mod state;`. The following files compile but are never reached by the binary:

- `programs/freelancepay/src/create_escrow.rs` — dead, not declared
- `programs/freelancepay/src/submit_work.rs` — dead, not declared
- `programs/freelancepay/src/approve_work.rs` — dead, not declared
- `programs/freelancepay/src/cancel_escrow.rs` — dead, not declared
- `programs/freelancepay/src/instructions.rs` — dead, not declared
- `programs/freelancepay/src/instructions/` (entire directory: `approve_work.rs`, `cancel_escrow.rs`, `create_escrow.rs`, `initialize.rs`, `submit_work.rs`) — dead, not declared
- `programs/freelancepay/tests/integration_tests.rs` — test harness, not runtime code
- `app/frontend/utils/anchor.js` — exports `getConnection/getProvider/getProgram/PROGRAM_ID`; no live frontend file imports from it (see [utils/anchor.js](#appfrontendutilsanchorjs))
- `app/frontend/pages/api/hello.js` — Next.js scaffold placeholder, not linked to by the app

---

## `programs/freelancepay/src/state.rs`

Defines the on-chain account struct and the status enum, annotated with Anchor's space-calculation macros.

**Imported by:** `lib.rs` via `pub use state::*;`, which re-exports both types into the crate root.

### `EscrowAccount` struct

```rust
#[account]
#[derive(InitSpace)]
pub struct EscrowAccount {
    pub client: Pubkey,       // offset 8  (after 8-byte discriminator)
    pub freelancer: Pubkey,   // offset 40
    pub amount: u64,          // offset 72
    #[max_len(100)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    #[max_len(500)]
    pub work_submission: String,
    pub status: EscrowStatus,
    pub created_at: i64,
    pub bump: u8,
    #[max_len(300)]
    pub revision_note: String,
}
```

`#[account]` is an Anchor attribute that:
1. Prefixes the serialized data with an 8-byte discriminator (SHA256("account:EscrowAccount")[:8] = `[36, 69, 48, 18, 128, 225, 125, 135]`). This is how Anchor rejects attempts to deserialize the wrong account type.
2. Derives `AnchorSerialize`/`AnchorDeserialize` (Borsh encoding) and `Clone`.

`#[derive(InitSpace)]` generates a `const INIT_SPACE: usize` by summing Borsh byte widths of each field. `#[max_len(N)]` tells `InitSpace` to allocate 4 + N bytes for a `String` (4 for the Borsh u32 length prefix, N for the character bytes). The sum:

| Field           | Bytes        |
|-----------------|-------------|
| client          | 32          |
| freelancer      | 32          |
| amount          | 8           |
| title           | 4+100 = 104 |
| description     | 4+500 = 504 |
| work_submission | 4+500 = 504 |
| status          | 1           |
| created_at      | 8           |
| bump            | 1           |
| revision_note   | 4+300 = 304 |
| **INIT_SPACE**  | **1498**    |

Combined with the 8-byte discriminator, the account requires 1506 bytes on-chain. `lib.rs` uses `space = 8 + EscrowAccount::INIT_SPACE` — never the `ESCROW_ACCOUNT_SIZE` constant in `constants.rs` (which is stale; see [constants.rs](#programsfreelancepaysrcconstantsrs)).

**Field ordering is load-bearing.** The `client` field must remain at byte offset 8 and `freelancer` at offset 40, because `useEscrow.js` uses those exact offsets in `memcmp` filters (see [useEscrow.js](#appfrontendsrchooksusescrowjs)). Inserting any new field before `freelancer` would break all account queries without a reindex.

**`revision_note` was appended last** to preserve the existing offsets for all existing fields.

### `EscrowStatus` enum

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum EscrowStatus {
    Active,           // 0
    Submitted,        // 1
    Completed,        // 2
    Cancelled,        // 3
    RevisionRequested,// 4
}
```

Borsh encodes a unit-variant enum as a single `u8` index. `InitSpace` therefore contributes 1 byte. `RevisionRequested` is appended at the end (index 4) so existing on-chain accounts with `Active`=0 through `Cancelled`=3 decode correctly. The state machine enforced by instruction guards:

```
Active ──submit_work──► Submitted ──approve_work──► Completed
  │                         │
  └──cancel_escrow──►Cancelled  └──request_revision──► RevisionRequested
                                         │
                                         └──submit_work──► Submitted (loop)
```

`cancel_escrow` guards on `Active` only, so once work is submitted (even after multiple revisions), the client can no longer cancel.

---

## `programs/freelancepay/src/error.rs`

Defines the program's custom error codes.

**Imported by:** `lib.rs` via `pub use error::ErrorCode;`.

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Only the client can perform this action")]
    NotClient,        // 6000
    #[msg("Only the freelancer can perform this action")]
    NotFreelancer,    // 6001
    #[msg("Invalid escrow status for this operation")]
    InvalidStatus,    // 6002
    #[msg("Work has already been submitted")]
    AlreadySubmitted, // 6003
}
```

`#[error_code]` generates a Solana error code starting at 6000 (Anchor's reserved space for custom errors). `AlreadySubmitted` (6003) is defined but never used in any live instruction handler — `submit_work` repurposes `InvalidStatus` for all invalid-status cases. It appears in the IDL at code 6003 but is effectively dead.

---

## `programs/freelancepay/src/constants.rs`

```rust
pub const ESCROW_SEED: &[u8] = b"escrow";

pub const ESCROW_ACCOUNT_SIZE: usize = 8   // discriminator
    + 32  // client
    + 32  // freelancer
    + 8   // amount
    + 4 + 100  // title
    + 4 + 500  // description
    + 4 + 500  // work_submission
    + 1   // status
    + 8   // created_at
    + 1;  // bump
```

`ESCROW_SEED` is the byte slice `[101, 115, 99, 114, 111, 119]` (UTF-8 for "escrow"). It is used in every `seeds = [ESCROW_SEED, ...]` attribute in `lib.rs` and mirrored in every IDL PDA seed entry as `[101, 115, 99, 114, 111, 119]`.

**`ESCROW_ACCOUNT_SIZE` is stale.** It was written before `revision_note` was added and does not include 4+300=304 bytes for that field. The actual account size is 1506. No instruction handler references `ESCROW_ACCOUNT_SIZE`; `lib.rs` uses `8 + EscrowAccount::INIT_SPACE` instead. The constant is exported (`pub use constants::*`) but unreferenced — it could mislead anyone sizing transactions or accounts manually.

---

## `programs/freelancepay/src/lib.rs`

The program entry point. Declares the three live modules, sets the program ID, and contains all five instruction handlers plus their `#[derive(Accounts)]` context structs.

**Imports from within the crate:**
```rust
pub use constants::*;   // ESCROW_SEED, ESCROW_ACCOUNT_SIZE (latter unused)
pub use error::ErrorCode;
pub use state::*;       // EscrowAccount, EscrowStatus
```

```rust
declare_id!("5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX");
```

`declare_id!` embeds the program's public key into the binary. When the loader executes the program, it verifies this matches the actual deployed address, preventing the program from being called at a different address.

---

### `create_escrow` + `CreateEscrow`

```rust
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
    escrow.client     = ctx.accounts.client.key();
    escrow.freelancer = freelancer;
    escrow.amount     = amount;
    escrow.title      = title;
    escrow.description = description;
    escrow.work_submission = String::new();
    escrow.status     = EscrowStatus::Active;
    escrow.created_at = clock.unix_timestamp;
    escrow.bump       = ctx.bumps.escrow;
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
    Ok(())
}
```

- `require!(amount > 0, ErrorCode::InvalidStatus)` — reuses `InvalidStatus` rather than defining a dedicated error for zero-amount; a minor semantic mismatch but functionally correct.
- `Clock::get()?` — a sysvar CPI (cross-program invocation) that returns the current cluster timestamp. Stored as `created_at` so the frontend can display when an escrow was opened.
- `ctx.bumps.escrow` — Anchor finds the canonical bump for the PDA during account validation and stores it in the `Bumps` struct. The handler saves it to `escrow.bump` so later instructions can reconstruct the PDA without calling `findProgramAddressSync` on-chain (saves ~1500 compute units).
- `String::new()` for `work_submission` and `revision_note` — initializes to empty rather than leaving uninitialized memory, which Borsh would reject anyway.
- The `system_program::transfer` CPI moves `amount` lamports from the client's wallet into the escrow PDA. Since the PDA is an Anchor `Account<'_, EscrowAccount>`, it is a regular Solana account that can hold lamports alongside its data. This is different from a native token vault; the SOL is simply inside the account.

```rust
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
```

- `#[instruction(...)]` — makes instruction arguments available to account constraints. Not actually used here by any constraint; it was added defensively when the space calculation was considered. Could be removed without effect.
- `#[account(mut)]` on `client` — marks the account writable because it pays rent for the new escrow and transfers lamports.
- `init` — tells Anchor to call `system_program::create_account` to allocate a new account. Fails if the account already exists (i.e., the same client can only have one escrow at a time, because the PDA seeds are `["escrow", client_pubkey]`).
- `payer = client` — the `client` account pays the rent-exempt deposit (2039280 lamports for 1506 bytes at current rent rate, approximately 0.002 SOL).
- `space = 8 + EscrowAccount::INIT_SPACE` — allocates exactly 1506 bytes.
- `seeds = [ESCROW_SEED, client.key().as_ref()], bump` — derives the PDA deterministically. `client.key().as_ref()` is the 32-byte public key. `bump` tells Anchor to search for the canonical bump and store it in `ctx.bumps.escrow`.
- `system_program` — required because Anchor's `init` internally calls into the System program to create the account.

---

### `submit_work` + `SubmitWork`

```rust
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
```

- The dual-status guard (`Active || RevisionRequested`) enables the revision loop: after a client requests changes, the freelancer calls `submit_work` again with a new `work_description`. The previous `work_submission` is overwritten in place — there is no history of submissions on-chain, only the latest.
- Overwriting `work_submission` with up to 500 bytes is safe because the field was allocated at its maximum size when the account was created (`#[max_len(500)]` + `space = 8 + EscrowAccount::INIT_SPACE`). Anchor's borsh serialization will panic if the encoded string exceeds the allocated bytes, so the frontend pre-trims the JSON-encoded submission to ≤500 characters.

```rust
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
```

- `seeds = [ESCROW_SEED, escrow.client.as_ref()]` — the PDA is derived from the **stored** `escrow.client`, not from a signer. This means any wallet can call `submit_work` as long as they can supply the correct PDA and pass the `constraint`.
- `bump = escrow.bump` — reads the saved bump from storage instead of re-deriving it. Anchor still verifies the derived address matches the account's actual address.
- `constraint = escrow.freelancer == freelancer.key() @ ErrorCode::NotFreelancer` — the `@` syntax sets a custom error if the expression is false. Without this, any wallet that knew the PDA address could call `submit_work`.
- No `system_program` needed: no account creation or lamport transfer occurs here.

---

### `approve_work` + `ApproveWork`

```rust
pub fn approve_work(ctx: Context<ApproveWork>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    require!(escrow.status == EscrowStatus::Submitted, ErrorCode::InvalidStatus);
    escrow.status = EscrowStatus::Completed;
    // close = freelancer transfers all lamports to freelancer
    Ok(())
}
```

The comment is the most important thing here. The actual SOL transfer happens via the `close = freelancer` constraint on the `escrow` account (see below), not via an explicit CPI in the handler body. Anchor appends a cleanup step at the end of the instruction: zero the account data, transfer all lamports to `freelancer`, and mark the account as closed (zero owner). The `escrow.status = EscrowStatus::Completed` write is serialized and then immediately discarded when the account is closed — the mutation only matters if something reads the account mid-transaction (nothing does here).

```rust
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
```

- `UncheckedAccount` — Anchor does not deserialize or type-check this account; the `/// CHECK:` doc comment is required by Anchor's lint to suppress the `unchecked_account` warning. The sole check is the `constraint`.
- `#[account(mut)]` on `freelancer` — the freelancer account must be writable to receive lamports.
- `close = freelancer` — when the instruction succeeds, Anchor transfers all lamports from `escrow` to `freelancer` and reclaims the account. The "all lamports" include both the deposited `amount` and the rent-exempt reserve paid by the client during `create_escrow`. The freelancer receives slightly more than `amount`.
- `seeds = [ESCROW_SEED, client.key().as_ref()], bump = escrow.bump` — the PDA is re-verified from the signer `client`. A different keypair cannot pretend to be the client because `client: Signer<'info>` requires a valid signature.
- `constraint = escrow.client == client.key() @ ErrorCode::NotClient` — belt-and-suspenders check that the stored client matches the signer, since the PDA derivation already enforces this transitively.

---

### `cancel_escrow` + `CancelEscrow`

```rust
pub fn cancel_escrow(ctx: Context<CancelEscrow>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    require!(escrow.status == EscrowStatus::Active, ErrorCode::InvalidStatus);
    escrow.status = EscrowStatus::Cancelled;
    // close = client transfers all lamports back to client
    Ok(())
}
```

Structure is symmetrical with `approve_work`, but `close = client` refunds the SOL to the client. The `Active`-only guard is what makes the freelancer's work delivery irreversible from the client's perspective: once `submit_work` moves status to `Submitted`, `cancel_escrow` fails, and `RevisionRequested` is not `Active` either, so the freelancer is safe even during the revision loop.

```rust
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
```

No `system_program` needed because the `close` constraint's lamport transfer does not go through the System program — it is a direct balance mutation by Anchor.

---

### `request_revision` + `RequestRevision`

```rust
pub fn request_revision(ctx: Context<RequestRevision>, message: String) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    require!(escrow.status == EscrowStatus::Submitted, ErrorCode::InvalidStatus);
    escrow.revision_note = message;
    escrow.status = EscrowStatus::RevisionRequested;
    Ok(())
}
```

Only callable when status is `Submitted`, i.e., after the freelancer has submitted work. Stores the client's feedback text in `revision_note` (max 300 bytes enforced at account creation) and flips status to `RevisionRequested`. This signals `submit_work` that resubmission is allowed.

```rust
#[derive(Accounts)]
pub struct RequestRevision<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, client.key().as_ref()],
        bump = escrow.bump,
        constraint = escrow.client == client.key() @ ErrorCode::NotClient,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}
```

No `close`, no `system_program` — just a mutation in place. The freelancer account is not included because the program does not read or write it; the frontend reads `revisionNote` from the account state separately.

---

## `app/frontend/src/idl/freelancepay.json` — IDL cross-check

The IDL is a hand-maintained JSON file (Anchor's `build` command panics on Windows with the installed Solana toolchain; it was manually updated). It is consumed by `@coral-xyz/anchor`'s `Program` class to encode/decode instructions and accounts.

**Cross-check against Rust source:**

| Element | IDL | Rust | Match? |
|---|---|---|---|
| Program address | `5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX` | `declare_id!(...)` | ✓ |
| `EscrowAccount` discriminator | `[36,69,48,18,128,225,125,135]` | SHA256("account:EscrowAccount")[:8] | ✓ |
| `EscrowAccount` field order | client, freelancer, amount, title, description, workSubmission, status, createdAt, bump, revisionNote | Same order in `state.rs` | ✓ |
| `EscrowStatus` variants | Active, Submitted, Completed, Cancelled, RevisionRequested | Same in `state.rs` | ✓ |
| Errors 6000–6003 | NotClient, NotFreelancer, InvalidStatus, AlreadySubmitted | Same in `error.rs` | ✓ |
| `requestRevision` discriminator | `[205,195,75,171,242,149,90,14]` | SHA256("global:request_revision")[:8] | ✓ (manually computed) |
| `createEscrow` PDA seeds in IDL | `["escrow", client]` | `[ESCROW_SEED, client.key().as_ref()]` | ✓ |
| `submitWork` PDA seeds in IDL | `["escrow", escrow.client]` | `[ESCROW_SEED, escrow.client.as_ref()]` | ✓ |

**No discrepancies found.** The IDL accurately reflects the deployed program.

One subtlety: `submitWork`'s IDL seed path uses `"path": "escrow.client", "account": "EscrowAccount"` rather than a signer. The Anchor client resolves this by reading the `client` field from the already-fetched escrow account state. In practice, callers pass `escrow` directly by address (as `useEscrow.js` does), so the seed path is only used for optional client-side PDA derivation.

---

## `app/frontend/pages/_app.js`

Wraps every page with Solana wallet context providers. Nothing is rendered here directly.

**Imports consumed by every page:** `useWallet`, `useConnection` (from `@solana/wallet-adapter-react`) and `WalletMultiButton` (from `@solana/wallet-adapter-react-ui`) become available to all child components because they are provided here.

```js
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}
```

`@solana/web3.js` uses Node's `Buffer` internally, but Next.js pages run in the browser where `Buffer` is not a global. This shim runs once on module load in the browser environment. The `typeof window !== "undefined"` guard prevents it from running during Next.js server-side rendering (where `Buffer` is already available natively).

```js
const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
```

`useMemo` with an empty dependency array creates the adapter array once. Re-creating it every render would cause `WalletProvider` to remount.

```js
<ConnectionProvider endpoint={DEVNET_RPC}>
  <WalletProvider wallets={wallets} autoConnect>
    <WalletModalProvider>
      <Component {...pageProps} />
    </WalletModalProvider>
  </WalletProvider>
</ConnectionProvider>
```

Provider nesting order matters: `ConnectionProvider` creates the `Connection` object, `WalletProvider` depends on it via `useConnection`, and `WalletModalProvider` depends on `WalletProvider`. `autoConnect` re-connects the previously used wallet on page load without a user interaction.

---

## `app/frontend/pages/_document.js`

Standard Next.js Pages Router custom document. Sets `lang="en"` on the `<html>` tag. No app-specific logic; not a component that re-renders.

---

## `app/frontend/src/hooks/useEscrow.js`

The single interface between the frontend and the on-chain program. Every RPC call, account query, and PDA derivation goes through this hook.

**Imports:**
- `AnchorProvider, Program, BN` from `@coral-xyz/anchor` — Anchor's JS client
- `PublicKey, SystemProgram, LAMPORTS_PER_SOL` from `@solana/web3.js`
- `idl` from `../idl/freelancepay.json`

**Consumed by:** `pages/client.js`, `pages/freelancer.js`, `pages/escrow/[id].js`.

**Return shape:** Every mutating function returns `{ success: true, signature }` on success or `{ success: false, error: err.message }` on failure. Callers **must** check `r.success`; the functions never throw (all errors are caught internally). Fetch functions return the data array or object directly (empty array / `null` on error).

---

### `getStatus(statusObj)`

```js
function getStatus(statusObj) {
  return Object.keys(statusObj)[0];
}
```

Anchor deserializes an enum variant as a JS object `{ active: {} }` or `{ revisionRequested: {} }`. `Object.keys(...)[0]` extracts the variant name as a lowercase camelCase string. This string is used throughout the frontend as the canonical status identifier (e.g., `"revisionRequested"`).

---

### `getProgram()`

```js
const getProgram = useCallback(() => {
  if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program(idl, provider);
}, [connection, wallet]);
```

`AnchorProvider` wraps a `Connection` (devnet RPC) and a wallet adapter that can sign transactions. `new Program(idl, provider)` parses the IDL and attaches the provider — giving access to `.methods.<instruction>().accounts({}).rpc()`. The program is constructed fresh on every call rather than being memoized, because `wallet` changes on connect/disconnect and would need to be in the dependency array regardless.

---

### `deriveEscrowPDA(clientPubkey)`

```js
const deriveEscrowPDA = useCallback((clientPubkey) => {
  const [pda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("escrow"), clientPubkey.toBytes()],
    PROGRAM_ID
  );
  return pda;
}, []);
```

`findProgramAddressSync` iterates bumps from 255 downward, hashing `SHA256(seeds + program_id + "ProgramDerivedAddress")` until it finds an address that is off the ed25519 curve (a valid PDA). The matching bump is returned as the second array element but discarded here — `bump = escrow.bump` is read from on-chain state in every instruction that needs it.

`new TextEncoder().encode("escrow")` produces `Uint8Array [101,115,99,114,111,119]` — the UTF-8 bytes of the string `"escrow"`, matching `ESCROW_SEED` in Rust. `clientPubkey.toBytes()` is the 32-byte compressed public key. The concatenation of these two seeds plus `PROGRAM_ID` is what the Rust program uses in every `seeds = [ESCROW_SEED, client.key().as_ref()]` attribute.

`deriveEscrowPDA` is only called in `createEscrow` (when the client creates their own PDA) and is not needed for freelancer or detail page flows where the PDA is already known from the fetched account data.

---

### `createEscrow(title, description, freelancerAddress, amountInSOL)`

```js
const amountLamports = new BN(Math.round(amountInSOL * LAMPORTS_PER_SOL));
```

`LAMPORTS_PER_SOL = 1_000_000_000`. Floating-point multiplication can produce fractional lamports (e.g., 0.1 SOL = 99999999.99999999 lamports), so `Math.round` is applied before wrapping in `BN`. `BN` is arbitrary-precision integers required because JavaScript's `number` cannot represent 64-bit integers precisely (the `amount` field on-chain is `u64`).

The `.accounts({})` call passes `client`, `escrow`, and `systemProgram`. Anchor resolves the PDA automatically from the IDL's seed definition, but the code passes `escrowPDA` explicitly for clarity.

Called by: the create-escrow form in `pages/client.js`.

---

### `submitWork(escrowPDA, workDescription)`

Passes the pre-encoded JSON string (assembled by the caller) as `workDescription`. The PDA is already known and passed as a `PublicKey`. The freelancer's wallet is the signer. Called by `pages/freelancer.js:handleSubmitWork` and `pages/escrow/[id].js:handleSubmitWork`.

---

### `approveWork(escrowPDA, freelancerAddress)`

Both `escrow` and `freelancer` must be passed as accounts because the `close = freelancer` constraint needs the freelancer's actual on-chain address to credit lamports. Called by `pages/client.js:handleApprove` and `pages/escrow/[id].js:handleApprove`.

---

### `requestRevision(escrowPDA, message)`

```js
const requestRevision = useCallback(async (escrowPDA, message) => {
  try {
    const program = getProgram();
    const signature = await program.methods
      .requestRevision(message)
      .accounts({ client: wallet.publicKey, escrow: new PublicKey(escrowPDA) })
      .rpc();
    return { success: true, signature };
  } catch (err) {
    console.error("requestRevision:", err);
    return { success: false, error: err.message };
  }
}, [getProgram, wallet.publicKey]);
```

Called by `pages/client.js:handleRequestRevision` and `pages/escrow/[id].js:handleRequestRevision`.

---

### `cancelEscrow(escrowPDA)`

Does not need `freelancer` as an account because `close = client` refunds to the signer. Called by `pages/client.js:handleCancel` and `pages/escrow/[id].js:handleCancel`.

---

### `fetchMyEscrowsAsClient()` and `fetchMyEscrowsAsFreelancer()`

```js
// Client query
await program.account.escrowAccount.all([
  { memcmp: { offset: 8, bytes: wallet.publicKey.toBase58() } },
]);

// Freelancer query
await program.account.escrowAccount.all([
  { memcmp: { offset: 8 + 32, bytes: wallet.publicKey.toBase58() } },
]);
```

`program.account.escrowAccount.all(filters)` sends a `getProgramAccounts` RPC call with server-side filters. `memcmp` (memory compare) checks that `bytes` (a base58 public key, 32 bytes decoded) matches the account data at `offset`.

- **Offset 8** = after the 8-byte discriminator, which is where `client: Pubkey` lives (as established by the struct field order in `state.rs`).
- **Offset 40** (`8 + 32`) = after discriminator + `client`, which is where `freelancer: Pubkey` lives.

Each query returns only accounts where the calling wallet is the client or freelancer respectively — without fetching every account in the program. The RPC node does the filtering.

The result mapper reads `a.account.revisionNote ?? ""` — the `??` (nullish coalescing) guards against accounts created before `revision_note` was added (though in practice all devnet accounts are fresh).

`a.account.amount.toNumber()` — Anchor returns `u64` as a `BN`; `.toNumber()` converts to JS `number`. Safe here because realistic SOL amounts fit in a JS 53-bit integer.

`a.account.createdAt.toNumber()` — same for `i64` Unix timestamp.

---

### `fetchEscrowByPDA(pda)`

```js
const a = await program.account.escrowAccount.fetch(new PublicKey(pda));
```

Fetches a single account by address. Returns `null` on error (account not found, network issue). The detail page (`escrow/[id].js`) relies on this.

---

## `app/frontend/pages/index.js`

Landing page. No on-chain calls. Uses `useWallet()` to decide whether to show the wallet connect button or the CTA links. Pure display: two static arrays (`STATS`, `STEPS`) rendered as cards. `WalletMultiButton` is dynamically imported with `{ ssr: false }` because it reads `window` at load time and would crash during Next.js server-side rendering.

---

## `app/frontend/pages/how-it-works.js`

Explanatory page. No wallet interaction, no on-chain calls. Two static arrays (`STEPS`, `QUESTIONS`) rendered as cards. Fully server-renderable.

---

## `app/frontend/pages/client.js`

Client dashboard. Imports: `useEscrow` (for `createEscrow`, `approveWork`, `cancelEscrow`, `requestRevision`, `fetchMyEscrowsAsClient`) and `parseSubmission` from `utils/ipfs.js`.

### `STATUS_LABELS` map

```js
const STATUS_LABELS = {
  active: "Active", submitted: "Submitted", completed: "Completed",
  cancelled: "Cancelled", revisionRequested: "Revision Requested",
};
```

Maps the `getStatus()` strings to display text. The `StatusBadge` component applies `badge-${status}` as a CSS class, so each status has a corresponding `.badge-<status>` rule in `globals.css`.

### `EscrowCard` component

Local state: `showRevision` (boolean toggle for the inline revision form) and `revMsg` (textarea value). These are reset to defaults when a revision is sent successfully (in `handleRevision`).

```js
const parsed = parseSubmission(escrow.workSubmission);
```

`parseSubmission` is called unconditionally on `workSubmission` to normalize both old plain-text submissions and new JSON-encoded ones (see [utils/ipfs.js](#appfrontendutilsipfsjs)).

The "✓ Approve & Pay" button and "↩ Request Revision" button are both rendered only when `isSubmitted`. Both are disabled while `busy` (the page-level loading flag). The revision form appears inline below the buttons when `showRevision` is true.

`handleRevision` calls `onRequestRevision(escrow, revMsg.trim())` which maps to `handleRequestRevision` in `ClientPage`, which calls `requestRevision` from the hook.

### `ClientPage` — data flow

```js
const loadEscrows = useCallback(async () => {
  if (!publicKey) return;
  setFetching(true);
  const data = await fetchMyEscrowsAsClient();
  setEscrows(data.sort((a, b) => b.createdAt - a.createdAt));
  setFetching(false);
}, [publicKey, fetchMyEscrowsAsClient]);
```

Sorted newest-first by `createdAt` (Unix timestamp). Called on mount and after every mutation. Uses a separate `fetching` flag (spinner only) vs. `loading` (disables action buttons) so the UI is not entirely blocked during background refreshes.

Every handler (approve, cancel, revision) follows the pattern: `setLoading(true)` → call hook function → check `r.success` → set toast → `await loadEscrows()` → `setLoading(false)`.

---

## `app/frontend/pages/freelancer.js`

Freelancer dashboard. Imports: `useEscrow` (for `submitWork`, `fetchMyEscrowsAsFreelancer`), `uploadToIPFS` and `parseSubmission` from `utils/ipfs.js`.

### `EscrowCard` — file upload and submission

Local state: `showForm`, `note` (textarea), `file` (File object or null), `uploading` (separate from `busy`). `fileInputRef` is a ref to a hidden `<input type="file">` triggered by the "📎 Attach File" button.

```js
const canSubmit = escrow.status === "active" || escrow.status === "revisionRequested";
```

Controls both whether the submit button renders and whether the form is shown.

```js
async function handleSubmit(e) {
  // ... upload file if present ...
  let trimmedNote = note.trim();
  let encoded = JSON.stringify({ note: trimmedNote, file: ipfsUrl, name: fileName });
  while (encoded.length > 500 && trimmedNote.length > 0) {
    trimmedNote = trimmedNote.slice(0, -1);
    encoded = JSON.stringify({ note: trimmedNote, file: ipfsUrl, name: fileName });
  }
  await onSubmitWork(escrow.pda, encoded);
}
```

The JSON encoding `{ note, file, name }` must fit in 500 characters (the on-chain `work_submission` field limit). If the URL + JSON overhead already consumes most of the 500 bytes, the text note is trimmed character by character from the end. An IPFS URL is approximately 87 characters, so a note of up to ~380 characters fits comfortably alongside it.

`uploading` and `busy` are independent: `uploading` is true only during the Pinata HTTP request; `busy` is the page-level flag set during the Anchor RPC call. Both disable the submit button.

The revision-context label changes: the submit button reads "✍ Resubmit Work" / "Resubmit Work On-Chain" when `status === "revisionRequested"`. This is purely cosmetic.

---

## `app/frontend/pages/escrow/[id].js`

Detail view for a single escrow, accessible to both parties. The `id` in the URL is the PDA address (base58). Imports all five hook functions plus `uploadToIPFS` and `parseSubmission`.

```js
const { id } = router.query;
```

`id` is undefined during the first render (Next.js hydration). The `reload` function guards `if (!id || !publicKey) return;`, so no fetch happens until both are available.

### Role detection

```js
const isClient     = escrow && publicKey && escrow.client === publicKey.toBase58();
const isFreelancer = escrow && publicKey && escrow.freelancer === publicKey.toBase58();
```

String comparison (both are base58). An observer who is neither client nor freelancer sees the escrow details (PDA, amounts, status, submitted work) but no action buttons.

### TIMELINE progress bar

```js
const TIMELINE = ["active", "submitted", "completed"];
```

Only the three "forward" statuses. When `escrow.status` is `"revisionRequested"`, `TIMELINE.indexOf("revisionRequested")` returns `-1`, so `done = TIMELINE.indexOf(escrow.status) >= i` is false for all steps — the progress bar shows no steps highlighted. This is an intentional side-effect: revision is a back-step, and showing "submitted" as done while actually in revision would be misleading. When `isCancelled` is true the entire timeline is hidden.

### Submission display

```js
const submission = escrow?.workSubmission ? parseSubmission(escrow.workSubmission) : null;
```

`parseSubmission` returns `{ note, file, name }`. The `file` field (IPFS gateway URL) drives the "↓ Download Deliverable" button. If `submission` is null (no work submitted yet) the entire "Work Submitted" card is hidden.

### Action card visibility rules

| Card | Shown when |
|---|---|
| "Review Delivery" (approve + revision) | `isClient && status === "submitted"` |
| "Cancel Escrow" | `isClient && status === "active"` |
| "Submit / Resubmit Your Work" | `isFreelancer && canFreelancerSubmit` |
| "Revision Requested" orange note | `escrow.revisionNote && status === "revisionRequested"` |

The file upload form in the freelancer submit card is identical in logic to `freelancer.js:handleSubmit`.

---

## `app/frontend/components/Layout.js`

Wraps each page with `<Head>`, `<Navbar>`, a content div, and a `<footer>`. The `title` prop is interpolated into `<title>{title} — FreelancePay</title>`. The content div uses `min-height: calc(100vh - 90px)` to push the footer to the bottom (90px ≈ UMT banner 30px + navbar 60px).

**Imported by:** every page file.

---

## `app/frontend/components/Navbar.js`

Renders the top UMT banner and the sticky nav. `useRouter().pathname` applies an active-link highlight (sets `color: #e2e8f0`) to the current route's nav item. `WalletMultiButton` is dynamically imported with `{ ssr: false }` (same SSR guard as in other files).

---

## `app/frontend/components/Toast.js`

```js
useEffect(() => {
  if (!msg) return;
  const t = setTimeout(onClose, 6000);
  return () => clearTimeout(t);
}, [msg, onClose]);
```

Auto-dismisses after 6 seconds. The cleanup function (`clearTimeout`) runs when `msg` changes before the timeout fires — preventing a stale close from firing if the user triggers a new toast. `onClose` is a `useCallback(() => setToast(null), [])` in the parent, stable across renders.

When `msg.signature` is present, renders a link to `https://explorer.solana.com/tx/<signature>?cluster=devnet`. This is only available for successful transactions (successful RPC calls return the transaction signature; errors throw before getting one).

---

## `app/frontend/utils/anchor.js`

**Dead code.** Exports `getConnection`, `getProvider`, `getProgram`, and `PROGRAM_ID`. No live file imports from this module. `useEscrow.js` builds its own `AnchorProvider` and `Program` inline using `useConnection()` and `useWallet()` from the wallet adapter context, which is the correct approach in a React component (it reacts to connection/wallet changes). `utils/anchor.js` would only be useful for non-hook contexts (server-side scripts, CLI tools) and is never used.

---

## `app/frontend/utils/ipfs.js`

Exports `uploadToIPFS(file)` and `parseSubmission(raw)`. **Imported by:** `pages/freelancer.js`, `pages/escrow/[id].js`, and `pages/client.js` (client imports `parseSubmission` only).

### `uploadToIPFS(file)`

```js
const MAX_BYTES = 25 * 1024 * 1024;

export async function uploadToIPFS(file) {
  if (file.size > MAX_BYTES) {
    return { error: "File exceeds the 25 MB limit. Please choose a smaller file." };
  }
  const fd = new FormData();
  fd.append("file", file, file.name);
  // ...
  res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
    method: "POST",
    body: fd,
  });
```

`FormData.append("file", file, file.name)` creates a multipart/form-data body with the file under the key `"file"`. The browser sets `Content-Type: multipart/form-data; boundary=<random>` automatically when `body` is a `FormData`. This exact header (including the boundary) is forwarded to Pinata by the server-side proxy.

The filename is passed as a URL query parameter (`?filename=...`) rather than being parsed from the multipart body — this avoids needing `formidable` or `busboy` on the server. `encodeURIComponent` handles filenames with spaces or special characters.

Returns `{ cid, url, name }` on success, `{ error }` on any failure (size check, network error, non-ok HTTP response from the proxy). Callers check `result.error` before proceeding.

### `parseSubmission(raw)`

```js
export function parseSubmission(raw) {
  if (!raw) return { note: "", file: null, name: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      note: typeof parsed.note === "string" ? parsed.note : raw,
      file: typeof parsed.file === "string" ? parsed.file : null,
      name: typeof parsed.name === "string" ? parsed.name : null,
    };
  } catch {
    return { note: raw, file: null, name: null };
  }
}
```

Handles two formats that may exist in `work_submission` on-chain:
1. **New format** (JSON): `{"note":"...", "file":"https://gateway.pinata.cloud/ipfs/<CID>", "name":"filename.pdf"}` — produced by `handleSubmit` in `freelancer.js` and `escrow/[id].js`.
2. **Old format** (plain text): submissions made before the IPFS feature was added. `JSON.parse` throws, the `catch` returns the raw string as `note` with `file: null`.

The type-checks (`typeof parsed.note === "string"`) guard against malformed JSON that parsed successfully but has unexpected types. If `parsed.note` is not a string, it falls back to the entire raw string.

---

## `app/frontend/pages/api/upload.js`

Server-side Next.js API route that proxies file uploads to Pinata. Never runs in the browser.

```js
export const config = { api: { bodyParser: false } };
```

Disables Next.js's built-in body parser, which would try to parse the request body as JSON or form data and buffer it into a parsed object. We need the raw bytes to forward as-is to Pinata (with the original multipart boundary intact).

```js
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
```

Manually reads the Node.js request stream into a `Buffer`. The `Buffer.isBuffer(chunk)` check is defensive — Node's HTTP module always emits `Buffer`s, but the check prevents crashes if a middleware layer wraps chunks as strings.

```js
const jwt = process.env.PINATA_JWT;
if (!jwt) return res.status(500).json({ error: "PINATA_JWT is not configured..." });
```

`process.env.PINATA_JWT` is a server-side environment variable — it is never sent to the browser. `PINATA_JWT` is defined in `.env.local` (gitignored) locally and must be added manually in Vercel's environment variable settings for production.

```js
const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": contentType,   // forwarded verbatim, includes boundary
  },
  body,
});
```

`contentType` is the original `Content-Type` from the browser request: `multipart/form-data; boundary=<random-boundary>`. Pinata's API requires this exact header to parse the multipart body. If the header were omitted or changed, Pinata would fail to identify the file part.

On Pinata success, returns `{ cid: data.IpfsHash, url: "https://gateway.pinata.cloud/ipfs/<CID>", name: filename }`. The `url` is assembled server-side so the client never needs to know the gateway base URL.

---

## `app/frontend/pages/api/hello.js`

Next.js scaffold placeholder (`res.status(200).json({ name: "John Doe" })`). Not linked to by any live code.

---

## `app/frontend/styles/globals.css`

All global styles. No CSS modules used; class names are applied directly in JSX strings.

### CSS custom properties (`:root`)

All colors defined as variables: `--bg` (deep navy `#0a0f1e`), `--bg-card`, `--bg-input`, `--border`, `--border-hi`, `--text`, `--muted`, `--purple` (`#9945FF`, Solana brand), `--green` (`#14F195`, Solana brand), `--blue`, `--amber`, `--red`, `--orange` (`#f97316`, added for revision UI). All component rules consume these variables, so a theme change only requires editing `:root`.

### Status badge system

```css
.badge-active            { background: rgba(59,130,246,0.15);  color: #60a5fa;        ... }
.badge-submitted         { background: rgba(245,158,11,0.15);  color: #fbbf24;        ... }
.badge-completed         { background: var(--green-lo);         color: var(--green);   ... }
.badge-cancelled         { background: rgba(239,68,68,0.1);    color: #f87171;        ... }
.badge-revisionRequested { background: rgba(249,115,22,0.12);  color: var(--orange);  ... }
```

The class name is constructed dynamically: `className={\`badge badge-${status}\`}`. The `status` string comes from `getStatus()` in `useEscrow.js` (camelCase, e.g., `"revisionRequested"`), so the CSS class must also be camelCase — `badge-revisionRequested` not `badge-revision-requested`.

### Revision-specific styles

`.revision-box` — orange-tinted background and border (using `rgba(249,115,22,...)`) to visually distinguish revision feedback from the neutral `.work-box`. Used in `freelancer.js` and `escrow/[id].js`.

### File attachment styles

`.file-attach` — flex row for the "📎 Attach File" button, filename display, and remove button. `.file-name` truncates long filenames with `text-overflow: ellipsis`. `.btn-download` — purple-tinted inline-flex anchor element with `text-decoration: none` (since it uses `<a>` but looks like a button).

### Wallet adapter overrides

```css
.wallet-adapter-button { background: var(--purple) !important; ... }
```

The `!important` declarations are required because the wallet adapter library injects its own stylesheet with high-specificity rules. Without `!important`, the adapter's default teal button would override the theme color.

### Responsive

```css
@media (max-width: 600px) {
  .navbar-links a:not(.devnet-badge) { display: none; }
}
```

Hides nav text links on small screens while keeping the DEVNET badge and `WalletMultiButton` (the adapter button is not an `<a>` tag, so `:not(.devnet-badge)` alone is sufficient to exclude it).

---

## Files documented vs. skipped

**Documented (22 files):**
`state.rs`, `error.rs`, `constants.rs`, `lib.rs`, `freelancepay.json`, `_app.js`, `_document.js`, `useEscrow.js`, `index.js`, `how-it-works.js`, `client.js`, `freelancer.js`, `escrow/[id].js`, `Layout.js`, `Navbar.js`, `Toast.js`, `anchor.js`, `ipfs.js`, `upload.js`, `hello.js`, `globals.css`, plus the IDL cross-check section.

**Skipped as dead/unused (10 files):**
`src/create_escrow.rs`, `src/submit_work.rs`, `src/approve_work.rs`, `src/cancel_escrow.rs`, `src/instructions.rs`, `src/instructions/approve_work.rs`, `src/instructions/cancel_escrow.rs`, `src/instructions/create_escrow.rs`, `src/instructions/initialize.rs`, `src/instructions/submit_work.rs`.
