// Compat-suite, deel 1: opgeslagen spellen (#983, #429). Elke oudere opslagstand moet blijven laden zonder
// crash en zonder voortgangsverlies; een beschadigde of halve save moet netjes terugvallen (herstelkopie of
// "kapot"), nooit crashen; een gast overschrijft de voortgang van de host niet; en tijdelijke staat van een
// reisrit of film komt nooit halfweg in een save.
// Draait de echte savegame.js (applySave, saveGame, readSaveInfo) met een nepwereld in Node. Zonder de gevendorde
// three.js slaat de test zichzelf over. De opslag is die van node3d.mjs (geheugen): nooit de echte sleutels.
//   node scripts/compat_saves_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import { skipIfThreeMissing } from './lib/threeskip.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'scripts/fixtures/saves');

// home.js bouwt zijn indeling pas in het echte spel; saveGame leest alleen home.center. De test zet een stand-in neer.
registerHooks({
  load(url, ctx, next) {
    const r = next(url, ctx);
    if (/\/game\/js\/home\.js$/.test(url)) return { ...r, source: String(r.source) + '\nexport function __zetHome(h) { home = h; }\n', shortCircuit: true };
    return r;
  },
});

let SG, SS, SM, ST, WORLD, KEYS, CS, HOME, SJ;
try {
  SG = await import('../game/js/savegame.js');
} catch (e) {
  skipIfThreeMissing('compat_saves_test.mjs', e); // #1298: alleen een ontbrekende three.js buiten CI is een SKIP
}
SS = await import('../game/js/saveslots.js');
SM = await import('../game/js/savemigrate.js');
ST = await import('../game/js/story.js');
WORLD = await import('../game/js/world.js');
KEYS = await import('../game/js/storagekeys.js');
CS = await import('../game/js/coopsave.js');
HOME = await import('../game/js/home.js');
SJ = await import('../game/js/sidejobs.js');

let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };

// --- de nepwereld --------------------------------------------------------------------------------------------
const mk = (over = {}) => ({
  stats: { ...WORLD.STAT_DEFAULTS },
  player: { x: 12.5, y: -3, angle: 0, character: 'tammo', inVehicle: null },
  companion: null,
  vehicles: [],
  messages: [],
  addMessage(t) { this.messages.push({ text: t }); },
  map: { nearestRoadPoint: () => null, findOpenSpawn: (x, y) => ({ x, y }), escapeBuilding: (x, y) => [x, y], meta: {} },
  money: 777, ammo: {}, weapon: 'fists', health: 100, armor: 0,
  ...over,
});
const zonderMelding = (f) => { const ce = console.error; const out = []; console.error = (...a) => out.push(a.map((x) => (x && x.message) || x).join(' ')); try { return [f(), out]; } finally { console.error = ce; } };
// sidejobs houdt de wereld in een modulevariabele; de init zelf valt over de nepkaart maar zet die wel (publish leest hem)
zonderMelding(() => { try { SJ.initSideJobs(mk()); } catch (e) { /* de nepkaart heeft geen ankers */ } });

// laden draait zonder indeling van de flat (stockNow zou de garage nodig hebben), opslaan met een stand-in
const app = (w, d) => { HOME.__zetHome(null); return SG.applySave(w, d); };
const boot = (w) => { HOME.__zetHome(null); return SG.loadBootSave(w); };
const laadPlek = (w, n) => { HOME.__zetHome(null); return SG.loadSlot(w, n); };
const sla = (w, o) => { HOME.__zetHome({ center: { x: 1e6, y: 1e6 } }); return SG.saveGame(w, o); };

