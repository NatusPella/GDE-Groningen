// De playtestbundel van de proefspeler (scripts/bot/proefbundel.mjs en proef.mjs) uit een gefabriceerde events.jsonl, zonder Electron.
//   node scripts/proefbundel_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseEvents, samenvatMissie, faalratio, bijschrift, beeldLijst, bouwIndexMd, bouwReviewBrief, bundelSchrijven, bouwOverzichtMd } from './bot/proefbundel.mjs';
import { parseArgs, bouwTaken, runArgs, mapVoor } from './bot/proef.mjs';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n  ')); } };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gde-proef-test-'));

// een oogmoment zoals bouwOogMoment het logt (plus t en type)
const oog = (t, reden, o = {}) => ({
  t, type: 'oog', reden, naam: 'Even pinnen', shot: `M02-oog${String(o.nr || 1).padStart(2, '0')}-${reden}`, stap: 'M02', fase: 'garage', missieActief: true,
  doelTekst: 'Even pinnen', doelNaam: 'Spuit & Klaar', afstand: 120, zicht: { bekend: true, zichtbaar: true, reden: 'in beeld' },
  ondertitel: '', dialoog: null, berichten: [], kaart: null, voertuig: { soort: 'auto', gezondheid: 100, snelheid: 5 }, gezondheid: 100, snelheid: 5,
  frameMs: 16.6, gezocht: 0, geld: 10, mislukt: 0, plek: [1, 2], spreiding: null, stilS: 0, filmpje: false, tijd: t, ...o,
});
const lijn = (...evs) => evs.map((e) => JSON.stringify(e)).join('\n') + '\n';

// een geslaagde run: begin, doelwissel met een doel buiten beeld, filmpje, einde
const geslaagd = () => [
  { type: 'meta', seed: 1 }, { t: 0, type: 'mens', seed: 1 },
  { t: 1, type: 'step', event: 'begin', id: 'M02', label: 'Even pinnen' },
  oog(1, 'begin', { nr: 1 }), { t: 1, type: 'shot', name: 'M02-oog01-begin' },
  { t: 2, type: 'mission', event: 'start', id: 'M02', label: 'Even pinnen' },
  { t: 30, type: 'doel', stage: 'goto', doel: 'Garage', afstand: 200 },
  oog(30, 'doel', { nr: 2, zicht: { bekend: true, zichtbaar: false, reden: 'links buiten beeld' }, kaart: { tekst: 'Druk op E', zichtbaarS: 3.5 }, frameMs: 45 }), { t: 30, type: 'shot', name: 'M02-oog02-doel' },
  oog(60, 'filmpje', { nr: 3, filmpje: true, zicht: { bekend: false }, ondertitel: 'Tessa: Daar is het.' }), { t: 60, type: 'shot', name: 'M02-oog03-filmpje' },
  { t: 62, type: 'shot', name: 'M02-szene1-01' },
  oog(90, 'stil', { nr: 4, stilS: 9, zicht: { bekend: true, zichtbaar: false, reden: 'gebouw ervoor (3, 4)' } }), { t: 90, type: 'shot', name: 'M02-oog04-stil' },
  oog(120, 'slagen', { nr: 5, gezondheid: 70 }), { t: 120, type: 'shot', name: 'M02-oog05-slagen' },
  { t: 120, type: 'step', event: 'end', id: 'M02', outcome: 'klaar', maxQuiet: 11.5 },
  { t: 121, type: 'einde', result: 'KLAAR', reason: '1 stappen', gameS: 121 },
];
// een mislukte run: twee keer mislukt, vast, de bot gaf op; een geweigerde cheat
const mislukt = () => [
  { type: 'meta', seed: 2 },
  { t: 1, type: 'step', event: 'begin', id: 'M02', label: 'Even pinnen' },
  oog(1, 'begin', { nr: 1 }), { t: 1, type: 'shot', name: 'M02-oog01-begin' },
  { t: 2, type: 'mission', event: 'start', id: 'M02' },
  oog(50, 'mislukt', { nr: 2, mislukt: 1 }),
  oog(100, 'mislukt', { nr: 3, mislukt: 2 }),
  { t: 140, type: 'stuck', step: 'M02:garage', x: 10.4, y: 20.6, idleFor: 31, goalDist: 8, rung: 'nudge' },
  { t: 150, type: 'cheat-geweigerd', welke: 'win' },
  { t: 200, type: 'opgegeven', reden: 'vast bij M02:garage (45 s, geen cheat gebruikt)' },
  oog(200, 'opgegeven', { nr: 4, mislukt: 2, stilS: 45 }),
  { t: 200, type: 'step', event: 'end', id: 'M02', outcome: 'opgegeven', maxQuiet: 50 },
  { t: 201, type: 'einde', result: 'KLAAR', reason: '1 stappen', gameS: 201 },
];

