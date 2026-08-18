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

/* ---------- video loops without a cut ----------
   None of these clips close: the last frame differs from the first by 25 to 60
   percent of the picture, so the loop attribute produces a visible jump every
   few seconds. Instead the clip fades out over its tail, restarts, and fades
   back in. The still underneath every video is that video's own first frame, so
   the fade lands exactly where the restart begins and the seam disappears.

   data-loop           fade in when it starts playing
   data-loop="0,6"     the same, and treat 6s as the end
   data-replay="0.7"   length of the dissolve, default 0.7s, 0 disables it
   ============================================================ */
function vhLoop(v) {
  const show = () => v.classList.add("playing");
  v.addEventListener("playing", show, { once: true });
  v.addEventListener("loadeddata", show, { once: true });
  if (v.readyState >= 2) show();

  /* iOS sometimes refuses the first autoplay; one nudge on the first touch. */
  const kick = () => { v.play().catch(() => {}); };
  document.addEventListener("touchstart", kick, { once: true, passive: true });

  const tail = v.dataset.replay === undefined ? 0.7 : parseFloat(v.dataset.replay);
  const [inAt, outAt] = (v.dataset.loop || "").split(",").map(parseFloat);
  const from = inAt > 0 ? inAt : 0;
  if (from > 0) v.addEventListener("loadedmetadata", () => { v.currentTime = from; }, { once: true });
  if (!(tail > 0)) return;                     /* explicit data-replay="0" opts out */

  let armed = false;
  const restart = () => {
    v.currentTime = from;
    v.play().catch(() => {});
    /* Two frames, not one: clearing the class in the same tick as the seek lets
       the browser fold both into a single paint and the fade never renders. */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      v.classList.remove("fading"); armed = false;
    }));
  };
  v.addEventListener("ended", restart);
  (function tick() {
    const end = outAt > 0 ? outAt : v.duration;
    if (end && !v.paused) {
      if (!armed && end - v.currentTime <= tail) { armed = true; v.classList.add("fading"); }
      if (v.currentTime >= end && armed) restart();
    }
    requestAnimationFrame(tick);
  })();
}
document.querySelectorAll("video[data-loop]").forEach(vhLoop);

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
        if (!open.closest(".media").hasAttribute("data-crossloop")) {
          setTimeout(() => { open.pause(); open.removeAttribute("src"); open.load(); }, 700);
        } else {
          setTimeout(() => open.pause(), 700);   /* kept for the loop, just idle */
        }
      }).catch(() => {});
    };
    hq.addEventListener("canplaythrough", handover, { once: true });
    if (hq.readyState === 4) handover();
  }
}

/* ---------- looping with motion on both sides of the seam ----------
   The dissolve used everywhere else fades the clip out over its own opening
   still, which works because that still is the video's first frame. On this
   header there should be nothing frozen at all, so the two layers hand the loop
   back and forth instead: as the visible one runs out, the other starts from
   zero underneath and the top one fades away over it. Both are moving through
   the whole transition, so the clip never comes to rest. Same file twice, one
   light and one full quality, which is what these headers already load. */
{
  const box = document.querySelector(".hero .media[data-crossloop]");
  if (box) {
    const top = box.querySelector("video.v-hq");
    const under = box.querySelector("video.v-open");
    if (top && under) {
      const TAIL = 0.8;
      let live = null, armed = false;

      const begin = v => {
        live = v; armed = false;
        v.currentTime = 0;
        v.play().catch(() => {});
        top.classList.toggle("fading", v !== top);
      };
      /* Whichever layer starts first drives the loop. Normally that is the
         opener for a second or two, then the master takes it over for good. */
      under.addEventListener("playing", () => { if (!live) live = under; }, { once: true });
      top.addEventListener("playing", () => { live = top; armed = false; }, { once: true });

      (function tick() {
        requestAnimationFrame(tick);
        if (!live || live.paused) return;
        const d = live.duration;
        if (!d || armed || d - live.currentTime > TAIL) return;
        armed = true;
        const next = live === top ? under : top;
        if (next.readyState < 3) {          /* nothing to dissolve into yet */
          live.currentTime = 0; armed = false; return;
        }
        const done = live;
        begin(next);
        /* Let the outgoing layer finish its own last frames under the fade
           rather than cutting it, then park it ready for its next turn. */
        setTimeout(() => { done.pause(); done.currentTime = 0; }, TAIL * 1000);
      })();
    }
  }
}

