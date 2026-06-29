import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { Lock, PenLine, Zap, Star, ArrowRight, Briefcase } from "lucide-react";
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);
import Layout from "@/components/Layout";
import useSolPrice from "@/hooks/useSolPrice";

// STATS is built from live getStaticProps data — see below

const STEPS = [
  {
    n: "01",
    Icon: Lock,
    title: "Lock SOL",
    desc: "Client creates an escrow and locks SOL in a Solana smart contract. Funds are safe — only released on approval.",
    color: "var(--lav)",
    bgLo: "var(--lav-lo)",
  },
  {
    n: "02",
    Icon: PenLine,
    title: "Deliver Work",
    desc: "Freelancer completes the job and submits proof of delivery on-chain. The record is permanent.",
    color: "var(--sage)",
    bgLo: "var(--sage-lo)",
  },
  {
    n: "03",
    Icon: Zap,
    title: "Get Paid",
    desc: "Client approves. SOL transfers instantly to the freelancer's wallet. No bank. No delay. No middleman.",
    color: "var(--sky)",
    bgLo: "var(--sky-lo)",
  },
];

function truncWallet(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function CompactFreelancerCard({ freelancer }) {
  const { walletAddress, displayName, skills, averageRating, totalReviews, hourlyRate, avatarUrl } = freelancer;
  const solPrice = useSolPrice();
  const name = displayName || truncWallet(walletAddress);
  const initial = name[0].toUpperCase();
  const colors = ["var(--lav)", "var(--sage)", "var(--sky)", "var(--peach)"];
  const bg = colors[initial.charCodeAt(0) % colors.length];

  return (
    <div className="card" data-tilt style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        {avatarUrl
          ? <img src={avatarUrl} alt={name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2.5px solid var(--line)" }} />
          : <div style={{ width: 44, height: 44, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", border: "2.5px solid var(--line)", flexShrink: 0, color: "var(--ink)" }}>{initial}</div>
        }
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{name}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontWeight: 600 }}>{truncWallet(walletAddress)}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
        {(skills || []).slice(0, 3).map((s) => <span key={s} className="skill-pill" style={{ fontSize: "0.72rem" }}>{s}</span>)}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
        {averageRating != null
          ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
              <Star size={12} fill="var(--amber)" strokeWidth={0} style={{ color: "var(--amber)" }} />
              {averageRating.toFixed(1)}
              <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>({totalReviews})</span>
            </span>
          : <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>No reviews yet</span>
        }
        <span style={{ fontWeight: 700, color: "var(--brown)" }}>
          {hourlyRate != null ? (
            <>
              {hourlyRate} SOL/hr
              {solPrice && <span style={{ fontSize: "0.72rem", color: "var(--ink-soft)", fontWeight: 600, marginLeft: 4 }}>≈ ${(hourlyRate * solPrice).toFixed(0)}/hr</span>}
            </>
          ) : "Negotiable"}
        </span>
      </div>

      <Link href={`/marketplace`} className="btn btn-sm btn-outline" style={{ textAlign: "center" }}>
        View on Marketplace
      </Link>
    </div>
  );
}

function CompactJobCard({ job }) {
  const { id, title, description, budgetSOL, requiredSkills, createdAt, client } = job;
  const solPrice = useSolPrice();
  const clientName = client?.displayName || truncWallet(client.walletAddress);
  const diff = Date.now() - new Date(createdAt).getTime();
  const hrs  = Math.floor(diff / 3600000);
  const ago  = hrs < 1 ? "just now" : hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;

  return (
    <div className="card jc-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", margin: 0 }}>{title}</h3>
        <span style={{ flexShrink: 0, marginLeft: "0.5rem", textAlign: "right" }}>
          <span className="amount" style={{ fontSize: "1rem" }}>{budgetSOL} SOL</span>
          {solPrice && <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)", fontWeight: 600, marginTop: 1 }}>≈ ${(parseFloat(budgetSOL) * solPrice).toFixed(0)}</div>}
        </span>
      </div>
      <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", margin: "0 0 0.6rem", lineHeight: 1.5, fontWeight: 600 }}>
        {description.length > 100 ? description.slice(0, 100) + "…" : description}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.6rem" }}>
        {(requiredSkills || []).slice(0, 3).map((s) => <span key={s} className="skill-pill" style={{ fontSize: "0.72rem" }}>{s}</span>)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontWeight: 600 }}>{clientName} · {ago}</span>
        <Link href="/jobs" className="btn btn-sm btn-outline">Browse Jobs</Link>
      </div>
    </div>
  );
}