const KEY1 = KEYS.slotKey(1), REC1 = KEYS.slotRecoveryKey(1);
const schoon = () => { localStorage.clear(); SS.resetReadCache(); };
const zet = (raw, n = 1) => { SS.resetReadCache(); localStorage.setItem(KEYS.slotKey(n), typeof raw === 'string' ? raw : JSON.stringify(raw)); };
const lees = (n = 1) => JSON.parse(localStorage.getItem(KEYS.slotKey(n)));
const laad = (w, info = SG.readSaveInfo(1)) => (info.data ? app(w, info.data) : false);
const fixture = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const saveFixtures = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => [f, fixture(f)]).filter(([, fx]) => fx.save);
const BASIS = fixture('0.36-nieuw-verhaal-akte5.json').save;
const kloon = (o) => JSON.parse(JSON.stringify(o));
const zinnig = (w) => Number.isFinite(w.money) && w.money >= 0 && w.money <= 1e12 && Number.isFinite(w.health) && w.health >= 1 && w.health <= 100
  && Number.isFinite(w.armor) && Number.isFinite(w.player.x) && Number.isFinite(w.player.y);

// --- 1. oudere opslagstanden laden zonder crash en zonder voortgangsverlies ------------------------------------
ok(() => assert.ok(saveFixtures.length >= 15, `fixtures gevonden (${saveFixtures.length})`), 'er zijn oude opslagstanden om te toetsen');
for (const [file, fx] of saveFixtures) {
  if (fx._expect && fx._expect.rejected) {
    ok(() => {
      schoon(); zet(fx.save);
      const info = SG.readSaveInfo(1);
      assert.equal(info.data, null, 'een nieuwere save wordt niet gelezen');
      assert.equal(info.state, 'nieuwer');
      assert.equal(app(mk(), info.data), false, 'en niet geladen');
      assert.deepEqual(JSON.parse(localStorage.getItem(KEY1)), fx.save, 'en niet overschreven');
    }, `${file}: een save van een nieuwer spel blijft ongemoeid`);
    continue;
  }
  ok(() => {
    schoon(); zet(fx.save);
    const info = SG.readSaveInfo(1);
    assert.ok(info.data, `leesbaar (${info.state})`);
    assert.equal(info.data.v, SM.SAVE_VERSION, 'gemigreerd naar de huidige versie');
    const [w, meld] = (() => { const w0 = mk({ money: 5 }); return [w0, zonderMelding(() => laad(w0, info))]; })();
    assert.equal(meld[0], true, `laadt zonder fout ${meld[1][0] || ''}`);
    assert.ok(zinnig(w), `zinnige staat: geld ${w.money}, gezondheid ${w.health}`);
    const geld = info.data.money;
    if (Number.isFinite(geld)) assert.equal(w.money, Math.min(Math.max(0, geld), 1e12), 'het geld blijft');
    else assert.equal(w.money, Number.isFinite(info.data.moneyBackup) ? info.data.moneyBackup : Math.max(1500, w.money), 'een kwijtgeraakt bedrag wordt hersteld uit de reservekopie of geschat');
    // de voortgang: elke bekende verhaalstap die de save kende staat er na het laden nog in (tenzij het verhaal van het oude verhaal begint)
    if (!info.data.oudGemigreerd && info.data.story) {
      const na = new Set(ST.getStorySave().done);
      for (const id of info.data.story.done || []) assert.ok(na.has(id) || !/^[MTA]\d+$/.test(id), `stap ${id} blijft gedaan`);
    }
    const sam = SG.storySummary(info.data);
    assert.ok(sam === null || typeof sam.part === 'string', 'de samenvatting van de savekaart crasht niet');
  }, `${file}: laadt zonder crash en zonder voortgangsverlies`);
}

// de huidige vorm: opslaan, laden, opnieuw opslaan geeft dezelfde voortgang (rond de tijdstempels)
ok(() => {
  schoon(); zet(BASIS);
  const w1 = mk({ money: 0 });
  assert.equal(laad(w1), true);
  assert.equal(sla(w1, { toast: false }), true, 'opslaan lukt');
  const a = lees();
  assert.equal(a.v, SM.SAVE_VERSION);
  const w2 = mk({ money: 0 });
  assert.equal(laad(w2), true);
  assert.equal(sla(w2, { toast: false }), true);
  const b = lees();
  for (const k of ['savedAt', 'speeltijd']) { delete a[k]; delete b[k]; }
  assert.deepEqual(b, a, 'opslaan, laden en opnieuw opslaan verandert niets');
  assert.equal(a.money, BASIS.money, 'het geld bleef');
  assert.deepEqual(a.story.done, ST.getStorySave().done);
}, 'de huidige opslagvorm is stabiel (rondreis)');

