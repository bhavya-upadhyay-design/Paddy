"""Convert data/famines.csv into data/famines.js for the site.

CSV columns: Famine name, Year, Deaths from famines
  - "Year" may be a single year (1943), a range (1876-1879) or a decade (1690s).
  - "Famine name" may be "Region- Specific name" or just a region.
Run:  python3 scripts/build_data.py
"""
import csv, json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
REGION_OVERRIDES = {"Kanki famine": "Japan"}  # rows whose name has no region part
START_YEAR = 1600  # famines that begin before this year are left out, and the timeline starts here


def clean(s):
    s = re.sub(r"[\[\]]", "", s or "")
    s = re.sub(r"\s+", " ", s).strip()
    return s.replace("femine", "famine")


def parse_years(y):
    y = y.strip()
    if m := re.fullmatch(r"(\d{3,4})s", y):
        a = int(m.group(1)); return a, a + 9
    if m := re.fullmatch(r"(\d{3,4})\s*[-–]\s*(\d{3,4})", y):
        return int(m.group(1)), int(m.group(2))
    return int(y), int(y)


rows = []
with open(ROOT / "data/famines.csv", newline="", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        raw = clean(r.get("Famine name"))
        if not raw:
            continue
        start, end = parse_years(r["Year"])
        deaths = int(re.sub(r"[^\d]", "", r["Deaths from famines"]))
        parts = re.split(r"\s*-\s+|-(?=Famine)", raw, maxsplit=1)   # "Egypt- Name" but not "Austria-Hungary"
        region = re.sub(r"\s*\d{4}\s*-\s*\d{4}$", "", parts[0]).strip()
        if len(parts) == 2:
            name = parts[1]
        elif raw in REGION_OVERRIDES:
            name, region = raw, REGION_OVERRIDES[raw]
        else:
            name = f"Famine in {region}"
        rows.append({"name": name, "region": region, "start": start, "end": end, "deaths": deaths})

rows = [r for r in rows if r["start"] >= START_YEAR]
rows.sort(key=lambda r: (r["start"], r["end"]))
first = START_YEAR
out = f"""/*
 * FAMINE DATA. Generated from data/famines.csv by scripts/build_data.py. Edit the CSV, then rerun the script.
 * {len(rows)} famines starting {START_YEAR} or later, {rows[0]["start"]} to {max(r['end'] for r in rows)}.
 */
window.FAMINES = {json.dumps(rows, ensure_ascii=False, indent=1)};

/* Death-toll bins → paddy artwork (smallest grain → biggest grain). `max` is exclusive. */
window.DEATH_BINS = [
  {{ max: 100000,   label: "< 100K" }},
  {{ max: 500000,   label: "100K – 500K" }},
  {{ max: 1000000,  label: "500K – 1M" }},
  {{ max: 3000000,  label: "1M – 3M" }},
  {{ max: 10000000, label: "3M – 10M" }},
  {{ max: Infinity, label: "10M +" }}
];

/* Timeline start (START_YEAR in scripts/build_data.py). */
window.TIMELINE_DOMAIN = [{first}, 2026];
"""
(ROOT / "data/famines.js").write_text(out, encoding="utf-8")
print(len(rows), "famines; domain", first, "→ 2026")
