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
| IPFS pinning | Pinata (via server-side API route) | — | Freelancer file deliverable upload; JWT kept server-side |
| CSS | Global CSS (no framework) | — | Single `globals.css` with CSS custom properties |
| Package manager | yarn (frontend), cargo (program) | — | Specified in `Anchor.toml` |

No database. No backend server (except the thin `/api/upload` proxy for Pinata). All application state lives on-chain in `EscrowAccount` accounts. The frontend talks directly to Solana devnet RPC.

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       USER'S BROWSER                                 │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Next.js Frontend (Pages Router)                  │  │
│  │                                                               │  │
│  │  _app.js ─ ConnectionProvider + WalletProvider                │  │
│  │                  (Solana devnet RPC)                          │  │
│  │                                                               │  │
│  │  pages/              components/        src/hooks/            │  │
│  │  ├── index.js        ├── Layout.js      └── useEscrow.js      │  │
│  │  ├── client.js       ├── Navbar.js          (all Anchor       │  │
│  │  ├── freelancer.js   └── Toast.js            calls here)      │  │
│  │  ├── how-it-works.js                                          │  │
│  │  ├── escrow/[id].js       utils/                              │  │
│  │  └── api/                 ├── ipfs.js  ← uploadToIPFS()       │  │
│  │      └── upload.js ◄──────┘            parseSubmission()      │  │
│  │         (server-side                                           │  │
│  │          Pinata proxy)                                         │  │
│  └──────────────────────┬────────────────────────────────────────┘  │
│                         │ @coral-xyz/anchor + @solana/web3.js       │
│                         │ JSON-RPC over HTTPS                       │
└─────────────────────────┼────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     SOLANA DEVNET                                    │
│                                                                      │
│  Program: 5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX            │
│  (Rust / Anchor — compiled to BPF/SBF .so)                         │
│                                                                      │
│  Instructions:                                                       │
│  ┌──────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ createEscrow │ │ submitWork │ │ approveWork│ │ cancelEscrow  │  │
│  └──────────────┘ └────────────┘ └────────────┘ └───────────────┘  │
│  ┌──────────────────┐                                               │
│  │ requestRevision  │                                               │
│  └──────────────────┘                                               │
│                                                                      │
│  On-chain state:                                                     │
│  EscrowAccount PDAs  — seeds: ["escrow", client_pubkey]             │
│  (one per client, holds all SOL + metadata + revision_note)         │
└──────────────────────────────────────────────────────────────────────┘

                ┌────────────────────────┐
                │  Pinata IPFS (cloud)   │
                │  gateway.pinata.cloud  │
                └────────────────────────┘
                          ▲
                          │ HTTPS (server-side only, PINATA_JWT)
                          │
                  pages/api/upload.js