t('parseEvents: negeert kapotte regels', () => {
  assert.equal(parseEvents('{"a":1}\nkapot\n\n{"b":2}').length, 2);
});

t('samenvatMissie: een geslaagde run', () => {
  const s = samenvatMissie(geslaagd(), { id: 'M02', seed: 1 });
  assert.equal(s.geslaagd, true); assert.equal(s.uitkomst, 'klaar');
  assert.equal(s.cheats, 0); assert.equal(s.cheatsGeweigerd, 0);
  assert.equal(s.pogingen, 1); assert.equal(s.mislukt, 0);
  assert.equal(s.duurS, 119);
  assert.equal(s.vastgezet, 0);
  assert.equal(s.langsteStilstandS, 11.5, 'de stap-eindmeting (maxQuiet) telt mee');
  assert.equal(s.schermenZonderZichtbaarDoel, 2, 'de doelwissel en de stil-opname; het filmpje telt niet');
  assert.deepEqual(s.schermenZonderDoelNrs, [2, 4]);
  assert.equal(s.doelwissels, 1); assert.equal(s.oogmomenten, 5);
  assert.equal(s.frameMsMax, 45); assert.equal(s.minGezondheid, 70);
});

t('samenvatMissie: mislukt en opgegeven, met vastgezette momenten en geweigerde cheats', () => {
  const s = samenvatMissie(mislukt(), { id: 'M02', seed: 2 });
  assert.equal(s.geslaagd, false); assert.equal(s.uitkomst, 'opgegeven'); assert.match(s.reden, /geen cheat/);
  assert.equal(s.mislukt, 2); assert.equal(s.pogingen, 2);
  assert.equal(s.cheats, 0); assert.equal(s.cheatsGeweigerd, 1);
  assert.equal(s.vastgezet, 1);
  assert.deepEqual(s.vastgezetMomenten[0], { t: 140, stap: 'M02:garage', x: 10, y: 21, stilS: 31, trede: 'nudge', afstand: 8 });
  assert.equal(s.langsteStilstandS, 50);
});

t('samenvatMissie: een echte cheat telt en maakt de run ongeldig; een geweigerde niet', () => {
  const ev = geslaagd(); ev.splice(3, 0, { t: 5, type: 'cheat', rung: 'win', ok: true });
  const s = samenvatMissie(ev, { id: 'M02' });
  assert.equal(s.cheats, 1); assert.equal(s.geslaagd, false, 'met een cheat is het geen mensenrun');
  const w = geslaagd(); w.splice(3, 0, { t: 5, type: 'cheat', rung: 'win', ok: false });
  assert.equal(samenvatMissie(w, { id: 'M02' }).cheats, 0);
});

t('samenvatMissie: een lege of afgebroken run valt niet om', () => {
  const s = samenvatMissie([], { id: 'M02', seed: 1 });
  assert.equal(s.geslaagd, false); assert.equal(s.uitkomst, 'onbekend'); assert.equal(s.oogmomenten, 0); assert.equal(s.duurS, null);
  const k = samenvatMissie([{ t: 1, type: 'step', event: 'begin', id: 'M02' }, { t: 99, type: 'einde', result: 'TIMEOUT', reason: 'tijd op', gameS: 99 }], { id: 'M02' });
  assert.equal(k.uitkomst, 'timeout'); assert.equal(k.duurS, 98); assert.equal(k.pogingen, 1);
});