// --- 2. beschadigde en halve saves vallen netjes terug ------------------------------------------------------------
const rauw = JSON.stringify(BASIS);
for (const [naam, tekst, staat] of [
  ['afgekapt op de helft', rauw.slice(0, rauw.length >> 1), 'kapot'],
  ['afgekapt vlak voor het einde', rauw.slice(0, -2), 'kapot'],
  ['één teken', '{', 'kapot'],
  ['onzin', 'dit is geen json', 'kapot'],
  ['een lijst', '[]', 'kapot'],
  ['null', 'null', 'kapot'],
  ['een getal', '123', 'kapot'],
  ['een tekst', '"x"', 'kapot'],
  ['zonder versie', JSON.stringify({ ...BASIS, v: undefined }), 'kapot'],
  ['versie als tekst', JSON.stringify({ ...BASIS, v: '10' }), 'kapot'],
  ['versie 0', JSON.stringify({ ...BASIS, v: 0 }), 'kapot'],
  ['versie negatief', JSON.stringify({ ...BASIS, v: -3 }), 'kapot'],
  ['versie met komma', JSON.stringify({ ...BASIS, v: 1.5 }), 'kapot'],
  ['leeg', '', 'leeg'],
  ['een nieuwere versie', JSON.stringify({ ...BASIS, v: SM.SAVE_VERSION + 1 }), 'nieuwer'],
]) {
  ok(() => {
    schoon(); zet(tekst);
    const [info, meld] = zonderMelding(() => SG.readSaveInfo(1));
    assert.equal(info.data, null, 'geen data');
    assert.equal(info.state, staat);
    assert.equal(SG.hasSave(), false, 'hasSave zegt nee');
    assert.equal(boot(mk()), false, 'het laden van de boot geeft false en valt niet om');
    assert.equal(SG.getSaveSummary(), null, 'de savekaart is leeg');
    assert.deepEqual(meld, [], 'geen uitzondering');
  }, `kapotte save (${naam}): netjes terugvallen`);
}

ok(() => {
  schoon(); zet(rauw.slice(0, 500)); localStorage.setItem(REC1, rauw);
  const w = mk({ money: 0 });
  const info = SG.readSaveInfo(1);
  assert.equal(info.state, 'hersteld', 'de herstelkopie wordt gebruikt');
  assert.equal(boot(w), true);
  assert.ok(w.messages.some((m) => /beschadigd/.test(m.text)), 'en de speler hoort het');
  assert.equal(w.money, BASIS.money, 'zonder voortgangsverlies');
  assert.doesNotThrow(() => JSON.parse(localStorage.getItem(KEY1)), 'de plek is daarna weer heel');
}, 'een afgekapte save wordt uit de herstelkopie hersteld, met melding');

ok(() => {
  schoon(); zet(rauw.slice(0, 500)); localStorage.setItem(REC1, rauw.slice(0, 300));
  assert.equal(SG.readSaveInfo(1).data, null, 'ook een kapotte kopie geeft niets');
  assert.equal(boot(mk()), false);
}, 'een kapotte save met een kapotte herstelkopie valt terug op niets laden');

