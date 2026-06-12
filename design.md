# FreelancePay — Design System

> **Aesthetic:** Cozy Sticker Sheet — cream dotted paper, dashed pastel outlines, rounded
> friendly type, springy motion. Warm but trustworthy: soft enough for a small team,
> clear enough to handle real money.

---

## 1. Color Tokens

All tokens are defined in `:root` in `styles/globals.css`.

### Surfaces
| Token | Value | Use |
|---|---|---|
| `--cream` | `#fbf5ea` | Page background (dotted paper) |
| `--paper` | `#ffffff` | Card / input surface |
| `--ink` | `#4f433c` | Primary text, borders, icon stroke |
| `--ink-soft` | `#8a7c70` | Secondary / muted text |
| `--line` | `#e7ddcb` | Dashed borders, dividers |
| `--line-2` | `#ece2d2` | Card default border |

### Pastels
| Token | Value | Use |
|---|---|---|
| `--butter` | `#f7df9b` | Default button, stat accent |
| `--pink` | `#f5bcc7` | Danger / cancelled state |
| `--sage` | `#c2d8b6` | Success / completed / paid |
| `--lav` | `#d6c8ec` | Primary action, client theme |
| `--sky` | `#bdd7ea` | Processing / active state |
| `--peach` | `#f6c6a4` | Revision / warning accent |
| `--leaf` | `#a9c98f` | Confirmed / live / earned |
| `--brown` | `#7d5a45` | Display heading accent |

### Pre-computed tints (pastel at ~20% on white)
`--sage-lo` `--pink-lo` `--peach-lo` `--sky-lo` `--lav-lo` `--butter-lo`

### Status (semantic — map to pastels)
```css
--status-paid:       var(--sage);
--status-pending:    var(--butter);
--status-overdue:    var(--err);      /* #ef9aa6 */
--status-processing: var(--sky);
--status-draft:      var(--line);
```

### System
| Token | Value |
|---|---|
| `--ok` | `#9fce8e` |
| `--warn` | `#f3c98b` |
| `--err` | `#ef9aa6` |
| `--focus` | `#7fb6d6` |

---

## 2. Typography

### Fonts
- **Gaegu** (`--font-display`) — section titles, friendly labels, card titles, marketing headlines
- **Nunito** (`--font-body`) — body copy, labels, buttons, all currency figures

Both injected via `next/font/google` with CSS variable mode in `pages/_app.js`.

### Scale
```css
--fs-hero:  clamp(2.8rem, 10vw, 5.6rem)
--fs-h1:    clamp(2.2rem, 5.5vw, 3.2rem)
--fs-h2:    clamp(1.7rem, 3.8vw, 2.2rem)
--fs-h3:    1.45rem
--fs-lg:    1.15rem
--fs-body:  1rem
--fs-sm:    .875rem
```

### Rules
- `h1, h2, h3` → `font-family: var(--font-display)`
- Currency amounts → `font-family: var(--font-body); font-weight: 800; font-variant-numeric: tabular-nums`
- Body text → `font-weight: 600` minimum (Nunito reads thin at small sizes)
- **Never** use Gaegu for numbers, prices, or table data

### Classes
```css
.amount        /* Nunito 800, tabular-nums, letter-spacing -.03em */
.amount--lg    /* font-size clamp(2.2rem, 5vw, 3.4rem) */
.amount--muted /* color: var(--ink-soft) */
.eyebrow       /* Nunito 700, fs-sm, uppercase, letter-spacing .08em */
.muted         /* color: var(--ink-soft), font-weight: 600 */
.mono          /* Courier New, 0.85em — wallet addresses */
```

---

## 3. Spacing & Layout

```css
--container: 1080px    /* max page width */
--gutter:    clamp(16px, 4vw, 28px)
--gap:       14px

/* spacing scale */
--s-1: 4px   --s-2: 8px   --s-3: 12px  --s-4: 16px
--s-5: 24px  --s-6: 32px  --s-8: 48px  --s-10: 64px
```

