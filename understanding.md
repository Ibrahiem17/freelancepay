# FreelancePay — Complete Project Understanding

> This document is written for someone who has never seen this project before. It explains what was built, why every piece exists, how each part works internally, and how all the parts connect to each other. No prior blockchain knowledge is assumed.

---

## Table of Contents

1. [The Problem Being Solved](#1-the-problem-being-solved)
2. [The Solution in One Paragraph](#2-the-solution-in-one-paragraph)
3. [Background: What is Solana?](#3-background-what-is-solana)
4. [Background: What is a Wallet?](#4-background-what-is-a-wallet)
5. [Background: What is a Smart Contract?](#5-background-what-is-a-smart-contract)
6. [The Architecture — A Bird's Eye View](#6-the-architecture--a-birds-eye-view)
7. [Layer 1 — The On-Chain Program (the Brain)](#7-layer-1--the-on-chain-program-the-brain)
8. [Layer 2 — The Frontend (the Face)](#8-layer-2--the-frontend-the-face)
9. [The Bridge — useEscrow Hook](#9-the-bridge--useescrow-hook)
10. [The IPFS File Upload System](#10-the-ipfs-file-upload-system)
11. [The Revision Loop](#11-the-revision-loop)
12. [Complete Walkthroughs — Step by Step](#12-complete-walkthroughs--step-by-step)
13. [The Security Model — Who Can Do What](#13-the-security-model--who-can-do-what)
14. [The Data — What Gets Stored and Where](#14-the-data--what-gets-stored-and-where)
15. [How the Pages Connect to Each Other](#15-how-the-pages-connect-to-each-other)
16. [What Happens When Something Goes Wrong](#16-what-happens-when-something-goes-wrong)
17. [Current Limitations](#17-current-limitations)

---

## 1. The Problem Being Solved

Pakistan has over 4 million freelancers. When a client hires a freelancer online, two trust problems exist:

- **The client's problem:** "I'll pay after I see the work" — but what if I pay and the work is terrible, or the freelancer disappears?
- **The freelancer's problem:** "I'll do the work after you pay" — but what if I deliver and the client refuses to pay?

Traditional platforms like Upwork or Fiverr solve this by acting as a middleman — they hold the money and arbitrate disputes. But they charge 20%+ fees, payments take days to arrive, and international transfers involve banks and exchange rates.

FreelancePay's goal: **eliminate the middleman entirely** by replacing it with a computer program that nobody controls — a program that automatically holds the money, releases it when conditions are met, and enforces the rules without anyone being able to cheat.

---

## 2. The Solution in One Paragraph

A client creates a "contract" on the Solana blockchain. They lock their SOL (Solana's currency) inside that contract. The freelancer can see the locked money and knows it's real. They do the work, attach proof (a description, links, or a file), and mark it as submitted. The client reviews the work. If happy, they click Approve — the contract automatically sends the money to the freelancer instantly, with no bank, no delay, and no fee. If the client wants changes, they request a revision — the freelancer gets the feedback, resubmits, and the cycle continues until both parties are satisfied.

---

## 3. Background: What is Solana?

Think of Solana as a giant public spreadsheet that thousands of computers around the world maintain simultaneously. Nobody owns it. Nobody controls it. Everyone can read it. To write to it, you need a wallet.

This spreadsheet can do more than store numbers — it can run programs. These programs (called "smart contracts") live permanently on Solana and execute exactly as written. Nobody can modify them once deployed. Nobody can stop them from running. Nobody can change the rules mid-game.

Solana processes transactions in under 2 seconds and charges fractions of a cent per transaction. For comparison, Ethereum (another blockchain) charges several dollars per transaction and takes 15+ seconds.

**Solana currency** is called **SOL**. It's divisible — 1 SOL = 1,000,000,000 lamports (like dollars and cents, but with more decimal places). FreelancePay runs on **Devnet**, which is Solana's test environment. Devnet SOL has no real monetary value — it's free to get and used only for testing.

---

## 4. Background: What is a Wallet?

A wallet is a pair of cryptographic keys:

- **Public key** — your address. Think of it like your bank account number. You share it freely. On Solana, this is a 44-character string like `HbkHJYb4frYzUjEipaa3wKXyqGvuakPUnSJ2erg6K1Tf`. This is what other people send money to, and what the escrow uses to identify "who is the client" and "who is the freelancer."

- **Private key** — your password. You never share this. It's used to "sign" (authorize) transactions. When you click "Approve & Pay" in the app, your wallet signs the transaction. Nobody else can sign on your behalf.

**Phantom** is the wallet browser extension FreelancePay uses. It manages your keys securely, shows you what a transaction will do, and asks for your approval before signing anything.

---

## 5. Background: What is a Smart Contract?

A smart contract is a program that lives on a blockchain. Once deployed, it runs exactly as coded — nobody can change it or stop it. It has no CEO, no customer service, no override button.

FreelancePay's smart contract (called the "program" in Solana terminology) does exactly five things:

1. **Create an escrow** — lock SOL in a vault
2. **Submit work** — freelancer marks work as done with a description
3. **Approve work** — client releases the SOL to the freelancer
4. **Cancel escrow** — client gets their SOL back (only before work is submitted)
5. **Request revision** — client asks for changes (only after work is submitted)

Each action is called an "instruction." The program enforces its own rules — you can't approve before work is submitted, you can't cancel after work is submitted, only the right person can take each action.

---

## 6. The Architecture — A Bird's Eye View

FreelancePay has three layers:

```
┌─────────────────────────────────────────────────────┐
│                    USER'S BROWSER                   │
│                                                     │
│   Website (Next.js)                                 │
│   - Shows forms, buttons, escrow cards              │
│   - Talks to the user's Phantom wallet              │
│   - Calls the blockchain through useEscrow hook     │
│                                                     │
│   /api/upload (server-side only)                    │
│   - Handles file uploads to IPFS via Pinata         │
│   - Keeps the Pinata secret key hidden              │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │  (sends signed transactions)
                       ▼
┌─────────────────────────────────────────────────────┐
│               SOLANA DEVNET (blockchain)             │
│                                                     │
│   Program ID: 5Xw3NMeBry...T8NTX                   │
│   - Rust code compiled to a .so binary              │
│   - Deployed once, runs forever                     │
│   - Stores all escrow data on-chain                 │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│               PINATA / IPFS (cloud storage)         │
│                                                     │
│   - Stores uploaded files permanently               │
│   - Returns a content address (CID)                 │
│   - Files accessible via gateway URL                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Layer 1 (Solana)** — the source of truth. All escrow data, all money, all status live here. Nothing here can be faked or manipulated.

**Layer 2 (Website)** — the interface. The website reads data from Solana and displays it. It lets users take actions that send transactions to Solana. The website itself stores nothing — if you deleted it tomorrow, the escrow data on Solana would still be there.

**Layer 3 (Pinata/IPFS)** — optional file storage. When a freelancer attaches a deliverable file, it's stored on IPFS (a decentralized file network). The file's permanent address is then stored in the escrow's data on Solana.

---

## 7. Layer 1 — The On-Chain Program (the Brain)

### What it is

The program is written in **Rust** using a framework called **Anchor**. Anchor makes it easier to write Solana programs by handling a lot of boilerplate: it checks that accounts are valid, generates the IDL (a description of the program's interface), and handles serialization (converting data to bytes and back).

The compiled output is a `.so` file — a binary that Solana's runtime can execute. It's deployed once at address `5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX`. That address never changes.

### What an "Escrow Account" is

When a client creates an escrow, the program creates a new **account** on Solana to store the escrow's data. Think of it as a row in a database table, except it lives permanently on the blockchain and nobody can edit it directly — only the program can write to it, and only when you send a valid instruction.

Every escrow account stores this information:

| What | Example | Why it's there |
|---|---|---|
| `client` | `HbkH...K1Tf` | Who created and funded the escrow |
| `freelancer` | `Abc1...XYZ9` | Who will receive payment |
| `amount` | `500000000` (= 0.5 SOL in lamports) | How much is locked |
| `title` | `"Build my website"` | Project name |
| `description` | `"Responsive landing page..."` | Project details |
| `work_submission` | `{"note":"Done! Link: ...","file":"https://ipfs...","name":"design.pdf"}` | Freelancer's delivery |
| `status` | `Active` | Current stage in the lifecycle |
| `created_at` | `1748822400` | Unix timestamp of creation |
| `bump` | `254` | Technical number needed to find this account |
| `revision_note` | `"Please change the font to Inter"` | Client's latest feedback |

The `bump` deserves a quick explanation. Escrow accounts don't have a random address — they have a **deterministic address** (called a PDA, Program Derived Address) that is mathematically derived from two things: the word "escrow" and the client's wallet address. This means anyone who knows the client's wallet address can compute where their escrow account lives, without asking anyone. The `bump` is a small number (0–255) that makes the math work out to a valid address.

### The Five Instructions

Think of instructions as the program's five allowed operations. You can only do these five things. Anything else is impossible.

#### Instruction 1: `create_escrow`

**Who calls it:** The client.

**What it does:**
1. Checks that the amount is greater than zero.
2. Creates a new escrow account at the deterministic address.
3. Writes all the escrow data (title, description, freelancer address, etc.) into the account.
4. Transfers the specified amount of SOL from the client's wallet into the escrow account.

After this instruction runs, the SOL is literally inside the escrow account. The client no longer has it. The freelancer doesn't have it yet either. It's in limbo — locked — and only the program can decide where it goes next.

#### Instruction 2: `submit_work`

**Who calls it:** The freelancer.

**What it does:**
1. Checks that the escrow status is either `Active` (first submission) or `RevisionRequested` (resubmission after revision).
2. Writes the work description (a JSON string with the delivery note, optional file URL, and filename) into the `work_submission` field.
3. Changes the status to `Submitted`.

No money moves here. This is purely a state update — the freelancer is saying "I've done the work, here's the proof."

#### Instruction 3: `approve_work`

**Who calls it:** The client.

**What it does:**
1. Checks that the status is `Submitted` (work must have been submitted first).
2. Changes the status to `Completed`.
3. **Closes the escrow account** — this means ALL the lamports inside the account (the locked amount plus the small rent deposit) are automatically transferred to the freelancer's wallet.

The account closing is the clever part. Solana accounts pay a small "rent" to exist. When an account is closed, that rent is returned to whoever receives the balance. So the freelancer gets slightly more than the agreed amount — they get `amount + ~0.002 SOL` in rent. The escrow account then ceases to exist on Solana.

#### Instruction 4: `cancel_escrow`

**Who calls it:** The client.

**What it does:**
1. Checks that the status is `Active` (cancellation is only possible before the freelancer submits any work).
2. Changes the status to `Cancelled`.
3. Closes the escrow account and returns ALL lamports (amount + rent) back to the client.

The `Active`-only restriction is critical for the freelancer's protection. Once the freelancer submits work (at any point, even in round 2 of revisions), the client can never cancel and get a refund. They must either approve or keep requesting revisions.

#### Instruction 5: `request_revision`

**Who calls it:** The client.

**What it does:**
1. Checks that the status is `Submitted` (can only request revision after freelancer has submitted).
2. Writes the client's feedback message into the `revision_note` field.
3. Changes the status to `RevisionRequested`.

The freelancer can now see the feedback and call `submit_work` again. This loop can repeat any number of times. The SOL stays locked throughout.

### The Status Machine

The escrow status always follows a defined path. It can never skip steps or go backwards (except the revision loop):

```
            create_escrow
[Nothing] ──────────────► Active
                              │
                  ┌───────────┤
                  │           │ cancel_escrow
                  │ submit_work          │
                  │           ▼
                  │        Cancelled  (account closed, SOL back to client)
                  │
                  │ submit_work (also allowed from RevisionRequested)
                  ▼
              Submitted
                  │
        ┌─────────┴──────────┐
        │ approve_work       │ request_revision
        ▼                    ▼
    Completed          RevisionRequested
(account closed,             │
SOL to freelancer)     submit_work
                             │
                             └──► Submitted (loop back)
```

### How the Program Enforces Security

Every instruction checks two things before doing anything:

**1. Is this person who they say they are?**

When you call `submit_work`, you must sign the transaction with your wallet's private key. Solana verifies the signature. If the signature doesn't match the wallet address, the transaction is rejected before the program even runs.

**2. Is this person allowed to do this?**

The program then checks: does `escrow.freelancer == the person who signed this transaction`? If not, it returns an error `NotFreelancer`. Similar checks exist for the client. This means even if someone knows the escrow's address, they cannot submit work on behalf of the freelancer or approve on behalf of the client.

**3. Is the current status right?**

Every instruction checks `escrow.status` before proceeding. If you try to approve work when status is `Active` (no work submitted yet), it fails with `InvalidStatus`. These checks make certain sequences literally impossible.

---

## 8. Layer 2 — The Frontend (the Face)

### What it is

The frontend is a website built with **Next.js** (a React framework). It lives at the `app/frontend/` folder. When a user visits the site, they see pages built from JavaScript components. The website itself stores no data — it reads everything from Solana and displays it.

### The Files and What They Do

#### `pages/_app.js` — The Root Setup

Every web request goes through this file first. It sets up three "providers" that wrap the entire app:

- **`ConnectionProvider`** — establishes a connection to Solana's devnet RPC endpoint (`https://api.devnet.solana.com`). Think of it as opening a socket to the blockchain.
- **`WalletProvider`** — manages wallet connection state. It knows which wallet is connected, what its public key is, and how to ask it to sign transactions.
- **`WalletModalProvider`** — provides the "Select Wallet" popup when you click the Connect button.

All three wrap every page, so any component anywhere in the app can access the Solana connection and wallet state.

#### `pages/index.js` — The Landing Page

Pure display. Shows the hero section, the stats strip, and the three-step how-it-works overview. If the wallet is connected, it shows "I'm a Client" and "I'm a Freelancer" buttons. If not, it shows a Connect Wallet button. No blockchain calls happen here.

#### `pages/client.js` — The Client Dashboard

This is where a client manages their work. It does two things:

**Create a new escrow:** A form with four fields (project title, description, freelancer's wallet address, amount in SOL). Clicking "Create & Lock SOL" calls the `createEscrow` function, which sends a transaction to Solana.

**Manage existing escrows:** A list of all escrows where the connected wallet is the client. For each escrow:
- If status is `Active`: shows a "Cancel" button
- If status is `Submitted`: shows "Approve & Pay" and "Request Revision" buttons
- If status is `RevisionRequested`: shows an orange "Changes Requested" box with the revision message
- If status is `Completed` or `Cancelled`: shows read-only information

When the client submits a revision form, the page calls `requestRevision`. When they click Approve, it calls `approveWork`. When they click Cancel, it calls `cancelEscrow`.

#### `pages/freelancer.js` — The Freelancer Dashboard

Where a freelancer sees all contracts assigned to their wallet address. For each escrow:
- If status is `Active`: shows a "Submit Work" button
- If status is `RevisionRequested`: shows an orange box with the client's feedback and a "Resubmit Work" button
- If status is `Submitted`: shows the submitted work (read-only while awaiting approval)
- If status is `Completed`: shows a "Payment released" confirmation

When the freelancer opens the submit form, they can write a description and optionally attach a file. The file upload happens in two steps: first to IPFS (via the server-side proxy), then the resulting URL is included in the on-chain submission.

#### `pages/escrow/[id].js` — The Escrow Detail Page

A dedicated page for a single escrow. The URL is `/escrow/<PDA_ADDRESS>` — the PDA address of the escrow account is the "ID."

This page serves both the client and the freelancer. It detects which role the connected wallet is by comparing `wallet.publicKey` to `escrow.client` and `escrow.freelancer`. Based on the role and current status, it shows the appropriate action buttons:

- Both parties see: escrow details (PDA address, client, freelancer, created date), the work submission, the revision note (if any), and a progress timeline.
- Client sees: the approve + revision buttons (when submitted), cancel button (when active).
- Freelancer sees: the submit/resubmit form (when active or revision requested).
- Neither party (observer): sees everything but no action buttons.

#### `pages/how-it-works.js` — The Explainer Page

Static educational content. Five steps with dual explanations (simple and technical). An FAQ section. No blockchain calls. Fully renders on the server.

#### `components/Layout.js` — The Page Shell

Every page uses this. It adds the browser tab title, favicon, the navigation bar at the top, and the footer at the bottom. Pages pass a `title` prop and their content — Layout wraps it all.

#### `components/Navbar.js` — The Navigation Bar

Sticky bar at the top. Has the UMT university banner above it, the FreelancePay logo on the left, navigation links (Home, How It Works, Client, Freelancer), a DEVNET badge to remind users this is test mode, and the Phantom Connect button on the right.

The active page link is highlighted by checking `router.pathname` against each link's href.

#### `components/Toast.js` — The Notification Popup

Small notification that appears at the bottom-right of the screen. Used to tell users the result of their actions: "Work submitted on-chain! ✓" or "Transaction failed: Wallet not connected." Toast messages auto-dismiss after 6 seconds. Successful transactions show a link to Solana's block explorer so users can verify the transaction happened.

---

## 9. The Bridge — useEscrow Hook

### What Problem It Solves

The frontend needs to talk to the Solana blockchain. But a React component doesn't directly know how to build a Solana transaction. The `useEscrow` hook is a single file (`src/hooks/useEscrow.js`) that handles all blockchain communication. Pages import it and call simple functions — they don't need to know anything about Anchor, PDAs, or transaction encoding.

### How It Works

When a page calls `createEscrow("Build my website", "...", "Abc1...XYZ9", 0.5)`, here is what happens inside the hook:

1. **Gets the current connection and wallet** from the React context set up in `_app.js`.
2. **Creates an Anchor `Program` object** — this reads the IDL file (a JSON description of what the Solana program can do) and builds a typed interface around it. Think of it as an auto-generated API client for the Solana program.
3. **Derives the escrow PDA** — computes the deterministic address where this client's escrow will live.
4. **Converts 0.5 SOL to lamports** — `Math.round(0.5 × 1,000,000,000) = 500,000,000 lamports`. This uses a special big-number library because JavaScript's regular numbers can't represent 64-bit integers accurately.
5. **Calls `program.methods.createEscrow(...)`.accounts({...}).rpc()`** — Anchor encodes the instruction, the Phantom wallet signs it, and it's sent to Solana's network.
6. **Returns `{ success: true, signature: "..." }`** if it worked, or `{ success: false, error: "..." }` if it didn't.

Pages always check `r.success` before deciding what to show the user.

### The IDL File

The IDL (`src/idl/freelancepay.json`) is a JSON file that describes the Solana program's interface: what instructions exist, what arguments they take, what accounts they need, and what errors they can return. The Anchor JS client reads this file to know how to build and send transactions. It's the "contract" between the frontend and the blockchain — if they disagree about anything in here, the transaction will fail.

### How Fetching Works

To show a list of escrows, the hook calls `program.account.escrowAccount.all([filter])`. This asks Solana's RPC node: "give me all accounts owned by our program that have the client's wallet address at byte position 8."

Why byte 8? Every Anchor account starts with an 8-byte "discriminator" (a fingerprint that identifies the account type). After that, the first field in `EscrowAccount` is `client` (32 bytes). So to filter by client, you look at bytes 8 through 39. For filtering by freelancer, you look at bytes 40 through 71 (8 discriminator + 32 client = starts at 40).

This is a server-side filter — only matching accounts are returned over the network. You don't download all escrows and filter in the browser.

---

## 10. The IPFS File Upload System

### What is IPFS?

IPFS (InterPlanetary File System) is a decentralized file storage network. When you upload a file to IPFS, it gets a permanent address based on the file's content — called a CID (Content Identifier). If the same file is uploaded twice, it gets the same CID. The file can be accessed from any IPFS gateway using a URL like `https://gateway.pinata.cloud/ipfs/<CID>`.

Unlike a regular web server, IPFS files don't disappear when a server goes down — multiple nodes can serve the same file.

### What is Pinata?

Pinata is a service that "pins" your IPFS files — meaning they promise to keep them stored and accessible via their gateway. You talk to Pinata via an API using a secret JWT (JSON Web Token) for authentication.

### The Security Problem

The Pinata JWT is a secret — if someone gets it, they can upload files to your Pinata account at your expense. You cannot put it in the browser-side JavaScript because anyone can open DevTools and read it.

### The Solution — The Server-Side Proxy

FreelancePay solves this with a thin server-side route at `pages/api/upload.js`. Here's the flow:

```
Browser                    Next.js Server              Pinata (cloud)
   │                            │                           │
   │  POST /api/upload          │                           │
   │  + file as multipart body  │                           │
   │ ─────────────────────────► │                           │
   │                            │  POST pinFileToIPFS       │
   │                            │  + PINATA_JWT (secret)    │
   │                            │ ────────────────────────► │
   │                            │                           │
   │                            │  { IpfsHash: "Qm..." }    │
   │                            │ ◄──────────────────────── │
   │                            │                           │
   │  { cid, url, name }        │                           │
   │ ◄───────────────────────── │                           │
   │                            │                           │
```

The browser sends the file to our own server. Our server reads `PINATA_JWT` from an environment variable (only accessible on the server, never sent to the browser), forwards the raw file to Pinata, and returns the resulting URL to the browser.

The `PINATA_JWT` lives in a file called `.env.local` which is explicitly listed in `.gitignore` — so it can never accidentally be committed to the code repository.

### How the File URL Gets On-Chain

Once the browser gets back the IPFS URL, it builds a JSON string:

```json
{"note":"Delivered! Here's the GitHub link: ...", "file":"https://gateway.pinata.cloud/ipfs/Qm...", "name":"design.pdf"}
```

This JSON string (trimmed to fit within 500 characters if needed) is stored in the `work_submission` field of the escrow account on Solana. The file itself is on IPFS; only the URL pointing to it is on-chain.

When the client views the submission, the app parses this JSON and shows a "↓ Download Deliverable" button that links to the IPFS URL.

**Old submissions** (before the IPFS feature was added) just stored plain text in `work_submission`. The `parseSubmission` function handles both formats gracefully — if the JSON parse fails, it treats the whole string as a plain text note.

---

## 11. The Revision Loop

### Why It Exists

Before the revision feature, clients had only two choices: approve (release money) or... nothing. If the work needed changes, there was no mechanism to request them officially. The freelancer had no on-chain indication that changes were needed.

The revision loop adds a structured back-and-forth:

1. Freelancer submits → `Submitted`
2. Client requests changes with a message → `RevisionRequested`
3. Freelancer reads the message, revises, and resubmits → back to `Submitted`
4. Repeat as many times as needed
5. Client approves when satisfied → `Completed`

### Why Cancel Is Blocked After First Submission

The `cancel_escrow` instruction only works when status is `Active`. Once the freelancer has submitted work even once, the status has changed to `Submitted` — and can never go back to `Active`. Even during the revision loop (status alternates between `Submitted` and `RevisionRequested`), the status is never `Active`. So the client can never cancel and get a refund after work has been delivered.

This protects the freelancer from a dishonest client who might:
1. Request the freelancer do work
2. Ask for multiple revisions to delay
3. Eventually cancel and take the money back

Once work is submitted, that attack vector is closed.

### The Orange UI

When an escrow is in `RevisionRequested` state:
- On the **freelancer dashboard**: an orange "Changes Requested" box appears showing the client's feedback. The submit button changes to "Resubmit Work."
- On the **client dashboard**: an orange "Revision Requested" box shows what they asked for.
- On the **detail page**: an orange card is visible to both parties.

The orange color (`#f97316`) was chosen to be visually distinct from the existing palette — green means success, blue means active, amber means pending, orange means "attention needed."

---

## 12. Complete Walkthroughs — Step by Step

### Happy Path: Client Creates → Freelancer Submits → Client Approves

**Step 1 — Client connects wallet**

Client visits `freelancepay.com`, clicks "Connect Wallet," selects Phantom. Phantom asks for permission. Client approves. The navbar now shows their wallet address (truncated) and "I'm a Client" / "I'm a Freelancer" buttons appear on the homepage.

**Step 2 — Client creates an escrow**

Client goes to the Client Dashboard (`/client`). Fills in:
- Title: "Build my website"
- Description: "Responsive landing page with contact form"
- Freelancer wallet: `Abc1...XYZ9`
- Amount: 0.5 SOL

Clicks "Create & Lock SOL." 

Behind the scenes:
1. The frontend converts 0.5 SOL to `500,000,000` lamports.
2. It computes the PDA address: `SHA256("escrow" + client_wallet_bytes)` → a deterministic address like `Def2...ABC8`.
3. It builds a `createEscrow` transaction with Anchor.
4. Phantom pops up and asks the client to approve sending 0.5 SOL + a small fee (~0.002 SOL for rent).
5. Client approves. Transaction is sent to Solana devnet. Confirmed in ~1 second.
6. The escrow account now exists at `Def2...ABC8` with 0.5 SOL locked inside and status `Active`.
7. A green toast appears: "Escrow created! 0.5 SOL locked."

**Step 3 — Freelancer sees the escrow**

Freelancer visits the site, connects their Phantom wallet. Goes to the Freelancer Dashboard (`/freelancer`). The page calls `fetchMyEscrowsAsFreelancer()` which asks Solana: "give me all escrow accounts where `freelancer = Abc1...XYZ9`." The new escrow appears in the list with status badge "Active."

**Step 4 — Freelancer submits work**

Freelancer clicks "Submit Work." A form opens. They write:
- Delivery note: "Website is live at xyz.com. GitHub: github.com/..."
- Optionally attach a file (e.g., a PDF design document).

If a file is attached:
1. File is sent to `/api/upload` on the Next.js server.
2. Server forwards to Pinata using the stored JWT.
3. Pinata returns CID. Server returns `https://gateway.pinata.cloud/ipfs/Qm...`.

Frontend assembles: `{"note":"Website is live at xyz.com...","file":"https://gateway.pinata.cloud/ipfs/Qm...","name":"design.pdf"}`

Clicks "Submit Work On-Chain." Phantom prompts for signature. Transaction sent. On-chain `work_submission` is written, status changes to `Submitted`.

**Step 5 — Client reviews and approves**

Client refreshes their dashboard. The escrow now shows status "Submitted" and the work submission text appears in a box. If there's a file, a "↓ Download Deliverable" button appears.

Client clicks "Approve & Pay." Phantom shows a transaction to review. Client approves.

Behind the scenes:
1. Anchor calls `approve_work` with the client's wallet, the freelancer's wallet address, and the escrow PDA.
2. The program checks status is `Submitted`. ✓
3. The program marks status as `Completed`.
4. Anchor's `close = freelancer` mechanism transfers all 500,002,039 lamports (0.5 SOL + rent) from the escrow to the freelancer's wallet.
5. The escrow account is deleted from Solana.

Freelancer's wallet now has 0.5 SOL more (plus the small rent bonus). A green toast appears on the client's screen: "Work approved! SOL sent to freelancer." The escrow card now shows status "Completed."

---

### Cancellation Path

**Step 1–2** same as above (client creates escrow).

Client changes their mind and clicks "Cancel." Phantom prompts. Transaction sent. Program checks status is `Active` ✓. Account closes, all SOL returns to client. Escrow card shows "Cancelled."

---

### Revision Path

**Step 1–4** same as happy path (freelancer submits work).

**Step 5 — Client requests revision**

Client sees the submission but isn't happy. Clicks "Request Revision." A text area appears. Client writes: "Please make the header larger and change the font to Inter."

Clicks "Send Revision Request." Transaction sent. On-chain:
- `revision_note = "Please make the header larger..."`
- `status = RevisionRequested`

**Step 6 — Freelancer resubmits**

Freelancer refreshes their dashboard. The escrow now shows an orange "Changes Requested" box with the client's feedback. The button says "Resubmit Work." They make the changes, click "Resubmit Work," write an updated delivery note, optionally attach a new file.

Transaction sent. On-chain:
- `work_submission` is overwritten with the new delivery
- `status = Submitted` (back to submitted)

**Step 7 — Loop or approve**

Client sees the resubmission. They can either approve now or request another revision. This can repeat indefinitely. Eventually they approve and the money is released as in Step 5 of the happy path.

---

## 13. The Security Model — Who Can Do What

The security doesn't rely on the frontend being honest. Even if someone built a fake version of the website, they couldn't steal anyone's money because the program enforces the rules independently.

### What the Program Enforces

| Action | Who can do it | Program check |
|---|---|---|
| Create escrow | Anyone | Amount > 0; client's wallet signs the transaction |
| Submit work | Only the registered freelancer | Signature matches `escrow.freelancer`; status is `Active` or `RevisionRequested` |
| Approve work | Only the registered client | Signature matches `escrow.client`; status is `Submitted` |
| Cancel escrow | Only the registered client | Signature matches `escrow.client`; status is `Active` |
| Request revision | Only the registered client | Signature matches `escrow.client`; status is `Submitted` |

### What Nobody Can Do

- **Nobody can take money without the client's approval** (not even Solana's validators).
- **The freelancer cannot approve their own work** — the program checks that the signer's wallet matches `escrow.client`, not `escrow.freelancer`.
- **A stranger cannot submit work** — must match `escrow.freelancer`.
- **The client cannot cancel after work is submitted** — status is never `Active` again once work is submitted.
- **Nobody can change the program's code** — it's deployed to an immutable address. FreelancePay's team cannot patch it, modify rules, or access the money.

### What Is NOT Protected

- **The client can refuse to approve forever.** If the client simply never clicks Approve and never requests a revision, the SOL stays locked indefinitely. There is no timeout or auto-release mechanism. This is a known limitation.
- **One escrow per client.** Because the escrow address is derived from the client's wallet, a client can only have one active escrow at a time.

---

## 14. The Data — What Gets Stored and Where

| Data | Stored Where | Who can read it | Who can change it |
|---|---|---|---|
| Escrow account (all fields) | Solana blockchain | Anyone | Only the program, via valid instructions |
| Uploaded files | Pinata/IPFS | Anyone with the URL | Nobody (content-addressed, immutable) |
| IPFS file URL | Inside `work_submission` on Solana | Anyone | Only via `submit_work` instruction |
| PINATA_JWT | `.env.local` on the server | Only the server process | The developer who set it |
| Wallet private key | Inside Phantom extension | Only Phantom | The wallet owner |

**No database.** There is no PostgreSQL, MySQL, or Firebase. The blockchain IS the database. This means:
- No server costs for data storage
- No company can be hacked to steal user data
- The app works as long as Solana works
- Data is permanent — even if FreelancePay's website goes down

---

## 15. How the Pages Connect to Each Other

```
Home (index.js)
│
├── "I'm a Client" ──────────────────────► Client Dashboard (client.js)
│                                               │
│                                               ├── "View Details" ─► Escrow Detail ([id].js)
│                                               └── "Create & Lock" (creates new escrow)
│
├── "I'm a Freelancer" ───────────────────► Freelancer Dashboard (freelancer.js)
│                                               │
│                                               ├── "View Details" ─► Escrow Detail ([id].js)
│                                               └── "Submit Work" (submits to existing escrow)
│
└── "How It Works" ───────────────────────► How It Works page (how-it-works.js)


Escrow Detail ([id].js)
├── ← "My Escrows" (back to client.js)
├── ← "My Contracts" (back to freelancer.js)
└── ← "Home" (back to index.js)
```

Every page uses `Layout.js` which provides the `Navbar.js` (containing links to all pages) and the footer.

---

## 16. What Happens When Something Goes Wrong

The app has defensive error handling at every level.

### Wallet Not Connected

If a user visits the Client or Freelancer dashboard without connecting their wallet, they see an empty state with a "Connect Wallet" button. No blockchain calls are made because `getProgram()` throws "Wallet not connected" which is caught and returned as `{ success: false }`.

### Transaction Rejected by User

When Phantom shows the transaction popup and the user clicks "Cancel," the `.rpc()` call throws an error. The hook catches it and returns `{ success: false, error: "User rejected the request" }`. A red toast appears. No state changes.

### Transaction Fails On-Chain

If the transaction is sent but the program rejects it (e.g., trying to approve with wrong status), Solana returns an error with the program's error code. The hook catches this and returns the error message. Examples:
- `InvalidStatus` — "Invalid escrow status for this operation"
- `NotFreelancer` — "Only the freelancer can perform this action"
- `NotClient` — "Only the client can perform this action"

### File Upload Fails

If Pinata is unreachable or the JWT is wrong, the server route returns `{ error: "Pinata upload failed (502)" }`. The frontend detects this and shows a red toast: "Pinata upload failed." The on-chain submission is NOT attempted — the freelancer stays at their submit form and can try again.

### Toast Notification System

Every action ends with a call to `setToast({ type: "success" | "error", text: "..." })`. The `Toast` component displays this in the bottom-right corner for 6 seconds. Successful transactions also include a clickable link to the Solana Explorer where users can verify the transaction on-chain.

---

## 17. Current Limitations

These are the known gaps in the current implementation:

**One escrow per client at a time.** Because the escrow's on-chain address is derived from only the client's wallet address, a single wallet can only have one active escrow. Creating a second while the first is active fails. A future fix would add a unique ID (like a counter or timestamp) to the address derivation.

**No dispute resolution.** If the client is unhappy with the work and both parties disagree, there is no arbitration. The client can refuse to approve forever and the freelancer cannot force release. A production system would need a trusted arbitrator or time-based auto-release.

**Devnet only.** The app uses Solana's test network. The SOL used has no real value. Real money cannot be used without switching to Solana mainnet and having the program audited for security.

**No notifications.** When the client requests a revision, the freelancer has no way of knowing unless they manually check the dashboard. There are no emails, push notifications, or real-time updates — the user must refresh.

**File history is lost on resubmission.** Each time the freelancer submits or resubmits, the previous `work_submission` text is overwritten on-chain. There's no history of what was submitted in previous rounds.

**The client receives slightly more than expected on cancellation**, and the freelancer receives slightly more than expected on approval, because rent (~0.002 SOL) is bundled with the main amount in the single escrow account. This is undocumented in the UI.

---

## Summary

FreelancePay is a three-tier system:

1. **The Solana program** (Rust/Anchor) is the enforcer — it holds the money, enforces the rules, and no human can override it.

2. **The Next.js website** is the interface — it reads data from Solana, lets users interact, and calls the program on their behalf through the `useEscrow` hook. The server-side `/api/upload` route safely handles file uploads without exposing the Pinata secret.

3. **Pinata/IPFS** is optional persistent storage — when a freelancer attaches a deliverable file, it lives permanently on IPFS and is linked from the on-chain data.

The key insight is that **trust is replaced by code**. Neither the client nor the freelancer needs to trust each other — they both trust the program, which is public, auditable, and impossible to tamper with. The website is just a friendly layer on top of that trustless foundation.

---

*Written from a complete read of the FreelancePay codebase. Program deployed on Solana Devnet at `5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX`.*