// de velden zelf: elk veld weg, en elk veld met een verkeerd type of een absurde waarde
const waarden = [null, 'x', '', 5, -1, 1e308, true, false, [], {}, [1, 'a', null, {}], { a: 1 }];
let rondes = 0, fouten = [];
const probeer = (label, d) => {
  rondes++;
  const w = mk({ money: 5 });
  const [r, meld] = zonderMelding(() => { try { return app(w, d); } catch (e) { return 'THROW ' + e.message; } });
  if (r !== true) fouten.push(`${label}: ${r} ${meld[0] || ''}`);
  else if (!zinnig(w)) fouten.push(`${label}: onzinnige staat (geld ${w.money}, gezondheid ${w.health}, x ${w.player.x})`);
  else {
    const [opgeslagen] = zonderMelding(() => { const o = sla(w, { toast: false }); return o && lees(); });
    if (!opgeslagen || !Number.isFinite(opgeslagen.money)) fouten.push(`${label}: opnieuw opslaan geeft onzin`);
  }
};
schoon();
for (const k of Object.keys(BASIS)) { const d = kloon(BASIS); delete d[k]; probeer(`veld ${k} weg`, d); }
for (const k of Object.keys(BASIS)) for (const v of waarden) { const d = kloon(BASIS); d[k] = v; probeer(`${k} = ${JSON.stringify(v)}`, d); }
for (const [k, val] of Object.entries(BASIS)) {
  if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
  for (const k2 of Object.keys(val)) {
    const d0 = kloon(BASIS); delete d0[k][k2]; probeer(`${k}.${k2} weg`, d0);
    for (const v of waarden) { const d = kloon(BASIS); d[k][k2] = v; probeer(`${k}.${k2} = ${JSON.stringify(v)}`, d); }
  }
}
ok(() => assert.deepEqual(fouten.slice(0, 5), [], `${fouten.length} van ${rondes} gevallen fout`), 'veldfuzz: elk ontbrekend of verkeerd veld laadt en slaat opnieuw netjes op');

// onbekende id's en rare getallen (JSON kent geen NaN of Infinity; een programma wel)
ok(() => {
  schoon();
  const d = kloon(BASIS);
  d.story.done = ['bestaat-niet', 5, null, {}, ...d.story.done];
  d.story.skipped = ['M99', 'zzz'];
  d.missions.completed = [0, 9999, -1, 'a', 1.5, null, 0];
  d.missions.index = 9999;
  d.visitedLandmarks = ['x', 5, null, 'y'];
  d.shops.vehicles = [{ key: 'bestaat-niet', x: 0, y: 0 }, null, 3, { key: 'omafiets', x: 'a' }];
  d.ammo = { bestaatniet: 5, pistol: NaN, ak: Infinity, fists: 'inf' };
  d.weapon = 'bestaat-niet';
  d.character = 'iemand-anders';
  const w = mk({ money: 5 });
  assert.equal(laad(w, { data: d }), true);
  const na = ST.getStorySave();
  assert.ok(!na.done.includes('bestaat-niet') && !na.done.includes(5), 'onbekende verhaalstappen vallen weg');
  assert.equal(w.weapon, 'fists', 'een onbekend wapen wordt vuisten');
  assert.ok(Object.values(w.ammo).every((v) => v === Infinity || Number.isFinite(v)), 'munitie blijft getal');
  assert.equal(w.player.character, 'tammo', 'een onbekend personage verandert niets');
  assert.ok([...w.visitedLandmarks].every((s) => typeof s === 'string'));
}, 'onbekende missie-, stap-, wapen- en voertuig-id\'s worden genegeerd');

for (const [naam, mut] of [
  ['geld NaN', (d) => { d.money = NaN; }],
  ['geld Infinity', (d) => { d.money = Infinity; }],
  ['geld -Infinity', (d) => { d.money = -Infinity; }],
  ['geld "NaN"', (d) => { d.money = 'NaN'; }],
  ['gezondheid NaN', (d) => { d.health = NaN; }],
  ['gezondheid Infinity', (d) => { d.health = Infinity; }],
  ['pantser Infinity', (d) => { d.armor = Infinity; }],
  ['plek NaN', (d) => { d.pos = { x: NaN, y: 1 }; }],
  ['plek Infinity', (d) => { d.pos = { x: Infinity, y: -Infinity }; }],
  ['plek buiten de provincie', (d) => { d.pos = { x: 1e9, y: 1e9 }; }],
  ['speeltijd Infinity', (d) => { d.speeltijd = Infinity; }],
  ['statistieken NaN', (d) => { for (const k of Object.keys(d.stats)) d.stats[k] = NaN; }],
  ['statistieken Infinity', (d) => { for (const k of Object.keys(d.stats)) d.stats[k] = Infinity; }],
]) {
  ok(() => {
    schoon();
    const d = kloon(BASIS); mut(d);
    const w = mk({ money: 5 });
    const [r, meld] = zonderMelding(() => app(w, d));
    assert.equal(r, true, `laadt (${meld[0] || ''})`);
    assert.ok(zinnig(w), `zinnig: geld ${w.money}, gezondheid ${w.health}, x ${w.player.x}`);
    assert.ok(Object.values(w.stats).every((v) => Number.isFinite(v)), 'statistieken blijven eindig');
    const o = sla(w, { toast: false });
    assert.equal(o, true);
    assert.ok(Number.isFinite(lees().money), 'en het opgeslagen geld is een getal');
  }, `rare getallen (${naam}) geven een zinnige staat`);
}

