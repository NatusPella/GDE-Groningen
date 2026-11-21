// De aanvullende spelregels van de voetbalwedstrijd (epic voetbal-uitzending, 21-11): kaarten, blessures, wissels, strafschoppen en optioneel buitenspel. Puur, geen DOM en geen THREE
// (scripts/voetbal_uitzending_test.mjs). Het bestand kent de wedstrijd (voetbalmatch.js) alleen als gewoon object `m` en importeert hem dus niet (geen kringverwijzing).
// Alles blijft zonder getoond geweld (constitutie 6): een kaart is een kaartje, een blessure is een speler die kreupel loopt en gewisseld wordt, zonder beeld van leed.
// Alle regels zijn uit te zetten (`regels`, de voorkeur in `gde-voetbal-v1`); met alles uit is de sim gelijk aan die van voor deze uitbreiding.
import { PITCH, richtingVan, ownGoalY, inStrafschop } from './voetbalrules.js';

export const DEFAULT_RULES = Object.freeze({ kaarten: true, blessures: true, strafschoppen: true, buitenspel: false, wissels: true });
const RULE_KEYS = Object.keys(DEFAULT_RULES);
// Alleen echte booleans worden overgenomen; al het andere is de standaard (een corrupte voorkeur breekt niets).
export function cleanRules(r) {
  const o = { ...DEFAULT_RULES };
  if (r && typeof r === 'object') for (const k of RULE_KEYS) if (typeof r[k] === 'boolean') o[k] = r[k];
  return o;
}
export const NO_RULES = Object.freeze({ kaarten: false, blessures: false, strafschoppen: false, buitenspel: false, wissels: false });

// De bank (verzonnen voornamen, geen echte voetballers): klein twee wissels per team, groot drie.
const BENCH_HOME = ['Anko', 'Dieuwke', 'Siebren', 'Hilde'];
const BENCH_AWAY = ['Tjeerd', 'Aaltje', 'Wubbe', 'Geesje'];
const bankGrootte = (perTeam) => (perTeam > 6 ? 3 : 2);

// De strafschopstip van het team dat verdedigt: op ongeveer tweederde van de diepte van het strafschopgebied.
export const penaltySpot = (team) => ({ x: 0, y: ownGoalY(team) + richtingVan(team) * PITCH.STRAF_D * 0.62 });

const fin = (x) => Number.isFinite(x);

// Zet de regels, de bank en de statistieken op een wedstrijd (aan te roepen door makeMatch).
export function setupExtraRules(m, regels = null) {
  m.regels = cleanRules(regels);
  const n = bankGrootte(m.perTeam);
  m.bank = [BENCH_HOME.slice(0, n), BENCH_AWAY.slice(0, n)];
  m.wissels = [0, 0];
  const nul = () => [0, 0];
  Object.assign(m.stat, { geel: nul(), rood: nul(), blessures: nul(), wisselsTotaal: nul(), hoeken: nul(), ingooien: nul(), doelschoppen: nul(), vrijeTrappen: nul(), strafschoppen: nul(), buitenspel: nul(), opDoel: nul() });
  m.verloop = [];                                  // de gebeurtenissen voor het verslag: { min, type, team, speler }
  for (const p of m.spelers) {
    p.geel = 0; p.rood = false; p.blessure = false; p.gewisseld = 0;
    p.st = { doelpunten: 0, assists: 0, schoten: 0, reddingen: 0, tackles: 0, passes: 0 };
  }
  m.bal.bs = -1; m.bal.passVan = -1; m.bal.passT = -1;
  return m;
}

// De speelminuut voor het verslag (de wedstrijd is geschaald naar 90 minuten, ook als hij 2 x 75 seconden duurt).
export function speelMinuut(m) {
  const gespeeld = (m.helft - 1) * m.duurHelft + (m.duurHelft - Math.max(0, m.klok));
  const tot = Math.max(1, m.duurHelft * 2);
  return Math.max(1, Math.min(90, Math.ceil((gespeeld / tot) * 90)));
}
export function noteer(m, type, team, speler = -1, extra = null) {
  if (!m.verloop) return;
  m.verloop.push({ min: speelMinuut(m), type, team, speler, ...(extra || {}) });
  if (m.verloop.length > 60) m.verloop.shift();
}

