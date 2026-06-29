# FreelancePay — Mainnet Migration Guide

> Complete checklist and runbook for moving from Solana Devnet to Mainnet-Beta.
> Do not rush this. A bug on mainnet means real money is at risk.

---

## 1. Security Audit Checklist

Complete every item before touching mainnet.

### On-Chain Program (Rust / Anchor)
- [ ] All `require!()` guards manually verified for every instruction
- [ ] `create_escrow`: `amount > 0` enforced
- [ ] `submit_work`: signer must be the registered freelancer
- [ ] `approve_work`: signer must be the registered client; status must be `Submitted`
- [ ] `cancel_escrow`: signer must be the registered client; status must be `Active`
- [ ] `request_revision`: signer must be the registered client; status must be `Submitted`
- [ ] PDA bump is stored and reused (not re-derived on each call) — ✅ already done
- [ ] `close = freelancer` and `close = client` constraints verified in IDL and source
- [ ] No hardcoded keypair bytes or private keys anywhere in `programs/`
- [ ] Dead code (`src/instructions/`, `src/create_escrow.rs`, etc.) cleaned up before mainnet deploy
- [ ] `EscrowAccount::INIT_SPACE` recalculated if any fields are added
- [ ] `revision_note` max length (300 bytes) is sufficient for production

### Frontend / Backend
- [ ] No `console.log()` printing wallet addresses, JWT tokens, or env secrets
- [ ] `PINATA_JWT` is never included in any client bundle (only used in `pages/api/upload.js`)
- [ ] `JWT_SECRET` is at least 32 random chars — generated with `openssl rand -base64 32`
- [ ] `CRON_SECRET` enforced on `/api/cron/sync-escrows` — never accessible without the header
- [ ] `.env.local` is in `.gitignore` and has never been committed
- [ ] No API route returns stack traces to the client (check all `catch` blocks)