ok(() => {
  schoon();
  const w = mk({ money: 5 });
  const d = kloon(BASIS); d.money = 1e308; d.moneyBackup = 1e308;
  assert.equal(app(w, d), true);
  assert.equal(w.money, 1e12, 'enorm geld wordt begrensd');
  w.money += 1e308; // een beloning daarbovenop mag het niet oneindig maken in de save
  assert.ok(Number.isFinite(w.money));
  const d2 = kloon(BASIS); d2.money = -500;
  assert.equal(app(mk(), d2), true);
  const w3 = mk(); app(w3, d2);
  assert.equal(w3.money, 0, 'negatief geld wordt nul');
  const d3 = kloon(BASIS); d3.money = 123456789012; // een hoog maar echt bedrag blijft
  const w4 = mk(); app(w4, d3);
  assert.equal(w4.money, 123456789012);
}, 'enorm of negatief geld wordt begrensd, een hoog echt bedrag blijft');

ok(() => {
  schoon();
  const huge = kloon(BASIS);
  huge.visitedLandmarks = Array.from({ length: 20000 }, (_, i) => `plek-${i}`);
  const w = mk({ money: 5 });
  assert.equal(app(w, huge), true, 'een grote save laadt');
}, 'een erg grote lijst laadt');

// --- 3. opslag per speler bij Samen spelen (#429) ---------------------------------------------------------------
ok(() => {
  for (const k of ['story', 'missions', 'pos', 'character', 'kalender', 'doel', 'ctx', 'coopGebeurtenissen', 'streken', 'v', 'arc', 'speeltijd'])
    assert.ok(!CS.GAST_VELDEN.includes(k), `${k} is van de eigen voortgang van wie het spel opende en geen gastveld`);
}, 'de gastvelden bevatten geen verhaal, missies, plek of personage');

ok(() => {
  schoon();
  zet(BASIS, 1);
  // de gast heeft zijn eigen opgeslagen spel in plek 2, de host speelt plek 1
  const gast = kloon(BASIS); gast.money = 900; gast.savedAt = 5; gast.pos = { x: 100, y: 100 };
  gast.story.done = gast.story.done.slice(0, 10); gast.missions = { index: 3, completed: [0, 1, 2], seen: [0, 1, 2], medals: {} };
  zet(gast, 2);
  SS.setActive(null, 2); SG.bindSlot();
  const rauw1 = localStorage.getItem(KEYS.slotKey(1));
  const w = mk({ money: 900 + 250, coopRole: 'client', coopVerdiend: 250 });
  assert.equal(sla(w, { toast: false }), true, 'de gast bewaart zijn verdiensten');
  assert.equal(localStorage.getItem(KEYS.slotKey(1)), rauw1, 'de save van de host (plek 1) is niet aangeraakt');
  const na = lees(2);
  assert.equal(na.money, 1150, 'het verdiende geld staat in zijn eigen save');
  assert.deepEqual(na.story.done, gast.story.done, 'zijn eigen verhaal bleef');
  assert.deepEqual(na.missions, gast.missions, 'zijn eigen missies bleven');
  assert.deepEqual(na.pos, gast.pos, 'zijn eigen plek bleef (niet die van de wereld van de host)');
  assert.equal(w.coopVerdiend, 0);
  SS.setActive(null, 1); SG.bindSlot();
}, 'een gast schrijft alleen in zijn eigen opgeslagen spel en laat zijn verhaal en plek staan');

