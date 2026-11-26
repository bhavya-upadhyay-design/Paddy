/*
 * FAMINE DATA — PLACEHOLDER
 * -------------------------------------------------------------
 * Replace this list with your own dataset. One object per famine:
 *
 *   name    – label shown on hover
 *   region  – country / region
 *   start   – first year (number; negative for BCE)
 *   end     – last year (number; same as start for a one-year famine)
 *   deaths  – estimated number of deaths (number)
 *   note    – optional short line shown in the detail card
 *
 * Duration (stem height) is computed as end − start + 1 years.
 * Grain size is picked from the death toll using DEATH_BINS below.
 *
 * The figures here are rough, commonly cited mid-range estimates used
 * only to make the prototype work. Historical famine tolls are highly
 * contested — swap in your sourced numbers before publishing.
 */
window.FAMINES = [
  { name: "Great Famine",               region: "Northern Europe",        start: 1315, end: 1317, deaths: 5000000 },
  { name: "Russian Famine",             region: "Tsardom of Russia",      start: 1601, end: 1603, deaths: 2000000 },
  { name: "Deccan Famine",              region: "India (Deccan)",         start: 1630, end: 1632, deaths: 7400000 },
  { name: "Great French Famine",        region: "France",                 start: 1693, end: 1694, deaths: 1300000 },
  { name: "Great Famine of Finland",    region: "Finland",                start: 1695, end: 1697, deaths: 150000 },
  { name: "Great Bengal Famine",        region: "India (Bengal)",         start: 1769, end: 1773, deaths: 10000000 },
  { name: "Chalisa Famine",             region: "North India",            start: 1783, end: 1784, deaths: 11000000 },
  { name: "Doji Bara Famine",           region: "India",                  start: 1789, end: 1792, deaths: 11000000 },
  { name: "Great Irish Famine",         region: "Ireland",                start: 1845, end: 1852, deaths: 1000000 },
  { name: "Odisha Famine",              region: "India (Odisha)",         start: 1866, end: 1866, deaths: 1000000 },
  { name: "Finnish Famine",             region: "Finland",                start: 1866, end: 1868, deaths: 150000 },
  { name: "Great Famine of 1876–78",    region: "India",                  start: 1876, end: 1878, deaths: 8000000 },
  { name: "Northern Chinese Famine",    region: "China",                  start: 1876, end: 1879, deaths: 10000000 },
  { name: "Russian Famine",             region: "Russian Empire",         start: 1891, end: 1892, deaths: 400000 },
  { name: "Indian Famine",              region: "India",                  start: 1899, end: 1900, deaths: 3000000 },
  { name: "Russian Famine",             region: "Soviet Russia",          start: 1921, end: 1922, deaths: 5000000 },
  { name: "Soviet Famine",              region: "USSR (incl. Holodomor)", start: 1930, end: 1933, deaths: 7000000 },
  { name: "Henan Famine",               region: "China",                  start: 1942, end: 1943, deaths: 2000000 },
  { name: "Bengal Famine",              region: "India (Bengal)",         start: 1943, end: 1944, deaths: 3000000 },
  { name: "Dutch Hunger Winter",        region: "Netherlands",            start: 1944, end: 1945, deaths: 20000 },
  { name: "Great Chinese Famine",       region: "China",                  start: 1959, end: 1961, deaths: 30000000 },
  { name: "Biafran Famine",             region: "Nigeria",                start: 1967, end: 1970, deaths: 1000000 },
  { name: "Ethiopian Famine",           region: "Ethiopia",               start: 1983, end: 1985, deaths: 1200000 },
  { name: "North Korean Famine",        region: "North Korea",            start: 1994, end: 1998, deaths: 600000 },
  { name: "Somalia Famine",             region: "Somalia",                start: 2011, end: 2012, deaths: 260000 }
];

/*
 * Death-toll bins → paddy artwork (smallest grain → biggest grain).
 * `max` is the upper bound (exclusive) of each bin; tweak to suit your data.
 */
window.DEATH_BINS = [
  { max: 100000,   label: "< 100K" },
  { max: 500000,   label: "100K – 500K" },
  { max: 1000000,  label: "500K – 1M" },
  { max: 3000000,  label: "1M – 3M" },
  { max: 10000000, label: "3M – 10M" },
  { max: Infinity, label: "10M +" }
];

/* Full span of the timeline (from your reference board: 1000 AD → 2026). */
window.TIMELINE_DOMAIN = [1000, 2026];
