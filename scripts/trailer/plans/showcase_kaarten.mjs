// Maakt de kaart-JSON's (shots/kaarten.page.js) voor de showcase-trailer uit het cijferblad (plans/cijfers.mjs) en uit git en de echte uitvoer van een paar testscripts.
// Niets is verzonnen: ontbreekt een cijfer in het blad, dan stopt dit script. Schrijft <map>/<naam>.json per kaart en <map>/kaarten.lijst.json.
//   node scripts/trailer/plans/showcase_kaarten.mjs --out=<map> [--cijfers=<blad.json>]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadCijfers } from './cijfers.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(opt('out', 'kaarten'));
fs.mkdirSync(OUT, { recursive: true });
const cij = loadCijfers(opt('cijfers', ''));
const BAR = 4 * 60 / 119.474; // een maat van de muziek (119,474 bpm)
// korte labels voor op het scherm (het cijferblad heeft lange, technische labels)
const KORT = { 'wereld.oppervlak_km2': 'km² speelgebied', 'wereld.gebouwen': 'gebouwen', 'wereld.dorpen': 'dorpen', 'wereld.stations': 'treinstations', 'git.kalenderdagen': 'dagen, van eerste tot laatste commit', 'code.regels_code': 'regels programmacode', 'code.spelmodules': 'modules in het spel', 'releases.aantal': 'releases' };
const waarde = (id) => { const c = cij.get(id); return { tekst: c.tekst, waarde: Number(c.tekst.replace(/\./g, '').replace(',', '.')), label: KORT[id] || c.label }; };
const run = (cmd, a) => spawnSync(cmd, a, { cwd: ROOT, encoding: 'utf8' });