// Een speler van het veld sturen: hij gaat naar de zijlijn en doet niet meer mee (de rest speelt met één man minder; de vorming schuift niet).
function stuurWeg(m, p) {
  p.rood = true;
  if (m.bal.owner === p.id) { m.bal.owner = -1; m.bal.vx = m.bal.vy = 0; }
  p.slot = null;
  p.x = (p.id % 2 ? 1 : -1) * ((PITCH.B / 2) + 3); p.y = 0; p.vx = p.vy = 0; p.speed = 0; p.tackleT = 0; p.duikT = 0;
  for (const mm of m.mensen) if (mm.ctl === p.id) mm.rodeKaart = true;
}

// Een overtreding beoordelen: wat volgt er? hard = een fel of van achteren gemaakte fout. Geeft { strafschop, kaart: null | 'geel' | 'rood' | 'geelrood', blessure: bool }.
// Het toeval komt uit m.rng (deterministisch per zaad).
export function judgeFoul(m, dader, slachtoffer, hard = false) {
  const r = m.regels || NO_RULES;
  const uit = { strafschop: false, kaart: null, blessure: false };
  if (r.strafschoppen && inStrafschop(dader.team, slachtoffer.x, slachtoffer.y)) uit.strafschop = true;
  if (r.kaarten) {
    const pRood = (hard ? 0.05 : 0.01) + (uit.strafschop ? 0.04 : 0), pGeel = hard ? 0.4 : 0.12;
    const worp = m.rng();
    if (worp < pRood) uit.kaart = 'rood';
    else if (worp < pRood + pGeel) uit.kaart = dader.geel >= 1 ? 'geelrood' : 'geel';
  }
  if (r.blessures && slachtoffer.rol !== 'keeper' && m.rng() < (hard ? 0.09 : 0.02)) uit.blessure = true;
  return uit;
}

// De gevolgen van een beoordeling toepassen: kaartje, uitsluiting, blessure. Geeft de gebeurtenissen (voor het commentaar en de HUD).
export function pasBeoordelingToe(m, dader, slachtoffer, b) {
  const ev = [];
  if (b.kaart) {
    if (b.kaart === 'geel') { dader.geel = 1; m.stat.geel[dader.team]++; ev.push({ type: 'kaart', kleur: 'geel', team: dader.team, speler: dader.id }); noteer(m, 'geel', dader.team, dader.id); }
    else {
      if (b.kaart === 'geelrood') { dader.geel = 2; m.stat.geel[dader.team]++; }
      m.stat.rood[dader.team]++;
      ev.push({ type: 'kaart', kleur: 'rood', tweede: b.kaart === 'geelrood', team: dader.team, speler: dader.id }); noteer(m, 'rood', dader.team, dader.id);
      stuurWeg(m, dader);
    }
  }
  if (b.blessure) {
    slachtoffer.blessure = true; m.stat.blessures[slachtoffer.team]++;
    ev.push({ type: 'blessure', team: slachtoffer.team, speler: slachtoffer.id }); noteer(m, 'blessure', slachtoffer.team, slachtoffer.id);
  }
  return ev;
}

// Wisselen: de speler op plek `id` maakt plaats voor de volgende van de bank. De bestuurde speler van een mens wisselt alleen bij een blessure (dan blijft de besturing bij die plek).
export function substitute(m, id, reden = 'moe') {
  const p = m.spelers[id];
  if (!p || !m.regels || !m.regels.wissels || p.rood || p.rol === 'keeper') return null;
  const t = p.team, k = m.wissels[t];
  if (k >= m.bank[t].length) return null;
  const newName = m.bank[t][k], oud = p.naam;
  p.naam = newName; p.stamina = 1; p.moe = false; p.blessure = false; p.geel = 0; p.stun = 0; p.gewisseld++;
  m.wissels[t]++; m.stat.wisselsTotaal[t]++;
  noteer(m, 'wissel', t, id, { uit: oud, in: newName });
  return { type: 'wisselspeler', team: t, speler: id, uit: oud, in: newName, reden };
}

