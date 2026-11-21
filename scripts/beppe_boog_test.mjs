// De Beppe-verhaalboog (#1063): de fase van het huis (dicht, levend, herinnering) afgeleid uit de
// verhaalstand en de merken per save, de eerste ontmoeting met Tessa, de bezoeken terwijl ze leeft,
// het overlijden op de juiste stap, de herinnering erna en de echo's. Puur: leest
// game/js/beppe_boog_rules.js, beppe_boog_texts.js, beppe_visit_rules.js en de bron van de
// runtime-bestanden. Geen THREE, geen DOM, geen game/world.
// Draai: node scripts/beppe_boog_test.mjs
import { readFileSync } from 'node:fs';
import { STEPS } from '../game/js/storyarc.js';
import {
  STEP, MARK, MAX_VISIT_MARKS, MAX_ALIVE_VISITS, arcPhase, visitsDone, nextVisitMark, sceneOnEnter, nudgeDue, echoDue, createRunner,
  aliveVisit, pickMemory, memoryEligible, stepReached,
} from '../game/js/beppe_boog_rules.js';
import {
  FIRST_VISIT, FAREWELL_SCENE, NEWS, NUDGE, MEMORY, ECHOES, GREETING, GOODBYE, MEMORY_UI, NAME,
} from '../game/js/beppe_boog_texts.js';
import { BEATS, TIPS } from '../game/js/beppe_visit_texts.js';
import { ACT_ORDER, SOLIDS, SOLID_BEPPE, SPOTS, SPOT_R, keepInRoom, nearestSpot, ROOM } from '../game/js/beppe_visit_rules.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };
const read = (f) => readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const idx = (id) => STEPS.findIndex((s) => s.id === id);
const snapTo = (id) => ({ done: STEPS.slice(0, idx(id) + 1).map((s) => s.id), completed: [] });
const set = (...ids) => new Set(ids);
const visits = (k) => Array.from({ length: k }, (_, i) => MARK.visit(i + 1));

// --- de plekken in de verhaalketen -------------------------------------------------------------------
ok(idx(STEP.unlock) >= 0 && idx(STEP.nudge1) > idx(STEP.unlock) && idx(STEP.death) > idx(STEP.nudge1) && idx(STEP.deathFallback) > idx(STEP.death), 'ontgrendelen < wenk < overlijden < terugvaloptie, in de volgorde van het verhaal');
ok(STEPS[idx(STEP.death)].part === 'kop' && STEPS[idx(STEP.deathFallback)].part === 'romp', 'het overlijden valt op het eind van akte 1 (M06), de terugvaloptie in akte 2 (M08)');
ok(idx(STEP.death) - idx(STEP.unlock) >= 4, 'een paar missies tussen de uitnodiging en het overlijden', String(idx(STEP.death) - idx(STEP.unlock)));
ok(ECHOES.every((e) => idx(e.step) > idx(STEP.deathFallback)), 'de echo\'s komen na het overlijden in het verhaal');

