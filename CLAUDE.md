# FreelancePay — Project Reference

> Single source of truth for the FreelancePay codebase. Covers every layer from the on-chain program to the frontend UI.

---

## 1. Project Overview

**FreelancePay** is a trustless freelance payment escrow built on the Solana blockchain. It solves the payment-trust problem between clients and freelancers: a client locks SOL in a smart contract vault, the freelancer delivers the work, and the smart contract releases payment automatically when the client approves — no bank, no intermediary, no delay.

**Problem it solves:** Pakistan has 4M+ freelancers earning an estimated $1.5B annually, but payment disputes, international transfer delays, and platform fees are endemic. FreelancePay eliminates the middleman entirely by making the escrow logic a public, auditable Solana program.

**Who it's for:** Any client-freelancer pair willing to transact in SOL. The current UI is English-only and targets tech-savvy users familiar with Phantom wallet.

**Current status:** MVP / hackathon prototype. Deployed on Solana **devnet** only — SOL has no real monetary value in this environment. The app was built by students at the University of Management & Technology (UMT), Lahore for the **Colosseum Frontier Hackathon** (Superteam Pakistan). There is no dispute resolution mechanism; the FAQ on the How It Works page explicitly notes this gap.

---

## 2. Tech Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| Smart contract language | Rust | 1.89.0 (pinned via `rust-toolchain.toml`) | Required for Solana programs |
| Smart contract framework | Anchor | 1.0.2 | Generates IDL, handles account validation, PDAs, discriminators |
| Blockchain | Solana | devnet | Sub-2s finality, near-zero fees (~0.000005 SOL/tx) |
| Test runtime | LiteSVM | 0.10.0 | Fast in-process Solana VM for Rust integration tests; no validator needed |
| Test serialization | Borsh | 1.6.1 | Anchor's wire format; needed to deserialize accounts in tests |
| Frontend framework | Next.js (Pages Router) | 16.2.6 | SSR-capable React framework; Pages Router used (not App Router) |
| UI language | JavaScript (JSX) | — | No TypeScript |
| React | React | 19.2.4 | Component layer |
| Solana wallet SDK | @solana/wallet-adapter-react + phantom | 0.15.39 / 0.9.29 | Standard wallet connection abstraction |
| Solana JS client | @solana/web3.js | 1.98.4 | RPC calls, keypair/pubkey utils, `LAMPORTS_PER_SOL` |
| Anchor JS client | @coral-xyz/anchor | 0.32.1 | Deserializes IDL, builds + sends typed instructions |
| CSS | Global CSS (no framework) | — | Single `globals.css` with CSS custom properties |
| Package manager | yarn (frontend), cargo (program) | — | Specified in `Anchor.toml` |

No database. No backend server. All application state lives on-chain in `EscrowAccount` accounts. The frontend talks directly to Solana devnet RPC.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Next.js Frontend (Pages Router)             │  │
│  │                                                          │  │
│  │  _app.js ─ ConnectionProvider + WalletProvider           │  │
│  │                  (Solana devnet RPC)                     │  │
│  │                                                          │  │
│  │  pages/            components/         src/hooks/        │  │
│  │  ├── index.js      ├── Layout.js       └── useEscrow.js  │  │
│  │  ├── client.js     ├── Navbar.js           (all Anchor   │  │
│  │  ├── freelancer.js └── Toast.js             calls here)  │  │
│  │  ├── how-it-works.js                                     │  │
│  │  └── escrow/[id].js                                      │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │ @coral-xyz/anchor + @solana/web3.js  │
│                         │ JSON-RPC over HTTPS                  │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SOLANA DEVNET                                   │
│                                                                 │
│  Program: 5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX       │
│  (Rust / Anchor — compiled to BPF/SBF .so)                     │
│                                                                 │
│  Instructions:                                                  │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  ┌───────┐ │
│  │ createEscrow │  │ submitWork  │  │ approveWork│  │cancel │ │
│  └──────────────┘  └─────────────┘  └────────────┘  └───────┘ │
│                                                                 │
│  On-chain state:                                                │
│  EscrowAccount PDAs  — seeds: ["escrow", client_pubkey]        │
│  (one per client, holds all SOL + metadata)                    │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow for a complete happy path:**

