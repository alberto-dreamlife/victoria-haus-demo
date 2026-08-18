/* ============================================================
   DEMO SALES ASSISTANT
   ------------------------------------------------------------
   A scripted stand-in for a real assistant. It runs entirely in the page: no
   request leaves the browser, no key is exposed, and it cannot invent a price
   or a completion date, which is the failure mode that actually matters on a
   pre-sale site. Questions it has not been taught are answered honestly and
   handed to the register form.

   To make it real, replace answer() with a call to whichever model the client
   wants and feed it the same PROJECT block as context. Everything else here,
   the panel, the suggestions, the transcript, stays as it is.
   ============================================================ */
(() => {
  const PROJECT = {
    name: "Victoria Haus",
    greeting: "Ask me about the homes, the floor plans or the neighbourhood.",
    chips: ["The homes", "Floor plans", "Price", "Neighbourhood", "Parking", "When can I move in"]
  };

  /* Each entry is a set of trigger words and the answer. First match wins, so
     the more specific entries are listed before the general ones. */
  const KB = [
    { k: ["price", "cost", "how much", "pricing", "afford", "deposit"],
      a: `Pricing has not been released yet. Register and you will get plans and pricing before the public launch, which is when the first homes are allocated.`,
      cta: true },

    { k: ["floor plan", "floorplan", "plan", "layout", "square", "sq ft", "size", "big"],
      a: `All four homes share one plan: 1,595 sq ft over three levels, three bedrooms and two and a half baths. You can walk it level by level on the <a href="floorplans.html">Floor Plans</a> page and compare up to three homes side by side.` },

    { k: ["home", "house", "unit", "how many", "bedroom", "townhome"],
      a: `Four homes on a single corner lot. Each one has three bedrooms, its own front door, its own garden patio and a private roof deck. <a href="homes.html">See the homes</a>.` },

    { k: ["roof", "deck", "terrace", "outdoor", "garden", "patio"],
      a: `Every home has two outdoor spaces: a garden patio off the ground floor and a private roof deck above the trees on the top level. Neither is shared.` },

    { k: ["parking", "car", "garage", "bike", "storage"],
      a: `Parking and storage details are part of the disclosure package rather than the website. Register and they will come to you with the plans.`,
      cta: true },

    /* No bare "park" here: it is a substring of "parking" and was answering the
       wrong question. Parking is matched first, below. */
    { k: ["neighbourhood", "neighborhood", "area", "location", "where", "address", "transit",
          "bus", "school", "lake", "shop", "nearby", "near by", "close to", "around", "walk"],
      a: `Victoria Drive at East 23rd Avenue, in Kensington-Cedar Cottage. Trout Lake is two blocks north, the 20 bus is at the corner, and Commercial Drive is about ten minutes on foot. There is an interactive map on the <a href="neighbourhood.html">Neighbourhood</a> page.` },

    { k: ["genkan", "entry", "entrance", "japandi", "japanese", "design", "style", "material", "finish"],
      a: `Every home opens into a genkan, the recessed entry vestibule of a Japanese house, where coats, boots and bicycles have somewhere to live. Beyond it the ground floor runs the full depth of the home in one line.` },

    { k: ["complete", "completion", "move in", "occupancy", "ready", "when", "timeline", "construction"],
      a: `The completion date is not published yet. Registered buyers hear first, and well before the public announcement.`,
      cta: true },

    { k: ["strata", "fee", "maintenance", "gst", "tax", "warranty", "deposit structure"],
      a: `That level of detail sits in the disclosure statement, which goes to registered buyers. I would rather point you there than guess at a number.`,
      cta: true },

    { k: ["register", "sign up", "contact", "agent", "realtor", "call", "email", "viewing", "tour", "visit"],
      a: `The registration form is at the bottom of every page, or write to <a href="mailto:hello@victoriahaus.ca">hello@victoriahaus.ca</a>. Realtors are welcome, there is a field on the form for it.`,
      cta: true },

    { k: ["who", "developer", "builder", "architect", "team"],
      a: `Everyone who worked on the project is named on the <a href="team.html">Team</a> page, from the developer through to the interior designer.` },

    { k: ["you", "bot", "ai", "real", "human", "demo", "chatgpt", "robot"],
      a: `I am a demo assistant built into this website. I answer from a fixed set of facts about the project rather than from a live model, which is why I will not invent a price. A production version connects to any AI platform you prefer, or to a model trained on your own sales material and disclosure documents.` }
  ];

  const FALLBACK = `I have not been taught that one. I am a demo version for this website, so I only answer from a small set of project facts. A production version connects to any AI platform, and you can train it on your own sales material. Try one of the suggestions, or register and a person will answer properly.`;

  /* ---------- markup ---------- */
  const root = document.createElement("div");
  root.className = "cb";
  root.innerHTML = `
    <button class="cb-launch" aria-label="Ask about ${PROJECT.name}" aria-expanded="false">
      <span class="cb-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.5 9.5 0 0 1-2.9-.4L3 21l1.6-4.8A8.3 8.3 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z"/>
        </svg>
      </span>
      <span class="cb-label">Ask about ${PROJECT.name}</span>
    </button>

    <div class="cb-panel" role="dialog" aria-label="Ask about ${PROJECT.name}" aria-hidden="true">
      <header class="cb-head">
        <div>
          <b>${PROJECT.name}</b>
          <span>Demo assistant</span>
        </div>
        <button class="cb-x" aria-label="Close">&#10005;</button>
      </header>
      <div class="cb-log" role="log" aria-live="polite"></div>
      <div class="cb-chips"></div>
      <form class="cb-form">
        <input class="cb-in" type="text" autocomplete="off" placeholder="Type a question"
               aria-label="Type a question">
        <button class="cb-send" aria-label="Send">&#8594;</button>
      </form>
      <p class="cb-note">Demo only. A production assistant connects to any AI platform, or to a model trained on your own material.</p>
    </div>`;
  document.body.appendChild(root);

  const launch = root.querySelector(".cb-launch");
  const panel  = root.querySelector(".cb-panel");
  const log    = root.querySelector(".cb-log");
  const chips  = root.querySelector(".cb-chips");
  const form   = root.querySelector(".cb-form");
  const input  = root.querySelector(".cb-in");

  /* ---------- transcript ---------- */
  const bubble = (who, html) => {
    const b = document.createElement("div");
    b.className = "cb-msg cb-" + who;
    b.innerHTML = html;
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  };

  /* A pause before replying, because an answer that lands the same millisecond
     the question is sent reads as a lookup table rather than a conversation. */
  const reply = html => {
    const dots = bubble("bot", `<span class="cb-typing"><i></i><i></i><i></i></span>`);
    setTimeout(() => {
      dots.classList.add("cb-in-place");
      dots.innerHTML = html;
      log.scrollTop = log.scrollHeight;
    }, 420 + Math.random() * 380);
  };

  const answer = q => {
    const s = q.toLowerCase();
    const hit = KB.find(e => e.k.some(w => s.includes(w)));
    if (!hit) return FALLBACK;
    return hit.cta
      ? `${hit.a} <a class="cb-cta" href="#register">Register &rarr;</a>`
      : hit.a;
  };

  const ask = q => {
    bubble("me", q.replace(/[<>]/g, ""));
    reply(answer(q));
  };

  PROJECT.chips.forEach(label => {
    const c = document.createElement("button");
    c.className = "cb-chip";
    c.textContent = label;
    c.addEventListener("click", () => ask(label));
    chips.appendChild(c);
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    ask(q);
  });

  /* ---------- open and close ---------- */
  let started = false;
  const setOpen = on => {
    root.classList.toggle("open", on);
    panel.setAttribute("aria-hidden", String(!on));
    launch.setAttribute("aria-expanded", String(on));
    if (on && !started) {
      started = true;
      bubble("bot", PROJECT.greeting);
    }
    if (on) setTimeout(() => input.focus(), 380);
  };
  launch.addEventListener("click", () => setOpen(!root.classList.contains("open")));
  root.querySelector(".cb-x").addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && root.classList.contains("open")) setOpen(false);
  });

  /* The label collapses to a circle once the visitor scrolls, so it stops
     competing with the page and becomes a permanent, quiet affordance. */
  addEventListener("scroll", () => {
    root.classList.toggle("cb-tight", scrollY > 400);
  }, { passive: true });
})();
