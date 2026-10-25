// Samen spelen (#434): een gast werkt op zijn eigen akker, in de wereld van wie het spel opende. De trekker van de boerderij zou
// een voertuig in die wereld zetten (boerderijwereld.js doet daarom niets bij een gast); in plaats daarvan speelt de gast de klus
// als lokale minigame op zijn eigen scherm, net als hengelen (GAST_ACTIVITEITEN in coopgast.js, docs/COOP-GAST.md). Hij staat stil
// (input.stil via updateActivitiesGast) en de anderen zien hem met een hark (coopbezig.js, coopbezig3d.js). Wat hij doet is van hem:
// het materiaal betaalt hij uit zijn eigen geld, de oogst en de loopbaanpunten gaan naar zijn eigen boerderij (boerderijlive.js).
// De akker ligt op de plek van zijn eigen perceel; heeft hij er nog geen, dan op de vaste akker bij Hoogkerk (dezelfde plek als de
// bijbaan, sidejob_boerderij.js). Geen nieuw netwerkformaat: alleen het bestaande bericht { k: 'bezig', a } (PROTO blijft 2).
import { getBoerderij, neemTaak, rondAf, zetPerceel } from './boerderijlive.js';
import * as B from './boerderij.js';
import { createBoard } from './minigamekit.js';
import { wgsToWorld } from './rdnew.js';

export const RONDEN = 4;         // vier werkgangen over de akker
export const TREFFER = 0.16;     // zo dicht bij het midden van de baan telt de slag
const WACHT = 0.3;               // s tussen twee werkgangen
const REIK = 12;                 // m van de akker tot waar je hem ziet
const ACCENT = '#b98b2e';
const HOOGKERK = wgsToWorld(53.2336, 6.4977); // de vaste akker bij Hoogkerk (sidejob_boerderij.js)

const pct = (f) => `${Math.round(Math.max(0, Math.min(1, f)) * 100)}%`;
const taakNaam = (taak) => (B.TAKEN[taak] && B.TAKEN[taak].naam) || taak;

let game = null;   // de lopende klus, of null
let board = null;

// De klus: een balk die heen en weer gaat; elke werkgang druk je op het juiste moment op Spatie. Pure logica (scripts/boerderijgast_test.mjs).
export function maakKlus(taak, rng = Math.random) {
  return { taak, ronde: 0, raak: 0, pos: 0.5, richt: 1, tempo: 0.9 + rng() * 0.5, wacht: 0, klaar: false, fractie: 0, uitslag: [], flash: null, bad: false, flashT: 0 };
}
export function tikKlus(s, dt, druk = false) {
  if (!s || s.klaar) return null;
  if (s.wacht > 0) { s.wacht = Math.max(0, s.wacht - dt); return null; }
  s.pos += s.richt * s.tempo * dt;
  if (s.pos > 1) { s.pos = 1; s.richt = -1; } else if (s.pos < 0) { s.pos = 0; s.richt = 1; }
  if (!druk) return null;
  const raak = Math.abs(s.pos - 0.5) <= TREFFER;
  s.uitslag.push(raak);
  if (raak) s.raak++;
  s.ronde++;
  if (s.ronde >= RONDEN) { s.klaar = true; s.fractie = s.raak / RONDEN; return { raak, klaar: true, fractie: s.fractie }; }
  s.pos = 0; s.richt = 1; s.wacht = WACHT; // de volgende werkgang begint bij de rand: niet steeds op goed geluk drukken
  return { raak, klaar: false };
}

// Waar de akker van deze gast ligt. Zijn eigen perceel als dat er is, anders de vaste akker bij Hoogkerk.
export function akkerPlek(w) {
  const b = getBoerderij();
  const p = B.veldPositie(b, b.veldVan);
  return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : { x: HOOGKERK[0], y: HOOGKERK[1] };
}
// De eerstvolgende klus op de akker (afleveren is geen werk op het land), of null als het gewas nog groeit.
export function volgendeKlus() {
  const b = getBoerderij();
  const o = B.opties(b, { vrij: true }).find((x) => x.taak !== 'afleveren');
  return o ? o.taak : null;
}
const dichtbij = (w) => {
  if (!w || w.coopRole !== 'client' || w.coopInVoertuig || !w.player) return false;
  const p = akkerPlek(w);
  return Math.hypot(w.player.x - p.x, w.player.y - p.y) <= REIK;
};
const geenKlus = (b) => (b.schuur.kg > 0 ? 'Je schuur is vol: laat de oogst afleveren' : B.wacht(b) ? `Het gewas groeit nog ${Math.ceil(B.wacht(b).uren)} uur` : 'Er is nu niets te doen');