t('faalratio: over meerdere seeds', () => {
  const a = samenvatMissie(geslaagd(), { id: 'M02', seed: 1 }), b = samenvatMissie(mislukt(), { id: 'M02', seed: 2 }), c = samenvatMissie(mislukt(), { id: 'M02', seed: 3 });
  const r = faalratio([a, b, c]);
  assert.equal(r.seeds, 3); assert.equal(r.geslaagd, 1); assert.equal(r.mislukt, 2); assert.equal(r.faalratio, 0.67);
  assert.equal(r.opgegeven, 2); assert.equal(r.maxPogingen, 2); assert.equal(r.gemPogingen, 1.7);
  assert.deepEqual(r.perSeed.map((x) => x.seed), [1, 2, 3]);
  assert.equal(faalratio([]).faalratio, null);
});

t('bijschrift: vertelt wat er gebeurde, ook wat niet zichtbaar was', () => {
  const b = bijschrift(oog(30, 'doel', { zicht: { bekend: true, zichtbaar: false, reden: 'links buiten beeld' }, kaart: { tekst: 'Druk op E', zichtbaarS: 3.5 }, frameMs: 45, ondertitel: 'Tessa: Hoi', stilS: 9, gezocht: 2 }));
  assert.match(b, /nieuw doel/); assert.match(b, /Even pinnen \(120 m\)/); assert.match(b, /NIET zichtbaar, links buiten beeld/);
  assert.match(b, /kaart 3\.5 s: "Druk op E"/); assert.match(b, /ondertitel: "Tessa: Hoi"/); assert.match(b, /stil 9 s/); assert.match(b, /gezocht 2/); assert.match(b, /frametijd 45 ms/);
  assert.doesNotMatch(bijschrift(oog(1, 'filmpje', { filmpje: true, zicht: { bekend: true, zichtbaar: false, reden: 'x' } })), /waypoint/);
});

t('beeldLijst: oogmomenten en losse shots (de filmpje-reeks van --watch), op tijd, genummerd', () => {
  const l = beeldLijst(geslaagd());
  assert.equal(l.length, 6);
  assert.deepEqual(l.map((b) => b.nr), [1, 2, 3, 4, 5, 6]);
  assert.equal(l[0].bestand, '01-begin.png');
  const los = l.find((b) => b.shot === 'M02-szene1-01');
  assert.equal(los.oog.reden, 'beeld'); assert.equal(los.bestand, '04-beeld.png');
  assert.deepEqual(l.map((b) => b.t), [...l.map((b) => b.t)].sort((x, y) => x - y));
});

