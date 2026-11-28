// De gedeelde ontgrendelpoort (#1131): per akte opent precies wat erbij hoort, een nieuw spel begint dicht,
// een oude save houdt alles (migratieregel), dev opent alles, en de poort verliest nooit iets.
// node scripts/unlockgate_test.mjs
import fs from 'node:fs';
import {
  worldOpen, gateHint, openWorlds, newGate, stampGate, migrateGate, progressFrom, registerGateWorld, gateWorlds, gateWorld,
  resetGateRegistry, gateProblems, GATE_VERSION, PART_ORDER,
} from '../game/js/unlockgate.js';
import { STEPS, PARTS, LOOPBAAN_STAPPEN } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const at = (stepId, extra = {}) => progressFrom({ stepId, gate: newGate(), ...extra });

ok(gateProblems().length === 0, 'elke wereld wijst naar een bestaande akte', gateProblems().join());
ok(PART_ORDER.every((p) => PARTS[p]), 'PART_ORDER kent alleen bestaande akten');

// een nieuw spel: alles wat het verhaal nog niet noemt is dicht
const nieuw = at('M01');
ok(!worldOpen('farm', nieuw) && !worldOpen('bezit', nieuw) && !worldOpen('voetbal', nieuw), 'bij M01 zijn boerderij, panden en voetbal dicht');
ok(worldOpen('klus', nieuw) && worldOpen('taxi', nieuw) && worldOpen('padel', nieuw), 'akte 1 opent rijden en klussen');
ok(!worldOpen('vracht', nieuw) && !worldOpen('landbouw', nieuw), 'de vakken van akte 2 zijn in akte 1 nog dicht');

// per akte opent precies zijn werelden
for (const p of PART_ORDER) {
  const first = STEPS.find((s) => s.part === p);
  const pr = at(first.id);
  const verwacht = gateWorlds().filter((w) => PART_ORDER.indexOf(w.part) <= PART_ORDER.indexOf(p)).map((w) => w.id).sort().join();
  ok(openWorlds(pr).sort().join() === verwacht, `akte ${p}: precies de werelden tot en met die akte`);
}
ok(worldOpen('farm', at('M07')) && !worldOpen('bezit', at('M07')), 'akte 2: boerderij open, panden nog niet');
ok(worldOpen('bezit', at('M12')) && !worldOpen('voetbal', at('M12')), 'akte 3: panden en ondernemen open, voetbal nog niet');
ok(worldOpen('voetbal', at('M17')), 'akte 4: voetbal en regio open');
ok(!worldOpen('snackwagen', at('M21')) && worldOpen('snackwagen', at('F1')) && worldOpen('snackwagen', at('M22')), 'de snackwagen (eindspel) opent pas in akte 5, met de ontdekking F1');
ok(!!gateHint('snackwagen', at('M01')) && !/Tessa|Tammo|Oma|Trijntje|Berend|Tinus|Wubbo|Mem|Jelle|Lammert|Vismarkt|wagen/i.test(gateHint('snackwagen', at('M01'))) && gateHint('snackwagen', at('F1')) === null, 'de snackwagen: gesloten geeft een neutrale hint zonder namen of verklappers (#1378), open geen hint');

// de hint is een zin van een personage; open = geen hint
ok(/Sjabbe|Jelle/.test(gateHint('bezit', nieuw) || ''), 'een gesloten wereld geeft een hint met het personage');
ok(gateHint('klus', nieuw) === null, 'een open wereld geeft geen hint');
ok(gateWorlds().filter((w) => w.kind === 'loopbaan').every((w) => w.by && w.hint), 'elke loopbaan heeft een personage en een hint');
ok(LOOPBAAN_STAPPEN.flatMap((r) => r.loopbanen).every((v) => gateWorld(v)), 'elk vak uit de verhaaldata staat in de poort');

// voortgang van de speler opent altijd (migratie van wie al begon) en het verhaaleinde opent alles
ok(worldOpen('golf', { ...nieuw, begun: (id) => id === 'golf' }), 'een vak waar de speler al aan begon is open');
ok(openWorlds({ ...nieuw, ended: true }).length === gateWorlds().length, 'na het einde is alles open');
ok(openWorlds({ ...nieuw, dev: true }).length === gateWorlds().length, 'dev (devJumpTo, spelbot) opent alles');

// migratieregel: geen gate of een gemigreerde = alles open; een eigen gate wordt nooit overschreven
const oud = progressFrom({ stepId: 'M01', gate: undefined });
ok(openWorlds(oud).length === gateWorlds().length, 'een save zonder gate leest als alles open');
const mig = migrateGate({ money: 5, story: { done: ['M01'] } });
ok(mig.gate.v === GATE_VERSION && mig.gate.legacy === true && mig.gate.open.length === gateWorlds().length, 'migratie stempelt alles open');
ok(mig.money === 5 && mig.story.done[0] === 'M01', 'migratie raakt voortgang en geld niet aan');
ok(openWorlds(progressFrom({ stepId: 'M01', gate: mig.gate })).length === gateWorlds().length, 'een gemigreerde save blijft alles open');
const mig2 = migrateGate(mig);
ok(JSON.stringify(mig2.gate) === JSON.stringify(mig.gate), 'migreren is idempotent');
const eigen = { gate: newGate() };
ok(migrateGate(eigen) === eigen, 'een nieuwe gate wordt nooit overschreven');
ok(migrateGate(null).gate.legacy === true && migrateGate(undefined).gate.legacy === true, 'een lege save overleeft de migratie');

