// Spelers en ratings van de voetbalcarrière (#1107, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 4): puur, geen DOM en geen THREE (scripts/voetbal_spelers_test.mjs).
// Vijf vaardigheden van 1 tot 100 (tempo, schot, pass, uithouding, verdedigen; een keeper heeft ook reflex), een rol, talenten en een verborgen potentieel.
// Een vaardigheid wordt een factor op de sim (`simFactors`): 0,88 bij 1, ongeveer 1,0 bij 32 en 1,25 bij 100, de totale factor is geklemd op 1,30. Zonder ratings is alles neutraal (factor 1).
// Namen komen uit twee lijsten van verzonnen, bijnaam-achtige achternamen: nooit een echte persoon (constitution 2 en 4). Geen externe bron, alles uit een zaad (makeRng).
import { makeRng } from './minigamekit.js';

export const ATTRS = ['pace', 'shot', 'pass', 'stamina', 'defend'];
export const ATTR_NAMES = { pace: 'Tempo', shot: 'Schot', pass: 'Pass', stamina: 'Uithouding', defend: 'Verdedigen', reflex: 'Reflex' };
// De rollen zijn dezelfde waarden als in voetbalrules.js (VORMINGEN) zodat de sim ze kent.
export const ROLES = ['keeper', 'verdediger', 'middenvelder', 'aanvaller'];
export const ROLE_NAMES = { keeper: 'Keeper', verdediger: 'Verdediger', middenvelder: 'Middenvelder', aanvaller: 'Aanvaller' };
// Het gewicht van elke vaardigheid in de rating van een rol (de som is 1).
export const ROLE_WEIGHTS = {
  aanvaller: { shot: 0.35, pace: 0.25, pass: 0.2, stamina: 0.1, defend: 0.1 },
  middenvelder: { pass: 0.35, stamina: 0.25, pace: 0.15, shot: 0.1, defend: 0.15 },
  verdediger: { defend: 0.4, pace: 0.2, stamina: 0.2, pass: 0.2 },
  keeper: { reflex: 0.6, pass: 0.2, stamina: 0.2 },
};
export const MAX_FACTOR = 1.3;
export const OFF_ROLE = 0.9;           // buiten de hoofdrol speelt een speler op 90% van zijn factor
export const SQUAD_SIZE = 18;
export const SQUAD_SHAPE = { keeper: 2, verdediger: 6, middenvelder: 6, aanvaller: 4 };

const klem = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clampAttr = (v) => (Number.isFinite(v) ? Math.round(klem(v, 1, 100)) : 1);
export const factorOf = (v) => 0.88 + 0.0037 * clampAttr(v);

// De talenten: elk een kleine factor op een deel van het spel (een talent per twee niveaus, hooguit drie).
export const TALENTS = {
  dribbler: { naam: 'Dribbelaar', uitleg: 'Betere aanname onder druk', f: { aanname: 1.04 } },
  vroegeSchutter: { naam: 'Vroege schutter', uitleg: 'Schiet ook van ver raak', f: { schot: 1.03 } },
  rustigeAfwerker: { naam: 'Rustige afwerker', uitleg: 'Koel voor het doel', f: { schot: 1.04 } },
  pitbull: { naam: 'Pitbull', uitleg: 'Dekt scherp', f: { verd: 1.05 } },
  marathonloper: { naam: 'Marathonloper', uitleg: 'Wordt later moe', f: { uit: 1.06 } },
  spelverdeler: { naam: 'Spelverdeler', uitleg: 'Passes komen aan', f: { aanname: 1.03 } },
  laatsteMan: { naam: 'Laatste man', uitleg: 'Redt op de lijn', f: { verd: 1.04, sprint: 1.01 } },
  keepersvanger: { naam: 'Keepersvanger', uitleg: 'Pakt de bal vast', f: { schot: 1.02 } },
};
export const TALENT_IDS = Object.keys(TALENTS);
export const MAX_TALENTS = 3;