export default function Home({ featuredFreelancers = [], latestJobs = [], platformStats = {} }) {
  const STATS = [
    { value: platformStats.freelancers ?? "4M+",  label: "Freelancers",     count: platformStats.freelancersRaw },
    { value: "0%",                                label: "Platform fees" },
    { value: "<2s",                               label: "Payment speed" },
    { value: platformStats.volume ?? "0 SOL",     label: "Volume processed" },
  ];
  const { connected } = useWallet();

  return (
    <Layout title="Home">
      {/* ── Hero ─────────────────────────────────── */}
      <section style={{ padding: "5rem 1.5rem 3.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div className="hero-bg-glow" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(214,200,236,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div
          data-enter
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, border: "2.5px solid var(--leaf)", background: "var(--sage-lo)", marginBottom: "1.25rem" }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--leaf)", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: "0.75rem", color: "var(--leaf)", fontWeight: 800, letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
            LIVE ON SOLANA DEVNET
          </span>
        </div>

        <h1
          data-enter
          style={{ fontSize: "var(--fs-hero)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "1.25rem", fontFamily: "var(--font-display)" }}
        >
          Get Paid Instantly.{" "}
          <span style={{ background: "linear-gradient(90deg, var(--lav) 0%, var(--sage) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            No Middleman.
          </span>
        </h1>

        <p
          data-enter
          style={{ fontSize: "var(--fs-lg)", color: "var(--ink-soft)", maxWidth: 520, margin: "0 auto 2rem", lineHeight: 1.65, fontWeight: 600 }}
        >
          FreelancePay locks SOL in a Solana smart contract until work is approved —
          protecting both clients and freelancers with zero platform fees.
        </p>

        {connected ? (
          <div data-enter style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/client"      className="btn btn-primary magnetic" style={{ padding: "12px 32px", fontSize: "1rem" }}>I&apos;m a Client →</Link>
            <Link href="/freelancer"  className="btn btn-outline magnetic" style={{ padding: "12px 32px", fontSize: "1rem" }}>I&apos;m a Freelancer →</Link>
          </div>
        ) : (
          <div data-enter style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <WalletMultiButton style={{ fontSize: "1rem", height: 48, padding: "0 28px" }} />
            <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", fontWeight: 600, margin: 0 }}>Connect Phantom to get started</p>
          </div>
        )}
        <div data-enter style={{ display: "flex", gap: "0.6rem", justifyContent: "center", marginTop: "1.25rem", flexWrap: "wrap" }}>
          <Link href="/marketplace" className="btn btn-sm btn-outline">Browse Freelancers →</Link>
          <Link href="/jobs"        className="btn btn-sm btn-outline">Find Work →</Link>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 3.5rem" }} data-testid="platform-stats">
        <div
          data-reveal="zoom"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "var(--line)", borderRadius: "var(--r-md)", overflow: "hidden", border: "2.5px solid var(--line)" }}
        >
          {STATS.map(({ value, label, count }) => (
            <div key={label} style={{ background: "var(--paper)", padding: "1.5rem", textAlign: "center" }}>
              <div
                className="amount"
                style={{ fontSize: "1.9rem", color: "var(--brown)" }}
                data-count={count || undefined}
              >
                {value}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 4, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 5rem" }}>
        <h2 data-reveal style={{ textAlign: "center", fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>
          How it works
        </h2>
        <p data-reveal style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: "0.95rem", marginBottom: "2.5rem", fontWeight: 600 }}>
          Three steps. Fully on-chain. No trust required.
        </p>

        <div data-stagger style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {STEPS.map(({ n, Icon, title, desc, color, bgLo }, i) => (
            <div
              key={n}
              className="card"
              data-tilt
              style={{ "--i": i, position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: color, borderRadius: "var(--r-md) var(--r-md) 0 0" }} />
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color, letterSpacing: "0.1em", marginBottom: "0.75rem", fontFamily: "var(--font-body)", paddingTop: 8 }}>{n}</div>
              <div style={{ marginBottom: "0.75rem" }}>
                <div className="icon-badge" style={{ background: bgLo, border: `2.5px solid ${color}` }}>
                  <Icon size={20} strokeWidth={2.2} style={{ color }} aria-hidden />
                </div>
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>{title}</h3>
              <p style={{ fontSize: "0.87rem", color: "var(--ink-soft)", lineHeight: 1.6, fontWeight: 600, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Freelancers ──────────────────── */}
      {featuredFreelancers.length > 0 && (
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h2 data-reveal style={{ fontFamily: "var(--font-display)", marginBottom: "0.25rem" }}>
                Featured Freelancers
              </h2>
              <p data-reveal style={{ color: "var(--ink-soft)", fontSize: "0.9rem", fontWeight: 600, margin: 0 }}>
                Top-rated talent ready to work for SOL
              </p>
            </div>
            <Link href="/marketplace" className="btn btn-outline btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              Browse All <ArrowRight size={14} />
            </Link>
          </div>

          <div data-stagger style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {featuredFreelancers.map((f) => (
              <CompactFreelancerCard key={f.walletAddress} freelancer={f} />
            ))}
          </div>
        </section>
      )}

      {/* ── Latest Jobs ───────────────────────────── */}
      {latestJobs.length > 0 && (
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h2 data-reveal style={{ fontFamily: "var(--font-display)", marginBottom: "0.25rem" }}>
                Latest Job Posts
              </h2>
              <p data-reveal style={{ color: "var(--ink-soft)", fontSize: "0.9rem", fontWeight: 600, margin: 0 }}>
                Open projects seeking freelancers right now
              </p>
            </div>
            <Link href="/jobs" className="btn btn-outline btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              Browse All <ArrowRight size={14} />
            </Link>
          </div>

          <div data-stagger style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "0.75rem" }}>
            {latestJobs.map((j) => (
              <CompactJobCard key={j.id} job={j} />
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom CTA ───────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto 4rem", padding: "0 1.5rem" }}>
        <div
          data-reveal="pop"
          className="card"
          style={{ textAlign: "center", padding: "2.5rem", background: "var(--lav-lo)", border: "3px dashed var(--lav)" }}
        >
          <h2 style={{ fontSize: "var(--fs-h2)", marginBottom: "0.75rem", fontFamily: "var(--font-display)" }}>
            Ready to start?
          </h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: "1.5rem", fontSize: "0.95rem", fontWeight: 600 }}>
            Connect your Phantom wallet and create your first escrow in 60 seconds.
          </p>
          {connected ? (
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/client"      className="btn btn-primary magnetic">Create Escrow</Link>
              <Link href="/freelancer"  className="btn btn-outline magnetic">View Contracts</Link>
              <Link href="/marketplace" className="btn btn-success magnetic">
                <Briefcase size={15} /> Find Freelancers
              </Link>
            </div>
          ) : (
            <WalletMultiButton />
          )}
        </div>
      </section>
    </Layout>
  );
}

export async function getStaticProps() {
  try {
    const prisma = require("../lib/prisma");

    const [freelancerRows, jobRows, escrowCount, completedCount, freelancerCount, volumeRow] = await Promise.all([
      prisma.user.findMany({
        where: { isFreelancer: true },
        orderBy: [
          { averageRating: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        take: 3,
        select: {
          walletAddress: true,
          displayName:   true,
          skills:        true,
          hourlyRate:    true,
          avatarUrl:     true,
          averageRating: true,
          totalReviews:  true,
        },
      }),
      prisma.jobPost.findMany({
        where:   { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take:    3,
        include: {
          client: {
            select: { walletAddress: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.escrow.count(),
      prisma.escrow.count({ where: { status: "COMPLETED" } }),
      prisma.user.count({ where: { isFreelancer: true } }),
      prisma.escrow.aggregate({
        where: { status: "COMPLETED" },
        _sum:  { amountLamports: true },
      }),
    ]);

    const freelancers = freelancerRows.map((u) => ({
      walletAddress: u.walletAddress,
      displayName:   u.displayName,
      skills:        u.skills,
      hourlyRate:    u.hourlyRate != null ? parseFloat(u.hourlyRate.toString()) : null,
      avatarUrl:     u.avatarUrl,
      averageRating: u.averageRating,
      totalReviews:  u.totalReviews,
    }));

    const jobs = jobRows.map((j) => ({
      id:             j.id,
      title:          j.title,
      description:    j.description,
      budgetSOL:      parseFloat(j.budgetSOL.toString()),
      requiredSkills: j.requiredSkills,
      createdAt:      j.createdAt.toISOString(),
      client: {
        walletAddress: j.client.walletAddress,
        displayName:   j.client.displayName,
        avatarUrl:     j.client.avatarUrl,
      },
    }));

    const lamports    = volumeRow._sum.amountLamports ?? 0n;
    const volumeSOL   = (Number(lamports) / 1_000_000_000).toFixed(2);

    const platformStats = {
      freelancers:    freelancerCount > 0 ? `${freelancerCount}+` : "4M+",
      freelancersRaw: freelancerCount,
      volume:         `${volumeSOL} SOL`,
      completed:      completedCount,
      total:          escrowCount,
    };

    return {
      props: { featuredFreelancers: freelancers, latestJobs: jobs, platformStats },
      revalidate: 60,
    };
  } catch {
    return {
      props:      { featuredFreelancers: [], latestJobs: [], platformStats: {} },
      revalidate: 60,
    };
  }
}
