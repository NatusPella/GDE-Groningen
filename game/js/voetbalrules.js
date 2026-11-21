// De regels en afmetingen van de voetbalwedstrijd in de Euroborg (#981, Voetbal Sim Light): puur, geen DOM en geen THREE (scripts/voetbal_test.mjs).
// Vijf tegen vijf op een klein veld, twee helften, verzonnen teams (geen echte clubs, spelers of merken). Wat de speler doet staat hier als invoerbits (zodat een
// gast dezelfde byte stuurt als bij het besturen van een voertuig), wat de computer doet in voetbalai.js, de bal in voetbalbal.js en de wedstrijd in voetbalmatch.js.
import { cleanDifficulty } from './difficulty.js';

// Het veld in meters, het midden is (0, 0): x is dwars (links/rechts voor het team dat naar voren kijkt), y is in de lengte. Team 0 verdedigt y = -L/2 en valt aan naar +y.
export const VELD = { B: 26, L: 42, DOEL_B: 4.4, DOEL_H: 1.7, DOEL_DIEPTE: 1.3, STRAF_B: 13, STRAF_D: 6.5, PAAL_R: 0.07, BAL_R: 0.11 };
export const DUREN = { kort: 45, normaal: 90 };     // seconden per helft
export const DUUR_STANDAARD = 'normaal';
export const HELFTEN = 2;
// De voorkeur kort of normaal komt uit een eigen sleutel (storagekeys.js KEYS.voetbal, alleen dit apparaat); leeg, corrupt of onzin geeft de standaard.
export function leesDuurVoorkeur(raw) {
  try { const d = JSON.parse(raw || 'null'); return d && DUREN[d.duur] ? d.duur : DUUR_STANDAARD; } catch (e) { return DUUR_STANDAARD; }
}
export const LOOP = { loop: 5.2, sprint: 7.6, keeper: 4.6, stamina_af: 0.3, stamina_bij: 0.18, stamina_min: 0.12 }; // m/s en stamina per seconde

// De bits van de invoer ({ mx, my, buttons }); my < 0 is vooruit, zoals bij elke Samen-wedstrijd (padel, kartbaan). Eén byte, dus geen nieuw protocol.
// Bits 16 en 32 zijn van de wapenknoppen van een gast (coopwapen.js) en blijven vrij; 4 (springen) en 8 (bukken) doet het lichaam van een gast tijdens een wedstrijd toch niet.
export const KNOP = { SPRINT: 1, SCHOT: 2, WISSEL: 4, TACKLE: 8, PASS: 64, LANG: 128 };
export const knopBits = ({ sprint = false, schot = false, pass = false, lang = false, tackle = false, wissel = false } = {}) =>
  (sprint ? KNOP.SPRINT : 0) | (schot ? KNOP.SCHOT : 0) | (pass ? KNOP.PASS : 0) | (lang ? KNOP.LANG : 0) | (tackle ? KNOP.TACKLE : 0) | (wissel ? KNOP.WISSEL : 0);
export const LAAD_S = 0.9;                // zoveel seconden houd je Schot of Lang voor volle kracht

// Welke canonieke toets welke knop is: dezelfde tabel voor het toetsenbord (de echte keymap, controls.js) en de uitleg. De controller gebruikt PAD_MAPS.voetbal.
export const TOETSEN = { sprint: 'shift', schot: ' ', pass: 'f', lang: 'e', tackle: 'control', wissel: 'q' };
// Wat een speler van het toetsenbord of de controller aan invoer maakt: puur; isDown(k) en axis() zijn de functies van input.js.
export function leesInvoer(isDown, axis) {
  const [ax, ay] = axis ? axis() : [0, 0];
  return { mx: Number.isFinite(ax) ? ax : 0, my: Number.isFinite(ay) ? ay : 0, buttons: knopBits({
    sprint: isDown(TOETSEN.sprint), schot: isDown(TOETSEN.schot), pass: isDown(TOETSEN.pass), lang: isDown(TOETSEN.lang), tackle: isDown(TOETSEN.tackle), wissel: isDown(TOETSEN.wissel),
  }) };
}
// De invoer als bedoeling op het veld: richting (x dwars, y vooruit voor wie naar +y kijkt) en de knoppen als vlaggen.
export function invoerNaarActie(inv) {
  const mx = inv && Number.isFinite(inv.mx) ? Math.max(-1, Math.min(1, inv.mx)) : 0;
  const my = inv && Number.isFinite(inv.my) ? Math.max(-1, Math.min(1, inv.my)) : 0;
  const b = inv && Number.isFinite(inv.buttons) ? inv.buttons | 0 : 0;
  const l = Math.hypot(mx, my);
  const k = l > 1 ? 1 / l : 1;
  return {
    dx: mx * k, dy: my ? -my * k : 0, sterkte: Math.min(1, l),
    sprint: !!(b & KNOP.SPRINT), schot: !!(b & KNOP.SCHOT), pass: !!(b & KNOP.PASS), lang: !!(b & KNOP.LANG), tackle: !!(b & KNOP.TACKLE), wissel: !!(b & KNOP.WISSEL),
  };
}