const FIRST = ['Bram', 'Sieb', 'Jelle', 'Wiebe', 'Gerrit', 'Roelof', 'Hidde', 'Teun', 'Lars', 'Douwe', 'Folkert', 'Ids', 'Menno', 'Rutger', 'Sybren', 'Tijmen', 'Anko', 'Berend', 'Evert', 'Gosse', 'Harmen', 'Jurre', 'Klaas-Jan', 'Lammert', 'Mees', 'Niek', 'Okke', 'Pim', 'Reinder', 'Stijn', 'Tjitse', 'Ubbo', 'Volkert', 'Wessel', 'Yoran', 'Zwier', 'Aart', 'Boris', 'Daan', 'Eelco'];
const LAST = ['Veenbrand', 'Kleijans', 'Dijkvoogd', 'Wierdebrink', 'Kluunzak', 'Slootmans', 'Kwelderman', 'Greppelaar', 'Poldermeer', 'Terpzicht', 'Boterkamp', 'Stoeptegel', 'Fietsbel', 'Meerkoet', 'Aaltink', 'Zoutwerf', 'Kapsalon', 'Bietenhof', 'Eendekooi', 'Lutjewal', 'Maaiveld', 'Notenkraker', 'Ooievaar', 'Pannekoek', 'Rietkraag', 'Schaapskooi', 'Tochtsloot', 'Uiterdijk', 'Vlonderman', 'Waddenzicht', 'IJsselhof', 'Zandstra-Berg', 'Brugwachter', 'Kruidenier', 'Kuipertje', 'Leemkuil', 'Mosselbank', 'Naaldwijk-Dal', 'Oeverloper', 'Plasdrasser', 'Riethoed', 'Slibbergen', 'Turfstrooier', 'Vaarboom', 'Weidehek', 'Zwaluwstaart', 'Appelflap', 'Bolderkar', 'Dobbeplas', 'Elzenbosch'];
export const NAME_POOL = Object.freeze({ first: FIRST, last: LAST });

