// Test van de hertest-voorbereiding (docs/HERTEST-22-11.md), zonder Electron en zonder gh:
// (1) scripts/ui/hertest_scenes.js: elk issue met label hertest of wacht-beeld heeft een scene of vraag met de verplichte velden;
// (2) scripts/hertest_pack.mjs: planner, logparser, bewijsverzamelaar en de ene pagina, met nepbewijs;
// (3) scripts/hertest_sluit.mjs: validatie van het JSON-resultaat, het gh-plan en de dry-run als standaard.
//   node scripts/hertest_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadScenes, planRun, parseLog, collectEvidence, buildPage, SIZES, SCENES_FILE } from './hertest_pack.mjs';
import { validateResult, planCommands, OUTCOMES } from './hertest_sluit.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
let fails = 0; let n = 0;
const ok = (c, naam, extra) => { n++; if (!c) { fails++; console.log('FAIL', naam, extra !== undefined ? JSON.stringify(extra) : ''); } };

// De issues met label hertest (73) en wacht-beeld (25) op 22-11, samengevoegd (95 verschillende; 1081, 1127 en 1128 hebben beide labels).
const VERWACHT = [846, 882, 915, 917, 919, 922, 926, 943, 952, 953, 958, 962, 963, 981, 983, 986, 987, 989, 990, 995, 996, 999, 1000, 1001, 1002, 1003, 1004, 1007, 1008, 1009, 1013, 1015, 1016, 1018, 1019, 1020, 1021, 1023, 1027, 1029, 1030, 1036, 1038, 1039, 1040, 1044, 1046, 1047, 1052, 1053, 1057, 1061, 1063, 1064, 1069, 1070, 1073, 1075, 1076, 1077, 1079, 1080, 1081, 1083, 1084, 1085, 1087, 1088, 1092, 1093, 1102, 1110, 1117, 1120, 1122, 1126, 1127, 1128, 1129, 1130, 1138, 1141, 1146, 1147, 1148, 1152, 1153, 1154, 1156, 1160, 1164, 1171, 1173, 1177, 1185];
ok(VERWACHT.length === 95 && new Set(VERWACHT).size === 95, 'de verwachte lijst telt 95 verschillende issues', VERWACHT.length);

// --- (1) scene-definities
const scenes = await loadScenes();
const nummers = Object.keys(scenes).map(Number).sort((a, b) => a - b);
ok(JSON.stringify(nummers) === JSON.stringify([...VERWACHT].sort((a, b) => a - b)), 'alle issuenummers hebben een scene of vraag, en er is er geen te veel',
  { mist: VERWACHT.filter((x) => !scenes[x]), extra: nummers.filter((x) => !VERWACHT.includes(x)) });
