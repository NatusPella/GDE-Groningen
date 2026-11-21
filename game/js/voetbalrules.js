// De regels en afmetingen van de voetbalwedstrijd in de Euroborg (#981, Voetbal Sim Light): puur, geen DOM en geen THREE (scripts/voetbal_test.mjs).
// Vijf tegen vijf op een klein veld, twee helften, verzonnen teams (geen echte clubs, spelers of merken). Wat de speler doet staat hier als invoerbits (zodat een
// gast dezelfde byte stuurt als bij het besturen van een voertuig), wat de computer doet in voetbalai.js, de bal in voetbalbal.js en de wedstrijd in voetbalmatch.js.
import { cleanDifficulty } from './difficulty.js';

// Het veld in meters, het midden is (0, 0): x is dwars (links/rechts voor het team dat naar voren kijkt), y is in de lengte. Team 0 verdedigt y = -L/2 en valt aan naar +y.
// De formaten: klein (vijf tegen vijf op een klein veld) en groot (elf tegen elf op een volledig veld). Het veld is één gedeeld object dat per wedstrijd wordt gezet (zetFormaat);
// de sim, de bal en de AI lezen er altijd VELD uit. Alleen één wedstrijd tegelijk per proces (de host, of de spiegel van een gast).
export const PITCH = { B: 26, L: 42, DOEL_B: 4.4, DOEL_H: 1.7, DOEL_DIEPTE: 1.3, STRAF_B: 13, STRAF_D: 6.5, PAAL_R: 0.07, BAL_R: 0.11 };
export const FORMATEN = {
  klein: { n: 5, B: 26, L: 42, DOEL_B: 4.4, DOEL_H: 1.7, STRAF_B: 13, STRAF_D: 6.5, duren: { kort: 45, normaal: 90 }, naam: '5 tegen 5' },
  groot: { n: 11, B: 56, L: 90, DOEL_B: 7.32, DOEL_H: 2.44, STRAF_B: 30, STRAF_D: 13, duren: { kort: 75, normaal: 150 }, naam: '11 tegen 11' },
};
export const DEFAULT_FORMAT = 'klein';
export const cleanFormaat = (f) => (FORMATEN[f] ? f : DEFAULT_FORMAT);
let huidig = 'klein';
export function zetFormaat(f) {
  const c = cleanFormaat(f);
  if (c === huidig && PITCH.B === FORMATEN[c].B) return c;
  huidig = c;
  const F = FORMATEN[c];
  for (const k of ['B', 'L', 'DOEL_B', 'DOEL_H', 'STRAF_B', 'STRAF_D']) PITCH[k] = F[k];
  PITCH.DOEL_DIEPTE = c === 'groot' ? 2.1 : 1.3;
  return c;
}
export const huidigFormaat = () => huidig;
export const DUREN = { kort: 45, normaal: 90 };     // de standaardduur (klein); groot heeft eigen duren in FORMATEN
export const duurVan = (formaat, duur) => (FORMATEN[cleanFormaat(formaat)].duren[duur] || FORMATEN[cleanFormaat(formaat)].duren.normaal);
export const DEFAULT_DURATION = 'normaal';
export const HELFTEN = 2;
// De voorkeur van de speler (formaat, vorming, speelstijl, duur, vriendschappelijk of competitie, en de stand van het seizoen) staat in één eigen sleutel; alles wat niet klopt wordt de standaard.
export function leesVoorkeur(raw) {
  let d = null;
  try { d = JSON.parse(raw || 'null'); } catch (e) { d = null; }
  if (!d || typeof d !== 'object') d = {};
  const formaat = cleanFormaat(d.formaat);
  return { duur: DUREN[d.duur] ? d.duur : DEFAULT_DURATION, formaat, vorming: cleanFormation(formaat, d.vorming), stijl: cleanStijl(d.stijl), modus: d.modus === 'competitie' ? 'competitie' : 'vriendschappelijk', comp: d.comp && typeof d.comp === 'object' ? d.comp : null };
}
// De voorkeur kort of normaal komt uit een eigen sleutel (storagekeys.js KEYS.voetbal, alleen dit apparaat); leeg, corrupt of onzin geeft de standaard.
export function leesDuurVoorkeur(raw) {
  try { const d = JSON.parse(raw || 'null'); return d && DUREN[d.duur] ? d.duur : DEFAULT_DURATION; } catch (e) { return DEFAULT_DURATION; }
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
  { id: 'kleibijters', naam: 'De Kleibijters', kort: 'Kleibijters', shirt: 0xd9a23a, broek: 0x2a3a5a, keeperShirt: 0xc0482b },
];
export const OPPONENTS = TEAMS.slice(1);
export const opponent = (n) => OPPONENTS[((n | 0) % OPPONENTS.length + OPPONENTS.length) % OPPONENTS.length];

