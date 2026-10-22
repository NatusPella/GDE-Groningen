// Gebieden veroveren (#414): wat er te doen is. Verzamelt uit het spel de plekken waar iets te doen valt (de missies, de
// bijbanen, de minigames, de padelbanen en de vondsten en geheimen van de streken), met per taak de sleutels waarmee het
// spel meldt dat hij gedaan is (zie gebiedenlive.js), en de wijken, plaatsen en streken waar het in ligt.
// Alleen hier komen de modules van het spel samen; gebieden.js en gebiedenlive.js blijven pure regels.

import { getMissionList } from './missionquery.js';
import { getSideJobList } from './sidejobs.js';
import { activitySpots } from './activities.js';
import { getPadelSpotsForRender } from './padel.js';
import { FINDS, findPos, SET_VERZAMEL, SET_GEHEIM } from './regioleven.js';
import { ontvouw } from './grenzen.js';
import { lifetimeSnapshot } from './achievements.js';
import { getProfiel as getLoopbaan } from './loopbaanlive.js';
import { VAK_IDS } from './loopbaan.js';
import { SPEL_SLEUTELS } from './gebieden.js';

const pos = (o) => ({ x: Number(o.x), y: Number(o.y) });

export function verzamelTaken() {
  const taken = [];
  for (const m of getMissionList()) {
    taken.push({ id: 'm:' + m.id, soort: 'missie', naam: m.label || m.id, ...pos(m.start), sleutels: ['m:' + m.id] });
  }
  for (const j of getSideJobList()) {
    taken.push({ id: 'b:' + j.id, soort: 'baan', naam: j.name, ...pos(j), sleutels: ['u:' + j.id] });
  }
  const spots = activitySpots(); // [{ kind: activiteit, id: naam van de plek, x, y }]
  for (const s of spots) {
    const sl = SPEL_SLEUTELS[s.kind];
    if (!sl) continue;
    const meer = spots.filter((o) => o.kind === s.kind).length > 1;
    taken.push({ id: `a:${s.kind}${meer ? ':' + s.id : ''}`, soort: 'spel', naam: String(s.id || s.kind), ...pos(s), sleutels: sl });
  }
  for (const s of getPadelSpotsForRender() || []) {
    taken.push({ id: 'a:padel:' + s.id, soort: 'spel', naam: s.name || 'Padelbaan', ...pos(s), sleutels: ['u:' + String(s.id)] });
  }
  for (const f of FINDS) {
    taken.push({ id: 'f:' + f.id, soort: f.kind === 'geheim' ? 'geheim' : 'vondst', naam: f.name, ...findPos(f), sleutels: ['v:' + f.id] });
  }
  return taken;
}

// Wat het spel al wist voor een nieuwe sleutel: klaar-missies, plekken van de loopbaan, tellers en gevonden dingen.
function bekendeSleutels() {
  const s = new Set();
  for (const m of getMissionList()) if (m.done) s.add('m:' + m.id);
  const lb = getLoopbaan();
  for (const v of VAK_IDS) for (const u of (lb.vakken[v] && lb.vakken[v].uniek) || []) s.add('u:' + u);
  const snap = lifetimeSnapshot();
  for (const [k, n] of Object.entries(snap.stats || {})) if (n > 0) s.add('s:' + k);
  for (const set of [SET_VERZAMEL, SET_GEHEIM]) for (const id of (snap.sets && snap.sets[set]) || []) s.add('v:' + id);
  return s;
}

// De echte grenzen (game/grenzen.json, scripts/world/grenzen.mjs): eenmaal geladen, op dezelfde manier als de andere gegevensbestanden
// naast index.html. Mislukt het laden, dan zijn er geen gebieden en blijven de taken bewaard.
let grenzen = null;
let grenzenKlaar = false;
let grenzenBezig = false;
export function laadGrenzen() {
  if (grenzenBezig || grenzenKlaar || typeof fetch !== 'function' || typeof location === 'undefined') return;
  grenzenBezig = true;
  fetch(new URL('grenzen.json', location.href).href)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { grenzen = ontvouw(j); })
    .catch((e) => { console.warn('grenzen niet geladen', e); })
    .finally(() => { grenzenKlaar = true; grenzenBezig = false; });
}
export const getGrenzen = () => grenzen;

// De bron voor gebiedenlive.initGebieden: een functie die de indeling-invoer geeft, of null zolang de wereld nog niet klaar is.
export function maakBron() {
  laadGrenzen();
  return () => {
    const taken = verzamelTaken();
    // wachten op de grenzen, en tot de missies en bijbanen er zijn, anders zaait een nieuwe sleutel op een halve lijst
    if (!grenzenKlaar || !taken.some((t) => t.soort === 'missie') || !taken.some((t) => t.soort === 'baan')) return null;
    return { grenzen, taken, bekend: bekendeSleutels };
  };
}
