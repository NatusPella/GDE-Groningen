// De voetbalwedstrijd in de Euroborg (#981, Voetbal Sim Light): puur, zonder DOM en zonder THREE (scripts/voetbal_test.mjs, scripts/voetbal_botsim.mjs).
// Vijf tegen vijf op een klein veld, twee helften, aftrap, uitbal (inworp, hoekschop, doelschop: simpel, met een korte pauze), een doelpunt met een viering en een
// slow-motionflits, en een simpele overtreding (omver lopen of een tackle van achteren geeft de ander een vrije bal; geen kaarten, geen buitenspel).
// Samen spelen (#443): 1 tot 4 mensen spelen in team 0 tegen de computer. Host-autoritair: wie het spel opende rekent de bal en alle spelers uit met de invoer van elke speler
// (stick en knoppen, dezelfde bytes als bij een voertuig); twaalf keer per seconde gaat een compacte momentopname naar de gasten (snapVoetbal), die hem vloeiend tekenen
// (maakVoetbalSpiegel). Wie wegvalt wordt door de computer vervangen en krijgt niets; de rest speelt door. Geen nieuw netwerkprotocol: dit is de bestaande live-wedstrijd (soort 'live').
import { makeRng } from './minigamekit.js';
import {
  VELD, LOOP, DUREN, HELFTEN, KNOP, LAAD_S, TEAMS, tegenstander, ROLLEN, NAMEN_THUIS, NAMEN_UIT, aiStand, maatStand, invoerNaarActie, voetbalMedaille, uitkomstVan,
  voetbalBeloning, scoreTekst, richtingVan, eigenDoelY, doelYTegen, vormingPlek, inStrafschop, kl,
} from './voetbalrules.js';
import { maakBal, stapBal, zetBal, balSnelheid } from './voetbalbal.js';
import { aiIntentie, besteOntvanger, NIETS } from './voetbalai.js';
import { NEUTRALE_BONUS } from './voetbalkarakter.js';

export const FASEN = ['intro', 'aftrap', 'spel', 'hervat', 'goal', 'rust', 'eind', 'klaar'];
export const HERVAT_KINDEN = ['aftrap', 'inworp', 'hoek', 'doelschop', 'vrij'];
export const STAND_HZ = 12;
export const MAX_SPELERS_VOETBAL = 4;
const HB = VELD.B / 2, HL = VELD.L / 2, HD = VELD.DOEL_B / 2;
const INTRO_S = 3.2, GOAL_S = 3.2, SLOMO_S = 1.1, SLOMO = 0.35, RUST_S = 3.4, EIND_S = 4.5, HERVAT_PAUZE = 1.1, AFTRAP_PAUZE = 0.9, HERVAT_MAX = 6;
const G = 9.8;
const fin = (x) => Number.isFinite(x);
const q2 = (x, d = 2) => { const m = 10 ** d; return Math.round((Number(x) || 0) * m) / m; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const hoek = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
const NEUTRAAL = Object.freeze({ mx: 0, my: 0, buttons: 0 });
// De volgorde waarin de mensen een speler krijgen: aanvallers eerst, dan verdedigers; de keeper blijft computer tot een mens hem kiest.
const BESTUUR_VOLGORDE = [3, 4, 1, 2];

function maakSpeler(team, i, naam, stand) {
  const dir = richtingVan(team);
  return {
    id: team * 5 + i, team, i, rol: ROLLEN[i], naam, x: 0, y: 0, vx: 0, vy: 0, face: dir > 0 ? Math.PI / 2 : -Math.PI / 2, speed: 0, stamina: 1, moe: false,
    cool: 0, stun: 0, tackleT: 0, tackleCd: 0, tackleGedaan: true, duikT: 0, duikDx: 0, vier: 0, besluitT: 0.3 + 0.1 * i, balT: 0, houdT: 0, slot: null, laatsteMens: null,
    voorspel: null, voorspelT: 0, spreiding: stand.spreiding,
  };
}

// deeln: [{ slot, naam, char, bonus? }] (bonus: { sprint, schot, aanname } van het personage, voetbalkarakter.js; de mensen, de host eerst), opties: { duur 'kort' | 'normaal', stand (moeilijkheid), seed, tegenstander (0..3), aiBeide (voor de botsim: beide teams als tegenstander) }.
export function maakWedstrijd(deeln = [], { duur = 'normaal', stand = 'standaard', seed = 1, tegenstander: tg = 0, aiBeide = false } = {}) {
  const rng = makeRng(seed);
  const ai = [aiBeide ? aiStand(stand) : maatStand(stand), aiStand(stand)];
  const teams = [TEAMS[0], tegenstander(tg)];
  const spelers = [];
  for (let t = 0; t < 2; t++) for (let i = 0; i < 5; i++) spelers.push(maakSpeler(t, i, (t === 0 ? NAMEN_THUIS : NAMEN_UIT)[i], ai[t]));
  const mensen = (deeln || []).slice(0, MAX_SPELERS_VOETBAL).map((d, k) => ({
    slot: d.slot, naam: d.naam || 'Speler', char: d.char || null, ctl: BESTUUR_VOLGORDE[k], weg: false, laad: { schot: 0, lang: 0 }, vorig: 0, vorigW: 0, wisselCd: 0, autoT: 0, doelpunten: 0, schoten: 0, assist: 0, inv: NEUTRAAL, bonus: { ...NEUTRALE_BONUS, ...(d.bonus || null) },
  }));
  for (const mm of mensen) { spelers[mm.ctl].slot = mm.slot; spelers[mm.ctl].laatsteMens = mm.slot; }
  const duurHelft = DUREN[duur] || DUREN.normaal;
  const m = {
    fase: 'intro', faseT: INTRO_S, helft: 1, klok: duurHelft, duurHelft, duurNaam: DUREN[duur] ? duur : 'normaal', stand, seed, teams, ai, rng, spelers, bal: maakBal(0, 0), mensen,
    score: [0, 0], hervat: null, flash: null, flits: 0, ev: [], tijd: 0, n: 0, foulCd: 0, wisselRustTeam: 0, aftrapTeam: 0,
    stat: { schoten: [0, 0], overtredingen: [0, 0], bezit: [0, 0], uit: 0, doelpuntenVan: {} }, winnaar: null, spiegel: false, alleenAi: mensen.length === 0,
  };
  m.bal.owner = -1;
  zetOpstelling(m, 0, true);
  return m;
}

// ---------------------------------------------------------------- opstelling en herstart

function zetOpstelling(m, aftrapTeam, intro = false) {
  for (const p of m.spelers) {
    const plek = vormingPlek(p.team, p.i, { x: 0, y: 0 }, p.team === aftrapTeam, true);
    p.x = plek.x; p.y = plek.y; p.vx = p.vy = 0; p.speed = 0; p.face = richtingVan(p.team) > 0 ? Math.PI / 2 : -Math.PI / 2;
    p.cool = 0; p.stun = 0; p.tackleT = 0; p.duikT = 0; p.vier = 0; p.balT = 0; p.houdT = 0;
  }
  zetBal(m.bal, 0, 0);
  m.bal.owner = -1; m.bal.laatsteTeam = -1; m.bal.laatsteSpeler = -1;
  if (!intro) {
    const taker = m.spelers.find((p) => p.team === aftrapTeam && p.i === 3);
    taker.x = 0; taker.y = -richtingVan(aftrapTeam) * 0.5 * 0; taker.face = richtingVan(aftrapTeam) > 0 ? Math.PI / 2 : -Math.PI / 2;
    m.bal.owner = taker.id; taker.balT = 0;
    m.hervat = { kind: 'aftrap', team: aftrapTeam, taker: taker.id, t: 0, pauze: AFTRAP_PAUZE };
    m.fase = 'aftrap';
  }
}

export function startAftrap(m, team) {
  m.aftrapTeam = team;
  zetOpstelling(m, team, false);
  m.flash = { tekst: `Aftrap: ${m.teams[team].kort}`, t: 1.6 };
  m.ev.push({ type: 'aftrap', team });
}

const HERVAT_TEKST = { inworp: 'Inworp', hoek: 'Hoekschop', doelschop: 'Doelschop', vrij: 'Vrije bal' };
// Een herstart op (x, y) voor team: de dichtstbijzijnde speler (bij een doelschop de keeper) neemt hem, tegenstanders gaan er een stukje vanaf.
export function startHervat(m, kind, team, x, y, takerId = null) {
  x = kl(x, -HB + 0.4, HB - 0.4); y = kl(y, -HL + 0.4, HL - 0.4);
  let taker = takerId != null ? m.spelers[takerId] : null;
  if (!taker) {
    const eigen = m.spelers.filter((p) => p.team === team);
    if (kind === 'doelschop') taker = eigen.find((p) => p.rol === 'keeper');
    else {
      let bd = Infinity;
      for (const p of eigen) { if (p.rol === 'keeper') continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; taker = p; } }
    }
  }
  taker.x = x; taker.y = y; taker.vx = taker.vy = 0; taker.speed = 0; taker.tackleT = 0; taker.stun = 0; taker.cool = 0; taker.balT = 0; taker.houdT = 0;
  taker.face = richtingVan(team) > 0 ? Math.PI / 2 : -Math.PI / 2;
  zetBal(m.bal, x, y);
  m.bal.owner = taker.id; m.bal.laatsteTeam = team; m.bal.laatsteSpeler = taker.id;
  for (const o of m.spelers) { // tegenstanders op een meter of drie
    if (o.team === team) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < 3 && d > 1e-6) { o.x = kl(x + (o.x - x) / d * 3, -HB + 0.3, HB - 0.3); o.y = kl(y + (o.y - y) / d * 3, -HL + 0.3, HL - 0.3); }
  }
  m.hervat = { kind, team, taker: taker.id, t: 0, pauze: HERVAT_PAUZE };
  m.fase = 'hervat';
  m.flash = { tekst: `${HERVAT_TEKST[kind]} voor ${m.teams[team].kort}`, t: 1.8 };
  m.ev.push({ type: 'hervat', kind, team, x, y });
}