1. **Client** connects Phantom → opens `/client` → fills in title, description, freelancer pubkey, amount → clicks "Create & Lock SOL".
2. Frontend calls `createEscrow` via Anchor → Anchor creates the PDA account, transfers `amount` lamports from the client's wallet into the PDA.
3. **Freelancer** connects Phantom → opens `/freelancer` → sees the escrow (fetched by memcmp filter on their pubkey) → clicks "Submit Work" → writes delivery description.
4. Frontend calls `submitWork` → on-chain `work_submission` field is written, status changes `Active → Submitted`.
5. **Client** sees "Approve & Pay" button on their dashboard → clicks it.
6. Frontend calls `approveWork` → Anchor's `close = freelancer` constraint closes the account and transfers all its lamports (rent deposit + locked amount) directly to the freelancer's wallet.

**Cancellation path:** Client calls `cancelEscrow` while status is `Active` → `close = client` returns everything to the client.

---

## 4. Folder & File Structure

```
freelancepay/
├── Anchor.toml                  # Anchor config: package manager, program ID, cluster, wallet path
├── Cargo.toml                   # Workspace root: members = ["programs/*"]
├── Cargo.lock                   # Locked dependency tree
├── rust-toolchain.toml          # Pins Rust to 1.89.0 with rustfmt + clippy
├── .gitignore                   # Ignores target/, node_modules/, .env, keypairs, .next/
├── .prettierignore              # Prettier exclusions
├── freelancepay_logo.svg        # Brand SVG (also used as favicon and navbar icon)
├── UMT Logo.png                 # University logo (referenced in navbar banner text)
│
├── programs/
│   └── freelancepay/
│       ├── Cargo.toml           # Crate manifest: anchor-lang 1.0.2, litesvm (dev-dep)
│       ├── src/
│       │   ├── lib.rs           # ★ ACTIVE ENTRY POINT — all instruction logic + account structs
│       │   ├── state.rs         # EscrowAccount struct + EscrowStatus enum
│       │   ├── error.rs         # ErrorCode enum (NotClient, NotFreelancer, InvalidStatus, AlreadySubmitted)
│       │   ├── constants.rs     # ESCROW_SEED = b"escrow", ESCROW_ACCOUNT_SIZE calculation
│       │   ├── instructions.rs  # ⚠ DEAD CODE — module re-export file, never imported by lib.rs
│       │   ├── create_escrow.rs # ⚠ DEAD CODE — duplicate of instructions/create_escrow.rs
│       │   ├── submit_work.rs   # ⚠ DEAD CODE — duplicate
│       │   ├── approve_work.rs  # ⚠ DEAD CODE — duplicate
│       │   ├── cancel_escrow.rs # ⚠ DEAD CODE — duplicate
│       │   └── instructions/
│       │       ├── initialize.rs    # ⚠ DEAD CODE — placeholder comment
│       │       ├── create_escrow.rs # ⚠ DEAD CODE — never reached
│       │       ├── submit_work.rs   # ⚠ DEAD CODE — never reached
│       │       ├── approve_work.rs  # ⚠ DEAD CODE — never reached
│       │       └── cancel_escrow.rs # ⚠ DEAD CODE — never reached
│       └── tests/
│           └── integration_tests.rs # 6 LiteSVM tests covering all 4 instructions + 2 rejection cases
│
└── app/
    └── frontend/
        ├── package.json         # Next.js 16 + Anchor/Solana deps + ESLint
        ├── next.config.mjs      # reactStrictMode: true, empty turbopack config
        ├── jsconfig.json        # Path alias: @/ → ./
        ├── eslint.config.mjs    # Standard next/eslint-config-next rules
        ├── CLAUDE.md            # Redirects to AGENTS.md
        ├── AGENTS.md            # Warning: this Next.js version may differ from training data
        ├── pages/
        │   ├── _app.js          # Global providers: ConnectionProvider, WalletProvider (Phantom), WalletModalProvider
        │   ├── _document.js     # Minimal HTML shell (Html, Head, Main, NextScript)
        │   ├── index.js         # Landing page: hero, stats, how-it-works overview, CTA
        │   ├── client.js        # Client dashboard: create escrow form + list + approve/cancel actions
        │   ├── freelancer.js    # Freelancer dashboard: list contracts + submit work inline form
        │   ├── how-it-works.js  # Educational explainer: step-by-step + FAQ
        │   ├── escrow/
        │   │   └── [id].js      # Escrow detail page: full info, timeline, role-aware action buttons
        │   └── api/
        │       └── hello.js     # Unused Next.js API route placeholder (can be deleted)
        ├── components/
        │   ├── Layout.js        # Shared wrapper: <Head>, <Navbar>, children, <footer>
        │   ├── Navbar.js        # UMT banner + nav links + WalletMultiButton (dynamic import, SSR=false)
        │   └── Toast.js         # Bottom-right notification: success/error + Solana Explorer tx link
        ├── src/
        │   ├── hooks/
        │   │   └── useEscrow.js  # ★ ALL blockchain calls — 7 functions wrapping Anchor program methods
        │   └── idl/
        │       └── freelancepay.json  # Auto-generated IDL: instruction schemas, account types, error codes
        ├── utils/
        │   └── anchor.js         # Utility: getConnection(), getProvider(), getProgram() — currently unused by pages (pages use useEscrow directly)
        ├── styles/
        │   ├── globals.css       # Full design system: CSS vars, layout, navbar, cards, badges, buttons, forms, toasts, spinner
        │   └── Home.module.css   # Mostly empty module (legacy Next.js scaffolding)
        └── public/
            ├── logo.svg          # FreelancePay logo (used by navbar + favicon)
            └── favicon.ico       # Legacy favicon (overridden by logo.svg in Layout.js)
```

