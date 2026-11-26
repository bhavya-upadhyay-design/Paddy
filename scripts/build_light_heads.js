// Builds the "in-between" (lighter) version of each paddy head and stores it in js/paddy-heads.js
// as `light`. Run with Node + Playwright:  node scripts/build_light_heads.js
//
// Each head's own stem curve (from the Figma export in assets/paddy) is used as its spine.
// Recipe:
//   1. keep the grains closest to the stem: about three quarters of them, at least 4
//   2. bring the top right grain over to the left (the next left-side grain of the artwork replaces it)
//   3. finish the tip with a very small grain centred on the spine
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
    heads[i].light = await page.evaluate(({ h }) => {
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
      // grains in order from the base of the head to the tip; each has a top point along the spine
      all.forEach((g) => { g.topK = nearest(g.cx, g.cy - g.h / 2); g.along = (g.k + g.topK) / 2; });
      const byAlong = [...all].sort((a, b) => a.along - b.along);
      const keep = Math.max(4, Math.round(all.length * 0.75));
      let kept = byAlong.slice(0, keep);
      const dropped = byAlong.slice(keep);

      // 2. bring the top right grain over to the left: drop the right-side grain at the top and use
      //    the next left-side grain from the artwork, so the left side reaches highest
      const topRight = kept.filter((g) => g.side > 0).sort((a, b) => b.along - a.along)[0];
      const nextLeft = dropped.filter((g) => g.side <= 0).sort((a, b) => a.along - b.along)[0];
      if (topRight && nextLeft) kept = kept.filter((g) => g !== topRight).concat(nextLeft);
      const out = kept.map((g) => ({ d: g.d, fill: g.fill }));

      // 3. a very small grain at the top centre of the head, pointing along the stem
      const outline = (g) => {
        const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
        n.setAttribute("d", g.d); document.querySelector("svg").appendChild(n);
        const L = n.getTotalLength(), pts = [];
        for (let s = 0; s <= L; s += L / 80) { const q = n.getPointAtLength(s); pts.push({ x: q.x, y: q.y }); }
        n.remove();
        return pts;
      };
      const tipK = Math.min(spine.length - 1, Math.max(...kept.map((g) => g.topK)));
      const dir = tangent(tipK);
      const extreme = (g) => outline(g).reduce((a, q) => (q.x * dir.x + q.y * dir.y > a.x * dir.x + a.y * dir.y ? q : a));
      const topOf = (list) => list.map((g) => ({ g, e: extreme(g) }))
        .sort((a, b) => (b.e.x * dir.x + b.e.y * dir.y) - (a.e.x * dir.x + a.e.y * dir.y))[0];
      const L = topOf(kept.filter((g) => g.side <= 0)), R = topOf(kept.filter((g) => g.side > 0));
      // the tip grain is a small copy of the narrowest top grain, its long axis turned to follow the stem
      const shape = (L || R).g;
      const pts = outline(shape);
      let p1 = pts[0], p2 = pts[0], far = -1;
      pts.forEach((a) => pts.forEach((b) => { const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2; if (d > far) { far = d; p1 = a; p2 = b; } }));
      if ((p2.x - p1.x) * dir.x + (p2.y - p1.y) * dir.y < 0) [p1, p2] = [p2, p1];
      const len = Math.sqrt(far);
      const scale = 0.4;
      const rot = (Math.atan2(dir.y, dir.x) - Math.atan2(p2.y - p1.y, p2.x - p1.x)) * 180 / Math.PI;
      // its base sits at the top centre: at the tip of the highest left grain, nudged toward the stem,
      // with the same small gap the artwork leaves between grains
      const lead = (L || R).e;
      const sp = spine[nearest(lead.x, lead.y)];
      const top = { x: lead.x + (sp.x - lead.x) * 0.15, y: lead.y + (sp.y - lead.y) * 0.15 };
      const back = -len * scale * 0.04;   // small gap, like the gaps between the other grains
      const baseAt = { x: top.x - dir.x * back, y: top.y - dir.y * back };
      out.push({ d: shape.d, fill: shape.fill,
        transform: `translate(${baseAt.x.toFixed(2)} ${baseAt.y.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${scale}) translate(${(-p1.x).toFixed(2)} ${(-p1.y).toFixed(2)})` });
      return out;
    }, { h: heads[i] });
  }
  await browser.close();
  fs.writeFileSync(file, src.slice(0, src.indexOf(marker)) + marker + " " + JSON.stringify(heads, null, 1) + ";\n");
  console.log("light heads written:", heads.map((h) => h.light.length).join(", "));
})();