// Eén naam uit het zaad; dezelfde rng geeft dezelfde reeks.
export function inventName(rng) {
  return `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
}

// De rating van een speler voor een rol (1 tot 100, gewogen). Een keeper zonder reflex valt terug op uithouding.
export function ratingFor(attrs, role) {
  const w = ROLE_WEIGHTS[role] || ROLE_WEIGHTS.middenvelder;
  let s = 0;
  for (const k of Object.keys(w)) s += w[k] * clampAttr(k === 'reflex' && attrs.reflex == null ? attrs.stamina : attrs[k]);
  return Math.round(s);
}
export const playerRating = (p, role = null) => {
  const r = role || p.role;
  const base = ratingFor(p.attrs, r);
  return r === p.role ? base : Math.round(base * OFF_ROLE);
};

// De factoren die de sim leest voor één speler: sprint (tempo), schot, aanname (pass), verd (tackle en dekking), uit (staminaverbruik, groter is zuiniger).
// `form` (0,92 tot 1,08) en `fatigue` (0 tot 100) komen uit de ontwikkeling; zonder die twee is de factor puur de vaardigheid. Onder vermoeidheid 25 gaan tempo en uithouding op 90%.
export function simFactors(p, { form = 1, fatigue = 0, role = null } = {}) {
  const a = p.attrs;
  const r = role || p.role;
  const offRole = r !== p.role ? OFF_ROLE : 1;
  const tired = fatigue >= 75 ? 0.9 : 1;                 // vermoeidheid is hier 0..100 gemeten als "hoe moe", >= 75 telt als "onder 25 energie"
  const f = klem(Number.isFinite(form) ? form : 1, 0.92, 1.08);
  const t = { sprint: 1, schot: 1, aanname: 1, verd: 1, uit: 1 };
  for (const id of p.talents || []) { const tf = TALENTS[id] && TALENTS[id].f; if (tf) for (const k of Object.keys(tf)) t[k] *= tf[k]; }
  const out = {
    sprint: factorOf(a.pace) * t.sprint * tired,
    schot: factorOf(a.shot) * t.schot,
    aanname: factorOf(a.pass) * t.aanname,
    verd: factorOf(a.defend) * t.verd,
    uit: factorOf(a.stamina) * t.uit * tired,
  };
  for (const k of Object.keys(out)) out[k] = Math.round(klem(out[k] * f * offRole, 0.6, MAX_FACTOR) * 1000) / 1000;
  return out;
}
export const NEUTRAL_FACTORS = Object.freeze({ sprint: 1, schot: 1, aanname: 1, verd: 1, uit: 1 });

const jitter = (rng, spread) => Math.round((rng() * 2 - 1) * spread);
// Een speler met een rol rond een niveau (1 tot 100). De hoofdvaardigheden van de rol liggen iets hoger, de rest iets lager.
export function makePlayer(rng, { club = null, role = 'middenvelder', level = 40, num = 0, name = null, talentChance = 0 } = {}) {
  const w = ROLE_WEIGHTS[role];
  const attrs = {};
  for (const k of ATTRS) attrs[k] = clampAttr(level + (w[k] ? (w[k] - 0.2) * 40 : -6) + jitter(rng, 9));
  if (role === 'keeper') attrs.reflex = clampAttr(level + 6 + jitter(rng, 9));
  const pot = Math.round(klem(level + 12 + rng() * 22, 60, 95));
  const talents = [];
  if (talentChance > 0) {
    const n = Math.floor(level / 35) + (rng() < talentChance ? 1 : 0);
    while (talents.length < Math.min(MAX_TALENTS, n)) { const t = TALENT_IDS[Math.floor(rng() * TALENT_IDS.length)]; if (!talents.includes(t)) talents.push(t); }
  }
  return { id: '', name: name || inventName(rng), num, role, side: role, club, attrs, pot, talents };
}

// Een selectie van 18 voor een club: deterministisch uit (clubId, zaad, niveau). De id van een speler is `<club>:<nr>` en blijft stabiel; rugnummers 1 tot 18.
export function hashSeed(...parts) {
  let h = 2166136261 >>> 0;
  for (const s of parts) { const t = String(s); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= 0x9e; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0 || 1;
}
export function makeSquad(clubId, level, seed = 1) {
  const rng = makeRng(hashSeed('squad', clubId, seed));
  const used = new Set();
  const squad = [];
  let nr = 1;
  for (const role of ROLES) {
    for (let i = 0; i < SQUAD_SHAPE[role]; i++) {
      let name = inventName(rng);
      while (used.has(name)) name = inventName(rng);
      used.add(name);
      const p = makePlayer(rng, { club: clubId, role, level, num: nr, name, talentChance: 0.25 });
      p.id = `${clubId}:${nr}`;
      squad.push(p);
      nr++;
    }
  }
  return squad;
}

// De twee hoofdpersonen. Tessa is de ster (hoger potentieel, de dorpsteambonus als startvoordeel: tempo, schot en pass iets hoger, geen tweede vermenigvuldiging);
// Tammo is een gewone amateur (lagere start, gewoon potentieel, nooit uitgeschakeld). Allebei beginnen in de Talentenklasse, niemand heeft een leeftijd.
export const PROTAGONISTS = {
  anita: { id: 'tessa', name: 'Tessa', char: 'anita', role: 'aanvaller', pot: 90, attrs: { pace: 46, shot: 49, pass: 46, stamina: 38, defend: 28 }, talents: ['dribbler'] },
  tammo: { id: 'tammo', name: 'Tammo', char: 'tammo', role: 'middenvelder', pot: 72, attrs: { pace: 34, shot: 30, pass: 38, stamina: 36, defend: 36 }, talents: [] },
};
export const protagonistChars = () => Object.keys(PROTAGONISTS);
export function makeProtagonist(char, club = null, num = 0) {
  const base = PROTAGONISTS[char] || PROTAGONISTS.tammo;
  return { id: base.id, name: base.name, num, role: base.role, side: base.role, club, attrs: { ...base.attrs }, pot: base.pot, talents: base.talents.slice(), char: base.char };
}
// De plafond van een vaardigheid volgt het potentieel: een vaardigheid komt nooit boven pot + 5 (hoofdvaardigheid van de rol) of pot - 8 (de rest).
export function attrCap(p, attr) {
  const w = ROLE_WEIGHTS[p.role] || {};
  return clampAttr((p.pot || 70) + (w[attr] && w[attr] >= 0.2 ? 5 : -8));
}
export const isValidPlayer = (p) => !!p && typeof p === 'object' && ROLES.includes(p.role) && !!p.attrs && ATTRS.every((k) => Number.isFinite(p.attrs[k]) && p.attrs[k] >= 1 && p.attrs[k] <= 100);
// Een veilige lezer voor opslag: kapotte spelers worden null.
export function readPlayer(d) {
  if (!d || typeof d !== 'object' || !ROLES.includes(d.role) || !d.attrs || typeof d.attrs !== 'object') return null;
  const attrs = {};
  for (const k of ATTRS) attrs[k] = clampAttr(d.attrs[k]);
  if (d.role === 'keeper') attrs.reflex = clampAttr(d.attrs.reflex == null ? 30 : d.attrs.reflex);
  return {
    id: String(d.id || '').slice(0, 40), name: String(d.name || 'Speler').slice(0, 32), num: Math.max(0, Math.min(99, d.num | 0)), role: d.role, side: ROLES.includes(d.side) ? d.side : d.role,
    club: d.club ? String(d.club).slice(0, 40) : null, attrs, pot: Math.max(40, Math.min(99, Number.isFinite(d.pot) ? Math.round(d.pot) : 70)),
    talents: (Array.isArray(d.talents) ? d.talents : []).filter((t) => TALENTS[t]).slice(0, MAX_TALENTS), char: d.char === 'anita' || d.char === 'tammo' ? d.char : undefined,
  };
}
// Het ratingblok voor een wedstrijd: per plek in de vorming één factorenset (de volgorde van de selectie op rol). `team` is een lijst spelers, `tac` de rollen per index van de vorming.
export function lineupFor(squad, roles, { forms = {}, fatigue = {}, must = [] } = {}) {
  const pool = squad.slice().sort((a, b) => playerRating(b) - playerRating(a));
  const taken = new Set();
  // `must`: spelers die zeker in de opstelling staan (de speler en zijn teamgenoot): zij krijgen eerst een plek van hun rol
  const reserved = new Map();
  for (const id of must) { const p = squad.find((x) => x.id === id); const k = p ? roles.findIndex((r, i) => r === p.role && !reserved.has(i)) : -1; if (k >= 0) reserved.set(k, p); }
  return roles.map((role, ri) => {
    if (reserved.has(ri)) { const p = reserved.get(ri); taken.add(p.id); return { player: p, factors: simFactors(p, { form: forms[p.id] || 1, fatigue: fatigue[p.id] || 0, role }) }; }
    let pick = pool.find((p) => !taken.has(p.id) && p.role === role) || pool.find((p) => !taken.has(p.id) && (p.side === role)) || pool.find((p) => !taken.has(p.id)) || null;
    if (pick) taken.add(pick.id);
    return { player: pick, factors: pick ? simFactors(pick, { form: forms[pick.id] || 1, fatigue: fatigue[pick.id] || 0, role }) : { ...NEUTRAL_FACTORS } };
  });
}
// De sterkte van een selectie voor het uitrekenen: aanval en verdediging (1 tot 100) uit de beste spelers per lijn.
export function teamStrength(squad) {
  const best = (role, n) => squad.filter((p) => p.role === role).map((p) => playerRating(p)).sort((a, b) => b - a).slice(0, n);
  const avg = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 30);
  return { attack: Math.round((avg(best('aanvaller', 3)) * 0.6 + avg(best('middenvelder', 3)) * 0.4) * 10) / 10, defense: Math.round((avg(best('verdediger', 4)) * 0.7 + avg(best('keeper', 1)) * 0.3) * 10) / 10 };
}