// Waar de bal uit ging en wie hem herstart (puur, voor de test): zijlijn = inworp voor de ander; achterlijn = hoekschop voor de aanvaller of doelschop voor de verdediger.
export function uitbalHervat(uit, laatsteTeam) {
  if (uit.kind === 'zij') return { kind: 'inworp', team: laatsteTeam === 0 ? 1 : 0, x: Math.sign(uit.x || 1) * (HB - 0.4), y: kl(uit.y, -HL + 2, HL - 2) };
  const eind = uit.y < 0 ? -1 : 1, verdediger = eind < 0 ? 0 : 1;
  if (laatsteTeam === verdediger) return { kind: 'hoek', team: 1 - verdediger, x: Math.sign(uit.x || 1) * (HB - 0.5), y: eind * (HL - 0.5) };
  return { kind: 'doelschop', team: verdediger, x: 0, y: eind * (HL - 3.2) };
}

// ---------------------------------------------------------------- de mensen: wie bestuurt wie

const NABIJ_KEEPER = 9;
function beschikbaar(m, genomen, mens) {
  const bal = m.bal, uit = [];
  for (const p of m.spelers) {
    if (p.team !== 0 || genomen.has(p.id)) continue;
    if (p.rol === 'keeper' && Math.hypot(bal.x - p.x, bal.y - p.y) > NABIJ_KEEPER) continue;
    uit.push(p);
  }
  return uit;
}
const naBal = (m, p) => Math.hypot(p.x - m.bal.x, p.y - m.bal.y);