// De namen van de spelers van de computer (verzonnen, geen echte voetballers) en hun rol in de vorming 1-2-2: keeper, twee verdedigers, twee aanvallers.
export const NAMES_HOME = ['Keeper Mans', 'Hinderk', 'Wietske', 'Tammo', 'Grietje', 'Roel', 'Femke', 'Jouke', 'Anneke', 'Sjoerd', 'Marijke'];
export const NAMEN_UIT = ['Keeper Bouwe', 'Roelof', 'Fenna', 'Jelmer', 'Marrit', 'Gerben', 'Hanneke', 'Pieter', 'Trijn', 'Eelke', 'Lieuwe'];
// De vormingen (tactiek): per speler een rol en de basisplek, gemeten van het eigen doel: u in -1..1 over de breedte, d in 0..1 over de lengte. Index 0 is altijd de keeper.
const K = { rol: 'keeper', u: 0, d: 0.04 };
const rij = (rol, d, ...us) => us.map((u) => ({ rol, u, d }));
export const FORMATIONS = {
  klein: {
    '2-2': [K, ...rij('verdediger', 0.26, -0.42, 0.42), { rol: 'aanvaller', u: -0.4, d: 0.55 }, { rol: 'aanvaller', u: 0.4, d: 0.62 }],
    '3-1': [K, ...rij('verdediger', 0.24, -0.55, 0, 0.55), { rol: 'aanvaller', u: 0, d: 0.6 }],
    '1-3': [K, { rol: 'verdediger', u: 0, d: 0.22 }, ...rij('aanvaller', 0.58, -0.55, 0, 0.55)],
  },
  groot: {
    '4-4-2': [K, ...rij('verdediger', 0.2, -0.65, -0.22, 0.22, 0.65), ...rij('middenvelder', 0.45, -0.65, -0.22, 0.22, 0.65), ...rij('aanvaller', 0.7, -0.2, 0.2)],
    '4-3-3': [K, ...rij('verdediger', 0.2, -0.65, -0.22, 0.22, 0.65), ...rij('middenvelder', 0.46, -0.4, 0, 0.4), ...rij('aanvaller', 0.72, -0.55, 0, 0.55)],
    '3-5-2': [K, ...rij('verdediger', 0.2, -0.45, 0, 0.45), ...rij('middenvelder', 0.46, -0.8, -0.4, 0, 0.4, 0.8), ...rij('aanvaller', 0.7, -0.2, 0.2)],
  },
};
export const formationNames = (formaat) => Object.keys(FORMATIONS[cleanFormaat(formaat)]);
export const cleanFormation = (formaat, v) => (FORMATIONS[cleanFormaat(formaat)][v] ? v : formationNames(formaat)[0]);
export const formationList = (formaat, v) => FORMATIONS[cleanFormaat(formaat)][cleanFormation(formaat, v)];
export const ROLLEN = FORMATIONS.klein['2-2'].map((x) => x.rol);
// De speelstijl: hoe diep de lijnen staan en hoeveel spelers druk zetten (op een groot veld één meer).
export const STIJLEN = ['verdedigend', 'evenwichtig', 'aanvallend'];
export const cleanStijl = (s) => (STIJLEN.includes(s) ? s : 'evenwichtig');
const STIJL_DIEPTE = { verdedigend: -0.07, evenwichtig: 0, aanvallend: 0.07 };
const STIJL_PRESS = { verdedigend: 1, evenwichtig: 2, aanvallend: 3 };
export const drukZetters = (stijl) => STIJL_PRESS[cleanStijl(stijl)] + (huidig === 'groot' ? 1 : 0);
const ROL_PARAMS = { verdediger: { shift: 0.36, min: 0.1, max: 0.62, aanval: 0.06 }, middenvelder: { shift: 0.43, min: 0.14, max: 0.76, aanval: 0.08 }, aanvaller: { shift: 0.5, min: 0.18, max: 0.9, aanval: 0.1 } };