t('bundelSchrijven: events, genummerde beelden, index, samenvatting en reviewbrief in één map', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'events.jsonl'), lijn(...geslaagd()));
  for (const naam of ['M02-oog01-begin', 'M02-oog02-doel', 'M02-oog03-filmpje', 'M02-szene1-01', 'M02-oog05-slagen']) fs.writeFileSync(path.join(dir, `shots-${naam}.png`), 'png:' + naam);
  const { sam, beelden } = bundelSchrijven(dir, dir, { id: 'M02', seed: 1 });
  const namen = fs.readdirSync(dir).sort();
  for (const f of ['events.jsonl', 'index.md', 'samenvatting.json', 'review-brief.md', '01-begin.png', '02-doel.png', '03-filmpje.png', '04-beeld.png', '06-slagen.png']) assert.ok(namen.includes(f), `${f} ontbreekt in ${namen}`);
  assert.ok(!namen.some((f) => f.startsWith('shots-')), 'ruwe beelden zijn hernoemd');
  assert.ok(!namen.includes('05-stil.png'), 'een beeld dat niet op schijf kwam krijgt geen bestand');
  assert.equal(fs.readFileSync(path.join(dir, '02-doel.png'), 'utf8'), 'png:M02-oog02-doel');
  assert.equal(beelden.find((b) => b.nr === 5).bestand, '');
  const js = JSON.parse(fs.readFileSync(path.join(dir, 'samenvatting.json'), 'utf8'));
  for (const k of ['geslaagd', 'pogingen', 'duurS', 'cheats', 'vastgezet', 'langsteStilstandS', 'schermenZonderZichtbaarDoel']) assert.ok(k in js, k);
  assert.equal(js.cheats, 0); assert.equal(js.geslaagd, true); assert.equal(sam.schermenZonderZichtbaarDoel, 2);
  const idx = fs.readFileSync(path.join(dir, 'index.md'), 'utf8');
  assert.match(idx, /!\[2\]\(02-doel\.png\)/); assert.match(idx, /links buiten beeld/); assert.match(idx, /geen beeld/);
  const brief = fs.readFileSync(path.join(dir, 'review-brief.md'), 'utf8');
  for (const w of ['Weet ik als speler wat ik moet doen', 'Zie ik het doel', 'leesbaar', 'zwevends', 'camera in filmpjes', 'oneerlijk', 'een mens hier vragen', 'issue-voorstel']) assert.match(brief, new RegExp(w), w);
  assert.match(brief, /02-doel\.png/); assert.match(brief, /schermen zonder zichtbaar doelwaypoint: 2 \((beeld 2, 5)\)/); assert.match(brief, /cheats: 0/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t('bundelSchrijven: naar een andere map kopieert de events en laat de bron staan; een run zonder events geeft een lege maar bruikbare bundel', () => {
  const bron = tmp(), doel = path.join(tmp(), 'uit');
  fs.writeFileSync(path.join(bron, 'events.jsonl'), lijn(...mislukt()));
  fs.writeFileSync(path.join(bron, 'shots-M02-oog01-begin.png'), 'x');
  bundelSchrijven(bron, doel, { id: 'M02', seed: 2 });
  assert.ok(fs.existsSync(path.join(bron, 'shots-M02-oog01-begin.png')), 'bron blijft staan');
  assert.ok(fs.existsSync(path.join(doel, 'events.jsonl')) && fs.existsSync(path.join(doel, '01-begin.png')));
  const leeg = tmp();
  const { sam } = bundelSchrijven(leeg, leeg, { id: 'M02', seed: 1 });
  assert.equal(sam.oogmomenten, 0);
  assert.match(fs.readFileSync(path.join(leeg, 'review-brief.md'), 'utf8'), /Geen beelden/);
  for (const d of [bron, path.dirname(doel), leeg]) fs.rmSync(d, { recursive: true, force: true });
});

t('bouwIndexMd, bouwReviewBrief en bouwOverzichtMd: ook zonder beelden', () => {
  const sam = samenvatMissie([], { id: 'M99', seed: 1 });
  assert.match(bouwIndexMd(sam, []), /geen oogmomenten/);
  assert.match(bouwReviewBrief(sam, []), /Geen beelden/);
  const a = samenvatMissie(geslaagd(), { id: 'M02', seed: 1 });
  const md = bouwOverzichtMd([{ missie: 'M02', ratio: faalratio([a]), samenvattingen: [a] }]);
  assert.match(md, /\| M02 \| 1\/1 \| 0 \|/);
});

// --- de driver ---
t('parseArgs: eigen opties apart, de rest gaat naar run.mjs', () => {
  const { eigen, door } = parseArgs(['--missies=M02,M18', '--seeds=1,2', '--slot', '--speed=2', '--alleen-bundel', '--out=x']);
  assert.equal(eigen.missies, 'M02,M18'); assert.equal(eigen.seeds, '1,2'); assert.equal(eigen['alleen-bundel'], true); assert.equal(eigen.out, 'x');
  assert.deepEqual(door, ['--slot', '--speed=2']);
});

t('bouwTaken: uit --missies en --lijst, met seeds, skip-stages en dubbelen eruit', () => {
  const k = bouwTaken({ missies: 'm02, M18,M02', seeds: '1,2,3' });
  assert.deepEqual(k.map((x) => [x.id, x.seeds]), [['M02', [1, 2, 3]], ['M18', [1, 2, 3]]]);
  const l = bouwTaken({ lijst: ['M05', { id: 'M26', seeds: [4], skipStages: 3, pogingen: 5 }], missies: 'A1' });
  assert.deepEqual(l.map((x) => x.id), ['M05', 'M26', 'A1']);
  assert.deepEqual(l[1].seeds, [4]); assert.deepEqual(l[1].extra, ['--skip-stages=M26:3', '--pogingen=5']);
  assert.deepEqual(bouwTaken({ lijst: { missies: ['M07'] } }).map((x) => x.id), ['M07']);
  assert.throws(() => bouwTaken({ missies: 'rm -rf' }), /ongeldige missie-id/);
  assert.deepEqual(bouwTaken({}), []);
  assert.deepEqual(bouwTaken({ missies: 'M02', seeds: 'x' })[0].seeds, [1]);
});

t('runArgs: --mens, --mode=missions, de seed, standaard --watch en --shots, en de eigen opties van de aanroeper gaan voor', () => {
  const taak = { id: 'M02', seeds: [1], extra: [] };
  const a = runArgs(taak, 3, '/u', ['--slot']);
  for (const w of ['--mode=missions', '--only=M02', '--mens', '--seed=3', '--out=/u', '--watch=20', '--shots=150', '--slot']) assert.ok(a.includes(w), w);
  assert.ok(a[0].endsWith('run.mjs'));
  const b = runArgs(taak, 1, '/u', ['--watch=5', '--shots=40']);
  assert.ok(b.includes('--watch=5') && !b.includes('--watch=20') && b.includes('--shots=40') && !b.includes('--shots=150'));
  assert.ok(!a.some((x) => /cheat|invuln/.test(x)), 'geen cheat-opties');
});

t('mapVoor: één seed plat, meer seeds in seed-<n>', () => {
  assert.equal(mapVoor('/u', { id: 'M02', seeds: [1] }, 1), path.join('/u', 'M02'));
  assert.equal(mapVoor('/u', { id: 'M02', seeds: [1, 2] }, 2), path.join('/u', 'M02', 'seed-2'));
});

t('proef.mjs --alleen-bundel: bouwt de bundel van bestaande runs, met seeds en faalratio, zonder Electron', () => {
  const out = tmp();
  const zet = (dir, evs, shots) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'events.jsonl'), lijn(...evs)); for (const s of shots) fs.writeFileSync(path.join(dir, `shots-${s}.png`), 'x'); };
  zet(path.join(out, 'M02', 'seed-1'), geslaagd(), ['M02-oog01-begin']);
  zet(path.join(out, 'M02', 'seed-2'), mislukt(), ['M02-oog01-begin']);
  zet(path.join(out, 'M18'), geslaagd(), []);
  const r = spawnSync(process.execPath, [new URL('./bot/proef.mjs', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), `--out=${out}`, '--alleen-bundel', '--missies=M02,M18', '--seeds=1,2'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  // M18 kreeg seeds 1 en 2, maar alleen de platte map bestaat: de runs zonder events geven lege bundels, geen crash
  const m02 = JSON.parse(fs.readFileSync(path.join(out, 'M02', 'samenvatting.json'), 'utf8'));
  assert.equal(m02.faalratio.seeds, 2); assert.equal(m02.faalratio.geslaagd, 1); assert.equal(m02.faalratio.faalratio, 0.5);
  assert.ok(fs.existsSync(path.join(out, 'M02', 'seed-2', 'review-brief.md')) && fs.existsSync(path.join(out, 'M02', 'review-brief.md')));
  assert.match(fs.readFileSync(path.join(out, 'M02', 'review-brief.md'), 'utf8'), /seed 2 \(de eerste die faalde\)/);
  assert.ok(fs.existsSync(path.join(out, 'overzicht.md')) && fs.existsSync(path.join(out, 'samenvatting.json')));
  assert.match(fs.readFileSync(path.join(out, 'overzicht.md'), 'utf8'), /\| M02 \| 1\/2 \| 0\.5 \|/);
  assert.equal(spawnSync(process.execPath, [new URL('./bot/proef.mjs', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')], { encoding: 'utf8' }).status, 2, 'zonder missies: een nette fout');
  fs.rmSync(out, { recursive: true, force: true });
});

console.log(`${n - fails}/${n} tests`);
process.exit(fails ? 1 : 0);
