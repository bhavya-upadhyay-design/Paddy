# Paddy Field

An interactive visualization of famines since 1000 AD, drawn as a field of paddy.
It is modelled on the interaction of [Poppy Field](https://www.poppyfield.org/).

| Visual | Data |
| --- | --- |
| Where the stem is rooted on the x-axis | Year the famine began |
| Height where the stem meets the grain (y-axis) | Duration in years (`end − start + 1`) |
| Grain artwork (6 sizes, smallest → biggest) | Death toll, binned on a log-like scale |
| Bar along the baseline on hover | The famine's actual start → end span |

## Interaction
- **Elastic timeline**: drag either handle of the bottom timeline, or drag the coloured band to pan.
  The field springs toward the new range, overshoots slightly and settles.
- **Scroll** on the field (or on the timeline) to zoom around the cursor. Drag the field sideways to pan.
- **Double-click** (or press `0`) to reset to 1000 AD → 2026. The arrow keys and `+`/`-` also pan and zoom.
- **Hover** a paddy, or Tab to it, to open its detail card. The other paddies fade, and its legend size lights up.
- Stems sway gently in the wind. This is disabled under `prefers-reduced-motion`.

## Your data
Edit `data/famines.js`. The current figures are **placeholders**: rough, commonly cited estimates
used only to build the prototype. Each row needs `name`, `region`, `start`, `end`, `deaths`, and an optional `note`.
The death-toll bin thresholds (`DEATH_BINS`) and the timeline span (`TIMELINE_DOMAIN`) are in the same file.

## Files
- `index.html`, `css/style.css`, `js/app.js`: the site. Plain HTML, CSS and JS, with no build step.
- `js/paddy-heads.js`: the grain-head artwork exported from the Figma paddy frames, with stem anchor points.
- `assets/paddy/paddy-1…6.svg`: the original Figma exports, smallest → biggest.

## Run locally
```bash
python3 -m http.server 8000
```
Then open http://localhost:8000. Add `?skip` to the URL to bypass the intro screen.