function wijsBesturing(m, dt, invoer) {
  const genomen = new Set(m.mensen.filter((x) => !x.weg).map((x) => x.ctl));
  const bal = m.bal, drager = bal.owner >= 0 ? m.spelers[bal.owner] : null;
  for (const mens of m.mensen) {
    if (mens.weg) continue;
    const inv = (invoer && invoer(mens.slot)) || NEUTRAAL;
    mens.inv = inv;
    mens.wisselCd -= dt; mens.autoT -= dt;
    const wisselNu = !!((inv.buttons | 0) & KNOP.WISSEL), wil = wisselNu && !(mens.vorigW & KNOP.WISSEL);
    mens.vorigW = wisselNu ? KNOP.WISSEL : 0;
    const cur = m.spelers[mens.ctl];
    let doel = null;
    if (wil && mens.wisselCd <= 0) {
      genomen.delete(mens.ctl);
      let best = null, bd = Infinity;
      for (const p of beschikbaar(m, genomen, mens)) { if (p === cur) continue; const d = naBal(m, p); if (d < bd) { bd = d; best = p; } }
      genomen.add(mens.ctl);
      if (best) { doel = best; mens.wisselCd = 0.25; }
    } else if (mens.autoT <= 0) {
      mens.autoT = 0.2;
      const eigenBal = !!drager && drager.team === 0;
      if (eigenBal && drager.id !== mens.ctl && !genomen.has(drager.id) && drager.balT < 0.4 && drager.rol !== 'keeper') {
        // de pass is aangekomen: de dichtstbijzijnde mens neemt de ontvanger over
        let dichtst = mens, bd = naBal(m, cur);
        for (const o of m.mensen) { if (o.weg || o === mens) continue; const d = Math.hypot(m.spelers[o.ctl].x - drager.x, m.spelers[o.ctl].y - drager.y); if (d < bd - 1e-6) { bd = d; dichtst = o; } }
        if (dichtst === mens && cur.id !== drager.id) doel = drager;
      } else if (!eigenBal && cur.id !== (drager ? drager.id : -1)) {
        // verdedigen of een losse bal: de speler die het dichtst bij de bal staat
        genomen.delete(mens.ctl);
        let best = null, bd = Infinity;
        for (const p of beschikbaar(m, genomen, mens)) { const d = naBal(m, p); if (d < bd) { bd = d; best = p; } }
        genomen.add(mens.ctl);
        if (best && best !== cur && bd + 1.6 < naBal(m, cur) && cur.tackleT <= 0 && cur.duikT <= 0) doel = best;
      }
      if (!doel && cur.rol === 'keeper' && naBal(m, cur) > NABIJ_KEEPER + 3 && cur.houdT <= 0) { // de bal is ver weg: terug naar een veldspeler
        genomen.delete(mens.ctl);
        let best = null, bd = Infinity;
        for (const p of beschikbaar(m, genomen, mens)) { const d = naBal(m, p); if (d < bd) { bd = d; best = p; } }
        genomen.add(mens.ctl);
        if (best) doel = best;
      }
    }
    if (doel && doel.id !== mens.ctl) {
      cur.slot = null;
      genomen.delete(mens.ctl); mens.ctl = doel.id; genomen.add(doel.id);
      mens.laad.schot = 0; mens.laad.lang = 0;
      m.ev.push({ type: 'wissel', slot: mens.slot, speler: doel.id });
    }
  }
  for (const p of m.spelers) p.slot = null;
  for (const mens of m.mensen) if (!mens.weg) { const p = m.spelers[mens.ctl]; p.slot = mens.slot; p.laatsteMens = mens.slot; }
}

// Wat een mens met zijn invoer doet: lopen, schot of voorzet laden en loslaten, een pass, een tackle, of (keeper) duiken.
const laadK = (s) => kl(0.2 + 0.8 * Math.min(1, s / LAAD_S), 0.2, 1);
function menselijkeIntentie(m, p, mens, dt) {
  const a = invoerNaarActie(mens.inv), b = mens.inv.buttons | 0;
  const edge = (bit) => (b & bit) && !(mens.vorig & bit);
  const los = (bit) => !(b & bit) && (mens.vorig & bit);
  const spel = m.fase === 'spel' || (m.hervat && m.hervat.t >= m.hervat.pauze);
  const it = { dx: a.dx, dy: a.dy, sprint: a.sprint, tackle: false, kick: null, duik: null };
  const heeft = m.bal.owner === p.id && spel;
  const wijst = a.sterkte > 0.25;
  const ri = wijst ? { x: a.dx / Math.hypot(a.dx, a.dy), y: a.dy / Math.hypot(a.dx, a.dy) } : { x: Math.cos(p.face), y: Math.sin(p.face) };
  const dir = richtingVan(p.team), gy = doelYTegen(p.team);
  if (heeft) {
    if (b & KNOP.SCHOT) mens.laad.schot += dt; else if (los(KNOP.SCHOT)) {
      // richthulp: wijst de speler ongeveer naar het doel, dan mikt de schop op het doel; links en rechts van de stick kiezen de hoek
      let dx = ri.x, dy = ri.y;
      const naarDoel = (gy - p.y) * dir > 0 && Math.hypot(p.x, gy - p.y) < 22;
      const gx = Math.hypot(0 - p.x, gy - p.y) || 1;
      if (naarDoel && ((-p.x) * ri.x + (gy - p.y) * ri.y) / gx > 0.6) {
        const ax = kl(wijst ? a.dx * HD * 1.1 : 0, -HD * 0.85, HD * 0.85);
        const vx = ax - p.x, vy = gy - p.y, l = Math.hypot(vx, vy) || 1;
        dx = vx / l; dy = vy / l;
      }
      it.kick = { soort: 'schot', kracht: laadK(mens.laad.schot), dx, dy, doel: -1 };
      mens.laad.schot = 0;
    }
    if (!it.kick) {
      if (b & KNOP.LANG) mens.laad.lang += dt; else if (los(KNOP.LANG)) {
        const q = besteOntvanger(m, p, { richting: wijst ? ri : null, minScore: 0.2 });
        it.kick = q ? { soort: 'lang', kracht: laadK(mens.laad.lang), dx: ri.x, dy: ri.y, doel: q.id } : { soort: 'lang', kracht: laadK(mens.laad.lang), dx: ri.x, dy: ri.y, doel: -1 };
        mens.laad.lang = 0;
      }
    }
    if (!it.kick && edge(KNOP.PASS)) {
      const q = besteOntvanger(m, p, { richting: wijst ? ri : null, geenKeeper: false, minScore: 0.1 });
      if (q) { const d = dist(p, q); it.kick = { soort: 'pass', kracht: kl((d - 2) / 26 + 0.2, 0.2, 1), dx: q.x - p.x, dy: q.y - p.y, doel: q.id }; }
      else it.kick = { soort: 'pass', kracht: 0.45, dx: ri.x, dy: ri.y, doel: -1 };
    }
  } else {
    mens.laad.schot = 0; mens.laad.lang = 0;
    if (p.rol === 'keeper') { if (edge(KNOP.SCHOT) || edge(KNOP.TACKLE) || edge(KNOP.PASS)) it.duik = { dx: Math.abs(a.dx) > 0.2 ? Math.sign(a.dx) : 0, dy: 0 }; }
    else if (edge(KNOP.TACKLE) && spel) it.tackle = true;
  }
  if (heeft && p.rol === 'keeper') p.houdT += 0; // de keeper wacht op een knop; de tijd tikt in voerUit
  mens.vorig = b;
  return it;
}