function toon() {
  if (!board || !game) return;
  board.set({
    row: `<span>${taakNaam(game.taak)}</span><span><b>${game.raak}</b>/${RONDEN} goed</span>`,
    cells: Array.from({ length: RONDEN }, (_, i) => ({ t: `${i + 1}`, cls: i < game.ronde ? (game.uitslag[i] ? 'good' : 'bad') : i === game.ronde ? 'on' : '' })),
    meter: { v: game.pos, mark: 0.5, color: ACCENT, text: `werkgang ${Math.min(RONDEN, game.ronde + 1)} van ${RONDEN}` },
    flash: game.flash, bad: !!game.bad,
    help: '[Spatie] in het midden van de balk · Backspace stopt',
  });
}

function einde(w, { stop = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  if (board) board.hide();
  if (stop) { w.addMessage('Je stopt met de klus. Het materiaal is al betaald.', 3); return; }
  const uit = rondAf(w, g.taak, g.fractie, { vrij: true });
  const kg = uit && Number.isFinite(uit.kg) && uit.kg > 0 ? ` ${uit.kg} kg in de schuur.` : '';
  w.addMessage(`${taakNaam(g.taak)}: klaar (${pct(g.fractie)} netjes).${kg}`, 5, { kind: g.fractie >= 0.5 ? 'tip' : 'info', kicker: 'Boerenwerk', key: 'boeren-klaar' });
}

function start(w) {
  if (game) return true;
  if (!dichtbij(w)) return false;
  const b = getBoerderij();
  if (!b.perceel) zetPerceel({ x: HOOGKERK[0], y: HOOGKERK[1], a: 0 }); // de eerste klus zet de akker vast, net als bij de bijbaan
  const taak = volgendeKlus();
  if (!taak) {
    w.addMessage(`Je akker: ${geenKlus(b).toLowerCase()}.`, 3);
    return true;
  }
  const nm = neemTaak(w, taak, { vrij: true });
  if (!nm.ok) { w.addMessage(nm.reden, 3); return true; }
  game = maakKlus(taak);
  if (!board && typeof document !== 'undefined') board = createBoard('Boerenwerk', ACCENT); // in de pure tests is er geen scherm
  if (board) board.show();
  toon();
  return true;
}

// activities.js: een gast speelt de klus op zijn eigen scherm. De wereld van de host verandert niet.
export const BOEREN = {
  id: 'boeren',
  name: 'Boerenwerk',
  label: 'Boeren',
  init: () => {},
  spots: () => [],
  isActive: () => !!game,
  active: () => !!game,
  interact: (w) => start(w),
  update: (dt, w) => {
    if (!game) return;
    const inp = w.input;
    if (inp && inp.wasPressed('backspace')) { inp.consume('backspace'); einde(w, { stop: true }); return; }
    let druk = false;
    if (inp && inp.wasPressed(' ')) { druk = true; inp.consume(' '); }
    if (game.flashT > 0) { game.flashT = Math.max(0, game.flashT - dt); if (game.flashT === 0) { game.flash = null; game.bad = false; } }
    const ev = tikKlus(game, dt, druk);
    if (ev) { game.flash = ev.raak ? 'Mooi recht' : 'Naast de baan'; game.bad = !ev.raak; game.flashT = 0.7; }
    if (game && game.klaar) { einde(w); return; }
    toon();
  },
  tick: () => {},
  prompt: (w) => {
    if (game || !dichtbij(w)) return null;
    const p = akkerPlek(w), taak = volgendeKlus();
    const sub = taak ? `${taakNaam(taak)} op je eigen akker` : geenKlus(getBoerderij());
    return { id: 'boeren', x: p.x, y: p.y, h: 1.0, key: 'E', label: 'Boerenwerk', sub, ring: false, dim: !taak };
  },
  quit: (w) => einde(w, { stop: true }),
  debug: () => ({ state: () => (game ? { ...game } : null) }),
};
