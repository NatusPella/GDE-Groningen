// Samen spelen bij de voetbalcarrière (#1114, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 11 en docs/COOP-GAST.md): puur, geen DOM en geen netwerk (scripts/voetbal_samen_test.mjs).
// Regels: de carrière is van de speler zelf (nooit gedeeld); wie het spel opende rekent de wedstrijd en de computer. Een gast doet mee (Meedoen? J of N) en speelt zijn eigen figuur (Tammo of Tessa) in jouw team;
// met een mens is de andere figuur een computerteamgenoot. De ratings van een gast worden aan de hostkant geklemd op het niveau van de klasse (een opgevoerde rating telt niet). Beloning per speler:
// een gast krijgt geld, loopbaanpunten en ervaring uit zijn eigen uitslagsregel, GEEN competitiepunten en geen contractbonus van een ander. Het netwerkprotocol (net/protocol.js) blijft ongewijzigd: de ratings reizen
// mee als een compact blok in het bestaande EXTRA-bericht (`v`). Derby (vrienden als rivalen, mensen in team 1): de indeling is hier gepland; de sim ondersteunt mensen in team 1 nog niet (zie het doc).
export const MAX_PER_TEAM = 4;
export const LEVEL_CAP = { talent: 56, terp: 72, kroon: 90, europa: 95 };       // het hoogste rating dat een gast mee mag nemen per klasse
const FIGURES = ['anita', 'tammo'];
const klem = (v, a, b) => (Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : a);

// Een gastfactor (0,6 tot 1,3 van simFactors) wordt geklemd op wat past bij de rating-cap van de klasse: een factor hoort bij een vaardigheid; de cap is een vaardigheid in factor.
export const capFactor = (level) => 0.88 + 0.0037 * (LEVEL_CAP[level] || LEVEL_CAP.talent);
export function clampGuestFactors(f, level = 'talent') {
  const cap = capFactor(level), out = {};
  for (const k of ['sprint', 'schot', 'aanname', 'verd', 'uit']) out[k] = Math.round(klem(Number.isFinite(f && f[k]) ? f[k] : 1, 0.6, cap) * 1000) / 1000;
  return out;
}
// Het compacte ratingblok voor het EXTRA-bericht: per mens vijf bytes (factor van 0,6 tot 1,3 op 0 tot 255), als een korte tekst `r.<slot>.<ssssscccc>` met hex; decodeer met een klem aan de hostkant.
const enc = (v) => Math.round(((klem(v, 0.6, 1.3) - 0.6) / 0.7) * 255);
const dec = (b) => Math.round((0.6 + (b / 255) * 0.7) * 1000) / 1000;
export function encodeRatings(list) {
  return (list || []).slice(0, MAX_PER_TEAM).map((r) => `${r.slot | 0}.${['sprint', 'schot', 'aanname', 'verd', 'uit'].map((k) => enc(r.f[k]).toString(16).padStart(2, '0')).join('')}`).join('~');
}
export function decodeRatings(txt, level = 'talent') {
  const out = [];
  for (const part of String(txt || '').split('~').slice(0, MAX_PER_TEAM)) {
    const [slot, hex] = part.split('.');
    if (!/^\d+$/.test(slot || '') || !/^[0-9a-f]{10}$/.test(hex || '')) continue;
    const b = [0, 2, 4, 6, 8].map((i) => parseInt(hex.slice(i, i + 2), 16));
    out.push({ slot: +slot, f: clampGuestFactors({ sprint: dec(b[0]), schot: dec(b[1]), aanname: dec(b[2]), verd: dec(b[3]), uit: dec(b[4]) }, level) });
  }
  return out;
}

// Wie speelt welke figuur: elke mens zijn eigen figuur (zijn `char`); een figuur die twee mensen willen krijgt de eerste (de host eerst), de ander speelt als zijn eigen ander figuur of valt terug op de computer.
export function assignFigures(humans) {
  const taken = new Set(), out = [];
  for (const h of (humans || []).slice(0, MAX_PER_TEAM)) {
    let ch = FIGURES.includes(h.char) ? h.char : FIGURES.find((f) => !taken.has(f)) || null;
    if (ch && taken.has(ch)) ch = FIGURES.find((f) => !taken.has(f)) || null;
    if (ch) taken.add(ch);
    out.push({ slot: h.slot, figure: ch });
  }
  const mates = FIGURES.filter((f) => !taken.has(f));        // een computerteamgenoot voor elke figuur die geen mens heeft
  return { figures: out, computerMates: mates };
}
// De indeling voor een derby: elke mens kiest zijn team (0 of 1), hooguit vier per team en nooit een leeg team; een overschot of een leeg team wordt eerlijk bijgewerkt.
export function planTeams(humans) {
  const t = [[], []];
  for (const h of humans || []) (h.team === 1 ? t[1] : t[0]).push(h.slot);
  while (t[0].length > MAX_PER_TEAM) t[1].push(t[0].pop());
  while (t[1].length > MAX_PER_TEAM) t[0].push(t[1].pop());
  const total = t[0].length + t[1].length;
  if (total >= 2 && t[1].length === 0) t[1].push(t[0].pop());
  if (total >= 2 && t[0].length === 0) t[0].push(t[1].pop());
  return { team0: t[0], team1: t[1], derby: t[0].length > 0 && t[1].length > 0 };
}
// Wegvallen: de computer neemt de plek over, het team wordt nooit leeg (een team zonder mensen is een computerteam).
export const dropOut = (plan, slot) => ({ team0: plan.team0.filter((s) => s !== slot), team1: plan.team1.filter((s) => s !== slot), derby: plan.derby });

// De beloning van een gast uit zijn eigen uitslagsregel: geld (kleiner dan bij een eigen carrièrewedstrijd: geen contractdeel), ervaring en nooit competitiepunten.
export function guestReward({ outcome = 'verlies', goals = 0, weg = false } = {}, level = 'talent') {
  if (weg) return { geld: 0, xp: 0, competitiepunten: 0, contract: 0 };
  const reward = { winst: 30, gelijk: 10, verlies: 5 }[outcome] || 0;
  const mult = { talent: 1, terp: 1.5, kroon: 2, europa: 2.5 }[level] || 1;
  return { geld: Math.round((reward + Math.min(3, goals) * 5) * mult), xp: outcome === 'winst' ? 26 : outcome === 'gelijk' ? 18 : 14, competitiepunten: 0, contract: 0 };
}
// De ervaring van een gast voor zijn eigen carrière (zijn profiel, niet dat van de host): een vaste, kleine hoeveelheid (60%, zoals een uitgerekende wedstrijd), zodat meespelen nooit sneller groeit dan zelf spelen.
export const guestXpFactor = 0.6;