// commits per kalenderdag uit git
const dagen = new Map();
for (const d of run('git', ['log', '--format=%cd', '--date=short']).stdout.split(/\r?\n/).filter(Boolean)) dagen.set(d, (dagen.get(d) || 0) + 1);
const sorted = [...dagen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
// ook de dagen zonder commits meetellen (de balk is er dan leeg)
const alle = [];
for (let d = new Date(sorted[0][0] + 'T00:00:00Z'); d <= new Date(sorted[sorted.length - 1][0] + 'T00:00:00Z'); d = new Date(d.getTime() + 86400000)) { const k = d.toISOString().slice(0, 10); alle.push([k, dagen.get(k) || 0]); }

// echte uitvoer van een paar testscripts
const regels = [];
for (const t of ['a11y', 'activityhub', 'bewegingrules', 'reisbeats']) {
  const f = `scripts/${t}_test.mjs`;
  if (!fs.existsSync(path.join(ROOT, f))) continue;
  const r = run(process.execPath, [f]);
  const last = (r.stdout + r.stderr).trim().split(/\r?\n/).pop();
  regels.push(`$ node ${f}`, `${r.status === 0 ? '✓' : 'FOUT'} ${last}`);
}
const nTests = run('git', ['ls-files', 'scripts/*_test.mjs']).stdout.split(/\r?\n/).filter(Boolean).length;

const kaarten = [
  { name: 'kaart-schaal', kind: 'cijfers', dur: 3 * BAR, kop: 'Een hele provincie', items: ['wereld.oppervlak_km2', 'wereld.gebouwen', 'wereld.dorpen', 'wereld.stations'].map((id) => { const w = waarde(id); return { waarde: w.waarde, label: w.label }; }), step: 0.4 },
  { name: 'kaart-dagen', kind: 'cijfers', dur: 2 * BAR, kop: 'Eén opdracht', items: [{ waarde: waarde('git.kalenderdagen').waarde, label: waarde('git.kalenderdagen').label }], sub: 'en daarna een spel' },
  { name: 'kaart-grafiek', kind: 'grafiek', dur: 3 * BAR, kop: 'Commits per dag', dagen: alle, sub: `${cij.get('git.commits').tekst} ${cij.get('git.commits').label}`, groei: 2.8 },
  { name: 'kaart-sessies', kind: 'sessies', dur: 3 * BAR, kop: 'AI-sessies naast elkaar, elk met een eigen werkmap', aantal: waarde('sessies.branches_sessies').waarde, sub: `${cij.get('sessies.branches_sessies').tekst} sessies (ondergrens)`, groei: 2.6 },
  { name: 'kaart-testrapport', kind: 'bord', dur: 2 * BAR, kop: 'De laatste testronde, zoals hij was', kolommen: [['Geslaagd', 'tests.rapport_pass'], ['Mislukt', 'tests.rapport_fail'], ['Te traag', 'tests.rapport_timeout'], ['Niet gedraaid', 'tests.rapport_skip']].map(([kop, id]) => ({ kop, waarde: waarde(id).waarde })), sub: `${cij.get('tests.rapport_items').tekst} items, ${cij.get('tests.rapport_duur_min').tekst} minuten: niet groener gemaakt dan het was` },
  { name: 'kaart-schatting', kind: 'balken', dur: 3 * BAR, kop: 'Schatting, geen meting', balken: [{ label: 'Traditioneel', tekst: '10 tot 40 persoonsjaar', breedte: 1, rood: true }, { label: 'Met AI', tekst: `${cij.get('git.kalenderdagen').tekst} dagen`, breedte: 0.035 }], sub: 'de schatting en haar aannames staan in de toelichting' },
  { name: 'kaart-bord', kind: 'bord', dur: 2 * BAR, kop: 'Een projectbord houdt het bij', kolommen: [{ kop: 'Issues', ...waarde('issues.totaal') }, { kop: 'Bugs opgelost', ...waarde('issues.bugs_gesloten') }, { kop: 'Releases', ...waarde('releases.aantal') }].map((k) => ({ kop: k.kop, waarde: k.waarde })), sub: 'wensen en bugs, met een bord' },
  { name: 'kaart-tests', kind: 'terminal', dur: 3 * BAR, kop: 'Geautomatiseerde tests', regels, step: 0.35, sub: `${cij.get('tests.testscripts').tekst} testscripts in de repo` },
  { name: 'kaart-code', kind: 'cijfers', dur: 2 * BAR, kop: 'Onder de motorkap', items: ['code.regels_code', 'code.spelmodules', 'releases.aantal'].map((id) => { const w = waarde(id); return { waarde: w.waarde, label: w.label }; }), step: 0.35 },
  { name: 'kaart-opdracht', kind: 'tekst', dur: 2 * BAR, kop: 'De opdracht', lines: ['“Maak een grappig open-wereldspel in het echte Groningen.”'], step: 0.6 },
  { name: 'kaart-advies', kind: 'tekst', dur: 3 * BAR, kop: 'Wat betekent dat voor jou?', lines: ['Begin met één scherpe opdracht.', 'Bouw de controle mee.', 'Houd de mens bij <em>smaak en merk</em>.'], step: 0.7 },
  { name: 'kaart-eerlijk-1', kind: 'tekst', dur: 2 * BAR, lines: ['Mensen sturen.', 'Mensen testen.', 'Mensen <em>beslissen</em>.'], step: 0.6 },
  { name: 'kaart-eerlijk-2', kind: 'tekst', dur: 3 * BAR, lines: ['Het is een pre-release.', 'Niet alles is af.'], sub: 'Smaak, toon en risico blijven mensenwerk.', step: 0.7 },
];
fs.writeFileSync(path.join(OUT, 'kaarten.lijst.json'), JSON.stringify(kaarten.map((k) => k.name)));
for (const k of kaarten) fs.writeFileSync(path.join(OUT, k.name + '.json'), JSON.stringify(k, null, 1));
console.log(`${kaarten.length} kaarten in ${OUT}; blad: ${cij.file}; ${nTests} testscripts; ${alle.length} dagen`);