// de poort schrijft alleen een verzameling en verliest niets
let g = newGate();
g = stampGate(g, at('M07', { gate: g }));
ok(g.open.includes('farm') && g.open.includes('klus') && !g.open.includes('bezit'), 'stampGate legt vast wat open is');
const g2 = stampGate(g, progressFrom({ stepId: 'M01', gate: g }));
ok(g.open.every((id) => g2.open.includes(id)), 'een stap terug (devJumpTo) sluit niets die al open was');
ok(worldOpen('farm', progressFrom({ stepId: 'M01', gate: g2 })), 'een eenmaal geopende wereld blijft open');

// andere epics registreren hun wereld op dezelfde poort
registerGateWorld({ id: 'test-wereld', part: 'zuid', by: 'Iemand', hint: 'Vraag het iemand.' });
ok(!worldOpen('test-wereld', at('M10')) && worldOpen('test-wereld', at('M18')), 'een geregistreerde wereld volgt zijn akte');
let threw = false;
try { registerGateWorld({ id: 'x', part: 'nergens' }); } catch (e) { threw = true; }
ok(threw, 'een onbekende akte wordt geweigerd');
resetGateRegistry();
ok(!gateWorld('test-wereld'), 'de registratie is te resetten');
ok(worldOpen('onbekend-id', nieuw), 'een onbekende wereld sluit de poort nooit');

// per verhaalstap (doorlopend model): een wereld met atStep opent op die stap, niet aan het begin van zijn akte
{
  const kop = STEPS.filter((s) => s.part === 'kop');
  const laat = kop[kop.length - 1].id;
  ok(kop.length >= 2, 'akte 1 heeft meer dan een stap');
  registerGateWorld({ id: 'stap-wereld', part: 'kop', by: 'Iemand', hint: 'Vraag het iemand.', atStep: laat });
  ok(!worldOpen('stap-wereld', at(kop[0].id)) && worldOpen('stap-wereld', at(laat)), 'atStep: dicht op de eerste stap, open op de gekozen stap');
  ok(worldOpen('stap-wereld', at(STEPS[STEPS.length - 1].id)), 'atStep: een latere stap houdt hem open');
  ok(gateHint('stap-wereld', at(kop[0].id)) === 'Vraag het iemand.' && gateHint('stap-wereld', at(laat)) === null, 'atStep: hint alleen zolang hij dicht is');
  ok(worldOpen('stap-wereld', progressFrom({ stepId: kop[0].id, gate: undefined })) && worldOpen('stap-wereld', progressFrom({ stepId: kop[0].id, gate: { v: 1, legacy: true, open: [] } })), 'atStep: een save zonder of met gemigreerde poort heeft alles open');
  ok(worldOpen('stap-wereld', progressFrom({ stepId: kop[0].id, gate: newGate(), dev: true })), 'atStep: devJumpTo opent altijd');
  const g = stampGate(newGate(), at(laat));
  ok(worldOpen('stap-wereld', progressFrom({ stepId: kop[0].id, gate: g })), 'atStep: een eenmaal open wereld blijft open na een stap terug');
  let t = false; try { registerGateWorld({ id: 'y', part: 'kop', atStep: 'NOPE' }); } catch (e) { t = true; }
  ok(t, 'atStep: een onbekende stap wordt geweigerd');
  resetGateRegistry();
  ok(gateProblems().length === 0, 'na reset geen problemen');
}

// Samen spelen: de poort leest alleen de eigen voortgang die de aanroeper meegeeft (een gast in andermans wereld heeft zijn eigen akte)
{
  const host = progressFrom({ stepId: 'M20', gate: newGate() });
  const gast = progressFrom({ stepId: 'M03', gate: newGate() });
  ok(worldOpen('voetbal', host) && !worldOpen('voetbal', gast), 'host in akte 4 heeft voetbal open, de gast in akte 1 niet: elk zijn eigen poort');
  ok(worldOpen('voetbal', host) && !worldOpen('voetbal', gast) && worldOpen('voetbal', host), 'de volgorde van de aanroepen verandert niets (geen gedeelde staat)');
  const src = fs.readFileSync(new URL('../game/js/unlockgate.js', import.meta.url), 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  ok(!/world\.player|coop|localStorage|document\./.test(code), 'unlockgate.js raakt geen wereld, geen net en geen opslag');
  const stamp = stampGate(gast.gate, { ...gast, gate: gast.gate });
  ok(!stamp.open.includes('voetbal'), 'een gast die de host volgt, krijgt voetbal niet van de host');
}

console.log(`unlockgate_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
