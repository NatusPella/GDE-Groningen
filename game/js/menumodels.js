// Pure list models behind the garage and Prestaties sections of the pause menu (no DOM, no
// world): which category a vehicle falls in, how the list is grouped, filtered and sorted, which
// row stays selected after a filter change, and the orderings of the Prestaties tabs. garageui.js
// and achievementsui.js only draw what these return; scripts/menumodels_test.mjs covers them.

const GARAGE_CATS = [
  ['all', 'Alles'], ['autos', "Auto's"], ['bussen', 'Bussen'], ['fietsen', 'Fietsen'],
  ['scooters', 'Scooters'], ['boten', 'Boten'], ['luchtvaart', 'Lucht'], ['speciaal', 'Speciaal'],
];
export const GARAGE_FILTERS = [['all', 'alles'], ['owned', 'van jou'], ['sale', 'te koop'], ['locked', 'op slot']];
export const GARAGE_SORTS = [['naam', 'Op naam'], ['prijs', 'Op prijs'], ['snelheid', 'Op snelheid']];
const GARAGE_GROUPS = ['owned', 'sale', 'locked'];
const BIG_TYPES = new Set(['Bestelbus', 'Vrachtwagen', 'Midibus', 'Stadsbus', 'Tankwagen', 'Geldwagen']);

// Story/achievement unlocks are "Speciaal", whatever they drive like.
export function garageCategory(e) {
  const spec = e.spec || {};
  if (spec.kind === 'heli') return 'luchtvaart';
  if (spec.unlock) return 'speciaal';
  if (spec.kind === 'boat') return 'boten';
  if (spec.kind === 'bike') return 'fietsen';
  if (spec.kind === 'scooter') return 'scooters';
  if (e.kind === 'bus' || e.kind === 'truck' || BIG_TYPES.has(spec.type)) return 'bussen';
  return 'autos';
}
export const garageGroup = (e) => (e.owned ? 'owned' : e.locked ? 'locked' : 'sale');
export const garagePrice = (e) => e.price || (e.spec && e.spec.price) || 0;

const byName = (a, b) => String(a.model).localeCompare(String(b.model), 'nl');
const SORTERS = {
  naam: byName,
  prijs: (a, b) => garagePrice(a) - garagePrice(b) || byName(a, b),
  snelheid: (a, b) => b.topSpeed - a.topSpeed || byName(a, b),
};

// yours first, then for sale, then locked; within each group the chosen order
export function garageShown(list, view) {
  return list
    .filter((e) => (view.cat === 'all' || garageCategory(e) === view.cat) && (view.filter === 'all' || garageGroup(e) === view.filter))
    .sort((a, b) => GARAGE_GROUPS.indexOf(garageGroup(a)) - GARAGE_GROUPS.indexOf(garageGroup(b)) || (SORTERS[view.sort] || byName)(a, b));
}
// [{ group, items }] for the non-empty groups, in list order
export function garageSections(shown) {
  return GARAGE_GROUPS.map((group) => ({ group, items: shown.filter((e) => garageGroup(e) === group) })).filter((s) => s.items.length);
}
// per category tab: how many of them, how many are yours; empty categories get no tab
export function garageTabCounts(list) {
  return GARAGE_CATS.map(([id, label]) => {
    const all = list.filter((e) => id === 'all' || garageCategory(e) === id);
    return { id, label, total: all.length, owned: all.filter((e) => e.owned).length };
  }).filter((t) => t.total);
}
// the next entry of an [[id, label]] option list after `id`, wrapping round
export function cycleOption(options, id) {
  const i = options.findIndex(([o]) => o === id);
  return options[(i + 1) % options.length][0];
}
// after the list changes: keep the selected vehicle when it is still shown, else the first one
export function keepSelection(shown, selectedId) {
  if (!shown.length) return null;
  return shown.some((e) => e.id === selectedId) ? selectedId : shown[0].id;
}
// the id `step` rows further (wrapping), for a controller's up and down
export function stepSelection(shown, selectedId, step) {
  if (!shown.length) return null;
  const i = shown.findIndex((e) => e.id === selectedId);
  return shown[(((i < 0 ? 0 : i + step) % shown.length) + shown.length) % shown.length].id;
}

// --- Prestaties ---
export const achPct = (it) => (it.progress && it.progress.goal ? Math.max(0, Math.min(100, (it.progress.cur / it.progress.goal) * 100)) : 0);
// "Bijna binnen": started and not done, the furthest along first
export const achNear = (all) => all.filter((a) => !a.unlocked && !a.hidden && a.progress && a.progress.cur > 0).sort((a, b) => achPct(b) - achPct(a));
// "Behaald": newest first
export const achDone = (all) => all.filter((a) => a.unlocked).sort((a, b) => (b.at || 0) - (a.at || 0));
// inside a category: done ones first, then by progress
export const achCategoryOrder = (items) => [...items].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || achPct(b) - achPct(a));
export const achCategoryPct = (c) => (c.items.length ? Math.round((c.done / c.items.length) * 100) : 0);
// "vandaag", "gisteren", "3 dagen geleden"; `fmtDate(at)` gives the date from a week on
export function achWhen(at, now, tzOffsetMin, fmtDate) {
  const day = (t) => Math.floor((t - tzOffsetMin * 60000) / 86400000);
  const d = day(now) - day(at);
  if (d <= 0) return 'vandaag';
  if (d === 1) return 'gisteren';
  if (d < 7) return `${d} dagen geleden`;
  return fmtDate(at);
}

// A progress ring as an SVG circle: the stroke-dasharray of the filled part for `pct` (0-100)
export function ringDash(pct, r = 40) {
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return { circ: +circ.toFixed(2), dash: +((circ * p) / 100).toFixed(2), pct: Math.round(p) };
}

// The version line of the menu: shown once, in the pause menu. A development build has no number.
export const versionLabel = (v) => (v && v !== 'dev' ? 'GDE Groningen v' + String(v).replace(/^v/i, '') : 'GDE Groningen · ontwikkelversie');