// ---------------------------------------------------------------- bewegen en acties

function beweeg(m, p, it, dt) {
  const mens = p.slot != null;
  const lv = m.ai[p.team];
  let top = p.rol === 'keeper' ? LOOP.keeper : LOOP.loop;
  const sterkte = Math.min(1, Math.hypot(it.dx, it.dy));
  if (it.sprint && sterkte > 0.5 && !p.moe && p.rol !== 'keeper' && p.stamina > 0) { top = LOOP.sprint * bonusVan(m, p).sprint; p.stamina = Math.max(0, p.stamina - LOOP.stamina_af * dt); if (p.stamina <= 0.02) p.moe = true; }
  else { p.stamina = Math.min(1, p.stamina + LOOP.stamina_bij * dt * (sterkte < 0.1 ? 1.6 : 1)); if (p.moe && p.stamina > 0.3) p.moe = false; }
  if (!mens) top *= lv.tempo;
  if (p.stun > 0) { top *= 0.25; p.stun -= dt; }
  let tx = it.dx * top, ty = it.dy * top;
  let acc = sterkte > 0.05 ? 10 : 13;
  if (p.tackleT > 0) { p.tackleT -= dt; const f = LOOP.sprint * 1.1; tx = Math.cos(p.face) * f; ty = Math.sin(p.face) * f; acc = 14; }
  if (p.duikT > 0) { p.duikT -= dt; tx = p.duikDx * 6.8; ty *= 0.3; acc = 18; }
  if (m.fase === 'goal' && p.vier <= 0) { tx = 0; ty = 0; }
  const k = Math.min(1, acc * dt);
  p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.x = kl(p.x, -HB + 0.15, HB - 0.15); p.y = kl(p.y, -HL + 0.1, HL - 0.1);
  p.speed = Math.hypot(p.vx, p.vy);
  const draai = p.speed > 0.6 ? Math.atan2(p.vy, p.vx) : (sterkte > 0.2 ? Math.atan2(it.dy, it.dx) : p.face);
  if (p.tackleT <= 0 && (sterkte > 0.15 || p.speed > 0.6)) { const d = hoek(draai, p.face); p.face += kl(d, -14 * dt, 14 * dt); }
  p.cool = Math.max(0, p.cool - dt); p.tackleCd = Math.max(0, p.tackleCd - dt); p.vier = Math.max(0, p.vier - dt);
  if (p.balT >= 0 && m.bal.owner === p.id) p.balT += dt;
}

// De schop van een speler: de bal verlaat zijn voet met een snelheid die bij de soort past. De spreiding komt van de speler (computer: de stand; mens: klein) en van een te harde of slappe schop.
function schop(m, p, kick) {
  const b = m.bal, k = kl(kick.kracht, 0.15, 1);
  let dx = kick.dx, dy = kick.dy, l = Math.hypot(dx, dy);
  if (l < 1e-6) { dx = Math.cos(p.face); dy = Math.sin(p.face); l = 1; }
  dx /= l; dy /= l;
  const ontv = kick.doel != null && kick.doel >= 0 ? m.spelers[kick.doel] : null;
  let afstand = 0;
  if (ontv) {
    const tx = ontv.x + ontv.vx * 0.45, ty = ontv.y + ontv.vy * 0.45;
    afstand = Math.hypot(tx - p.x, ty - p.y);
    if (afstand > 0.5) { dx = (tx - p.x) / afstand; dy = (ty - p.y) / afstand; }
  }
  const mensP = p.slot != null;
  const basis = mensP ? 0.035 / bonusVan(m, p).schot : p.spreiding;
  let spreiding = kick.soort === 'schot' ? basis + Math.abs(k - 0.85) * 0.1 : kick.soort === 'lang' ? basis * 0.6 + 0.02 : basis * 0.35 + 0.01;
  if (p.stun > 0) spreiding += 0.08;
  const a = Math.atan2(dy, dx) + (m.rng() * 2 - 1) * spreiding;
  const ca = Math.cos(a), sa = Math.sin(a);
  let vh, vz = 0;
  if (kick.soort === 'schot') { vh = 8 + 16 * k; vz = 0.5 + 2.4 * k * (0.25 + 0.75 * m.rng()); }
  else if (kick.soort === 'lang') {
    const D = kl(ontv && afstand > 0 ? afstand : 8 + 26 * k, 6, 34), th = 0.62;
    const v = Math.sqrt(D * G / Math.sin(2 * th)) * 1.07;
    vh = v * Math.cos(th); vz = v * Math.sin(th);
  } else vh = ontv && afstand > 0 ? kl(5.5 + 0.95 * afstand, 6, 17.5) : 5 + 12 * k;
  b.owner = -1; b.dood = false;
  b.x = p.x + ca * 0.75; b.y = p.y + sa * 0.75; b.z = vz > 0 ? 0.05 : 0;
  b.vx = ca * vh; b.vy = sa * vh; b.vz = vz;
  b.laatsteTeam = p.team; b.laatsteSpeler = p.id;
  p.cool = 0.4; p.balT = 0; p.houdT = 0;
  if (kick.soort === 'schot') { m.stat.schoten[p.team]++; const mm = mensVan(m, p); if (mm) mm.schoten++; }
  m.ev.push({ type: 'schop', soort: kick.soort, sterkte: k, x: p.x, y: p.y, speler: p.id });
  if (m.fase === 'aftrap' || m.fase === 'hervat') { m.fase = 'spel'; m.hervat = null; }
}
const bonusVan = (m, p) => { const mm = p.slot != null ? m.mensen.find((x) => x.slot === p.slot) : null; return mm ? mm.bonus : NEUTRALE_BONUS; };
const mensVan = (m, p) => (p.laatsteMens != null ? m.mensen.find((x) => x.slot === p.laatsteMens) || null : null);

