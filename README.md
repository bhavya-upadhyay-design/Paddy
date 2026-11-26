# Unharvested

An interactive visualization of famines since 1600, drawn as a field of paddy (rice still in its husk).
It is modelled on the interaction of [Poppy Field](https://www.poppyfield.org/).

| Visual | Data |
| --- | --- |
| Where the stem is rooted on the x-axis | Year the famine began |
| Height where the stem meets the grain (y-axis) | Duration in years (`end − start + 1`) |
| Grain artwork (6 Figma sizes + an in-between version of each, smallest → biggest) | Death toll: band picks the paddy, lower half of a band uses the sparser in-between version, and size scales smoothly within it |
| Bar along the baseline on hover | The famine's actual start → end span |

## Interaction
- **Elastic timeline**: drag either handle of the bottom timeline, or drag the coloured band to pan.
  The field springs toward the new range, overshoots slightly and settles.
- **Scroll** on the field (or on the timeline) to zoom around the cursor. Drag the field sideways to pan.
- **Double-click** (or press `0`) to reset to the full range. The arrow keys and `+`/`-` also pan and zoom.
- **Hover** a paddy, or Tab to it, to open its detail card. The other paddies fade, and its legend size lights up.
- Stems sway gently in the wind. This is disabled under `prefers-reduced-motion`.

## Your data
The data lives in `data/famines.csv` (columns: Famine name, Year, Deaths from famines).
After editing it, regenerate the site's data file:
```bash
python3 scripts/build_data.py
```
The timeline starts at `START_YEAR` (1600) in the script; earlier famines are left out. The death-toll bin thresholds (`DEATH_BINS`) are set in the script.

## Files
- `index.html`, `css/style.css`, `js/app.js`: the site. Plain HTML, CSS and JS, with no build step.
- `js/paddy-heads.js`: the grain-head artwork exported from the Figma paddy frames, with stem anchor points, plus each head's in-between version (`light`: same designed tip, lowest grains removed), built by `node scripts/build_light_heads.js`.
- `assets/paddy/paddy-1…6.svg`: the original Figma exports, smallest → biggest.

## Run locally
```bash
python3 -m http.server 8000
```
Then open http://localhost:8000. Add `?skip` to the URL to bypass the intro screen.
