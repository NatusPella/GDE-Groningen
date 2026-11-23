// Test van de video-QA-pijplijn (hervatten in delen, scripts/videoqa/run.mjs) en het eindrapport van de kwaliteitsmachine
// (scripts/kwaliteit/eindrapport.mjs), zonder Electron of ffmpeg: met een nagemaakte uitvoermap in .scr/.
//   node scripts/kwaliteit_rapport_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { volgendDeel, deelBeelden } from './videoqa/run.mjs';
import { kopregels, leesVideoqa, eindrapportHtml } from './kwaliteit/eindrapport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (c, naam, extra) => { if (!c) { fails++; console.log('FAIL', naam, extra !== undefined ? JSON.stringify(extra) : ''); } };

// ---------- hervatten in delen (puur) ----------
const st = (delen, doel = 1800) => ({ doelSeconden: doel, seed: 5, delen });
const d1 = volgendDeel(st([]), { deelSeconden: 600 });
ok(d1 && d1.naam === 'deel-01' && d1.seconden === 600 && d1.seed === 5, 'het eerste deel: 10 minuten met de basisseed', d1);
const d3 = volgendDeel(st([{ seconden: 600 }, { seconden: 420 }]), { deelSeconden: 600 });
ok(d3 && d3.naam === 'deel-03' && d3.seconden === 600 && d3.seed === 7, 'na een afgebroken deel: het volgende deel met een nieuwe seed', d3);
const rest = volgendDeel(st([{ seconden: 600 }, { seconden: 600 }, { seconden: 500 }]), { deelSeconden: 600 });
ok(rest && rest.seconden === 100, 'het laatste deel neemt alleen de rest op', rest);
ok(volgendDeel(st([{ seconden: 1200 }, { seconden: 600 }])) === null, 'doel gehaald: geen deel meer');
ok(volgendDeel(st([{ seconden: 600 }, { seconden: 0 }, { seconden: 2 }])) === null, 'twee delen achter elkaar zonder beelden: stoppen in plaats van eindeloos herstarten');
ok(volgendDeel(st(Array.from({ length: 8 }, () => ({ seconden: 10 }))), { maxPogingen: 8 }) === null, 'na het maximum aantal pogingen: stoppen');

