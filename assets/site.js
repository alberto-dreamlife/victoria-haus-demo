/* ============================================================
   VICTORIA HAUS — shared behaviour
   ============================================================ */

/* nav */
const nav = document.querySelector("nav");
if (nav) {
  const onScroll = () => nav.classList.toggle("solid", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* mobile drawer */
const burger = document.querySelector(".burger");
const drawer = document.querySelector(".drawer");
if (burger && drawer) {
  const setMenu = on => {
    document.body.classList.toggle("menu-open", on);
    burger.setAttribute("aria-expanded", String(on));
    drawer.setAttribute("aria-hidden", String(!on));
  };
  burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  /* The panel sits over the header, so closing needs its own control, plus the
     veil for anyone who expects clicking outside to dismiss it. */
  document.getElementById("dClose")?.addEventListener("click", () => setMenu(false));
  document.getElementById("veil")?.addEventListener("click", () => setMenu(false));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
  });
  matchMedia("(min-width:961px)").addEventListener("change", e => { if (e.matches) setMenu(false); });
}

/* video headers — fade in only once actually playing */
document.querySelectorAll("video[data-loop]").forEach(v => {
  const show = () => v.classList.add("playing");
  v.addEventListener("playing", show, { once: true });
  if (v.readyState >= 3) show();
  const kick = () => { v.play().catch(() => {}); };
  document.addEventListener("touchstart", kick, { once: true, passive: true });

  /* Optional in-point / out-point, e.g. data-loop="0,6" plays the first six
     seconds and restarts. timeupdate only fires ~4x a second, so the cut can
     land up to ~250ms late; rAF checks every frame and keeps it tight. */
  const [inAt, outAt] = (v.dataset.loop || "").split(",").map(parseFloat);
  if (!(outAt > 0)) return;
  const from = inAt > 0 ? inAt : 0;
  const rewind = () => { v.currentTime = from; };
  if (from > 0) v.addEventListener("loadedmetadata", rewind, { once: true });
  (function tick() {
    if (v.currentTime >= outAt) rewind();
    requestAnimationFrame(tick);
  })();
});

/* ---------- hero: hand over from the opener to the master ----------
   The 25 MB master cannot start instantly, and a header that sits frozen and
   then jumps into motion reads as broken. So a light copy plays from the first
   moment and the master takes over silently once it can run to the end without
   stalling. It is seeked to the opener's timestamp before the fade so the two
   are on the same frame, and if the master never gets there nothing happens. */
{
  const open = document.querySelector(".hero .media video.v-open");
  const hq   = document.querySelector(".hero .media video.v-hq");
  if (open && hq) {
    const handover = () => {
      if (hq.readyState < 4) return;
      hq.currentTime = open.currentTime % (hq.duration || 1);
      hq.play().then(() => {
        hq.classList.add("playing");
        /* Keep the opener decoding until the fade is done, then drop it: two
           1080p decoders running for the life of the page is wasted battery. */
        setTimeout(() => { open.pause(); open.removeAttribute("src"); open.load(); }, 700);
      }).catch(() => {});
    };
    hq.addEventListener("canplaythrough", handover, { once: true });
    if (hq.readyState === 4) handover();
  }
}

/* reveal */
const io = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: .1, rootMargin: "0px 0px -50px 0px" });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

/* hero parallax */
const heroMedia = document.querySelector(".hero .media");
if (heroMedia) {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY, h = heroMedia.offsetHeight;
      if (y < h) heroMedia.style.transform = `translate3d(0, ${Math.min(y * 0.16, h * 0.11)}px, 0)`;
      ticking = false;
    });
  }, { passive: true });
}

/* counters */
const counters = document.querySelectorAll("[data-count]");
if (counters.length) {
  const cio = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, target = parseInt(el.dataset.count, 10);
      const t0 = performance.now(), dur = 1300;
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: .5 });
  counters.forEach(el => cio.observe(el));
}

/* demo form */
document.querySelectorAll("form[data-demo]").forEach(f =>
  f.addEventListener("submit", e => {
    e.preventDefault();
    alert("Demo only, no data is sent.");
  }));

/* ============================================================
   LIGHTBOX — shared by the gallery and the floor plans
   ============================================================ */
