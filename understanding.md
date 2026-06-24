# FreelancePay — Complete Project Understanding

> Written for someone who has never seen this project before. Covers the problem, the blockchain backend, the frontend, the design system, every component, and how all pieces connect. No prior blockchain knowledge assumed.

---

## Table of Contents

1. [The Problem Being Solved](#1-the-problem-being-solved)
2. [The Solution in One Paragraph](#2-the-solution-in-one-paragraph)
3. [Background: Solana, Wallets, Smart Contracts](#3-background-solana-wallets-smart-contracts)
4. [The Architecture — Four Layers](#4-the-architecture--four-layers)
5. [Layer 1 — The On-Chain Program (Rust/Anchor)](#5-layer-1--the-on-chain-program-rustanchor)
6. [Layer 2 — The Frontend (Next.js/React)](#6-layer-2--the-frontend-nextjsreact)
7. [Layer 3 — The Design System (CSS Tokens + Typography + Motion)](#7-layer-3--the-design-system-css-tokens--typography--motion)
8. [Layer 4 — Thematic Visual Identity](#8-layer-4--thematic-visual-identity)
9. [The Bridge — useEscrow Hook](#9-the-bridge--useescrow-hook)
10. [The IPFS File Upload System](#10-the-ipfs-file-upload-system)
11. [The Revision Loop](#11-the-revision-loop)
12. [Complete Walkthroughs — Step by Step](#12-complete-walkthroughs--step-by-step)
13. [The Security Model — Who Can Do What](#13-the-security-model--who-can-do-what)
14. [The Data — What Gets Stored and Where](#14-the-data--what-gets-stored-and-where)
15. [How the Pages Connect to Each Other](#15-how-the-pages-connect-to-each-other)
16. [What Happens When Something Goes Wrong](#16-what-happens-when-something-goes-wrong)
17. [Current Limitations](#17-current-limitations)
18. [Developer Scripts — Setup, Airdrop, Tests](#18-developer-scripts--setup-airdrop-tests)
19. [Layer 5 — The Database (PostgreSQL + Prisma)](#19-layer-5--the-database-postgresql--prisma)
20. [Authentication — Wallet Sign-In (JWT)](#20-authentication--wallet-sign-in-jwt)
21. [The Indexer — On-Chain Sync to PostgreSQL](#21-the-indexer--on-chain-sync-to-postgresql)
22. [The REST API Layer](#22-the-rest-api-layer)

---

## 1. The Problem Being Solved

Pakistan has over 4 million freelancers. When a client hires a freelancer online, two trust problems exist:

- **The client's problem:** "I'll pay after I see the work" — but what if I pay and the work is terrible?
- **The freelancer's problem:** "I'll do the work after you pay" — but what if I deliver and the client refuses to pay?

Traditional platforms like Upwork or Fiverr solve this by acting as a middleman — they hold the money and arbitrate disputes. But they charge 20%+ fees, payments take days, and international transfers involve banks and exchange rates.

FreelancePay's goal: **eliminate the middleman entirely** by replacing it with a computer program that nobody controls — a program that automatically holds the money, releases it when conditions are met, and enforces the rules without anyone being able to cheat.

---

## 2. The Solution in One Paragraph

A client creates a "contract" on the Solana blockchain. They lock their SOL (Solana's currency) inside that contract. The freelancer can see the locked money and knows it's real. They do the work, attach proof (a description, links, or a file), and mark it as submitted. The client reviews the work. If happy, they click Approve — the contract automatically sends the money to the freelancer instantly, with no bank, no delay, and no fee. If the client wants changes, they request a revision — the freelancer gets the feedback, resubmits, and the cycle continues until both parties are satisfied.

---

## 3. Background: Solana, Wallets, Smart Contracts

### What is Solana?

Think of Solana as a giant public spreadsheet that thousands of computers around the world maintain simultaneously. Nobody owns it. Nobody controls it. Everyone can read it. To write to it, you need a wallet.

This spreadsheet can run programs. These programs (called "smart contracts") live permanently on Solana and execute exactly as written. Nobody can modify them once deployed. Nobody can stop them from running.

Solana processes transactions in under 2 seconds and charges fractions of a cent per transaction. Its currency is called **SOL**. It's divisible — 1 SOL = 1,000,000,000 **lamports** (like dollars and cents, but with more decimal places). FreelancePay runs on **Devnet** — Solana's test environment where SOL has no real monetary value.

### What is a Wallet?

A wallet is a pair of cryptographic keys:

- **Public key** — your address. A 44-character string like `HbkHJYb4frYzUjEipaa3wKXyqGvuakPUnSJ2erg6K1Tf`. You share it freely. Other people send money to it.
- **Private key** — your password. You never share it. It's used to "sign" (authorize) transactions. When you click "Approve & Pay" in the app, your wallet signs the transaction with this key. Nobody else can sign on your behalf.

**Phantom** is the wallet browser extension FreelancePay uses. It manages your keys, shows you what a transaction will do, and asks for approval before signing.

### What is a Smart Contract?

A smart contract is a program that lives on a blockchain. Once deployed, it runs exactly as coded — nobody can change it or stop it. FreelancePay's smart contract does exactly five things:

1. Create an escrow — lock SOL in a vault
2. Submit work — freelancer marks work as done with a description
3. Approve work — client releases the SOL to the freelancer
4. Cancel escrow — client gets their SOL back (only before work is submitted)
5. Request revision — client asks for changes (only after work is submitted)

---

## 4. The Architecture — Four Layers

```
┌─────────────────────────────────────────────────────────────┐
│                       USER'S BROWSER                        │
│                                                             │
│  LAYER 2 — Next.js Frontend                                 │
│  ├── pages/  (index, client, freelancer, escrow/[id], etc.) │
│  ├── components/ (Layout, Navbar, Toast)                    │
│  └── src/hooks/u
seEscrow.js  (blockchain bridge)            │
│                                                             │
│  LAYER 3 — Design System                                    │
│  ├── styles/globals.css  (CSS token system, all styles)     │
│  └── utils/theme.js  (motion, scroll reveal, animations)   │
│                                                             │
│  LAYER 4 — Thematic Visual Identity                         │
│  └── VaultSVG, TrustMotif, Stamp, LockedCue, hex texture   │
│                                                             │
│  pages/api/upload.js  (server-side only)                    │
│  └── proxies file uploads to Pinata (keeps JWT secret)      │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │  (signed transactions)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                LAYER 1 — SOLANA DEVNET                      │
│                                                             │
│  Program ID: 5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX │
│  Rust code compiled to .so binary, deployed once, runs      │
│  forever. Stores all escrow data on-chain.                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                PINATA / IPFS (cloud storage)                │
│                                                             │
│  Stores uploaded deliverable files permanently.             │
│  Returns content-addressed URLs (CIDs).                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          LAYER 5 — POSTGRESQL DATABASE (Supabase)           │
│                                                             │
│  Prisma ORM · 5 models: User, Escrow, Notification,        │
│  Review, JobPost · Off-chain index + user profile store     │
│  Connection: Supabase cloud (db.kattosbfzvqrchvpjkim.       │
│  supabase.co) via DATABASE_URL in .env.local               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Layer 1 (Solana)** — the source of truth. All escrow data, all money, all status live here. Nothing can be faked.

**Layer 2 (Website)** — the interface. Reads from Solana and lets users take actions. Routes server-side requests through the Prisma singleton.

**Layer 3 (Design System)** — the visual language. A complete token-based CSS system that makes every pixel consistent: colors, typography, spacing, animations, component styles.

**Layer 4 (Visual Identity)** — domain-specific UI elements that make the product feel like a "crypto escrow" product: rubber stamps, lock cues, vault illustration, hex textures.

**Layer 5 (PostgreSQL/Prisma)** — the off-chain data store. Caches on-chain escrow state, stores user profiles, notifications, job posts, and reviews that don't belong on-chain.

**Pinata/IPFS** — optional file storage for deliverable attachments.

---

## 5. Layer 1 — The On-Chain Program (Rust/Anchor)

### What it is

The program is written in **Rust** using a framework called **Anchor**. Anchor handles boilerplate: it validates accounts, generates the IDL (interface description), and handles serialization (converting data to bytes and back).

The compiled output is a `.so` file deployed at `5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX`. That address never changes.

### What an "Escrow Account" is

When a client creates an escrow, the program creates a new **account** on Solana — think of it as a row in a database table, except it lives permanently on the blockchain and only the program can write to it.

Every escrow account stores:

| Field | Example | Purpose |
|---|---|---|
| `client` | `HbkH...K1Tf` | Who created and funded the escrow |
| `freelancer` | `Abc1...XYZ9` | Who will receive payment |
| `amount` | `500000000` (0.5 SOL in lamports) | How much is locked |
| `title` | `"Build my website"` | Project name |
| `description` | `"Responsive landing page..."` | Project details |
| `work_submission` | `{"note":"Done!","file":"https://ipfs...","name":"design.pdf"}` | Freelancer's delivery |
| `status` | `Active` | Current lifecycle stage |
| `created_at` | `1748822400` | Unix timestamp |
| `bump` | `254` | Technical seed used to derive this account's address |
| `escrow_index` | `0` | Which escrow number this is for the client (0 = first, 1 = second, ...) |
| `revision_note` | `"Please change the font"` | Client's latest feedback |

**Field order matters for `client` and `freelancer`.** The memcmp queries that fetch escrows filter by raw byte offset: `client` is at byte 8 (after the 8-byte Anchor discriminator), `freelancer` is at byte 40 (8 + 32). These offsets must stay fixed — inserting any field before `freelancer` would break all dashboard queries silently.

**About PDAs (Program Derived Addresses):** Escrow accounts have a *deterministic address* computed from three seeds: the string `"escrow"`, the client's wallet address, and the escrow index as 8 little-endian bytes. This three-part seed is what allows a single client wallet to have multiple simultaneous escrows — each index produces a different PDA.

```
PDA = findProgramAddress(["escrow", clientPubkey, escrowIndex.to_le_bytes()], PROGRAM_ID)
```

The `bump` is the small number (0–255) that makes the cryptographic math produce a valid address that doesn't conflict with existing keys. It is stored in the account and reused in later instructions so the program never has to re-derive it.

### The ClientProfile Account

Every client also has a **ClientProfile** account — a small companion account that tracks how many escrows they have created. Its seeds are `["client_profile", client_pubkey]`.

| Field | Type | Purpose |
|---|---|---|
| `owner` | `Pubkey` | The client wallet that owns this profile |
| `escrow_count` | `u64` | Number of escrows created so far; used as the next escrow's index |
| `bump` | `u8` | PDA bump for this account |

A client creates their profile once (via `initialize_client_profile`) before their first escrow. After that, each `create_escrow` call reads `escrow_count` as the next index, creates the escrow at `PDA["escrow", client, count]`, then increments `escrow_count` by 1. This makes it impossible to create two escrows at the same PDA — each one gets a unique, sequential address.

### The Six Instructions

These are the only six operations the program allows. Anything else is impossible.

#### Instruction 0: `initialize_client_profile`

**Who calls it:** The client — once per wallet, before their first escrow.

**What it does:**
1. Creates a new `ClientProfile` account at PDA `["client_profile", client_pubkey]`.
2. Sets `owner` to the client's wallet, `escrow_count` to 0.
3. Stores the bump so later instructions can re-derive the PDA cheaply.

If called again on the same wallet, the transaction fails because the PDA account already exists.

#### Instruction 1: `create_escrow`

**Who calls it:** The client.

**What it does:**
1. Checks `amount > 0` and verifies the supplied `escrow_index` matches `client_profile.escrow_count` (prevents index forgery).
2. Creates a new escrow account at `PDA["escrow", client, escrow_index.to_le_bytes()]`.
3. Writes all escrow data into the account, including storing `escrow_index` on the account.
4. Transfers the specified SOL from the client's wallet into the escrow account.
5. Increments `client_profile.escrow_count` by 1 so the next escrow gets the next index.

After this runs, the SOL is inside the escrow account. The client no longer has it. The freelancer doesn't have it yet. It's locked — and only the program decides where it goes next. Multiple escrows from the same wallet all live at different PDAs because they have different `escrow_index` values.

#### Instruction 2: `submit_work`

**Who calls it:** The freelancer.

**What it does:**
1. Checks status is `Active` (first submission) or `RevisionRequested` (resubmission).
2. Writes a JSON string with the delivery note, optional IPFS file URL, and filename into `work_submission`.
3. Changes status to `Submitted`.

No money moves here. This is purely a state update.

#### Instruction 3: `approve_work`

**Who calls it:** The client.

**What it does:**
1. Checks status is `Submitted`.
2. Changes status to `Completed`.
3. **Closes the escrow account** — all lamports inside (the locked amount + the small rent deposit) are transferred to the freelancer's wallet.

The account closing is key. Solana accounts pay a small "rent" to exist. When an account is closed, that rent returns with the balance. The freelancer gets `amount + ~0.002 SOL` in rent. The escrow account then ceases to exist on Solana.

#### Instruction 4: `cancel_escrow`

**Who calls it:** The client.

**What it does:**
1. Checks status is `Active` (cancellation is only possible before the freelancer submits any work).
2. Changes status to `Cancelled`.
3. Closes the escrow account and returns all lamports to the client.

The `Active`-only restriction is critical for the freelancer's protection. Once the freelancer submits work, the client can never cancel and get a refund.

#### Instruction 5: `request_revision`

**Who calls it:** The client.

**What it does:**
1. Checks status is `Submitted`.
2. Writes the client's feedback into `revision_note`.
3. Changes status to `RevisionRequested`.

The freelancer reads the feedback and calls `submit_work` again. This loop can repeat indefinitely. SOL stays locked throughout.

### The Status Machine

```
            create_escrow
[Nothing] ──────────────► Active
                              │
                  ┌───────────┤
                  │           │ cancel_escrow
                  │ submit_work          │
                  │           ▼
                  │        Cancelled  (account closed, SOL → client)
                  │
                  ▼
              Submitted ◄──────────────────┐
                  │                         │
        ┌─────────┴──────────┐        submit_work
        │ approve_work       │ request_revision
        ▼                    ▼             │
    Completed          RevisionRequested ──┘
(account closed,
SOL → freelancer)
```

### How the Program Enforces Security

Every instruction verifies:

1. **Signature check:** Does the transaction signature match the wallet address being claimed? Solana verifies this automatically before the program even runs.

2. **Authorization check:** Does `escrow.freelancer == signer` (for freelancer actions)? Does `escrow.client == signer` (for client actions)? If not, the program returns `NotFreelancer` or `NotClient`.

3. **Status check:** Is the current status valid for this action? If you try to approve when status is `Active`, the program returns `InvalidStatus`.

These checks mean even someone who knows the escrow's PDA address cannot steal, cancel, or approve anything — they can't produce the required cryptographic signature.

---

## 6. Layer 2 — The Frontend (Next.js/React)

### What it is

A website built with **Next.js** (a React framework) in the `app/frontend/` folder. When a user visits, they see React components. The website stores no data — it reads everything from Solana and displays it.

### File Structure

```
app/frontend/
├── pages/
│   ├── _app.js          ← root setup: fonts, wallet providers, theme init
│   ├── _document.js     ← HTML shell
│   ├── index.js         ← landing page (hero, stats, how-it-works)
│   ├── client.js        ← client dashboard (create + manage escrows)
│   ├── freelancer.js    ← freelancer dashboard (view + submit work)
│   ├── how-it-works.js  ← detailed explainer + FAQ
│   ├── escrow/
│   │   └── [id].js      ← escrow detail page (shared by both roles)
│   └── api/
│       └── upload.js    ← server-side only: proxies files to Pinata
├── components/
│   ├── Layout.js        ← page shell (head, navbar, footer, SVG filter)
│   ├── Navbar.js        ← top navigation bar
│   └── Toast.js         ← slide-in notification popup
├── pages/api/auth/
│   ├── challenge.js     ← GET ?wallet= → returns { message, nonce }
│   ├── verify.js        ← POST { wallet, signatureBase58, nonce } → sets JWT cookie
│   ├── me.js            ← GET → returns current user or 401
│   └── logout.js        ← POST → clears JWT cookie
├── pages/api/cron/
│   └── sync-escrows.js  ← GET (Bearer auth) → runs indexer, returns sync stats
├── hooks/
│   └── useAuth.js       ← auth state hook (signIn, signOut, user, isAuthenticated)
├── lib/
│   ├── prisma.js        ← Prisma singleton client
│   ├── auth.js          ← generateJWT, verifyJWT, setCookie, clearCookie
│   ├── cache.js         ← nonce store (single-use, 5 min TTL) + rate limiter
│   ├── solana-reader.js ← read-only Anchor provider, fetchAllEscrows(), parseStatus()
│   └── indexer.js       ← syncEscrows() — upsert loop + notification creation
├── scripts/             ← developer tools
│   ├── verify-setup.js  ← 8-check environment verifier (run before dev)
│   ├── airdrop-devnet.js ← CLI tool to request Devnet test SOL
│   ├── test-program.js  ← end-to-end integration tests against Devnet
│   └── run-indexer.js   ← manual indexer run (node scripts/run-indexer.js)
├── vercel.json          ← Vercel cron config (every-minute sync-escrows)
├── src/hooks/
│   └── useEscrow.js     ← ALL blockchain calls live here
├── src/idl/
│   └── freelancepay.json ← Anchor IDL (describes the program's interface)
├── utils/
│   ├── anchor.js        ← Anchor connection helpers (currently unused)
│   ├── ipfs.js          ← uploadToIPFS() and parseSubmission()
│   └── theme.js         ← motion system: scroll reveal, ripple, tilt, etc.
├── styles/
│   └── globals.css      ← the entire design system as CSS custom properties
├── .env.local.example   ← template for all 10 required env vars with comments
└── public/
    └── logo.svg         ← FreelancePay logo
```

**On-chain program source layout** (`programs/freelancepay/src/`) — four files only:
```
src/
├── lib.rs        ← all 6 instruction handlers + account context structs
├── state.rs      ← EscrowAccount, ClientProfile, EscrowStatus
├── error.rs      ← ErrorCode enum (NotClient, NotFreelancer, InvalidStatus, AlreadySubmitted)
└── constants.rs  ← ESCROW_SEED, CLIENT_PROFILE_SEED
```
Dead files that existed before Phase 2 cleanup (`create_escrow.rs`, `submit_work.rs`, `approve_work.rs`, `cancel_escrow.rs`, `instructions.rs`, and the entire `instructions/` directory) were deleted. All instruction logic lives exclusively in `lib.rs`.

### `pages/_app.js` — The Root Setup

Every page request goes through this file. It does four things:

**1. Loads fonts.** Uses `next/font/google` to load:
- **Gaegu** — handwritten display font for headings, stamps, decorative labels. Loaded in weights 400 and 700. Assigned to CSS variable `--font-display`.
- **Nunito** — rounded sans-serif body font for all text, buttons, and numbers. Loaded in weights 400, 600, 700, 800. Assigned to CSS variable `--font-body`.

Both fonts are loaded via Next.js's font optimization (no layout shift, self-hosted from Google). The CSS variables are applied to the root `<div>` that wraps everything.

**2. Sets up Solana providers.** Three context providers wrap every page:
- `ConnectionProvider` — establishes a WebSocket/HTTP connection to Solana Devnet at `https://api.devnet.solana.com`.
- `WalletProvider` — manages wallet state across the whole app. Configured with `PhantomWalletAdapter`. `autoConnect: true` means if the user was connected last time, it reconnects automatically.
- `WalletModalProvider` — provides the "Select Wallet" popup UI.

Any component anywhere can call `useWallet()` or `useConnection()` to access these.

**3. Patches Buffer.** `@solana/web3.js` uses Node's `Buffer` class internally, but browsers don't have it. `_app.js` assigns the polyfill: `window.Buffer = Buffer`. This runs only in the browser (checked with `typeof window !== "undefined"`).

**4. Initializes the motion system.** Calls `initTheme()` from `utils/theme.js` once after the first render via `useEffect`. This boots scroll reveal, smooth scrolling, button ripples, card tilts, and hide-on-scroll navbar. See Layer 3 for details.

---

### `pages/index.js` — The Landing Page

The first thing visitors see. Contains three inline components:

#### `VaultSVG` — The Hero Illustration

An inline SVG vault illustration that gives the page a hand-crafted identity:

```jsx
<svg width="190" height="158" viewBox="0 0 190 158"
  style={{ filter: "url(#rough)" }} aria-hidden>
```

The `filter="url(#rough)"` references a global SVG filter defined once in `Layout.js` — a `feTurbulence + feDisplacementMap` filter that makes straight lines look slightly wobbly, giving the illustration a hand-drawn feel. The vault body is colored with CSS token `var(--lav)`, the door panel `var(--lav-lo)`, the dial and handle `var(--butter)`. Two coin stacks below the vault represent locked SOL (butter-colored) and earned/released SOL (sage-colored). All colors reference CSS token variables — never hardcoded hex values.

#### `TrustMotif` — Client ↔ Freelancer Connector

Appears above the "How it works" steps:

```jsx
<div className="avatar" style={{ background: "var(--lav)" }}>C</div>
<Lock size={14} strokeWidth={2.2} aria-hidden />
<div style={{ height: 2, width: 48, background: "var(--line)" }} />
<div className="avatar" style={{ background: "var(--sage)" }}>F</div>
```

Two avatar circles (C = Client in lavender, F = Freelancer in sage) connected by a Lock icon and a horizontal line. This communicates the escrow concept visually without words. The whole component is `aria-hidden` — it's purely decorative.

#### The Rest of the Page

- **Hero section** — has a `div.hex-texture` overlay (CSS background-image of repeated hex polygons), the `VaultSVG`, a "LIVE ON SOLANA DEVNET" pill badge, the main headline, and CTA buttons.
- **Stats strip** — four numbers (4M+ freelancers, 0% fees, <2s speed, $1.5B at risk) displayed with `.amount` class (Nunito 800 + tabular-nums).
- **How It Works** — three cards (Lock SOL → Deliver Work → Get Paid) with `TrustMotif` above them. Each card has a color accent bar at the top and an `icon-badge` with a Lucide icon.
- **Bottom CTA** — a dashed lavender card with connect/create buttons.

---

### `pages/client.js` — The Client Dashboard

Two sections: a create form and an escrow list.

#### The Create Form

Four fields: project title, description, freelancer wallet address, amount in SOL. On submit, calls `createEscrow()` from `useEscrow`. Loading state shows a spinner inside the button.

#### `StatusBadge` component

```jsx
function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}
```

A colored pill that reads the status and applies a CSS class. CSS handles the colors — `badge-active` is sky blue, `badge-submitted` is butter yellow, `badge-completed` is sage green, etc.

#### `Stamp` component

```jsx
const STAMP_MAP = {
  active:            { cls: "stamp--locked",   label: "Locked"    },
  submitted:         { cls: "stamp--escrow",   label: "In Escrow" },
  revisionRequested: { cls: "stamp--revision", label: "Revision"  },
  completed:         { cls: "stamp--released", label: "Released"  },
  cancelled:         { cls: "stamp--refunded", label: "Refunded"  },
};

function Stamp({ status }) {
  const s = STAMP_MAP[status];
  if (!s) return null;
  return <span className={`stamp ${s.cls}`} aria-hidden>{s.label}</span>;
}
```

A rubber-stamp style lifecycle mark. `aria-hidden` because `StatusBadge` already communicates the same information accessibly. The `stamp` CSS class gives it: Gaegu font (handwritten feel), uppercase, letter-spacing, a 2px border-radius border, and `transform: rotate(-2deg)` for a slightly tilted "stamped on" look. Each variant (`stamp--locked`, `stamp--escrow`, etc.) applies different pastel background + ink color combinations using CSS tokens.

#### `EscrowCard` component

The card header has a right column that stacks three elements vertically:

```jsx
<div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
  <div className="card-amount">{sol} SOL</div>
  {status !== "completed" && status !== "cancelled" && (
    <span className="locked-cue">
      <Lock size={11} strokeWidth={2.2} aria-hidden /> held in escrow
    </span>
  )}
  {status === "completed" && (
    <span className="locked-cue locked-cue--released">
      <Zap size={11} strokeWidth={2.2} aria-hidden /> released
    </span>
  )}
  <Stamp status={escrow.status} />
</div>
```

1. The SOL amount in `.card-amount` (Nunito 800, tabular-nums — the focal number).
2. A "locked cue" — tiny padlock icon + "held in escrow" text when funds are actively locked; switches to lightning bolt + "released" when completed.
3. The rubber stamp showing the lifecycle state.

Below the header: the description, the freelancer wallet address (truncated with ellipsis), the submitted work display (if any), the revision note (if any), and action buttons appropriate to the current status.

---

### `pages/freelancer.js` — The Freelancer Dashboard

Similar structure to `client.js`. Shares the same `Stamp` component pattern (defined identically within the file) and the same card-header right column layout with amount + lock cue + stamp.

Additional elements:
- A **stats strip** at the top showing Active / Pending Approval / Completed counts.
- The **submit work form** — has a textarea and a file attach button. Files are uploaded via `uploadToIPFS()` then the resulting URL is included in the on-chain submission JSON.
- A **"Payment released"** confirmation row with a `Zap` icon when status is `completed`.

---

### `pages/escrow/[id].js` — The Escrow Detail Page

The URL is `/escrow/<PDA_ADDRESS>`. Next.js extracts the PDA from `router.query.id`.

This page serves both the client and the freelancer. It detects the role by comparing `publicKey.toBase58()` to `escrow.client` and `escrow.freelancer`:

```js
const isClient     = escrow && publicKey && escrow.client     === publicKey.toBase58();
const isFreelancer = escrow && publicKey && escrow.freelancer === publicKey.toBase58();
```

The header card right column uses `.amount--lg` (larger than normal amount styling) instead of `.card-amount`:

```jsx
<div className="amount amount--lg">{(escrow.amount / LAMPORTS).toFixed(4)} SOL</div>
```

This makes the SOL amount the visual focal point on the detail page. The lock cue and stamp follow below it, same as the dashboard cards.

The rest of the page shows:
- **Progress timeline** — three dots (Active → Submitted → Completed) connected by a line. Completed steps are green, current step has a thicker border ring.
- **Contract details card** — PDA address, client wallet, freelancer wallet, creation date.
- **Revision note card** (if status is `revisionRequested`) — orange-bordered card with the client's feedback.
- **Work submission card** (if submitted) — the delivery note and a "Download Deliverable" button if a file was attached.
- **Client-only cards** — "Review Delivery" (approve + revision form) when submitted; "Cancel Escrow" when active.
- **Freelancer-only card** — submit/resubmit form with file attachment.
- **Completed state** — a full-width sage-green celebration card.

---

### `pages/how-it-works.js` — The Explainer Page

Static educational content. Five steps explained at two levels (simple and technical). An FAQ section. No blockchain calls. Fully renders on the server.

---

### `components/Layout.js` — The Page Shell

Wraps every page. Contains:

**The global SVG filter** — a hidden `<svg>` with a `#rough` filter defined once:
```jsx
<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
  <defs>
    <filter id="rough">
      <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="1" seed="7" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
    </filter>
  </defs>
</svg>
```

Any SVG anywhere on the page can apply this filter with `style={{ filter: "url(#rough)" }}` — it makes the element look slightly hand-drawn by displacing pixels with fractal noise. Used on `VaultSVG`.

**The footer** — has a `div.hex-texture` overlay (same hex chain pattern as the hero), `AlertTriangle` icon for the devnet warning, and relative positioning so the texture stays within the footer boundaries.

---

### `components/Navbar.js` — The Navigation Bar

A UMT banner above the main nav. The navbar contains:
- The FreelancePay logo + text (links to home)
- Links to Home, How It Works, Client, Freelancer
- The **"Practice Mode"** stamp (previously called "DEVNET" badge):
  ```jsx
  <span className="devnet-badge devnet-stamp">Practice Mode</span>
  ```
  The `devnet-stamp` class adds `border-style: dashed`, butter background, Gaegu font, and a slight rotation — making it look like a literal rubber stamp on the nav rather than a static label.
- The Phantom Connect button

Active link highlighting is done by comparing `router.pathname` to each link's `href`.

---

### `components/Toast.js` — The Notification Popup

Slide-in notification at the bottom-right corner. Two variants: `success` (green) and `error` (red). Auto-dismisses after 6 seconds. Successful transactions include a "View on Explorer ↗" link to Solana's block explorer so users can verify the transaction.

---

## 7. Layer 3 — The Design System (CSS Tokens + Typography + Motion)

### `styles/globals.css` — The Token System

The entire visual system is defined here as CSS custom properties (variables) organized into 21 numbered sections. Everything in the UI references these variables — no hardcoded colors in JSX.

#### Color Tokens

```css
:root {
  /* surfaces */
  --ink:       #4f433c;   /* main text — warm dark brown */
  --ink-soft:  #8a7c70;   /* secondary text */
  --cream:     #fbf5ea;   /* page background */
  --paper:     #ffffff;   /* card background */
  --line:      #e7ddcb;   /* borders, dividers */

  /* pastels */
  --butter:    #f7df9b;   /* yellow — active/pending states */
  --pink:      #f5bcc7;   /* pink — cancel/error states */
  --sage:      #c2d8b6;   /* green — success/completed states */
  --lav:       #d6c8ec;   /* lavender — primary brand color */
  --sky:       #bdd7ea;   /* blue — active/info states */
  --peach:     #f6c6a4;   /* orange — revision/warning states */
  --leaf:      #a9c98f;   /* green — released/paid states */
  --brown:     #7d5a45;   /* dark brown — amount/number accent */

  /* low-opacity tints (pre-computed at ~20% on white) */
  --sage-lo:   #eef6ea;
  --pink-lo:   #fef0f4;
  --peach-lo:  #fdf3ed;
  --sky-lo:    #eef5fb;
  --lav-lo:    #f3effb;
  --butter-lo: #fdf8e7;
```

The `-lo` suffix tints are used for card backgrounds, badge fills, and icon badge backgrounds where you want a hint of color without full saturation.

**Legacy aliases** — old code that used `var(--bg)` or `var(--text)` still works because these are remapped:
```css
--bg:    var(--cream);
--text:  var(--ink);
--muted: var(--ink-soft);
```

#### Typography Tokens

```css
--font-display: 'Gaegu', cursive;   /* handwritten — Gaegu from Google Fonts */
--font-body:    'Nunito', sans-serif; /* rounded sans — Nunito from Google Fonts */

--fs-hero: clamp(2.4rem, 6vw, 4rem);  /* hero headline — scales with viewport */
--fs-h1:   clamp(1.9rem, 4vw, 2.8rem);
--fs-h2:   clamp(1.5rem, 3vw, 2.1rem);
--fs-lg:   1.1rem;
--fs-sm:   0.82rem;
```

**Critical rule:** Gaegu is ONLY used for headings, stamps, decorative labels. Currency values, numbers, and table data ALWAYS use Nunito 800 with `font-variant-numeric: tabular-nums` so digits line up in columns. This is enforced by the `.amount` class.

#### The `.amount` Class

```css
.amount {
  font-family: var(--font-body);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.03em;
}
.amount--lg { font-size: 1.6rem; }
.amount--muted { color: var(--ink-soft); }
```

Every SOL price displayed anywhere uses this class (or `.card-amount` which shares the same properties). This guarantees consistent number styling across all pages.

#### The `.badge` + `.status` Pill System

`.badge` is for escrow lifecycle states (active, submitted, completed, etc.):
```css
.badge { display:inline-flex; align-items:center; gap:.3em; border-radius:999px; ... }
.badge-active    { background: var(--sky-lo);    color: var(--blue); }
.badge-submitted { background: var(--butter-lo); color: var(--amber); }
.badge-completed { background: var(--sage-lo);   color: var(--green); }
.badge-cancelled { background: var(--pink-lo);   color: var(--red); }
.badge-revisionRequested { background: var(--peach-lo); color: var(--orange); }
```

`.status` is for domain-level payment statuses (used on the how-it-works page and in future invoice views):
```css
.status        { display:inline-flex; border-radius:999px; ... }
.status--paid  { background: var(--sage-lo);   color: var(--leaf); }
.status--overdue { background: var(--pink-lo); color: var(--err); }
```

#### The `.icon-badge` Component

A square badge with a centered icon, available in four color variants:
```css
.icon-badge       { width:44px; height:44px; border-radius:var(--r-sm); display:flex; ... }
.icon-badge--lav  { background: var(--lav-lo);    border-color: var(--lav); }
.icon-badge--sage { background: var(--sage-lo);   border-color: var(--sage); }
.icon-badge--paid { background: var(--sage-lo);   border-color: var(--leaf); }
```

#### The `.avatar` Component

A 36×36 circle for displaying single-letter initials:
```css
.avatar {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-weight: 700; font-size: 0.9rem;
  border: 2.5px solid var(--ink); color: var(--ink);
}
```

Used in `TrustMotif` to show "C" (Client) and "F" (Freelancer) as abstract representations.

#### Animation Tokens and Keyframes

```css
--ease-spring: cubic-bezier(.34,1.56,.64,1); /* bouncy spring easing */
--ease-out:    cubic-bezier(.2,0,.2,1);       /* smooth deceleration */
--dur-fast: 160ms; --dur-med: 280ms; --dur-slow: 440ms;

@keyframes rise  { from { opacity:0; transform:translateY(18px); } }
@keyframes zoom  { from { opacity:0; transform:scale(.9); } }
@keyframes pop   { from { opacity:0; transform:scale(.85) translateY(10px); } }
@keyframes ripple { to   { transform:scale(2); opacity:0; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; }
}
```

The reduced-motion override collapses all animation durations to near-zero, respecting the OS accessibility setting. Static CSS transforms (like `rotate(-2deg)` on stamps) are NOT animations and remain visible under reduced motion.

#### The `data-enter` and `data-reveal` Animation Attributes

These are HTML attributes (not CSS classes) read by `utils/theme.js` at runtime:

- `data-enter` — elements that animate on page load (hero text, buttons). `initTheme()` adds `class="anim-pop"` and sets `--i` index for staggered animation delay.
- `data-reveal="rise|left|right|zoom|pop"` — elements that animate when scrolled into view via IntersectionObserver. Initially `opacity: 0`; the class is added when the element is 12% into the viewport.
- `data-stagger` — a grid where each child card gets staggered delay via `--i` custom property.
- `data-tilt` — cards that respond to mouse movement with a 3D perspective tilt.

---

### `utils/theme.js` — The Motion System

Called once from `_app.js`. Boots five interactive systems:

#### 1. Lenis Smooth Scroll

```js
lenis = new Lenis({
  duration: 1.1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
```

Replaces native browser scrolling with smooth, momentum-based scrolling. The easing function (`1 - 2^(-10t)`) creates an exponential deceleration that feels natural. Skipped entirely if `prefers-reduced-motion` is set.

#### 2. Scroll Reveal (IntersectionObserver)

```js
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const kind = e.target.dataset.reveal || "rise";
      const map = { rise: "anim-rise", zoom: "anim-zoom", pop: "anim-pop", ... };
      e.target.classList.add(map[kind] || "anim-rise");
      io.unobserve(e.target);  // only animate once
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
);
```

Watches all `[data-reveal]` elements. When one enters the viewport (12% visible, with a -6% bottom margin to trigger slightly before the element is fully visible), the appropriate animation class is added. `unobserve` ensures the animation only plays once, not every time the element scrolls in/out.

#### 3. Button Ripple Effect

```js
document.addEventListener("pointerdown", (e) => {
  const b = e.target.closest(".btn");
  if (!b) return;
  const r = document.createElement("span");
  r.className = "ripple";
  // position + size relative to click position within button
  b.appendChild(r);
  setTimeout(() => r.remove(), 600);
});
```

On every click on any `.btn`, a `<span class="ripple">` is inserted at the exact click position and removed after 600ms. CSS animates it from 0 to `scale(2)` with `opacity: 0`.

#### 4. Magnetic Button Hover

```js
document.querySelectorAll(".magnetic").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(
      ${(e.clientX - r.left - r.width  / 2) * 0.18}px,
      ${(e.clientY - r.top  - r.height / 2) * 0.18}px
    )`;
  });
  el.addEventListener("pointerleave", () => { el.style.transform = ""; });
});
```

Buttons with `className="magnetic"` subtly follow the cursor within their bounds (at 18% of the actual distance). Resets on mouse leave.

#### 5. Card 3D Tilt

```js
document.querySelectorAll("[data-tilt]").forEach((c) => {
  c.addEventListener("pointermove", (e) => {
    const r = c.getBoundingClientRect();
    const rx = ((e.clientY - r.top)  / r.height - 0.5) * -5;
    const ry = ((e.clientX - r.left) / r.width  - 0.5) *  5;
    c.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
  });
  c.addEventListener("pointerleave", () => { c.style.transform = ""; });
});
```

Cards with `data-tilt` rotate ±5 degrees on both axes based on cursor position relative to the card center, with a `perspective(700px)` to create a 3D depth effect. The `-4px` vertical lift happens on any hover.

#### 6. Hide-on-Scroll Navbar

Adds `is-stuck` class to `.navbar` when `scrollY > 8` (makes the navbar compact/shadowed). Adds `is-hidden` when scrolling down past 120px. Removes `is-hidden` when scrolling up — the nav slides back in.

#### 7. Animated Counters

`[data-count]` elements count from 0 to their `data-count` value over 1200ms using an easing function when they scroll into view.

---

## 8. Layer 4 — Thematic Visual Identity

These are the domain-specific UI elements that communicate "this is an escrow product on a blockchain" — added on top of the base design system.

### CSS Section 21: Identity Tokens

```css
/* Rubber stamps */
.stamp {
  display: inline-block;
  font-family: var(--font-display);   /* Gaegu — handwritten */
  font-size: .72rem; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  padding: .15em .65em;
  border: 2px solid currentColor; border-radius: 4px;
  transform: rotate(-2deg);           /* tilted like a physical stamp */
  opacity: .82;
  pointer-events: none; user-select: none;
}
.stamp--locked   { color: var(--purple); background: var(--lav-lo); }
.stamp--escrow   { color: var(--brown);  background: var(--butter-lo); }
.stamp--revision { color: var(--orange); background: var(--peach-lo); }
.stamp--released { color: var(--green);  background: var(--sage-lo); }
.stamp--refunded { color: var(--red);    background: var(--pink-lo); }

/* Lock cue */
.locked-cue          { display: inline-flex; align-items: center; gap: .3em; font-size: .72rem; font-weight: 700; color: var(--ink-soft); }
.locked-cue--released { color: var(--leaf); }

/* Practice Mode stamp (Navbar) */
.devnet-stamp {
  transform: rotate(-1.5deg);
  border-style: dashed !important;
  background: var(--butter) !important;
  font-family: var(--font-display) !important;
}

/* Vault illustration */
.vault-hero-svg { display: block; margin: 0 auto; }

/* Hex chain texture */
.hex-texture {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    url("data:image/svg+xml,<svg ... polygon .../svg>"),
    url("data:image/svg+xml,<svg ... polygon .../svg>");
  background-size: 60px 52px;
  background-position: 0 0, 30px 26px;  /* offset second layer by half-tile */
}
```

### How the Hex Texture Tiles

A single hex SVG doesn't tile into a grid naturally — hexagons have a 30° offset on alternating rows. The two-layer technique solves this:
- Layer 1 tiles at `0 0` with `60px 52px` size.
- Layer 2 tiles at `30px 26px` — offset by exactly half the tile width and height.

This creates a proper pointy-top hexagonal grid pattern with both layers superimposed. Color is `rgba(214,200,236,0.32)` — the lavender palette at 32% opacity, subtle enough to read as texture, not noise.

### The `#rough` SVG Filter (in Layout.js)

```xml
<filter id="rough">
  <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="1" seed="7" result="n" />
  <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
</filter>
```

`feTurbulence` generates a fractal noise field. `feDisplacementMap` uses that noise to push each pixel in the source graphic by up to ±1.6 pixels in both directions. With `baseFrequency="0.016"`, the noise varies slowly across the image — creating gentle, organic distortion rather than static grain. Applied to `VaultSVG` to make its crisp vector shapes look like they were drawn by hand.

### Stamp + LockedCue on All Escrow Cards

The same `Stamp` component and lock cue pattern is implemented identically in three pages:
- `pages/client.js`
- `pages/freelancer.js`
- `pages/escrow/[id].js`

Each defines the `STAMP_MAP` object locally (not in a shared file) to keep each page self-contained. The card header right column always stacks: amount → lock cue → stamp.

---

## 9. The Bridge — useEscrow Hook

### What Problem It Solves

The frontend needs to talk to Solana. But React components don't know how to build Solana transactions. The `useEscrow` hook (`src/hooks/useEscrow.js`) handles ALL blockchain communication. Pages import it and call simple functions.

### How `getProgram()` Works

```js
const getProgram = useCallback(() => {
  if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program(idl, provider);
}, [connection, wallet]);
```

`AnchorProvider` wraps the Solana connection and the wallet together. `new Program(idl, provider)` reads the IDL JSON file and builds a typed API client. With `commitment: "confirmed"`, the app waits until the transaction has been voted on by a supermajority of validators before treating it as done.

### How `deriveEscrowPDA()` and `deriveClientProfilePDA()` Work

```js
// Escrow PDA — three seeds: "escrow" + clientPubkey + escrowIndex (8-byte LE)
const deriveEscrowPDA = useCallback((clientPubkey, escrowIndex) => {
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(escrowIndex));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), clientPubkey.toBytes(), indexBuf],
    PROGRAM_ID
  );
  return pda;
}, []);

// ClientProfile PDA — two seeds: "client_profile" + clientPubkey
const deriveClientProfilePDA = useCallback((clientPubkey) => {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("client_profile"), clientPubkey.toBytes()],
    PROGRAM_ID
  );
  return pda;
}, []);
```

`findProgramAddressSync` is a deterministic function: given the same seeds and program ID, it always returns the same address. It tries `bump` values from 255 down to 0 until it finds an address that's provably NOT on the ed25519 elliptic curve (which is required for PDAs to be "owned" by programs, not users).

The `escrowIndex` parameter is written as 8 bytes in little-endian format — this mirrors exactly how the Rust program does `escrow_index.to_le_bytes()`. The JS and Rust derivations must be byte-for-byte identical or the frontend will compute the wrong PDA.

### How Each Blockchain Call Works

All functions follow the same pattern. `createEscrow` now auto-initializes the `ClientProfile` if this is the client's first escrow:

```js
const createEscrow = useCallback(async (title, description, freelancerAddress, amountInSOL) => {
  try {
    const program = getProgram();
    const profilePDA = deriveClientProfilePDA(wallet.publicKey);
    const amountLamports = new BN(Math.round(amountInSOL * LAMPORTS_PER_SOL));

    // Read current escrow count from profile (or initialize profile if missing)
    let profile = null;
    try { profile = await program.account.clientProfile.fetch(profilePDA); }
    catch { await initializeClientProfile(); profile = { escrowCount: new BN(0) }; }

    const escrowIndex = profile.escrowCount;
    const escrowPDA = deriveEscrowPDA(wallet.publicKey, escrowIndex.toNumber());

    const signature = await program.methods
      .createEscrow(title, description, new PublicKey(freelancerAddress), amountLamports, escrowIndex)
      .accounts({
        client: wallet.publicKey,
        clientProfile: profilePDA,
        escrow: escrowPDA,
        systemProgram: SystemProgram.programId
      })
      .rpc();

    return { success: true, signature, escrowPDA: escrowPDA.toBase58() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}, [getProgram, deriveEscrowPDA, deriveClientProfilePDA, wallet.publicKey]);
```

1. `new BN(...)` — `BN` is a big-number library. JavaScript can't represent 64-bit integers accurately with regular `number` (max safe integer is 2^53 ≈ 9 quadrillion, while 1 SOL = 1 billion lamports so most amounts fit, but the program uses `u64` which can hold up to 18 quintillion).
2. `program.methods.createEscrow(...)` — Anchor encodes the instruction name and arguments as bytes using the IDL.
3. `.accounts({...})` — tells Anchor which Solana accounts are involved in this transaction. Anchor uses the IDL to verify the account list is complete.
4. `.rpc()` — Anchor asks the wallet to sign the transaction, then sends it to the RPC node. Returns the transaction signature.

### How Fetching Works

```js
const accounts = await program.account.escrowAccount.all([
  { memcmp: { offset: 8, bytes: wallet.publicKey.toBase58() } },
]);
```

`program.account.escrowAccount.all([filter])` asks Solana's RPC: "give me all accounts owned by this program where the bytes at position 8 match this wallet address."

Why offset 8? Every Anchor account starts with an 8-byte discriminator (a fingerprint). After that:
- `client` starts at byte 8 (32 bytes long)
- `freelancer` starts at byte 40 (8 discriminator + 32 client)

So client filtering uses `offset: 8`, freelancer filtering uses `offset: 8 + 32 = 40`.

This filter runs on Solana's RPC node — only matching accounts are returned over the network. You don't download all escrows globally.

### The IDL File

`src/idl/freelancepay.json` describes the program's interface: what instructions exist, what accounts they need, what arguments they take, what error codes they return. Anchor's JS client reads this to build transactions and deserialize account data. If the frontend IDL and the deployed program disagree on anything, transactions fail with encoding errors.

---

## 10. The IPFS File Upload System

### What is IPFS?

IPFS (InterPlanetary File System) is a decentralized file storage network. Files get a permanent address (CID — Content Identifier) based on their content. The same file uploaded twice gets the same CID. Files are accessible via any IPFS gateway.

### What is Pinata?

A service that "pins" IPFS files — guarantees they stay available via their gateway. Authentication uses a secret JWT.

### The Security Problem

The Pinata JWT must never reach the browser. If it did, anyone could use it to upload files to your account at your expense.

### The Solution — Server-Side Proxy

```
Browser                    Next.js Server (/api/upload)     Pinata (cloud)
   │                               │                              │
   │  POST /api/upload             │                              │
   │  + file (multipart)           │                              │
   │ ──────────────────────────►   │                              │
   │                               │  POST pinFileToIPFS          │
   │                               │  Authorization: Bearer JWT   │
   │                               │ ────────────────────────►    │
   │                               │                              │
   │                               │  { IpfsHash: "Qm..." }       │
   │                               │ ◄────────────────────────    │
   │                               │                              │
   │  { cid, url, name }           │                              │
   │ ◄──────────────────────────   │                              │
```

`pages/api/upload.js` reads `PINATA_JWT` from a server-side environment variable (set in `.env.local`, which is gitignored). It manually reads the raw HTTP body as a `Buffer` (because it disables Next.js's body parser with `export const config = { api: { bodyParser: false } }`) and forwards the exact same multipart body to Pinata.

### How the File URL Gets On-Chain

```js
const encoded = JSON.stringify({
  note: "Website delivered at xyz.com",
  file: "https://gateway.pinata.cloud/ipfs/Qm...",
  name: "design.pdf"
});
// trimmed to max 500 chars if needed
await submitWork(escrow.pda, encoded);
```

The file lives on IPFS. Only the URL string is stored on Solana. The `parseSubmission()` function handles both the JSON format and old plain-text submissions (for backwards compatibility):

```js
export function parseSubmission(raw) {
  if (!raw) return { note: "", file: null, name: null };
  try {
    const parsed = JSON.parse(raw);
    return { note: parsed.note, file: parsed.file, name: parsed.name };
  } catch {
    return { note: raw, file: null, name: null };  // legacy plain text
  }
}
```

---

## 11. The Revision Loop

### Why It Exists

Without revisions, clients had only two options: approve (release money) or do nothing. The revision loop adds structured back-and-forth with an on-chain paper trail.

### The Flow

```
Freelancer submits → status: Submitted
Client reviews → not happy
Client sends revision with message → status: RevisionRequested
Freelancer sees message in orange UI box
Freelancer revises and resubmits → status: Submitted (again)
...repeat...
Client approves → status: Completed, money released
```

### Why Cancel Is Blocked After First Submission

`cancel_escrow` only works when status is `Active`. Once the freelancer submits work (even once), the status becomes `Submitted` — and can never return to `Active`. Even during the revision loop (alternating between `Submitted` and `RevisionRequested`), the client cannot cancel. This prevents the attack where a dishonest client:
1. Hires a freelancer
2. Requests multiple revisions to stall
3. Cancels and takes the money back

Once work is submitted, that loophole is closed forever.

---

## 12. Complete Walkthroughs — Step by Step

### Happy Path: Create → Submit → Approve

**Step 1 — Client connects wallet**

Visits the site, clicks "Connect Wallet," selects Phantom. Phantom asks for permission. The nav now shows the connected wallet and CTA buttons appear.

**Step 2 — Client creates an escrow**

Goes to `/client`. Fills in:
- Title: "Build my website"
- Freelancer wallet: `Abc1...XYZ9`
- Amount: 0.5 SOL

Clicks "Create & Lock SOL."

Behind the scenes:
1. Frontend converts 0.5 SOL → `500,000,000` lamports using `new BN(Math.round(0.5 × 1e9))`.
2. Computes PDA: `findProgramAddressSync(["escrow", clientWalletBytes], PROGRAM_ID)` → deterministic address like `Def2...ABC8`.
3. Builds `createEscrow` transaction via Anchor.
4. Phantom pops up showing: send 0.5 SOL + ~0.002 SOL rent deposit.
5. Client approves. Transaction confirms in ~1 second.
6. Escrow account `Def2...ABC8` now exists on-chain with 0.5 SOL locked and status `Active`.
7. Green toast: "Escrow created! 0.5 SOL locked." with Explorer link.

**Step 3 — Freelancer sees the escrow**

Freelancer connects their wallet, goes to `/freelancer`. Page calls `fetchMyEscrowsAsFreelancer()` which queries Solana with `memcmp` offset 40 filter. The new escrow appears with status badge "Active" and stamp "Locked". Lock cue shows padlock + "held in escrow" next to the SOL amount.

**Step 4 — Freelancer submits work**

Clicks "Submit Work." Form opens. They write a delivery note and optionally attach a file.

If file attached:
1. `uploadToIPFS(file)` sends file to `/api/upload`.
2. Server reads `PINATA_JWT` from env, forwards to Pinata.
3. Pinata returns CID. Server returns gateway URL.
4. Frontend assembles JSON: `{"note":"...", "file":"https://gateway.pinata.cloud/ipfs/Qm...", "name":"design.pdf"}`.

Clicks "Submit Work On-Chain." Phantom prompts. Transaction confirms. On-chain: `work_submission` written, status → `Submitted`.

**Step 5 — Client reviews and approves**

Client refreshes. Escrow now shows status badge "Submitted" and stamp "In Escrow." A download button appears if a file was attached.

Client clicks "Approve & Pay." Phantom confirms.

Behind the scenes:
1. Anchor calls `approve_work` on-chain.
2. Program checks: status is `Submitted` ✓, signer is the client ✓.
3. Status → `Completed`.
4. All lamports (500,000,000 + ~2,039,280 rent) transfer to freelancer's wallet.
5. Escrow account deleted from Solana.

Freelancer's wallet gains 0.5002 SOL. Toast: "Work approved! SOL sent to freelancer." Escrow card now shows stamp "Released" and lock cue "⚡ released".

---

### Revision Path

After Step 4 (freelancer submits), instead of approving:

**Client requests revision:**

Clicks "Request Revision." Types: "Please make the header larger and change the font to Inter."

Clicks "Send Revision Request." Transaction sends. On-chain: `revision_note` written, status → `RevisionRequested`. Stamp on card changes to "Revision".

**Freelancer resubmits:**

Refreshes dashboard. Orange "Changes Requested" box shows the feedback. Submit button now reads "Resubmit Work." Makes changes, resubmits.

On-chain: `work_submission` overwritten with new delivery, status → `Submitted` (loop back).

This loop can repeat indefinitely. SOL stays locked throughout.

---

## 13. The Security Model — Who Can Do What

The security doesn't rely on the website being honest. Even if someone built a fake frontend, they couldn't steal money — the program enforces all rules independently.

### What the Program Enforces

| Action | Who can do it | Program checks |
|---|---|---|
| Create escrow | Anyone | Amount > 0; client's wallet signs |
| Submit work | Only the registered freelancer | Signer matches `escrow.freelancer`; status is `Active` or `RevisionRequested` |
| Approve work | Only the registered client | Signer matches `escrow.client`; status is `Submitted` |
| Cancel escrow | Only the registered client | Signer matches `escrow.client`; status is `Active` |
| Request revision | Only the registered client | Signer matches `escrow.client`; status is `Submitted` |

### What Nobody Can Do

- Take money without the client's approval (not even Solana's validators)
- Approve their own work (freelancer signer ≠ `escrow.client`)
- Submit work on behalf of another freelancer (signer ≠ `escrow.freelancer`)
- Cancel after work is submitted (status is never `Active` again)
- Modify the program's code (deployed to an immutable address)
- Access `PINATA_JWT` from the browser (server-side only, not in any JS bundle)

---

## 14. The Data — What Gets Stored and Where

| Data | Location | Who can read it | Who can change it |
|---|---|---|---|
| All escrow fields | Solana blockchain (`EscrowAccount` PDA) | Anyone | Only the program, via valid instructions |
| Client escrow counter + profile | Solana blockchain (`ClientProfile` PDA) | Anyone | Only via `initialize_client_profile` / `create_escrow` |
| Uploaded deliverable files | Pinata/IPFS | Anyone with the URL | Nobody (content-addressed, immutable) |
| IPFS file URL | Inside `work_submission` on Solana | Anyone | Only via `submit_work` instruction |
| User profiles (displayName, bio, skills, ratings) | PostgreSQL `User` table (Supabase) | Server-side API routes | Authenticated API calls |
| Cached escrow state (off-chain mirror) | PostgreSQL `Escrow` table | Server-side API routes | Indexer/sync job |
| Notifications | PostgreSQL `Notification` table | Recipient user via API | Server-side on escrow events |
| Job posts | PostgreSQL `JobPost` table | Any authenticated user | Posting client via API |
| Reviews | PostgreSQL `Review` table | Any authenticated user | Client after escrow completes |
| `PINATA_JWT` | `.env.local` (server-side env var) | Only the server process | The developer |
| `DATABASE_URL` | `.env.local` + `.env` (server-side) | Only the server process | The developer |
| `JWT_SECRET` | `.env.local` (server-side env var) | Only the server process | The developer |
| `fp_auth` JWT cookie | Browser httpOnly cookie | Only the server (httpOnly) | Issued on sign-in, cleared on logout |
| Wallet private key | Inside Phantom browser extension | Only Phantom | The wallet owner |

**Two data layers exist.** Solana is the authoritative source of truth for all financial data — the blockchain IS the escrow ledger. PostgreSQL (Supabase) is the off-chain companion store for data that doesn't belong on a blockchain: user display names, notification history, job listings, and reviews. On-chain data survives if the website goes offline; PostgreSQL data does not, but it is also non-financial and re-seedable.

---

## 15. How the Pages Connect to Each Other

```
Home (index.js)
│
├── "I'm a Client" ─────────────────────────► Client Dashboard (client.js)
│                                                  │
│                                        "View Details" ─► Escrow Detail ([id].js)
│                                             └── "Create & Lock" (new escrow)
│
├── "I'm a Freelancer" ─────────────────────► Freelancer Dashboard (freelancer.js)
│                                                  │
│                                        "View Details" ─► Escrow Detail ([id].js)
│                                             └── "Submit Work" (submit to escrow)
│
└── "How It Works" ─────────────────────────► Explainer Page (how-it-works.js)


Escrow Detail ([id].js)
├── ← "My Escrows"    (back to client.js)
├── ← "My Contracts"  (back to freelancer.js)
└── ← "Home"          (back to index.js)
```

Every page is wrapped by `Layout.js` → `Navbar.js` (links to all pages) + footer.

The Navbar links:
- Home (`/`)
- How It Works (`/how-it-works`)
- Client (`/client`)
- Freelancer (`/freelancer`)
- Practice Mode stamp (visual reminder that this is Devnet, not real money)
- Connect Wallet button (Phantom)

---

## 16. What Happens When Something Goes Wrong

### Wallet Not Connected

If a user visits `/client` or `/freelancer` without connecting, they see an empty state with a Connect Wallet button. No blockchain calls are attempted — `getProgram()` throws "Wallet not connected" which pages handle by showing the connect UI.

### Transaction Rejected by User

When Phantom shows the transaction popup and the user clicks "Cancel," `.rpc()` throws. The hook catches it: `return { success: false, error: "User rejected the request" }`. A red toast appears. No state changes.

### Transaction Fails On-Chain

If the program rejects the transaction (wrong status, wrong signer, etc.), Solana returns an error with the program's error code. Examples:
- `InvalidStatus` — trying to approve when status isn't `Submitted`
- `NotFreelancer` — someone other than the registered freelancer trying to submit work
- `NotClient` — someone other than the registered client trying to approve

### File Upload Fails

If Pinata is unreachable or JWT is misconfigured, the server returns `{ error: "Pinata upload failed (502)" }`. The frontend shows a red toast. The on-chain submission is NOT attempted — the freelancer's form stays open so they can try again.

### Escrow Not Found

If someone navigates to `/escrow/some-invalid-address`, `fetchEscrowByPDA` returns `null`. The detail page shows "Loading escrow data…" and never resolves. A production fix would detect `null` and show a 404 state.

### Toast System

Every action ends with `setToast({ type: "success" | "error", text: "..." })`. The `Toast` component displays it bottom-right for 6 seconds. Success toasts include a Solana Explorer link to verify the transaction on-chain.

---

## 17. Current Limitations

**Multiple escrows per client are now supported.** Each client has a `ClientProfile` account tracking an `escrow_count` counter. Each new escrow uses the counter as its PDA seed index (`["escrow", client, escrow_count.to_le_bytes()]`), so every escrow gets a unique deterministic address. The counter increments after each creation. A single wallet can have many simultaneous open escrows.

**No dispute resolution.** If the client refuses to approve forever and won't request revisions, the SOL stays locked indefinitely. There is no timeout, no auto-release, and no arbitration mechanism.

**Devnet only.** The SOL used has no real monetary value. Switching to Solana mainnet requires a security audit of the program.

**Notifications are served by the API but not yet surfaced in the UI.** The REST API (`/api/notifications`) returns all notifications for the authenticated user and supports mark-as-read. But no UI component (notification bell, dropdown) consumes it yet. Wiring up the notification bell to poll the endpoint is a future task.

**File history lost on resubmission.** Each `submit_work` overwrites the previous `work_submission` on-chain. Round 1's delivery is gone when round 2 is submitted. No audit trail of previous submissions.

**Slightly more SOL than expected on close.** When an escrow is approved or cancelled, the account's rent (~0.002 SOL) is included with the amount transfer. The freelancer or client gets slightly more than the agreed amount. This is undocumented in the UI.

**No pagination on escrow lists.** The dashboards fetch ALL of a user's escrows at once. A client with hundreds of escrows (once the one-per-client limit is lifted) would see performance issues.

---

## 18. Developer Scripts — Setup, Airdrop, Tests

Three scripts live in `app/frontend/scripts/`. Run them from the `app/frontend/` directory.

---

### `scripts/verify-setup.js` — Environment Verifier

```sh
node scripts/verify-setup.js
```

Runs 8 checks before you start development. Outputs a table of PASS/FAIL with detail columns:

| # | Check | What it verifies |
|---|---|---|
| 1 | Node.js version ≥ 18 | `process.versions.node` major ≥ 18 |
| 2 | Required npm packages installed | `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/wallet-adapter-react`, `next`, `react` exist in `node_modules/` |
| 3 | Solana Devnet reachable | Opens a `Connection` and fetches the current slot number |
| 4 | `PINATA_JWT` set | Reads `.env.local`; confirms the variable exists and is non-empty (value hidden) |
| 5 | Program account exists on Devnet | `getAccountInfo(PROGRAM_ID)` returns non-null |
| 6 | IDL file exists | `src/idl/freelancepay.json` is present |
| 7 | IDL address matches Program ID | `idl.address === PROGRAM_ID` |
| 8 | `globals.css` exists | `styles/globals.css` is present |

If any check fails the script exits with code 1 and prints the specific reason. All 8 currently pass on a correctly configured machine.

---

### `scripts/airdrop-devnet.js` — Devnet SOL Faucet

```sh
node scripts/airdrop-devnet.js <WALLET_ADDRESS>
```

Requests 2 SOL from the public Devnet faucet to the given wallet. Prints the before balance, sends the airdrop request with exponential-backoff retry (4 attempts: 500ms → 1s → 2s → 4s), then prints the after balance.

**Important:** The public faucet at `api.devnet.solana.com` is rate-limited to 2 SOL per wallet per day. If you hit `429 Too Many Requests`, use [faucet.solana.com](https://faucet.solana.com) in a browser or fund test wallets with `solana transfer` from an already-funded wallet:

```sh
solana transfer <WALLET_ADDRESS> <AMOUNT> --url devnet --allow-unfunded-recipient
```

---

### `scripts/test-program.js` — End-to-End Integration Tests

```sh
node scripts/test-program.js
```

Runs 13 tests against the live Devnet program. Test wallets are auto-generated in `scripts/keypairs/` on first run and reused on subsequent runs. The script funds wallets automatically if their balance drops below 0.3 SOL (client) or 0.1 SOL (freelancer).

#### What it tests

**Happy Path** — full escrow lifecycle:
1. Initialize `ClientProfile` (or detect existing one)
2. `create_escrow` — checks status=Active, correct amount, correct `escrow_index`
3. `submit_work` — checks status=Submitted, `work_submission` written
4. `request_revision` — checks status=RevisionRequested, `revision_note` written
5. `submit_work` (resubmit) — checks status=Submitted, `work_submission` updated
6. `approve_work` — checks escrow account closed, freelancer balance increased ≥ amount
7. Profile counter check — verifies `escrow_count` incremented (N → N+1)

**Cancel Path**:
8. `create_escrow` for a new escrow
9. `cancel_escrow` — checks account closed, client recovered ≥ 0.04 SOL

**Multi-Escrow Coexistence**:
10–13. Creates two escrows at indices N and N+1 from the same client wallet, then fetches both accounts and verifies they exist at distinct PDAs with correct titles.

#### Sample output
```
13/13 tests passed.
  ✓ PASS  create_escrow — account active, amount correct, index stored
  ✓ PASS  submit_work — status=submitted, workSubmission set
  ✓ PASS  request_revision — status=revisionRequested, revisionNote set
  ✓ PASS  submit_work (resubmit) — status=submitted, workSubmission updated
  ✓ PASS  approve_work — escrow account closed
  ✓ PASS  approve_work — freelancer balance +0.1114 SOL (includes rent)
  ✓ PASS  profile counter incremented (4 → 5)
  ✓ PASS  cancel path — create_escrow succeeded
  ✓ PASS  cancel_escrow — account closed
  ✓ PASS  cancel_escrow — client recovered 0.0614 SOL
  ✓ PASS  multi-escrow — 2 escrows coexist at different PDAs
  ✓ PASS    PDA[6]: E3KD3psjU8ewM7RS...
  ✓ PASS    PDA[7]: CpgLZuZ9nBHE2GRP...
```

If any test fails, the script exits with code 1. The full error message is printed inline.

---

## 19. Layer 5 — The Database (PostgreSQL + Prisma)

### Why a Database?

Solana is excellent for financial data — tamper-proof, permanent, decentralized. But many things don't belong on a blockchain:

- **User profiles** — display names, bios, skill tags, avatar URLs. Storing these on-chain would cost real SOL for every character.
- **Notifications** — ephemeral events ("your work was approved") that need to be created server-side and marked as read. These have no financial meaning.
- **Job posts** — client job listings change frequently and are not transactions. Putting them on-chain would be wasteful.
- **Reviews** — ratings and comments that reference a completed escrow but live off-chain for editability and storage efficiency.
- **Cached escrow state** — the `Escrow` table mirrors on-chain data so server-side API routes can query by status, date, and text without hitting the Solana RPC for every request.

### Technology

- **PostgreSQL 15** — the database engine, hosted on **Supabase** (free tier, cloud)
- **Prisma 5** — the ORM (Object-Relational Mapper) that translates JavaScript objects to SQL
- **Supabase connection**: `db.kattosbfzvqrchvpjkim.supabase.co:5432`
- **`docker-compose.yml`** — also provided for local development with PostgreSQL 15 + pgAdmin (port 5050), if Docker Desktop is installed

### The Prisma Schema (`prisma/schema.prisma`)

Five models, three enums, and six database indexes:

#### `User` model

Stores off-chain profile data linked to a wallet address.

| Field | Type | Notes |
|---|---|---|
| `id` | `cuid` | Primary key |
| `walletAddress` | `String @unique` | Solana public key — the join key between on-chain and off-chain data |
| `displayName` | `String?` | Optional, max 50 chars |
| `bio` | `String?` | Optional, max 500 chars |
| `skills` | `String[]` | PostgreSQL native array (e.g. `["react", "solana", "rust"]`) |
| `hourlyRate` | `Decimal?` | In SOL |
| `avatarUrl` | `String?` | IPFS gateway URL |
| `email` | `String?` | For notification emails only — never used for auth |
| `emailNotificationsEnabled` | `Boolean` | Default `true` |
| `isFreelancer` / `isClient` | `Boolean` | Role flags |
| `averageRating` | `Float?` | Cached, recomputed after each new review |
| `totalReviews` | `Int` | Incremented after each review |

#### `Escrow` model

Off-chain mirror of the on-chain `EscrowAccount`. Kept in sync by an indexer (Phase 4).

| Field | Type | Notes |
|---|---|---|
| `pda` | `String @unique` | The on-chain PDA address — join key to Solana |
| `clientWallet` | `String` | FK → `User.walletAddress` |
| `freelancerWallet` | `String` | FK → `User.walletAddress` |
| `amountLamports` | `BigInt` | Stored as lamports (not SOL) to avoid floating-point errors |
| `status` | `EscrowStatus` | Enum: `ACTIVE`, `SUBMITTED`, `COMPLETED`, `CANCELLED`, `REVISION_REQUESTED` |
| `onChainCreatedAt` | `DateTime` | Copied from the on-chain `created_at` field |
| `lastSyncedAt` | `DateTime` | When the indexer last updated this row |

#### `Notification` model

One row per event. Never deleted — notifications are marked as `read = true`.

| Field | Type | Notes |
|---|---|---|
| `recipientWallet` | `String` | FK → `User.walletAddress` |
| `type` | `NotificationType` | Enum: `ESCROW_CREATED`, `WORK_SUBMITTED`, `REVISION_REQUESTED`, `WORK_APPROVED`, `ESCROW_CANCELLED`, `PAYMENT_RELEASED` |
| `escrowPda` | `String?` | Which escrow this notification is about |
| `title` | `String` | Short one-line notification text |
| `message` | `String` | Full notification body |
| `read` | `Boolean` | Default `false` |

#### `Review` model

One review per escrow (`escrowPda @unique`). Written by the client after escrow completes.

| Field | Type | Notes |
|---|---|---|
| `escrowPda` | `String @unique` | One review per escrow enforced by unique constraint |
| `clientWallet` | `String` | Who wrote the review |
| `freelancerWallet` | `String` | Who is being reviewed |
| `rating` | `Int` | 1–5 stars |
| `comment` | `String` | Free text |

#### `JobPost` model

Client-posted job listings. Not tied to an on-chain escrow — they exist before a freelancer is hired.

| Field | Type | Notes |
|---|---|---|
| `clientWallet` | `String` | FK → `User.walletAddress` |
| `budgetSOL` | `Decimal` | In SOL (not lamports — for display, not for transactions) |
| `requiredSkills` | `String[]` | PostgreSQL array |
| `status` | `JobPostStatus` | Enum: `OPEN`, `FILLED`, `CLOSED` |
| `expiresAt` | `DateTime?` | Optional auto-close date |

### Database Indexes

Six indexes for efficient querying:

| Index | Purpose |
|---|---|
| `User.walletAddress` | Already unique — implicit B-tree index |
| `Escrow.clientWallet` | Fetch all escrows by client |
| `Escrow.freelancerWallet` | Fetch all escrows by freelancer |
| `Escrow.status` | Filter by lifecycle stage |
| `Notification(recipientWallet, createdAt)` | Paginated notification feed per user |
| `JobPost(status, createdAt)` | Filter open jobs sorted by newest |

### The Prisma Singleton (`lib/prisma.js`)

```js
const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

module.exports = prisma;
```

Next.js hot-reloads modules in development, which would create a new `PrismaClient` on every file save — each one holding an open database connection. The singleton pattern stores the client on `globalThis` (which survives hot-reloads) so at most one connection pool exists per process. In production, `globalThis.prisma` is never set — each serverless function invocation gets a fresh client as expected.

Usage in any API route or server-side function:
```js
const prisma = require("../../lib/prisma");
const users = await prisma.user.findMany();
```

### The Seed Script (`prisma/seed.js`)

Run with `node prisma/seed.js` from `app/frontend/`. Uses `upsert` throughout so it's safe to run multiple times — it won't create duplicate records.

**Test data created:**

| Record | Details |
|---|---|
| User: Alice | `walletAddress: HbkHJYb4...K1Tf`, `isClient: true`, skills: project management, web design |
| User: Bob | `walletAddress: Abc1XYZ9...KLM`, `isFreelancer: true`, skills: react, solana, rust, `hourlyRate: 0.5` |
| Escrow | Status: `ACTIVE`, `amountLamports: BigInt("500000000")` (0.5 SOL), title: "Build Solana dApp UI" |
| Notification | Type: `ESCROW_CREATED` → Bob, message: Alice assigned Bob to the escrow |
| JobPost | From Alice, title: "Looking for Solana Developer", budget: 2.5 SOL, status: `OPEN` |
| Review | 5 stars from Alice on a hypothetical completed escrow, comment praising Bob |

`BigInt("500000000")` is used instead of `500000000n` because Node.js BigInt literals (`n` suffix) cause parse errors when the file is loaded by some CJS toolchains.

### File Structure Additions (Phase 3)

```
app/frontend/
├── prisma/
│   ├── schema.prisma     ← 5 models, 3 enums, 6 indexes
│   ├── seed.js           ← test data (node prisma/seed.js)
│   └── migrations/
│       └── 20260623123751_init/
│           └── migration.sql  ← auto-generated DDL from first migrate run
├── lib/
│   └── prisma.js         ← Prisma singleton client
├── .env                  ← DATABASE_URL for Prisma CLI (gitignored)
└── .env.local            ← DATABASE_URL for runtime (gitignored)

(project root)
└── docker-compose.yml    ← PostgreSQL 15 + pgAdmin (optional local dev)
```

### How Migrations Work

```sh
cd app/frontend
npx prisma migrate dev --name init
```

Prisma reads `schema.prisma`, compares it to the current database state, generates SQL (`migration.sql`), and applies it. The migration file is committed to git — it's a permanent record of every schema change. To apply on a new database, run `npx prisma migrate deploy`.

### Verification

After Phase 3 setup, the database contains:

```
Users        : 2
Escrows      : 1
Notifications: 1
JobPosts     : 1
Reviews      : 1
```

Browse live via Prisma Studio: `npx prisma studio` → `http://localhost:5555`

---

## 20. Authentication — Wallet Sign-In (JWT)

### Why Wallet Auth Instead of Passwords

Traditional apps authenticate with username + password. FreelancePay users already own a Solana wallet — a cryptographic key pair. Rather than asking them to create a separate password, the app proves their identity by asking them to **sign a message** with their private key. If the signature is valid, the server knows the request came from someone who controls that wallet — no password needed.

This is called **Sign-In with Solana** (SIWS), analogous to "Sign-In with Ethereum." It works because:
- Every Solana wallet is an ed25519 key pair
- Signing a message produces a 64-byte signature that can only come from the private key
- The server verifies the signature using only the public key (the wallet address) — the private key never leaves Phantom

### The Full Auth Flow (6 Steps)

```
Browser (Phantom)                   Next.js Server                  PostgreSQL (Supabase)
       │                                   │                                │
  1.  GET /api/auth/challenge?wallet=...   │                                │
       │ ─────────────────────────────►    │                                │
       │                         generate nonce + message                   │
       │ ◄─────────────────────────────   │                                │
       │  { message, nonce }               │                                │
       │                                   │                                │
  2.  wallet.signMessage(encode(message))  │                                │
       │ [Phantom pops up "Sign message?"] │                                │
       │ [User clicks Approve]             │                                │
       │                                   │                                │
  3.  POST /api/auth/verify                │                                │
       │  { wallet, signatureBase58, nonce}│                                │
       │ ─────────────────────────────►    │                                │
       │                         verify ed25519 sig                         │
       │                         consumeNonce (single-use)                  │
       │                                          upsert User ─────────►   │
       │                                          ◄──── { id, walletAddress}│
       │                         generateJWT({ wallet, userId })            │
       │                         Set-Cookie: fp_auth=<token>; HttpOnly      │
       │ ◄─────────────────────────────   │                                │
       │  { user }                         │                                │
       │                                   │                                │
  4.  GET /api/auth/me  (subsequent reqs)  │                                │
       │  Cookie: fp_auth=<token>          │                                │
       │ ─────────────────────────────►    │                                │
       │                         verifyJWT(cookie)                          │
       │                         prisma.user.findUnique(wallet)             │
       │ ◄─────────────────────────────   │                                │
       │  { user }                         │                                │
```

### Why a Nonce?

Without a nonce, an attacker who observes the signed message (e.g., from network logs) could replay it to authenticate later. The nonce is:
- A UUID generated fresh for each sign-in attempt
- Stored server-side with a **5-minute TTL** in `lib/cache.js`
- **Consumed on first use** — the cache entry is deleted the moment it's verified

If the nonce doesn't match, has expired, or has already been used, the server returns `401 Invalid or expired nonce`. This makes replay attacks impossible.

### The Challenge Message Format

```
Welcome to FreelancePay

Sign this message to verify your wallet ownership.

Wallet: HbkHJYb4frYzUjEipaa3wKXyqGvuakPUnSJ2erg6K1Tf
Nonce: 0f36952f-a330-4004-8e8f-2fbb322e1b2d
Timestamp: 1782218987
```

The message is stored in the nonce cache alongside the nonce so that `verify.js` can retrieve and verify against the exact bytes that were signed — the timestamp would be impossible to reconstruct otherwise.

### The Files

#### `lib/auth.js` — JWT Helpers

```js
const { SignJWT, jwtVerify } = require("jose");

async function generateJWT(payload)       // signs { wallet, userId } with HS256, 7-day expiry
async function verifyJWT(token)           // returns payload or throws
async function getUserFromRequest(req)    // reads req.cookies.fp_auth, returns payload or null
function setCookie(res, token)            // Set-Cookie: fp_auth=token; HttpOnly; SameSite=Lax; ...
function clearCookie(res)                 // Set-Cookie: fp_auth=; Max-Age=0 (clears it)
```

`jose` is used instead of `jsonwebtoken` because it's actively maintained and supports modern algorithms. It works with `require()` in Next.js API routes.

**Cookie options:**
```js
{ httpOnly: true, secure: false (dev) / true (prod), sameSite: "lax", path: "/", maxAge: 604800 }
```

`httpOnly: true` means JavaScript in the browser **cannot read the cookie** — `document.cookie` will never show it. Only the browser itself sends it with each request to the server. This prevents XSS attacks from stealing the session token.

#### `lib/cache.js` — In-Memory Nonce Store

Uses `node-cache` (a simple in-process TTL cache). Two caches:

1. **`nonceCache`** — stores `{ nonce, message }` per wallet. TTL: 300 seconds (5 minutes).
2. **`rateLimitCache`** — stores request count per wallet. TTL: 60 seconds. Max 10 requests per wallet per minute.

`consumeNonce(wallet, nonce)` returns the stored `message` string on success (so `verify.js` can use it), or `null` on failure. The entry is deleted on first successful use.

**Important limitation:** `node-cache` is in-process memory. In a serverless/multi-instance deployment (Vercel), each function invocation has its own memory — the nonce stored in one invocation won't be visible to another. For production at scale, replace with Redis (Upstash) using the same `storeNonce`/`consumeNonce` interface.

#### `pages/api/auth/challenge.js` — Issue Challenge

```
GET /api/auth/challenge?wallet=<base58_public_key>
→ 200 { message: "Welcome to FreelancePay...", nonce: "uuid" }
→ 400 { error: "Invalid wallet address" }       (bad format)
→ 429 { error: "Too many requests..." }          (rate limited)
```

#### `pages/api/auth/verify.js` — Verify Signature + Issue JWT

```
POST /api/auth/verify
Body: { wallet, signatureBase58, nonce }
→ 200 { user: { id, walletAddress, displayName, isFreelancer, isClient, avatarUrl } }
    + Set-Cookie: fp_auth=<jwt>; HttpOnly; ...
→ 400 { error: "Malformed signature or wallet" }
→ 401 { error: "Invalid signature" }
→ 401 { error: "Invalid or expired nonce" }
→ 500 { error: "Database error" }
```

Signature verification uses `tweetnacl`:
```js
nacl.sign.detached.verify(
  new TextEncoder().encode(message),   // the exact bytes Phantom signed
  bs58decode(signatureBase58),         // 64-byte signature
  bs58decode(wallet)                   // 32-byte ed25519 public key
)
```

`bs58` v6 is ESM with a CJS shim — accessed as `require('bs58').default` to get `{ encode, decode }`.

After successful verification, `prisma.user.upsert` creates the user if this is their first sign-in, or does nothing if they already exist. This means connecting a wallet is all that's needed to create a FreelancePay account.

#### `pages/api/auth/me.js` — Session Restore

```
GET /api/auth/me
Cookie: fp_auth=<jwt>
→ 200 { user: { id, walletAddress, displayName, bio, skills, ... } }
→ 401 { error: "Not authenticated" }
```

Called on every page load by `useAuth` to restore the session from the cookie. Returns the full user profile (fresh from DB, not from the JWT payload — so profile changes are reflected immediately).

#### `pages/api/auth/logout.js` — Clear Session

```
POST /api/auth/logout
→ 200 { success: true }
+ Set-Cookie: fp_auth=; Max-Age=0  (browser deletes the cookie)
```

#### `hooks/useAuth.js` — React Auth State

```js
const { user, loading, error, signIn, signOut, isAuthenticated } = useAuth();
```

**On mount:** fetches `GET /api/auth/me` to restore session from the existing cookie. Sets `loading = false` after response.

**`signIn(walletAddress, signMessageFn)`:** orchestrates the full 4-step flow — challenge → Phantom sign → base58-encode → verify. Updates `user` state on success.

**`signOut()`:** POSTs to `/api/auth/logout`, clears `user` state.

**Auto sign-in/out (useEffect):** watches `wallet.publicKey` from `useWallet()`:
```js
useEffect(() => {
  if (connected && publicKey && !user && !loading && signMessage) {
    signIn(publicKey.toBase58(), signMessage);   // wallet just connected
  }
  if (!connected && user) {
    signOut();                                    // wallet just disconnected
  }
}, [connected, publicKey]);
```

This means the moment a user clicks "Connect Wallet" and approves in Phantom, the sign-in message automatically appears. There is no separate "Sign In" button.

**`bs58.encode` in the browser:** `useAuth.js` runs in the browser, not Node.js. It uses a dynamic `import('bs58')` (ESM) to encode the signature bytes returned by Phantom into base58.

#### `pages/_app.js` — AuthContext

```js
export const AuthContext = createContext(null);
export function useAuthContext() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const auth = useAuth();  // must be inside WalletProvider
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
```

`AuthProvider` lives inside `WalletProvider` because `useAuth` calls `useWallet()` internally. Any page or component can call `useAuthContext()` to access `{ user, loading, isAuthenticated, signIn, signOut }` without prop-drilling.

### What Gets Created in the Database

The first time a wallet signs in, `verify.js` calls:
```js
prisma.user.upsert({
  where:  { walletAddress: wallet },
  create: { walletAddress: wallet },
  update: {},
})
```

This creates a minimal `User` row with only `walletAddress` set. All other fields (`displayName`, `bio`, `skills`, etc.) remain null/default until the user fills in their profile — a future Phase 5 task.

### Security Properties

| Property | How it's achieved |
|---|---|
| Server can't be fooled by a fake wallet | ed25519 signature verification — only the real private key could have produced it |
| Replay attack prevention | Single-use nonce deleted on first use; 5-minute TTL |
| Session can't be stolen by XSS | `httpOnly` cookie — JS cannot read it |
| Session can't be forged | JWT signed with `JWT_SECRET`; `jwtVerify` rejects tampered tokens |
| Session doesn't last forever | JWT expires after 7 days; `maxAge` on cookie matches |
| Private key never leaves user's device | Only the signature is sent, never the key |

### File Structure Additions (Phase 4)

```
app/frontend/
├── pages/api/auth/
│   ├── challenge.js   ← issue nonce + message
│   ├── verify.js      ← check sig, upsert user, set cookie
│   ├── me.js          ← session restore
│   └── logout.js      ← clear cookie
├── hooks/
│   └── useAuth.js     ← auth hook (auto sign-in/out on wallet change)
└── lib/
    ├── auth.js        ← JWT helpers + cookie serializer
    └── cache.js       ← NodeCache nonce store + rate limiter
```

---

## 21. The Indexer — On-Chain Sync to PostgreSQL

### The Problem It Solves

Solana is the source of truth. But querying it from Next.js API routes on every request is slow (RPC round-trips) and expensive (rate-limited on free tiers). The indexer bridges the gap: it reads all escrow accounts from Solana and writes their current state into PostgreSQL, where any API route can query them instantly with SQL.

A second benefit: the indexer is the only component that can detect **state transitions** (e.g., status changed from `ACTIVE` to `SUBMITTED`). When it detects one, it writes a `Notification` row — something the frontend alone could never do reliably, because it only sees the current state at the moment the page loads.

### How It Runs

**Manual (development):**
```sh
cd app/frontend
node scripts/run-indexer.js
```

**Automatic (production — Vercel Cron):**
`vercel.json` schedules `GET /api/cron/sync-escrows` every minute. Vercel calls this endpoint automatically. The endpoint requires `Authorization: Bearer {CRON_SECRET}` — Vercel sets this automatically; anyone else gets 401.

> **Note:** Vercel Crons require the Pro plan. On the free tier, use [cron-job.org](https://cron-job.org) to call the endpoint externally with the `Authorization` header set manually.

### The Files

#### `lib/solana-reader.js` — Read-Only Anchor Client

```js
getReadonlyProvider()  // AnchorProvider with a dummy Keypair — never signs
getProgram()           // Anchor Program instance from IDL
fetchAllEscrows()      // program.account.escrowAccount.all() → normalized array
parseStatus(obj)       // { active: {} } → "ACTIVE", { revisionRequested: {} } → "REVISION_REQUESTED"
```

**The dummy wallet pattern:** `AnchorProvider` requires a wallet object with `publicKey`, `signTransaction`, and `signAllTransactions`. Since the indexer only reads, a freshly-generated `Keypair` satisfies the interface but its sign methods are stubs — they are never invoked.

**`parseStatus()` mapping:**

| Anchor object | DB enum string |
|---|---|
| `{ active: {} }` | `"ACTIVE"` |
| `{ submitted: {} }` | `"SUBMITTED"` |
| `{ completed: {} }` | `"COMPLETED"` |
| `{ cancelled: {} }` | `"CANCELLED"` |
| `{ revisionRequested: {} }` | `"REVISION_REQUESTED"` |

#### `lib/indexer.js` — Sync Loop

`syncEscrows()` runs the following algorithm for every on-chain escrow:

```
for each on-chain escrow:
  1. ensureUser(clientWallet)      ← upsert User if not exists (avoids FK violation)
  2. ensureUser(freelancerWallet)  ← same
  3. findUnique({ pda })           ← check if we've seen this escrow before
  4a. if NEW  → prisma.escrow.create(all fields)
  4b. if EXISTING:
        compare oldStatus vs newStatus
        prisma.escrow.update(status, workSubmission, revisionNote, lastSyncedAt)
        if status changed → createStatusChangeNotification(...)
  5. log and return { synced, created, updated, statusChanges }
```

**Why `ensureUser` before every write:** The `Escrow` table has FK constraints on `clientWallet` and `freelancerWallet` → `User.walletAddress`. If the wallet has never signed in, no `User` row exists yet. `ensureUser` calls `prisma.user.upsert({ create: { walletAddress }, update: {} })` to create a minimal record and satisfy the constraint.

**Critical type conversions:**

| Anchor type | JS value from library | Conversion for Prisma |
|---|---|---|
| `u64` amount | `BN` object | `BigInt(account.amount.toString())` |
| `i64` createdAt | `BN` (Unix seconds) | `new Date(Number(account.createdAt.toString()) * 1000)` |
| `string` workSubmission | `""` when empty | `account.workSubmission?.trim() \|\| null` |

**Notification creation — 5 tracked transitions:**

| Transition | Recipient | Notification type | Message |
|---|---|---|---|
| `ACTIVE → SUBMITTED` | Client | `WORK_SUBMITTED` | "{freelancer} submitted work for "{title}"" |
| `SUBMITTED → REVISION_REQUESTED` | Freelancer | `REVISION_REQUESTED` | "Your client requested changes on "{title}"" |
| `SUBMITTED → COMPLETED` | Freelancer | `PAYMENT_RELEASED` | "You received {X} SOL for "{title}"" |
| `ACTIVE → CANCELLED` | Freelancer | `ESCROW_CANCELLED` | "The contract "{title}" was cancelled by the client" |
| `REVISION_REQUESTED → SUBMITTED` | Client | `WORK_SUBMITTED` | "{freelancer} resubmitted work for "{title}" after revisions" |

`freelancerName` is resolved from the `User` table. If no `displayName` is set, it falls back to a truncated wallet: `"HbkHJY...K1Tf"`.

#### `pages/api/cron/sync-escrows.js` — HTTP Trigger

```
GET /api/cron/sync-escrows
Authorization: Bearer {CRON_SECRET}
→ 200 { success: true, result: { synced, created, updated, statusChanges } }
→ 401 { error: "Unauthorized" }
→ 500 { success: false, error: "..." }
```

#### `scripts/run-indexer.js` — Manual CLI

Loads `.env.local`, calls `syncEscrows()`, prints result, disconnects Prisma, exits. Idempotent — safe to run any number of times.

#### `vercel.json` — Cron Schedule

```json
{
  "framework": "nextjs",
  "crons": [{ "path": "/api/cron/sync-escrows", "schedule": "* * * * *" }]
}
```

`* * * * *` = every minute.

### Known Gap: Closed Accounts

When `approve_work` or `cancel_escrow` runs on-chain, the escrow account is **deleted from Solana** (rent reclaimed). If the indexer runs after the account is gone, it won't see it. Mitigated by running the indexer frequently. A production fix would subscribe to program logs via `onLogs` and capture the final state in the same transaction.

### Verified Output

```
FreelancePay Indexer — manual run

Synced 4 escrows — 4 new, 0 updated, 0 status changes

Result: { synced: 4, created: 4, updated: 0, statusChanges: 0 }
```

---

## 22. The REST API Layer

### Why a REST API?

Before Phase 7, the only way to read escrow data was either to call the Solana RPC directly (slow, rate-limited) or to call Prisma inside a server component. The REST API is a stable HTTP contract that:

- Decouples data access from Solana RPC — all responses come from PostgreSQL (fast, indexed)
- Provides a fallback to Solana for escrows not yet indexed
- Powers pagination, filtering, and aggregation that are impossible on-chain
- Can be consumed by future mobile apps, external integrations, or third-party dashboards

### The Shared Helper (`lib/api-helpers.js`)

Four utilities used by every route:

```js
ok(res, data, status=200)   // JSON response with BigInt serializer (bigint → string automatically)
err(res, message, status)   // { error: "message" } response
requireAuth(req, res)       // reads fp_auth cookie → returns JWT payload or sends 401
parsePagination(query)      // { limit: 1–100 (default 20), cursor: string|undefined }
lamportsToSOL(lamports)     // BigInt|number → "0.5000" string (4 decimal places)
```

**BigInt serialization:** Prisma returns `amountLamports` as a JavaScript `BigInt`. `JSON.stringify` throws on BigInt by default. The `ok` function uses a replacer: `(_, v) => typeof v === 'bigint' ? v.toString() : v`. This converts every BigInt field to a string automatically — no per-route conversion needed.

### The Endpoints

#### `GET /api/escrows`

Paginated escrow list from PostgreSQL. Public — no auth required.

**Query params:**
- `wallet` — filter by client or freelancer wallet address
- `role` — `client` | `freelancer` — narrows `wallet` to one side; omit for both
- `status` — `ACTIVE` | `SUBMITTED` | `COMPLETED` | `CANCELLED` | `REVISION_REQUESTED`
- `limit` — 1–100 (default 20)
- `cursor` — PDA of last item from previous page (cursor-based pagination)

**Response:**
```json
{
  "escrows": [{ "pda": "...", "status": "ACTIVE", "amountSOL": "0.5000", "client": {...}, "freelancer": {...} }],
  "nextCursor": "Abc1...",
  "total": 42
}
```

Each escrow includes both user profiles (`walletAddress`, `displayName`, `avatarUrl`). `amountLamports` is present as a string; `amountSOL` is added for convenience.

**Cursor pagination:** uses `pda` (unique string) as the cursor — stable and collision-free. The query uses `{ cursor: { pda }, skip: 1 }` to skip the cursor item itself.

#### `GET /api/escrows/[pda]`

Single escrow detail. Falls back to Solana RPC if the PDA is not yet indexed.

**DB path (normal):** fetches from Prisma with both user profiles (full fields: `bio`, `skills`, `averageRating`, etc.) + the escrow's `Review` (if it exists). `workSubmission` is parsed from JSON: `{ note, file, name }`.

**Chain fallback:** if `findUnique` returns null, tries `getProgram().account.escrowAccount.fetch(pda)`. If the account doesn't exist on-chain either, returns 404. The chain response includes `source: "chain"` and `client: null, freelancer: null` (profiles not available without DB).

**Response:**
```json
{
  "escrow": { "pda": "...", "workSubmission": { "note": "Done!", "file": "https://...", "name": "design.pdf" }, ... },
  "client": { "walletAddress": "...", "displayName": "Alice", "bio": "...", "skills": ["react"] },
  "freelancer": { ... },
  "review": { "rating": 5, "comment": "Excellent work!" } | null
}
```

#### `GET /api/users/[walletAddress]/escrows`

All escrows for a given wallet, grouped by role. Public — no auth required.

**Response:**
```json
{
  "asClient":     [ ...escrows where clientWallet === walletAddress ],
  "asFreelancer": [ ...escrows where freelancerWallet === walletAddress ],
  "stats": {
    "totalEarnedSOL":      "1.2500",
    "totalSpentSOL":       "3.0000",
    "activeCount":         2,
    "pendingPaymentCount": 1
  }
}
```

**Stats calculation:**
- `totalEarnedSOL` — sum of `amountLamports` for all `COMPLETED` escrows where the wallet is the freelancer
- `totalSpentSOL` — sum for all `COMPLETED` escrows where the wallet is the client
- `pendingPaymentCount` — `SUBMITTED` escrows as freelancer (work done, waiting on client approval)

Sum uses BigInt arithmetic: `list.reduce((sum, e) => sum + e.amountLamports, 0n)` — no floating-point errors.

#### `GET /api/notifications` (protected)

Current user's last 50 notifications, newest first. Requires `fp_auth` cookie.

**Response:**
```json
{
  "notifications": [{ "id": "...", "type": "WORK_SUBMITTED", "title": "Work submitted", "message": "...", "read": false }],
  "unreadCount": 3
}
```

`unreadCount` is computed in-memory from the returned list (always accurate since the list is capped at 50 and unread should be far fewer).

#### `POST /api/notifications/[id]/read` (protected)

Marks a single notification as read. Verifies ownership: `notification.recipientWallet === auth.wallet`. Returns 403 if the notification belongs to a different user.

**Response:** `{ "notification": { ...updated } }`

#### `POST /api/notifications/read-all` (protected)

Marks all unread notifications for the authenticated user as read via `updateMany`.

**Response:** `{ "updated": 4 }` — count of rows updated.

#### `GET /api/stats` (public, cached)

Platform-wide aggregate statistics. Module-level cache with 5-minute TTL to avoid aggregating a large table on every request.

**Response:**
```json
{
  "totalEscrows":     5,
  "totalCompleted":   2,
  "totalVolumeSOL":   "1.2500",
  "totalFreelancers": 1,
  "totalClients":     1,
  "totalJobPosts":    1
}
```

**Caching:** `cachedStats` and `lastCacheTime` are module-level variables. Because Next.js runs API routes in the same Node.js process (in development and serverless contexts), the cached value survives across requests within the same process lifetime. In serverless Vercel, each cold start gets a fresh cache — acceptable since the stats are approximations.

`totalVolumeSOL` uses `prisma.escrow.aggregate({ _sum: { amountLamports: true } })` — a single SQL `SUM()` call. The result is `BigInt | null` (null when no rows match), defaulting to `0n`.

### File Structure Additions (Phase 7)

```
app/frontend/
├── lib/
│   └── api-helpers.js             ← ok/err/requireAuth/parsePagination/lamportsToSOL
└── pages/api/
    ├── escrows/
    │   ├── index.js               ← GET /api/escrows (list + filters + pagination)
    │   └── [pda].js               ← GET /api/escrows/:pda (detail + chain fallback)
    ├── users/
    │   └── [walletAddress]/
    │       └── escrows.js         ← GET /api/users/:wallet/escrows (history + stats)
    ├── notifications/
    │   ├── index.js               ← GET /api/notifications (protected)
    │   ├── read-all.js            ← POST /api/notifications/read-all (protected)
    │   └── [id]/
    │       └── read.js            ← POST /api/notifications/:id/read (protected)
    └── stats/
        └── index.js               ← GET /api/stats (public, 5-min cache)
```

### Verified Output

```
GET /api/escrows                → 200 { escrows: [5 records], nextCursor: null, total: 5 }
GET /api/escrows?status=ACTIVE  → 200 { total: 5 }
GET /api/escrows?role=client&wallet=HbkH... → 200 { total: 1 }
GET /api/escrows?status=BOGUS   → 400 { error: "Invalid status value" }
GET /api/escrows/ActiveEscrowPDA... → 200 { escrow: { pda, status: "ACTIVE", amountSOL: "0.5000" }, ... }
GET /api/escrows/notfoundPDA... → 404 { error: "Escrow not found" }
GET /api/users/HbkH.../escrows  → 200 { asClient: [1 escrow], stats: { activeCount: 1 } }
GET /api/notifications (no cookie) → 401 { error: "Unauthorized" }
GET /api/stats                  → 200 { totalEscrows: 5, totalFreelancers: 1, totalClients: 1 }
```

---

## Summary

FreelancePay is built in five layers with a cryptographic auth system on top:

1. **The Solana program** (Rust/Anchor) is the enforcer — holds the money, enforces the rules, immutable, nobody can override it. Six instructions, five escrow states, all transitions verified by cryptographic signatures. A `ClientProfile` account tracks each client's escrow counter, enabling unlimited simultaneous escrows per wallet.

2. **The Next.js website** is the interface — reads from Solana, lets users interact, routes all blockchain calls through the `useEscrow` hook. The `/api/upload` route safely handles file uploads server-side without exposing the Pinata JWT to the browser.

3. **The design system** (CSS tokens + Gaegu/Nunito typography + `utils/theme.js` motion) gives every pixel a consistent visual language. All colors are CSS variables — never hardcoded. Numbers always use Nunito 800 with tabular-nums. Animations respect `prefers-reduced-motion`.

4. **The thematic visual identity** (rubber stamps, lock/zap cues, vault illustration, hex textures, Practice Mode badge) makes the product feel like a "crypto escrow" product — domain-specific visual signals layered on top of the Cozy Sticker Sheet aesthetic without fighting it.

5. **The PostgreSQL database** (Prisma 5 + Supabase) stores everything that doesn't belong on-chain: user profiles, notification history, job posts, and reviews. The `Escrow` table serves as an off-chain index cache for fast server-side queries.

**Auth:** Users sign in by signing a challenge message with their Phantom wallet (ed25519). The server verifies the signature, upserts a `User` row in PostgreSQL, and issues an httpOnly JWT cookie (`fp_auth`). No password exists — wallet ownership is identity. The `useAuth` hook auto-triggers sign-in the moment a wallet connects and auto-signs-out when it disconnects.

**The Indexer:** A cron job (`/api/cron/sync-escrows`, every minute on Vercel) reads all `EscrowAccount` data from Solana via a read-only Anchor provider and upserts it into the PostgreSQL `Escrow` table. When it detects a status change, it writes a `Notification` row for the affected party. Run manually with `node scripts/run-indexer.js`.

**The REST API:** Seven endpoint groups (`/api/escrows`, `/api/escrows/[pda]`, `/api/users/[wallet]/escrows`, `/api/notifications`, `/api/notifications/[id]/read`, `/api/notifications/read-all`, `/api/stats`) serve PostgreSQL data over HTTP. All endpoints share a helper (`lib/api-helpers.js`) that handles BigInt serialization, auth gating, pagination parsing, and SOL conversion. Stats are module-level cached for 5 minutes. Notification routes are protected by the `fp_auth` JWT cookie.

The key insight is that **trust is replaced by code**. Neither the client nor the freelancer needs to trust each other — they both trust the Rust program, which is public, auditable, and impossible to tamper with. The website and its design are a friendly, approachable layer on top of that trustless foundation.

---

*Program deployed on Solana Devnet at `5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX`. Frontend deployed on Vercel. Built for Colosseum Frontier Hackathon by University of Management & Technology (UMT), Lahore, Pakistan.*

*Phase 1 added: environment verifier (`verify-setup.js`), `.env.local.example` template, and Devnet airdrop CLI. Phase 2 added: multi-escrow support via `ClientProfile` + counter-based PDA seeds, dead source file cleanup, and a 13-test integration suite (`test-program.js`). Program recompiled with platform-tools v1.52 (Rust 1.89.0-dev) and redeployed to the same Program ID. Phase 3 added: PostgreSQL database layer via Prisma 5 + Supabase — five models (User, Escrow, Notification, Review, JobPost), singleton client (`lib/prisma.js`), seed script, and migration applied to production Supabase instance. Phase 4 added: wallet-based authentication — challenge/verify/me/logout API routes, `lib/auth.js` (JWT via jose), `lib/cache.js` (single-use nonce store + rate limiter), `hooks/useAuth.js` (auto sign-in/out on wallet connect), and `AuthContext` wired into `_app.js`. Phase 5 added: on-chain indexer — `lib/solana-reader.js` (read-only Anchor provider, `fetchAllEscrows`, `parseStatus`), `lib/indexer.js` (`syncEscrows` upsert loop + 5-transition notification creator), `/api/cron/sync-escrows` Bearer-auth endpoint, `scripts/run-indexer.js` CLI, and `vercel.json` every-minute cron config. Phase 6 added: REST API layer — `lib/api-helpers.js` (shared BigInt serializer, auth gating, pagination, SOL conversion), seven endpoint groups serving escrow lists, single escrow detail (with Solana fallback), user history with aggregate stats, notification CRUD, and platform statistics with 5-minute module-level cache.*