/* ---------- the header title clears out on the first scroll ---------- */
{
  const cap = document.querySelector(".hero .hero-inner[data-fade]");
  const hero = document.querySelector(".hero");
  if (cap && hero) {
    let queued = false;
    const paint = () => {
      queued = false;
      const travel = hero.offsetHeight * 0.55;
      const k = Math.min(1, Math.max(0, scrollY / travel));
      cap.style.opacity = String(1 - k);
      cap.style.transform = `translate3d(0, ${(-k * 34).toFixed(1)}px, 0)`;
    };
    addEventListener("scroll", () => {
      if (queued) return;
      queued = true; requestAnimationFrame(paint);
    }, { passive: true });
    paint();
  }
}

/* ---------- in-page video ----------
   A 24 MB master below the fold should not be fetched with the page, so the file
   lives in data-src and is only attached when the block is one screen away. It
   plays once and holds: the clip is a one-way move, so looping it would cut. */
{
  const vids = document.querySelectorAll("video.fig-vid[data-src]");
  if (vids.length && "IntersectionObserver" in window) {
    const vio = new IntersectionObserver((es, o) => es.forEach(e => {
      if (!e.isIntersecting) return;
      const v = e.target;
      o.unobserve(v);
      /* Reveal on the first decoded frame, not only on "playing": if autoplay is
         refused the video still has a frame to show and would otherwise sit at
         opacity 0 behind a still that is already its own first frame. */
      v.src = v.dataset.src;
      v.load();
      vhLoop(v);                 /* same fade-in and same seamless replay */
      /* data-rate slows playback without touching the file. Measured on this
         clip, consecutive frames differ by 1.33/255 on average, so at 0.2x each
         frame holds 208ms and the drift still reads as continuous rather than
         stepping. Setting it after load() because a fresh src resets the rate. */
      const rate = parseFloat(v.dataset.rate);
      if (rate > 0) {
        v.playbackRate = rate;
        v.addEventListener("loadedmetadata", () => { v.playbackRate = rate; }, { once: true });
      }
      v.play().catch(() => {});
    }), { rootMargin: "100% 0px" });
    vids.forEach(v => vio.observe(v));
  }
}

/* ---------- depth on scroll ----------
   Anything with data-depth drifts against the page as it passes the viewport,
   which is what stops a long column of stills from reading as flat. Every layer
   is oversized in CSS by more than the drift, so nothing can expose an edge, and
   it is skipped entirely for anyone who asks for reduced motion. */
{
  const layers = [...document.querySelectorAll("[data-depth]")];
  if (layers.length && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let queued = false;
    const paint = () => {
      queued = false;
      const vh = innerHeight;
      for (const el of layers) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -240 || r.top > vh + 240) continue;
        const k = (r.top + r.height / 2 - vh / 2) / vh;       /* roughly -1 to 1 */
        const d = parseFloat(el.dataset.depth) || 30;
        el.style.transform = `translate3d(0, ${(k * d).toFixed(1)}px, 0)`;
      }
    };
    addEventListener("scroll", () => {
      if (queued) return;
      queued = true; requestAnimationFrame(paint);
    }, { passive: true });
    addEventListener("resize", paint, { passive: true });
    paint();
  }
}

/* reveal */
const io = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: .1, rootMargin: "0px 0px -50px 0px" });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

/* hero parallax */
const heroMedia = document.querySelector(".hero .media:not([data-noparallax])");
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