// ---------- nagemaakte uitvoer ----------
const werk = path.join(ROOT, '.scr', `kwaliteit-rapport-test-${process.pid}`);
try {
  const vq = path.join(werk, 'videoqa'), deel = path.join(vq, 'deel-01'), deel2 = path.join(vq, 'deel-02');
  fs.mkdirSync(path.join(deel, 'sheets'), { recursive: true }); fs.mkdirSync(deel2, { recursive: true });
  fs.writeFileSync(path.join(deel, 'tele-000.json'), JSON.stringify({ rows: Array.from({ length: 90 }, (_, i) => [i, 5, 0, 0, 20, 1000, 50]), snaps: [] }));
  ok(deelBeelden(deel) === 90, 'zonder opname.json telt de telemetrie (een afgebroken deel)');
  fs.writeFileSync(path.join(deel, 'opname.json'), JSON.stringify({ frames: 120, fps: 30 }));
  ok(deelBeelden(deel) === 120, 'met opname.json telt die');
  const stat = { frames: 120, fps: 30, seconds: 4, segments: 1, rekentijdMs: { mediaan: 5, p99: 9, max: 12 }, streamWacht: { aandeel: 0.01 }, nanRegels: 0, tekstOverlap: { metingen: 2, kandidaten: 1 } };
  fs.writeFileSync(path.join(deel, 'analyse.json'), JSON.stringify({ stat, kandidaten: [{ kind: 'zwart', frame: 3, tstr: '0:00.1', score: 4, note: 'zwart beeld 4 beelden' }, { kind: 'tekst-overlap', frame: 60, tstr: '0:02.0', score: 2, note: '1 overlap: div#a over div#b' }] }));
  fs.writeFileSync(path.join(deel, 'sheets', 'vel-001-0.jpg'), 'x');
  fs.writeFileSync(path.join(deel, 'run.log'), '[2026-11-23 10:00:00] start\n[2026-11-23 10:01:00] hartslag 1.0 min: pid 1\n');
  fs.writeFileSync(path.join(vq, 'samenvatting.json'), JSON.stringify({ doelSeconden: 1800, opgenomenSeconden: 4, doelGehaald: false, delen: [{ naam: 'deel-01', seconden: 4 }, { naam: 'deel-02', seconden: 0 }] }));
  const v = leesVideoqa(vq);
  ok(v && v.delen.length === 2 && v.delen[0].analyse && v.delen[0].vellen.length === 1 && !v.delen[1].analyse, 'leesVideoqa vindt de delen, analyses en vellen', v && v.delen.map((d) => d.naam));
  const regressie = { rijen: [{ id: 'stad', titel: 'Stad', staat: 'afwijking', ssim: 0.8, aandeelSlecht: 0.1, redenen: ['SSIM 0.8 < 0.9'] }, { id: 'kaart', staat: 'gelijk', ssim: 0.99, aandeelSlecht: 0 }], afwijkend: 1, nieuw: 0, ontbreekt: 0, fouten: 0, refDir: 'ref' };
  const kop = kopregels({ regressie, videoqa: v });
  ok(kop[0].soort === 'fout' && /1 afwijkend/.test(kop[0].tekst), 'kopregel beeldregressie: een afwijking is actie', kop[0]);
  ok(kop[1].soort === 'fout' && /deel\/delen zonder analyse/.test(kop[1].tekst), 'kopregel video-QA: doel niet gehaald en een deel zonder analyse', kop[1]);
  const leeg = kopregels({ regressie: null, videoqa: null });
  ok(leeg.every((k) => k.soort === 'overgeslagen' && /niet gedraaid/.test(k.tekst)), 'niets gedraaid: beide staan als niet gedraaid, nooit stil groen');
  const html = eindrapportHtml({ regressie, regDir: path.join(werk, 'regressie'), videoqa: v, uitDir: werk, runs: [path.join(deel, 'run.log')] });
  ok(/<html lang="nl">/.test(html) && /Beeldregressie/.test(html) && /Video-QA/.test(html) && /Runnerlogboeken/.test(html), 'één pagina met alle onderdelen');
  ok(/tekst-overlap/.test(html) && /zwart beeld 4 beelden/.test(html), 'de kandidaten per soort staan erin');
  ok(/src="videoqa\/deel-01\/sheets\/vel-001-0\.jpg"/.test(html), 'contactvellen als relatieve link', html.match(/src="[^"]*vel[^"]*"/));
  ok(/<td>1<\/td>/.test(html), 'het aantal hartslagen uit run.log staat erbij');
  ok(!/https?:\/\//.test(html), 'het rapport haalt niets van buiten');
} finally { fs.rmSync(werk, { recursive: true, force: true }); }

// ---------- releasegate-stap 'beeldregressie bekeken' (waarschuwt, blokkeert niet) ----------
const { checkBeeldregressieBekeken, BEELDREGRESSIE_FILE, MAX_DAGEN } = await import('./release/beeldregressiebekeken.mjs');
const vandaag = '2026-11-23';
const goed = { datum: '2026-11-22', status: 'akkoord', afwijkend: 0, rapport: 'x/rapport.html' };
ok(BEELDREGRESSIE_FILE === 'release/beeldregressie-bekeken.json', 'het bewijsbestand staat waar de documentatie zegt');
ok(checkBeeldregressieBekeken(goed, { vandaag }).ok, 'een vers bewijs is in orde');
const geen = checkBeeldregressieBekeken(null, { vandaag });
ok(!geen.ok && /blokkeert niet/.test(geen.samenvatting) && geen.waarschuwingen.length === 1, 'zonder bewijs: een waarschuwing die zegt dat hij niet blokkeert');
ok(!checkBeeldregressieBekeken({ ...goed, datum: '2026-10-01' }, { vandaag }).ok, `ouder dan ${MAX_DAGEN} dagen: waarschuwing`);
ok(!checkBeeldregressieBekeken({ ...goed, afwijkend: 2 }, { vandaag }).ok, 'akkoord met open afwijkingen: waarschuwing');
ok(checkBeeldregressieBekeken({ ...goed, afwijkend: 2, status: 'afwijkingen verwerkt' }, { vandaag }).ok, 'afwijkingen verwerkt mag met afwijkingen');
ok(!checkBeeldregressieBekeken({ ...goed, status: 'gezien' }, { vandaag }).ok, 'een onbekende status: waarschuwing');
const gate = fs.readFileSync(path.join(ROOT, 'scripts', 'release_gate.mjs'), 'utf8');
ok(/checkBeeldregressieBekeken\(/.test(gate) && /v\.waarschuwingen = \[/.test(gate), 'release_gate.mjs --verify toont de stap als waarschuwing');
const docRg = fs.readFileSync(path.join(ROOT, 'docs', 'RELEASEGATE.md'), 'utf8');
ok(/beeldregressie-bekeken\.json/.test(docRg) && /KWALITEITSMACHINE\.md/.test(docRg), 'RELEASEGATE.md beschrijft de stap en verwijst naar de kwaliteitsmachine');
ok(/KWALITEITSMACHINE\.md/.test(fs.readFileSync(path.join(ROOT, 'docs', 'TESTEN.md'), 'utf8')), 'TESTEN.md verwijst naar de kwaliteitsmachine');

console.log(fails ? `kwaliteit_rapport_test: ${fails} mislukt` : 'kwaliteit_rapport_test: ok');
process.exit(fails ? 1 : 0);
