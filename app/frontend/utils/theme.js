/* Global motion wiring — imported once in _app.js via useEffect */

export function initTheme() {
  if (typeof window === "undefined") return;

  // ── Lenis smooth scroll ──────────────────────────
  let lenis;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reducedMotion) {
    import("lenis").then(({ default: Lenis }) => {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }).catch(() => { /* lenis unavailable, native scroll is fine */ });
  }

  // ── Scroll reveal ────────────────────────────────
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const kind = el.dataset.reveal || "rise";
        const map = {
          rise:  "anim-rise",
          left:  "rise-in-left",
          right: "rise-in-right",
          zoom:  "anim-zoom",
          pop:   "anim-pop",
        };
        el.classList.add(map[kind] || "anim-rise");
        io.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  document.querySelectorAll("[data-reveal]").forEach((el) => {
    el.style.opacity = "0";
    io.observe(el);
  });

  // ── Page-load orchestration ──────────────────────
  document.body.classList.add("loaded");
  document.querySelectorAll("[data-enter]").forEach((el, i) => {
    el.style.setProperty("--i", i);
    el.classList.add("anim-pop");
  });

  // ── Button ripple ────────────────────────────────
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".btn");
    if (!b) return;
    const r = document.createElement("span");
    r.className = "ripple";
    const rect = b.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + "px";
    r.style.left = e.clientX - rect.left - size / 2 + "px";
    r.style.top  = e.clientY - rect.top  - size / 2 + "px";
    b.appendChild(r);
    setTimeout(() => r.remove(), 600);
  });

  // ── Magnetic hover ───────────────────────────────
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width  / 2) * 0.18}px, ${(e.clientY - r.top  - r.height / 2) * 0.18}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });

  // ── Card 3D tilt ─────────────────────────────────
  document.querySelectorAll("[data-tilt]").forEach((c) => {
    c.style.transition = "transform .15s var(--ease-out)";
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      const rx = ((e.clientY - r.top)  / r.height - 0.5) * -5;
      const ry = ((e.clientX - r.left) / r.width  - 0.5) *  5;
      c.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
    c.addEventListener("pointerleave", () => { c.style.transform = ""; });
  });

  // ── Hide-on-scroll nav ───────────────────────────
  let lastY = 0;
  const nav = document.querySelector(".navbar");
  if (nav) {
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      nav.classList.toggle("is-stuck",  y > 8);
      nav.classList.toggle("is-hidden", y > lastY && y > 120);
      lastY = y;
    }, { passive: true });
  }

  // ── Animated counters ────────────────────────────
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = +el.dataset.count, dur = 1200;
    let t0;
    new IntersectionObserver((es, o) => {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      const tick = (t) => {
        t0 ??= t;
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }).observe(el);
  });

  return () => { lenis?.destroy(); };
}
