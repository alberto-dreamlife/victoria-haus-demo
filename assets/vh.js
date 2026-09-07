/* ============================================================
   VICTORIA HAUS — the house behaviour, second edition

   The pages that are not the deck still need what the deck taught us:
   a header that gets out of the way, pictures that arrive out of focus,
   a fan that deals itself, and a registration that asks one thing at a
   time. All of it is opt-in from the markup, so a page that carries
   none of these hooks is untouched.

   Loaded after site.js, whose lightbox, drawer and video loops it does
   not replace.
   ============================================================ */
(function () {
  "use strict";
  var calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- storage that fails open ---------- */
  function store(area, key, val) {
    try {
      return val === undefined ? window[area].getItem(key) : window[area].setItem(key, val);
    } catch (e) { return null; }
  }

  /* ============================================================
     HEADER — away while you are going down, back when you ask
     ============================================================ */
  (function () {
    var nav = document.querySelector("body > nav");
    if (!nav) return;
    var last = scrollY, queued = false;
    function paint() {
      queued = false;
      var y = scrollY;
      if (document.body.classList.contains("menu-open")) { last = y; return; }
      var down = y > last + 5, up = y < last - 5;
      if (down && y > innerHeight * 0.5) nav.classList.add("away");
      else if (up || y < 80) nav.classList.remove("away");
      if (down || up) last = y;
    }
    addEventListener("scroll", function () {
      if (queued) return;
      queued = true; requestAnimationFrame(paint);
    }, { passive: true });

    /* site.js paints the iOS status bar to match a cream header; this one is
       glass over the picture, so the bar follows the glass instead. Registered
       after site.js, so on the same class change it has the last word. */
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var top = meta.getAttribute("content");
      var sync = function () {
        meta.setAttribute("content", nav.classList.contains("solid") ? "#17150F" : top);
      };
      new MutationObserver(sync).observe(nav, { attributes: true, attributeFilter: ["class"] });
      sync();
    }
  })();

  /* ============================================================
     THE OPENING PLATE — the picture resolves once the page settles
     ============================================================ */
  (function () {
    var head = document.querySelector(".page-head, .hero.sub");
    if (!head) return;
    var lift = function () { head.classList.add("lit"); };
    if (calm) { lift(); return; }
    /* a beat after paint, so the resolve is something you watch rather
       than something that has already happened */
    if (document.readyState === "complete") setTimeout(lift, 260);
    else addEventListener("load", function () { setTimeout(lift, 260); });
    /* and a floor, in case one asset never resolves and load never fires:
       a permanently blurred header would be indistinguishable from a bug */
    setTimeout(lift, 2600);
  })();

  /* ============================================================
     THE FIELD — the ground the whole page stands on. It was a blurred
     copy of the page's own picture; it is painted now, because nothing
     in the scroll path may filter anything.
     ============================================================ */
  (function () {
    if (document.querySelector(".vh-ground") || document.querySelector(".deck")) return;
    var g = document.createElement("div");
    g.className = "vh-ground";
    g.setAttribute("aria-hidden", "true");
    document.body.appendChild(g);
  })();

  /* ============================================================
     THE DECK — the homepage's engine, made portable.

     Build 002: the stacking is gone. Plates used to be sticky and ride up
     over each other; they are ordinary full-height blocks in ordinary flow
     now. The two numbers are unchanged, what they drive is not:

       --in   0 to 1 while the plate arrives — fades its content in
       --out  0 to 1 while it leaves — drifts the picture in its frame

     Both are eased toward their target rather than snapped to the raw
     scroll position, which is what turns a trackpad's stepping into a
     glide. The loop parks itself once every plate has settled.
     ============================================================ */
  (function () {
    var deck = document.querySelector("[data-deck]");
    if (!deck) return;
    var panels = [].slice.call(deck.querySelectorAll(".panel"));
    if (!panels.length) return;
    var grounds = [].slice.call(deck.querySelectorAll(".bleed img"));
    var tops = [], cur = [], running = false, act = -1;
    panels.forEach(function () { cur.push({ i: 1, o: 0 }); });

    function measure() { tops = panels.map(function (p) { return p.offsetTop; }); paint(true); }

    function paint(snap) {
      var vh = innerHeight, y = scrollY, moving = false;
      for (var i = 0; i < panels.length; i++) {
        var p = panels[i], t = tops[i];
        var tin = (y - t + vh) / vh, tout = (y - t) / vh;
        tin = tin < 0 ? 0 : tin > 1 ? 1 : tin;
        tout = tout < 0 ? 0 : tout > 1 ? 1 : tout;
        var c = cur[i];
        if (snap || calm) { c.i = tin; c.o = tout; }
        else {
          c.i += (tin - c.i) * 0.14;
          c.o += (tout - c.o) * 0.14;
          if (Math.abs(tin - c.i) > 0.0006 || Math.abs(tout - c.o) > 0.0006) moving = true;
        }
        if (Math.abs(c.i - tin) < 0.0015) c.i = tin;
        if (Math.abs(c.o - tout) < 0.0015) c.o = tout;
        p.style.setProperty("--in", c.i.toFixed(4));
        p.style.setProperty("--out", c.o.toFixed(4));

        if (tin === 1 && tout < 0.5 && act !== i) {
          if (act > -1) panels[act].classList.remove("act");
          panels[i].classList.add("act");
          if (grounds[i]) {
            grounds.forEach(function (g) { g.classList.remove("on"); });
            grounds[i].classList.add("on");
          }
          act = i;
        }
      }
      return moving;
    }
    function frame() { running = paint(false); if (running) requestAnimationFrame(frame); }
    function wake() { if (running) return; running = true; requestAnimationFrame(frame); }

    addEventListener("scroll", wake, { passive: true });
    addEventListener("resize", measure, { passive: true });
    addEventListener("load", measure);
    measure();
  })();

  /* ============================================================
     THE FAN — one axis, real perspective
     Markup: a .stage holding a .rail of .slide children, plus optional
     .dots and [data-fan-prev] / [data-fan-next] controls in the same
     block. Everything below reads the DOM rather than a config.
     ============================================================ */
  [].forEach.call(document.querySelectorAll("[data-fan]"), function (root) {
    var rail = root.querySelector(".rail");
    var stage = root.querySelector(".stage");
    if (!rail || !stage) return;
    var cards = [].slice.call(rail.querySelectorAll(".slide"));
    var n = cards.length;
    if (!n) return;
    var dots = root.querySelector(".dots");
    var cur = 0, SX = 64;

    function gauge() { SX = innerWidth < 760 ? 52 : 64; }
    gauge();

    if (dots) {
      cards.forEach(function (c, i) {
        var b = document.createElement("button");
        b.type = "button";
        var nm = c.querySelector(".nm b");
        b.setAttribute("aria-label", "Show " + (nm ? nm.textContent : "item " + (i + 1)));
        b.addEventListener("click", function () { go(i); });
        dots.appendChild(b);
      });
    }

    function layout() {
      for (var i = 0; i < n; i++) {
        var d = i - cur;
        if (d > n / 2) d -= n;
        if (d < -n / 2) d += n;
        var a = Math.abs(d), c = cards[i];
        c.style.transform =
          "translateX(" + (d * SX) + "%) translateZ(" + (-a * 150) + "px) " +
          "rotateY(" + (-d * 26) + "deg) scale(" + (1 - a * 0.035) + ")";
        c.style.opacity = a > 2.1 ? 0 : (1 - a * 0.16);
        c.style.zIndex = String(60 - Math.round(a * 10));
        c.style.pointerEvents = a > 2.1 ? "none" : "auto";
        c.classList.toggle("is-cur", d === 0);
        c.setAttribute("tabindex", d === 0 ? "0" : "-1");
        c.setAttribute("aria-hidden", d === 0 ? "false" : "true");
        if (dots) dots.children[i].setAttribute("aria-current", i === cur ? "true" : "false");
      }
    }
    function go(i) { cur = (i % n + n) % n; layout(); }
    layout();
    addEventListener("resize", function () { gauge(); layout(); }, { passive: true });

    /* deal the cards the first time the block is on screen, and only then */
    if (calm || !("IntersectionObserver" in window)) rail.classList.add("live");
    else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.disconnect();
          setTimeout(function () { rail.classList.add("live"); layout(); }, 200);
        });
      }, { threshold: 0.25 });
      io.observe(root);
    }

    var prev = root.querySelector("[data-fan-prev]");
    var next = root.querySelector("[data-fan-next]");
    if (prev) prev.addEventListener("click", function () { go(cur - 1); });
    if (next) next.addEventListener("click", function () { go(cur + 1); });

    /* A card that is not in front is a way of turning the fan, not a link:
       clicking it brings it forward and goes nowhere. */
    cards.forEach(function (c, i) {
      c.addEventListener("click", function (e) {
        if (i !== cur) { e.preventDefault(); e.stopPropagation(); go(i); }
      }, true);
    });

    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); }
    });
    stage.addEventListener("dragstart", function (e) { e.preventDefault(); });

    var x0 = null, moved = false;
    stage.addEventListener("pointerdown", function (e) { x0 = e.clientX; moved = false; });
    stage.addEventListener("pointermove", function (e) {
      if (x0 === null || moved) return;
      var dx = e.clientX - x0;
      if (Math.abs(dx) > 45) { moved = true; go(cur + (dx < 0 ? 1 : -1)); }
    });
    function end() { x0 = null; }
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
  });

  /* ============================================================
     REGISTER — Build 013: this was still the 003-era engine, writing each
     answer into a live receipt on the left. These pages now carry the
     homepage's markup, which has no receipt and does have a step counter,
     a summary and a way back out of the confirmation — none of which the
     old engine knew about. Replaced wholesale, so there is one register.
     ============================================================ */
  /* ---------- register ----------
     Build 003. One question at a time, then a summary.

     What changed: answers used to be echoed into a receipt beside the form the
     instant they were given, which meant the left column spent the first half
     of the form as a list of em-dashes and the second half repeating what was
     still on screen. The summary now appears once, on submit, where somebody
     can actually check it before it counts — and there is a way back if it is
     wrong.

     TODO — WIRE THE SUBMISSION. Nothing leaves the browser yet: `payload`
     below is assembled and then handed to send(), which currently only
     resolves. Point send() at the real endpoint (Formspree / HubSpot / the
     CRM of record) when that is decided, keep the returned promise, and let
     the catch branch surface a failure rather than showing the confirmation.  */
  (function(){
    var form = document.getElementById("regForm");
    if (!form) return;
    var steps = [].slice.call(form.querySelectorAll(".rg-step"));
    var rail  = [].slice.call(document.querySelectorAll("#rgRail i"));
    var errEl = document.getElementById("rgErr");
    var back  = document.getElementById("rgBack");
    var go    = document.getElementById("rgGo");
    var acts  = document.getElementById("rgActs");
    var done  = document.getElementById("rgDone");
    var count = document.getElementById("rgCount");
    var sum   = document.getElementById("rgSum");
    var at = 0, touched = false;
    var said = {};

    function err(m){
      errEl.textContent = m || "";
      errEl.classList.toggle("on", !!m);
    }

    function show(i){
      at = i;
      steps.forEach(function(s, n){ s.classList.toggle("is-on", n === i); });
      rail.forEach(function(r, n){ r.classList.toggle("on", n <= i); });
      back.classList.toggle("on", i > 0);
      count.textContent = "Step " + (i + 1) + " of " + steps.length;
      go.firstChild.nodeValue = i === steps.length - 1 ? "Register " : "Continue ";
      err("");
      if (!touched) return;
      var f = steps[i].querySelector("input, .chips button");
      if (f) setTimeout(function(){ f.focus({ preventScroll: true }); }, 380);
    }

    /* chips behave as one choice each */
    function wireChips(id, key){
      var box = document.getElementById(id);
      if (!box) return;
      var btns = [].slice.call(box.querySelectorAll("button"));
      btns.forEach(function(b){
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", function(){
          btns.forEach(function(o){ o.setAttribute("aria-pressed", String(o === b)); });
          said[key] = b.dataset.v;
          err("");
        });
      });
    }
    wireChips("rgHomes", "home");
    wireChips("rgRep",   "rep");

    function check(){
      if (at === 0){
        var f = document.getElementById("rgFirst").value.trim();
        var l = document.getElementById("rgLast").value.trim();
        if (!f) { err("A first name is enough to start."); return false; }
        said.name = (f + " " + l).trim();
        return true;
      }
      if (at === 1){
        var e = document.getElementById("rgEmail").value.trim();
        if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e)) { err("That address does not look complete."); return false; }
        said.email = e;
        return true;
      }
      if (at === 2){
        if (!said.home) { err("Pick one, or tell us you are still deciding."); return false; }
        return true;
      }
      if (at === 3){
        if (!said.rep) { err("One more, then you are done."); return false; }
        var ph = document.getElementById("rgPhone").value.trim();
        said.phone = ph || "";
        return true;
      }
      return true;
    }

    /* TODO: replace with the real POST. Must return a promise. */
    function send(payload){
      return Promise.resolve(payload);
    }

    function row(label, value){
      if (!value) return "";
      return "<div><dt>" + label + "</dt><dd>" +
             String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;") +
             "</dd></div>";
    }

    function finish(){
      var first = (said.name || "").split(" ")[0];
      document.getElementById("rgDoneH").textContent =
        first ? "Thank you, " + first + "." : "You are on the list.";
      document.getElementById("rgDoneP").textContent =
        "Plans, pricing and the preview date come to you before anything is said publicly. Here is what we have:";

      sum.innerHTML = row("Name", said.name) + row("Email", said.email) +
                      row("Home", said.home) + row("Realtor", said.rep) +
                      row("Phone", said.phone);

      steps.forEach(function(s){ s.classList.remove("is-on"); });
      rail.forEach(function(r){ r.classList.add("on"); });
      count.textContent = "Registered";
      acts.hidden = true;
      errEl.hidden = true;
      done.hidden = false;
      /* move the reading position to the confirmation without stealing focus
         from anyone who is not using a pointer */
      done.focus({ preventScroll: true });
    }

    form.addEventListener("submit", function(e){
      e.preventDefault();
      touched = true;
      if (!check()) return;
      if (at < steps.length - 1){ show(at + 1); return; }

      go.disabled = true;
      send({
        name: said.name, email: said.email, home: said.home,
        rep: said.rep, phone: said.phone, project: "Victoria Haus"
      }).then(finish).catch(function(){
        go.disabled = false;
        err("That did not go through. Try again, or email hello@victoriahaus.ca.");
      });
    });

    back.addEventListener("click", function(){ touched = true; if (at > 0) show(at - 1); });

    /* the way back out of the confirmation, if the summary is wrong */
    document.getElementById("rgEdit").addEventListener("click", function(){
      done.hidden = true;
      acts.hidden = false;
      errEl.hidden = false;
      go.disabled = false;
      touched = true;
      show(0);
    });

    /* Enter moves forward from any field rather than submitting the lot */
    form.addEventListener("keydown", function(e){
      if (e.key !== "Enter") return;
      if (e.target.tagName === "BUTTON" && e.target.type === "button") return;
      e.preventDefault();
      form.requestSubmit ? form.requestSubmit() : go.click();
    });

    show(0);
  })();

  /* Build 026: the cookie bar and its script were removed. */


  /* ============================================================
     BUILD 004 — the reveal system and the footer drift, shared with
     every page but index.html, which carries its own copy because it
     does not load this file.
     ============================================================ */