/* ---------- full screen viewer ----------
   One stage, two possible occupants: a still or a clip. What you click in the
   page is what opens. A figure carrying a clip used to open that clip's own
   first frame as a photograph, so you watched a move finish and were then sent
   back to its beginning, frozen. Stills keep the zoom and the pan. Clips get
   the browser's own controls and no zoom, because the controls need the pointer
   and nobody opens a video in order to magnify it. */
const Lightbox = (() => {
  let items = [], i = 0, el = null, img = null, vid = null, capEl = null, countEl = null;
  let scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0, px = 0, py = 0;
  let baseW = 0, baseH = 0, moved = false;
  const MAXS = 4;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const isVid = () => !!(items[i] && items[i].video);
  const media = () => (isVid() ? vid : img);

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
      <div class="lb-stage">
        <img alt="">
        <video class="lb-vid" playsinline controls loop muted preload="none"></video>
      </div>
      <div class="lb-bar">
        <div class="lb-cap"></div>
        <div class="lb-count"></div>
      </div>`;
    document.body.appendChild(el);
    img = el.querySelector("img");
    vid = el.querySelector("video");
    capEl = el.querySelector(".lb-cap");
    countEl = el.querySelector(".lb-count");

    el.querySelector(".lb-close").addEventListener("click", close);
    el.querySelector(".lb-prev").addEventListener("click", e => { e.stopPropagation(); go(-1); });
    el.querySelector(".lb-next").addEventListener("click", e => { e.stopPropagation(); go(1); });
    el.addEventListener("click", e => {
      if (e.target === el || e.target.classList.contains("lb-stage")) close();
    });

    /* Clicking the clip, or its controls, must not reach the backdrop handler
       above: pressing play would otherwise close the viewer. */
    vid.addEventListener("click", e => e.stopPropagation());

    /* click to toggle zoom — skipped if the pointer was dragged, otherwise
       every pan would end in a click that resets the zoom */
    img.addEventListener("click", e => {
      e.stopPropagation();
      if (moved) { moved = false; return; }
      if (scale > 1) { reset(); } else { zoomAt(2.2, e); }
    });

    /* wheel zoom, anchored on the cursor */
    el.addEventListener("wheel", e => {
      if (isVid()) return;
      e.preventDefault();
      const next = clamp(scale * (e.deltaY < 0 ? 1.16 : 0.86), 1, MAXS);
      if (next === 1) { reset(); return; }
      zoomAt(next, e);
    }, { passive: false });

    /* drag to pan */
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

    /* swipe between items when not zoomed. Skipped on a clip, where a
       horizontal drag is how you scrub. */
    let tsx = 0, tsy = 0;
    el.addEventListener("touchstart", e => {
      tsx = e.touches[0].clientX; tsy = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", e => {
      if (scale > 1 || items.length < 2 || isVid()) return;
      const dx = e.changedTouches[0].clientX - tsx;
      const dy = e.changedTouches[0].clientY - tsy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    document.addEventListener("keydown", e => {
      if (!el.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    });
  }

  /* Size of the media with no transform applied. Panning limits are derived
     from this, so it has to be measured while the transform is off. */
  function measure() {
    const m = media();
    const prev = m.style.transform;
    m.style.transform = "none";
    const r = m.getBoundingClientRect();
    baseW = r.width; baseH = r.height;
    m.style.transform = prev;
  }

  /* Keep the image reachable: you can always pan far enough to bring any edge
     into view, plus a little slack so the bottom clears the caption, but never
     so far that it drifts off into empty space. */
  function clampT() {
    const st = el.querySelector(".lb-stage").getBoundingClientRect();
    const slack = 90;
    const mx = Math.max(0, (baseW * scale - st.width) / 2) + slack;
    const my = Math.max(0, (baseH * scale - st.height) / 2) + slack;
    tx = clamp(tx, -mx, mx);
    ty = clamp(ty, -my, my);
  }

  const applyT = () => {
    const m = media();
    m.classList.toggle("zoomed", scale > 1);
    el.classList.toggle("is-zoomed", scale > 1);
    m.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };
  const reset = () => { scale = 1; tx = 0; ty = 0; applyT(); };

  /* Anchor the zoom on the pointer: a point sitting ox from the centre lands at
     ox*s after scaling, so it needs translating back by -ox*(s-1) to stay put. */
  function zoomAt(s, e) {
    if (!baseW) measure();
    const stage = el.querySelector(".lb-stage").getBoundingClientRect();
    const centreX = stage.left + stage.width / 2;
    const centreY = stage.top + stage.height / 2;
    const ox = (e.clientX - centreX - tx) / scale;
    const oy = (e.clientY - centreY - ty) / scale;
    scale = s;
    tx = -ox * (s - 1);
    ty = -oy * (s - 1);
    clampT(); applyT();
  }

  /* Release the decoder rather than leaving a 1080p clip running behind a
     closed viewer or an image that replaced it. */
  function dropVideo() {
    vid.pause();
    vid.removeAttribute("src");
    vid.load();
  }

  function render() {
    const it = items[i];
    reset();
    baseW = baseH = 0;
    el.classList.toggle("is-video", !!it.video);

    if (it.video) {
      img.style.display = "none";
      vid.style.display = "";
      /* The still is the poster, so the first frame is already on screen while
         the file loads and the stage never opens on a black rectangle. */
      if (it.src) vid.poster = it.src;
      if (vid.getAttribute("src") !== it.video) {
        vid.setAttribute("src", it.video);
        vid.load();
      }
      vid.currentTime = 0;
      vid.play().catch(() => {});
      requestAnimationFrame(() => requestAnimationFrame(measure));
    } else {
      dropVideo();
      vid.style.display = "none";
      img.style.display = "";
      img.style.opacity = 0;
      const show = () => {
        img.src = it.src;
        img.style.opacity = 1;
        /* measure once the browser has laid the new image out */
        requestAnimationFrame(() => requestAnimationFrame(measure));
      };
      const pre = new Image();
      pre.onload = show;
      pre.src = it.src;
      if (pre.complete) show();
    }

    img.alt = it.title || "";
    capEl.innerHTML = (it.title ? `<b>${it.title}</b>` : "") + (it.caption || "");
    countEl.textContent = items.length > 1 ? `${i + 1} / ${items.length}` : "";
    const multi = items.length > 1;
    el.querySelector(".lb-prev").style.display = multi ? "grid" : "none";
    el.querySelector(".lb-next").style.display = multi ? "grid" : "none";
  }

  function go(step) {
    if (items.length < 2) return;
    i = (i + step + items.length) % items.length;
    render();
  }

  function open(list, index = 0) {
    if (!el) build();
    items = list; i = index;
    render();
    el.classList.add("open");
    requestAnimationFrame(() => el.classList.add("show"));
    document.body.style.overflow = "hidden";
  }

  function close() {
    vid.pause();
    el.classList.remove("show");
    document.body.style.overflow = "";
    setTimeout(() => { el.classList.remove("open"); dropVideo(); }, 300);
  }

  return { open, close };
})();
window.Lightbox = Lightbox;

/* ---------- auto-wire any [data-lightbox] on the page ----------
   A figure that carries a clip opens as that clip. The file is usually still in
   data-src at this point, because in-page clips are only attached once their
   block is a screen away, so the viewer reads the same attribute rather than
   waiting for the block to load. */
(() => {
  const nodes = [...document.querySelectorAll("[data-lightbox]")];
  if (!nodes.length) return;
  const items = nodes.map(n => {
    const v = n.querySelector("video");
    const vsrc = v ? (v.dataset.src || v.getAttribute("src") || null) : null;
    return {
      src: n.dataset.full || n.querySelector("img")?.src,
      video: n.dataset.video || vsrc,
      title: n.dataset.title || "",
      caption: n.dataset.caption || ""
    };
  });
  nodes.forEach((n, idx) => {
    n.style.cursor = items[idx].video ? "pointer" : "zoom-in";
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