ok(() => {
  schoon();
  zet(BASIS, 1);
  SS.setActive(null, 1); SG.bindSlot();
  // de host bewaart zijn eigen spel; een gast-id of -verdienste uit het register mag er niet in lekken
  const w = mk({ coopRole: 'host', coopNet: {}, coopSolo: false, coopBoek: { ids: () => ['g1', 'g2'] }, coopVerdiend: 50 });
  assert.equal(sla(w, { toast: false }), true);
  const na = lees(1);
  assert.deepEqual(na.story.done, ST.getStorySave().done, 'de host bewaart het verhaal van zijn eigen spel');
  assert.deepEqual(na.coopGebeurtenissen, ['g1', 'g2'], 'de ontvangen beloningen staan in de save van wie ze kreeg');
  assert.ok(!('coopVerdiend' in na), 'het gastbedrag is geen savefield');
}, 'de host bewaart zijn eigen spel en de beloningsboekhouding per speler');

ok(() => {
  schoon(); zet(BASIS, 1); SS.setActive(null, 1); SG.bindSlot();
  const voor = localStorage.getItem(KEY1);
  const w = mk({ money: 1, coopRole: 'host', coopNet: {}, coopSolo: false });
  assert.equal(app(w, kloon(BASIS)), false, 'tijdens een echte sessie laadt er geen ander spel');
  assert.equal(w.money, 1, 'de wereld is niet veranderd');
  assert.equal(laadPlek(w, 1), false);
  assert.equal(localStorage.getItem(KEY1), voor);
  const solo = mk({ money: 1, coopRole: 'host', coopNet: {}, coopSolo: true });
  assert.equal(app(solo, kloon(BASIS)), true, 'alleen spelen (solo-sessie) laadt gewoon');
}, 'tijdens een echte sessie weigert laden, alleen spelen niet');

ok(() => {
  // een gast wiens plek niet leesbaar is overschrijft niets: het bedrag blijft in het geheugen
  schoon(); SS.setActive(null, 1); SG.bindSlot();
  zet('kapot{', 1);
  const w = mk({ coopRole: 'client', coopVerdiend: 40 });
  const [r] = zonderMelding(() => sla(w, { toast: false }));
  assert.equal(r, false);
  assert.equal(localStorage.getItem(KEY1), 'kapot{', 'de kapotte tekst blijft staan voor herstel');
  assert.equal(w.coopVerdiend, 40, 'en het verdiende bedrag is niet kwijt');
}, 'een gast met een onleesbare plek verliest zijn verdiensten niet en schrijft niets over');

// --- 4. tijdelijke staat van een rit, film of opening komt nooit in de save ---------------------------------------------
ok(() => {
  schoon(); SS.setActive(null, 1); SG.bindSlot();
  const w = mk({ money: 500 });
  assert.equal(sla(w, { toast: false }), true);
  const voor = localStorage.getItem(KEY1);
  // halverwege een rit staat de speler op de taxi, het kaartje is nog niet betaald
  Object.assign(w, { ritBezig: true, cinematicHidePlayers: true, challengeHoldPlayer: true, ritTaxi: { x: 9999, y: 9999 } });
  w.player.x = 4000; w.player.y = 4000; w.money = 450;
  assert.equal(sla(w, { toast: false }), true, 'opslaan tijdens de rit meldt geen fout');
  assert.equal(localStorage.getItem(KEY1), voor, 'maar schrijft de halve rit niet weg');
  w.ritBezig = false;
  assert.equal(sla(w, { toast: false }), true);
  const na = lees();
  assert.equal(na.pos.x, 4000, 'na de rit bewaart hij weer gewoon');
  const tekst = localStorage.getItem(KEY1);
  assert.ok(!/ritTaxi|ritBezig|cinematic|challengeHold|openingPhase|wachtprops|stageDressing/i.test(tekst), 'geen tijdelijke vlaggen in de save');
}, 'een save tijdens een reisrit schrijft de halve rit niet weg');

