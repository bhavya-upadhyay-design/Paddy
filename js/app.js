/* Paddy Field — famines drawn as a field of paddy.
 *
 *  x  : famine start year (base of the stem), on an elastic, zoomable time axis
 *  y  : duration in years (height where the stem meets the grain)
 *  grain artwork : one of six paddy sizes, chosen from the death toll
 */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const HEADS = window.PADDY_HEADS;
  const BINS = window.DEATH_BINS;
  const DOMAIN = window.TIMELINE_DOMAIN;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const svg = document.getElementById("field");
  const card = document.getElementById("card");
  const legendEl = document.getElementById("legend");

  // ---------- helpers ----------
  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmtYear = (y) => (y < 0 ? `${-Math.round(y)} BCE` : `${Math.round(y)}`);
  const fmtDeaths = (n) => {
    if (n >= 1e6) return `${+(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)} million`;
    return n.toLocaleString("en-US");
  };
  // deterministic pseudo-random per famine, so the field looks the same on every load
  const seeded = (i, k) => {
    const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const binOf = (deaths) => BINS.findIndex((b) => deaths < b.max);

  // ---------- head geometry (native angle of each grain, anchor → tip) ----------
  HEADS.forEach((h) => {
    h.angle = Math.atan2(h.tip.y - h.anchor.y, h.tip.x - h.anchor.x);
    h.length = Math.hypot(h.tip.x - h.anchor.x, h.tip.y - h.anchor.y);
  });

  // ---------- data ----------
  const famines = window.FAMINES.map((f, i) => {
    const duration = Math.max(1, f.end - f.start + 1);
    const bin = binOf(f.deaths);
    return {
      ...f,
      id: i,
      duration,
      bin,
      lean: 0.28 + seeded(i, 1) * 0.42,       // how far the stem drifts right, relative to its height
      bow: 0.25 + seeded(i, 2) * 0.35,        // how strongly it curves
      tilt: (seeded(i, 3) - 0.5) * 0.22,      // small personal rotation of the grain
      phase: seeded(i, 4) * Math.PI * 2,      // wind phase
      grow: 0,                                // 0 → 1 grow-in progress
      delay: 250 + seeded(i, 5) * 1400,
    };
  });
  const maxDuration = Math.max(...famines.map((f) => f.duration));
  const Y_MAX = Math.max(10, Math.ceil((maxDuration + 1) / 2) * 2);

  // ---------- layout ----------
  let W, H, L;
  function layout() {
    W = window.innerWidth;
    H = window.innerHeight;
    const mobile = W < 720;
    const left = mobile ? 44 : clamp(W * 0.15, 90, 220);
    const right = mobile ? 24 : clamp(W * 0.1, 50, 200);
    const baseline = H * (mobile ? 0.74 : 0.79);
    const top = H * (mobile ? 0.36 : 0.32);
    L = {
      left, right: W - right, baseline, top,
      plotW: W - right - left,
      tlY: H * (mobile ? 0.88 : 0.905),
      tlLeft: mobile ? 16 : clamp(W * 0.07, 40, 120),
      tlRight: W - (mobile ? 16 : clamp(W * 0.07, 40, 120)),
      headScale: clamp(Math.min(W / 1440, H / 1024), 0.45, 1.3) * (mobile ? 0.42 : 0.5),
    };
    L.tlStart = L.tlLeft + (mobile ? 0 : 70);
    L.tlW = L.tlRight - L.tlStart;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  }

  // ---------- scales ----------
  // view = what the field currently shows (springs toward target) — this is the "elastic" part
  const view = { a: DOMAIN[0], b: DOMAIN[1], va: 0, vb: 0 };
  const target = { a: DOMAIN[0], b: DOMAIN[1] };
  const MIN_SPAN = 12;

  const xYear = (y) => L.left + ((y - view.a) / (view.b - view.a)) * L.plotW;
  const yDur = (d) => L.baseline - (d / Y_MAX) * (L.baseline - L.top);
  const tlX = (y) => L.tlStart + ((y - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * L.tlW;
  const tlYear = (x) => DOMAIN[0] + ((x - L.tlStart) / L.tlW) * (DOMAIN[1] - DOMAIN[0]);

  function setTarget(a, b) {
    let span = Math.max(MIN_SPAN, b - a);
    span = Math.min(span, DOMAIN[1] - DOMAIN[0]);
    a = clamp(a, DOMAIN[0], DOMAIN[1] - span);
    target.a = a;
    target.b = a + span;
    renderTimeline();
  }

  // ---------- scene graph ----------
  const defs = el("defs", {}, svg);
  const bandGrad = el("linearGradient", { id: "bandGrad", x1: "0", x2: "1", y1: "0", y2: "0" }, defs);
  el("stop", { offset: "0", "stop-color": "#F9C35A" }, bandGrad);
  el("stop", { offset: "1", "stop-color": "#F6A3A3" }, bandGrad);

  // reusable head artwork as <symbol>-like groups in defs
  HEADS.forEach((h, i) => {
    const g = el("g", { id: `head-${i}` }, defs);
    h.paths.forEach((p) => el("path", { d: p.d, fill: p.fill }, g));
  });

  const gAxis = el("g", { class: "axis" }, svg);
  const gField = el("g", { class: "field" }, svg);
  const gSpan = el("g", {}, svg);
  const gTimeline = el("g", { class: "timeline" }, svg);

  // y axis
  const yTitle = el("text", { class: "axis-title", "text-anchor": "end" }, gAxis);
  yTitle.textContent = "DURATION";
  const yUnit = el("text", { class: "axis-label", "text-anchor": "end" }, gAxis);
  yUnit.textContent = "(years)";
  const yTicks = [];
  const yStep = Y_MAX > 16 ? 4 : 2;
  [1, ...Array.from({ length: Y_MAX / yStep }, (_, k) => (k + 1) * yStep)].forEach((d) => {
    const t = el("text", { class: "axis-label", "text-anchor": "middle" }, gAxis);
    t.textContent = d;
    yTicks.push({ d, t });
  });
  // x axis (rebuilt each frame — cheap)
  const gXTicks = el("g", {}, gAxis);

  // span bar shown on hover: start → end along the baseline
  const spanBar = el("rect", { class: "span-bar", height: 4, rx: 2 }, gSpan);
  const spanLabel = el("text", { class: "span-label", "text-anchor": "middle" }, gSpan);

  // paddies — draw biggest first so smaller grains stay visible on top
  const drawOrder = [...famines].sort((a, b) => b.deaths - a.deaths || a.duration - b.duration);
  drawOrder.forEach((f) => {
    const g = el("g", { class: "paddy", tabindex: "0", role: "button", "aria-label": `${f.name}, ${f.region}, ${f.start}–${f.end}, about ${fmtDeaths(f.deaths)} deaths` }, gField);
    f.g = g;
    f.hit = el("path", { class: "hit" }, g);
    f.stem = el("path", { class: "stem" }, g);
    f.headG = el("g", { class: "head" }, g);
    el("use", { href: `#head-${f.bin}` }, f.headG);
    g.__famine = f;
    g.addEventListener("focus", () => focus(f));
    g.addEventListener("blur", () => unfocus(f));
  });

  // ---------- focus / detail card ----------
  let focused = null;
  // hover is resolved from the pointer position each move (robust to stems swaying / re-ordering under the cursor)
  function hoverAt(evt) {
    if (drag) return;
    const n = document.elementFromPoint(evt.clientX, evt.clientY);
    const g = n && n.closest && n.closest(".paddy");
    const f = g ? g.__famine : null;
    if (f === focused) return;
    if (focused) unfocus(focused);
    if (f) focus(f);
  }
  svg.addEventListener("pointermove", hoverAt);
  svg.addEventListener("pointerleave", () => focused && unfocus(focused));

  function focus(f) {
    if (focused && focused !== f) unfocus(focused);
    focused = f;
    gField.classList.add("has-focus");
    famines.forEach((o) => o.g.classList.toggle("focus", o === f));
    gField.appendChild(f.g); // raise
    legendEl.classList.add("dim");
    legendEl.querySelectorAll(".legend-item").forEach((n, i) => n.classList.toggle("on", i === f.bin));
    card.innerHTML = `
      <h3>${f.name}</h3>
      <p class="where">${f.region}</p>
      <p class="deaths">${fmtDeaths(f.deaths)}</p>
      <p class="deaths-label">estimated deaths</p>
      <dl>
        <dt>Years</dt><dd>${fmtYear(f.start)}${f.end !== f.start ? " – " + fmtYear(f.end) : ""}</dd>
        <dt>Duration</dt><dd>${f.duration} year${f.duration > 1 ? "s" : ""}</dd>
        <dt>Grain size</dt><dd>${BINS[f.bin].label}</dd>
      </dl>
      ${f.note ? `<p class="note">${f.note}</p>` : ""}`;
    card.hidden = false;
    requestAnimationFrame(() => card.classList.add("show"));
    spanBar.classList.add("on");
    spanLabel.classList.add("on");
  }
  function unfocus(f) {
    if (focused !== f) return;
    focused = null;
    gField.classList.remove("has-focus");
    f.g.classList.remove("focus");
    legendEl.classList.remove("dim");
    card.classList.remove("show");
    spanBar.classList.remove("on");
    spanLabel.classList.remove("on");
  }
  function placeCard(f) {
    const r = card.getBoundingClientRect();
    let x = f.hx + 28;
    let y = f.hy - r.height - 20;
    if (x + r.width > W - 16) x = f.bx - r.width - 28;
    x = clamp(x, 16, W - r.width - 16);
    y = clamp(y, 16, L.baseline - r.height - 10);
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
  }

  // ---------- legend ----------
  function headSvg(i, size) {
    const h = HEADS[i];
    const [x0, y0, x1, y1] = h.bbox;
    // all legend glyphs share one scale so their sizes compare honestly
    const s = size / (HEADS[HEADS.length - 1].bbox[3] - HEADS[HEADS.length - 1].bbox[1]);
    const w = (x1 - x0) * s, hh = (y1 - y0) * s;
    return `<svg width="${Math.max(w, 6).toFixed(1)}" height="${hh.toFixed(1)}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" aria-hidden="true">${h.paths.map((p) => `<path d="${p.d}" fill="${p.fill}"/>`).join("")}</svg>`;
  }
  legendEl.innerHTML = `<span class="legend-title">Deaths</span>` +
    BINS.map((b, i) => `<div class="legend-item">${headSvg(i, 46)}<span>${b.label}</span></div>`).join("");
  document.getElementById("introLegend").innerHTML = BINS.map((b, i) => headSvg(i, 60)).join("");

  // ---------- x-axis ticks ----------
  function niceStep(span, count) {
    const raw = span / count;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
  }
  function renderXAxis() {
    gXTicks.textContent = "";
    const span = view.b - view.a;
    const major = niceStep(span, W < 720 ? 4 : 7);
    const minor = major / (major >= 10 ? 10 : 5);
    const y0 = L.baseline + 6;
    let d = "";
    for (let yr = Math.ceil(view.a / minor) * minor; yr <= view.b + 1e-6; yr += minor) {
      const x = xYear(yr);
      const isMajor = Math.abs(yr / major - Math.round(yr / major)) < 1e-6;
      d += `M${x.toFixed(1)} ${y0}v${isMajor ? 7 : 4}`;
      if (isMajor) {
        const t = el("text", { class: "axis-label", x: x.toFixed(1), y: y0 + 22, "text-anchor": "middle" }, gXTicks);
        t.textContent = fmtYear(yr);
      }
    }
    el("path", { d, class: "tick" }, gXTicks);
  }

  // ---------- timeline (bottom range slider) ----------
  const tlLabel = el("text", { class: "tl-label" }, gTimeline);
  tlLabel.textContent = "TIMELINE";
  const tlTrack = el("rect", { class: "tl-track", height: 24, fill: "transparent" }, gTimeline);
  const tlTicks = el("path", { class: "tick" }, gTimeline);
  const tlMarks = el("g", {}, gTimeline);
  const tlBand = el("rect", { class: "tl-band", height: 8, rx: 4, fill: "url(#bandGrad)" }, gTimeline);
  const tlBandTicks = el("path", { stroke: "rgba(199,109,57,0.45)", "pointer-events": "none" }, gTimeline);
  const handles = ["a", "b"].map((k) => {
    const hit = el("circle", { class: "tl-handle-hit", r: 20 }, gTimeline);
    const c = el("circle", { class: "tl-handle", r: 10 }, gTimeline);
    const label = el("text", { class: "tl-year", "text-anchor": "middle" }, gTimeline);
    return { k, hit, c, label };
  });

  function renderTimelineStatic() {
    tlLabel.setAttribute("x", L.tlLeft);
    tlLabel.setAttribute("y", L.tlY + 4);
    if (W < 720) tlLabel.setAttribute("y", L.tlY - 16);
    tlTrack.setAttribute("x", L.tlStart);
    tlTrack.setAttribute("y", L.tlY - 12);
    tlTrack.setAttribute("width", L.tlW);
    let d = "";
    for (let yr = DOMAIN[0]; yr <= DOMAIN[1]; yr += 10) {
      d += `M${tlX(yr).toFixed(1)} ${L.tlY - 2}v4`;
    }
    tlTicks.setAttribute("d", d);
    tlMarks.textContent = "";
    famines.forEach((f) => el("circle", { class: "tl-mark", cx: tlX(f.start), cy: L.tlY + 14, r: 1.2 + f.bin * 0.45 }, tlMarks));
  }
  function renderTimeline() {
    const xa = tlX(target.a), xb = tlX(target.b);
    tlBand.setAttribute("x", xa);
    tlBand.setAttribute("y", L.tlY - 4);
    tlBand.setAttribute("width", Math.max(0, xb - xa));
    let d = "";
    for (let yr = Math.ceil(target.a / 10) * 10; yr <= target.b; yr += 10) d += `M${tlX(yr).toFixed(1)} ${L.tlY - 2}v4`;
    tlBandTicks.setAttribute("d", d);
    [[handles[0], xa, target.a], [handles[1], xb, target.b]].forEach(([h, x, yr]) => {
      for (const n of [h.hit, h.c]) { n.setAttribute("cx", x); n.setAttribute("cy", L.tlY); }
      h.label.setAttribute("x", x);
      h.label.setAttribute("y", L.tlY - 18);
      h.label.textContent = fmtYear(yr);
    });
    // keep handle labels from colliding
    if (xb - xa < 44) {
      handles[0].label.setAttribute("x", (xa + xb) / 2 - 22);
      handles[1].label.setAttribute("x", (xa + xb) / 2 + 22);
    }
  }

  // dragging on the timeline
  let drag = null;
  function svgPoint(evt) {
    const r = svg.getBoundingClientRect();
    return { x: ((evt.clientX - r.left) / r.width) * W, y: ((evt.clientY - r.top) / r.height) * H };
  }
  handles.forEach((h) => {
    const start = (evt) => {
      evt.preventDefault();
      drag = { type: h.k };
      h.c.classList.add("drag");
      svg.setPointerCapture(evt.pointerId);
    };
    h.hit.addEventListener("pointerdown", start);
    h.c.addEventListener("pointerdown", start);
  });
  tlBand.addEventListener("pointerdown", (evt) => {
    evt.preventDefault();
    drag = { type: "band", x0: svgPoint(evt).x, a0: target.a, b0: target.b };
    svg.setPointerCapture(evt.pointerId);
  });
  tlTrack.addEventListener("pointerdown", (evt) => {
    // click on the bare track: centre the current window there
    const yr = tlYear(svgPoint(evt).x);
    const span = target.b - target.a;
    setTarget(yr - span / 2, yr + span / 2);
  });

  // dragging / zooming on the field itself
  svg.addEventListener("pointerdown", (evt) => {
    if (drag) return;
    const p = svgPoint(evt);
    if (p.y > L.top - 200 && p.y < L.baseline + 40) {
      drag = { type: "pan", x0: p.x, a0: target.a, b0: target.b };
      svg.setPointerCapture(evt.pointerId);
    }
  });
  svg.addEventListener("pointermove", (evt) => {
    if (!drag) return;
    const p = svgPoint(evt);
    if (drag.type === "a") setTarget(Math.min(tlYear(p.x), target.b - MIN_SPAN), target.b);
    else if (drag.type === "b") {
      const b = clamp(tlYear(p.x), target.a + MIN_SPAN, DOMAIN[1]);
      target.b = b; renderTimeline();
    } else if (drag.type === "band") {
      const dy = ((p.x - drag.x0) / L.tlW) * (DOMAIN[1] - DOMAIN[0]);
      setTarget(drag.a0 + dy, drag.b0 + dy);
    } else if (drag.type === "pan") {
      const dy = -((p.x - drag.x0) / L.plotW) * (drag.b0 - drag.a0);
      setTarget(drag.a0 + dy, drag.b0 + dy);
    }
  });
  const endDrag = () => {
    if (!drag) return;
    handles.forEach((h) => h.c.classList.remove("drag"));
    drag = null;
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);

  svg.addEventListener("wheel", (evt) => {
    evt.preventDefault();
    const p = svgPoint(evt);
    const span = target.b - target.a;
    if (Math.abs(evt.deltaX) > Math.abs(evt.deltaY)) {
      const dy = (evt.deltaX / L.plotW) * span;
      setTarget(target.a + dy, target.b + dy);
      return;
    }
    const pivot = p.y > L.tlY - 30 ? tlYear(p.x) : lerp(target.a, target.b, clamp((p.x - L.left) / L.plotW, 0, 1));
    const k = Math.exp(evt.deltaY * 0.0015);
    const ns = clamp(span * k, MIN_SPAN, DOMAIN[1] - DOMAIN[0]);
    const t = (pivot - target.a) / span;
    setTarget(pivot - t * ns, pivot - t * ns + ns);
  }, { passive: false });

  svg.addEventListener("dblclick", () => setTarget(DOMAIN[0], DOMAIN[1]));

  window.addEventListener("keydown", (evt) => {
    if (document.getElementById("intro").classList.contains("gone") === false) return;
    const span = target.b - target.a;
    if (evt.key === "ArrowLeft") setTarget(target.a - span * 0.1, target.b - span * 0.1);
    else if (evt.key === "ArrowRight") setTarget(target.a + span * 0.1, target.b + span * 0.1);
    else if (evt.key === "+" || evt.key === "=") setTarget(target.a + span * 0.1, target.b - span * 0.1);
    else if (evt.key === "-") setTarget(target.a - span * 0.12, target.b + span * 0.12);
    else if (evt.key === "0") setTarget(DOMAIN[0], DOMAIN[1]);
  });

  // ---------- per-frame drawing ----------
  function drawPaddy(f, t) {
    const g = f.grow;
    const bx = xYear(f.start);
    const ex = xYear(f.end + 1);
    const h0 = L.baseline - yDur(f.duration);         // full stem height in px
    const h = h0 * easeOutBack(g);
    const head = HEADS[f.bin];

    // wind: taller stems sway more; slow, layered sine for an organic feel
    const wind = REDUCED ? 0 : Math.sin(t * 0.0009 + f.phase) * 0.6 + Math.sin(t * 0.0021 + f.phase * 1.7) * 0.4;
    const sway = wind * (4 + h * 0.035);

    // the stem leans right a little, plus a share of the famine's actual span
    const spanPx = clamp(ex - bx, 0, h0 * 0.9);
    const dx = h * f.lean + spanPx * 0.5 * g + sway;
    const hx = bx + dx;
    const hy = L.baseline - h;

    // grain orientation: designed angle + personal tilt + wind
    const rot = f.tilt + wind * 0.05;
    const ang = head.angle + rot;
    // stem flows into the grain: last control point sits back along the grain's axis
    const reach = Math.max(18, h * f.bow);
    const c2x = hx - Math.cos(ang) * reach;
    const c2y = hy - Math.sin(ang) * reach;
    // first control point: leaves the ground at a soft angle (the shallow "S" of the reference board)
    const c1x = bx + dx * 0.55;
    const c1y = L.baseline - h * 0.12;

    const d = `M${bx.toFixed(1)} ${L.baseline.toFixed(1)}C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`;
    f.stem.setAttribute("d", d);
    f.hit.setAttribute("d", d);

    const s = L.headScale * clamp((g - 0.35) / 0.65, 0, 1);
    f.headG.setAttribute("transform",
      `translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${((rot) * 180 / Math.PI).toFixed(2)}) scale(${s.toFixed(3)}) translate(${-head.anchor.x} ${-head.anchor.y})`);

    // fade out paddies whose roots are outside the visible window
    const out = bx < L.left ? (L.left - bx) / 40 : bx > L.right ? (bx - L.right) / 40 : 0;
    const op = clamp(1 - out, 0, 1);
    f.g.style.display = op <= 0 ? "none" : "";
    f.g.setAttribute("opacity", op.toFixed(2));
    f.g.style.pointerEvents = op < 0.5 ? "none" : "";

    f.bx = bx; f.hx = hx; f.hy = hy; f.ex = ex;
  }

  function easeOutBack(x) {
    const c1 = 1.4, c3 = c1 + 1;
    return x <= 0 ? 0 : x >= 1 ? 1 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function renderYAxis() {
    const tx = W < 720 ? 8 : L.left - 12;
    const anchor = W < 720 ? "start" : "end";
    yTitle.setAttribute("text-anchor", anchor);
    yUnit.setAttribute("text-anchor", anchor);
    yTitle.setAttribute("x", tx);
    yTitle.setAttribute("y", L.top - 50);
    yUnit.setAttribute("x", tx);
    yUnit.setAttribute("y", L.top - 34);
    yTicks.forEach(({ d, t }) => {
      t.setAttribute("x", L.left - 4);
      t.setAttribute("y", yDur(d) + 4);
    });
  }

  let started = false, startT = 0, last = 0;
  function frame(t) {
    const dt = Math.min(48, t - (last || t)) / 16.67;
    last = t;

    // elastic spring: the field's time window chases the timeline selection, overshooting a little
    const K = REDUCED ? 1 : 0.075, D = 0.74;
    if (REDUCED) { view.a = target.a; view.b = target.b; }
    else {
      for (const k of ["a", "b"]) {
        const v = "v" + k;
        view[v] = (view[v] + (target[k] - view[k]) * K * dt) * Math.pow(D, dt);
        view[k] += view[v] * dt;
      }
    }
    if (view.b - view.a < 2) view.b = view.a + 2;

    if (started) {
      famines.forEach((f) => {
        f.grow = REDUCED ? 1 : clamp((t - startT - f.delay) / 1300, 0, 1);
      });
    }
    renderXAxis();
    famines.forEach((f) => drawPaddy(f, t));

    if (focused) {
      placeCard(focused);
      const x0 = focused.bx, x1 = Math.max(focused.ex, focused.bx + 3);
      spanBar.setAttribute("x", x0);
      spanBar.setAttribute("y", L.baseline - 2);
      spanBar.setAttribute("width", x1 - x0);
      spanLabel.setAttribute("x", (x0 + x1) / 2);
      spanLabel.setAttribute("y", L.baseline + 46);
      spanLabel.textContent = `${fmtYear(focused.start)}${focused.end !== focused.start ? "–" + fmtYear(focused.end) : ""}`;
    }
    requestAnimationFrame(frame);
  }

  function resize() {
    layout();
    renderYAxis();
    renderTimelineStatic();
    renderTimeline();
  }
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  // ---------- intro ----------
  const intro = document.getElementById("intro");
  const firstYear = Math.min(...famines.map((f) => f.start));
  function enter() {
    intro.classList.add("gone");
    if (!started) {
      started = true;
      startT = performance.now();
      // ease the field into the part of history that holds the data, so the elastic timeline is felt right away
      setTimeout(() => setTarget(Math.max(DOMAIN[0], Math.floor((firstYear - 40) / 10) * 10), DOMAIN[1]), 900);
    }
  }
  document.getElementById("enterBtn").addEventListener("click", enter);
  document.getElementById("aboutBtn").addEventListener("click", () => {
    intro.classList.remove("gone");
    document.getElementById("enterBtn").textContent = "Back to the field";
  });
  intro.addEventListener("keydown", (e) => { if (e.key === "Escape") enter(); });

  // allow ?skip to jump straight into the field (handy while iterating)
  if (/[?&]skip\b/.test(location.search)) enter();
})();