function voerUit(m, p, it) {
  const b = m.bal;
  const spel = m.fase === 'spel' || ((m.fase === 'aftrap' || m.fase === 'hervat') && m.hervat && m.hervat.t >= m.hervat.pauze);
  if (!spel) return;
  if (it.kick && b.owner === p.id && p.cool <= 0) schop(m, p, it.kick);
  if (it.tackle && p.tackleCd <= 0 && p.stun <= 0 && p.tackleT <= 0 && b.owner !== p.id && m.fase === 'spel') { p.tackleT = 0.4; p.tackleCd = 1.0; p.tackleGedaan = false; }
  if (it.duik && p.duikT <= 0 && b.owner !== p.id) { p.duikT = 0.55; p.duikDx = it.duik.dx || 0; p.vier = 0; m.ev.push({ type: 'duik', speler: p.id }); }
  if (p.tackleT > 0 && !p.tackleGedaan && m.fase === 'spel') tackleControle(m, p);
}

function tackleControle(m, p) {
  const o = m.bal.owner >= 0 ? m.spelers[m.bal.owner] : null;
  if (!o || o.team === p.team || dist(p, o) > 1.05) return;
  p.tackleGedaan = true;
  const lv = m.ai[p.team];
  let kans = p.slot != null ? 0.6 : 0.2 + lv.tackle * 0.8;
  const achter = Math.cos(hoek(p.face, o.face)) > 0.4;
  kans -= 0.05 * o.speed;
  if (!achter) kans += 0.1;
  if (o.rol === 'keeper' && inStrafschop(o.team, o.x, o.y)) kans = 0; // een keeper met de bal in de hand is van hem
  if (m.rng() < kans) {
    const b = m.bal;
    b.owner = -1; b.laatsteTeam = p.team; b.laatsteSpeler = p.id;
    const a = p.face + (m.rng() - 0.5) * 0.9;
    b.x = o.x + Math.cos(a) * 0.5; b.y = o.y + Math.sin(a) * 0.5; b.z = 0; b.vx = Math.cos(a) * 4.6; b.vy = Math.sin(a) * 4.6; b.vz = 0;
    o.cool = 0.5; o.stun = 0.35; o.balT = 0;
    m.ev.push({ type: 'tackle', team: p.team, speler: p.id });
  } else {
    p.stun = 0.7; p.tackleT = 0;
    if ((achter && m.rng() < 0.55) || (p.speed > 7.0 && m.rng() < 0.25)) overtreding(m, p, o); else m.ev.push({ type: 'duel', speler: p.id });
  }
}

function overtreding(m, dader, slachtoffer) {
  if (m.foulCd > 0 || m.fase !== 'spel') return;
  m.foulCd = 1.5;
  m.stat.overtredingen[dader.team]++;
  m.ev.push({ type: 'overtreding', team: dader.team, speler: dader.id, x: slachtoffer.x, y: slachtoffer.y });
  startHervat(m, 'vrij', slachtoffer.team, slachtoffer.x, slachtoffer.y, slachtoffer.id);
}

// ---------------------------------------------------------------- de bal: dragen, oppakken, keeper

function carry(m, dt) {
  const b = m.bal, o = m.spelers[b.owner];
  const off = Math.min(0.85, 0.55 + 0.045 * o.speed);
  const tx = o.x + Math.cos(o.face) * off, ty = o.y + Math.sin(o.face) * off;
  const k = Math.min(1, dt * 22);
  b.x += (tx - b.x) * k; b.y += (ty - b.y) * k; b.z = 0; b.vz = 0; b.vx = o.vx; b.vy = o.vy;
  b.laatsteTeam = o.team; b.laatsteSpeler = o.id;
  if (o.rol === 'keeper') o.houdT += dt;
}

const KEEPER_BEREIK = 1.05, KEEPER_DUIK = 1.9;
function oppakken(m) {
  const b = m.bal;
  if (b.dood || b.netTeam >= 0) return;
  let best = null, bd = Infinity;
  for (const p of m.spelers) {
    if (p.cool > 0 || p.stun > 0.3) continue;
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    const rel = Math.hypot(b.vx - p.vx, b.vy - p.vy);
    const keeper = p.rol === 'keeper' && inStrafschop(p.team, p.x, p.y) && b.laatsteTeam !== p.team;
    let r, hoog;
    if (keeper) { r = p.duikT > 0 ? KEEPER_DUIK : KEEPER_BEREIK; hoog = 2.0; }
    else { r = (kl(0.78 - 0.022 * rel, 0.38, 0.78) + (p.tackleT > 0 ? 0.25 : 0)) * (1 + (bonusVan(m, p).aanname - 1) * 0.8); hoog = 0.75; }
    if (b.z > hoog) continue;
    if (d < r && d < bd) { bd = d; best = { p, keeper, rel }; }
  }
  if (!best) return;
  const { p, keeper, rel } = best;
  if (keeper) {
    const lv = m.ai[p.team], vaardig = p.slot != null ? 0.8 : lv.keeper;
    const sp = balSnelheid(b);
    if (sp <= 9 + 13 * vaardig && m.rng() < 0.55 + 0.45 * vaardig) { b.owner = p.id; p.houdT = 0; p.balT = 0; p.duikT = 0; m.ev.push({ type: 'redding', soort: 'vangst', speler: p.id }); }
    else { // weggeslagen: de bal gaat van het doel af, met wat toeval opzij
      b.vy = -b.vy * 0.5 + richtingVan(p.team) * 2; b.vx += (m.rng() - 0.5) * 8; b.vz = 1.6; p.cool = 0.4;
      b.laatsteTeam = p.team; b.laatsteSpeler = p.id;
      m.ev.push({ type: 'redding', soort: 'weg', speler: p.id });
    }
    return;
  }
  if (rel > 11.5 * bonusVan(m, p).aanname) { // een te harde bal: afketsen, de aanname mislukt
    b.vx = -b.vx * 0.3 + (m.rng() - 0.5) * 3; b.vy = -b.vy * 0.3 + (m.rng() - 0.5) * 3; p.cool = 0.3; m.ev.push({ type: 'afketsing', speler: p.id });
    return;
  }
  b.owner = p.id; p.balT = 0; b.laatsteTeam = p.team; b.laatsteSpeler = p.id;
  b.vx = p.vx; b.vy = p.vy; b.vz = 0; b.z = 0;
}