```

**Data flow for a complete happy path (with file delivery):**

1. **Client** connects Phantom → opens `/client` → fills in title, description, freelancer pubkey, amount → clicks "Create & Lock SOL".
2. Frontend calls `createEscrow` via Anchor → Anchor creates the PDA account, transfers `amount` lamports from the client's wallet into the PDA.
3. **Freelancer** connects Phantom → opens `/freelancer` → sees the escrow (fetched by memcmp filter on their pubkey) → clicks "Submit Work" → writes a delivery note and optionally attaches a file.
4. If a file is attached: browser POSTs it to `/api/upload` (Next.js server route) → server forwards raw multipart body to Pinata with `PINATA_JWT` → receives IPFS CID → returns gateway URL to browser.
5. Frontend JSON-encodes `{ note, file: <ipfs_url>, name: <filename> }` (max 500 chars) and calls `submitWork` → on-chain `work_submission` field is written, status changes `Active → Submitted`.
6. **Client** sees "Approve & Pay" and "↩ Request Revision" buttons on their dashboard.
7a. If approved: Frontend calls `approveWork` → Anchor's `close = freelancer` closes the account and transfers all lamports to the freelancer.
7b. If revision needed: Client submits a revision note → `requestRevision` → status `Submitted → RevisionRequested` → freelancer sees orange "Changes requested" box → resubmits → loop repeats.

**Cancellation path:** Client calls `cancelEscrow` while status is `Active` only (not possible after any work submission) → `close = client` returns everything to the client.

---

## 4. Folder & File Structure

```
freelancepay/
├── Anchor.toml                  # Anchor config: package manager, program ID, cluster, wallet path
├── Cargo.toml                   # Workspace root: members = ["programs/*"]
├── Cargo.lock                   # Locked dependency tree
├── rust-toolchain.toml          # Pins Rust to 1.89.0 with rustfmt + clippy
├── .gitignore                   # Ignores target/, node_modules/, .env*, keypairs, .next/
├── .prettierignore              # Prettier exclusions
├── CLAUDE.md                    # This file
├── code.md                      # Code walkthrough: file-by-file annotated tour of the codebase
├── freelancepay_logo.svg        # Brand SVG (also used as favicon and navbar icon)
├── UMT Logo.png                 # University logo (referenced in navbar banner text)
│
├── programs/
│   └── freelancepay/
│       ├── Cargo.toml           # Crate manifest: anchor-lang 1.0.2, litesvm (dev-dep)
│       ├── src/
│       │   ├── lib.rs           # ★ ACTIVE ENTRY POINT — all 5 instruction handlers + account context structs
│       │   ├── state.rs         # EscrowAccount struct + EscrowStatus enum (5 variants)
│       │   ├── error.rs         # ErrorCode enum (NotClient, NotFreelancer, InvalidStatus, AlreadySubmitted)
│       │   ├── constants.rs     # ESCROW_SEED = b"escrow"; ESCROW_ACCOUNT_SIZE (stale, not used by lib.rs)
│       │   ├── instructions.rs  # ⚠ DEAD CODE — module re-export file, never imported by lib.rs
│       │   ├── create_escrow.rs # ⚠ DEAD CODE — duplicate of instructions/create_escrow.rs
│       │   ├── submit_work.rs   # ⚠ DEAD CODE — duplicate
│       │   ├── approve_work.rs  # ⚠ DEAD CODE — duplicate
│       │   ├── cancel_escrow.rs # ⚠ DEAD CODE — duplicate
│       │   └── instructions/
│       │       ├── initialize.rs    # ⚠ DEAD CODE — placeholder
│       │       ├── create_escrow.rs # ⚠ DEAD CODE — never reached
│       │       ├── submit_work.rs   # ⚠ DEAD CODE — never reached
│       │       ├── approve_work.rs  # ⚠ DEAD CODE — never reached
│       │       └── cancel_escrow.rs # ⚠ DEAD CODE — never reached
│       └── tests/
│           └── integration_tests.rs # 6 LiteSVM tests covering all 4 original instructions + 2 rejection cases
│
└── app/
    └── frontend/
        ├── package.json         # Next.js 16 + Anchor/Solana deps + ESLint
        ├── next.config.mjs      # reactStrictMode: true, empty turbopack config
        ├── jsconfig.json        # Path alias: @/ → ./
        ├── eslint.config.mjs    # Standard next/eslint-config-next rules
        ├── .env.local           # ★ GITIGNORED — contains PINATA_JWT=<secret>; never commit
        ├── CLAUDE.md            # Redirects to AGENTS.md
        ├── AGENTS.md            # Warning: this Next.js version may differ from training data
        ├── pages/
        │   ├── _app.js          # Global providers: ConnectionProvider, WalletProvider (Phantom), WalletModalProvider
        │   ├── _document.js     # Minimal HTML shell (Html, Head, Main, NextScript)
        │   ├── index.js         # Landing page: hero, stats, how-it-works overview, CTA
        │   ├── client.js        # Client dashboard: create form + escrow list + approve/cancel/revision actions
        │   ├── freelancer.js    # Freelancer dashboard: list contracts + submit/resubmit form + file attach
        │   ├── how-it-works.js  # Educational explainer: step-by-step + FAQ
        │   ├── escrow/
        │   │   └── [id].js      # Escrow detail page: full info, timeline, role-aware actions, file download
        │   └── api/
        │       ├── upload.js    # ★ Server-side Pinata proxy: forwards multipart body, reads PINATA_JWT
        │       └── hello.js     # Unused Next.js API route placeholder (can be deleted)
        ├── components/
        │   ├── Layout.js        # Shared wrapper: <Head>, <Navbar>, children, <footer>
        │   ├── Navbar.js        # UMT banner + nav links + WalletMultiButton (dynamic import, SSR=false)
        │   └── Toast.js         # Bottom-right notification: success/error + Solana Explorer tx link
        ├── src/
        │   ├── hooks/
        │   │   └── useEscrow.js  # ★ ALL blockchain calls — 8 functions wrapping Anchor program methods
        │   └── idl/
        │       └── freelancepay.json  # Hand-maintained IDL: 5 instructions, EscrowAccount, EscrowStatus
        ├── utils/
        │   ├── ipfs.js          # ★ uploadToIPFS(file) + parseSubmission(raw) — used by 3 pages
        │   └── anchor.js        # ⚠ UNUSED — getConnection/getProvider/getProgram; no page imports it
        ├── styles/
        │   ├── globals.css       # Full design system: CSS vars, layout, navbar, cards, badges, buttons, forms, toasts, spinner, revision UI, file attachment
        │   └── Home.module.css   # Mostly empty module (legacy Next.js scaffolding)
        └── public/
            ├── logo.svg          # FreelancePay logo (used by navbar + favicon)
            └── favicon.ico       # Legacy favicon (overridden by logo.svg in Layout.js)
