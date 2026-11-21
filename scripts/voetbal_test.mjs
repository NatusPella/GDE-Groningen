// Pure test van de voetbalwedstrijd in de Euroborg (#981): scripts/voetbal_test.mjs
// Bal-fysica (deterministisch), de AI (de vorming blijft in het veld), de wedstrijdstatus (klok, doelpunt, uitbal, herstart, overtreding), invoer naar actie, de moeilijkheid,
// het samenvoegen van de invoer van meerdere mensen, de momentopname naar de gasten, de uitslag en de beloning, de HUD en de opslag van records. Geen THREE, geen DOM.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PITCH, FORMATEN, zetFormaat, cleanFormaat, cleanFormation, cleanStijl, formationNames, formationList, STIJLEN, drukZetters, leesVoorkeur, NAMES_HOME, NAMEN_UIT, KNOP, knopBits, TOETSEN, leesInvoer, invoerNaarActie, aiLevel, mateLevel, voetbalMedaille, recordValue, updatedRecord, voetbalBeloning, formationSpot, richtingVan, ownGoalY, uitkomstVan, TEAMS, OPPONENTS, ROLLEN, DUREN, clockText, leesDuurVoorkeur,
} from '../game/js/voetbalrules.js';
import { makeBall, stepBall, zetBal, crossLine } from '../game/js/voetbalbal.js';
import {
  makeMatch, tikWedstrijd, zetTactiek, uitbalHervat, verlaatVoetbal, uitslagVoetbal, beloningVoetbal, medailleUitRij, snapVoetbal, leesLiveVoetbal, makeFootballMirror, voerInVoetbal, tikVoetbalSpiegel,
  snapLengte, FASEN, meedoenVoetbal,
} from '../game/js/voetbalmatch.js';
import { voetbalHudModel, voetbalBoard, watNu, popVan, UITLEG, STEPS } from '../game/js/voetbalstatus.js';
import { simHudHtml } from '../game/js/simhud.js';
import { VOETBAL_LINES } from '../game/js/voetbaldata.js';
import { medailleTeksten } from '../game/js/difficulty_medals.js';
import { padSlotFor } from '../game/js/controls.js';
import { uitlegModel } from '../game/js/uitleg.js';
import { eindEvent, leesWed, startEvent } from '../game/js/multiplayerwedstrijd.js';
import { zetVoetbalKarakterHaken, wisKarakterHaken, voetbalBonusVan, characterEnter, karakterEind, tessaLine } from '../game/js/voetbalkarakter.js';
import { KEYS } from '../game/js/storagekeys.js';
import { speelWedstrijd } from './voetbal_botsim.mjs';
import { speelschema, newCompetition, applyRound, nextOpponent, tabel, yourRank, isKampioen, leesCompetitie, simuleerDuel, MIJN_CLUB, COMP_CLUBS } from '../game/js/voetbalcompetitie.js';
import { makeRng } from '../game/js/minigamekit.js';