---

## 5. Core Logic & Features

### 5.1 On-Chain Program (`programs/freelancepay/src/lib.rs`)

The entire executable program logic lives in `lib.rs`. The `src/instructions/` and root-level `src/*.rs` instruction files are **unreachable dead code** — `lib.rs` does not declare `pub mod create_escrow` or `pub mod instructions`, so the Rust compiler never includes them.

#### `create_escrow` (lib.rs:18–52)

```
Parameters: title: String, description: String, freelancer: Pubkey, amount: u64
Signer: client
```

1. Validates `amount > 0` (uses `ErrorCode::InvalidStatus` — note: this is a semantic mismatch; the error code should probably be `InvalidAmount` but one doesn't exist).
2. Initializes a new PDA account at seeds `[b"escrow", client.key()]`.
3. Writes all fields onto the account, sets `status = Active`, captures `Clock::unix_timestamp`.
4. Issues a CPI (cross-program invocation) to the System Program to transfer `amount` lamports from the client's wallet into the PDA.

**Critical constraint — one escrow per client:** Because the PDA is derived solely from the client's pubkey, a client can only have **one live escrow at a time**. A second `createEscrow` call from the same wallet will fail with an "already in use" account error unless the first escrow has been closed (via `approveWork` or `cancelEscrow`).

#### `submit_work` (lib.rs:54–63)

```
Parameters: work_description: String
Signer: freelancer
```

1. Verifies `escrow.status == Active` (rejects if already submitted/completed/cancelled).
2. Validates signer is the registered freelancer via the account constraint `escrow.freelancer == freelancer.key()`.
3. Writes `work_description` to `escrow.work_submission`, sets `status = Submitted`.

No payment happens here. This is a pure state update.

#### `approve_work` (lib.rs:65–75)

```
Parameters: none
Signer: client
Accounts: client, freelancer (UncheckedAccount), escrow
```

1. Verifies `escrow.status == Submitted`.
2. Sets `status = Completed`.
3. **The actual payment is not a manual transfer — it happens via Anchor's `close = freelancer` constraint on the escrow account.** Anchor automatically moves all lamports in the account (rent deposit + locked amount) to `freelancer` and zeros out the account data. The account is then garbage-collected from the ledger.

Because `close` transfers the *entire account balance* (not just `escrow.amount`), the freelancer receives `escrow.amount + rent_exemption_deposit`. The rent amount is ~0.002 SOL for this account size.

#### `cancel_escrow` (lib.rs:77–87)

```
Parameters: none
Signer: client
Accounts: client, escrow
```

1. Verifies `escrow.status == Active` (cannot cancel after work is submitted).
2. Sets `status = Cancelled`.
3. `close = client` returns all lamports (amount + rent) to the client.

### 5.2 Account Validation Constraints

Anchor's `#[account(...)]` macros enforce all security checks at the framework level before any instruction handler runs:

| Constraint | Where | What it enforces |
|---|---|---|
| `seeds = [ESCROW_SEED, client.key()]` | CreateEscrow | PDA derivation — right account for this client |
| `constraint = escrow.freelancer == freelancer.key()` | SubmitWork, ApproveWork | Only the designated freelancer can act |
| `constraint = escrow.client == client.key()` | ApproveWork, CancelEscrow | Only the designated client can act |
| `close = freelancer` | ApproveWork | Auto-transfer all lamports to freelancer + close account |
| `close = client` | CancelEscrow | Auto-transfer all lamports to client + close account |

### 5.3 `useEscrow` Hook (`app/frontend/src/hooks/useEscrow.js`)

The single hook that all pages use for blockchain interaction. It re-creates a `Program` instance on every call (no singleton) via `getProgram()`:

```
getProgram() → AnchorProvider(connection, wallet) → new Program(idl, provider)
```

**`deriveEscrowPDA(clientPubkey)`** — mirrors the on-chain PDA derivation:
```js
PublicKey.findProgramAddressSync(
  [new TextEncoder().encode("escrow"), clientPubkey.toBytes()],
  PROGRAM_ID
)
```

**`createEscrow(title, description, freelancerAddress, amountInSOL)`** — converts SOL to lamports with `Math.round(amountInSOL * LAMPORTS_PER_SOL)` before passing as `BN`.

**`fetchMyEscrowsAsClient()`** — uses `program.account.escrowAccount.all()` with a `memcmp` filter at byte offset 8 (skip 8-byte Anchor discriminator) to match the client pubkey field.

**`fetchMyEscrowsAsFreelancer()`** — memcmp at byte offset `8 + 32` (discriminator + client pubkey) to match the freelancer pubkey field. These offsets must exactly match the `EscrowAccount` struct field order in `state.rs`.

**`getStatus(statusObj)`** — Anchor deserializes `EscrowStatus` as `{ active: {} }` / `{ submitted: {} }` etc. This helper extracts the first key as a lowercase string.

All functions return `{ success: true, signature }` or `{ success: false, error: message }` — never throw.

### 5.4 Frontend Pages

**`pages/index.js`** — Landing page. Shows hero, stats strip (hardcoded: "4M+ Pakistani freelancers", "0% Platform fees", "<2s Payment speed", "$1.5B Annual earnings at risk"), and a 3-step how-it-works preview. CTA buttons change based on wallet connection state.

**`pages/client.js`** — Client dashboard. Contains `EscrowCard` component (inline) for displaying each escrow. Create form calls `createEscrow`. Approve button appears only when `status === "submitted"`. Cancel button appears only when `status === "active"`.

**`pages/freelancer.js`** — Freelancer dashboard. Lists escrows where connected wallet = freelancer. Submit Work form is shown inline in `EscrowCard` only when `status === "active"`. Shows stats strip (active / pending approval / completed counts).

**`pages/escrow/[id].js`** — Detail page. Route param `id` is the PDA base58 address. Fetches the specific escrow via `fetchEscrowByPDA(id)`. Detects the connected wallet's role (`isClient` or `isFreelancer`) by comparing pubkeys. Renders a 3-step progress timeline for non-cancelled escrows.

**`pages/how-it-works.js`** — Static educational content. No blockchain calls. Renders the 5-step process with "simple" and "technical" dual explanations + FAQ.

### 5.5 Components

**`Layout.js`** — Wraps every page. Sets `<title>` and meta. Renders `Navbar` above content, footer below. Footer explicitly says "Devnet — not real money."

**`Navbar.js`** — Sticky top bar. UMT university banner above it. `WalletMultiButton` is dynamically imported with `{ ssr: false }` to avoid Next.js hydration mismatch (the wallet button renders differently server vs. client). Active route is highlighted by comparing `pathname` to each link's href.

**`Toast.js`** — Fixed-position bottom-right notification. Auto-dismisses after 6000ms via `setTimeout`. Success toasts include a link to `https://explorer.solana.com/tx/{signature}?cluster=devnet`.

### 5.6 Integration Tests (`tests/integration_tests.rs`)

6 tests using LiteSVM (no running validator required). Each test:
1. Calls `setup()` which creates a fresh LiteSVM instance and loads the compiled `.so` from `target/deploy/freelancepay.so`.
2. Builds raw Solana `Instruction` objects with hand-serialized Borsh data (8-byte Anchor discriminator computed via SHA256 of `"global:{instruction_name}"` + borsh-encoded args).
3. Sends via `send()` (panics on failure) or `try_send()` (returns bool).

| Test | What it verifies |
|---|---|
| `test_1_create_escrow` | PDA exists, status=Active, amount locked in account |
| `test_2_submit_work` | status=Submitted, work_submission field written |
| `test_3_approve_work` | Freelancer balance increased ≥ amount, escrow account closed |
| `test_4_cancel_escrow` | Client recovers ≥ amount after cancel |
| `test_5_wrong_signer_cannot_approve` | Stranger cannot approve (seeds mismatch → rejected) |
| `test_6_cannot_approve_when_active` | ApproveWork on Active (not Submitted) → InvalidStatus |

**Prerequisite for tests:** The `.so` must be compiled first: `cargo build-sbf` from workspace root. Tests fail with a clear error message if the `.so` is missing.

---

## 6. Data Models / Database

All state is stored on-chain. There is exactly one account type.

### `EscrowAccount` (`programs/freelancepay/src/state.rs`)

| Field | Type | Size | Description |
|---|---|---|---|
| `client` | `Pubkey` | 32 bytes | Wallet that created and funded the escrow |
| `freelancer` | `Pubkey` | 32 bytes | Wallet designated to receive payment |
| `amount` | `u64` | 8 bytes | Lamports promised (≠ total account balance, which includes rent) |
| `title` | `String` (max 100) | 4 + 100 bytes | Human-readable project name |
| `description` | `String` (max 500) | 4 + 500 bytes | Project scope details |
| `work_submission` | `String` (max 500) | 4 + 500 bytes | Freelancer's delivery notes; empty until `submitWork` |
| `status` | `EscrowStatus` | 1 byte | State machine enum (see below) |
| `created_at` | `i64` | 8 bytes | Unix timestamp at creation |
| `bump` | `u8` | 1 byte | PDA canonical bump, stored to avoid re-deriving |
| (discriminator) | `[u8; 8]` | 8 bytes | Anchor magic prefix: `[36, 69, 48, 18, 128, 225, 125, 135]` |

**Total account size:** 8 (discriminator) + 32 + 32 + 8 + (4+100) + (4+500) + (4+500) + 1 + 8 + 1 = **1202 bytes**

### `EscrowStatus` enum

```
Active     → initial state after createEscrow
Submitted  → after freelancer calls submitWork
Completed  → after client calls approveWork (account closed)
Cancelled  → after client calls cancelEscrow (account closed)
```

State transitions are strictly enforced by `require!()` checks. Only one forward path and one cancellation path exist. There is no backwards transition.

### PDA derivation

```
seeds: [b"escrow", client_pubkey_bytes]
program: 5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX
```

The address is deterministic — given a client pubkey, you can always compute the escrow PDA without querying the chain.

---

## 7. APIs / Endpoints (On-Chain Instructions)

All "endpoints" are Solana program instructions. There are no HTTP APIs.

### `createEscrow`

| | |
|---|---|
| Discriminator | `[253, 215, 165, 116, 36, 108, 68, 80]` |
| Signer | `client` |
| Accounts | `client` (mut, signer), `escrow` PDA (init, mut), `systemProgram` |
| Args | `title: String`, `description: String`, `freelancer: Pubkey`, `amount: u64` |
| Effect | Creates EscrowAccount PDA; transfers `amount` lamports from client to PDA |
| Rejects if | `amount == 0`; PDA already exists (client has existing active escrow) |

### `submitWork`

| | |
|---|---|
| Discriminator | `[158, 80, 101, 51, 114, 130, 101, 253]` |
| Signer | `freelancer` |
| Accounts | `freelancer` (mut, signer), `escrow` PDA (mut) |
| Args | `workDescription: String` |
| Effect | Writes work_submission field; status → Submitted |
| Rejects if | `status != Active`; signer is not the registered freelancer |

### `approveWork`

| | |
|---|---|
| Discriminator | `[181, 118, 45, 143, 204, 88, 237, 109]` |
| Signer | `client` |
| Accounts | `client` (mut, signer), `freelancer` (mut, UncheckedAccount), `escrow` PDA (mut, close=freelancer) |
| Args | none |
| Effect | status → Completed; entire PDA balance (amount + rent) transferred to freelancer; account closed |
| Rejects if | `status != Submitted`; signer is not the registered client; freelancer pubkey ≠ escrow.freelancer |

### `cancelEscrow`

| | |
|---|---|
| Discriminator | `[156, 203, 54, 179, 38, 72, 33, 21]` |
| Signer | `client` |
| Accounts | `client` (mut, signer), `escrow` PDA (mut, close=client) |
| Args | none |
| Effect | status → Cancelled; entire PDA balance (amount + rent) returned to client; account closed |
| Rejects if | `status != Active`; signer is not the registered client |

### Frontend "API" (JavaScript hook, `src/hooks/useEscrow.js`)

| Function | Calls | Returns |
|---|---|---|
| `createEscrow(title, desc, freelancerAddr, amountSOL)` | `createEscrow` instruction | `{ success, signature, escrowPDA }` |
| `submitWork(pdaStr, workDescription)` | `submitWork` instruction | `{ success, signature }` |
| `approveWork(pdaStr, freelancerAddr)` | `approveWork` instruction | `{ success, signature }` |
| `cancelEscrow(pdaStr)` | `cancelEscrow` instruction | `{ success, signature }` |
| `fetchMyEscrowsAsClient()` | `program.account.escrowAccount.all([memcmp offset=8])` | `EscrowData[]` |
| `fetchMyEscrowsAsFreelancer()` | `program.account.escrowAccount.all([memcmp offset=40])` | `EscrowData[]` |
| `fetchEscrowByPDA(pdaStr)` | `program.account.escrowAccount.fetch(pda)` | `EscrowData \| null` |

`EscrowData` shape returned by all fetch functions:
```js
{
  pda: string,          // base58 PDA address
  client: string,       // base58
  freelancer: string,   // base58
  title: string,
  description: string,
  workSubmission: string,
  amount: number,       // lamports (integer)
  status: "active" | "submitted" | "completed" | "cancelled",
  createdAt: number,    // unix timestamp (seconds)
}
```

---

## 8. Development Phases

Reconstructed from git log (6 commits total):

### Phase 1 — Foundation (commit `6364dcf`)
**"FreelancePay MVP - Solana Escrow dApp"**

The big-bang commit. Established the entire working system in one shot:
- Solana program: `lib.rs` with all 4 instructions inline, `state.rs`, `error.rs`, `constants.rs`
- Anchor.toml + Cargo workspace
- Next.js frontend: `_app.js` with Phantom wallet providers, `client.js`, `freelancer.js`, `escrow/[id].js`, all components, `useEscrow.js` hook, IDL, `globals.css` design system, `anchor.js` utility

The `src/create_escrow.rs`, `src/submit_work.rs` etc. and `src/instructions/` files also appeared here as scaffolding for a planned modular refactor that was never completed.

### Phase 2 — Hydration Fix (commit `9b1b4d5`)
**"Fix hydration error and title warning"**

Added `dynamic(() => import(...), { ssr: false })` to all `WalletMultiButton` usages. The `WalletMultiButton` from `@solana/wallet-adapter-react-ui` renders differently server-side vs. client-side, causing React hydration mismatches. Dynamic import with `ssr: false` skips SSR entirely for that component.

### Phase 3 — Education Content (commit `3f52d3f`)
**"Add How It Works page"**

Added `/how-it-works` page with a complete two-level explanation (simple + technical) of each step, a visual flow diagram, and an FAQ. The FAQ explicitly acknowledges that dispute resolution is not implemented and that this is a hackathon/learning project.

### Phase 4 — Branding (commits `fae22c3`, `ad1c046`, `44bfa4d`)
Three sequential commits adding the UMT logo image, then the FreelancePay SVG logo to the navbar, then setting the SVG as the browser tab favicon using `<link rel="icon" href="/logo.svg" type="image/svg+xml" />` in `Layout.js`.

---

## 9. Setup & Run Instructions

### Prerequisites

- **Rust 1.89.0** — install via rustup: `rustup toolchain install 1.89.0` (or just cd into the repo; `rust-toolchain.toml` auto-pins it)
- **Solana CLI** — install from [solana.com/docs](https://solana.com/docs/intro/installation); configure devnet: `solana config set --url devnet`
- **Anchor CLI** — `cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install 1.0.2 && avm use 1.0.2`
- **Node.js ≥ 18** and **yarn** (`npm install -g yarn`)
- **Phantom wallet** browser extension, set to devnet

### Build the Solana Program

```sh
# From workspace root (FreelancePay/freelancepay/)
cargo build-sbf
```

This produces `target/deploy/freelancepay.so`. Required before running tests.

> **Windows gotcha:** The `cargo build-sbf` command requires the Solana BPF toolchain. On Windows, run it inside WSL2 or use the Docker-based build. Native Windows builds for BPF are not officially supported.

### Run Integration Tests

```sh
# From workspace root — requires freelancepay.so to exist
cargo test
```

Tests run in-process via LiteSVM; no devnet connection needed.

### Deploy to Devnet (already deployed)

The program is already deployed at `5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX`. To redeploy:

```sh
solana config set --url devnet
anchor build
anchor deploy
# Update program ID in Anchor.toml, lib.rs declare_id!(), and app/frontend/src/idl/freelancepay.json if it changes
```

### Run the Frontend

```sh
cd app/frontend
yarn install
yarn dev
```

Opens at `http://localhost:3000`. Connect Phantom (set to devnet). Get free test SOL: `solana airdrop 2 <your_wallet_address> --url devnet` or use [faucet.solana.com](https://faucet.solana.com).

### Build for Production

```sh
cd app/frontend
yarn build
yarn start
```

### Environment Variables

There are none. The Solana devnet RPC (`https://api.devnet.solana.com`) and program ID are hardcoded in:
- `app/frontend/pages/_app.js` (RPC)
- `app/frontend/utils/anchor.js` (RPC + program ID)
- `app/frontend/src/hooks/useEscrow.js` (program ID)
- `app/frontend/src/idl/freelancepay.json` (program ID)

To switch clusters (e.g. mainnet), all four locations must be updated.

---

## 10. Conventions & Patterns

### Rust / Anchor

- **All instruction logic in `lib.rs`** — the program's public surface is entirely contained in one file. The modular `src/instructions/` scaffolding exists but is unreachable dead code.
- **`InitSpace` derive macro** on `EscrowAccount` automatically calculates account size from field annotations (`#[max_len(100)]`). The `ESCROW_ACCOUNT_SIZE` constant in `constants.rs` is a manual duplicate — kept for documentation, not used in `space =` calculation (which uses `EscrowAccount::INIT_SPACE`).
- **`close =` constraint for payment** — payment and refund happen via Anchor's account closing mechanism, not manual `transfer` CPI calls. This is idiomatic Anchor and ensures rent is recovered cleanly.
- **Bump stored on account** — `escrow.bump` is written at creation and used in subsequent instructions (`bump = escrow.bump`) instead of redoing `find_program_address`. This saves compute units.
- **Error reuse** — `InvalidStatus` is used both for bad status transitions AND for zero-amount validation in `createEscrow`. A semantically correct `InvalidAmount` error was never added.

### JavaScript / React

- **`useEscrow` is the single blockchain abstraction layer** — pages never import `@coral-xyz/anchor` directly; all Anchor calls go through the hook.
- **`WalletMultiButton` always dynamically imported** with `{ ssr: false }` — never import it statically or hydration will break.
- **All blockchain functions return result objects, never throw** — callers check `r.success` and display `r.error` in toast if false.
- **`useCallback` on all blockchain functions** in `useEscrow` to prevent unnecessary re-renders. Pages also wrap `loadEscrows` in `useCallback` before using it as a `useEffect` dependency.
- **No TypeScript** — the project is plain JavaScript throughout.
- **CSS custom properties** for the design system — all colors, radii, and backgrounds use `var(--name)` from `:root` in `globals.css`. Never hardcode color values in component styles; reference variables.
- **Solana-brand color palette:**
  - Purple `#9945FF` — primary actions, highlights
  - Green `#14F195` — success, completion, Solana brand
  - Blue `#3b82f6` — active/in-progress state
  - Amber `#f59e0b` — warning/pending state
  - Red `#ef4444` — danger/cancel actions
- **`dynamic()` import for wallet button** is repeated in every file that uses `WalletMultiButton`. There is no central re-export to avoid this duplication.
- **`utils/anchor.js` is unused** — `getConnection`, `getProvider`, `getProgram` are defined but no page or hook actually imports from this file. All Anchor setup happens inside `useEscrow.js` directly.

---

## 11. Known Issues / TODOs / Gotchas

### Critical

**One escrow per client address.** The PDA seed is `[b"escrow", client.key()]` with no nonce or job ID. A client wallet can only have one live escrow at a time. Creating a second while the first is active will fail on-chain. There is no UI warning for this. A future fix would add a nonce (e.g. counter or timestamp) to the seed.

**No dispute resolution.** If the client refuses to approve after the freelancer submits, the SOL is locked indefinitely — there is no timeout-based auto-release, no arbitrator, no third-party intervention. The how-it-works FAQ acknowledges this explicitly.

**Freelancer receives rent on approve.** The `amount` stored in the account is what the client specified, but the freelancer actually receives `amount + ~0.002 SOL` (the rent-exemption deposit). This is undocumented in the UI and could cause confusion if a user expects exact amounts.

### Non-critical / Cleanup

**`InvalidStatus` used for zero-amount check.** In `create_escrow`, `require!(amount > 0, ErrorCode::InvalidStatus)` fires a misleading error. Should be a dedicated `InvalidAmount` error.

**`AlreadySubmitted` error is never used.** Defined in `error.rs` but no instruction triggers it.

**Dead code in `src/`.** The files `src/create_escrow.rs`, `src/submit_work.rs`, `src/approve_work.rs`, `src/cancel_escrow.rs`, `src/instructions.rs`, and the entire `src/instructions/` directory are unreferenced by `lib.rs` and never compiled into the program. They duplicate the logic from `lib.rs` and exist as scaffolding from an incomplete refactoring attempt. Safe to delete.

**`utils/anchor.js` is unused.** `getConnection()`, `getProvider()`, `getProgram()` are defined but never imported. Either use it in `useEscrow.js` (replace the inline setup) or delete it.

**`pages/api/hello.js`** is the default Next.js starter route. It has no purpose in this project.

**Hardcoded RPC and program ID in four places.** No environment variable abstraction. Switching to mainnet requires editing `_app.js`, `utils/anchor.js`, `src/hooks/useEscrow.js`, and `src/idl/freelancepay.json`.

**`WalletMultiButton` import duplicated in every file.** Each page that needs it (index.js, client.js, freelancer.js, escrow/[id].js) has its own `dynamic()` import. A shared `components/WalletButton.js` would DRY this up.

**`styles/Home.module.css`** is mostly empty legacy scaffolding from `create-next-app`. Not used.

**No loading state when fetching escrow in `[id].js`.** If `id` is available but `publicKey` is not yet connected, the page shows "Loading escrow data…" indefinitely instead of prompting to connect wallet. The `reload` function has `if (!id || !publicKey) return` which silently does nothing.

**Frontends stats are hardcoded.** The "4M+ Pakistani freelancers" and "$1.5B Annual earnings at risk" values in `index.js` are static strings in a `STATS` array — not fetched from any API.

**BPF compilation on Windows requires WSL2.** `cargo build-sbf` invokes the Solana BPF toolchain which is a Linux-only binary chain. Native Windows users must use WSL2 or Docker. The test suite (`cargo test`) works natively since LiteSVM loads a pre-built `.so`.

---

*Last updated: 2026-06-01. Written from a full read of every source file in the repository.*