// De moeilijkheid: reactietijd van de computer, zijn snelheid, de afwijking van zijn schot (rad) en de keeper (0..1) en de tackle (kans). Gelezen uit de bestaande stand.
const AI_LEVELS = {
  ontspannen: { reactie: 0.46, tempo: 0.88, spreiding: 0.2, keeper: 0.5, tackle: 0.3, durf: 0.75 },
  standaard: { reactie: 0.3, tempo: 0.94, spreiding: 0.12, keeper: 0.66, tackle: 0.42, durf: 1 },
  uitdagend: { reactie: 0.16, tempo: 1.05, spreiding: 0.06, keeper: 0.88, tackle: 0.7, durf: 1.2 },
};
export const aiLevel = (mode) => AI_LEVELS[cleanDifficulty(mode)];
// De teamgenoten van de computer spelen altijd op "standaard" (op "ontspannen" iets sneller): de stand maakt de tegenstander lastiger, niet je eigen maatjes dommer.
export const mateLevel = (mode) => (cleanDifficulty(mode) === 'ontspannen' ? { ...AI_LEVELS.standaard, tempo: 1.0 } : AI_LEVELS.standaard);

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
export const recordValue = ({ gf = 0, ga = 0 } = {}) => Math.max(0, gf - ga);
export const recordTekst = (v) => (v > 0 ? `winst met ${Math.round(v)} doelpunt${Math.round(v) === 1 ? '' : 'en'} verschil` : 'nog geen winst');
// Wat een mens krijgt (euro en loopbaanpunten): klein. De plek is 1 winst, 2 verlies, 3 gelijk (het kader wil een plek); wie wegviel krijgt niets.
const PRIJZEN = { 1: 40, 2: 5, 3: 15 };
const NUL_BONUS = 10;
export function voetbalBeloning({ plek = 2, weg = false, nul = false } = {}) {
  if (weg) return { geld: 0, xp: 0 };
  return { geld: (PRIJZEN[plek] || 0) + (plek === 1 && nul ? NUL_BONUS : 0), xp: plek === 1 ? 26 : plek === 3 ? 18 : 14 };
}
export const scoreTekst = (a, b) => `${a}-${b}`;
export const clockText = (s) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
// Het record van een speler: een eenvoudige map { sleutel: { best, medal, runs } } in dezelfde vorm als de uitdagingen (achievements.js); hier alleen het lezen, zonder opslag.
export function updatedRecord(prev, { waarde, medaille }) {
  const p = prev && typeof prev === 'object' ? prev : { best: null, medal: 0, runs: 0 };
  const best = p.best == null || waarde > p.best ? waarde : p.best;
  return { best, medal: Math.max(p.medal | 0, medaille | 0), runs: (p.runs | 0) + 1, nieuw: p.best != null && waarde > p.best };
}

// --- meetkunde: richting en plekken per team (team 0 valt aan naar +y, team 1 naar -y) ----------------------------------------------------------------
export const richtingVan = (team) => (team === 0 ? 1 : -1);          // de y-richting naar voren
export const ownGoalY = (team) => -richtingVan(team) * (PITCH.L / 2);          // de doellijn die dit team verdedigt
export const opponentGoalY = (team) => richtingVan(team) * (PITCH.L / 2);           // de doellijn waarop dit team aanvalt
export const kl = (x, a, b) => (x < a ? a : x > b ? b : x);
// De plek van een speler in de vorming: rol-index i (0 keeper .. 4), bal = waar de bal is, aanval = heeft dit team de bal. d (0 eigen doel .. 1 tegendoel) schuift mee met de bal.
export function formationSpot(team, i, bal, aanval, aftrap = false, tac = null) {
  const list = tac && tac.lijst ? tac.lijst : FORMATIONS[huidig][formationNames(huidig)[0]];
  const v = list[i], dir = richtingVan(team);
  const progress = ((bal.y - ownGoalY(team)) * dir) / PITCH.L;       // 0..1 hoe ver de bal van het eigen doel is
  let d = v.d;
  if (i > 0) { const rp = ROL_PARAMS[v.rol]; d = kl(v.d + (progress - 0.5) * rp.shift + (aanval ? rp.aanval : -0.04) + STIJL_DIEPTE[cleanStijl(tac && tac.stijl)], rp.min, rp.max); }
  if (aftrap) d = Math.min(d, 0.44);
  const zijde = team === 0 ? 1 : -1;
  const x = i === 0 ? kl(bal.x * 0.12, -2, 2) : kl(v.u * (aanval ? 1.05 : 0.8) * ((PITCH.B / 2) - 2.5) * zijde + kl(bal.x * 0.22, -3, 3), -(PITCH.B / 2) + 1, (PITCH.B / 2) - 1);
  return { x, y: ownGoalY(team) + dir * d * PITCH.L };
}
export const inStrafschop = (team, x, y) => Math.abs(x) < PITCH.STRAF_B / 2 && Math.abs(y - ownGoalY(team)) < PITCH.STRAF_D;
