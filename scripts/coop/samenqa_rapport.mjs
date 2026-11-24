// Samen-qa 24-11: één webpagina met per scenario de schermafbeeldingen van host en gast, de gemeten waarden en het oordeel.
//   node scripts/coop/samenqa_rapport.mjs --runs=<testbank-uitvoer>[,<nog een>] --oordeel=<oordeel.json> --out=<map>
// oordeel.json: { "<scenario-id>": { "oordeel": "werkt" | "werkt niet (gefixt)" | "werkt niet" | "niet te testen", "tekst": "..." }, ... }
// Een scenario neemt de schermafbeeldingen (shots-<naam>.png) en de logregels (events.jsonl) van host en gast die bij zijn
// voorvoegsels passen. De afbeeldingen worden naast de pagina gekopieerd; de pagina laadt niets van buiten.
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const RUNS = String(arg('runs', '')).split(',').filter(Boolean).map((r) => path.resolve(r));
const OUT = path.resolve(arg('out', 'samenqa-rapport'));
const OORDEEL = arg('oordeel', '') ? JSON.parse(fs.readFileSync(path.resolve(arg('oordeel')), 'utf8')) : {};

export const SCENARIOS = [
  { id: 'wie', titel: 'Wizard: naamkaart en Wie ben jij? (wie-verder)', shots: ['naamkaart-', 'wie-', 'lobby-verbonden', 'spel-samen'], events: ['naamkaart', 'wie-ben-jij', 'verbonden'] },
  { id: 'mensen', titel: 'Quaternius-mensen: host en gast tegenover elkaar, kleding uit de kledingcode', shots: ['qa-mensen-'], events: ['qa-mensen-'] },
  { id: 'warp-m11', titel: 'Groepswarp M11 (warp of reisscène, storytravel.placeParty)', shots: ['qa-warp-m11-'], events: ['qa-warp-m11-'] },
  { id: 'warp-m20', titel: 'Groepswarp M20 (landing na de sprong, warpGasten)', shots: ['qa-warp-m20-'], events: ['qa-warp-m20-'] },
  { id: 'warp-m06', titel: 'Groepswarp M06 (vluchtboot, gastenMeeAanBoord) en weer aan wal', shots: ['qa-warp-m06-'], events: ['qa-warp-m06-'] },
  { id: 'wolf', titel: 'Provinciedieren: de wolf (dierbericht, beet per speler)', shots: ['qa-wolf'], events: ['qa-wolf'] },
  { id: 'stad', titel: 'Levende stad: straatgebeurtenis, dagritme (klok) bij de gast', shots: ['qa-stad-'], events: ['qa-stad-'] },
  { id: 'halte', titel: 'Bushalte: de gast ziet de lijnbus stoppen en de in- en uitstappers', shots: ['qa-halte-'], events: ['qa-halte-'] },
  { id: 'treffer', titel: 'Raakbevestiging voor de kogel van een gast (#1290)', shots: ['qa-treffer-'], events: ['qa-treffer-'] },
  { id: 'zitten', titel: 'Meerijden: zitpose van de gast in het voertuig van de host, stuur geven en terug (gastrit)', shots: ['gastrit-'], events: ['gastrit-'] },
  { id: 'wissel', titel: 'Hostwissel (filmpje, overdracht, harde wegval #1059/#1060)', shots: ['wissel-', 'uitval', 'overname', 'overdracht', 'hold'], events: ['wissel-', 'overname', 'overdracht', 'rol-', 'hostwissel', 'gastbijbaan', 'einde-rollen'] },
];

const leesEvents = (f) => { try { return fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { return []; } };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function verzamel(runs, sc) {
  const shots = [], regels = [];
  for (const run of runs) {
    if (!fs.existsSync(run)) continue;
    for (const wie of fs.readdirSync(run)) {
      const dir = path.join(run, wie); if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir).sort()) {
        const m = /^shots-(.+)\.png$/.exec(f); if (!m) continue;
        if (sc.shots.some((p) => m[1].startsWith(p))) shots.push({ run: path.basename(run), wie, naam: m[1], bron: path.join(dir, f) });
      }
      for (const e of leesEvents(path.join(dir, 'events.jsonl'))) if (e.type && sc.events.some((p) => String(e.type).startsWith(p))) regels.push({ run: path.basename(run), wie, e });
    }
  }
  return { shots, regels };
}

function main() {
  fs.mkdirSync(path.join(OUT, 'beeld'), { recursive: true });
  const delen = [];
  for (const sc of SCENARIOS) {
    const { shots, regels } = verzamel(RUNS, sc), o = OORDEEL[sc.id] || { oordeel: 'niet te testen', tekst: 'Geen oordeel ingevuld.' };
    const klasse = /^werkt$/.test(o.oordeel) ? 'ok' : /gefixt/.test(o.oordeel) ? 'fix' : /niet te testen/.test(o.oordeel) ? 'nt' : 'nok';
    const beelden = shots.map((s) => { const naam = `${s.run}-${s.wie}-${s.naam}.png`.replace(/[^\w.-]/g, '_'); fs.copyFileSync(s.bron, path.join(OUT, 'beeld', naam)); return `<figure><a href="beeld/${naam}"><img src="beeld/${naam}" loading="lazy" alt="${esc(s.wie + ': ' + s.naam)}"></a><figcaption>${esc(s.wie)} · ${esc(s.naam)} <small>(${esc(s.run)})</small></figcaption></figure>`; }).join('');
    const log = regels.map((r) => { const { t, wall, who, type, ...rest } = r.e; return `${r.run} ${r.wie} ${type}: ${JSON.stringify(rest)}`; }).join('\n');
    delen.push(`<section id="${sc.id}"><h2>${esc(sc.titel)} <span class="o ${klasse}">${esc(o.oordeel)}</span></h2><p>${esc(o.tekst)}</p><div class="beelden">${beelden || '<p><em>Geen schermafbeeldingen.</em></p>'}</div><details><summary>Logregels (${regels.length})</summary><pre>${esc(log.slice(0, 20000))}</pre></details></section>`);
  }
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Samen spelen in twee vensters: QA 24-11</title><style>
body{font-family:system-ui,sans-serif;margin:2rem;max-width:1400px;color:#222}h1{font-size:1.5rem}h2{font-size:1.15rem;margin-top:2.2rem}
.o{font-size:.8rem;padding:.15rem .5rem;border-radius:.4rem;margin-left:.5rem;vertical-align:middle}.ok{background:#d7f0d9}.fix{background:#fdf0c4}.nok{background:#f7d4d0}.nt{background:#e4e4e4}
.beelden{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:.8rem}figure{margin:0}img{width:100%;border:1px solid #ccc}figcaption{font-size:.8rem;color:#555}
pre{white-space:pre-wrap;font-size:.75rem;background:#f5f5f5;padding:.6rem;max-height:24rem;overflow:auto}</style></head><body>
<h1>Samen spelen in twee echte vensters: QA 24-11</h1><p>Testbank (scripts/coop/testbank.mjs) met echte Electron-vensters op één machine, route direct (TCP op 127.0.0.1) en kamer (nep-tracker op 127.0.0.1); wegwerpprofielen. Runs: ${esc(RUNS.map((r) => path.basename(r)).join(', '))}.</p>
<ul>${SCENARIOS.map((sc) => `<li><a href="#${sc.id}">${esc(sc.titel)}</a>: ${esc((OORDEEL[sc.id] || {}).oordeel || 'niet te testen')}</li>`).join('')}</ul>
${delen.join('\n')}</body></html>`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  console.log('rapport:', path.join(OUT, 'index.html'));
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) main();