### Page containers
```css
.page      /* max-width 760px, centered, padding 2rem 1.25rem 4rem */
.page-wide /* max-width 1080px */
.wrap      /* max-width var(--container), inline padding var(--gutter) */
```

---

## 4. Radii & Shadows

```css
--r-pill: 999px   /* buttons, badges, pills */
--r-lg:   26px    /* modals */
--r-md:   20px    /* cards */
--r-sm:   14px    /* inputs, sub-cards */

--sh-sm:   0 4px 10px -8px rgba(79,67,60,.40)
--sh-md:   0 8px 18px -12px rgba(79,67,60,.40)
--sh-lg:   0 18px 40px -22px rgba(79,67,60,.35)
--sh-glow: 0 0 0 6px rgba(245,188,199,.28)
--rim:     inset 0 0 0 2px #fff   /* card inner highlight */
```

---

## 5. Components

### Card
```css
.card {
  background: var(--paper);
  border: 3px dashed var(--line-2);
  border-radius: var(--r-md);
  padding: 1.5rem;
  box-shadow: var(--rim), var(--sh-sm);
}
/* hover: translateY(-4px) + --sh-md */
```

### Button
```css
.btn           /* butter bg, ink border, r-pill, Nunito 800 */
.btn-primary   /* lav bg */
.btn-success   /* sage bg */
.btn-danger    /* pink bg */
.btn-outline   /* transparent bg, no shadow */
.btn-sm        /* 5px 14px padding, 0.82rem font */
/* hover: translateY(-3px) rotate(-1deg) */
/* active: translateY(1px) scale(.97) */
```

### Status Badge (escrow state)
```css
.badge                   /* base pill, ink border */
.badge-active            /* sky */
.badge-submitted         /* butter */
.badge-completed         /* sage */
.badge-cancelled         /* pink */
.badge-revisionRequested /* peach */
```

### Status Pill (payment/domain state)
```css
.status              /* pending default (butter) */
.status--paid        /* sage */
.status--overdue     /* err */
.status--processing  /* sky */
.status--draft       /* line */
/* always includes a .dot span for color-blind users */
```

### Icon Badge
Pastel disc with ink outline — use for empty states, step indicators, hero accents.
```css
.icon-badge            /* 44×44, butter bg */
.icon-badge--paid      /* sage bg */
.icon-badge--processing/* sky bg */
.icon-badge--alert     /* err bg */
.icon-badge--lav       /* lav bg */
.icon-badge--sky       /* sky bg */
.icon-badge--sage      /* sage bg */
.icon-badge--peach     /* peach bg */
```

### Avatar (client initials)
```css
.avatar /* 40×40, circle, lav bg, ink border, Gaegu 700 */
/* rotate background per client: butter/pink/sage/lav/sky/peach */
```

### Form
```css
.form-group    /* margin-bottom: 1rem wrapper */
.form-label    /* Gaegu 700, brown */
.form-input    /* paper bg, 2.5px solid line border, r-sm */
.form-textarea /* same + resize:vertical, min-height 90px */
/* focus: border → purple, box-shadow → glow, translateY(-1px) */
```

### Toast
```css
.toast           /* paper bg, ink border, r-md, animated in */
.toast-success   /* sage-lo bg, leaf border */
.toast-error     /* pink-lo bg, blush border */
```

---

## 6. Icons