function duwSpelers(m) {
  const S = m.spelers, b = m.bal;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = S[i], c = S[j];
    const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
    if (d >= 0.75 || d < 1e-6) continue;
    // omver lopen: een sprinter botst van achteren op de bal bij een tegenstander
    if (a.team !== c.team && m.fase === 'spel' && m.foulCd <= 0) {
      for (const [x, y] of [[a, c], [c, a]]) {
        if (b.owner === y.id && x.speed > 6.3 && x.tackleT <= 0 && d < 0.62) {
          const nx = (y.x - x.x) / d, ny = (y.y - x.y) / d;
          const naarHem = (x.vx * nx + x.vy * ny) / (x.speed || 1);
          const achter = Math.cos(hoek(x.face, y.face)) > 0.3;
          if (naarHem > 0.8 && achter) { overtreding(m, x, y); return; }
        }
      }
    }
    const dm = (0.75 - d) / 2, nx = dx / d, ny = dy / d;
    a.x -= nx * dm; a.y -= ny * dm; c.x += nx * dm; c.y += ny * dm;
  }
  for (const p of S) { p.x = kl(p.x, -HB + 0.15, HB - 0.15); p.y = kl(p.y, -HL + 0.1, HL - 0.1); }
}

// ---------------------------------------------------------------- de stap

export function tikWedstrijd(m, dtIn, invoer = null) {
  m.ev = [];
  const dt = Math.min(Math.max(dtIn, 0), 0.1);
  if (m.fase === 'klaar') return m.ev;
  m.tijd += dt; m.n++;
  if (m.flash && (m.flash.t -= dt) <= 0) m.flash = null;
  m.flits = Math.max(0, m.flits - dt * 2.5);
  m.foulCd = Math.max(0, m.foulCd - dt);
  if (m.fase === 'intro') {
    m.faseT -= dt;
    if (m.faseT <= 0) startAftrap(m, 0);
    return m.ev;
  }
  if (m.fase === 'rust') {
    m.faseT -= dt;
    if (m.faseT <= 0) { m.helft = 2; m.klok = m.duurHelft; startAftrap(m, 1); }
    return m.ev;
  }
  if (m.fase === 'eind') {
    m.faseT -= dt;
    if (m.faseT <= 0) { m.fase = 'klaar'; m.ev.push({ type: 'klaar', winnaar: m.winnaar }); }
    return m.ev;
  }
  veld(m, dt, invoer);
  return m.ev;
}

function veld(m, dt, invoer) {
  const goal = m.fase === 'goal';
  const sdt = goal && m.faseT > GOAL_S - SLOMO_S ? dt * SLOMO : dt;
  if (m.hervat && (m.fase === 'aftrap' || m.fase === 'hervat')) m.hervat.t += dt;
  wijsBesturing(m, dt, invoer);
  for (const p of m.spelers) {
    let it;
    if (p.slot != null) { const mens = m.mensen.find((x) => x.slot === p.slot && !x.weg); it = mens ? menselijkeIntentie(m, p, mens, dt) : NIETS; }
    else it = aiIntentie(m, p, sdt);
    if (goal && p.vier <= 0) it = NIETS;
    beweeg(m, p, it, sdt);
    if (!goal) voerUit(m, p, it);
  }
  // een mens die niet schiet of speelt bij een herstart: na een tijd gaat de bal vanzelf weg
  if (m.hervat && (m.fase === 'aftrap' || m.fase === 'hervat') && m.hervat.t > HERVAT_MAX && m.bal.owner >= 0) {
    const p = m.spelers[m.bal.owner], q = besteOntvanger(m, p, { geenKeeper: false, minScore: -9 });
    schop(m, p, q ? { soort: 'pass', kracht: 0.5, dx: q.x - p.x, dy: q.y - p.y, doel: q.id } : { soort: 'pass', kracht: 0.5, dx: 0, dy: richtingVan(p.team), doel: -1 });
  }
  // een keeper met de bal in zijn handen mag hem niet eeuwig houden (ook niet als een mens hem bestuurt)
  if (m.bal.owner >= 0) { const o = m.spelers[m.bal.owner]; if (o.rol === 'keeper' && m.fase === 'spel' && o.houdT > 5) { const q = besteOntvanger(m, o, { geenKeeper: true, minScore: -9 }); schop(m, o, q ? { soort: 'pass', kracht: 0.6, dx: q.x - o.x, dy: q.y - o.y, doel: q.id } : { soort: 'lang', kracht: 0.7, dx: 0, dy: richtingVan(o.team), doel: -1 }); } }
  duwSpelers(m);
  const b = m.bal;
  if (b.owner >= 0) carry(m, sdt);
  else {
    const ev = stapBal(b, sdt, []);
    for (const e of ev) {
      if (e.type === 'goal' && m.fase === 'spel') doelpunt(m, e);
      else if (e.type === 'uit' && m.fase === 'spel') { m.stat.uit++; const h = uitbalHervat(e, b.laatsteTeam < 0 ? 0 : b.laatsteTeam); m.ev.push({ type: 'uit', kind: e.kind }); startHervat(m, h.kind, h.team, h.x, h.y); return; }
      else if (e.type === 'paal' || e.type === 'lat' || e.type === 'stuit') m.ev.push(e);
    }
    if (m.fase === 'spel') oppakken(m);
  }
  if (m.fase === 'spel') {
    if (b.owner >= 0) m.stat.bezit[m.spelers[b.owner].team] += dt;
    m.klok -= dt;
    if (m.klok <= 0) { m.klok = 0; einde_helft(m); }
  } else if (goal) {
    m.faseT -= dt;
    if (m.faseT <= 0) startAftrap(m, m.aftrapTeam);
  }
}