const Lightbox = (() => {
  let items = [], i = 0, el = null, img = null, capEl = null, countEl = null;
  let scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0, px = 0, py = 0;
  let baseW = 0, baseH = 0, moved = false;
  const MAXS = 4;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function build() {
    el = document.createElement("div");
    el.className = "lb";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `
      <span class="lb-zoomhint">Click image to zoom</span>
      <button class="lb-close" aria-label="Close">&#10005;</button>
      <button class="lb-prev" aria-label="Previous">&#8249;</button>
      <button class="lb-next" aria-label="Next">&#8250;</button>
      <div class="lb-stage"><img alt=""></div>
      <div class="lb-bar"><div class="lb-cap"></div><div class="lb-count"></div></div>`;
    document.body.appendChild(el);
    img = el.querySelector("img");
    capEl = el.querySelector(".lb-cap");
    countEl = el.querySelector(".lb-count");

    el.querySelector(".lb-close").addEventListener("click", close);
    el.querySelector(".lb-prev").addEventListener("click", e => { e.stopPropagation(); go(-1); });
    el.querySelector(".lb-next").addEventListener("click", e => { e.stopPropagation(); go(1); });
    el.addEventListener("click", e => {
      if (e.target === el || e.target.classList.contains("lb-stage")) close();
    });

    img.addEventListener("click", e => {
      e.stopPropagation();
      if (moved) { moved = false; return; }
      if (scale > 1) reset(); else zoomAt(2.2, e);
    });

    el.addEventListener("wheel", e => {
      e.preventDefault();
      const next = clamp(scale * (e.deltaY < 0 ? 1.16 : 0.86), 1, MAXS);
      if (next === 1) { reset(); return; }
      zoomAt(next, e);
    }, { passive: false });

    img.addEventListener("pointerdown", e => {
      if (scale <= 1) return;
      e.preventDefault();
      dragging = true; moved = false; img.classList.add("grabbing");
      sx = e.clientX; sy = e.clientY; px = tx; py = ty;
      img.setPointerCapture(e.pointerId);
    });
    img.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      tx = px + dx; ty = py + dy;
      clampT(); applyT();
    });
    const endDrag = () => { dragging = false; img.classList.remove("grabbing"); };
    img.addEventListener("pointerup", endDrag);
    img.addEventListener("pointercancel", endDrag);

    let tsx = 0, tsy = 0;
    el.addEventListener("touchstart", e => { tsx = e.touches[0].clientX; tsy = e.touches[0].clientY; },
      { passive: true });
    el.addEventListener("touchend", e => {
      if (scale > 1 || items.length < 2) return;
      const dx = e.changedTouches[0].clientX - tsx, dy = e.changedTouches[0].clientY - tsy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    document.addEventListener("keydown", e => {
      if (!el.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    });
  }

  function measure() {
    const prev = img.style.transform;
    img.style.transform = "none";
    const r = img.getBoundingClientRect();
    baseW = r.width; baseH = r.height;
    img.style.transform = prev;
  }
  function clampT() {
    const st = el.querySelector(".lb-stage").getBoundingClientRect();
    const slack = 90;
    const mx = Math.max(0, (baseW * scale - st.width) / 2) + slack;
    const my = Math.max(0, (baseH * scale - st.height) / 2) + slack;
    tx = clamp(tx, -mx, mx); ty = clamp(ty, -my, my);
  }
  const applyT = () => {
    img.classList.toggle("zoomed", scale > 1);
    el.classList.toggle("is-zoomed", scale > 1);
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };
  const reset = () => { scale = 1; tx = 0; ty = 0; applyT(); };

  function zoomAt(s, e) {
    if (!baseW) measure();
    const stage = el.querySelector(".lb-stage").getBoundingClientRect();
    const ox = (e.clientX - (stage.left + stage.width / 2) - tx) / scale;
    const oy = (e.clientY - (stage.top + stage.height / 2) - ty) / scale;
    scale = s; tx = -ox * (s - 1); ty = -oy * (s - 1);
    clampT(); applyT();
  }

  function render() {
    const it = items[i];
    reset(); baseW = baseH = 0;
    img.style.opacity = 0;
    const show = () => {
      img.src = it.src; img.style.opacity = 1;
      requestAnimationFrame(() => requestAnimationFrame(measure));
    };
    const pre = new Image();
    pre.onload = show; pre.src = it.src;
    if (pre.complete) show();
    img.alt = it.title || "";
    capEl.innerHTML = (it.title ? `<b>${it.title}</b>` : "") + (it.caption || "");
    countEl.textContent = items.length > 1 ? `${i + 1} / ${items.length}` : "";
    const multi = items.length > 1;
    el.querySelector(".lb-prev").style.display = multi ? "grid" : "none";
    el.querySelector(".lb-next").style.display = multi ? "grid" : "none";
  }
  function go(step) { if (items.length < 2) return; i = (i + step + items.length) % items.length; render(); }
  function open(list, index = 0) {
    if (!el) build();
    items = list; i = index; render();
    el.classList.add("open");
    requestAnimationFrame(() => el.classList.add("show"));
    document.body.style.overflow = "hidden";
  }
  function close() {
    el.classList.remove("show");
    document.body.style.overflow = "";
    setTimeout(() => el.classList.remove("open"), 300);
  }
  return { open, close };
})();
window.Lightbox = Lightbox;

/* auto-wire any [data-lightbox] set on the page */
(() => {
  const nodes = [...document.querySelectorAll("[data-lightbox]")];
  if (!nodes.length) return;
  const items = nodes.map(n => ({
    src: n.dataset.full || n.querySelector("img")?.src,
    title: n.dataset.title || "",
    caption: n.dataset.caption || ""
  }));
  nodes.forEach((n, idx) => {
    n.style.cursor = "zoom-in";
    n.addEventListener("click", e => { e.preventDefault(); Lightbox.open(items, idx); });
  });
})();

/* Safari on iOS tints the status bar with theme-color. Each page ships its own
   value in the head, measured off the top 26px of that page at iPhone width, so
   the bar reads as an extension of the sky rather than a white shelf above it.
   Once the nav goes solid the bar has to follow it to paper, or a sky-blue strip
   sits above a cream header. */
{
  const meta = document.querySelector('meta[name="theme-color"]');
  const navEl = document.querySelector("nav");
  if (meta && navEl) {
    const TOP = meta.getAttribute("content"), LIGHT = "#F7F5F0";
    const sync = () => {
      const solid = navEl.classList.contains("solid") ||
                    document.body.classList.contains("menu-open");
      meta.setAttribute("content", solid ? LIGHT : TOP);
    };
    new MutationObserver(sync).observe(navEl, { attributes: true, attributeFilter: ["class"] });
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    sync();
  }
}