// Bij een dode bal gaan gekwetste spelers eruit (als er nog een wissel is); anders lopen ze kreupel door.
export function blessureWissels(m) {
  const ev = [];
  for (const p of m.spelers) if (p.blessure && !p.rood) { const e = substitute(m, p.id, 'blessure'); if (e) ev.push(e); }
  return ev;
}
// In de rust wisselt de computer de moeste veldspeler van elk team, als er een wissel is en de speler echt moe is (geen mens-bestuurde speler).
export function rustWissels(m) {
  const ev = [];
  for (let t = 0; t < 2; t++) {
    const kand = m.spelers.filter((p) => p.team === t && !p.rood && p.rol !== 'keeper' && p.slot == null && !m.mensen.some((x) => !x.weg && x.ctl === p.id) && p.stamina < 0.72);
    kand.sort((a, b) => a.stamina - b.stamina || a.id - b.id);
    const e = kand.length ? substitute(m, kand[0].id, 'moe') : null;
    if (e) ev.push(e);
  }
  return ev;
}

// Buitenspel (optioneel): bij een pass naar een speler die verder naar voren staat dan de bal en de een-na-laatste tegenstander in de helft van de tegenstander, wordt hij 'mogelijk buitenspel';
// pas als hij de bal aanraakt (voordat een ander hem raakt) volgt het fluitsignaal.
export function offsideAtKick(m, p, ontv) {
  if (!m.regels || !m.regels.buitenspel || !ontv || ontv.team !== p.team || ontv.rol === 'keeper') return false;
  const d = richtingVan(p.team), ontvY = ontv.y * d, balY = p.y * d;
  if (ontvY <= 0 || ontvY <= balY) return false;
  const tegen = m.spelers.filter((q) => q.team !== p.team && !q.rood).map((q) => q.y * d).sort((a, b) => b - a);
  const voorlaatste = tegen.length > 1 ? tegen[1] : tegen[0] || 0;
  return ontvY > voorlaatste + 0.4;
}

// Statistieken voor de rustpauze en het eindverslag (zie ook voetbalpresentatie.js): alles uit m.stat.
export function statistiekenVan(m) {
  const s = m.stat, tot = Math.max(1, s.bezit[0] + s.bezit[1]);
  const bez0 = Math.round((s.bezit[0] / tot) * 100);
  const lees = (a) => [a ? a[0] | 0 : 0, a ? a[1] | 0 : 0];
  return {
    bezit: [bez0, 100 - bez0], schoten: lees(s.schoten), opDoel: lees(s.opDoel), hoeken: lees(s.hoeken), overtredingen: lees(s.overtredingen),
    geel: lees(s.geel), rood: lees(s.rood), blessures: lees(s.blessures), wissels: lees(s.wisselsTotaal), buitenspel: lees(s.buitenspel), strafschoppen: lees(s.strafschoppen),
  };
}

// Man van de match: de speler met de hoogste waarde uit doelpunten, assists, reddingen en tackles, min kaarten; de winnaar krijgt een bonus. Gelijk: de laagste id (deterministisch).
export function matchMvp(m) {
  let best = null, bw = -Infinity;
  for (const p of m.spelers) {
    const st = p.st || {};
    let w = (st.doelpunten | 0) * 6 + (st.assists | 0) * 3.5 + (st.reddingen | 0) * 1.6 + (st.tackles | 0) * 1 + (st.schoten | 0) * 0.4 + (st.passes | 0) * 0.15 - (p.rood ? 4 : 0) - p.geel * 0.5;
    if (m.winnaar === p.team) w += 1.5;
    if (p.rol === 'keeper' && m.score[1 - p.team] === 0) w += 3;
    if (!fin(w)) w = -1;
    if (w > bw + 1e-9) { bw = w; best = p; }
  }
  return best ? { id: best.id, naam: best.naam, team: best.team, rol: best.rol, waarde: Math.round(bw * 10) / 10, st: { ...best.st } } : null;
}