function doelpunt(m, e) {
  m.score[e.team]++;
  const b = m.bal, schutter = b.laatsteSpeler >= 0 ? m.spelers[b.laatsteSpeler] : null;
  const eigen = !schutter || schutter.team !== e.team;
  if (!eigen) {
    m.stat.doelpuntenVan[schutter.id] = (m.stat.doelpuntenVan[schutter.id] || 0) + 1;
    const mm = mensVan(m, schutter); if (mm) mm.doelpunten++;
    schutter.vier = GOAL_S - 0.4;
  }
  m.fase = 'goal'; m.faseT = GOAL_S; m.aftrapTeam = 1 - e.team; m.hervat = null;
  m.flits = 1;
  for (const p of m.spelers) if (p.team === e.team && p !== schutter) p.vier = 1.2;
  const naam = eigen ? 'eigen doelpunt' : schutter.naam;
  m.flash = { tekst: `GOAL! ${m.teams[e.team].kort} ${scoreTekst(m.score[0], m.score[1])} (${naam})`.slice(0, 60), t: GOAL_S };
  m.ev.push({ type: 'goal', team: e.team, speler: eigen ? -1 : schutter.id, eigen, stand: m.score.slice() });
}

function einde_helft(m) {
  const b = m.bal;
  b.owner = -1; b.vx = b.vy = 0;
  m.ev.push({ type: 'fluit', helft: m.helft });
  if (m.helft < HELFTEN) { m.fase = 'rust'; m.faseT = RUST_S; m.flash = { tekst: `Rust: ${scoreTekst(m.score[0], m.score[1])}`, t: RUST_S }; return; }
  m.fase = 'eind'; m.faseT = EIND_S;
  m.winnaar = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
  m.flash = { tekst: `Einde: ${m.teams[0].kort} ${scoreTekst(m.score[0], m.score[1])} ${m.teams[1].kort}`.slice(0, 60), t: EIND_S };
  m.ev.push({ type: 'einde', winnaar: m.winnaar });
}

// Een speler valt weg (verbinding kwijt of gestopt): de computer neemt zijn speler over.
export function verlaatVoetbal(m, slot) {
  const mm = m.mensen.find((x) => x.slot === slot);
  if (!mm || mm.weg) return false;
  mm.weg = true;
  const p = m.spelers[mm.ctl]; if (p) p.slot = null;
  return true;
}
export const meedoenVoetbal = (m, slot) => m.mensen.some((x) => x.slot === slot && !x.weg);

// ---------------------------------------------------------------- uitslag en beloning

// Eén regel per mens (de plek is 1 winst, 2 verlies, 3 gelijk); `tijd` is wat hij zelf scoorde, `tekst` bevat de stand ("gewonnen: 3-1").
export function uitslagVoetbal(m) {
  const gf = m.score[0], ga = m.score[1], uitk = uitkomstVan(gf, ga);
  const plek = uitk === 'winst' ? 1 : uitk === 'verlies' ? 2 : 3;
  const woord = uitk === 'winst' ? 'gewonnen' : uitk === 'verlies' ? 'verloren' : 'gelijk';
  return m.mensen.map((x) => ({
    slot: x.slot, naam: x.naam, ai: false, weg: x.weg, fin: !x.weg, plek, tijd: x.doelpunten, beste: null,
    tekst: x.weg ? 'niet meer erbij' : `${woord}: ${scoreTekst(gf, ga)}`,
  })).sort((a, b) => (a.weg - b.weg) || (a.slot - b.slot));
}
export const winnaarsVoetbal = (rijen) => rijen.filter((r) => r.plek === 1 && !r.weg).map((r) => r.slot);
export function beloningVoetbal(rij) {
  if (!rij || rij.weg || rij.ai) return { geld: 0, xp: 0 };
  const mm = /(\d+)-(\d+)/.exec(rij.tekst || '');
  return voetbalBeloning({ plek: rij.plek, weg: false, nul: !!mm && +mm[2] === 0 });
}
// Wat een speler zelf bewaart (record en medaille), uit zijn uitslagsregel; werkt voor de host (zijn eigen regel) en voor een gast (de regel uit het eindbericht).
export function medailleUitRij(rij) {
  if (!rij || rij.weg) return { medaille: 0, gf: 0, ga: 0, eigen: 0 };
  const mm = /(\d+)-(\d+)/.exec(rij.tekst || '');
  const gf = mm ? +mm[1] : 0, ga = mm ? +mm[2] : 0, eigen = Math.max(0, rij.tijd | 0);
  return { medaille: voetbalMedaille({ gf, ga, eigen }), gf, ga, eigen };
}

// ---------------------------------------------------------------- de momentopname naar de gasten en hun spiegel

const FLASH_CODES = ['', 'goal', 'uit', 'rust', 'eind', 'hervat'];
const flashCode = (m) => (m.fase === 'goal' ? 1 : m.fase === 'rust' ? 3 : m.fase === 'eind' ? 4 : m.fase === 'hervat' ? 5 : m.fase === 'aftrap' ? 5 : 0);
// d: [fase, helft, klok, s0, s1, bx, by, bz, bvx, bvy, bvz, eigenaar, hervatsoort, flash, -, -, ctl x4, 10 x (x, y, hoek, vlaggen)]
export function snapVoetbal(m, seq = 0) {
  const b = m.bal;
  const d = [Math.max(0, FASEN.indexOf(m.fase)), m.helft, q2(m.klok, 1), m.score[0], m.score[1], q2(b.x), q2(b.y), q2(b.z), q2(b.vx, 1), q2(b.vy, 1), q2(b.vz, 1), b.owner,
    m.hervat ? HERVAT_KINDEN.indexOf(m.hervat.kind) : -1, flashCode(m), m.flits > 0.5 ? 1 : 0, m.fase === 'goal' && m.faseT > GOAL_S - SLOMO_S ? 1 : 0];
  for (let k = 0; k < 4; k++) { const mm = m.mensen[k]; d.push(mm && !mm.weg ? mm.ctl : -1); }
  for (const p of m.spelers) {
    const vlag = Math.min(15, Math.round(p.speed / 0.6)) + (p.tackleT > 0 ? 16 : 0) + (p.stun > 0 ? 32 : 0) + (p.duikT > 0 ? 64 : 0) + (p.vier > 0 ? 128 : 0) + (p.moe ? 256 : 0);
    d.push(q2(p.x), q2(p.y), q2(p.face, 2), vlag);
  }
  return { k: 'wed', f: 'lv', n: seq | 0, d, x: m.flash ? String(m.flash.tekst).slice(0, 60) : '' };
}
export const SNAP_LEN_V = 20 + 40;
export const liveVoetbal = {
  tik: tikWedstrijd, snap: snapVoetbal, verlaat: verlaatVoetbal, uitslag: uitslagVoetbal, beloning: beloningVoetbal, vak: 'buiten', meedoen: meedoenVoetbal,
};
export function leesLiveVoetbal(b) {
  if (!b || b.k !== 'wed' || b.f !== 'lv' || !Number.isInteger(b.n) || !Array.isArray(b.d) || b.d.length !== SNAP_LEN_V || !b.d.every(fin)) return null;
  return { f: 'lv', n: b.n, d: b.d.slice(), x: typeof b.x === 'string' ? b.x.replace(/[\u0000-\u001f<>]/g, '').slice(0, 60) : '' };
}