let n = 0;
const wacht = [];
const t = (naam, f) => { try { const r = f(); if (r && typeof r.then === 'function') wacht.push(r.then(() => { n++; }, (e) => { console.error('FAIL', naam); throw e; })); else n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const DT = 1 / 30;
const stap = (m, sec, inv = null) => { const ev = []; for (let i = 0; i < Math.ceil(sec / DT); i++) ev.push(...tikWedstrijd(m, DT, inv)); return ev; };
const tot = (m, fase, max = 120, inv = null) => { const ev = []; for (let i = 0; i < Math.ceil(max / DT) && m.fase !== fase; i++) ev.push(...tikWedstrijd(m, DT, inv)); return ev; };
const mens = (slot = 0, naam = 'Jij') => ({ slot, naam, char: null });

// ---------------------------------------------------------------- bal-fysica
t('de bal rolt uit met wrijving en staat dan stil', () => {
  const b = makeBall(0, -5); b.vy = 12;
  let vorig = 12;
  for (let i = 0; i < 600; i++) { stepBall(b, DT); const s = Math.hypot(b.vx, b.vy); assert.ok(s <= vorig + 1e-9, 'alleen langzamer'); vorig = s; }
  assert.equal(Math.hypot(b.vx, b.vy), 0); assert.ok(b.y > -5 && b.y < PITCH.L / 2, `afstand ${b.y}`);
});
t('een harde bal remt in absolute zin harder dan een zachte', () => {
  const a = makeBall(0, 0), c = makeBall(0, 0); a.vy = 20; c.vy = 4;
  stepBall(a, 0.5); stepBall(c, 0.5);
  assert.ok(20 - a.vy > 4 - c.vy, 'een harde bal verliest in absolute zin meer snelheid');
});
t('stuiten: de bal komt lager terug en rust uiteindelijk op het gras', () => {
  const b = makeBall(0, 0); b.z = 3;
  let hoogte = []; let stuiten = 0;
  for (let i = 0; i < 400; i++) { const ev = stepBall(b, DT, []); stuiten += ev.filter((e) => e.type === 'stuit').length; if (b.vz < 0 && i > 0) hoogte.push(b.z); }
  assert.ok(stuiten >= 3); assert.equal(b.z, 0); assert.equal(b.vz, 0);
});
t('deterministisch: dezelfde start geeft dezelfde bal', () => {
  const sim = () => { const b = makeBall(1, -3); b.vx = 3; b.vy = 9; b.vz = 4; for (let i = 0; i < 90; i++) stepBall(b, DT); return JSON.stringify(b); };
  assert.equal(sim(), sim());
});
t('een doelpunt: de bal over de lijn tussen de palen onder de lat is een doelpunt voor het aanvallende team', () => {
  const b = makeBall(0.5, PITCH.L / 2 - 4); b.vy = 14; b.vz = 0.5;
  const ev = []; for (let i = 0; i < 60; i++) stepBall(b, DT, ev);
  const g = ev.filter((e) => e.type === 'goal'); assert.equal(g.length, 1); assert.equal(g[0].team, 0);
  const c = makeBall(-0.5, -PITCH.L / 2 + 4); c.vy = -14; const ev2 = []; for (let i = 0; i < 60; i++) stepBall(c, DT, ev2);
  assert.equal(ev2.filter((e) => e.type === 'goal')[0].team, 1);
  assert.ok(Math.abs(b.x) < PITCH.DOEL_B / 2 && b.y < PITCH.L / 2 + PITCH.DOEL_DIEPTE, 'de bal blijft in het net');
});
t('een bal naast het doel is geen doelpunt maar uit; over de lat ook', () => {
  const b = makeBall(3.5, PITCH.L / 2 - 3); b.vy = 14; const ev = []; for (let i = 0; i < 40; i++) stepBall(b, DT, ev);
  assert.ok(!ev.some((e) => e.type === 'goal')); assert.ok(ev.some((e) => e.type === 'uit' && e.kind === 'achter'));
  const c = makeBall(0, PITCH.L / 2 - 3); c.vy = 12; c.vz = 7; const ev2 = []; for (let i = 0; i < 60; i++) stepBall(c, DT, ev2);
  assert.ok(!ev2.some((e) => e.type === 'goal'));
});
t('de paal en de lat: de bal kaatst terug en telt niet als doelpunt', () => {
  const b = makeBall(PITCH.DOEL_B / 2 - 0.03, PITCH.L / 2 - 3); b.vy = 14; const ev = []; for (let i = 0; i < 40; i++) stepBall(b, DT, ev);
  assert.ok(ev.some((e) => e.type === 'paal'), 'paal');
  const c = makeBall(0, PITCH.L / 2 - 3); c.vy = 14; c.vz = 5.2; const ev2 = []; for (let i = 0; i < 40; i++) stepBall(c, DT, ev2);
  assert.ok(ev2.some((e) => e.type === 'lat') || ev2.some((e) => e.type === 'goal') || ev2.some((e) => e.type === 'uit'), 'een bal op lathoogte raakt, gaat erin of eroverheen');
});
t('uit: de zijlijn geeft een inworp voor de ander; de achterlijn een hoekschop of doelschop', () => {
  const zij = uitbalHervat({ kind: 'zij', x: 13.1, y: 5 }, 0);
  assert.deepEqual([zij.kind, zij.team], ['inworp', 1]); assert.ok(Math.abs(zij.x) <= PITCH.B / 2);
  // team 1 raakte hem voor de achterlijn van team 1 (y > 0): hoekschop voor team 0
  const hoek = uitbalHervat({ kind: 'achter', x: 4, y: 21.1 }, 1);
  assert.deepEqual([hoek.kind, hoek.team], ['hoek', 0]); assert.ok(Math.abs(hoek.y) < PITCH.L / 2 && Math.abs(hoek.x) < PITCH.B / 2);
  const doel = uitbalHervat({ kind: 'achter', x: 4, y: 21.1 }, 0);
  assert.deepEqual([doel.kind, doel.team], ['doelschop', 1]); assert.ok(Math.abs(doel.y) < PITCH.L / 2);
  assert.deepEqual([uitbalHervat({ kind: 'achter', x: -2, y: -21.1 }, 0).kind, uitbalHervat({ kind: 'achter', x: -2, y: -21.1 }, 0).team], ['hoek', 1]);
});
t('de keeper kan de kruising van de doellijn voorspellen', () => {
  const b = makeBall(0, 8); b.vy = 14; b.vx = 2;
  const k = crossLine(b, PITCH.L / 2); assert.ok(k && k.t > 0.5 && k.t < 2 && k.x > 0.5 && k.x < 4);
  assert.equal(crossLine(b, -PITCH.L / 2), null, 'de andere kant op: nooit');
});

// ---------------------------------------------------------------- invoer naar actie
t('de knopbits zijn een byte en raken de wapenknoppen van een gast niet', () => {
  const alle = Object.values(KNOP);
  assert.equal(new Set(alle).size, alle.length); assert.ok(alle.every((b) => b > 0 && b <= 255 && (b & (b - 1)) === 0));
  assert.ok(!alle.includes(16) && !alle.includes(32), 'de wapenbits blijven vrij');
  assert.equal(knopBits({ sprint: true, schot: true }), KNOP.SPRINT | KNOP.SCHOT);
});
t('invoer naar actie: stick naar vooruit is +y, diagonaal blijft binnen eenheidslengte, rommel wordt nul', () => {
  const a = invoerNaarActie({ mx: 0, my: -1, buttons: KNOP.PASS | KNOP.SPRINT });
  assert.equal(a.dy, 1); assert.equal(a.dx, 0); assert.ok(a.pass && a.sprint && !a.schot);
  const d = invoerNaarActie({ mx: 1, my: 1, buttons: 0 }); assert.ok(Math.hypot(d.dx, d.dy) <= 1.0001);
  const z = invoerNaarActie({ mx: NaN, my: undefined, buttons: 'x' }); assert.deepEqual([z.dx, z.dy, z.sprint], [0, 0, false]);
  assert.deepEqual(invoerNaarActie(null).sterkte, 0);
});
t('de toetsen zijn canonieke toetsen van de keymap en de controller kent ze', () => {
  const alle = Object.values(TOETSEN); assert.equal(new Set(alle).size, alle.length);
  const gedrukt = new Set(['shift', ' ', 'f']);
  const inv = leesInvoer((k) => gedrukt.has(k), () => [0.5, -1]);
  assert.equal(inv.buttons, KNOP.SPRINT | KNOP.SCHOT | KNOP.PASS); assert.equal(inv.mx, 0.5);
  const controls = fs.readFileSync(new URL('../game/js/controls.js', import.meta.url), 'utf8');
  assert.match(controls, /voetbal: 'voetbal'/); assert.match(controls, /voetbal: \{ a: 'f', b: 'e', x: ' ', y: 'q'/);
});

// ---------------------------------------------------------------- de wedstrijd: klok, aftrap, doelpunt, helften
t('de aanloop: intro, aftrap, de klok loopt alleen in het spel', () => {
  const m = makeMatch([mens()], { duur: 'kort', seed: 3 });
  assert.equal(m.fase, 'intro'); assert.equal(m.klok, DUREN.kort);
  stap(m, 1); assert.equal(m.klok, DUREN.kort, 'de intro tikt de klok niet');
  tot(m, 'aftrap', 10); assert.equal(m.fase, 'aftrap'); assert.ok(m.bal.owner >= 0, 'de aftrap ligt bij een speler');
  const k0 = m.klok; stap(m, 0.3); assert.equal(m.klok, k0, 'de klok wacht op de aftrap');
  tot(m, 'spel', 15); assert.equal(m.fase, 'spel');
  const k1 = m.klok; stap(m, 2); assert.ok(m.klok < k1 - 1.5);
});
t('twee helften en een einde: rust, tweede aftrap door de ander, eindsignaal', () => {
  const m = makeMatch([], { duur: 'kort', seed: 5, aiBeide: true });
  const ev = tot(m, 'klaar', 400);
  assert.equal(m.fase, 'klaar'); assert.ok(ev.some((e) => e.type === 'fluit' && e.helft === 1)); assert.ok(ev.some((e) => e.type === 'einde'));
  const aftrappen = ev.filter((e) => e.type === 'aftrap'); assert.ok(aftrappen.length >= 2);
  assert.equal(aftrappen[0].team, 0); const naRust = aftrappen.find((e, i) => i > 0 && ev.indexOf(e) > ev.findIndex((x) => x.type === 'fluit'));
  assert.ok(naRust && naRust.team === 1, 'na de rust trapt de ander af');
  assert.equal(m.helft, 2); assert.equal(m.klok, 0);
});
t('een doelpunt: stand omhoog, viering, daarna trapt de tegenpartij af', () => {
  const m = makeMatch([mens()], { duur: 'kort', seed: 7 });
  tot(m, 'spel', 30);
  // zet de bal vlak voor het doel van team 1 en schiet hem erin
  const sch = m.spelers.find((p) => p.team === 0 && p.i === 3); m.bal.owner = -1; sch.x = 0; sch.y = 14; m.bal.x = 0.4; m.bal.y = 17; m.bal.vx = 0; m.bal.vz = 0; m.bal.vy = 15; m.bal.laatsteTeam = 0; m.bal.laatsteSpeler = sch.id; for (const p of m.spelers) if (p.team === 1) p.stun = 6; // de verdediging slaapt: dit test het doelpunt zelf
  const ev = tot(m, 'goal', 5);
  const g = ev.find((e) => e.type === 'goal');
  assert.ok(g && g.team === 0 && !g.eigen, JSON.stringify(g)); assert.deepEqual(m.score, [1, 0]); assert.equal(m.fase, 'goal');
  assert.ok(m.flits > 0.5 && m.flash && /GOAL/.test(m.flash.tekst), 'de flits en de tekst');
  assert.ok(sch.vier > 0, 'de schutter viert het');
  const ev2 = tot(m, 'aftrap', 10); assert.ok(ev2.some((e) => e.type === 'aftrap' && e.team === 1), 'de ander trapt af');
  assert.equal(m.spelers[m.bal.owner].team, 1);
});
t('slow-motion in het begin van de viering: de bal beweegt in de flits trager dan daarna', () => {
  const m = makeMatch([mens()], { duur: 'kort', seed: 9 });
  tot(m, 'spel', 30);
  for (const p of m.spelers) if (p.team === 1) p.stun = 6;
  m.bal.owner = -1; m.bal.x = 0; m.bal.y = 18.5; m.bal.vx = 0; m.bal.vz = 0; m.bal.vy = 20; m.bal.laatsteTeam = 0; m.bal.laatsteSpeler = 3;
  tot(m, 'goal', 5);
  const y0 = m.bal.y; tikWedstrijd(m, 0.1); const d1 = Math.abs(m.bal.y - y0);
  assert.ok(m.fase === 'goal'); assert.ok(d1 < 0.1 * 20 * 0.5, 'trager dan de echte snelheid');
});
t('een eigen doelpunt telt voor de ander en geeft niemand een doelpunt', () => {
  const m = makeMatch([mens()], { duur: 'kort', seed: 11 });
  tot(m, 'spel', 30);
  const dader = m.spelers.find((p) => p.team === 0 && p.i === 1); for (const p of m.spelers) p.stun = 6; m.bal.owner = -1; m.bal.x = 0; m.bal.y = -18.5; m.bal.vx = 0; m.bal.vz = 0; m.bal.vy = -18; m.bal.laatsteTeam = 0; m.bal.laatsteSpeler = dader.id;
  const ev = tot(m, 'goal', 5); const g = ev.find((e) => e.type === 'goal');
  assert.deepEqual([g.team, g.eigen], [1, true]); assert.deepEqual(m.score, [0, 1]); assert.equal(m.mensen[0].doelpunten, 0);
});
t('uitbal: de bal gaat uit, een korte pauze, dan herstart de juiste speler en loopt het spel door', () => {
  const m = makeMatch([], { duur: 'kort', seed: 13, aiBeide: true });
  tot(m, 'spel', 30);
  m.bal.owner = -1; m.bal.x = HB() - 0.3; m.bal.y = 2; m.bal.vx = 8; m.bal.vy = 0; m.bal.laatsteTeam = 1; m.bal.laatsteSpeler = 5;
  const ev = tot(m, 'hervat', 5);
  const h = ev.find((e) => e.type === 'hervat'); assert.ok(h && h.kind === 'inworp' && h.team === 0, JSON.stringify(h));
  assert.equal(m.fase, 'hervat'); assert.ok(m.bal.owner >= 0 && m.spelers[m.bal.owner].team === 0);
  const klokNu = m.klok; stap(m, 0.6); assert.equal(m.klok, klokNu, 'tijdens de pauze loopt de klok niet');
  tot(m, 'spel', 12); assert.equal(m.fase, 'spel', 'na de herstart wordt het weer gespeeld');
});
function HB() { return PITCH.B / 2; }
t('de achterlijn: hoekschop of doelschop, de keeper trapt de doelschop', () => {
  const m = makeMatch([], { duur: 'kort', seed: 15, aiBeide: true });
  tot(m, 'spel', 30);
  m.bal.owner = -1; m.bal.x = 8; m.bal.y = -PITCH.L / 2 - 0.1; m.bal.vy = -5; m.bal.laatsteTeam = 1; m.bal.laatsteSpeler = 6; // team 1 raakt hem achter het doel van team 0: doelschop voor team 0
  const ev = tot(m, 'hervat', 5); const h = ev.find((e) => e.type === 'hervat');
  assert.deepEqual([h.kind, h.team], ['doelschop', 0]); assert.equal(m.spelers[m.bal.owner].rol, 'keeper');
});
t('overtreding: een mislukte tackle van achteren of omver lopen geeft de ander een vrije bal; geen kaarten', () => {
  const m = makeMatch([], { duur: 'kort', seed: 17, aiBeide: true, regels: { kaarten: false, blessures: false, strafschoppen: false, wissels: false } });
  tot(m, 'spel', 30);
  const dader = m.spelers.find((p) => p.team === 1 && p.i === 3), slachtoffer = m.spelers.find((p) => p.team === 0 && p.i === 3);
  slachtoffer.x = 0; slachtoffer.y = 0; slachtoffer.face = Math.PI / 2; slachtoffer.vx = 0; slachtoffer.vy = 3; slachtoffer.speed = 3;
  m.bal.owner = slachtoffer.id; m.bal.x = 0; m.bal.y = 0.6; m.bal.laatsteTeam = 0;
  // de dader sprint er van achteren (vanaf -y) op af
  dader.x = 0; dader.y = -0.45; dader.face = Math.PI / 2; dader.vx = 0; dader.vy = 7.4; dader.speed = 7.4; dader.tackleCd = 9; m.foulCd = 0;
  for (const p of m.spelers) if (p !== dader && p !== slachtoffer) { p.x = p.team === 0 ? -9 : 9; p.y = p.i * 3 - 6; }
  const ev = stap(m, 0.2);
  const o = ev.find((e) => e.type === 'overtreding');
  assert.ok(o && o.team === 1, JSON.stringify(ev.map((e) => e.type))); assert.equal(m.fase, 'hervat'); assert.equal(m.hervat.kind, 'vrij'); assert.equal(m.hervat.team, 0);
  assert.deepEqual([m.stat.geel, m.stat.rood], [[0, 0], [0, 0]], 'met de regels uit: geen kaarten');
  assert.equal(m.stat.overtredingen[1], 1);
});
t('geen buitenspel: een aanvaller achter de laatste verdediger mag de bal gewoon krijgen', () => {
  const m = makeMatch([], { duur: 'kort', seed: 19, aiBeide: true });
  tot(m, 'spel', 30);
  const spits = m.spelers.find((p) => p.team === 0 && p.i === 4), pas = m.spelers.find((p) => p.team === 0 && p.i === 1);
  for (const p of m.spelers) if (p.team === 1) { p.x = -6 + p.i * 2; p.y = 2; } // iedereen van team 1 staat ver terug
  spits.x = 0; spits.y = 15; pas.x = 0; pas.y = 2; m.bal.owner = pas.id; m.bal.x = 0; m.bal.y = 2.6;
  const ev = []; ev.push(...stap(m, 0.1));
  assert.ok(!ev.some((e) => /buitenspel/i.test(JSON.stringify(e))) && m.fase === 'spel');
});

// ---------------------------------------------------------------- de AI
t('de vorming blijft in het veld en de keeper in zijn zestien (60 seconden, alle rollen)', () => {
  const m = makeMatch([], { duur: 'normaal', seed: 21, aiBeide: true });
  tot(m, 'spel', 30);
  let maxDichtbij = 99;
  for (let i = 0; i < 60 / DT; i++) {
    tikWedstrijd(m, DT);
    for (const p of m.spelers) {
      assert.ok(Math.abs(p.x) <= PITCH.B / 2 + 1e-6 && Math.abs(p.y) <= PITCH.L / 2 + 1e-6, `${p.naam} buiten het veld (${p.x}, ${p.y})`);
      assert.ok([p.x, p.y, p.vx, p.vy, p.face].every(Number.isFinite));
    }
    for (let a = 0; a < 10; a++) for (let c = a + 1; c < 10; c++) maxDichtbij = Math.min(maxDichtbij, Math.hypot(m.spelers[a].x - m.spelers[c].x, m.spelers[a].y - m.spelers[c].y));
  }
  assert.ok(maxDichtbij > 0.3, `spelers lopen niet door elkaar heen (${maxDichtbij.toFixed(2)} m)`);
});
t('de vormingsplekken: de keeper staat op zijn lijn, verdedigers achter aanvallers, alles in het veld', () => {
  for (const team of [0, 1]) for (const bal of [{ x: 0, y: 0 }, { x: 10, y: 15 }, { x: -12, y: -20 }]) for (const aanval of [true, false]) {
    const pl = ROLLEN.map((_, i) => formationSpot(team, i, bal, aanval));
    for (const p of pl) assert.ok(Math.abs(p.x) <= PITCH.B / 2 && Math.abs(p.y) <= PITCH.L / 2);
    const d = (p) => (p.y - ownGoalY(team)) * richtingVan(team);
    assert.ok(d(pl[0]) < 3, 'de keeper bij zijn doel'); assert.ok(d(pl[1]) <= d(pl[3]) + 1e-6 && d(pl[2]) <= d(pl[4]) + 1e-6, 'verdedigers achter aanvallers');
  }
});
t('de moeilijkheid: reactietijd en spreiding dalen, snelheid en keeper stijgen; de maatjes blijven gelijk', () => {
  const o = aiLevel('ontspannen'), s = aiLevel('standaard'), u = aiLevel('uitdagend');
  assert.ok(o.reactie > s.reactie && s.reactie > u.reactie); assert.ok(o.spreiding > s.spreiding && s.spreiding > u.spreiding);
  assert.ok(o.tempo < s.tempo && s.tempo < u.tempo); assert.ok(o.keeper < s.keeper && s.keeper < u.keeper);
  assert.equal(mateLevel('uitdagend').reactie, mateLevel('ontspannen').reactie, 'teamgenoten spelen niet slechter op een hogere stand');
  assert.deepEqual(aiLevel('onzin'), s, 'een onbekende stand is standaard');
  const m = makeMatch([mens()], { stand: 'uitdagend', seed: 1 }); assert.equal(m.ai[1].reactie, u.reactie); assert.equal(m.ai[0].reactie, mateLevel('uitdagend').reactie);
});
t('de moeilijkheid werkt: een uitdagende tegenstander scoort vaker dan een ontspannen (gemiddeld over 24 wedstrijden)', () => {
  const tegen = (stand) => { let g = 0; for (let s = 1; s <= 24; s++) { const m = makeMatch([], { duur: 'kort', stand, seed: 100 + s }); tot(m, 'klaar', 400); g += m.score[1]; } return g / 24; };
  const ont = tegen('ontspannen'), uit = tegen('uitdagend');
  assert.ok(uit >= ont, `uitdagend ${uit.toFixed(2)} tegen ontspannen ${ont.toFixed(2)}`);
});
t('een speler zonder mens is AI: wie wegvalt wordt overgenomen door de computer', () => {
  const m = makeMatch([mens(0), mens(1, 'Anke')], { duur: 'kort', seed: 23 });
  assert.ok(meedoenVoetbal(m, 1)); assert.equal(verlaatVoetbal(m, 1), true); assert.equal(verlaatVoetbal(m, 1), false); assert.ok(!meedoenVoetbal(m, 1));
  tot(m, 'spel', 30); stap(m, 5, (slot) => ({ mx: 0, my: 0, buttons: 0 }));
  assert.ok(m.spelers.filter((p) => p.slot != null).length === 1, 'nog één speler wordt door een mens bestuurd');
  assert.equal(verlaatVoetbal(m, 99), false);
});

// ---------------------------------------------------------------- de mens: lopen, schieten, passen, tackle, wisselen
function inSpel(slots = [0], seed = 31) {
  const m = makeMatch(slots.map((s) => mens(s, `S${s}`)), { duur: 'normaal', seed });
  tot(m, 'spel', 30); for (const p of m.spelers) { p.cool = 0; p.stun = 0; }
  return m;
}
t('lopen en sprinten: de bestuurde speler volgt de stick; sprinten is sneller en kost adem', () => {
  const m = inSpel(); const p = m.spelers[m.mensen[0].ctl];
  m.bal.owner = -1; zetBal(m.bal, 10, 10); m.mensen[0].autoT = 1e9; // geen automatisch wisselen in deze test
  p.x = 0; p.y = -5; p.vx = p.vy = 0; p.stamina = 1;
  stap(m, 1, () => ({ mx: 0, my: -1, buttons: 0 })); const y1 = p.y;
  assert.ok(y1 > -5 && p.y - -5 < 6 && Math.abs(p.speed - 5.2) < 0.6, `loopsnelheid ${p.speed}`);
  p.x = 0; p.y = -5; p.vx = p.vy = 0;
  stap(m, 1, () => ({ mx: 0, my: -1, buttons: KNOP.SPRINT })); assert.ok(p.y - -5 > y1 - -5, 'sprinten is sneller'); assert.ok(p.stamina < 1, 'adem raakt op');
  for (let i = 0; i < 20; i++) stap(m, 1, () => ({ mx: 0, my: 1, buttons: KNOP.SPRINT })); assert.ok(p.stamina >= 0);
});
t('de bal aan de voet: een speler die de bal oppakt draagt hem voor zich uit (dribbelgevoel)', () => {
  const m = inSpel(); const p = m.spelers[m.mensen[0].ctl];
  for (const q of m.spelers) if (q !== p) { q.x = q.team === 0 ? -10 : 10; q.y = -15 + q.i * 4; }
  p.x = 0; p.y = 0; p.face = Math.PI / 2; m.bal.owner = -1; zetBal(m.bal, 0, 0.4); m.bal.laatsteTeam = 1;
  stap(m, 0.2, () => ({ mx: 0, my: 0, buttons: 0 })); assert.equal(m.bal.owner, p.id, 'in de buurt gaat hij mee');
  stap(m, 1.2, () => ({ mx: 0, my: -1, buttons: 0 }));
  assert.equal(m.bal.owner, p.id); assert.ok(Math.hypot(m.bal.x - p.x, m.bal.y - p.y) < 1.1 && m.bal.y > 2, 'de bal blijft vlak voor de voet');
});
t('afstand-afhankelijke aanname: een langzame bal wordt aangenomen, een kogel ketst af', () => {
  const m = inSpel(); const p = m.spelers[m.mensen[0].ctl];
  for (const q of m.spelers) if (q !== p) { q.x = q.team === 0 ? -10 : 10; q.y = -15 + q.i * 4; }
  p.x = 0; p.y = 0; p.vx = p.vy = 0; m.bal.owner = -1; zetBal(m.bal, 0, -3); m.bal.vy = 5; m.bal.laatsteTeam = 1;
  stap(m, 1, () => ({ mx: 0, my: 0, buttons: 0 })); assert.equal(m.bal.owner, p.id);
  const m2 = inSpel(); const p2 = m2.spelers[m2.mensen[0].ctl];
  for (const q of m2.spelers) if (q !== p2) { q.x = q.team === 0 ? -10 : 10; q.y = -15 + q.i * 4; }
  p2.x = 0; p2.y = 0; m2.bal.owner = -1; zetBal(m2.bal, 0, -3); m2.bal.vy = 26; m2.bal.laatsteTeam = 1;
  const ev = stap(m2, 0.4, () => ({ mx: 0, my: 0, buttons: 0 })); assert.ok(ev.some((e) => e.type === 'afketsing') || m2.bal.owner !== p2.id, 'te hard: afgeketst');
});
t('schot: houden geeft meer kracht, loslaten schiet; de bal gaat in de richting van de stick', () => {
  const kracht = (houd) => {
    const m = inSpel(); const p = m.spelers[m.mensen[0].ctl];
    for (const q of m.spelers) if (q !== p) { q.x = q.team === 0 ? -10 : 10; q.y = -12 + q.i * 3; }
    p.x = 0; p.y = 3; p.face = Math.PI / 2; p.vx = p.vy = 0; m.bal.owner = p.id; m.bal.x = 0; m.bal.y = 3.6; m.bal.laatsteTeam = 0;
    for (let i = 0; i < Math.ceil(houd / DT); i++) tikWedstrijd(m, DT, () => ({ mx: 0, my: -1, buttons: KNOP.SCHOT }));
    const ev = tikWedstrijd(m, DT, () => ({ mx: 0, my: -1, buttons: 0 }));
    const s = ev.find((e) => e.type === 'schop');
    return { s, v: Math.hypot(m.bal.vx, m.bal.vy), m };
  };
  const zacht = kracht(0.05), hard = kracht(1.0);
  assert.ok(zacht.s && zacht.s.soort === 'schot' && hard.s); assert.ok(hard.v > zacht.v + 5, `${zacht.v} tegen ${hard.v}`);
  assert.ok(hard.m.bal.vy > 0, 'vooruit is naar het doel van de tegenstander'); assert.equal(hard.m.stat.schoten[0], 1);
});
t('pass: een korte pass gaat naar de teamgenoot in de richting van de stick; een lange bal is een voorzet in de lucht', () => {
  const m = inSpel(); const p = m.spelers[m.mensen[0].ctl];
  const maat = m.spelers.find((q) => q.team === 0 && q.i === 4);
  for (const q of m.spelers) if (q !== p && q !== maat) { q.x = q.team === 0 ? -11 : 11; q.y = -15 + q.i * 2; }
  p.x = 0; p.y = 0; p.face = Math.PI / 2; maat.x = 3; maat.y = 9; m.bal.owner = p.id; m.bal.x = 0; m.bal.y = 0.6; m.bal.laatsteTeam = 0;
  const ev = tikWedstrijd(m, DT, () => ({ mx: 0.3, my: -1, buttons: KNOP.PASS }));
  const s = ev.find((e) => e.type === 'schop'); assert.ok(s && s.soort === 'pass'); assert.ok(m.bal.vy > 5 && m.bal.vz === 0);
  stap(m, 2); assert.equal(m.bal.owner, maat.id, 'de pass komt aan');
  const m2 = inSpel(); const p2 = m2.spelers[m2.mensen[0].ctl];
  for (const q of m2.spelers) if (q !== p2) { q.x = q.team === 0 ? -11 : 11; q.y = -15 + q.i * 2; }
  p2.x = 0; p2.y = 0; p2.face = Math.PI / 2; m2.bal.owner = p2.id; m2.bal.x = 0; m2.bal.y = 0.6;
  for (let i = 0; i < 20; i++) tikWedstrijd(m2, DT, () => ({ mx: 0, my: -1, buttons: KNOP.LANG }));
  const ev2 = tikWedstrijd(m2, DT, () => ({ mx: 0, my: -1, buttons: 0 })); assert.ok(ev2.some((e) => e.type === 'schop' && e.soort === 'lang')); assert.ok(m2.bal.vz > 3, 'een voorzet gaat de lucht in');
});
t('tackle: een tackle van voren wint soms de bal; een tackle zonder tegenstander in de buurt gebeurt niets', () => {
  let gewonnen = 0, mislukt = 0;
  for (let s = 0; s < 40; s++) {
    const m = inSpel([0], 200 + s); const p = m.spelers[m.mensen[0].ctl];
    const o = m.spelers.find((q) => q.team === 1 && q.i === 3);
    for (const q of m.spelers) if (q !== p && q !== o) { q.x = q.team === 0 ? -11 : 11; q.y = -15 + q.i * 2; }
    o.x = 0; o.y = 3; o.face = -Math.PI / 2; o.vx = o.vy = 0; o.speed = 0; m.bal.owner = o.id; m.bal.x = 0; m.bal.y = 2.4; m.bal.laatsteTeam = 1; m.foulCd = 0;
    p.x = 0; p.y = 1.8; p.face = Math.PI / 2; p.vx = p.vy = 0; p.tackleCd = 0;
    const ev = tikWedstrijd(m, DT, () => ({ mx: 0, my: 0, buttons: KNOP.TACKLE })); ev.push(...stap(m, 0.4, () => ({ mx: 0, my: 0, buttons: 0 })));
    if (ev.some((e) => e.type === 'tackle')) gewonnen++; else mislukt++;
  }
  assert.ok(gewonnen > 5 && mislukt > 3, `gewonnen ${gewonnen}, mislukt ${mislukt}`);
  const m = inSpel(); const p = m.spelers[m.mensen[0].ctl]; for (const q of m.spelers) if (q !== p) { q.x = q.team === 0 ? -11 : 11; q.y = -15 + q.i * 2; }
  m.bal.owner = -1; zetBal(m.bal, 9, 9);
  const ev = stap(m, 1, () => ({ mx: 0, my: 0, buttons: KNOP.TACKLE })); assert.ok(!ev.some((e) => e.type === 'tackle' || e.type === 'overtreding'));
});
t('wissel: de bestuurde speler schakelt naar de speler die het dichtst bij de bal staat; automatisch bij verdedigen', () => {
  const m = inSpel(); const eerst = m.mensen[0].ctl;
  const doel = m.spelers.find((p) => p.team === 0 && p.id !== eerst && p.rol !== 'keeper');
  for (const q of m.spelers) if (q.team === 0) { q.x = -10; q.y = -15 + q.i * 3; }
  doel.x = 2; doel.y = 9; m.bal.owner = -1; zetBal(m.bal, 3, 10); m.bal.laatsteTeam = 1;
  const ev = tikWedstrijd(m, DT, () => ({ mx: 0, my: 0, buttons: KNOP.WISSEL })); tikWedstrijd(m, DT, () => ({ mx: 0, my: 0, buttons: 0 }));
  assert.equal(m.mensen[0].ctl, doel.id); assert.ok(ev.some((e) => e.type === 'wissel'));
  // verdedigen: de tegenstander heeft de bal; na een tijdje is het de dichtstbijzijnde
  const m2 = inSpel(); const x = m2.spelers.find((p) => p.team === 0 && p.i === 2); const o = m2.spelers.find((p) => p.team === 1 && p.i === 3);
  for (const q of m2.spelers) if (q.team === 0) { q.x = -10; q.y = -17 + q.i; }
  x.x = 0; x.y = -4; o.x = 0.5; o.y = -2; m2.bal.owner = o.id; m2.bal.x = 0.5; m2.bal.y = -2.5; m2.bal.laatsteTeam = 1;
  m2.spelers[m2.mensen[0].ctl].x = -10;
  stap(m2, 0.5, () => ({ mx: 0, my: 0, buttons: 0 })); assert.equal(m2.mensen[0].ctl, x.id, 'bij verdedigen wisselt hij vanzelf');
});
t('de keeper bestuurd door een mens: duiken met schot of tackle; met de bal speelt hij hem uit', () => {
  const m = inSpel(); const keeper = m.spelers.find((p) => p.team === 0 && p.rol === 'keeper');
  m.mensen[0].ctl = keeper.id; for (const q of m.spelers) if (q !== keeper) { q.x = q.team === 0 ? -10 : 10; q.y = q.team === 0 ? -5 : 8; }
  keeper.x = 0; keeper.y = -19.5; m.bal.owner = -1; zetBal(m.bal, 6, 5); m.bal.laatsteTeam = 1;
  const ev = tikWedstrijd(m, DT, () => ({ mx: 1, my: 0, buttons: KNOP.SCHOT })); assert.ok(ev.some((e) => e.type === 'duik')); assert.ok(keeper.duikT > 0 && keeper.duikDx === 1);
});
t('een keeper vangt of slaat weg: het resultaat hangt af van de snelheid van de bal', () => {
  const vang = (v, seed) => { const m = inSpel([0], seed); const k = m.spelers.find((p) => p.team === 0 && p.rol === 'keeper'); for (const q of m.spelers) if (q !== k) { q.x = q.team === 0 ? -9 : 9; q.y = 4; }
    k.x = 0; k.y = -19.6; m.bal.owner = -1; zetBal(m.bal, 0, -17); m.bal.vy = -v; m.bal.laatsteTeam = 1; m.bal.laatsteSpeler = 7; m.spelers[m.mensen[0].ctl].x = -9;
    const ev = stap(m, 0.6); return ev.find((e) => e.type === 'redding'); };
  let vangsten = 0, weg = 0, goals = 0;
  for (let s = 0; s < 30; s++) { const r = vang(8, 300 + s); if (r && r.soort === 'vangst') vangsten++; }
  for (let s = 0; s < 30; s++) { const r = vang(28, 400 + s); if (r && r.soort === 'weg') weg++; else if (!r) goals++; }
  assert.ok(vangsten >= 15, `een langzame bal wordt meestal gevangen (${vangsten}/30)`); assert.ok(weg + goals >= 20, 'een kogel wordt niet gevangen');
});

// ---------------------------------------------------------------- Samen spelen: invoer samenvoegen, momentopname, uitslag
t('Samen: elke mens bestuurt een eigen speler met zijn eigen invoer; de invoer van de ene beweegt de andere niet', () => {
  const m = inSpel([0, 1, 2], 41);
  const ids = m.mensen.map((x) => x.ctl); assert.equal(new Set(ids).size, 3);
  m.bal.owner = -1; zetBal(m.bal, 0, 12);
  const y0 = ids.map((i) => m.spelers[i].y), x0 = ids.map((i) => m.spelers[i].x);
  stap(m, 0.8, (slot) => (slot === 1 ? { mx: 1, my: 0, buttons: 0 } : { mx: 0, my: 0, buttons: 0 }));
  const bewogen = ids.map((i, k) => Math.hypot(m.spelers[i].x - x0[k], m.spelers[i].y - y0[k]));
  assert.ok(bewogen[1] > 1.5, 'slot 1 liep'); assert.ok(m.spelers[ids[1]].x > x0[1]);
  assert.ok(m.spelers.filter((p) => p.slot != null).length === 3);
  assert.deepEqual(m.spelers.filter((p) => p.slot != null).map((p) => p.slot).sort(), [0, 1, 2]);
  assert.equal(new Set(m.mensen.map((x) => m.spelers[x.ctl].id)).size, 3, 'nooit twee mensen in één speler');
  // vier mensen: allemaal een eigen veldspeler, de keeper blijft computer
  const v = inSpel([0, 1, 2, 3], 43); assert.equal(new Set(v.mensen.map((x) => x.ctl)).size, 4); assert.ok(v.mensen.every((x) => v.spelers[x.ctl].rol !== 'keeper'));
  // een invoer die rommel is, of ontbreekt, laat de speler stilstaan
  stap(v, 0.5, () => null); stap(v, 0.5, () => ({ mx: NaN, my: Infinity, buttons: 'x' })); assert.ok(v.spelers.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
});
t('Samen: bij het wisselen na een pass nemen de mensen niet allemaal dezelfde speler', () => {
  const m = inSpel([0, 1], 45);
  for (let i = 0; i < 600; i++) { tikWedstrijd(m, DT, (slot) => ({ mx: Math.sin(i / 20 + slot), my: -Math.cos(i / 17), buttons: (i % 40 < 3 ? KNOP.PASS : 0) | (i % 90 < 2 ? KNOP.WISSEL : 0) })); assert.equal(new Set(m.mensen.filter((x) => !x.weg).map((x) => x.ctl)).size, m.mensen.filter((x) => !x.weg).length); }
});
t('de momentopname: past in 64 getallen, rondreis host naar gast geeft dezelfde stand, ook als hij door het kader gaat', () => {
  assert.ok(snapLengte('klein') <= 64 && snapLengte('groot') <= 64);
  const m = inSpel([0, 1], 47); stap(m, 3, (slot) => ({ mx: slot ? -1 : 1, my: -1, buttons: 0 }));
  const snap = snapVoetbal(m, 7); assert.equal(snap.d.length, snapLengte('klein')); assert.ok(snap.d.every(Number.isFinite)); assert.ok(snap.x.length <= 60);
  const via = JSON.parse(JSON.stringify(snap));
  const st = leesLiveVoetbal(via); assert.ok(st);
  const start = leesWed(startEvent('voetbal', [{ slot: 0, naam: 'Host', char: 'tammo' }, { slot: 1, naam: 'Gast', char: 'anita' }], 0, { live: 1, v: 'normaal|standaard|2' }));
  assert.ok(start && start.live && start.v === 'normaal|standaard|2' && start.deeln.length === 2);
  const sp = makeFootballMirror(start, 1, { duur: 'normaal', stand: 'standaard', tegenstander: 2 });
  assert.equal(sp.teams[1].id, OPPONENTS[2].id);
  assert.ok(voerInVoetbal(sp, st)); assert.equal(voerInVoetbal(sp, { ...st, n: 3 }), false, 'een oudere momentopname telt niet');
  for (let i = 0; i < 30; i++) tikVoetbalSpiegel(sp, DT);
  m.spelers.forEach((p, i) => { assert.ok(Math.abs(sp.spelers[i].x - p.x) < 0.06 && Math.abs(sp.spelers[i].y - p.y) < 0.06, `speler ${i}`); });
  assert.ok(Math.hypot(sp.bal.x - m.bal.x, sp.bal.y - m.bal.y) < 0.4 + 0.3 * Math.hypot(m.bal.vx, m.bal.vy), 'de bal volgt de host (met een kwart seconde voorsprong)'); assert.deepEqual(sp.score, m.score); assert.equal(sp.fase, m.fase);
  assert.equal(sp.mijnId, m.mensen[1].ctl, 'de gast weet welke speler hij is');
  assert.equal(leesLiveVoetbal({ ...via, d: via.d.slice(1) }), null); assert.equal(leesLiveVoetbal({ ...via, d: via.d.map((x, i) => (i === 3 ? NaN : x)) }), null);
  assert.equal(leesLiveVoetbal({ ...via, f: 'st' }), null);
  // de generieke lezer van het kader accepteert hem ook (hoogstens 64 getallen)
  assert.ok(leesWed(via) && leesWed(via).f === 'lv');
});
t('een late gast of een gast die wegvalt: de spiegel krijgt hem weer als de host de AI zijn plek laat innemen', () => {
  const m = inSpel([0, 1], 49); verlaatVoetbal(m, 1);
  const st = leesLiveVoetbal(JSON.parse(JSON.stringify(snapVoetbal(m, 1))));
  const start = leesWed(startEvent('voetbal', [{ slot: 0, naam: 'Host', char: '' }, { slot: 1, naam: 'Gast', char: '' }], 0, { live: 1 }));
  const sp = makeFootballMirror(start, 1); voerInVoetbal(sp, st); assert.equal(sp.mijnId, -1, 'wie weg is bestuurt niets meer');
  assert.equal(st.d[17], -1);
});
t('uitslag: winst, gelijk of verlies per mens; wie wegviel krijgt niets; eindbericht gaat heen en weer', () => {
  const m = makeMatch([mens(0, 'Host'), mens(1, 'Gast')], { duur: 'kort', seed: 51 });
  m.score = [3, 0]; m.mensen[0].doelpunten = 3; m.mensen[1].doelpunten = 0; m.fase = 'klaar';
  const rijen = uitslagVoetbal(m);
  assert.deepEqual(rijen.map((r) => [r.slot, r.plek, r.tijd]), [[0, 1, 3], [1, 1, 0]]); assert.match(rijen[0].tekst, /^gewonnen: 3-0$/);
  const via = leesWed(JSON.parse(JSON.stringify(eindEvent(rijen, { plek: 1, geld: 50, xp: 20, fin: 1, weg: 0 }))));
  assert.ok(via && via.rijen.length === 2); assert.equal(via.rijen[0].tijd, 3); assert.match(via.rijen[1].tekst, /3-0/);
  const mm = medailleUitRij(via.rijen[0]); assert.deepEqual([mm.medaille, mm.gf, mm.ga, mm.eigen], [3, 3, 0, 3]);
  assert.equal(medailleUitRij(via.rijen[1]).medaille, 2, 'winst met de nul zonder hattrick: zilver');
  verlaatVoetbal(m, 1); const r2 = uitslagVoetbal(m); assert.equal(r2.find((r) => r.slot === 1).weg, true);
  assert.deepEqual(beloningVoetbal(r2.find((r) => r.slot === 1)), { geld: 0, xp: 0 });
  const g = beloningVoetbal(rijen[0]); assert.ok(g.geld > 0 && g.geld <= 60 && g.xp > 0);
  const verlies = makeMatch([mens()], { seed: 1 }); verlies.score = [0, 2]; assert.equal(uitslagVoetbal(verlies)[0].plek, 2); assert.equal(medailleUitRij(uitslagVoetbal(verlies)[0]).medaille, 0);
  const gelijk = makeMatch([mens()], { seed: 1 }); gelijk.score = [1, 1]; assert.equal(uitslagVoetbal(gelijk)[0].plek, 3);
  assert.ok(beloningVoetbal({ ...uitslagVoetbal(verlies)[0] }).geld < beloningVoetbal(uitslagVoetbal(gelijk)[0]).geld && beloningVoetbal(uitslagVoetbal(gelijk)[0]).geld < g.geld, 'winst > gelijk > verlies');
});
t('medailles en records: winst, winst met de nul, hattrick; een record telt alleen omhoog', () => {
  assert.equal(voetbalMedaille({ gf: 1, ga: 2 }), 0); assert.equal(voetbalMedaille({ gf: 1, ga: 1 }), 0); assert.equal(voetbalMedaille({ gf: 2, ga: 1 }), 1); assert.equal(voetbalMedaille({ gf: 1, ga: 0 }), 2);
  assert.equal(voetbalMedaille({ gf: 4, ga: 2, eigen: 3 }), 3); assert.equal(voetbalMedaille({ gf: 2, ga: 0, eigen: 3 }), 3);
  assert.equal(recordValue({ gf: 1, ga: 4 }), 0); assert.equal(recordValue({ gf: 5, ga: 2 }), 3);
  assert.equal(uitkomstVan(2, 1), 'winst'); assert.equal(uitkomstVan(1, 1), 'gelijk');
  const r1 = updatedRecord(null, { waarde: 2, medaille: 1 }); const r2 = updatedRecord(r1, { waarde: 1, medaille: 3 }); const r3 = updatedRecord(r2, { waarde: 4, medaille: 0 });
  assert.deepEqual([r2.best, r2.medal, r2.runs, r2.nieuw], [2, 3, 2, false]); assert.deepEqual([r3.best, r3.medal, r3.nieuw], [4, 3, true]);
  assert.deepEqual(medailleTeksten('voetbal', 'standaard'), ['Winst', 'Winst met de nul', 'Winst met een hattrick']);
  assert.deepEqual(medailleTeksten('voetbal', 'uitdagend'), medailleTeksten('voetbal', 'standaard'), 'de eisen zijn de uitslag, ook op een andere stand');
});
t('de opslag: het record komt via de bestaande uitdagingen (geen eigen save), de voorkeur in een eigen sleutel die ook corrupt of leeg niets stukmaakt', async () => {
  const A = await import('../game/js/achievements.js');
  const w = { audioEvents: [], addMessage() {} };
  const key = 'standaard:voetbal-test-' + Date.now();
  const r1 = A.recordChallengeResult(w, key, { value: 3, medal: 2 }); assert.equal(r1.medal, 2);
  const r2 = A.recordChallengeResult(w, key, { value: 1, medal: 1 }); assert.equal(r2.medal, 2, 'een lagere medaille haalt de hogere niet weg');
  assert.equal(A.getChallengeRecord(key).best, 3);
  const save = A.getAchievementSaveData(); assert.ok(Array.isArray(save.unlocked), 'de save blijft in dezelfde vorm');
  assert.equal(KEYS.voetbal, 'gde-voetbal-v1');
  const src = fs.readFileSync(new URL('../game/js/voetbal.js', import.meta.url), 'utf8');
  assert.match(src, /KEYS\.voetbal/); assert.ok(!/gde-save-v1|gde-settings|gde-prestaties-v1/.test(src), 'geen schrijfactie naar echte opslag');
  assert.equal(leesDuurVoorkeur('{kapot'), 'normaal'); assert.equal(leesDuurVoorkeur(null), 'normaal'); assert.equal(leesDuurVoorkeur('{"duur":"kort"}'), 'kort'); assert.equal(leesDuurVoorkeur('{"duur":"x"}'), 'normaal');
});
t('prestaties: winst en hattrick bestaan in de lijst', () => {
  const src = fs.readFileSync(new URL('../game/js/achievements.js', import.meta.url), 'utf8');
  assert.match(src, /id: 'voetbal_winst'/); assert.match(src, /id: 'voetbal_hattrick'/);
});

// ---------------------------------------------------------------- HUD en teksten
t('de HUD-strook: één stap actief, één primaire waarde, toetsen als token, alleen ds-tokens, de uitleg bij de aftrap', () => {
  const g = { fase: 'spel', helft: 1, klok: 75, score: [1, 0], namen: ['Stadjers', 'Hunebedders'], bezitTeam: 0, heeftBal: true, rol: 'veld', laad: 0, stamina: 0.6, moe: false, eigen: 1, bezit: [30, 20], uitleg: false };
  const m = voetbalHudModel(g);
  assert.equal(m.stappen.length, STEPS.length); assert.equal(m.stappen.filter((s) => s.stand === 'nu').length, 1); assert.equal(m.stappen.find((s) => s.stand === 'nu').label, 'Aanvallen');
  assert.equal(m.cijfers.filter((c) => c.primair).length, 1); assert.ok(m.cijfers.every((c) => c.icoon)); assert.match(m.nu, /{F}/);
  assert.equal(voetbalHudModel({ ...g, bezitTeam: 1, heeftBal: false }).stappen.find((s) => s.stand === 'nu').label, 'Verdedigen');
  assert.equal(voetbalHudModel({ ...g, fase: 'hervat', hervat: 'hoek' }).stappen.find((s) => s.stand === 'nu').label, 'Herstart');
  assert.equal(voetbalHudModel({ ...g, uitleg: true }).uitleg.length, 0, 'de uitleg staat bij een herstart'); assert.equal(voetbalHudModel({ ...g, uitleg: true, fase: 'aftrap' }).uitleg.length, UITLEG.length);
  assert.ok(UITLEG.length >= 2 && UITLEG.length <= 4); for (const u of UITLEG) assert.ok(u.tekst.split(/\s+/).length <= 8 && !/[{}]/.test(u.tekst) && !/shift|ctrl|spatie|\bQ\b|\bF\b|\bE\b/i.test(u.tekst), `geen ruwe toets in: ${u.tekst}`);
  const html = simHudHtml(voetbalHudModel({ ...g, uitleg: true, fase: 'aftrap' }));
  assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html), 'alleen ds-tokens'); assert.match(html, /role="progressbar"/); assert.ok(!/\{[A-Z]+\}/.test(html), 'toetsplaatjes, geen accolades');
  // de uitleg toont op een controller de knoppen van de voetbalindeling, niet die van het lopen
  const um = uitlegModel(UITLEG, { id: 'voetbal', controller: 'voetbal' });
  assert.deepEqual([padSlotFor('F', 'voetbal'), padSlotFor('E', 'voetbal'), padSlotFor('SPACE', 'voetbal'), padSlotFor('CTRL', 'voetbal'), padSlotFor('Q', 'voetbal'), padSlotFor('SHIFT', 'voetbal'), padSlotFor('WASD', 'voetbal')], ['a', 'b', 'x', 'lb', 'y', 'lt', 'lstick']);
  assert.ok(um && um.stappen.length === 4 && um.stappen.every((s) => s.varianten.every((v) => v.controller)), 'elke toets heeft een knop op de controller');
  assert.equal(voetbalHudModel(g).controller, 'voetbal');
  assert.equal(voetbalHudModel(null), null);
  assert.match(watNu({ ...g, laad: 0.5, heeftBal: true }), /50%/); assert.match(watNu({ ...g, rol: 'keeper', heeftBal: false }), /duik/); assert.match(watNu({ ...g, fase: 'rust' }), /Rust/);
  assert.equal(voetbalHudModel({ ...g, moe: true, stamina: 0 }).meter.staat, 'laag');
});
t('het bord: de stand en de klok, de krachtmeter alleen tijdens het laden, en de flits van een doelpunt', () => {
  const g = { fase: 'spel', helft: 2, klok: 61, score: [2, 1], namen: ['Stadjers', 'Hunebedders'], laad: 0, tekst: '' };
  const b = voetbalBoard(g); assert.match(b.row, /Stadjers <b>2<\/b>/); assert.match(b.row, /<b>1<\/b> Hunebedders/); assert.match(b.row, /Tweede helft/); assert.match(b.row, /1:01/); assert.equal(b.meter, null);
  assert.ok(voetbalBoard({ ...g, laad: 0.4 }).meter.v === 0.4); assert.match(voetbalBoard({ ...g, fase: 'goal', tekst: 'GOAL! Stadjers 3-1' }).flash, /GOAL/); assert.match(voetbalBoard({ ...g, fase: 'rust' }).row, /rust/);
  assert.equal(clockText(0), '0:00'); assert.equal(clockText(89.2), '1:30');
  assert.equal(popVan({ type: 'goal', team: 0 }, 0).geluid, 'ui_verzameld'); assert.equal(popVan({ type: 'goal', team: 1 }, 0).geluid, null); assert.equal(popVan({ type: 'onbekend' }), null);
});
t('de teksten: verzonnen namen, Nederlands, elke soort heeft regels, geen echte clubs of merken', () => {
  for (const [k, lijst] of Object.entries(VOETBAL_LINES)) { if (typeof lijst === 'string') continue; assert.ok(lijst.length >= 1 && lijst.every((s) => s.length > 8), k); }
  const alles = [JSON.stringify(VOETBAL_LINES), JSON.stringify(TEAMS.map((x) => x.naam)), JSON.stringify(UITLEG)].join(' ');
  assert.ok(!/\b(FIFA|EA Sports|Ajax|Feyenoord|PSV|Heerenveen|FC Groningen|Messi|Ronaldo|Oranje|Adidas|Nike|Puma)\b/i.test(alles), 'geen echte merken, clubs of spelers');
  assert.ok(/Oma Trijntje/.test(alles)); assert.ok(TEAMS.length >= 4 && new Set(TEAMS.map((x) => x.shirt)).size === TEAMS.length, 'verzonnen teams met eigen kleuren');
  assert.ok(!/de Grunn\b/.test(alles));
});
t('de aansluiting op Tessa is een dunne laag: zonder haak neutraal, met haak bonus per speler en wissel terug aan het einde', () => {
  wisKarakterHaken();
  assert.deepEqual(voetbalBonusVan('anita'), { sprint: 1, schot: 1, aanname: 1 }); assert.equal(characterEnter({}, 'voetbal'), null); assert.equal(tessaLine('viering'), null); karakterEind({}, null);
  const log = [];
  zetVoetbalKarakterHaken({ bonus: () => ({ sprint: 1.06, schot: 1.08, aanname: 1.1 }), voorActiviteit: (id) => ({ start: () => { log.push('start ' + id); return 1; }, eind: () => log.push('eind') }), regels: { viering: ['Tessa: kijk eens aan.'] } });
  const bon = characterEnter({}, 'voetbal'); karakterEind({}, bon); assert.deepEqual(log, ['start voetbal', 'eind']);
  assert.equal(tessaLine('viering', () => 0), 'Tessa: kijk eens aan.');
  const b = voetbalBonusVan('anita'); assert.equal(b.sprint, 1.06);
  // de bonus werkt in de sim: sprint, schotspreiding en aanname
  const run = (bonus) => { const m = makeMatch([{ slot: 0, naam: 'T', bonus }], { seed: 61 }); tot(m, 'spel', 30); const p = m.spelers[m.mensen[0].ctl]; m.mensen[0].autoT = 1e9; m.bal.owner = -1; zetBal(m.bal, 11, 11); p.x = -5; p.y = -10; p.vx = p.vy = 0; p.stamina = 1; stap(m, 1.5, () => ({ mx: 0, my: -1, buttons: KNOP.SPRINT })); return p.y; };
  assert.ok(run({ sprint: 1.06 }) > run(undefined), 'Tessa sprint harder');
  zetVoetbalKarakterHaken({ bonus: null, voorActiviteit: () => { throw new Error('kapot'); }, regels: null });
  assert.equal(characterEnter({}, 'voetbal'), null, 'een kapotte haak stopt de wedstrijd niet'); wisKarakterHaken();
});
t('de wedstrijd is een live wedstrijd van het bestaande kader, geen nieuw protocol', () => {
  const src = fs.readFileSync(new URL('../game/js/voetbal.js', import.meta.url), 'utf8');
  assert.match(src, /registreerWedstrijd\('voetbal', \{[^}]*soort: 'live'/); assert.match(src, /zetWedGastHaken\('voetbal'/); assert.match(src, /wedLiveTik/);
  const proto = fs.readFileSync(new URL('../game/js/net/protocol.js', import.meta.url), 'utf8'); assert.ok(!/voetbal/i.test(proto), 'het netwerkprotocol blijft ongewijzigd');
  assert.ok(FASEN.includes('goal') && FASEN.includes('rust'));
});

t('robuust: drie mensen met willekeurige invoer spelen een hele wedstrijd uit, zonder NaN, buiten het veld of vastlopers', () => {
  const rng = makeRng(77), m = makeMatch([mens(0), mens(1), mens(2)], { duur: 'kort', seed: 77 });
  const toets = [0, 0, 0]; let ev = [];
  const inv = (slot) => { if (rng() < 0.06) toets[slot] = Math.floor(rng() * 256) & ~(16 | 32); return { mx: Math.sin(m.tijd * 0.7 + slot * 2) * (rng() < 0.9 ? 1 : 0), my: Math.cos(m.tijd * 0.5 + slot) , buttons: toets[slot] }; };
  for (let i = 0; i < 400 / DT && m.fase !== 'klaar'; i++) {
    ev.push(...tikWedstrijd(m, DT, inv));
    for (const p of m.spelers) assert.ok([p.x, p.y, p.vx, p.vy, p.stamina].every(Number.isFinite) && Math.abs(p.x) <= 13.01 && Math.abs(p.y) <= 21.01);
    assert.ok([m.bal.x, m.bal.y, m.bal.z].every(Number.isFinite));
    assert.ok(new Set(m.mensen.map((x) => x.ctl)).size === 3);
  }
  assert.equal(m.fase, 'klaar'); assert.ok(ev.some((e) => e.type === 'schop'), 'er is gespeeld');
});

// ---------------------------------------------------------------- het volledige veld: elf tegen elf, tactiek en competitie
t('de formaten: klein en groot, elke vorming heeft precies een keeper en het juiste aantal spelers, binnen het veld', () => {
  assert.equal(FORMATEN.klein.n, 5); assert.equal(FORMATEN.groot.n, 11);
  for (const f of ['klein', 'groot']) {
    assert.equal(zetFormaat(f), f);
    for (const naam of formationNames(f)) {
      const lijst = formationList(f, naam);
      assert.equal(lijst.length, FORMATEN[f].n, `${f} ${naam}`); assert.equal(lijst.filter((x) => x.rol === 'keeper').length, 1); assert.equal(lijst[0].rol, 'keeper');
      if (f === 'groot') assert.equal(+naam[0] + +naam[2] + +naam[4], 10, `${naam} heeft tien veldspelers`);
      for (const team of [0, 1]) for (const bal of [{ x: 0, y: 0 }, { x: 9, y: PITCH.L / 2 - 2 }, { x: -9, y: -PITCH.L / 2 + 2 }]) for (const stijl of STIJLEN) {
        lijst.forEach((_, i) => { const pl = formationSpot(team, i, bal, true, false, { lijst, stijl }); assert.ok(Math.abs(pl.x) <= PITCH.B / 2 && Math.abs(pl.y) <= PITCH.L / 2, `${f} ${naam} ${i}`); });
      }
    }
  }
  zetFormaat('groot'); assert.equal(PITCH.L, 90); assert.equal(PITCH.DOEL_B, 7.32); zetFormaat('klein'); assert.equal(PITCH.L, 42);
  assert.equal(cleanFormaat('x'), 'klein'); assert.equal(cleanFormation('groot', '9-9-9'), '4-4-2'); assert.equal(cleanStijl('?'), 'evenwichtig');
});
t('de speelstijl bepaalt de diepte van de lijnen en het aantal spelers dat druk zet', () => {
  zetFormaat('groot');
  const lijst = formationList('groot', '4-4-2'), dr = (stijl) => formationSpot(0, 5, { x: 0, y: 0 }, false, false, { lijst, stijl }).y, aan = (stijl) => formationSpot(0, 9, { x: 0, y: 0 }, false, false, { lijst, stijl }).y;
  assert.ok(dr('verdedigend') < dr('evenwichtig') && dr('evenwichtig') < dr('aanvallend') && aan('verdedigend') < aan('aanvallend'));
  assert.ok(drukZetters('verdedigend') < drukZetters('evenwichtig') && drukZetters('evenwichtig') < drukZetters('aanvallend'));
  zetFormaat('klein'); assert.ok(drukZetters('evenwichtig') < 3 && drukZetters('aanvallend') <= 3);
});
t('elf tegen elf: tweeëntwintig spelers, een eigen keeper per team, vier mensen op veldspelers, een hele wedstrijd tot het einde', () => {
  const m = makeMatch([mens(0), mens(1), mens(2), mens(3)], { duur: 'kort', seed: 12, formaat: 'groot', vorming: '4-3-3', stijl: 'aanvallend' });
  assert.equal(m.spelers.length, 22); assert.equal(m.formaat, 'groot'); assert.deepEqual(m.spelers.filter((p) => p.rol === 'keeper').map((p) => p.id), [0, 11]);
  assert.equal(new Set(m.mensen.map((x) => x.ctl)).size, 4); assert.ok(m.mensen.every((x) => m.spelers[x.ctl].rol !== 'keeper'));
  assert.equal(m.spelers[m.mensen[0].ctl].rol, 'aanvaller', 'de eerste mens krijgt een aanvaller');
  assert.equal(m.duurHelft, FORMATEN.groot.duren.kort); assert.equal(m.tac[0].vorming, '4-3-3'); assert.equal(m.tac[0].stijl, 'aanvallend');
  const rng = makeRng(3);
  for (let i = 0; i < 300 / DT && m.fase !== 'klaar'; i++) {
    tikWedstrijd(m, DT, (slot) => ({ mx: Math.sin(i / 20 + slot), my: -Math.cos(i / 31 + slot), buttons: rng() < 0.05 ? KNOP.SCHOT : rng() < 0.05 ? KNOP.PASS : 0 }));
    for (const p of m.spelers) assert.ok([p.x, p.y].every(Number.isFinite) && Math.abs(p.x) <= 28.01 && Math.abs(p.y) <= 45.01, `${p.naam} buiten`);
  }
  assert.equal(m.fase, 'klaar');
  assert.equal(PITCH.L, 90, 'het veld blijft dat van de wedstrijd');
  zetFormaat('klein');
});
t('elf tegen elf past in de momentopname: 64 getallen, heen en terug op 5 cm nauwkeurig, ook voor een gast', () => {
  const m = makeMatch([mens(0), mens(1)], { duur: 'kort', seed: 14, formaat: 'groot' });
  tot(m, 'spel', 60); stap(m, 4, (slot) => ({ mx: slot ? -1 : 1, my: -1, buttons: 0 }));
  const snap = snapVoetbal(m, 1); assert.equal(snap.d.length, 64); assert.ok(snap.d.every(Number.isFinite));
  const st = leesLiveVoetbal(JSON.parse(JSON.stringify(snap))); assert.ok(st && leesWed(snap));
  const start = leesWed(startEvent('voetbal', [{ slot: 0, naam: 'A' }, { slot: 1, naam: 'B' }], 0, { live: 1, v: 'k.s.1.g.4-3-3.a' }));
  const sp = makeFootballMirror(start, 1, { duur: 'kort', stand: 'standaard', tegenstander: 1, formaat: 'groot', vorming: '4-3-3', stijl: 'aanvallend' });
  assert.equal(sp.spelers.length, 22); assert.ok(voerInVoetbal(sp, st));
  for (let i = 0; i < 40; i++) tikVoetbalSpiegel(sp, DT);
  m.spelers.forEach((p, i) => { assert.ok(Math.abs(sp.spelers[i].x - p.x) < 0.06 && Math.abs(sp.spelers[i].y - p.y) < 0.06, `speler ${i}: ${sp.spelers[i].x} tegen ${p.x}`); });
  assert.equal(sp.mijnId, m.mensen[1].ctl);
  const klein = makeMatch([mens(0)], { seed: 1 }); zetFormaat('groot'); assert.equal(voerInVoetbal(sp, { ...snapVoetbal(klein, 2), f: 'lv', n: 5 }), false, 'een momentopname van een ander formaat telt niet');
  zetFormaat('klein');
  // de hoek en de flags blijven heel in het getal
  m.spelers[3].face = -2.5; m.spelers[3].tackleT = 0.2; m.spelers[3].vier = 1;
  voerInVoetbal(sp, leesLiveVoetbal(JSON.parse(JSON.stringify(snapVoetbal(m, 9)))));
  assert.ok(Math.abs(Math.cos(sp.spelers[3].face) - Math.cos(-2.5)) < 0.12 && sp.spelers[3].tackleT > 0 && sp.spelers[3].vier > 0);
});
t('tactiek tijdens de wedstrijd: een andere vorming verandert de rollen, een andere stijl de lijnen', () => {
  const m = makeMatch([mens()], { duur: 'kort', seed: 16, formaat: 'groot', vorming: '4-4-2' });
  const rol = (i) => m.spelers[i].rol;
  assert.equal([1, 2, 3, 4].every((i) => rol(i) === 'verdediger') && [5, 6, 7, 8].every((i) => rol(i) === 'middenvelder') && [9, 10].every((i) => rol(i) === 'aanvaller'), true);
  zetTactiek(m, 0, { vorming: '3-5-2', stijl: 'verdedigend' });
  assert.equal([1, 2, 3].every((i) => rol(i) === 'verdediger') && [4, 5, 6, 7, 8].every((i) => rol(i) === 'middenvelder'), true); assert.equal(m.tac[0].stijl, 'verdedigend'); assert.equal(m.spelers[11].rol, 'keeper');
  assert.equal(m.tac[1].vorming !== undefined, true, 'de tegenstander heeft ook een vorming');
  zetFormaat('klein');
});
t('de moeilijkheid en de balans op het grote veld: gemiddeld 2 tot 5 doelpunten, geen vastlopers', () => {
  let goals = 0;
  for (let s = 1; s <= 6; s++) { const r = speelWedstrijd(s, { duur: 'normaal', formaat: 'groot', stijl: s % 2 ? 'aanvallend' : 'verdedigend' }); assert.ok(r.eindigde, `wedstrijd ${s} eindigt`); assert.equal(r.nan, 0); assert.equal(r.buiten, 0); assert.equal(r.vast, 0); goals += r.goals; }
  assert.ok(goals / 6 >= 1 && goals / 6 <= 6, `gemiddeld ${goals / 6}`);
  zetFormaat('klein');
});
t('de competitie: een schema waarin elke club elke andere één keer speelt, punten, stand en een kampioen', () => {
  const sch = speelschema(); assert.equal(sch.length, 5); assert.ok(sch.every((r) => r.length === 3));
  const paren = new Set(); for (const r of sch) { const ids = r.flat(); assert.equal(new Set(ids).size, 6, 'elke ronde speelt iedereen één keer'); for (const [a, b] of r) paren.add([a, b].sort().join('-')); }
  assert.equal(paren.size, 15, 'ieder duel komt precies één keer voor');
  let c = newCompetition(5); assert.equal(c.ronde, 0); assert.equal(nextOpponent(c) !== MIJN_CLUB && nextOpponent(c) != null, true);
  const orig = JSON.stringify(c);
  for (let r = 0; r < 5; r++) { const tg = nextOpponent(c); assert.ok(tg && tg !== MIJN_CLUB, `ronde ${r} een tegenstander`); c = applyRound(c, 3, 0); assert.ok(Object.values(c.stand).every((x) => x.g === c.ronde)); }
  assert.equal(orig, JSON.stringify(newCompetition(5)), 'verwerkRonde laat de oude stand ongemoeid');
  assert.ok(c.klaar && c.kampioen === MIJN_CLUB && isKampioen(c), 'vijf keer 3-0 is kampioen'); assert.equal(yourRank(c), 1);
  const tb = tabel(c); assert.equal(tb.length, 6); assert.equal(tb[0].p, 15); assert.ok(tb.every((r, i) => i === 0 || tb[i - 1].p >= r.p)); assert.equal(nextOpponent(c), null); assert.equal(applyRound(c, 1, 1), c, 'een klaar seizoen verandert niet');
  let v = newCompetition(5); for (let r = 0; r < 5; r++) v = applyRound(v, 0, 2); assert.ok(!isKampioen(v) && yourRank(v) >= 5, 'vijf keer verliezen is geen kampioen');
  const punt = tabel(applyRound(newCompetition(5), 1, 1)).find((r) => r.id === MIJN_CLUB); assert.equal(punt.p, 1);
  assert.deepEqual(applyRound(newCompetition(9), 2, 2), applyRound(newCompetition(9), 2, 2), 'deterministisch');
  assert.deepEqual(simuleerDuel('hunebedders', 'wadlopers', makeRng(4)), simuleerDuel('hunebedders', 'wadlopers', makeRng(4)));
  // de opslag: heen en terug, en corrupt geeft null zonder iets stuk te maken
  const terug = leesCompetitie(JSON.parse(JSON.stringify(c))); assert.ok(terug && terug.klaar && terug.kampioen === MIJN_CLUB);
  for (const kapot of [null, 5, {}, { v: 1, ronde: 9, stand: {} }, { v: 1, ronde: 1, stand: { stadjers: { g: -1 } } }, { v: 2 }]) assert.equal(leesCompetitie(kapot), null);
  assert.ok(COMP_CLUBS.length === 6 && COMP_CLUBS.every((id) => TEAMS.some((tm) => tm.id === id)));
});
t('de voorkeur: formaat, vorming, stijl, modus en seizoen worden schoon gelezen, ook uit rommel', () => {
  const d = leesVoorkeur(null); assert.deepEqual([d.duur, d.formaat, d.vorming, d.stijl, d.modus, d.comp], ['normaal', 'klein', '2-2', 'evenwichtig', 'vriendschappelijk', null]);
  const g = leesVoorkeur(JSON.stringify({ duur: 'kort', formaat: 'groot', vorming: '4-3-3', stijl: 'aanvallend', modus: 'competitie', comp: { v: 1 } }));
  assert.deepEqual([g.duur, g.formaat, g.vorming, g.stijl, g.modus], ['kort', 'groot', '4-3-3', 'aanvallend', 'competitie']);
  const r = leesVoorkeur('{"formaat":"klein","vorming":"4-3-3","stijl":"gek","duur":3}'); assert.deepEqual([r.vorming, r.stijl, r.duur], ['2-2', 'evenwichtig', 'normaal'], 'een vorming van het andere formaat telt niet');
  assert.equal(leesVoorkeur('{kapot').formaat, 'klein');
});
t('de teksten en teams van het volledige veld zijn verzonnen: elf namen per team, zes clubs, geen echte namen', () => {
  assert.equal(NAMES_HOME.length, 11); assert.equal(NAMEN_UIT.length, 11); assert.equal(new Set([...NAMES_HOME, ...NAMEN_UIT]).size, 22);
  assert.equal(TEAMS.length, 6); assert.ok(!/\b(Ajax|Feyenoord|PSV|FC Groningen|Heerenveen|Oranje|Eredivisie|KNVB|UEFA|FIFA)\b/i.test(JSON.stringify([TEAMS, NAMES_HOME, NAMEN_UIT])));
});

// ---------------------------------------------------------------- bot-sim: een kleine reeks (de volle 100 draait scripts/voetbal_botsim.mjs)
t('bot-sim: tien wedstrijden computer tegen computer eindigen, zonder NaN, zonder vastlopers en met doelpunten', () => {
  let goals = 0;
  for (let s = 1; s <= 10; s++) { const r = speelWedstrijd(s, { duur: 'normaal' }); assert.ok(r.eindigde, `wedstrijd ${s} eindigt`); assert.equal(r.nan, 0); assert.equal(r.buiten, 0); assert.equal(r.vast, 0); goals += r.goals; }
  assert.ok(goals / 10 >= 1.5 && goals / 10 <= 5.5, `gemiddeld ${goals / 10} doelpunten`);
});

await Promise.all(wacht);
console.log(`voetbal_test ok (${n} groepen)`);