### Professional Audit (Recommended)
Consider a professional audit from one of these firms before handling real user funds:
- [OtterSec](https://osec.io) — specialises in Solana programs
- [Neodyme](https://neodyme.io) — Anchor and Solana security
- [Trail of Bits](https://trailofbits.com) — broad scope, more expensive
- [Mad Shield](https://madshield.xyz) — newer, Pakistan-friendly pricing

Budget: $5,000–$30,000 depending on scope and firm.

---

## 2. Infrastructure Changes

### 2.1 Update RPC Endpoint

Replace `api.devnet.solana.com` with a paid mainnet-beta endpoint. Free public mainnet RPC is rate-limited and unreliable under load.

Recommended providers (all have generous free tiers):
| Provider | Free RPS | Mainnet URL |
|---|---|---|
| [Helius](https://helius.xyz) | 10 | `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY` |
| [QuickNode](https://quicknode.com) | 25 | endpoint provided after signup |
| [Alchemy](https://alchemy.com) | 25 | `https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY` |

Files to update when switching:
```
app/frontend/pages/_app.js         → const DEVNET_RPC = "https://..."
app/frontend/lib/solana-reader.js  → const RPC_URL = "https://..."
app/frontend/pages/api/health.js   → const DEVNET_RPC = "https://..."
```

### 2.2 Update Program ID

After deploying the program to mainnet, update the program ID in:
```
app/frontend/src/hooks/useEscrow.js        → const PROGRAM_ID = new PublicKey("NEW_ID")
app/frontend/src/idl/freelancepay.json     → "address": "NEW_ID"
```

### 2.3 Deploy Program to Mainnet

```sh
# 1. Ensure wallet has ≥ 5 SOL for program rent (check with solana balance)
solana balance --url mainnet-beta

# 2. Build the program
cargo build-sbf

# 3. Deploy (replace path with actual .so location)
solana program deploy \
  target/sbf-solana-solana/release/freelancepay.so \
  --url mainnet-beta \
  --keypair scripts/keypairs/deployer-keypair.json

# 4. Record the new program ID printed by the deploy command
# 5. Verify on explorer: https://explorer.solana.com/address/NEW_PROGRAM_ID
```

**Program authority**: Use a cold wallet (hardware wallet or air-gapped keypair) as the upgrade authority, not the same hot wallet used for testing.

### 2.4 Vercel Environment Variables

In Vercel dashboard → Project Settings → Environment Variables, update:
```
NEXT_PUBLIC_SOLANA_NETWORK   = mainnet-beta
NEXT_PUBLIC_PROGRAM_ID       = <new mainnet program ID>
DATABASE_URL                 = <production Supabase URL with ?sslmode=require>
JWT_SECRET                   = <new 32+ char secret, different from devnet>
CRON_SECRET                  = <new secret>
RESEND_API_KEY               = <production key with verified domain>
PINATA_JWT                   = <production Pinata key>
NEXT_PUBLIC_APP_URL          = https://freelancepay.vercel.app
```

---

## 3. Legal & Compliance

### Required Pages (add before mainnet)
- [ ] `/terms` — Terms of Service page
- [ ] `/privacy` — Privacy Policy page

### Required Disclaimers
Add to every page footer and the landing page hero:

> **Alpha Software** — FreelancePay is experimental software deployed on Solana Mainnet-Beta.
> Smart contracts may contain bugs. Use at your own risk. Funds are not guaranteed.

### Jurisdiction Note
Pakistan has specific fintech regulations under the State Bank of Pakistan (SBP). Cross-border crypto payments may require additional compliance steps. Consult a Pakistani fintech lawyer before public launch.

### Things You Cannot Promise
- That funds are always recoverable (a bug could lock SOL indefinitely)
- That the service will always be available
- That the smart contract has been formally verified

---

## 4. Gradual Rollout Plan

### Phase A — Internal Beta
- Audience: team members only (5–10 people)
- Maximum escrow: 0.1 SOL
- Duration: 2 weeks
- Goal: catch workflow bugs before external users

### Phase B — Closed Beta
- Audience: invite-only (50–100 people via waitlist)
- Maximum escrow: 0.5 SOL
- Duration: 4 weeks
- Goal: stress-test notifications, indexer, email delivery

### Phase C — Public Launch
- No escrow limit (or soft limit of 5 SOL in first month)
- Prominent risk warning on every page
- "Alpha" badge in navbar (replace DEVNET badge)
- Monitor Sentry for error spikes in first 48 hours

---

## 5. Monitoring Requirements

### Error Rate Alerts
Set up Sentry alerts to page you when:
- Error rate exceeds 1% of requests
- Any `p0` exception (wallet interaction failure, DB write failure)
- New issue with 10+ occurrences in 1 hour

### Indexer Health
The indexer (`/api/cron/sync-escrows`) runs every minute. Set up an alert if:
- `lastSyncedAt` on any escrow is more than 10 minutes old
- The cron job HTTP response is not 200

Query to detect stale sync (run in Supabase dashboard or add to health endpoint):
```sql
SELECT pda, "lastSyncedAt"
FROM "Escrow"
WHERE "lastSyncedAt" < NOW() - INTERVAL '10 minutes'
  AND status NOT IN ('COMPLETED', 'CANCELLED')
ORDER BY "lastSyncedAt" ASC
LIMIT 10;
```

### Key Metrics to Track
| Metric | Tool | Alert threshold |
|---|---|---|
| Escrow creation rate | Vercel Analytics | Drop > 50% vs. previous day |
| Indexer sync latency | Custom (log `syncEscrows` duration) | > 30s per run |
| DB connection pool | Supabase dashboard | > 80% pool utilisation |
| API error rate | Sentry | > 1% of requests |
| Email delivery rate | Resend dashboard | < 95% delivered |

---

## 6. Rollback Plan

### Feature Flag: Network Switch
Add to Vercel env vars:
```
NEXT_PUBLIC_NETWORK = mainnet   # or: devnet
```

In `_app.js` and `solana-reader.js`, read this flag to choose the RPC and program ID:
```js
const network = process.env.NEXT_PUBLIC_NETWORK || "devnet";
const RPC = network === "mainnet"
  ? process.env.NEXT_PUBLIC_MAINNET_RPC
  : "https://api.devnet.solana.com";
```

Keep the devnet deployment running at a separate Vercel project (e.g. `freelancepay-devnet.vercel.app`) during the mainnet rollout period.

### Maintenance Mode
If a critical bug is found post-launch:

1. In Vercel, add env var: `NEXT_PUBLIC_MAINTENANCE_MODE=true`
2. In `middleware.js`, check this flag and return a maintenance page response
3. Fix the bug on devnet first, get it reviewed, then redeploy to mainnet

```js
// In middleware.js — add before the rate-limit logic
if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") {
  const url = req.nextUrl.clone();
  if (!url.pathname.startsWith("/maintenance") && !url.pathname.startsWith("/api/health")) {
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }
}
```

Create `/pages/maintenance.js` with a simple "We'll be back shortly" page.

---

## 7. Timeline Estimate

| Task | Estimated time |
|---|---|
| Security audit (self-review) | 1 week |
| Professional audit (if budget permits) | 4–8 weeks |
| Legal pages (terms, privacy) | 1–2 days |
| Mainnet program deployment + verification | 1–2 hours |
| Vercel env var update + redeploy | 30 minutes |
| Phase A internal beta | 2 weeks |
| Phase B closed beta | 4 weeks |
| Phase C public launch | — |

Total: **~3 months** from decision to public launch (assuming professional audit).

---

*FreelancePay — Colosseum Frontier Hackathon — University of Management & Technology, Lahore*
*Program: `5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX` (Devnet)*