ok(MAX_ALIVE_VISITS === 3, 'Beppe is er voor twee of drie bezoeken');
// --- de fase ------------------------------------------------------------------------------------------------
{
  const none = { done: [], completed: [] };
  ok(arcPhase(none, set()) === 'dicht' && arcPhase(null, null) === 'dicht', 'nieuw spel: dicht');
  ok(arcPhase(snapTo('M00'), set()) === 'dicht', 'na de opening: dicht');
  ok(arcPhase(snapTo('M01'), set()) === 'levend', 'na M01: Beppe leeft, het huis is open');
  ok(arcPhase(snapTo('M05'), set()) === 'levend', 'M05: levend');
  ok(arcPhase(snapTo('M06'), set()) === 'levend', 'M06 klaar maar nooit bij haar geweest: ze leeft nog (ze sterft niet voor je haar kent)');
  ok(arcPhase(snapTo('M06'), set(MARK.first, ...visits(1))) === 'levend', 'M06 klaar en één keer geweest: nog levend (niet meteen na de eerste ontmoeting)');
  ok(arcPhase(snapTo('M06'), set(MARK.first, ...visits(2))) === 'herinnering', 'M06 klaar, kennismaking en twee bezoeken: de herinnering');
  ok(arcPhase(snapTo('M03'), set(MARK.first, ...visits(3))) === 'levend', 'voor M04 sterft ze niet, hoe vaak je ook komt');
  ok(arcPhase(snapTo('M04'), set(MARK.first, ...visits(2))) === 'levend', 'M04 met twee bezoeken: nog levend');
  ok(arcPhase(snapTo('M04'), set(MARK.first, ...visits(3))) === 'herinnering', 'drie bezoeken (de ontmoeting en twee korte) en M04: het afscheid komt, ze blijft niet eindeloos');
  ok(arcPhase(snapTo('M05'), set(MARK.first, ...visits(1))) === 'levend', 'na één bezoek nooit meteen het afscheid');
  ok(arcPhase(snapTo('M07'), set(MARK.first, ...visits(2))) === 'herinnering', 'M07: met twee bezoeken de herinnering');
  ok(arcPhase(snapTo('M08'), set()) === 'herinnering', 'M08 klaar zonder ooit te komen: het verhaal moet door, de herinnering');
  ok(arcPhase(snapTo('M20'), set()) === 'herinnering' && arcPhase(snapTo('E'), set()) === 'herinnering', 'een save ver in het verhaal: direct de herinnering');
  // een oude save: geen merken, ver voorbij het overlijden
  ok(arcPhase({ done: ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09'], completed: [] }, undefined) === 'herinnering', 'een bestaande save voorbij het overlijden: herinnering, zonder migratie');
  ok(arcPhase({ done: ['M00', 'M01', 'M02'], completed: [] }, undefined) === 'levend', 'een bestaande save tussen uitnodiging en overlijden: de levende variant');
  ok(arcPhase({ done: ['M00'], completed: [] }, undefined) === 'dicht', 'een bestaande save voor M01: dicht');
  // de fase wordt nooit minder: elke verhaalstap verder geeft dezelfde of een latere fase
  const rank = { dicht: 0, levend: 1, herinnering: 2 };
  const marks = set(MARK.first, ...visits(2));
  let prev = 0, mono = true;
  for (const s of STEPS) { const r = rank[arcPhase(snapTo(s.id), marks)]; if (r < prev) mono = false; prev = r; }
  ok(mono, 'de fase gaat met het verhaal alleen vooruit');
  ok(stepReached({ done: ['M03'] }, 'M01') && !stepReached({ done: ['M01'] }, 'M03'), 'stepReached: een latere stap telt voor een eerdere');
}

// --- de merken, het bezoek en de scènes --------------------------------------------------------------------
{
  ok(visitsDone(set()) === 0 && visitsDone(null) === 0, 'geen bezoeken');
  ok(visitsDone(set(MARK.visit(1))) === 1 && visitsDone(set(...visits(MAX_VISIT_MARKS))) === MAX_VISIT_MARKS, 'bezoeken tellen tot het maximum');
  ok(nextVisitMark(set()) === MARK.visit(1) && nextVisitMark(set(MARK.visit(1))) === MARK.visit(2) && nextVisitMark(set(...visits(MAX_VISIT_MARKS))) === null, 'het volgende bezoekmerk, nooit boven het maximum');
  ok(sceneOnEnter('levend', set()) === 'eerste', 'eerste keer binnen: de ontmoeting (met Tessa)');
  ok(sceneOnEnter('levend', set(MARK.first)) === null, 'de ontmoeting speelt maar één keer');
  ok(sceneOnEnter('herinnering', set(MARK.first)) === 'afscheid', 'de eerste keer na het overlijden: het afscheid');
  ok(sceneOnEnter('herinnering', set(MARK.first, MARK.farewell)) === null, 'het afscheid speelt maar één keer');
  ok(sceneOnEnter('dicht', set()) === null, 'dicht: geen scène');
  // een save die midden in de scène werd geladen: het merk staat er niet, dus de scène begint opnieuw
  ok(sceneOnEnter('levend', set(MARK.visit(1))) === 'eerste', 'opslaan en laden midden in de ontmoeting: de scène speelt opnieuw (het merk komt pas aan het eind)');
  // de wenken
  ok(nudgeDue(snapTo('M02'), set(), 'levend') === null, 'voor M03 geen wenk');
  ok(nudgeDue(snapTo('M03'), set(), 'levend') && nudgeDue(snapTo('M03'), set(), 'levend').key === MARK.nudge(1), 'na M03 zonder bezoek: de eerste wenk');
  ok(nudgeDue(snapTo('M03'), set(MARK.nudge(1)), 'levend') === null, 'de wenk komt één keer');
  ok(nudgeDue(snapTo('M03'), set(...visits(1)), 'levend') === null, 'wie al geweest is krijgt de eerste wenk niet');
  ok(nudgeDue(snapTo('M06'), set(MARK.nudge(1), ...visits(1)), 'levend') && nudgeDue(snapTo('M06'), set(MARK.nudge(1), ...visits(1)), 'levend').key === MARK.nudge(2), 'na M06 met één bezoek: de tweede wenk');
  ok(nudgeDue(snapTo('M06'), set(MARK.nudge(1), ...visits(2)), 'levend') === null, 'wie twee keer was heeft geen wenk nodig');
  ok(nudgeDue(snapTo('M06'), set(), 'herinnering') === null && nudgeDue(snapTo('M06'), set(), 'dicht') === null, 'alleen terwijl ze leeft');
  // de echo's
  ok(echoDue(snapTo('M08'), set(), 'herinnering') === null, 'geen echo voor zijn stap');
  const e1 = echoDue(snapTo('M09'), set(), 'herinnering');
  ok(e1 && e1.id === 'e-m09', 'de eerste echo na M09');
  ok(echoDue(snapTo('M09'), set(MARK.echo('e-m09')), 'herinnering') === null, 'een echo komt één keer');
  ok(echoDue(snapTo('M09'), set(), 'levend') === null, 'geen echo terwijl ze leeft');
  ok(ECHOES.length <= 3, 'zeer sporadisch: hooguit drie echo\'s in het hele verhaal');
}

// --- de ontmoeting met Tessa -------------------------------------------------------------------------
{
  const text = FIRST_VISIT.map((b) => (b.text || '') + (b.choice ? b.choice.map((c) => c.label + c.reply.map((r) => r.text).join('')).join('') : '')).join(' ');
  ok(FIRST_VISIT.some((b) => b.who === 'beppe' && /Jullie zijn vrienden/.test(b.text || '')), 'Beppe zegt dat Tammo en Tessa vrienden zijn');
  ok(FIRST_VISIT.some((b) => b.who === 'tessa') && FIRST_VISIT.some((b) => b.who === 'tammo'), 'Tessa en Tammo reageren');
  ok(FIRST_VISIT.some((b) => b.who === '' && /Tammo kijkt naar zijn schoenen/.test(b.text || '')), 'Tammo is verlegen');
  ok(FIRST_VISIT.some((b) => b.who === 'beppe' && /Waar kom jij vandaan/.test(b.text || '')), 'Beppe vraagt waar Tessa vandaan komt');
  ok(/koe|koeien|boerderij|platteland/.test(text), 'ze klikken over koeien en het platteland (Tessa komt van het platteland, OPENING-BIJBEL)');
  ok(/zijn opa/.test(text) && !/Oma Trijntje/.test(text), 'Beppe is Tammo\'s oma, niet Oma Trijntje');
  ok(FIRST_VISIT.some((b) => b.who === 'beppe' && /soep/.test(b.text || '')) && FIRST_VISIT.some((b) => b.who === '' && /armen om Tammo/.test(b.text || '')), 'de soep en de knuffel zijn er');
  // elke keuze komt bij het einde, in welke volgorde ook
  const choices = FIRST_VISIT.find((b) => b.choice).choice;
  ok(choices.length === 3 && choices.every((c) => c.label && Array.isArray(c.reply) && c.reply.length >= 1), 'drie keuzes met elk een antwoord van Beppe');
  for (let pick = 0; pick < choices.length; pick++) {
    const r = createRunner(FIRST_VISIT);
    let steps = 0, whoSpoke = new Set();
    while (!r.done && steps++ < 100) {
      const b = r.current();
      if (b.choice) r.choose(pick); else { whoSpoke.add(b.who); r.advance(); }
    }
    ok(r.done && steps < 100, `keuze ${pick + 1} loopt tot het einde`, String(steps));
    ok(['beppe', 'tessa', 'tammo', ''].every((k) => whoSpoke.has(k)), `keuze ${pick + 1}: alle stemmen komen aan het woord`);
  }
  const r = createRunner(FIRST_VISIT);
  ok(!r.advance() === (r.isChoice()), 'een keuze wacht op een antwoord (advance doet niets)');
  const r2 = createRunner([]);
  ok(r2.done && !r2.advance() && !r2.choose(0), 'een lege scène is meteen klaar');
}

// --- de teksten: warm, zonder getoond leed -----------------------------------------------------------
{
  const beats = [...FIRST_VISIT.flatMap((b) => (b.choice ? b.choice.flatMap((c) => [{ text: c.label }, ...c.reply]) : [b])), ...FAREWELL_SCENE];
  for (const b of beats) {
    ok(typeof b.text === 'string' && b.text.length >= 3 && b.text.length <= 260, 'een korte regel', String(b.text && b.text.slice(0, 30)));
    if ('who' in b) ok(b.who in NAME, 'bekende spreker', b.who);
    ok(!/[–—]/.test(b.text), 'geen gedachtestreep', b.text.slice(0, 30));
    ok(!/Albert Heijn|Jumbo|McDonald|Google/i.test(b.text), 'geen echte merken');
  }
  ok(FIRST_VISIT.filter((b) => b.who === 'beppe').length >= 6, 'Beppe heeft in de ontmoeting het meeste woord');
  // de dood: nooit getoond, nooit een grap
  const sober = [NEWS.text, NEWS.card.title, NEWS.card.body, ...FAREWELL_SCENE.map((b) => b.text), ...MEMORY.map((m) => m.text), ...ECHOES.map((e) => e.text), MEMORY_UI.stove, NUDGE.first.text, NUDGE.second.text].join(' ');
  ok(!/\b(lijk|bloed|kist|ziekenhuis|kanker|stervende|begraven|doodsstrijd|gore)\b/i.test(sober), 'geen lijk, geen medisch beeld, geen leed in beeld');
  ok(!/!/.test([NEWS.text, ...FAREWELL_SCENE.map((b) => b.text)].join(' ')), 'het nieuws en het afscheid zijn rustig: geen uitroepen');
  ok(/rustig ingeslapen/.test(NEWS.text), 'het nieuws is een rustig bericht');
  ok(FAREWELL_SCENE.every((b) => !/haha|grap|lol/i.test(b.text)), 'geen grap over haar dood');
  // terwijl ze leeft is er nergens sprake van overlijden of herinnering
  const living = [...FIRST_VISIT.flatMap((b) => (b.choice ? b.choice.flatMap((c) => c.reply) : [b])).map((b) => b.text), ...BEATS.map((b) => b.text), ...TIPS.map((t) => t.text), ...GREETING.second, ...GREETING.often, ...GREETING.askTessa, ...GREETING.askTammo, ...GOODBYE, NUDGE.first.text, NUDGE.second.text].join(' ');
  ok(!/overleden|in herinnering|hemel|gestorven|ingeslapen/i.test(living), 'terwijl ze leeft staat er niets over haar dood');
  ok(!/Oma Trijntje/.test(living + sober), 'Beppe en Oma Trijntje worden nergens verward');
  ok(![NEWS.text, ...ECHOES.map((e) => e.text)].some((t) => /Mam\b/.test(t)), 'geen onbekende familie als Mam (Mam is Tessa\'s moeder)');
}

// --- de bezoeken terwijl ze leeft ---------------------------------------------------------------------
{
  const ctx = { act: 'kop', who: 'tammo', time: 'middag', rain: false };
  for (let visit = 1; visit <= 8; visit++) {
    const beats = aliveVisit(ctx, { day: visit * 2, visit });
    ok(beats.length >= 3 && beats.length <= 4, `bezoek ${visit}: een paar korte regels`, String(beats.length));
    ok(beats.every((b) => b.who === 'beppe' && b.text.length < 200), `bezoek ${visit}: alles is van Beppe en kort`);
    ok(JSON.stringify(beats) === JSON.stringify(aliveVisit(ctx, { day: visit * 2, visit })), `bezoek ${visit}: herhaalbaar`);
  }
  const asTammo = new Set(), asTessa = new Set();
  for (let v = 1; v < 12; v += 2) { asTammo.add(aliveVisit({ ...ctx, who: 'tammo' }, { day: v, visit: v })[0].text); asTessa.add(aliveVisit({ ...ctx, who: 'anita' }, { day: v, visit: v })[0].text); }
  ok([...asTammo].some((t) => /Tessa/.test(t)) && [...asTessa].some((t) => /Tammo|jongen/.test(t)), 'als Tammo vraagt ze naar Tessa, als Tessa naar Tammo (ze onthoudt wie er is)');
  ok(new Set(Array.from({ length: 12 }, (_, v) => aliveVisit(ctx, { day: v, visit: v + 1 }).map((b) => b.text).join('|'))).size >= 8, 'afwisseling over de bezoeken');
  // nooit vooruit in het verhaal: een bezoek in akte 1 noemt niets uit akte 2 of later
  const early = new Set();
  for (let v = 0; v < 30; v++) for (const who of ['tammo', 'anita']) for (const b of aliveVisit({ act: 'kop', who, time: 'avond', rain: v % 2 === 0 }, { day: v, visit: v })) if (b.id) early.add(b.id);
  const later = new Set([...BEATS, ...TIPS].filter((b) => ACT_ORDER.indexOf(b.act) > 0).map((b) => b.id));
  ok([...early].every((id) => !later.has(id)), 'een bezoek in akte 1 spoilt niets uit een latere akte');
}

// --- de herinnering ---------------------------------------------------------------------------------------
{
  const ids = new Set();
  for (const m of MEMORY) { ok(!ids.has(m.id) && ACT_ORDER.includes(m.act), `herinneringsbriefje ${m.id}`); ids.add(m.id); ok(m.text.length >= 20 && m.text.length <= 160, `${m.id}: kort`); }
  for (const act of ACT_ORDER) {
    ok(memoryEligible({ act, who: '', time: '', rain: false }).length >= 1, `${act}: er is minstens één herinneringsbriefje`);
    const seen = new Set();
    for (let v = 0; v < 40; v++) for (const who of ['tammo', 'anita', '']) {
      const m = pickMemory({ act, who, time: v % 2 ? 'avond' : 'ochtend', rain: v % 3 === 0 }, { day: v, visit: v });
      ok(!!m && ACT_ORDER.indexOf(m.act) <= ACT_ORDER.indexOf(act), `${act}: herinneringsbriefje ${m && m.id} loopt niet vooruit`);
      if (m) seen.add(m.id);
    }
    ok(seen.size >= 2, `${act}: afwisseling in de herinnering`, String(seen.size));
  }
}

// --- de kamer met en zonder Beppe ----------------------------------------------------------------------
{
  const solidsAlive = [...SOLIDS, SOLID_BEPPE];
  const step = 0.1;
  const free = (x, z, solids) => { const q = keepInRoom(x, z, 0.32, solids === solidsAlive ? [SOLID_BEPPE] : []); return Math.hypot(q.lx - x, q.lz - z) < 1e-6; };
  const stand = { stove: [-1.5, 1.6], table: [0, -0.6], board: [-0.4, -2.4], door: [1.9, 0] };
  for (const solids of [SOLIDS, solidsAlive]) {
    const key = (x, z) => `${Math.round(x / step)}|${Math.round(z / step)}`;
    const seen = new Set([key(SPOTS.enter.x, SPOTS.enter.z)]);
    const q = [[SPOTS.enter.x, SPOTS.enter.z]];
    ok(free(SPOTS.enter.x, SPOTS.enter.z, solids), 'de plek na het binnenkomen is vrij');
    while (q.length) {
      const [x, z] = q.pop();
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx, nz = z + dz, kk = key(nx, nz);
        if (seen.has(kk) || !free(nx, nz, solids)) continue;
        seen.add(kk); q.push([nx, nz]);
      }
    }
    const label = solids === solidsAlive ? 'met Beppe' : 'zonder Beppe';
    for (const [k, [x, z]] of Object.entries(stand)) {
      ok(seen.has(key(x, z)), `${label}: ${k} is te voet te bereiken`);
      ok(nearestSpot(x, z) === k, `${label}: ${k} hoort bij ${k}`, String(nearestSpot(x, z)));
    }
    ok(seen.size > 250, `${label}: genoeg vloer`, String(seen.size));
  }
  // Beppe staat in de kamer, niet in de muur of op de plek van de speler
  ok(SOLID_BEPPE[0] > -ROOM.hw && SOLID_BEPPE[2] < ROOM.hw && SOLID_BEPPE[1] > -ROOM.hd && SOLID_BEPPE[3] < ROOM.hd, 'Beppe staat binnen de wanden');
  ok(Math.hypot((SOLID_BEPPE[0] + SOLID_BEPPE[2]) / 2 - SPOTS.table.x, (SOLID_BEPPE[1] + SOLID_BEPPE[3]) / 2 - SPOTS.table.z) <= SPOT_R + 0.2, 'Beppe staat binnen het praatbereik van de tafel');
  { const q = keepInRoom(NaN, Infinity); ok(Number.isFinite(q.lx) && Number.isFinite(q.lz) && Math.abs(q.lx) <= ROOM.hw, 'een NaN-positie geeft een eindige plek in de kamer'); }
}

// --- de bedrading ---------------------------------------------------------------------------------------
{
  const ach = read('achievements.js');
  ok(/beppe: \[\.\.\.getSaveSet\('beppe'\)\]/.test(ach) && /d\.beppe/.test(ach) && /beppe: new Set\(\)/.test(ach), 'de merken van het verhaal staan per save in de prestatiegegevens van de save');
  ok(!/beppe/i.test(read('savemigrate.js')), 'geen migratie in de opslag nodig');
  const boog = read('beppe_boog.js');
  ok(/getSaveSet\(MARK\.set\)/.test(boog) && /addToSaveSet/.test(boog), 'de merken zijn per save, niet per apparaat');
  ok(/GRACE_S/.test(boog) && /MARK\.farewell\)\) \{\s*\n?\s*if \(now - firstAt/.test(boog), 'een save die al voorbij het overlijden is zet zijn merken stil (geen nieuws, geen afscheid)');
  ok(/seen !== 'herinnering'/.test(boog), 'het nieuws komt alleen als het overlijden tijdens het spel gebeurt');
  const binnen = read('beppe_binnen.js');
  ok(/openDialogue/.test(binnen) && /mark\(ww, markId\)/.test(binnen), 'de scène zet haar merk pas aan het eind (opslaan en laden midden in de scène speelt hem opnieuw)');
  ok(/visitStatus\(\)\.phase === 'herinnering'/.test(binnen), 'het huis kent de levende en de herinneringsvariant');
  const garden = read('beppe_garden.js');
  ok(/visitStatus\(\)\.phase === 'herinnering' && !hasUnique/.test(garden), 'de herinneringskaart van het bankje hoort bij de herinneringsfase');
  const gesprek = read('beppe_gesprek.js');
  ok(/'1', '2', '3'/.test(gesprek) && /minigameUntil/.test(gesprek), 'het gesprek wordt met 1, 2, 3 beantwoord zonder wapenwissel');
  ok(!/Math\.random|localStorage/.test(boog + binnen + gesprek), 'geen toeval en geen eigen opslag');
}

console.log(bad ? `beppe_boog_test: ${bad} van ${n} mislukt` : `beppe_boog_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
