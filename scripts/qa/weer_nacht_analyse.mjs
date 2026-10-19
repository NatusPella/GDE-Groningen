// Verwerkt een runmap van scripts/qa/weer_nacht.mjs: beeldcontroles per screenshot (weernachtlogic.mjs), een contactblad
// per plek (tijdstippen als kolommen, weer als rijen), frametijden en een markdown-overzicht.
//   node scripts/qa/weer_nacht_analyse.mjs <map>
// Schrijft metrics.json, bevindingen.json, overzicht.md en contact-<plek>.png in <map>.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const L = await import(pathToFileURL(path.join(HERE, 'weernachtlogic.mjs')).href);
const { decodePng } = await import(pathToFileURL(path.join(HERE, '..', 'bot', 'analysis.mjs')).href);
const dir = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(path.join(dir, 'cfg.json'))) { console.error('gebruik: node scripts/qa/weer_nacht_analyse.mjs <map met cfg.json>'); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'cfg.json'), 'utf8'));
const result = fs.existsSync(path.join(dir, 'result.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8')) : {};
const tijden = [...new Set(cfg.matrix.map((c) => c.tijd))];
const weers = [...new Set(cfg.matrix.map((c) => c.weer))];
const load = (name) => { const f = path.join(dir, `shots-${name}.png`); return fs.existsSync(f) ? decodePng(fs.readFileSync(f)) : null; };

const metrics = {}, findings = [];
let missing = 0;
for (const S of cfg.plekken) {
  const cells = weers.map(() => tijden.map(() => null));
  const luchtCells = weers.map(() => tijden.map(() => null));
  for (const c of cfg.matrix) {
    const name = L.shotName(S.naam, c);
    const img = load(name);
    if (!img) { missing++; findings.push({ plek: S.naam, tijd: c.tijd, weer: c.weer, vlaggen: ['screenshot ontbreekt'] }); continue; }
    const m = L.measure(img);
    const luchtImg = load(`${name}-lucht`);
    if (luchtImg) { const lm = L.measure(luchtImg); Object.assign(m, { banding: lm.banding, stars: lm.stars, starFlux: lm.starFlux, skyBright: lm.skyBright, zenith: lm.zenith, horizon: lm.horizon, luchtMean: Math.round(lm.mean) }); }
    const refImg = c.weer === 'helder' ? null : load(L.shotName(S.naam, { tijd: c.tijd, weer: 'helder' }));
    const ref = refImg ? L.measure(refImg) : null;
    const vlaggen = L.judge(c, m, ref, S.soort);
    if (c.weer === 'helder' && (c.tijd === 'middag' || c.tijd === 'nacht')) {
      const means = [img, load(`${name}-b`), load(`${name}-c`)].filter(Boolean).map((i) => L.exposure(i).mean);
      m.flikker = Math.round(L.flicker(means) * 10) / 10;
      if (m.flikker > 6) vlaggen.push(`flikker: helderheid springt ${m.flikker} tussen opeenvolgende beelden`);
    }
    metrics[name] = m;
    if (vlaggen.length) findings.push({ plek: S.naam, tijd: c.tijd, weer: c.weer, shot: name, vlaggen });
    cells[weers.indexOf(c.weer)][tijden.indexOf(c.tijd)] = L.downscale(img, 192, 108);
    if (luchtImg) luchtCells[weers.indexOf(c.weer)][tijden.indexOf(c.tijd)] = L.downscale(luchtImg, 192, 108);
  }
  fs.writeFileSync(path.join(dir, `contact-${S.naam}.png`), L.contactSheet(cells, 192, 108));
  fs.writeFileSync(path.join(dir, `contact-${S.naam}-lucht.png`), L.contactSheet(luchtCells, 192, 108));
}
fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify(metrics, null, 1));
fs.writeFileSync(path.join(dir, 'bevindingen.json'), JSON.stringify(findings, null, 1));

const md = ['# Weer, dag en nacht: overzicht van de run', '', `Map: ${dir}`, `Plekken: ${cfg.plekken.map((s) => s.naam).join(', ')}. Tijdstippen (kolommen): ${tijden.join(', ')}. Weer (rijen): ${weers.join(', ')}.`, `Screenshots ontbreken: ${missing}.`, ''];
md.push('## Frametijden met effecten (ms)', '', '| Plek | Instelling | fps | p50 | p95 | max | haperingen >50 ms |', '|---|---|---|---|---|---|---|');
for (const [naam, info] of Object.entries(result.plekken || {})) for (const [k, v] of Object.entries(info.perf || {})) md.push(`| ${naam} | ${k} | ${v.fps} | ${v.p50} | ${v.p95} | ${v.max} | ${v.hapert} |`);
md.push('', '## Automatische vlaggen', '');
if (!findings.length) md.push('Geen.');
for (const f of findings) md.push(`- ${f.plek} ${f.tijd} ${f.weer}: ${f.vlaggen.join('; ')}`);
md.push('', '## Kleurverloop van de lucht (helder, gemiddelde kleur bovenaan en bij de horizon)', '', '| Plek | Tijdstip | Zenit (rgb) | Horizon (rgb) | gem. helderheid lucht | sterren |', '|---|---|---|---|---|---|');
for (const S of cfg.plekken.slice(0, 3)) for (const t of tijden) { const m = metrics[L.shotName(S.naam, { tijd: t, weer: 'helder' })]; if (m) md.push(`| ${S.naam} | ${t} | ${m.zenith.join(',')} | ${m.horizon.join(',')} | ${m.luchtMean ?? '-'} | ${m.stars} |`); }
fs.writeFileSync(path.join(dir, 'overzicht.md'), md.join('\n') + '\n');
console.log(`${Object.keys(metrics).length} beelden gemeten, ${findings.length} vlaggen, ${missing} ontbreken. overzicht: ${path.join(dir, 'overzicht.md')}`);
