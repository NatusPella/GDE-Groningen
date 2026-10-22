// Gebieden veroveren (#414): wat er te doen is. Verzamelt uit het spel de plekken waar iets te doen valt (de missies, de
// bijbanen, de minigames, de padelbanen en de vondsten en geheimen van de streken), met per taak de sleutels waarmee het
// spel meldt dat hij gedaan is (zie gebiedenlive.js), en de wijken, plaatsen en streken waar het in ligt.
// Alleen hier komen de modules van het spel samen; gebieden.js en gebiedenlive.js blijven pure regels.

import { getMissionList } from './missionquery.js';
import { getSideJobList } from './sidejobs.js';
import { activitySpots } from './activities.js';
import { getPadelSpotsForRender } from './padel.js';
import { FINDS, findPos, STREKEN, SET_VERZAMEL, SET_GEHEIM } from './regioleven.js';
import { worldPlaceList } from './worldplaces.js';
import { wgsToWorld } from './rdnew.js';
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

// De bron voor gebiedenlive.initGebieden: een functie die de indeling-invoer geeft, of null zolang de wereld nog niet klaar is.
export function maakBron(world) {
  return () => {
    const meta = world && world.map && world.map.meta;
    const wijken = (meta && meta.neighbourhoodPoints) || [];
    const taken = verzamelTaken();
    // wachten tot de missies en bijbanen er zijn, anders zaait een nieuwe sleutel op een halve lijst
    if (!wijken.length || !taken.some((t) => t.soort === 'missie') || !taken.some((t) => t.soort === 'baan')) return null;
    const sx = wijken.reduce((a, p) => a + p.x, 0) / wijken.length, sy = wijken.reduce((a, p) => a + p.y, 0) / wijken.length;
    const streken = STREKEN.map((s) => { const [x, y] = wgsToWorld(s.at[0], s.at[1]); return { id: s.id, naam: s.name, x, y, reach: s.reach }; });
    return { wijken: wijken.map((p) => ({ naam: p.name, x: p.x, y: p.y })), plaatsen: worldPlaceList(), streken, stad: { x: sx, y: sy }, taken, bekend: bekendeSleutels };
  };
}