// De verzonnen teams: kleuren en bijnamen, geen echte club of speler. Het eerste is jouw team.
export const TEAMS = [
  { id: 'stadjers', naam: 'De Stadjers', kort: 'Stadjers', shirt: 0x2f9e5b, broek: 0xf4f1e8, keeperShirt: 0xf0c020 },
  { id: 'hunebedders', naam: 'De Hunebedders', kort: 'Hunebedders', shirt: 0xc0482b, broek: 0x3a3a3a, keeperShirt: 0x4aa3d8 },
  { id: 'wadlopers', naam: 'De Wadlopers', kort: 'Wadlopers', shirt: 0x2f6fb5, broek: 0xf4f1e8, keeperShirt: 0xe8e0c0 },
  { id: 'ommelanders', naam: 'De Ommelanders', kort: 'Ommelanders', shirt: 0x8a4ab5, broek: 0xe8c93a, keeperShirt: 0x6fcf6a },
  { id: 'veenpiraten', naam: 'De Veenpiraten', kort: 'Veenpiraten', shirt: 0x2a2f36, broek: 0xe8e0c0, keeperShirt: 0xff9a3c },
];
export const TEGENSTANDERS = TEAMS.slice(1);
export const tegenstander = (n) => TEGENSTANDERS[((n | 0) % TEGENSTANDERS.length + TEGENSTANDERS.length) % TEGENSTANDERS.length];

// De namen van de spelers van de computer (verzonnen, geen echte voetballers) en hun rol in de vorming 1-2-2: keeper, twee verdedigers, twee aanvallers.
export const ROLLEN = ['keeper', 'verdediger', 'verdediger', 'aanvaller', 'aanvaller'];
export const NAMEN_THUIS = ['Keeper Mans', 'Hinderk', 'Wietske', 'Tammo', 'Grietje'];
export const NAMEN_UIT = ['Keeper Bouwe', 'Roelof', 'Fenna', 'Jelmer', 'Marrit'];
// De basisplek per rol, gemeten van het eigen doel: u in -1..1 over de breedte, d in 0..1 over de lengte.
const VORMING = [{ u: 0, d: 0.04 }, { u: -0.42, d: 0.26 }, { u: 0.42, d: 0.26 }, { u: -0.4, d: 0.55 }, { u: 0.4, d: 0.62 }];

// De moeilijkheid: reactietijd van de computer, zijn snelheid, de afwijking van zijn schot (rad) en de keeper (0..1) en de tackle (kans). Gelezen uit de bestaande stand.
const AI_STAND = {
  ontspannen: { reactie: 0.46, tempo: 0.88, spreiding: 0.2, keeper: 0.5, tackle: 0.3, durf: 0.75 },
  standaard: { reactie: 0.28, tempo: 0.97, spreiding: 0.11, keeper: 0.72, tackle: 0.5, durf: 1 },
  uitdagend: { reactie: 0.16, tempo: 1.05, spreiding: 0.06, keeper: 0.88, tackle: 0.7, durf: 1.2 },
};
export const aiStand = (mode) => AI_STAND[cleanDifficulty(mode)];
// De teamgenoten van de computer spelen altijd op "standaard" (op "ontspannen" iets sneller): de stand maakt de tegenstander lastiger, niet je eigen maatjes dommer.
export const maatStand = (mode) => (cleanDifficulty(mode) === 'ontspannen' ? { ...AI_STAND.standaard, tempo: 1.0 } : AI_STAND.standaard);