ok(() => {
  // #1295: een autosave die tijdens de rit afliep was verbruikt (saveGame gaf true zonder te schrijven); een wijziging
  // vlak voor een rit bleef daarna liggen tot de volgende wijziging. De autosave wacht nu tot de rit voorbij is.
  schoon(); SS.setActive(null, 1); SG.bindSlot();
  const w = mk({ money: 500 });
  assert.equal(sla(w, { toast: false }), true);
  const oudBody = document.body;
  const classes = new Set(['game-started']);
  document.body = { classList: { contains: (c) => classes.has(c), add: (c) => classes.add(c), remove: (c) => classes.delete(c) } };
  try {
    HOME.__zetHome({ center: { x: 1e6, y: 1e6 } });
    w.money = 900; // de wijziging vlak voor de rit
    SG.markDirty();
    w.ritBezig = true;
    for (let f = 0; f < 60 * 5; f++) SG.updateSaveGame(1 / 60, w); // de autosave loopt af tijdens de rit
    assert.equal(lees().money, 500, 'tijdens de rit wordt niets geschreven');
    w.ritBezig = false;
    for (let f = 0; f < 60 * 5; f++) SG.updateSaveGame(1 / 60, w);
    assert.equal(lees().money, 900, 'na de rit komt de wachtende autosave alsnog op schijf');
  } finally { document.body = oudBody; }
}, 'een autosave die tijdens een reisrit afloopt, wordt na de rit alsnog geschreven');

{
  const { TOONBANK } = await import('../game/js/eten.js');
  const snack = TOONBANK[0][0];
  ok(() => {
    // #1295: struikelt een onderdeel bij het opslaan, dan valt dat veld terug op de laatste goede waarde. Die lijst bleef na het
    // laden van een andere plek staan: het veld van het vorige spel kwam in de save van het geladen spel.
    schoon(); SS.setActive(null, 1); SG.bindSlot();
    const w = mk({ eten: { [snack]: 3 } });
    assert.equal(sla(w, { toast: false }), true);
    assert.equal(lees(1).eten[snack], 3, 'plek 1 heeft drie snacks');
    zet({ ...kloon(BASIS), eten: {} }, 2);
    const [geladen] = zonderMelding(() => laadPlek(w, 2));
    assert.equal(geladen, true, 'plek 2 laadt');
    Object.defineProperty(w, 'eten', { get() { throw new Error('eten stuk'); }, configurable: true });
    zonderMelding(() => sla(w, { toast: false }));
    const eten2 = lees(2).eten || {};
    assert.equal(eten2[snack], undefined, 'de snacks van plek 1 lekken niet naar plek 2');
  }, 'een struikelend onderdeel zet na het laden van een andere plek geen veld van de vorige plek in de save');
}

ok(() => {
  const sleutels = Object.keys(serializeSleutels());
  for (const s of sleutels) assert.ok(!/rit|opening|cutscene|cinema|film|wacht|stage|reis|prop|tijdelijk/i.test(s), `${s}: geen tijdelijke staat in de save`);
  assert.ok(sleutels.includes('missions') && sleutels.includes('story') && sleutels.includes('pos'));
}, 'de opgeslagen velden bevatten geen rit-, film-, opening- of wachtprops-staat');
function serializeSleutels() { schoon(); SS.setActive(null, 1); SG.bindSlot(); sla(mk(), { toast: false }); return lees(); }

ok(() => {
  // een save midden in een missie: pos blijft (ctx 'busy'), de missie zelf start opnieuw bij het laden
  const fx = fixture('0.27-midmissie-boot.json');
  schoon(); zet(fx.save);
  const w = mk({ money: 0 });
  const info = SG.readSaveInfo(1);
  assert.equal(laad(w, info), true);
  assert.ok(zinnig(w));
  assert.equal(fx.save.ctx, 'busy', 'de fixture is een save midden in een missie');
}, 'een save uit het midden van een missie laadt');