**Library:** [Lucide React](https://lucide.dev) — MIT licensed, rounded stroke style.

```bash
npm i lucide-react
```

### Usage
```jsx
import { Lock, Check, Download } from "lucide-react";

// Inline in button (decorative — next to text)
<Lock size={15} strokeWidth={2.2} className="icon" aria-hidden />

// In icon badge (accent / empty state)
<div className="icon-badge icon-badge--lav">
  <Wallet size={22} strokeWidth={2} aria-hidden />
</div>

// Icon-only control (must have aria-label on the button)
<button aria-label="Remove file">
  <X size={12} strokeWidth={2.2} aria-hidden />
</button>
```

### Icon map
| Concept | Lucide name |
|---|---|
| Create / lock funds | `Lock` |
| Submit / edit work | `PenLine` |
| Approve / paid | `Check`, `CheckCircle` |
| Cancel / close | `X` |
| Request revision | `RotateCcw` |
| Refresh | `RefreshCw` |
| Download deliverable | `Download` |
| Attach file | `Paperclip` |
| Wallet / connect | `Wallet` |
| No contracts yet | `FileText` |
| Payment released | `Zap` |
| Warning | `AlertTriangle` |
| How it works — hero | `Brain` |
| Big idea | `Lightbulb` |
| Client hired | `Users` |
| Send / CTA | `Send` |

### CSS helper
```css
.icon { display: inline-block; flex-shrink: 0; vertical-align: -0.15em; color: currentColor; }
```

### Rules
- One icon set only — never mix Lucide with Heroicons, Font Awesome, etc.
- `strokeWidth={2.2}` inline for small icons (14–16px); `2.0–2.1` for badge icons (20–28px)
- Decorative (next to text) → `aria-hidden`
- Sole label (no text) → `aria-label` on the parent element
- No emoji substitutes — icons only

---

## 7. Motion

All motion is wired in `utils/theme.js`, called once from `pages/_app.js`.

### Easing
```css
--ease-spring:  cubic-bezier(.34, 1.56, .64, 1)  /* signature — bouncy hover/entrance */
--ease-out:     cubic-bezier(.22, 1, .36, 1)
--ease-in-out:  cubic-bezier(.65, 0, .35, 1)
--ease-soft:    cubic-bezier(.4, 0, .2, 1)

--t-fast: .18s
--t-base: .28s
--t-slow: .55s
```

### Scroll reveal — `data-reveal`
Add `data-reveal` (or `data-reveal="zoom"` / `"pop"` / `"rise"` / `"left"` / `"right"`) to any
element. The IntersectionObserver in `theme.js` adds the animation class on entry.

### Page-load — `data-enter`
Hero elements. Staggered via `--i` index with `animation-delay: calc(var(--i) * 80ms)`.

### Stagger grid — `data-stagger`
Wrap a grid with `data-stagger`; direct children auto-stagger via `--i`.

### 3D tilt — `data-tilt`
Cards in grids. `pointermove` drives a `perspective(700px) rotateX rotateY` transform.

### Magnetic hover — `.magnetic`
CTA buttons. Pointer offset drives a subtle translate (18% factor).

### Lenis smooth scroll
Dynamic import (`lenis`), gated on `prefers-reduced-motion`. Duration 1.1s, exponential ease.

### `prefers-reduced-motion`
- CSS: all `animation-duration` → `.001ms`, `transition-duration` → `.001ms`
- JS: Lenis skipped; all JS-driven motion skipped

---

## 8. Background

```css
body {
  background-color: var(--cream);
  background-image: radial-gradient(var(--line) 1.4px, transparent 1.5px);
  background-size: 22px 22px;
  background-position: -11px -11px;
}
```

The dotted paper pattern is pure CSS — no images.

---

## 9. SVG Wobble Filter

Defined once in `components/Layout.js`, available globally via `filter="url(#rough)"`.
Apply to illustration SVGs for a hand-drawn feel. Parameters: `baseFrequency 0.016`, `scale 1.6`.

---

## 10. Navbar

- Sticky, `backdrop-filter: blur(12px)`, 64px height
- Hides on scroll down (`is-hidden`), shows drop shadow on scroll up (`is-stuck`)
- `DEVNET` pill: sage bg, ink border — always visible so users know this is test money

---

## 11. What NOT to do

- No emoji or decorative unicode in UI copy — use Lucide icons
- No `font-family: var(--font-display)` on numbers or currency
- No hardcoded hex colors in JSX — use CSS tokens only (`"var(--lav)"`)
- No `color-mix()` — use pre-computed `--*-lo` tints
- No touching Rust program, API routes, auth, or env vars for visual changes
- No new icon libraries — Lucide only