// Het resultaat van een wedstrijd uit het oogpunt van een team: voor, tegen, en wat een speler zelf scoorde.
export const uitkomstVan = (gf, ga) => (gf > ga ? 'winst' : gf < ga ? 'verlies' : 'gelijk');
// De medaille: 1 brons = winst; 2 zilver = winst met de nul; 3 goud = winst met een hattrick (drie eigen doelpunten). 0 voor gelijk of verlies.
export function voetbalMedaille({ gf = 0, ga = 0, eigen = 0 } = {}) {
  if (gf <= ga) return 0;
  if (eigen >= 3) return 3;
  return ga === 0 ? 2 : 1;
}
export const MEDAILLE_TEKSTEN = ['Winst', 'Winst met de nul', 'Winst met een hattrick'];
// De waarde voor het record: het doelsaldo van je beste winst (alleen winst telt; 0 zegt "nog niet gewonnen").
export const recordWaarde = ({ gf = 0, ga = 0 } = {}) => Math.max(0, gf - ga);
export const recordTekst = (v) => (v > 0 ? `winst met ${Math.round(v)} doelpunt${Math.round(v) === 1 ? '' : 'en'} verschil` : 'nog geen winst');
// Wat een mens krijgt (euro en loopbaanpunten): klein. De plek is 1 winst, 2 verlies, 3 gelijk (het kader wil een plek); wie wegviel krijgt niets.
const PRIJZEN = { 1: 40, 2: 5, 3: 15 };
const NUL_BONUS = 10;
export function voetbalBeloning({ plek = 2, weg = false, nul = false } = {}) {
  if (weg) return { geld: 0, xp: 0 };
  return { geld: (PRIJZEN[plek] || 0) + (plek === 1 && nul ? NUL_BONUS : 0), xp: plek === 1 ? 26 : plek === 3 ? 18 : 14 };
}
export const scoreTekst = (a, b) => `${a}-${b}`;
export const klokTekst = (s) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
// Het record van een speler: een eenvoudige map { sleutel: { best, medal, runs } } in dezelfde vorm als de uitdagingen (achievements.js); hier alleen het lezen, zonder opslag.
export function nieuwRecord(prev, { waarde, medaille }) {
  const p = prev && typeof prev === 'object' ? prev : { best: null, medal: 0, runs: 0 };
  const best = p.best == null || waarde > p.best ? waarde : p.best;
  return { best, medal: Math.max(p.medal | 0, medaille | 0), runs: (p.runs | 0) + 1, nieuw: p.best != null && waarde > p.best };
}

// --- meetkunde: richting en plekken per team (team 0 valt aan naar +y, team 1 naar -y) ----------------------------------------------------------------
const HB = VELD.B / 2, HL = VELD.L / 2;
export const richtingVan = (team) => (team === 0 ? 1 : -1);          // de y-richting naar voren
export const eigenDoelY = (team) => -richtingVan(team) * HL;          // de doellijn die dit team verdedigt
export const doelYTegen = (team) => richtingVan(team) * HL;           // de doellijn waarop dit team aanvalt
export const kl = (x, a, b) => (x < a ? a : x > b ? b : x);
// De plek van een speler in de vorming: rol-index i (0 keeper .. 4), bal = waar de bal is, aanval = heeft dit team de bal. d (0 eigen doel .. 1 tegendoel) schuift mee met de bal.
export function vormingPlek(team, i, bal, aanval, aftrap = false) {
  const v = VORMING[i], dir = richtingVan(team);
  const voortgang = ((bal.y - eigenDoelY(team)) * dir) / VELD.L;       // 0..1 hoe ver de bal van het eigen doel is
  let d = v.d;
  if (i > 0) d = kl(v.d + (voortgang - 0.5) * (i >= 3 ? 0.5 : 0.36) + (aanval ? (i >= 3 ? 0.1 : 0.06) : -0.04), i >= 3 ? 0.18 : 0.1, i >= 3 ? 0.9 : 0.62);
  if (aftrap) d = Math.min(d, 0.44);
  const zijde = team === 0 ? 1 : -1;
  const x = i === 0 ? kl(bal.x * 0.12, -2, 2) : kl(v.u * (aanval ? 1.05 : 0.8) * (HB - 2.5) * zijde + kl(bal.x * 0.22, -3, 3), -HB + 1, HB - 1);
  return { x, y: eigenDoelY(team) + dir * d * VELD.L };
}
export const inStrafschop = (team, x, y) => Math.abs(x) < VELD.STRAF_B / 2 && Math.abs(y - eigenDoelY(team)) < VELD.STRAF_D;