ok(() => {
  // nieuw spel, de opening heeft nog niet gespeeld (M00 niet gedaan): laden geeft een speelbare staat, de savekaart noemt het begin
  schoon();
  const d = kloon(BASIS);
  d.story.done = []; d.story.skipped = []; d.missions = { index: 0, completed: [], seen: [], medals: {} };
  zet(d);
  const w = mk({ money: 0 });
  assert.equal(laad(w), true);
  assert.deepEqual(ST.getStorySave().done, [], 'geen stap gedaan: de opening komt nog');
  const sam = SG.storySummary(d);
  assert.ok(sam && !sam.ended && sam.done === 0, 'de savekaart zegt: begin van het verhaal');
}, 'een save van vóór de opening (M00 niet gedaan) laadt en laat de opening nog komen');

// de lus rond een rit in de bron: wie een spel laadt midden in de rit laat de geladen wereld niet nog verplaatsen
ok(() => {
  const rit = fs.readFileSync(path.join(ROOT, 'game/js/reisrit.js'), 'utf8');
  assert.match(rit, /laadTeller = world\.loadCount \|\| 0/);
  assert.match(rit, /if \(\(world\.loadCount \|\| 0\) !== laadTeller\) return \{ aangekomen: false \};[\s\S]{0,200}if \(res\.terugval\)/, 'de controle staat vóór de aankomst');
  const r3 = fs.readFileSync(path.join(ROOT, 'game/js/reisrit3d.js'), 'utf8');
  assert.match(r3, /world\.ritBezig = true/);
  assert.match(r3, /world\.ritBezig = false/);
}, 'reisrit.js landt niet in een tussentijds geladen wereld; reisrit3d.js zet ritBezig aan en uit');

// review 21-11: een echte save van v0.64.0 (met de savegame.js van die tag gemaakt) en dezelfde zonder ctx/plek laden, en laden op de juiste plek (#984)
{
  const { laadtOpOpslagplek } = await import('../game/js/saveplek.js');
  for (const [file, opPlek] of [['0.64-v0.64.0-echt.json', true], ['0.64-zonder-ctx.json', false]]) {
    ok(() => {
      const fx = fixture(file);
      schoon(); zet(fx.save);
      const info = SG.readSaveInfo(1);
      assert.ok(info.data, `leesbaar (${info.state})`);
      const w = mk({ money: 0 });
      const [r, meld] = zonderMelding(() => laad(w, info));
      assert.equal(r, true, `laadt ${meld[0] || ''}`);
      assert.equal(w.money, fx._expect.money, 'het geld blijft');
      assert.equal(laadtOpOpslagplek(info.data), opPlek, opPlek ? 'laden zet je op de plek van de save' : 'zonder context begint laden in de flat');
      assert.deepEqual([info.data.pos.x, info.data.pos.y], fx._expect.pos, 'de positie blijft in de save');
      assert.ok(SG.storySummary(info.data) === null || typeof SG.storySummary(info.data).part === 'string', 'de savekaart crasht niet');
    }, `${file}: laadt en kiest de juiste startplek`);
  }
}

// Binnenspawn (22-11, spawnbinnen.js): de save schrijft thuis.binnen erbij (buiten de flat: false); een oude save zonder het veld laadt zonder thuis
// (de wereld heeft hier geen flat) en blijft heel; de keuze zelf staat in spawnbinnen_test.mjs.
ok(() => {
  assert.equal(typeof HOME.getHomeSave().binnen, 'boolean', 'getHomeSave meldt binnen als boolean');
  assert.equal(HOME.getHomeSave().binnen, false, 'buiten de flat: binnen is false');
  assert.ok(Array.isArray(HOME.getHomeSave().front), 'front blijft in de save');
  const w = mk();
  const d = { thuis: { front: ['x'] } };
  assert.equal(Object.prototype.hasOwnProperty.call(d.thuis, 'binnen'), false, 'een oude save heeft het veld niet');
  assert.doesNotThrow(() => HOME.applyHomeOnLoad(w, d), 'applyHomeOnLoad zonder woning in de wereld doet niets');
}, 'thuis.binnen: nieuw veld, oude save blijft heel');

console.log(`compat_saves_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
