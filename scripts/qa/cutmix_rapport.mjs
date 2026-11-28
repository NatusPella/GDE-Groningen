// HTML-rapport van de muziekmix (aaa30, 28-11): voor en na per scène, uit de Electron-metingen (scripts/qa/cutmix_live.mjs, cutmix.json)
// en uit de berekening over de echte scènedata (sfx/cutmix.js). Eén pagina met per scène een grafiek van het muziekniveau (dB ten opzichte van normaal)
// en de stemvensters, plus een tabel.
//   node scripts/qa/cutmix_rapport.mjs --out=<map> --meting=<map1>,<map2>,... [--sim=M01.intro,F2]
// De gemeten lijn is de gain van de muziekbus (audio.js musicBus) uit de echte run; de berekende lijn is simulateMix op dezelfde regels.
import fs from 'node:fs';
import path from 'node:path';
import * as M from '../../game/js/sfx/cutmix.js';
import { loadUnits } from '../lib/cutscene_data.mjs';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = path.resolve(arg('out', '.scr/cutmix-rapport'));
fs.mkdirSync(out, { recursive: true });
const metingen = arg('meting', '').split(',').filter(Boolean).map((d) => JSON.parse(fs.readFileSync(path.join(path.resolve(d), 'cutmix.json'), 'utf8')).results).filter((r) => r && r.mix);
const db = (g) => (g > 0.0005 ? 20 * Math.log10(g) : -60);
const W = 880, H = 190, PL = 44, PR = 10, PT = 12, PB = 24;
const svg = (title, tMax, series, windows, note) => {
  const x = (t) => PL + (t / tMax) * (W - PL - PR), y = (d) => PT + ((6 - Math.max(-60, Math.min(6, d))) / 66) * (H - PT - PB);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${title}"><rect width="${W}" height="${H}" fill="#fff"/>`;
  for (const w of windows) s += `<rect x="${x(w.from).toFixed(1)}" y="${PT}" width="${Math.max(1, x(w.to) - x(w.from)).toFixed(1)}" height="${H - PT - PB}" fill="#cfe3ff"/>`;
  for (const d of [0, -16, -30, -60]) s += `<line x1="${PL}" x2="${W - PR}" y1="${y(d)}" y2="${y(d)}" stroke="#ddd"/><text x="4" y="${y(d) + 4}" font-size="10" fill="#555">${d} dB</text>`;
  for (let t = 0; t <= tMax; t += 10) s += `<text x="${x(t)}" y="${H - 8}" font-size="10" fill="#555" text-anchor="middle">${t}s</text>`;
  for (const se of series) s += `<polyline fill="none" stroke="${se.kleur}" stroke-width="2" points="${se.punten.map(([t, d]) => `${x(t).toFixed(1)},${y(d).toFixed(1)}`).join(' ')}"/>`;
  return s + `</svg><div class="n">${note}</div>`;
};
const kop = '<span class="k" style="background:#d62728"></span> oude stand <span class="k" style="background:#1a7f37"></span> nieuwe mix <span class="k" style="background:#cfe3ff"></span> er wordt gesproken';
let html = `<!doctype html><meta charset="utf-8"><title>Cutscene-muziekmix voor en na</title><style>body{font:14px system-ui;margin:24px auto;max-width:940px;color:#111}h2{margin:28px 0 4px}.n{color:#555;font-size:12px;margin:2px 0 10px}.k{display:inline-block;width:14px;height:4px;vertical-align:middle;margin:0 4px 0 12px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:3px 8px;text-align:right}th:first-child,td:first-child{text-align:left}</style>`;
html += `<h1>Muziek onder spraak in cutscenes: voor en na</h1><p>Niveau van de muziekbus ten opzichte van normaal (0 dB). ${kop}. Niemand heeft dit beluisterd: de lijnen zijn de gemeten regeling (Electron met --audio-graph) en de berekening over de echte scènedata.</p>`;

for (const m of metingen) {
  const ref = Math.max(...m.mix.map((r) => r.baseBus || 0)) || 1; // het gewone muziekniveau van deze run (de bus voor de scène begon)
  const wins = M.speechWindows(m.lines.map((l) => ({ ...l })));
  const ser = [];
  const tab = [];
  for (const r of m.mix) {
    const smp = r.samples.map(([t, bus, stand, mixdb, talking, active]) => ({ t, bus, stand, talking, active }));
    const pts = smp.map((s) => [s.t, db(s.bus / ref)]);
    ser.push({ kleur: r.legacy ? '#d62728' : '#1a7f37', punten: pts });
    const inLine = smp.filter((s) => s.talking && s.active).map((s) => db(s.bus / ref));
    const quiet = smp.filter((s) => !s.talking && s.active).map((s) => db(s.bus / ref));
    tab.push([r.legacy ? 'oude stand' : 'nieuwe mix', inLine.length ? Math.max(...inLine).toFixed(1) : '-', inLine.length ? (inLine.reduce((a, b) => a + b, 0) / inLine.length).toFixed(1) : '-', quiet.length ? Math.max(...quiet).toFixed(1) : '-', r.scenario || 'radio', smp.length, r.legacy ? 'oude regeling' : (smp.find((s) => s.stand)?.stand || '-')]);
  }
  const tMax = Math.max(...m.mix.map((r) => r.samples[r.samples.length - 1][0]));
  html += `<h2>${m.scene}</h2>` + svg(m.scene, tMax, ser, wins, `gemeten, ${m.duur.toFixed(0)} s scène; de blauwe vakken zijn de stemvensters uit de regeldata (de echte stem schuift mee met de opnames)`);
  html += `<table><tr><th></th><th>max in regel (dB)</th><th>gem. in regel (dB)</th><th>max in stilte (dB)</th><th>muziekbron</th><th>monsters</th><th>stand</th></tr>${tab.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
}

const sim = arg('sim', 'M01.intro,M03.2,F2').split(',').filter(Boolean);
if (sim.length) {
  const data = await loadUnits();
  html += '<h1>Berekend over de scènedata</h1><p>Zelfde regels, andere bron: de opnameduren uit de manifesten en de regeltijden van de scènes. De oude stand is de vaste demping van vóór deze mix (radio -4,6 dB, scenarioloop -6 dB, thema -8 dB alleen in een regel).</p>';
  for (const id of sim) {
    const u = data.units.find((x) => x.id === id) || data.scriptUnits.find((x) => x.id === id);
    if (!u) continue;
    const s = M.simulateMix(u.lines, u.duration, undefined);
    const wins = s.windows;
    const ser = [
      { kleur: '#d62728', punten: s.samples.filter((_, i) => i % 5 === 0).map((x) => [x.t, x.t < u.duration ? M.legacyDb('radio', x.speaking) : 0]) },
      { kleur: '#1a7f37', punten: s.samples.filter((_, i) => i % 5 === 0).map((x) => [x.t, x.db]) },
    ];
    html += `<h2>${id} <small>(stand: ${s.mode}, ${(s.coverage * 100).toFixed(0)}% stem)</small></h2>` + svg(id, u.duration + 3, ser, wins, `berekend; in een regel hoogstens ${s.inLineMax.toFixed(1)} dB (toets: ${M.LINE_MAX_DB} dB), oude stand ${M.LEGACY_DB.radio.toFixed(1)} dB`);
  }
}
fs.writeFileSync(path.join(out, 'cutmix.html'), html);
console.log('geschreven: ' + path.join(out, 'cutmix.html'));
