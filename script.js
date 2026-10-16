/* =========================================================
   FOR YOU — birthday website · script.js
   ========================================================= */
(() => {
  "use strict";

  /* ---------------------------------------------------------
     CONFIG — EDIT THESE
     ---------------------------------------------------------
     passcode : the code visitors type on the first page
                (not case-sensitive). NOTE: this runs in the
                browser, so it is a friendly gate, not real security.
     --------------------------------------------------------- */
  const CONFIG = {
    passcode: "1710",
    storageKey: "birthday-unlocked",
    /* EmailJS — every wish is also emailed to you (the receiver address is set
       inside the EmailJS template, not here). Fill these 3 values from your
       EmailJS dashboard. Leave them as "YOUR_..." to turn emailing off. */
    emailjs: {
      serviceId: "service_k98v5u8",     // Email Services → your Gmail service → Service ID
      templateId: "template_r6jc0z8",   // Email Templates → your template → Template ID
      publicKey: "pdePVZ960EaTX1hhj",     // Account → General → Public Key
    },
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- tiny safe storage helpers ---------- */
  const store = {
    get() { try { return sessionStorage.getItem(CONFIG.storageKey) === "1"; } catch { return false; } },
    set(v) { try { v ? sessionStorage.setItem(CONFIG.storageKey, "1") : sessionStorage.removeItem(CONFIG.storageKey); } catch { /* ignore */ } },
  };

  /* =========================================================
     ROUTER — three views: #/enter  #/home  #/story
     ========================================================= */
  const views = { enter: $("#view-gate"), home: $("#view-main"), story: $("#view-story") };
  let currentRoute = null;

  function route() {
    let name = (location.hash.replace(/^#\/?/, "") || "").split("/")[0];
    if (!["enter", "home", "story"].includes(name)) {
      // plain section anchors like #flowers stay on the home view
      name = store.get() ? "home" : "enter";
    }
    if (name !== "enter" && !store.get()) name = "enter"; // locked → back to gate

    if (name === currentRoute) return;
    currentRoute = name;

    Object.entries(views).forEach(([key, el]) => { el.hidden = key !== name; });
    window.scrollTo({ top: 0, behavior: "auto" });
    document.title = { enter: "For You", home: "For You — Happy Birthday", story: "For You — Storybook" }[name];

    // Move focus to the view's heading for screen-reader + keyboard users
    const heading = { enter: $("#gate-title"), home: $("#wish-title"), story: $("#story-title") }[name];
    if (heading) heading.focus({ preventScroll: true });

    dock.hidden = name === "enter";
    if (name === "enter") { $("#passcode").value = ""; $(".gate__card").classList.remove("is-open"); renderSlots(); }
    if (name === "home") observeSections();
    if (name === "story") showSpread(0, 1);
    revealNow();
  }
  window.addEventListener("hashchange", route);

  /* =========================================================
     PAGE 1 — PASSCODE
     ========================================================= */
  const input = $("#passcode");
  const slotsWrap = $("#slots");
  const errorEl = $("#gate-error");
  const code = CONFIG.passcode.toUpperCase();

  input.maxLength = code.length;
  const slotEls = Array.from({ length: code.length }, () => {
    const s = document.createElement("span");
    s.className = "slot";
    s.setAttribute("aria-hidden", "true");
    slotsWrap.insertBefore(s, input);
    return s;
  });

  function renderSlots() {
    const v = input.value.toUpperCase();
    slotEls.forEach((el, i) => {
      el.textContent = v[i] || "";
      el.classList.toggle("is-filled", !!v[i]);
      el.classList.toggle("is-active", i === Math.min(v.length, code.length - 1));
    });
  }
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^a-z0-9]/gi, "");
    errorEl.textContent = "";
    slotsWrap.classList.remove("is-error");
    renderSlots();
  });
  input.addEventListener("focus", renderSlots);
  slotsWrap.addEventListener("pointerdown", () => input.focus());

  $("#gate-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim().toUpperCase() === code) {
      store.set(true);
      const card = $(".gate__card");
      const r = card.getBoundingClientRect();
      card.classList.add("is-open");
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, 70);
      sound.chime([523.25, 659.25, 783.99]);
      setTimeout(() => { location.hash = "#/home"; }, reduceMotion.matches ? 0 : 750);
    } else {
      errorEl.textContent = "That isn't quite right — try again.";
      slotsWrap.classList.remove("is-error");
      void slotsWrap.offsetWidth; // restart shake animation
      slotsWrap.classList.add("is-error");
      input.select();
    }
  });

  $("#lock-again").addEventListener("click", () => store.set(false));

  /* =========================================================
     PAGE 2 — NAVIGATION
     ========================================================= */
  const navToggle = $("#nav-toggle");
  const navLinks = $("#nav-links");

  function setMenu(open) {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navLinks.classList.toggle("is-open", open);
  }
  navToggle.addEventListener("click", () => setMenu(navToggle.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  // Smooth-scroll links (keeps the URL on #/home so routing is not disturbed)
  $$("[data-scroll]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById(a.dataset.scroll);
      if (!target) return;
      target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
      const h = target.querySelector("h1, h2");
      if (h) { h.setAttribute("tabindex", "-1"); setTimeout(() => h.focus({ preventScroll: true }), reduceMotion.matches ? 0 : 600); }
      setMenu(false);
    });
  });

  // Highlight the current section in the nav
  let sectionObserver;
  function observeSections() {
    if (sectionObserver) return;
    const links = $$(".nav__links a");
    sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.setAttribute("aria-current", String(l.dataset.scroll === en.target.id)));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("#wish, #flowers, #memories, #secret").forEach((s) => sectionObserver.observe(s));
  }

  /* =========================================================
     SCROLL REVEAL
     ========================================================= */
  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revealObserver.unobserve(en.target); } });
      }, { threshold: 0.15 })
    : null;
  function revealNow() {
    $$(".reveal:not(.in)").forEach((el) => {
      if (!revealObserver || el.closest("[hidden]")) return;
      revealObserver.observe(el);
    });
  }

  /* =========================================================
     3D TILT + PARALLAX (pointer + touch, settles on release)
     Any element with [data-tilt] gets it; data-tilt-max = degrees.
     Children can react using CSS vars --px / --py (-1 … 1).
     ========================================================= */
  function initTilt(el) {
    const max = parseFloat(el.dataset.tiltMax) || 10;
    const clamp = (n) => Math.max(-1, Math.min(1, n));

    const apply = (x, y) => {
      el.style.setProperty("--rx", `${(-y * max).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(x * max).toFixed(2)}deg`);
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
    };
    let frame = 0;
    const move = (e) => {
      if (reduceMotion.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        apply(clamp(((e.clientX - r.left) / r.width - 0.5) * 2), clamp(((e.clientY - r.top) / r.height - 0.5) * 2));
        el.classList.add("is-active");
      });
    };
    const settle = () => {
      cancelAnimationFrame(frame);
      el.classList.remove("is-active");
      apply(0, 0);
    };
    el.addEventListener("pointerdown", move);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", settle);
    el.addEventListener("pointerleave", settle);
    el.addEventListener("pointercancel", settle);
    el.addEventListener("blur", settle, true);
  }
  $$("[data-tilt]").forEach(initTilt);

  // Pointer-following ambient glow
  window.addEventListener("pointermove", (e) => {
    if (reduceMotion.matches) return;
    document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
    document.documentElement.style.setProperty("--my", `${e.clientY}px`);
  }, { passive: true });

  /* ---------- Hero portrait: fall back to placeholder if the image is missing ---------- */
  const portrait = $("#portrait");
  const portraitImg = $(".portrait__img", portrait);
  const markMissing = () => portrait.classList.add("is-missing");
  if (portraitImg.complete && portraitImg.naturalWidth === 0) markMissing();
  portraitImg.addEventListener("error", markMissing);

  /* =========================================================
     FLOWERS — animated sunflower bouquet (SVG, drawn by createBouquet below)
     Blooms the first time it scrolls into view. "Make it bloom" / B key
     opens or closes it; tapping a flower gives a little sparkle.
     ========================================================= */
  const bouquet = $("#bouquet");
  const bloomAll = $("#bloom-all");

  function createBouquet(root, opts) {
    opts = Object.assign({ controls: true, duration: 6000, autoplay: true, onFull: null, onStart: null, onTap: null, onPoke: null }, opts || {});
    const NS = 'http://www.w3.org/2000/svg';
    const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- helpers ---------- */
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
    const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
    const easeOutBack = t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
    const rand = (a, b) => a + Math.random() * (b - a);
    const wrap180 = a => { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; };
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const mix = (c1, c2, t) => { const a = hex(c1), b = hex(c2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join(''); };
    function el(tag, attrs, parent) {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }

    /* ---------- palette ---------- */
    const COL = {
      kraft: '#cf9560', kraftDark: '#b97d48', kraftLight: '#dba872', line: '#7a3f22',
      leaf: '#6f8f3b', leafDark: '#557330', leafLine: '#3f5420', stem: '#5f7f33',
      ribbon: '#f26a2e', ribbonLine: '#b84410',
      budG: '#6f8f3b', budGb: '#8fae4c', budYG: '#c9c24a', budY: '#f2a93b', petalY: '#fcc94a',
      strokeG: '#3f5420', strokeY: '#b8661f', crease: '#e79a2d',
      disc: '#8b4a2b', discLine: '#5e2e19'
    };

    /* ---------- DOM ---------- */
    root.innerHTML = '';
    const svg = el('svg', { viewBox: '0 0 400 450', role: 'img', 'aria-label': 'A sunflower bouquet blooming' }, root);
    const gPartBack = el('g', {}, svg);
    const gBackPaper = el('g', {}, svg);
    const gPlantA = el('g', {}, svg);   // sprigs, leaves, stems, flowers
    const gWrap = el('g', {}, svg);
    const gPlantB = el('g', {}, svg);   // leaves in front of the wrap
    const gRibbon = el('g', {}, svg);
    const gPartFront = el('g', { 'pointer-events': 'none' }, svg);

    /* ---------- wrapping paper ---------- */
    el('path', { d: 'M88 242 L136 142 L200 66 L266 142 L314 242 L200 304 Z', fill: COL.kraftDark, stroke: COL.line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, gBackPaper);
    el('path', { d: 'M200 66 L200 150 M136 142 L164 200 M266 142 L238 200', fill: 'none', stroke: COL.line, 'stroke-width': 1.2, opacity: .35, 'stroke-linecap': 'round' }, gBackPaper);

    el('path', { d: 'M88 236 C98 304 154 372 200 410 L200 296 C158 282 118 264 88 236Z', fill: COL.kraftLight, stroke: COL.line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, gWrap);
    el('path', { d: 'M312 236 C302 304 246 372 200 410 L200 296 C242 282 282 264 312 236Z', fill: COL.kraft, stroke: COL.line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, gWrap);
    el('path', { d: 'M200 296 L200 410 M150 330 C168 350 186 372 196 392 M250 330 C232 350 214 372 204 392', fill: 'none', stroke: COL.line, 'stroke-width': 1.3, opacity: .45, 'stroke-linecap': 'round' }, gWrap);

    /* ---------- ribbon ---------- */
    const bow = (s) => 'M200 404 C' + (200 + s * 24) + ' 386 ' + (200 + s * 44) + ' 394 ' + (200 + s * 40) + ' 408 C' + (200 + s * 36) + ' 422 ' + (200 + s * 14) + ' 414 200 406Z';
    const tail = (s) => 'M' + (200 + s * 2) + ' 408 L' + (200 + s * 16) + ' 436 L' + (200 + s * 9) + ' 432 L' + (200 + s * 3) + ' 441 Z';
    const ribbonG = el('g', { style: 'transform-box:fill-box' }, gRibbon);
    [-1, 1].forEach(s => el('path', { d: tail(s), fill: COL.ribbon, stroke: COL.ribbonLine, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, ribbonG));
    const loopL = el('path', { d: bow(-1), fill: COL.ribbon, stroke: COL.ribbonLine, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, ribbonG);
    const loopR = el('path', { d: bow(1), fill: COL.ribbon, stroke: COL.ribbonLine, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, ribbonG);
    el('ellipse', { cx: 200, cy: 406, rx: 8, ry: 7, fill: '#f78a4f', stroke: COL.ribbonLine, 'stroke-width': 1.6 }, ribbonG);

    /* ---------- leaves ---------- */
    const leafD = (len, w) => 'M0 0 C' + (-w) + ' ' + (-len * .2) + ' ' + (-w) + ' ' + (-len * .75) + ' 0 ' + (-len) +
                              ' C' + w + ' ' + (-len * .75) + ' ' + w + ' ' + (-len * .2) + ' 0 0Z';
    function makeLeaf(parent, cfg) {
      const g = el('g', {}, parent);
      const inner = el('g', {}, g);
      el('path', { d: leafD(cfg.len, cfg.w), fill: COL.leaf, stroke: COL.leafLine, 'stroke-width': 2, 'stroke-linejoin': 'round' }, inner);
      el('path', { d: 'M0 0 C' + cfg.w + ' ' + (-cfg.len * .2) + ' ' + cfg.w + ' ' + (-cfg.len * .75) + ' 0 ' + (-cfg.len) + 'Z', fill: COL.leafDark, opacity: .45 }, inner);
      el('path', { d: 'M0 -2 L0 ' + (-cfg.len * .82), stroke: COL.leafLine, 'stroke-width': 1.3, fill: 'none', 'stroke-linecap': 'round', opacity: .8 }, inner);
      return Object.assign({ g }, cfg);
    }
    const midLeaves = [
      { x: 184, y: 334, a: -64, len: 116, w: 30, ph: 0.2 },
      { x: 216, y: 334, a: 66, len: 116, w: 30, ph: 1.4 },
      { x: 196, y: 310, a: -28, len: 104, w: 26, ph: 2.1 },
      { x: 206, y: 310, a: 30, len: 104, w: 26, ph: 3.3 }
    ].map(c => makeLeaf(gPlantA, c));
    const frontLeaves = [
      { x: 176, y: 332, a: -96, len: 104, w: 34, ph: .6 },
      { x: 224, y: 332, a: 96, len: 104, w: 34, ph: 1.9 },
      { x: 184, y: 352, a: -48, len: 92, w: 32, ph: 2.7 },
      { x: 216, y: 352, a: 50, len: 92, w: 32, ph: 3.9 },
      { x: 200, y: 360, a: -8, len: 70, w: 26, ph: 4.4 }
    ].map(c => makeLeaf(gPlantB, c));

    /* ---------- eucalyptus sprigs (behind everything) ---------- */
    function makeSprig(parent, bx, by, tx, ty, bend, n) {
      const g = el('g', {}, parent);
      const cx = (bx + tx) / 2 + bend, cy = (by + ty) / 2;
      el('path', { d: 'M' + bx + ' ' + by + ' Q' + cx + ' ' + cy + ' ' + tx + ' ' + ty, fill: 'none', stroke: COL.leafLine, 'stroke-width': 3.2, 'stroke-linecap': 'round' }, g);
      el('path', { d: 'M' + bx + ' ' + by + ' Q' + cx + ' ' + cy + ' ' + tx + ' ' + ty, fill: 'none', stroke: '#7f9c47', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, g);
      for (let i = 1; i <= n; i++) {
        const t = .22 + .78 * i / n, u = 1 - t;
        const px = u * u * bx + 2 * u * t * cx + t * t * tx, py = u * u * by + 2 * u * t * cy + t * t * ty;
        const dx = 2 * u * (cx - bx) + 2 * t * (tx - cx), dy = 2 * u * (cy - by) + 2 * t * (ty - cy);
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        [-1, 1].forEach(s => {
          const sz = lerp(10, 6, t);
          el('ellipse', { cx: 0, cy: -sz * .8, rx: sz * .46, ry: sz, fill: '#8aa84f', stroke: COL.leafLine, 'stroke-width': 1.3,
            transform: 'translate(' + px + ',' + py + ') rotate(' + (ang + 90 + s * 62) + ')' }, g);
        });
      }
      return { g, bx, by };
    }
    const sprigs = [
      makeSprig(gPlantA, 176, 330, 110, 56, -16, 6),
      makeSprig(gPlantA, 228, 330, 302, 44, 22, 7)
    ];

    /* ---------- flowers ---------- */
    const FLOWERS = [
      { x: 150, y: 134, r: 38, sq: .74, rot: -16, budRot: -8, delay: .16, base: 190, par: 1, ph: 5.1 },   // back left
      { x: 256, y: 130, r: 40, sq: .72, rot: 14, budRot: 8, delay: .24, base: 210, par: 1, ph: 1.1 },    // back right
      { x: 205, y: 112, r: 46, sq: .66, rot: 4, budRot: 0, delay: .20, base: 196, par: 1, ph: 0.4 },    // back top
      { x: 106, y: 200, r: 47, sq: .86, rot: -30, budRot: -12, delay: .08, base: 188, par: .8, ph: 2.0 }, // left
      { x: 298, y: 192, r: 48, sq: .88, rot: 24, budRot: 12, delay: .13, base: 212, par: .8, ph: 3.2 },   // right
      { x: 150, y: 252, r: 42, sq: .95, rot: -18, budRot: -6, delay: .05, base: 194, par: .6, ph: 0.9 },  // lower left
      { x: 252, y: 250, r: 43, sq: .95, rot: 16, budRot: 6, delay: .10, base: 206, par: .6, ph: 2.6 },    // lower right
      { x: 202, y: 214, r: 56, sq: 1, rot: 0, budRot: 0, delay: 0, base: 200, par: .5, ph: 4.4 }         // front centre
    ];
    const stemsG = el('g', {}, gPlantA);
    const flowersG = el('g', {}, gPlantA);

    function petalD(L, w) {
      return 'M0 0 C' + (-w) + ' ' + (-L * .25) + ' ' + (-w * 1.05) + ' ' + (-L * .75) + ' 0 ' + (-L) +
             ' C' + (w * 1.05) + ' ' + (-L * .75) + ' ' + w + ' ' + (-L * .25) + ' 0 0Z';
    }
    function makeRing(parent, n, offset, crease) {
      const arr = [];
      for (let i = 0; i < n; i++) {
        const g = el('g', {}, parent);
        const p = el('path', { 'stroke-linejoin': 'round' }, g);
        const c = crease ? el('path', { fill: 'none', 'stroke-linecap': 'round' }, g) : null;
        arr.push({ g, p, c, a: wrap180(i * 360 / n + offset) });
      }
      return arr;
    }
    function setRing(ring, L, w, spread, oy, fill, stroke, sw, creaseCol) {
      const d = petalD(L, w), cd = 'M0 ' + (-L * .24) + ' L0 ' + (-L * .68);
      for (const o of ring) {
        o.p.setAttribute('d', d); o.p.setAttribute('fill', fill); o.p.setAttribute('stroke', stroke); o.p.setAttribute('stroke-width', sw);
        o.g.setAttribute('transform', 'translate(0,' + oy + ') rotate(' + (o.a * spread) + ')');
        if (o.c) { o.c.setAttribute('d', cd); o.c.setAttribute('stroke', creaseCol); o.c.setAttribute('stroke-width', sw * .7); }
      }
    }

    const flowers = FLOWERS.map(cfg => {
      const stemOut = el('path', { fill: 'none', stroke: COL.leafLine, 'stroke-width': 6, 'stroke-linecap': 'round' }, stemsG);
      const stemIn = el('path', { fill: 'none', stroke: COL.stem, 'stroke-width': 3, 'stroke-linecap': 'round' }, stemsG);
      const g = el('g', { class: 'bq-flower' }, flowersG);
      const body = el('g', {}, g);
      const calyx = makeRing(body, 9, 0, false);
      const back = makeRing(body, 15, 12, false);
      const front = makeRing(body, 14, 0, true);
      const disc = el('g', {}, body);
      el('circle', { r: 1, fill: COL.disc, stroke: COL.discLine, 'stroke-width': .06 }, disc);
      el('circle', { r: .8, fill: 'none', stroke: COL.discLine, 'stroke-width': .045, 'stroke-dasharray': '.18 .16', opacity: .75 }, disc);
      el('circle', { r: .45, fill: '#6f3820', opacity: .45 }, disc);
      const f = Object.assign({ g, body, calyx, back, front, disc, stemOut, stemIn,
        p: 0, key: -1, pulse: 0, vel: 0, hov: 0, hovT: 0 }, cfg);
      g.addEventListener('pointerenter', () => { f.hovT = 1; });
      g.addEventListener('pointerleave', () => { f.hovT = 0; });
      g.addEventListener('pointerdown', ev => { ev.stopPropagation(); if (opts.onTap) opts.onTap(); poke(f, ev); });
      return f;
    });

    function renderFlowerShape(f) {
      const p = f.p, r = f.r;
      const e = clamp(easeOutBack(smooth(.36, 1, p)), 0, 1.06);
      const spread = lerp(.11, 1, e);
      const s1 = smooth(0, .3, p), s2 = smooth(.26, .56, p);
      const fillF = mix(mix(COL.budGb, COL.budYG, s1), COL.petalY, s2);
      const fillB = mix(mix(COL.budG, '#b9a640', s1), COL.budY, s2);
      const stroke = mix(COL.strokeG, COL.strokeY, s2);
      const sw = r * .033;
      const L = r * lerp(.62, 1, e), w = r * lerp(.3, .19, e);
      const oy = r * lerp(.3, 0, e);
      setRing(f.back, L * lerp(1.04, 1, e), w * 1.05, spread * lerp(1.1, 1, e), oy, fillB, stroke, sw);
      setRing(f.front, L * lerp(.97, .88, e), w * 1.08, spread, oy, fillF, stroke, sw, COL.crease);
      // calyx: little green sepals that stay under the bloom
      setRing(f.calyx, r * .62, r * .15, lerp(.14, 1, e), r * .02, '#5d7a2f', COL.leafLine, sw);
      const d = smooth(.52, .96, p) * Math.min(1, e);
      f.disc.setAttribute('transform', 'scale(' + (r * .36 * d + .0001) + ')');
      f.disc.setAttribute('opacity', d > .01 ? 1 : 0);
    }

    function renderFlowerPose(f, t, lean) {
      const p = f.p;
      const open = smooth(.4, 1, p);
      const sq = lerp(1, f.sq, open);
      const rot = lerp(f.budRot, f.rot, open);
      const sway = REDUCED ? 0 : Math.sin(t * 1.1 + f.ph);
      const sway2 = REDUCED ? 0 : Math.cos(t * .8 + f.ph);
      const s = 1 + f.pulse * .1 + f.hov * .045;
      const x = f.x + sway2 * 1.4 + lean * 4 * f.par;
      const y = f.y + sway * 1.1 - f.hov * 2;
      const wob = f.pulse * 9 * Math.sin(t * 22) * .4 + sway * 2.2 + f.hov * Math.sin(t * 9) * 1.6;
      f.g.setAttribute('transform', 'translate(' + x + ',' + y + ') rotate(' + (rot + wob) + ') scale(' + s + ',' + (s * sq) + ')');
      // stem follows the head
      const bx = f.base, by = 396;
      const ex = x, ey = y + f.r * .25 * sq;
      const cx = lerp(bx, ex, .3) + (ex - bx) * .08, cy = lerp(by, ey, .55);
      const d = 'M' + bx + ' ' + by + ' Q' + cx + ' ' + cy + ' ' + ex + ' ' + ey;
      f.stemOut.setAttribute('d', d); f.stemIn.setAttribute('d', d);
    }

    /* ---------- particles ---------- */
    const parts = [];
    const HEART = 'M0 5 C-9 -1 -7 -8 0 -3.5 C7 -8 9 -1 0 5Z';
    const STAR = 'M0 -1 Q.11 -.11 1 0 Q.11 .11 0 1 Q-.11 .11 -1 0 Q-.11 -.11 0 -1Z';
    function spawn(type, x, y, o) {
      o = o || {};
      const front = !!o.front;
      const g = el('g', {}, front ? gPartFront : gPartBack);
      let size, life, vx = o.vx || 0, vy = o.vy || 0;
      if (type === 'heart') {
        size = o.size || rand(.9, 1.7); life = o.life || rand(3, 4.6); if (!o.vy) vy = -rand(9, 20);
        const c = Math.random() < .5 ? '#f4887a' : '#f7a99c';
        el('path', { d: HEART, fill: c, stroke: '#e56b5f', 'stroke-width': .7, 'stroke-linejoin': 'round', opacity: .95 }, g);
      } else if (type === 'star') {
        size = o.size || rand(5, 13); life = o.life || rand(1.8, 3.2);
        el('path', { d: STAR, fill: '#fcd34d', stroke: '#e8a92a', 'stroke-width': .09, 'stroke-linejoin': 'round' }, g);
      } else {
        size = o.size || rand(1.4, 3.4); life = o.life || rand(2.5, 5); if (!o.vy) vy = -rand(1, 5);
        el('circle', { r: 1, fill: ['#f6b8a8', '#f7cf6a', '#f4a38c'][(Math.random() * 3) | 0], opacity: .8 }, g);
      }
      parts.push({ g, type, x, y, vx, vy, size, life, age: 0, rot: rand(-20, 20), spin: rand(-30, 30), ph: rand(0, 6.28), grav: o.grav || 0 });
    }
    function updateParticles(dt, t) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.age += dt;
        if (q.age >= q.life) { q.g.remove(); parts.splice(i, 1); continue; }
        const k = q.age / q.life;
        q.vy += q.grav * dt;
        q.x += q.vx * dt + (q.type === 'heart' ? Math.sin(t * 1.8 + q.ph) * 6 * dt : 0);
        q.y += q.vy * dt;
        q.rot += q.spin * dt;
        const fade = smooth(0, .15, k) * (1 - smooth(.65, 1, k));
        let sc = q.size * (q.type === 'star' ? (.35 + .65 * Math.abs(Math.sin(k * Math.PI * 2.2 + q.ph))) * easeOutBack(smooth(0, .25, k)) : easeOutBack(smooth(0, .22, k)));
        q.g.setAttribute('transform', 'translate(' + q.x.toFixed(2) + ',' + q.y.toFixed(2) + ') rotate(' + (q.type === 'heart' ? q.rot * .4 : q.rot) + ') scale(' + Math.max(sc, 0.001).toFixed(3) + ')');
        q.g.setAttribute('opacity', fade.toFixed(3));
      }
    }
    function ambientPos() {
      // random spot in a ring around the bouquet's head
      const a = rand(-3.3, 0.15), rr = rand(.78, 1);
      return [200 + Math.cos(a) * 178 * rr + rand(-14, 14), 205 + Math.sin(a) * 175 * rr + rand(-10, 10)];
    }
    function burst(x, y) {
      for (let i = 0; i < 2; i++) {
        const a = rand(0, 6.28), v = rand(30, 80);
        spawn('heart', x, y, { front: true, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, grav: 60, life: rand(1.1, 1.8), size: rand(.8, 1.4) });
      }
      for (let i = 0; i < 9; i++) {
        const a = rand(0, 6.28), v = rand(40, 100);
        spawn('star', x, y, { front: true, vx: Math.cos(a) * v, vy: Math.sin(a) * v, grav: 20, life: rand(.8, 1.4), size: rand(5, 11) });
      }
    }

    /* ---------- state + loop ---------- */
    const st = { bloom: 0, anim: null, lean: 0, leanT: 0, last: performance.now(), t: 0, acc: { h: 0, s: 0, d: 0 }, raf: 0, scrub: false, started: false, visible: true, full: false };
    let slider = null;

    function poke(f, ev) {
      f.vel += 9; f.pulse = Math.max(f.pulse, .001);
      const pt = svgPoint(ev);
      burst(pt.x, pt.y);
      if (opts.onPoke) opts.onPoke(f);
    }
    function svgPoint(ev) {
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }
    svg.addEventListener('pointermove', ev => {
      const pt = svgPoint(ev);
      st.leanT = clamp((pt.x - 200) / 190, -1, 1);
    });
    svg.addEventListener('pointerleave', () => { st.leanT = 0; });
    svg.addEventListener('pointerdown', ev => {                 // tap empty space: little burst
      if (opts.onTap) opts.onTap();
      const pt = svgPoint(ev); burst(pt.x, pt.y);
    });

    function replay() {
      st.scrub = false;
      st.anim = { start: performance.now() + 350, dur: opts.duration, from: 0, to: 1 };
      st.bloom = 0;
      st.started = true;
      parts.forEach(q => q.g.remove()); parts.length = 0;
      if (opts.onStart) opts.onStart(1);
    }
    function bloomTo(target, dur) {
      st.scrub = false; st.started = true;
      target = clamp(target);
      if (opts.onStart) opts.onStart(target);
      if (REDUCED || st.bloom === target) { st.anim = null; st.bloom = target; return; }
      st.anim = { start: performance.now(), dur: (dur || opts.duration) * Math.max(.3, Math.abs(target - st.bloom)), from: st.bloom, to: target };
    }
    function setBloom(v) { st.anim = null; st.bloom = clamp(v); st.started = true; }

    function frame(now) {
      const dt = Math.min(.05, (now - st.last) / 1000); st.last = now; st.t += dt;
      const t = st.t;

      if (st.anim) {
        const k = (now - st.anim.start) / st.anim.dur;
        st.bloom = lerp(st.anim.from, st.anim.to, easeInOutSine(clamp(k)));
        if (k >= 1) { st.bloom = st.anim.to; st.anim = null; }
      }
      const full = st.bloom >= .999;
      if (full !== st.full) { st.full = full; if (opts.onFull) opts.onFull(full); }
      if (!st.visible) { st.raf = requestAnimationFrame(frame); return; }   // off-screen: keep state, skip drawing
      if (slider && !st.scrub) slider.value = Math.round(st.bloom * 1000);

      // lean spring toward pointer
      st.lean += (st.leanT - st.lean) * Math.min(1, dt * 4);
      const idle = REDUCED ? 0 : Math.sin(t * .7) * .6;
      const tf = 'rotate(' + (st.lean * 3.2 + idle).toFixed(3) + ' 200 396)';
      gPlantA.setAttribute('transform', tf); gPlantB.setAttribute('transform', tf);

      // flowers
      for (const f of flowers) {
        f.p = clamp((st.bloom - f.delay) / (1 - .22));
        const key = Math.round(f.p * 500);
        if (key !== f.key) { f.key = key; renderFlowerShape(f); }
        f.vel += (-f.pulse * 90 - f.vel * 7) * dt; f.pulse += f.vel * dt;
        if (Math.abs(f.pulse) < .0005 && Math.abs(f.vel) < .01) { f.pulse = 0; f.vel = 0; }
        f.hov += (f.hovT - f.hov) * Math.min(1, dt * 10);
        renderFlowerPose(f, t, st.lean);
      }
      // leaves + sprigs sway
      const sw = REDUCED ? 0 : 1;
      for (const l of midLeaves.concat(frontLeaves)) {
        const a = l.a + Math.sin(t * 1.0 + l.ph) * 2.4 * sw + st.lean * 2;
        l.g.setAttribute('transform', 'translate(' + l.x + ',' + l.y + ') rotate(' + a + ')');
      }
      sprigs.forEach((s, i) => s.g.setAttribute('transform', 'rotate(' + (Math.sin(t * .9 + i * 2) * 1.6 * sw + st.lean * 1.5) + ' ' + s.bx + ' ' + s.by + ')'));
      ribbonG.setAttribute('transform', 'rotate(' + (Math.sin(t * 1.2) * .8 * sw) + ' 200 406)');

      // ambient particles
      if (st.started && !REDUCED && now > (st.anim ? st.anim.start : 0)) {
        const b = st.bloom;
        st.acc.h += dt * lerp(.6, .12, smooth(.3, 1, b));
        st.acc.s += dt * 9 * smooth(.62, 1, b);
        st.acc.d += dt * 2.2;
        while (st.acc.h > 1) { st.acc.h--; const [x, y] = ambientPos(); spawn('heart', x, y + 40); }
        while (st.acc.s > 1) { st.acc.s--; const [x, y] = ambientPos(); spawn('star', x, y); }
        while (st.acc.d > 1) { st.acc.d--; const [x, y] = ambientPos(); spawn('dot', x, y); }
      }
      updateParticles(dt, t);
      st.raf = requestAnimationFrame(frame);
    }

    /* ---------- controls ---------- */
    if (opts.controls) {
      const bar = document.createElement('div'); bar.className = 'bq-controls';
      const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = '↻ Replay';
      btn.addEventListener('click', replay);
      slider = document.createElement('input'); slider.type = 'range'; slider.min = 0; slider.max = 1000; slider.value = 0;
      slider.setAttribute('aria-label', 'Bloom progress');
      slider.addEventListener('pointerdown', () => { st.scrub = true; st.anim = null; });
      slider.addEventListener('input', () => { st.scrub = true; setBloom(slider.value / 1000); });
      slider.addEventListener('change', () => { st.scrub = false; });
      bar.append(btn, slider);
      const hint = document.createElement('div'); hint.className = 'bq-hint'; hint.textContent = 'Move your cursor to sway it · tap a flower for sparkles';
      root.append(bar, hint);
    }

    /* ---------- go ---------- */
    flowers.forEach(f => renderFlowerShape(f));
    let seen = false;
    const firstView = () => { seen = true; if (REDUCED) setBloom(1); else if (opts.autoplay) replay(); };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => {
        const e = es[es.length - 1];
        st.visible = e.isIntersecting;
        if (!seen && e.intersectionRatio >= .35) firstView();
      }, { threshold: [0, .35] });
      io.observe(root);
      st.io = io;
    } else firstView();
    st.raf = requestAnimationFrame(t0 => { st.last = t0; frame(t0); });

    return {
      replay, setBloom, bloomTo,
      bloom: () => st.bloom,
      busy: () => !!st.anim,
      target: () => (st.anim ? st.anim.to : st.bloom),
      destroy() { cancelAnimationFrame(st.raf); if (st.io) st.io.disconnect(); root.innerHTML = ''; }
    };
  }

  let userBloom = false; // true when the visitor (not the auto-play) triggered the bloom
  const setBloomUI = (open) => {
    bloomAll.setAttribute("aria-pressed", String(open));
    bloomAll.textContent = open ? "Close the bouquet" : "Make it bloom";
  };
  const bq = createBouquet($("#bouquet-art"), {
    controls: false,   // we use our own "Make it bloom" button
    duration: 6000,    // bloom length in ms
    autoplay: true,    // bloom when it first scrolls into view
    onStart: (target) => setBloomUI(target >= 0.5),
    onFull: (full) => {
      bouquet.classList.toggle("is-bloomed", full);
      setBloomUI(full);
      if (full) {
        announce("The bouquet is in full bloom.");
        if (userBloom) { fx.rain(3500); sound.chime([392, 523.25, 659.25, 783.99]); }
      }
      userBloom = false;
    },
    onPoke: () => sound.chime([587.33 + Math.random() * 200]),
    onTap: () => { if (bq.bloom() < 0.02 && !bq.busy()) { userBloom = true; bq.bloomTo(1); } },
  });
  bloomAll.addEventListener("click", () => {
    const open = bq.target() < 0.5;
    userBloom = open;
    bq.bloomTo(open ? 1 : 0, open ? 6000 : 3000);
  });

  /* =========================================================
     PHOTOS — any element with data-src gets an <img>.
     Used by Memories and the Storybook. Empty data-src = placeholder.
     ========================================================= */
  function applyPhotos() {
    $$("[data-src]").forEach((holder) => {
      const src = (holder.dataset.src || "").trim();
      if (!src) return;
      const target = holder.querySelector(".memory__img") || holder;
      if (target.querySelector("img")) return;
      const img = new Image();
      img.alt = holder.dataset.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      img.onload = () => { const ph = target.querySelector(".placeholder"); if (ph) ph.remove(); };
      img.src = src;
      target.appendChild(img);
    });
  }
  applyPhotos();

  /* ---------- Memory lightbox ---------- */
  const lightbox = $("#lightbox");
  const lbMedia = $("#lightbox-media");
  const lbCaption = $("#lightbox-caption");
  let lastTrigger = null;

  const memCards = $$(".memory");
  let lbIndex = 0;
  function fillLightbox(card) {
    lastTrigger = card;
    lbIndex = memCards.indexOf(card);
    lbMedia.innerHTML = "";
    const src = (card.dataset.src || "").trim();
    if (src) {
      const img = new Image();
      img.src = src;
      img.alt = card.dataset.alt || "";
      lbMedia.appendChild(img);
    } else {
      lbMedia.innerHTML = '<span class="placeholder"><span>Photo area</span></span>';
    }
    lbCaption.textContent = card.dataset.caption || "";
    // alternate: photo 1 → caption on the right, photo 2 → caption on the left, and so on
    lightbox.classList.toggle("is-flip", lbIndex % 2 === 1);
  }
  memCards.forEach((card) => card.addEventListener("click", () => {
    if (card.dataset.justDragged === "1") return; // a drag is not a click
    fillLightbox(card);
    if (typeof lightbox.showModal === "function") lightbox.showModal(); else lightbox.setAttribute("open", "");
  }));
  const stepLightbox = (d) => fillLightbox(memCards[(lbIndex + d + memCards.length) % memCards.length]);
  $("#lb-prev").addEventListener("click", () => stepLightbox(-1));
  $("#lb-next").addEventListener("click", () => stepLightbox(1));
  lightbox.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); }); // click backdrop
  lightbox.addEventListener("close", () => { if (lastTrigger) lastTrigger.focus(); });

  /* =========================================================
     PAGE 3 — STORYBOOK CONTROLS
     Add <article class="spread"> blocks in index.html — dots,
     counter and buttons update automatically.
     ========================================================= */
  const spreads = $$(".spread");
  const dotsWrap = $("#story-dots");
  const prevBtn = $("#story-prev");
  const nextBtn = $("#story-next");
  const countEl = $("#story-count");
  let spreadIndex = 0;

  const dots = spreads.map((_, i) => {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "dot";
    d.setAttribute("role", "tab");
    d.setAttribute("aria-label", `Go to page ${i + 1}`);
    d.addEventListener("click", () => showSpread(i, i >= spreadIndex ? 1 : -1));
    dotsWrap.appendChild(d);
    return d;
  });

  function showSpread(i, dir = 1) {
    spreadIndex = Math.max(0, Math.min(spreads.length - 1, i));
    spreads.forEach((s, n) => {
      const on = n === spreadIndex;
      s.hidden = !on;
      s.classList.toggle("is-current", on);
      s.classList.toggle("back", on && dir < 0);
      s.setAttribute("aria-label", `Page ${n + 1} of ${spreads.length}`);
    });
    dots.forEach((d, n) => d.setAttribute("aria-selected", String(n === spreadIndex)));
    countEl.textContent = `${spreadIndex + 1} / ${spreads.length}`;
    prevBtn.disabled = spreadIndex === 0;
    nextBtn.disabled = spreadIndex === spreads.length - 1;
  }
  prevBtn.addEventListener("click", () => showSpread(spreadIndex - 1, -1));
  nextBtn.addEventListener("click", () => showSpread(spreadIndex + 1, 1));

  document.addEventListener("keydown", (e) => {
    if (currentRoute !== "story") return;
    if (e.key === "ArrowRight") showSpread(spreadIndex + 1, 1);
    if (e.key === "ArrowLeft") showSpread(spreadIndex - 1, -1);
  });

  // Swipe to turn the page
  const book = $("#book");
  let startX = null;
  book.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  book.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) < 50) return;
    dx < 0 ? showSpread(spreadIndex + 1, 1) : showSpread(spreadIndex - 1, -1);
  });
  book.addEventListener("pointercancel", () => { startX = null; });

  /* =========================================================
     EXTRAS — extra interactivity (sound, confetti, wishes, drag…)
     ========================================================= */
  const dock = $("#dock");
  const live = $("#live");
  const root = document.documentElement;
  const announce = (msg) => { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 30); };

  /* ---------- Sound: bgm.mp3 + chimes (OFF by default, toggle in the dock) ---------- */
  const sound = (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    const btn = $("#sound-toggle");
    let ctx = null;
    let on = false;
    // Background music: put bgm.mp3 next to index.html
    const bgm = new Audio("bgm.mp3");
    bgm.loop = true;
    bgm.volume = 0.5;
    const api = {
      chime(freqs = [660]) {
        if (!on || !ctx) return;
        freqs.forEach((f, i) => {
          const t = ctx.currentTime + i * 0.09;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
          o.connect(g).connect(ctx.destination);
          o.start(t);
          o.stop(t + 1.25);
        });
      },
    };
    if (!AC) { btn.hidden = true; return api; }
    btn.addEventListener("click", () => {
      on = !on;
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", on ? "Sound effects on" : "Sound effects off");
      if (on) {
        ctx = ctx || new AC(); if (ctx.resume) ctx.resume(); api.chime([659.25, 880]);
        bgm.play().catch(() => {});
      } else {
        bgm.pause();
      }
    });
    return api;
  })();

  /* ---------- Confetti / falling petals (canvas) ---------- */
  const fx = (() => {
    const cv = $("#fx");
    const c = cv.getContext("2d");
    const colors = ["#f3d9d4", "#ebc2c1", "#c4566a", "#7b2d3e", "#f6e3cf", "#e9b36f", "#ffffff"];
    let parts = [];
    let raf = 0;
    let rainUntil = 0;
    let dpr = 1;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
    }
    size();
    window.addEventListener("resize", size);

    const make = (x, y, vx, vy) => ({
      x, y, vx, vy, life: 1,
      r: 4 + Math.random() * 6,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.25,
      c: colors[(Math.random() * colors.length) | 0],
      petal: Math.random() < 0.65,
    });

    function loop(now) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, innerWidth, innerHeight);
      if (now < rainUntil && parts.length < 140) {
        parts.push(make(Math.random() * innerWidth, -20, (Math.random() - 0.5) * 1.2, 1 + Math.random() * 1.5));
      }
      parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 30);
      for (const p of parts) {
        p.vy += 0.06;
        p.vx *= 0.992;
        p.x += p.vx + Math.sin(p.y / 40 + p.rot) * 0.4;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.003;
        c.save();
        c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.c;
        c.beginPath();
        if (p.petal) c.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.28); else c.arc(0, 0, p.r * 0.45, 0, 6.28);
        c.fill();
        c.restore();
      }
      if (parts.length || now < rainUntil) raf = requestAnimationFrame(loop);
      else { raf = 0; c.clearRect(0, 0, innerWidth, innerHeight); }
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    return {
      burst(x, y, n = 30) {
        if (reduceMotion.matches) return;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.28;
          const s = 2 + Math.random() * 6;
          parts.push(make(x, y, Math.cos(a) * s, Math.sin(a) * s - 3));
        }
        kick();
      },
      rain(ms = 3000) {
        if (reduceMotion.matches) return;
        rainUntil = performance.now() + ms;
        kick();
      },
    };
  })();

  // Tiny sparkle wherever you tap the page background
  document.addEventListener("pointerdown", (e) => {
    if (currentRoute !== "home" || e.target.closest("a, button, input, dialog, form, [data-tilt]")) return;
    fx.burst(e.clientX, e.clientY, 8);
  });

  // Celebrate button
  $("#celebrate").addEventListener("click", () => {
    fx.burst(innerWidth * 0.25, innerHeight * 0.7, 45);
    fx.burst(innerWidth * 0.75, innerHeight * 0.7, 45);
    fx.rain(2500);
    sound.chime([523.25, 659.25, 783.99, 1046.5]);
    announce("Confetti!");
  });

  /* ---------- Make a wish ---------- */
  const wishForm = $("#wish-form");
  const wishInput = $("#wish-input");
  const sky = $("#wish-sky");

  /* Sends the wish to your inbox through EmailJS (plain fetch, no extra library needed).
     Template variables used: {{wish}} and {{time}}. Fails silently for the visitor. */
  let lastEmailAt = 0;
  async function emailWish(text) {
    const c = CONFIG.emailjs;
    if (!c || [c.serviceId, c.templateId, c.publicKey].some((v) => !v || v.startsWith("YOUR_"))) return;
    if (Date.now() - lastEmailAt < 3000) return; // tiny cooldown so double-taps don't send twice
    lastEmailAt = Date.now();
    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: c.serviceId,
          template_id: c.templateId,
          user_id: c.publicKey,
          template_params: {
            wish: text,
            time: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }),
          },
        }),
      });
      if (!res.ok) console.warn("EmailJS error:", res.status, await res.text());
    } catch (err) {
      console.warn("EmailJS failed:", err);
    }
  }

  wishForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = wishInput.value.trim();
    if (!text) { wishInput.focus(); announce("Who knows what might come true."); return; }
    emailWish(text);
    const r = wishInput.getBoundingClientRect();
    const orb = document.createElement("div");
    orb.className = "wish-orb";
    orb.textContent = text; // textContent keeps it safe
    orb.style.setProperty("--x", `${Math.min(innerWidth - 40, Math.max(40, r.left + r.width / 2))}px`);
    orb.style.setProperty("--y", `${r.top}px`);
    sky.appendChild(orb);
    setTimeout(() => orb.remove(), reduceMotion.matches ? 3500 : 5600);
    fx.burst(r.left + r.width / 2, r.top, 28);
    sound.chime([783.99, 987.77, 1174.66]);
    announce("Your wish floated away.");
    wishInput.value = "";
  });

  /* ---------- Secret: the lock opens, then the storybook appears ---------- */
  $("#open-story").addEventListener("click", (e) => {
    e.preventDefault();
    const card = $(".secret__card");
    const r = $("#secret-lock").getBoundingClientRect();
    card.classList.add("is-unlocked");
    fx.burst(r.left + r.width / 2, r.top + r.height / 2, 40);
    sound.chime([523.25, 783.99, 1046.5]);
    setTimeout(() => { location.hash = "#/story"; card.classList.remove("is-unlocked"); }, reduceMotion.matches ? 0 : 800);
  });

  // Storybook: soft chime when turning pages, petals on the last page
  [prevBtn, nextBtn].forEach((b) => b.addEventListener("click", () => sound.chime([520])));
  nextBtn.addEventListener("click", () => { if (spreadIndex === spreads.length - 1) fx.rain(2000); });

  /* ---------- Draggable polaroids (they spring back when released) ---------- */
  memCards.forEach((card) => {
    let sx = 0, sy = 0, id = null, moved = false;
    card.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      sx = e.clientX; sy = e.clientY; id = e.pointerId; moved = false;
    });
    card.addEventListener("pointermove", (e) => {
      if (id !== e.pointerId || reduceMotion.matches) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 8) {
        moved = true;
        card.setPointerCapture(id);
        card.classList.add("is-dragging");
        card.parentElement.style.zIndex = 6;
      }
      if (moved) { card.style.setProperty("--dx", `${dx}px`); card.style.setProperty("--dy", `${dy}px`); }
    });
    const end = () => {
      if (id === null) return;
      id = null;
      if (moved) { card.dataset.justDragged = "1"; setTimeout(() => delete card.dataset.justDragged, 80); }
      card.classList.remove("is-dragging");
      card.style.setProperty("--dx", "0px");
      card.style.setProperty("--dy", "0px");
      setTimeout(() => { card.parentElement.style.zIndex = ""; }, 900);
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  });

  /* ---------- Magnetic buttons + cursor ring (mouse / trackpad only) ---------- */
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  $$(".btn, .dock__btn, .nav__brand, .wish__send").forEach((el) => el.classList.add("magnetic"));
  if (finePointer.matches) {
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        if (reduceMotion.matches) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--bx", `${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px`);
        el.style.setProperty("--by", `${((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1)}px`);
      });
      el.addEventListener("pointerleave", () => { el.style.setProperty("--bx", "0px"); el.style.setProperty("--by", "0px"); });
    });

    const cur = $("#cursor");
    let tx = 0, ty = 0, x = 0, y = 0, running = false;
    const tick = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      cur.style.setProperty("--cx", `${x}px`);
      cur.style.setProperty("--cy", `${y}px`);
      if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) requestAnimationFrame(tick); else running = false;
    };
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch" || reduceMotion.matches) return;
      tx = e.clientX; ty = e.clientY;
      cur.classList.add("is-visible");
      cur.classList.toggle("is-hover", !!e.target.closest("a, button, input, [data-tilt], .slot, .bq-flower"));
      if (!running) { running = true; requestAnimationFrame(tick); }
    }, { passive: true });
    document.addEventListener("pointerdown", () => cur.classList.add("is-down"));
    document.addEventListener("pointerup", () => cur.classList.remove("is-down"));
    root.addEventListener("mouseleave", () => cur.classList.remove("is-visible"));
  }

  /* ---------- Scroll progress bar ---------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = root.scrollHeight - innerHeight;
      root.style.setProperty("--progress", max > 0 ? (scrollY / max).toFixed(4) : "0");
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ---------- Keyboard shortcuts on the main page: 1–4 sections · B bloom · C confetti ---------- */
  document.addEventListener("keydown", (e) => {
    if (currentRoute !== "home" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (lightbox.open) return;
    const ids = { 1: "wish", 2: "flowers", 3: "memories", 4: "secret" };
    if (ids[e.key]) {
      document.getElementById(ids[e.key]).scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    } else if (e.key.toLowerCase() === "b") {
      bloomAll.click();
    } else if (e.key.toLowerCase() === "c") {
      $("#celebrate").click();
    }
  });

  /* ---------- go! ---------- */
  renderSlots();
  route();
  revealNow();
})();
