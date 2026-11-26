// Builds the "in-between" (lighter) version of each paddy head and stores it in js/paddy-heads.js
// as `light`. Run with Node + Playwright:  node scripts/build_light_heads.js
//
// Each head's own stem curve (from the Figma export in assets/paddy) is used as its spine.
// Recipe: keep the designed tip exactly as drawn and drop the lowest grains at the base of the head
// (about a quarter of them, keeping at least 4). The stem then joins at the new base (`lightAnchor`).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const file = path.join(ROOT, "js", "paddy-heads.js");
const src = fs.readFileSync(file, "utf8");
const marker = "window.PADDY_HEADS =";
const heads = JSON.parse(src.slice(src.indexOf(marker) + marker.length).trim().replace(/;$/, ""));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (let i = 0; i < heads.length; i++) {
    const svg = fs.readFileSync(path.join(ROOT, "assets", "paddy", `paddy-${i + 1}.svg`), "utf8");
    await page.setContent(svg);
    const built = await page.evaluate(({ h }) => {
      const stem = [...document.querySelectorAll("path")].find((p) => p.getAttribute("stroke"));
      const total = stem.getTotalLength();
      const spine = [];
      for (let s = 0; s <= total; s += 1) spine.push(stem.getPointAtLength(s));
      // orient spine from the ground up, so position along it grows toward the tip
      if (spine[0].y < spine.at(-1).y) spine.reverse();
      const tangent = (k) => {
        const a = spine[Math.max(0, k - 4)], b = spine[Math.min(spine.length - 1, k + 4)];
        const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        return { x: (b.x - a.x) / L, y: (b.y - a.y) / L };
      };
      const nearest = (x, y) => {
        let best = 0, bd = Infinity;
        spine.forEach((p, k) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = k; } });
        return best;
      };
      const all = [...document.querySelectorAll("path")].filter((p) => p !== stem).map((n) => {
        const b = n.getBBox();
        const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        const k = nearest(cx, cy), t = tangent(k), p = spine[k];
        return { d: n.getAttribute("d"), fill: n.getAttribute("fill"), cx, cy, w: b.width, h: b.height,
          k, side: t.x * (cy - p.y) - t.y * (cx - p.x) };      // > 0 : right of the spine
      });
      // grains in order from the base of the head to the tip
      all.forEach((g) => { g.topK = nearest(g.cx, g.cy - g.h / 2); g.along = (g.k + g.topK) / 2; });
      const byAlong = [...all].sort((a, b) => a.along - b.along);
      // keep the designed tip intact: the grains dropped are the lowest ones, at the base of the head
      const keep = Math.max(4, Math.round(all.length * 0.75));
      const kept = byAlong.slice(all.length - keep);
      const grains = kept.map((g) => ({ d: g.d, fill: g.fill }));

      // the stem now joins the head at the base of the lowest remaining grain
      const lowestK = Math.min(...kept.map((g) => {
        const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
        n.setAttribute("d", g.d); document.querySelector("svg").appendChild(n);
        const L = n.getTotalLength(); let lo = Infinity;
        for (let s = 0; s <= L; s += L / 60) { const q = n.getPointAtLength(s); lo = Math.min(lo, nearest(q.x, q.y)); }
        n.remove();
        return lo;
      }));
      const a = spine[Math.max(0, lowestK)];
      const out = { grains, anchor: { x: +a.x.toFixed(2), y: +a.y.toFixed(2) } };
      return out;
    }, { h: heads[i] });
    heads[i].light = built.grains;
    heads[i].lightAnchor = built.anchor;
  }
  await browser.close();
  fs.writeFileSync(file, src.slice(0, src.indexOf(marker)) + marker + " " + JSON.stringify(heads, null, 1) + ";\n");
  console.log("light heads written (grains kept):", heads.map((h) => `${h.light.length}/${h.paths.length}`).join(", "));
})();