// De spiegel van een gast: dezelfde velden als de host-wedstrijd voor wie hem tekent, vloeiend gevoed door de momentopnamen.
export function maakVoetbalSpiegel(start, mijnSlot, { duur = 'normaal', stand = 'standaard', tegenstander: tg = 0 } = {}) {
  const m = maakWedstrijd(start.deeln.map((d) => ({ slot: d.slot, naam: d.naam, char: d.char })), { duur, stand, seed: 1, tegenstander: tg });
  m.spiegel = true; m.mijnSlot = mijnSlot; m.n = -1; m.leeftijd = 0; m.nSnap = 0; m.flashTekst = ''; m.bt = null; m.mijnId = -1;
  for (const p of m.spelers) { p.tx = p.x; p.ty = p.y; p.slot = null; }
  m.bal.tx = 0; m.bal.ty = 0; m.bal.tz = 0; m.bal.bvx = 0; m.bal.bvy = 0; m.bal.bvz = 0;
  return m;
}
export function voerInVoetbal(sp, st) {
  if (!st || st.f !== 'lv' || st.d.length !== SNAP_LEN_V || st.n < sp.n) return false;
  const d = st.d;
  sp.n = st.n; sp.fase = FASEN[kl(d[0] | 0, 0, FASEN.length - 1)]; sp.helft = d[1] | 0 || 1; sp.klok = d[2]; sp.score = [d[3] | 0, d[4] | 0];
  const b = sp.bal;
  b.tx = d[5]; b.ty = d[6]; b.tz = d[7]; b.bvx = d[8]; b.bvy = d[9]; b.bvz = d[10]; b.owner = d[11] | 0;
  sp.hervat = d[12] >= 0 ? { kind: HERVAT_KINDEN[kl(d[12] | 0, 0, HERVAT_KINDEN.length - 1)] } : null;
  sp.flits = d[14] ? 1 : sp.flits; sp.slomo = !!d[15];
  sp.ctl = [d[16] | 0, d[17] | 0, d[18] | 0, d[19] | 0];
  sp.mensen.forEach((mm, k) => { mm.ctl = sp.ctl[k] >= 0 ? sp.ctl[k] : mm.ctl; mm.weg = sp.ctl[k] < 0; });
  const eigen = sp.mensen.find((x) => x.slot === sp.mijnSlot);
  sp.mijnId = eigen && !eigen.weg ? eigen.ctl : -1;
  sp.spelers.forEach((p, i) => {
    const o = 20 + i * 4, vlag = d[o + 3] | 0;
    p.tx = d[o]; p.ty = d[o + 1]; p.face = d[o + 2];
    p.snelheidSnap = (vlag & 15) * 0.6; p.tackleT = vlag & 16 ? 0.3 : 0; p.stun = vlag & 32 ? 0.3 : 0; p.duikT = vlag & 64 ? 0.3 : 0; p.vier = vlag & 128 ? 1 : 0; p.moe = !!(vlag & 256);
    if (sp.nSnap === 0) { p.x = p.tx; p.y = p.ty; }
    p.slot = null;
  });
  for (const mm of sp.mensen) if (!mm.weg && sp.spelers[mm.ctl]) sp.spelers[mm.ctl].slot = mm.slot;
  if (sp.nSnap === 0) { b.x = b.tx; b.y = b.ty; b.z = b.tz; }
  sp.leeftijd = 0; sp.nSnap++;
  sp.flashTekst = st.x || '';
  return true;
}
const GAST_VOLG = 30, GAST_MAX_SPEED = 20;
export function tikVoetbalSpiegel(sp, dt) {
  sp.leeftijd += dt;
  const k = 1 - Math.exp(-dt * GAST_VOLG);
  for (const p of sp.spelers) {
    const ox = p.x, oy = p.y, du = p.tx - p.x, dv = p.ty - p.y, d = Math.hypot(du, dv);
    if (d <= 0.005) { p.x = p.tx; p.y = p.ty; } else { const s = Math.min(d, d * k, GAST_MAX_SPEED * dt); p.x += du / d * s; p.y += dv / d * s; }
    p.speed = dt > 0 ? Math.hypot(p.x - ox, p.y - oy) / dt : 0;
  }
  const b = sp.bal;
  if (b.owner >= 0) { // de bal volgt zijn drager (de host stuurt hem ook mee, dit maakt het vloeiender)
    const a = Math.min(sp.leeftijd, 0.25);
    const kb = 1 - Math.exp(-dt * 30);
    b.x += (b.tx + b.bvx * a - b.x) * kb; b.y += (b.ty + b.bvy * a - b.y) * kb; b.z += (b.tz - b.z) * kb;
  } else {
    const a = Math.min(sp.leeftijd, 0.25), kb = 1 - Math.exp(-dt * 30);
    b.x += (b.tx + b.bvx * a - b.x) * kb; b.y += (b.ty + b.bvy * a - b.y) * kb; b.z += (Math.max(0, b.tz + b.bvz * a - 0.5 * G * a * a) - b.z) * kb;
  }
  if (sp.flits > 0) sp.flits = Math.max(0, sp.flits - dt * 2.5);
}