const bron = fs.readFileSync(SCENES_FILE, 'utf8');
const geteld = [...bron.matchAll(/^(?:image|metric|question)\((\d+),/gm)].map((m) => Number(m[1]));
ok(geteld.length === new Set(geteld).size, 'geen issuenummer wordt twee keer gedefinieerd', geteld.filter((x, i) => geteld.indexOf(x) !== i));
ok(!/\.claude|C:\\\\Users/.test(bron), 'geen vaste paden van de eigen machine in de scenes');
for (const s of Object.values(scenes)) {
  const wie = '#' + s.nr;
  ok(Number(s.nr) > 0 && scenes[s.nr] === s, wie + ' het nummer klopt met de sleutel');
  ok(['image', 'metric', 'question'].includes(s.kind), wie + ' soort is image, metric of question', s.kind);
  for (const v of ['title', 'check', 'expected']) ok(typeof s[v] === 'string' && s[v].trim().length >= 8, wie + ' veld ' + v + ' is gevuld');
  ok(Array.isArray(s.sizes) && s.sizes.length > 0 && s.sizes.every((m) => SIZES.includes(m)), wie + ' maten zijn 1280x720 en/of 1920x1080', s.sizes);
  ok(/\p{L}/u.test(s.title) && !/^x$/i.test(s.title), wie + ' titel is echte tekst');
  if (s.kind === 'image') {
    ok(typeof s.run === 'function', wie + ' beeldscene heeft een run');
    ok(s.captures.length > 0 && s.captures.every((c) => /^[A-Za-z0-9_]+$/.test(c)) && new Set(s.captures).size === s.captures.length, wie + ' vangt beelden met bestandsveilige, unieke namen', s.captures);
    const src = String(s.run);
    // elke aangekondigde opname komt in de code voor (de grote momenten lopen via de lijst SOORTEN)
    for (const c of s.captures) ok(src.includes("'" + c + "'") || src.includes('SOORTEN'), wie + ' opname ' + c + ' wordt ook gemaakt');
    for (const m of s.metrics) ok(src.includes("'" + m + "'"), wie + ' meting ' + m + ' wordt ook gelogd');
  } else if (s.kind === 'metric') {
    ok(typeof s.run === 'function' && s.metrics.length > 0, wie + ' metingscene heeft run en metingen');
    for (const m of s.metrics) ok(String(s.run).includes("'" + m + "'"), wie + ' meting ' + m + ' wordt ook gelogd');
  } else {
    ok(!s.run, wie + ' een vraag heeft geen scene');
    ok(s.steps.length > 0 || s.questions.length > 0, wie + ' een vraag zegt wat de mens moet doen');
  }
  ok(!s.early || s.kind === 'image', wie + ' vroege scenes zijn beeldscenes');
}
const soorten = { image: 0, metric: 0, question: 0 };
for (const s of Object.values(scenes)) soorten[s.kind]++;
ok(soorten.image >= 40 && soorten.question >= 20, 'een flink deel heeft een scene en wat alleen een mens kan staat als vraag', soorten);
const plan = planRun(scenes);
ok(Object.keys(plan).every((m) => SIZES.includes(m)), 'het plan kent alleen bekende maten');
ok(planRun(scenes, ['1177']).constructor === Object && Object.values(planRun(scenes, ['1177'])).flat().every((x) => x === 1177), '--only beperkt het plan');
ok(!Object.values(plan).flat().some((x) => scenes[x].kind === 'question'), 'vragen komen niet in het plan');

// --- (2) pagina en bewijs, met nepbewijs
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hertest-test-'));
try {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  fs.mkdirSync(path.join(tmp, '1920x1080'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '1920x1080', '1920x1080-h1177-a.png'), png);
  fs.writeFileSync(path.join(tmp, '1920x1080', '1920x1080-h919-schuin.png'), png);
  const ev1 = { nr: 953, size: '1920x1080', status: 'ok', notes: [], metrics: { natteCellen: 0, gemetenCellen: 441 }, shots: ['a', 'b'] };
  const ev2 = { nr: 919, size: '1920x1080', status: 'error', notes: ['FOUT: <b>kapot</b>'], metrics: {}, shots: ['schuin'] };
  fs.writeFileSync(path.join(tmp, '1920x1080', '_log-1920x1080.txt'), ['[renderer] ruis', '[hertest] ' + JSON.stringify(ev1), '[hertest] {kapot', '[hertest] ' + JSON.stringify(ev2)].join('\n'));
  ok(parseLog('x\n[hertest] {"nr":5}\n[hertest] {"a":1}\n[hertest] {fout').length === 1, 'parseLog slaat halve regels en regels zonder nr over');
  const ev = collectEvidence(tmp);
  ok(ev[1177] && ev[1177].shots.length === 1 && ev[1177].shots[0].name === 'a', 'collectEvidence vindt het beeld van 1177');
  ok(ev[953] && ev[953].runs.length === 1 && ev[953].runs[0].metrics.natteCellen === 0, 'collectEvidence leest de meting van 953');
  ok(ev[919].runs[0].status === 'error' && ev[919].shots.length === 1, 'collectEvidence houdt een mislukte run en zijn beeld');
  const pagina = buildPage(scenes, ev, { date: '2026-11-22', images: 'inbed', repo: 'eigenaar/naam' });
  ok(pagina.startsWith('<!doctype html>'), 'de pagina is een HTML-document');
  ok((pagina.match(/<article id="i\d+"/g) || []).length === 95, 'de pagina heeft een blok per issue (95)');
  for (const nr of VERWACHT) ok(pagina.includes(`<article id="i${nr}" data-nr="${nr}">`), '#' + nr + ' staat op de pagina');
  ok((pagina.match(/data-k="fixed"/g) || []).length === 95 && (pagina.match(/data-k="not-yet"/g) || []).length === 95 && (pagina.match(/data-k="new-point"/g) || []).length === 95, 'elk blok heeft Opgelost, Nog niet en Nieuw punt');
  ok(pagina.includes('data:image/png;base64,') && !/src="[^d"][^"]*\.png"/.test(pagina), 'beelden zitten in de pagina zelf (een bestand)');
  ok(pagina.includes('natteCellen') && pagina.includes('441'), 'de meting staat op de pagina');
  ok(!pagina.includes('<b>kapot</b>') && pagina.includes('&lt;b&gt;kapot&lt;/b&gt;'), 'notities worden ge-escaped');
  ok(pagina.includes('href="https://github.com/eigenaar/naam/issues/1177"'), '--repo maakt het nummer een link');
  ok(/Alleen een mens kan dit beoordelen/.test(pagina) && /Geen scene/.test(pagina), 'vragen zonder scene zijn als zodanig gemarkeerd');
  ok(/De scene is mislukt|De scene gaf een fout/.test(pagina), 'een mislukte scene wordt eerlijk gemeld');
  const js = pagina.match(/<script>([\s\S]*)<\/script>/)[1];
  let syntaxOk = true; try { new vm.Script(js); } catch (e) { syntaxOk = false; }
  ok(syntaxOk, 'het script in de pagina is geldig JavaScript');
  // het resultaat van de paginascript: draai het met een minimale nep-DOM en controleer het JSON dat eruit komt
  const arts = [{ dataset: { nr: '1177' } }, { dataset: { nr: '919' } }];
  const stub = { ta: { value: '' }, tel: {}, uit: { value: '' } };
  const knoppen = (a) => ['fixed', 'not-yet', 'new-point'].map((k) => ({ dataset: { k }, setAttribute() {}, onclick: null }));
  for (const a of arts) { a.knoppen = knoppen(a); a.querySelector = () => stub.ta; a.querySelectorAll = () => a.knoppen; }
  const doc = { querySelectorAll: () => arts, getElementById: (id) => (id === 'tel' ? stub.tel : id === 'uitvoer' ? stub.uit : { onclick: null, select() {}, set textContent(v) {} }) };
  const opslag = {};
  vm.runInNewContext(js, { document: doc, localStorage: { getItem: () => null, setItem: (k, v) => { opslag[k] = v; } }, navigator: {}, JSON });
  arts[0].knoppen[0].onclick();
  const uit = JSON.parse(stub.uit.value);
  ok(uit.version === 1 && uit.run === 'hertest-22-11' && uit.results.length === 1 && uit.results[0].issue === 1177 && uit.results[0].outcome === 'fixed', 'een klik op Opgelost geeft het juiste JSON-resultaat', uit);
  ok(validateResult(uit).ok, 'het resultaat van de pagina is geldig voor hertest_sluit');
  const verw = buildPage(scenes, ev, { images: 'verwijs', baseDir: tmp });
  ok(!verw.includes('data:image/png') && verw.includes('1920x1080/1920x1080-h1177-a.png'), 'met --beelden=verwijs staan relatieve paden in de pagina');
  const leeg = buildPage(scenes, {}, {});
  ok(/Nog niet gedraaid/.test(leeg), 'zonder bewijs zegt de pagina dat de scene nog niet gedraaid is');

  // --- (3) sluiten
  const goed = { version: 1, run: 'hertest-22-11', date: '2026-11-22', results: [{ issue: 1177, outcome: 'fixed', note: '' }, { issue: 919, outcome: 'not-yet', note: 'dek nog doorzichtig' }, { issue: 953, outcome: 'new-point', note: 'steiger zweeft' }] };
  ok(validateResult(goed).ok && validateResult(goed).results.length === 3, 'een geldig resultaat wordt geaccepteerd');
  ok(OUTCOMES.join() === 'fixed,not-yet,new-point', 'de uitkomsten zijn fixed, not-yet, new-point');
  ok(!validateResult(null).ok && !validateResult({ version: 2, results: [] }).ok && !validateResult({ version: 1 }).ok, 'ongeldige vorm wordt geweigerd');
  ok(!validateResult({ version: 1, results: [{ issue: 'x', outcome: 'fixed' }] }).ok, 'een issue zonder nummer wordt geweigerd');
  ok(!validateResult({ version: 1, results: [{ issue: 5, outcome: 'gesloten' }] }).ok, 'een onbekende uitkomst wordt geweigerd');
  ok(!validateResult({ version: 1, results: [{ issue: 5, outcome: 'fixed' }, { issue: 5, outcome: 'fixed' }] }).ok, 'een dubbel issue wordt geweigerd');
  ok(!validateResult({ version: 1, results: [{ issue: 5, outcome: 'not-yet', note: ' ' }] }).ok, 'Nog niet zonder opmerking wordt geweigerd');
  const cmds = planCommands(validateResult(goed).results, { datum: '22-11' });
  const sluit = cmds.filter((c) => c.sluit);
  ok(sluit.length === 1 && sluit[0].issue === 1177 && sluit[0].args.slice(0, 3).join(' ') === 'issue close 1177', 'alleen het Opgelost-issue krijgt een close');
  ok(cmds.filter((c) => c.issue === 919).every((c) => c.args[1] === 'comment'), 'Nog niet blijft open: alleen een comment');
  ok(cmds.filter((c) => c.issue === 953).length === 1 && cmds.find((c) => c.issue === 953).nieuwPunt, 'Nieuw punt geeft alleen een comment');
  ok(cmds.every((c) => c.args[0] === 'issue'), 'het plan bevat alleen gh issue-opdrachten');
  // dry-run is de standaard: draait geen gh (het pad bestaat niet) en sluit dus niets
  const bestand = path.join(tmp, 'resultaat.json'); fs.writeFileSync(bestand, JSON.stringify(goed));
  const r = spawnSync(process.execPath, [path.join(dir, 'hertest_sluit.mjs'), '--bestand=' + bestand, '--gh=' + path.join(tmp, 'bestaat-niet')], { encoding: 'utf8' });
  ok(r.status === 0 && /Dry-run/.test(r.stdout) && /\[dry-run\] gh issue close 1177/.test(r.stdout) && /NIEUW PUNT/.test(r.stdout), 'zonder --apply is het een dry-run', r.stdout + r.stderr);
  const slecht = path.join(tmp, 'slecht.json'); fs.writeFileSync(slecht, JSON.stringify({ version: 1, results: [{ issue: 1, outcome: 'nee' }] }));
  const r2 = spawnSync(process.execPath, [path.join(dir, 'hertest_sluit.mjs'), '--bestand=' + slecht], { encoding: 'utf8' });
  ok(r2.status === 2 && /onbekende uitkomst/.test(r2.stderr), 'een ongeldig resultaat stopt met code 2');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(fails ? `${fails} van ${n} controles gefaald` : `hertest_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