/* ---------- the reveal, and the counters ----------
   Build 003. Everything marked data-rv arrives on entering view: a short
   rise and fade, staggered by its own --d. Two rules make this safe rather
   than fragile:

     1. The element is visible by default. The hidden state is added by this
        script (body.rv-on), so if the JS never runs, or an observer is
        unsupported, the page is simply a page with all its content in it —
        never a screen of invisible divs.
     2. Under prefers-reduced-motion nothing is hidden at all and the
        counters print their final number immediately.

   The walk-time numbers count up because the number IS the content there;
   it is the one animation on this page carrying meaning rather than
   decoration, so it is the one that earns the extra code.              */
(function(){
  var calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = [].slice.call(document.querySelectorAll("[data-rv]"));
  if (!items.length) return;

  function settle(el){
    el.classList.add("rv-in");
    /* Build 015: this used to look only inside .wk, so the homepage's walk
       board counted and the neighbourhood's identical board did not. Any
       revealed element that contains a [data-count] now counts. */
    [].forEach.call(el.querySelectorAll("[data-count]"), count);
    if (el.hasAttribute("data-count")) count(el);
  }

  function count(el){
    var to = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(to)) return;
    if (calm){ el.textContent = to; return; }
    var t0 = null, ms = 900;
    /* the delay the card already carries, so the number starts with its card */
    var wait = parseFloat((el.closest("[data-rv]") || el).style.getPropertyValue("--d")) || 0;
    el.textContent = "0";
    setTimeout(function(){
      requestAnimationFrame(function step(t){
        if (t0 === null) t0 = t;
        var k = Math.min((t - t0) / ms, 1);
        k = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * k);
        if (k < 1) requestAnimationFrame(step);
        else el.textContent = to;
      });
    }, wait);
  }

  if (calm || !("IntersectionObserver" in window)){
    items.forEach(settle);
    return;
  }

  document.body.classList.add("rv-on");

  /* Two observers, because two kinds of thing are arriving.

     The ordinary one is generous: -18% off the bottom and a low threshold, so
     copy and cards are already settled by the time they are under your eye.

     The late one is for anything that IS the content rather than decoration —
     the walk-time counters. Those were running while the section was still a
     third off the bottom of the window, so by the time you had scrolled to
     them the numbers had finished counting and you saw a static board. They
     wait for -32% and half the element in view, which puts the count under
     the reader rather than ahead of them. */
  function watch(sel, opts){
    var list = items.filter(sel);
    if (!list.length) return;
    var io = new IntersectionObserver(function(rows){
      rows.forEach(function(r){
        if (!r.isIntersecting) return;
        settle(r.target);
        io.unobserve(r.target);
      });
    }, opts);
    list.forEach(function(el){ io.observe(el); });
  }
  /* Build 026: both observers pull the bottom edge in — that is the whole
     point of them, so a thing has settled before it is under your eye. But it
     means anything already sitting in the lowest fifth of the FIRST screen is
     not intersecting at load, and stays hidden until you scroll past it and
     come back. That is not an entrance, it is a missing element. Anything
     visible on arrival is settled on arrival; the observers keep the rest. */
  var vh0 = window.innerHeight || document.documentElement.clientHeight;
  items = items.filter(function(el){
    var r = el.getBoundingClientRect();
    if (r.top < vh0 && r.bottom > 0){ settle(el); return false; }
    return true;
  });

  watch(function(el){ return el.hasAttribute("data-rv-late"); },
        { rootMargin: "0px 0px -32% 0px", threshold: 0.5 });
  watch(function(el){ return !el.hasAttribute("data-rv-late"); },
        { rootMargin: "0px 0px -18% 0px", threshold: 0.15 });
})();