```

---

## 5. Core Logic & Features

### 5.1 On-Chain Program (`programs/freelancepay/src/lib.rs`)

The entire executable program logic lives in `lib.rs`. The `src/instructions/` and root-level `src/*.rs` instruction files are **unreachable dead code** — `lib.rs` does not declare `pub mod create_escrow` or `pub mod instructions`, so the Rust compiler never includes them.

#### State Machine

```
                      submit_work
Active ─────────────────────────────────► Submitted
  │                                          │
  │ cancel_escrow                            │ approve_work
  ▼                                          ▼
Cancelled                               Completed
                                             ▲
                                             │ submit_work
                                             │
                                     RevisionRequested
                                             ▲
                                             │ request_revision
                                        Submitted ──────┘
```

`cancel_escrow` only runs from `Active`. Once work is submitted (in any round), the client cannot cancel — protecting the freelancer during revision loops.

#### `create_escrow` (lib.rs)

```
Parameters: title: String, description: String, freelancer: Pubkey, amount: u64
Signer: client
```

1. Validates `amount > 0` (uses `ErrorCode::InvalidStatus` — semantic mismatch; `InvalidAmount` doesn't exist).
2. Initializes a new PDA account at seeds `[b"escrow", client.key()]`.
3. Writes all fields, sets `status = Active`, captures `Clock::unix_timestamp`, stores `bump`.
4. Initializes `work_submission = ""` and `revision_note = ""`.
5. Issues a CPI to the System Program to transfer `amount` lamports from the client's wallet into the PDA.

**Critical constraint — one escrow per client:** The PDA seed contains only the client's pubkey. A client can only have one live escrow at a time.

#### `submit_work` (lib.rs)

```
Parameters: work_description: String
Signer: freelancer
```

1. Verifies `escrow.status == Active || escrow.status == RevisionRequested` (allows both initial submission and resubmission after a revision).
2. Validates signer is the registered freelancer via account constraint.
3. Overwrites `work_submission` with `work_description`, sets `status = Submitted`.

The new `work_description` is a JSON string `{"note":"...","file":"<ipfs_url or null>","name":"<filename or null>"}` (max 500 chars, assembled client-side). Previous submission is overwritten — no history.

#### `approve_work` (lib.rs)

```
Parameters: none
Signer: client
Accounts: client, freelancer (UncheckedAccount), escrow
```

1. Verifies `escrow.status == Submitted`.
2. Sets `status = Completed`.
3. Anchor's `close = freelancer` constraint moves all PDA lamports (rent + `amount`) to the freelancer and closes the account.

#### `cancel_escrow` (lib.rs)

```
Parameters: none
Signer: client
Accounts: client, escrow
```

1. Verifies `escrow.status == Active` (only works before freelancer submits any work).
2. Sets `status = Cancelled`.
3. `close = client` returns all lamports (amount + rent) to the client.

#### `request_revision` (lib.rs)

```
Parameters: message: String
Signer: client
Accounts: client, escrow
```

1. Verifies `escrow.status == Submitted` (only after freelancer submits work).
2. Writes `message` to `escrow.revision_note` (max 300 bytes).
3. Sets `status = RevisionRequested`.

The freelancer can then call `submit_work` again (guard now allows `RevisionRequested`). This loop repeats any number of times until the client calls `approve_work`.

### 5.2 Account Validation Constraints

Anchor's `#[account(...)]` macros enforce all security checks before any instruction handler runs:

| Constraint | Where | What it enforces |
|---|---|---|
| `seeds = [ESCROW_SEED, client.key()]` | CreateEscrow | PDA derivation — right account for this client |
| `constraint = escrow.freelancer == freelancer.key()` | SubmitWork, ApproveWork | Only the designated freelancer can act |
| `constraint = escrow.client == client.key()` | ApproveWork, CancelEscrow, RequestRevision | Only the designated client can act |
| `close = freelancer` | ApproveWork | Auto-transfer all lamports to freelancer + close account |
| `close = client` | CancelEscrow | Auto-transfer all lamports to client + close account |
| `bump = escrow.bump` | SubmitWork, CancelEscrow, RequestRevision | Reads saved bump from account (not re-derived) to save compute |

### 5.3 IPFS File Upload (`utils/ipfs.js` + `pages/api/upload.js`)

Freelancers can attach a file (any type, max 25 MB) to their work submission. Files go to IPFS via Pinata.

**Security constraint: `PINATA_JWT` never touches the browser.** The flow:

1. `uploadToIPFS(file)` in `utils/ipfs.js` — client-side; POSTs raw `FormData` to `/api/upload?filename=<name>`.
2. `pages/api/upload.js` — server-side Next.js route; reads `process.env.PINATA_JWT`, buffers the raw multipart body, and forwards it to Pinata's `pinFileToIPFS` endpoint with the same `Content-Type` header (preserving the multipart boundary). Returns `{ cid, url, name }`.
3. The frontend assembles `{ note, file: <gateway_url>, name: <filename> }` as JSON, trims to 500 chars if needed, and stores it in `work_submission` on-chain.

**`parseSubmission(raw)`** in `utils/ipfs.js` gracefully handles both formats:
- New JSON format: `{ note, file: "https://gateway.pinata.cloud/ipfs/<CID>", name }` → extracts all three fields.
- Old plain-text format (pre-IPFS submissions): JSON.parse throws → returns `{ note: raw, file: null, name: null }`.

### 5.4 `useEscrow` Hook (`app/frontend/src/hooks/useEscrow.js`)

The single interface between the frontend and the on-chain program. All 8 exported functions:

**`deriveEscrowPDA(clientPubkey)`** — mirrors the on-chain PDA derivation:
```js
PublicKey.findProgramAddressSync(
  [new TextEncoder().encode("escrow"), clientPubkey.toBytes()],
  PROGRAM_ID
)
```

**`createEscrow(title, description, freelancerAddress, amountInSOL)`** — converts SOL to lamports with `Math.round(amountInSOL * LAMPORTS_PER_SOL)` before passing as `BN`.

**`submitWork(pdaStr, workDescription)`** — passes the pre-encoded JSON string directly as `workDescription`.

**`approveWork(pdaStr, freelancerAddr)`** — requires freelancer address because `close = freelancer` needs the actual account.

**`cancelEscrow(pdaStr)`** — no freelancer needed; `close = client` refunds the signer.

**`requestRevision(pdaStr, message)`** — sends `message` on-chain as `revision_note`, flips status to `RevisionRequested`.

**`fetchMyEscrowsAsClient()`** — `memcmp` filter at byte offset 8 (after 8-byte discriminator) to match `client: Pubkey`.

**`fetchMyEscrowsAsFreelancer()`** — `memcmp` at byte offset `8 + 32` (after discriminator + client pubkey) to match `freelancer: Pubkey`. These offsets are tied to the `EscrowAccount` struct field order in `state.rs` — inserting a new field before `freelancer` would break queries.

**`fetchEscrowByPDA(pda)`** — fetches one account by address.

**`getStatus(statusObj)`** — Anchor deserializes `EscrowStatus` as `{ active: {} }` / `{ revisionRequested: {} }` etc.; `Object.keys(statusObj)[0]` extracts the variant name as a lowercase camelCase string.

All functions return `{ success: true, signature }` or `{ success: false, error: message }` — never throw.

### 5.5 Frontend Pages

**`pages/index.js`** — Landing page. Shows hero, stats strip (hardcoded: "4M+ Pakistani freelancers", "0% Platform fees", "<2s Payment speed", "$1.5B Annual earnings at risk"), and a 3-step how-it-works preview. CTA buttons change based on wallet connection state.

**`pages/client.js`** — Client dashboard. `EscrowCard` component shows:
- "✓ Approve & Pay" when `status === "submitted"`
- "↩ Request Revision" (inline form) when `status === "submitted"`
- "✕ Cancel" when `status === "active"`
- Orange "revision-box" showing `revisionNote` when `status === "revisionRequested"`
- Work submission display with "↓ Download Deliverable" button if a file was attached

**`pages/freelancer.js`** — Freelancer dashboard. `EscrowCard` shows:
- "✍ Submit Work" / "✍ Resubmit Work" button when `status === "active"` or `status === "revisionRequested"`
- Orange "revision-box" with `revisionNote` when `status === "revisionRequested"`
- Inline form with textarea + file attach (📎) when submit form is open
- Previous submission display with download link

**`pages/escrow/[id].js`** — Detail page. Route param `id` is the PDA base58 address. Detects role by comparing `publicKey` to `escrow.client` and `escrow.freelancer`. Renders:
- 3-step progress timeline (active/submitted/completed) for non-cancelled escrows; timeline is omitted when cancelled, shows all steps un-highlighted when `revisionRequested`
- Orange "Revision Requested" card with `revisionNote` visible to both parties
- "Review Delivery" card (client, submitted state): approve button + revision form
- Submit/resubmit form (freelancer, active or revisionRequested state) with file attach

**`pages/how-it-works.js`** — Static educational content. No blockchain calls.

### 5.6 Components

**`Layout.js`** — Wraps every page. Sets `<title>` and meta. Renders `Navbar` above content, footer below. Footer says "Devnet — not real money."

**`Navbar.js`** — Sticky top bar. UMT university banner above it. Active route highlighted by `pathname` comparison. `WalletMultiButton` dynamically imported `{ ssr: false }`.

**`Toast.js`** — Fixed-position bottom-right notification. Auto-dismisses after 6000ms. Success toasts include a link to `https://explorer.solana.com/tx/{signature}?cluster=devnet`.

### 5.7 Integration Tests (`tests/integration_tests.rs`)

6 tests using LiteSVM (no running validator required). Tests cover the original 4 instructions only — the `requestRevision` instruction and IPFS upload are not yet tested.

| Test | What it verifies |
|---|---|
| `test_1_create_escrow` | PDA exists, status=Active, amount locked |
| `test_2_submit_work` | status=Submitted, work_submission written |
| `test_3_approve_work` | Freelancer balance increased ≥ amount, account closed |
| `test_4_cancel_escrow` | Client recovers ≥ amount after cancel |
| `test_5_wrong_signer_cannot_approve` | Stranger cannot approve → rejected |
| `test_6_cannot_approve_when_active` | ApproveWork on Active → InvalidStatus |

**Prerequisite:** The `.so` must be compiled first. Tests fail with a clear error message if it is missing.

---

## 6. Data Models / Database

All state is stored on-chain. There is exactly one account type.

### `EscrowAccount` (`programs/freelancepay/src/state.rs`)

| Field | Type | Size | Description |
|---|---|---|---|
| `client` | `Pubkey` | 32 bytes | Wallet that created and funded the escrow |
| `freelancer` | `Pubkey` | 32 bytes | Wallet designated to receive payment |
| `amount` | `u64` | 8 bytes | Lamports promised (≠ total account balance, which includes rent) |
| `title` | `String` (max 100) | 4+100 bytes | Human-readable project name |
| `description` | `String` (max 500) | 4+500 bytes | Project scope details |
| `work_submission` | `String` (max 500) | 4+500 bytes | JSON-encoded delivery: `{note,file,name}`; empty until `submitWork` |
| `status` | `EscrowStatus` | 1 byte | State machine enum (see below) |
| `created_at` | `i64` | 8 bytes | Unix timestamp at creation |
| `bump` | `u8` | 1 byte | PDA canonical bump, stored to avoid re-deriving |
| `revision_note` | `String` (max 300) | 4+300 bytes | Client's latest revision message; empty until `requestRevision` |
| (discriminator) | `[u8; 8]` | 8 bytes | Anchor prefix: `[36, 69, 48, 18, 128, 225, 125, 135]` |

**Total account size:** 8 + 32 + 32 + 8 + 104 + 504 + 504 + 1 + 8 + 1 + 304 = **1506 bytes** (`8 + EscrowAccount::INIT_SPACE`)

> Note: `constants.rs` contains a stale `ESCROW_ACCOUNT_SIZE = 1202` constant that predates the `revision_note` field. `lib.rs` uses `8 + EscrowAccount::INIT_SPACE` (derived by `#[derive(InitSpace)]`), not this constant.

### `EscrowStatus` enum

```
Active            → initial state after createEscrow
Submitted         → after freelancer calls submitWork (or resubmits after revision)
Completed         → after client calls approveWork (account closed)
Cancelled         → after client calls cancelEscrow (account closed; only from Active)
RevisionRequested → after client calls requestRevision (only from Submitted)
```

Borsh encodes as u8: Active=0, Submitted=1, Completed=2, Cancelled=3, RevisionRequested=4. New variants must be appended at the end to preserve existing on-chain data.

### PDA derivation

```
seeds: [b"escrow", client_pubkey_bytes]
program: 5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX
```

The address is deterministic — given a client pubkey, the escrow PDA can always be computed without querying the chain.

---

## 7. APIs / Endpoints

### On-Chain Instructions

All "endpoints" are Solana program instructions. There are no traditional HTTP APIs (except the Pinata proxy).

#### `createEscrow`

| | |
|---|---|
| Discriminator | `[253, 215, 165, 116, 36, 108, 68, 80]` |
| Signer | `client` |
| Accounts | `client` (mut, signer), `escrow` PDA (init, mut), `systemProgram` |
| Args | `title: String`, `description: String`, `freelancer: Pubkey`, `amount: u64` |
| Effect | Creates EscrowAccount PDA; transfers `amount` lamports from client to PDA |
| Rejects if | `amount == 0`; PDA already exists |

#### `submitWork`

| | |
|---|---|
| Discriminator | `[158, 80, 101, 51, 114, 130, 101, 253]` |
| Signer | `freelancer` |
| Accounts | `freelancer` (mut, signer), `escrow` PDA (mut) |
| Args | `workDescription: String` |
| Effect | Overwrites `work_submission`; status → `Submitted` |
| Rejects if | `status != Active && status != RevisionRequested`; signer ≠ registered freelancer |

#### `approveWork`

| | |
|---|---|
| Discriminator | `[181, 118, 45, 143, 204, 88, 237, 109]` |
| Signer | `client` |
| Accounts | `client` (mut, signer), `freelancer` (mut, UncheckedAccount), `escrow` PDA (mut, close=freelancer) |
| Args | none |
| Effect | status → `Completed`; entire PDA balance (amount + rent) transferred to freelancer; account closed |
| Rejects if | `status != Submitted`; signer ≠ registered client; freelancer pubkey ≠ `escrow.freelancer` |

#### `cancelEscrow`

| | |
|---|---|
| Discriminator | `[156, 203, 54, 179, 38, 72, 33, 21]` |
| Signer | `client` |
| Accounts | `client` (mut, signer), `escrow` PDA (mut, close=client) |
| Args | none |
| Effect | status → `Cancelled`; entire PDA balance returned to client; account closed |
| Rejects if | `status != Active`; signer ≠ registered client |

#### `requestRevision`

| | |
|---|---|
| Discriminator | `[205, 195, 75, 171, 242, 149, 90, 14]` |
| Signer | `client` |
| Accounts | `client` (mut, signer), `escrow` PDA (mut) |
| Args | `message: String` |
| Effect | Writes `revision_note`; status → `RevisionRequested` |
| Rejects if | `status != Submitted`; signer ≠ registered client |

### HTTP API

#### `POST /api/upload?filename=<name>`

Server-side only (Next.js API route). Proxies file uploads to Pinata IPFS.

| | |
|---|---|
| Auth | `PINATA_JWT` from `process.env` (server-side, never exposed to browser) |
| Body | Raw multipart/form-data (forwarded verbatim with original `Content-Type`) |
| Returns | `{ cid: string, url: string, name: string }` on success; `{ error: string }` on failure |
| File limit | 25 MB (enforced client-side in `uploadToIPFS`; Pinata enforces server-side) |

### JavaScript Hook (`src/hooks/useEscrow.js`)

| Function | Calls | Returns |
|---|---|---|
| `createEscrow(title, desc, freelancerAddr, amountSOL)` | `createEscrow` instruction | `{ success, signature, escrowPDA }` |
| `submitWork(pdaStr, workDescription)` | `submitWork` instruction | `{ success, signature }` |
| `approveWork(pdaStr, freelancerAddr)` | `approveWork` instruction | `{ success, signature }` |
| `cancelEscrow(pdaStr)` | `cancelEscrow` instruction | `{ success, signature }` |
| `requestRevision(pdaStr, message)` | `requestRevision` instruction | `{ success, signature }` |
| `fetchMyEscrowsAsClient()` | `program.account.escrowAccount.all([memcmp offset=8])` | `EscrowData[]` |
| `fetchMyEscrowsAsFreelancer()` | `program.account.escrowAccount.all([memcmp offset=40])` | `EscrowData[]` |
| `fetchEscrowByPDA(pdaStr)` | `program.account.escrowAccount.fetch(pda)` | `EscrowData \| null` |

`EscrowData` shape returned by all fetch functions:
```js
{
  pda: string,           // base58 PDA address
  client: string,        // base58
  freelancer: string,    // base58
  title: string,
  description: string,
  workSubmission: string, // JSON string: { note, file, name } or plain text (legacy)
  revisionNote: string,   // client's latest revision message, "" if none
  amount: number,         // lamports (integer)
  status: "active" | "submitted" | "completed" | "cancelled" | "revisionRequested",
  createdAt: number,      // unix timestamp (seconds)
}
```

---

## 8. Development Phases

Reconstructed from git history:

### Phase 1 — Foundation
**"FreelancePay MVP - Solana Escrow dApp"**

Big-bang commit. Established the entire working system: Solana program (all 4 instructions in `lib.rs`), Anchor toolchain config, full Next.js frontend with wallet providers, `useEscrow` hook, IDL, design system. The `src/instructions/` scaffolding also appeared here as a planned modular refactor that was never completed.

### Phase 2 — Hydration Fix
**"Fix hydration error and title warning"**

Added `dynamic(() => import(...), { ssr: false })` to all `WalletMultiButton` usages. The wallet adapter button renders differently server- vs. client-side, causing React hydration mismatches.

### Phase 3 — Education Content
**"Add How It Works page"**

Added `/how-it-works` page with dual-level explanations (simple + technical) for each step, a visual flow diagram, and an FAQ acknowledging the lack of dispute resolution.

### Phase 4 — Branding
Three sequential commits: UMT logo image → FreelancePay SVG logo in navbar → SVG as browser tab favicon.

### Phase 5 — IPFS File Deliverable Upload
Added ability for freelancers to attach files (any type, ≤25 MB) to work submissions. Key pieces:
- `pages/api/upload.js` — server-side Pinata proxy; `bodyParser: false` to forward raw multipart
- `utils/ipfs.js` — `uploadToIPFS(file)` client helper + `parseSubmission(raw)` for backward-compatible decoding
- `app/frontend/.env.local` — holds `PINATA_JWT` (gitignored via `.env*` pattern)
- Updated `freelancer.js` and `escrow/[id].js` — file attach UI, IPFS upload before on-chain submit
- Updated `client.js` and `escrow/[id].js` — "↓ Download Deliverable" button when file is present
- `globals.css` — added `.file-attach`, `.file-name`, `.btn-download`, `--orange` CSS variable

Constraint preserved: `PINATA_JWT` is never sent to the browser. Rust program NOT modified.

### Phase 6 — Revision Request Loop
Added on-chain revision cycle. Key pieces:
- `state.rs` — added `RevisionRequested` to `EscrowStatus` enum (appended last, preserving Borsh indices)
- `state.rs` — added `#[max_len(300)] pub revision_note: String` to `EscrowAccount` (appended last, preserving memcmp offsets)
- `lib.rs` — new `request_revision` instruction + `RequestRevision` accounts context
- `lib.rs` — `submit_work` guard updated to allow `Active || RevisionRequested`
- `lib.rs` — `create_escrow` initializes `revision_note = String::new()`
- `freelancepay.json` IDL — manually updated: new instruction, new field, new enum variant
- `useEscrow.js` — `requestRevision()` function; `revisionNote` field in all three fetch mappers
- `client.js` — "↩ Request Revision" button + inline form; orange "revision-box" display
- `freelancer.js` — shows revision note; "Resubmit Work" label when in revision
- `escrow/[id].js` — revision note card visible to both parties; resubmit form for freelancer
- `globals.css` — `.badge-revisionRequested`, `.revision-box` styles
- Program extended (`solana program extend`) and redeployed on devnet

Deploy tx: `5YfJQ3RnonYUkhpPkYLceRFaEkc5e1CDDoddfZZtAEnsTaurYPjNsymhqxX7BLEyMj6Q9gr88LFgM8MhhuC4Eviz`

### Phase 7 — Code Documentation
Added `code.md` at repo root: file-by-file annotated walkthrough of every live source file, IDL cross-check table, dead code inventory, and detailed explanations of PDA derivation, memcmp offsets, Anchor constraints, IPFS proxy design, and work_submission encoding.

---

## 9. Setup & Run Instructions

### Prerequisites

- **Rust 1.89.0** — install via rustup; `rust-toolchain.toml` auto-pins it
- **Solana CLI** — install from solana.com/docs; configure devnet: `solana config set --url devnet`
- **Anchor CLI 1.0.2** — `cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install 1.0.2 && avm use 1.0.2`
- **Node.js ≥ 18** and **yarn** (`npm install -g yarn`)
- **Phantom wallet** browser extension, set to devnet

### Build the Solana Program

**Linux / WSL2 (recommended):**
```sh
# From workspace root (FreelancePay/freelancepay/)
cargo build-sbf
```

**Windows native (workaround — anchor build panics):**
```powershell
$env:HOME = "C:\Users\<username>"
$env:SBF_SDK_PATH = "C:\Users\<username>\.local\share\solana\install\active_release\bin\sdk\sbf"
cargo +solana build --release --target sbf-solana-solana
# Output: target\sbf-solana-solana\release\freelancepay.so
```

Output `.so` required before running tests.

### Run Integration Tests

```sh
# From workspace root
cargo test
```

Tests run in-process via LiteSVM; no devnet connection or network needed.

### Deploy to Devnet (already deployed)

Program deployed at `5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX`. To redeploy after changes that increase `.so` size:

```sh
# Check if program data account needs extending first
solana program show 5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX --url devnet
# If new .so is larger: extend the account (bytes = new_size - old_size + buffer)
solana program extend 5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX <BYTES> --url devnet
# Then deploy
anchor program deploy --program-id 5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX
```

Wallet at `HbkHJYb4frYzUjEipaa3wKXyqGvuakPUnSJ2erg6K1Tf` needs ~0.07+ SOL for redeployment. Top up at faucet.solana.com if needed.

### Run the Frontend

```sh
cd app/frontend
yarn install
yarn dev
# Opens at http://localhost:3000
```

Connect Phantom (set to devnet). Get free test SOL at faucet.solana.com.

### Environment Variables

**Local development** — create `app/frontend/.env.local` (gitignored):
```
PINATA_JWT=eyJhbGci...   # Your Pinata JWT from app.pinata.cloud/keys
```

**Vercel production** — add `PINATA_JWT` manually in Vercel dashboard → Settings → Environment Variables. It will NOT deploy automatically since `.env.local` is gitignored.

The Solana devnet RPC and program ID are hardcoded in:
- `app/frontend/pages/_app.js` (RPC)
- `app/frontend/utils/anchor.js` (RPC + program ID — currently unused)
- `app/frontend/src/hooks/useEscrow.js` (program ID)
- `app/frontend/src/idl/freelancepay.json` (program ID)

---

## 10. Conventions & Patterns

### Rust / Anchor

- **All instruction logic in `lib.rs`** — the program's public surface is entirely contained in one file. The `src/instructions/` scaffolding is unreachable dead code.
- **`InitSpace` derive macro** computes account size from `#[max_len(N)]` annotations. `ESCROW_ACCOUNT_SIZE` in `constants.rs` is a stale manual calculation — it does not include `revision_note` and is never referenced by `lib.rs`.
- **`close =` constraint for payment** — SOL transfer and account closure happen via Anchor's closing mechanism, not manual CPI `transfer` calls.
- **Bump stored on account** — `escrow.bump` is written at creation and read back (`bump = escrow.bump`) in subsequent instructions to avoid re-deriving the PDA.
- **Append-only struct and enum** — new fields must be added at the end of `EscrowAccount` and new variants at the end of `EscrowStatus` to preserve Borsh byte layout for existing on-chain accounts and memcmp offset queries.
- **Error reuse** — `InvalidStatus` is used both for bad state transitions and for zero-amount validation. `AlreadySubmitted` is defined but never triggered.

### JavaScript / React

- **`useEscrow` is the single blockchain abstraction layer** — pages never import `@coral-xyz/anchor` directly.
- **`WalletMultiButton` always dynamically imported** with `{ ssr: false }` — never import it statically.
- **All blockchain functions return result objects, never throw** — callers check `r.success` and display `r.error` in toast if false.
- **`useCallback` on all blockchain and load functions** — prevents unnecessary `useEffect` re-runs.
- **`parseSubmission(raw)` handles both formats** — always call it before displaying `workSubmission` to gracefully handle pre-IPFS plain-text submissions.
- **JSON-encode work submissions** — `{ note, file, name }` assembled by the caller before `submitWork`. The `while` trim loop ensures the encoded string ≤ 500 chars.
- **No TypeScript** — the project is plain JavaScript throughout.
- **CSS custom properties** for the design system — all colors use `var(--name)` from `:root` in `globals.css`:
  - `--purple: #9945FF` — primary actions
  - `--green: #14F195` — success, Solana brand
  - `--blue: #3b82f6` — active state
  - `--amber: #f59e0b` — pending state
  - `--red: #ef4444` — danger/cancel
  - `--orange: #f97316` — revision requests, feedback UI
- **Status badge class names are camelCase** — `badge-revisionRequested` not `badge-revision-requested`, because `getStatus()` returns camelCase strings that are interpolated directly into class names.
- **`utils/anchor.js` is unused** — no live file imports from it. All Anchor setup is inside `useEscrow.js`.

---

## 11. Known Issues / TODOs / Gotchas

### Critical

**One escrow per client address.** The PDA seed `[b"escrow", client.key()]` means a client can only have one live escrow at a time. A second `createEscrow` call while the first is open fails on-chain. There is no UI warning. Fix: add a nonce (counter, timestamp, or job ID) to the seed.

**No dispute resolution.** If the client refuses to approve after submission, SOL is locked indefinitely. No timeout-based auto-release, no arbitrator. The how-it-works FAQ acknowledges this.

**Freelancer receives rent on approve.** The freelancer receives `amount + ~0.002 SOL` (the rent deposit). This is undocumented in the UI.

**`PINATA_JWT` must be set in Vercel manually.** It is gitignored and will not deploy via git. Without it, file uploads return 500 and the app falls back to text-only submissions.

### Non-critical / Cleanup

**`InvalidStatus` used for zero-amount check** in `create_escrow` — misleading error code.

**`AlreadySubmitted` error (6003) is never triggered** in any live instruction.

**Dead Rust code** in `src/create_escrow.rs`, `src/submit_work.rs`, `src/approve_work.rs`, `src/cancel_escrow.rs`, `src/instructions.rs`, and the entire `src/instructions/` directory. Safe to delete.

**`utils/anchor.js` is unused frontend code** — `getConnection/getProvider/getProgram` are defined but never imported.

**`pages/api/hello.js`** is the default Next.js starter route. No purpose in this project.

**Hardcoded RPC and program ID** in four places. No environment variable abstraction for cluster switching.

**`WalletMultiButton` import duplicated** in every file that uses it. A shared `components/WalletButton.js` would DRY this up.

**`styles/Home.module.css`** is empty legacy scaffolding from `create-next-app`. Not used.

**Integration tests don't cover `requestRevision`** or the IPFS upload flow. `submit_work` tests also don't test the `RevisionRequested → Submitted` transition.

**Timeline progress bar shows no steps highlighted in `revisionRequested`** state (in `escrow/[id].js`) because `TIMELINE.indexOf("revisionRequested")` returns `-1`. This is intentional but could confuse users — a visual indicator for the revision loop would be clearer.

**Windows program build requires workaround.** `anchor build` / `cargo build-sbf` panics on Windows with Solana 3.0.5 toolchain. Use `cargo +solana build --release --target sbf-solana-solana` with `$env:SBF_SDK_PATH` set, or use WSL2.

**`ESCROW_ACCOUNT_SIZE` in `constants.rs` is stale** — still shows 1202 bytes, missing the 304-byte `revision_note` field. Actual size is 1506 bytes.

---

*Last updated: 2026-06-02. Reflects all features through Phase 7 (IPFS upload, revision request loop, code.md documentation).*