/* site.js paints the iOS status bar to match a cream header. This one is
   smoked glass over the picture, so the bar follows the glass instead.
   Registered after site.js, so on the same class change this observer runs
   second and has the last word. */
(function(){
  var meta = document.querySelector('meta[name="theme-color"]');
  var nav  = document.querySelector("body > nav");
  if (!meta || !nav) return;
  var sync = function(){
    meta.setAttribute("content", nav.classList.contains("solid") ? "#17150F" : "#5C7690");
  };
  new MutationObserver(sync).observe(nav, { attributes: true, attributeFilter: ["class"] });
  sync();
})();

/* ---------- the footer picture ----------
   Build 004: one number, --fp, running 0 to 1 while the footer crosses the
   window, drifting the picture behind it. Same shape as the deck's --out, kept
   separate because the footer is outside the deck and has no plate of its own.
   Off entirely under reduced motion. */
(function(){
  var foot = document.getElementById("site-foot");
  if (!foot) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var queued = false;
  function paint(){
    queued = false;
    var r = foot.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    var k = 1 - (r.top / innerHeight);
    foot.style.setProperty("--fp", Math.max(0, Math.min(k, 1)).toFixed(3));
  }
  addEventListener("scroll", function(){
    if (queued) return;
    queued = true; requestAnimationFrame(paint);
  }, { passive: true });
  addEventListener("resize", paint, { passive: true });
  paint();
})();

})();
