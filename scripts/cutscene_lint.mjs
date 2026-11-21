// Statische cutscene-linter (laag 2 van het cutscene-kwaliteitssysteem, docs/CUTSCENE-REGIE-21-11.md).
// Leest alle cutscene- en regiedata (cutscenes*.js, de scène-catalogus van cutpreview.js, script.json en de stemmanifesten),
// toetst de regels van de regie-bijbel zonder het spel te starten en geeft per cutscene een rapport (blokkerend, belangrijk,
// nit) en een globale score. De baseline-ratel (scripts/cutscene_lint_basis.json) werkt zoals ds3_dekking: bestaande schuld
// mag alleen dalen, een nieuwe vondst of een toename faalt. Smaak (humor) telt nooit mee: dat gaat naar het humorpanel.
//
//   node scripts/cutscene_lint.mjs [--ratchet] [--write-basis] [--json=<bestand>] [--md=<bestand>] [--only=<id,id>] [--top=20] [--quiet]
//     --ratchet      faal bij een nieuwe of verergerde vondst tegenover de basis (standaard in test_all en de releasegate)
//     --write-basis  schrijf de basis opnieuw (alleen lager of gelijk; een stijging vraagt --force-up en een reden in de commit)
//     --strict       faal bij elke blokkerende vondst (voor een nieuwe, schone cutscene)
//   Exit: 0 groen, 1 ratel of strikt gefaald, 2 gebruiksfout.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadUnits, ROOT } from './lib/cutscene_data.mjs';
import { lintUnit, rapportVan, globaleScore, ratel, checkIntroductions, humorCandidates, RULES, bijbelIds } from './lib/cutscene_lint.mjs';

const arg = (k, d = '') => { const a = process.argv.find((v) => v === `--${k}` || v.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : d; };
const BASIS = path.join(ROOT, 'scripts', 'cutscene_lint_basis.json');

export async function runLint() {
  const data = await loadUnits();
  const { units, kaleUnits, scriptUnits, dekking, names, speakers, looks } = data;
  const ctx = { speakers, npc: looks };
  const alle = [...units, ...kaleUnits];
  // introducties over de hele lijn in verhaalvolgorde (scriptscènes), toegekend aan de eenheid die de scène speelt
  const eenheidVan = (sceneId) => dekking.get(sceneId) || sceneId;
  const intro = checkIntroductions(scriptUnits.map((u) => ({ id: u.id, kind: u.kind, lines: u.lines, regie: u.regie })), names);
  const rapporten = [];
  for (const u of alle) {
    const v = lintUnit(u, ctx);
    for (const sceneId of u.sceneIds || [u.id]) for (const iv of intro.get(sceneId) || []) if (eenheidVan(sceneId) === u.id) v.push({ ...iv, cutscene: u.id });
    const r = rapportVan(u, v);
    r.act = u.act;
    r.titel = u.titel || u.id;
    r.humor = humorCandidates(u);
    rapporten.push(r);
  }
  return { rapporten, data };
}

function perRegel(rapporten) {
  const t = {};
  for (const r of rapporten) for (const v of r.vondsten) { const k = v.regel; t[k] = t[k] || { regel: k, cutscenes: new Set(), aantal: 0, ernst: {} }; t[k].aantal++; t[k].cutscenes.add(r.id); t[k].ernst[v.ernst] = (t[k].ernst[v.ernst] || 0) + 1; }
  return Object.values(t).map((x) => ({ ...x, cutscenes: x.cutscenes.size })).sort((a, b) => a.regel.localeCompare(b.regel));
}

export function samenvatting(rapporten) {
  const totaal = { blokkerend: 0, belangrijk: 0, nit: 0, smaak: 0 };
  for (const r of rapporten) for (const k of Object.keys(totaal)) totaal[k] += r[k];
  return { cutscenes: rapporten.length, gestaged: rapporten.filter((r) => r.group !== 'Script').length, score: globaleScore(rapporten), ...totaal, falend: rapporten.filter((r) => r.blokkerend > 0).length, schoon: rapporten.filter((r) => !r.blokkerend && !r.belangrijk).length, perRegel: perRegel(rapporten) };
}

async function main() {
  const only = String(arg('only', '')).split(',').filter(Boolean);
  const { rapporten: alle } = await runLint();
  const rapporten = only.length ? alle.filter((r) => only.includes(r.id)) : alle;
  const sam = samenvatting(rapporten);
  let basis = {};
  if (fs.existsSync(BASIS)) basis = JSON.parse(fs.readFileSync(BASIS, 'utf8')).sleutels || {};
  const r = ratel(rapporten, basis);
  let bijbel = {};
  const regelsPad = path.join(ROOT, 'scripts', 'release', 'cutscene-regels.json');
  if (fs.existsSync(regelsPad)) { try { bijbel = bijbelIds(JSON.parse(fs.readFileSync(regelsPad, 'utf8'))); } catch { /* ongeldige lijst: voorlopige ID's blijven */ } }
  const id = (regel) => (bijbel[regel] ? `${regel} (${bijbel[regel]})` : regel);

  if (arg('json')) fs.writeFileSync(path.resolve(String(arg('json'))), JSON.stringify({ gemaakt: new Date().toISOString().slice(0, 10), samenvatting: sam, rapporten, ratel: { nieuw: r.nieuw, erger: r.erger, beter: r.beter } }, null, 1) + '\n');

  if (arg('write-basis')) {
    const nu = r.nu;
    const stijging = Object.keys(nu).filter((k) => basis[k] == null || nu[k] > basis[k]);
    if (Object.keys(basis).length && stijging.length && !arg('force-up')) { console.error(`basis NIET geschreven: ${stijging.length} vondst(en) erbij of erger (${stijging.slice(0, 3).join(', ')}...). De ratel laat alleen dalen; --force-up met een reden in de commit.`); process.exit(1); }
    fs.writeFileSync(BASIS, JSON.stringify({ toelichting: 'Baseline-ratel van scripts/cutscene_lint.mjs: sleutel = cutscene|regel, waarde = toegestaan aantal. Mag alleen dalen (node scripts/cutscene_lint.mjs --write-basis).', score: sam.score, sleutels: Object.fromEntries(Object.entries(nu).sort(([a], [b]) => a.localeCompare(b))) }, null, 1) + '\n');
    console.log(`basis geschreven: ${Object.keys(nu).length} sleutels, score ${sam.score}`);
    return 0;
  }

  const top = Number(arg('top', 20)) || 20;
  if (!arg('quiet')) {
    console.log(`cutscene_lint: ${sam.cutscenes} cutscenes (${sam.gestaged} geregisseerd), globale score ${sam.score}/100; ${sam.blokkerend} blokkerend, ${sam.belangrijk} belangrijk, ${sam.nit} nit (smaak: ${sam.smaak}, geen oordeel); ${sam.falend} cutscenes met een blokkerende vondst, ${sam.schoon} schoon`);
    for (const x of sam.perRegel) console.log(`  ${id(x.regel).padEnd(16)} ${String(x.aantal).padStart(4)}x in ${String(x.cutscenes).padStart(3)} cutscenes  ${RULES[x.regel] ? RULES[x.regel].titel : ''}`);
    const slecht = rapporten.slice().sort((a, b) => a.score - b.score || b.blokkerend - a.blokkerend).slice(0, top);
    console.log(`\nSlechtste ${slecht.length}:`);
    for (const s of slecht) console.log(`  ${String(s.score).padStart(3)}  ${s.id.padEnd(24)} ${s.blokkerend} blokkerend, ${s.belangrijk} belangrijk, ${s.nit} nit`);
  }
  for (const o of arg('only') ? rapporten : []) for (const v of o.vondsten) console.log(`    [${v.ernst}] ${id(v.regel)} ${v.bericht}`);
  if (r.beter.length && !arg('quiet')) console.log(`\n${r.beter.length} vondst(en) minder dan de basis: draai --write-basis om de ratel aan te trekken.`);
  let fout = false;
  if (arg('ratchet')) {
    if (r.nieuw.length || r.erger.length) {
      fout = true;
      for (const n of r.nieuw.slice(0, 12)) console.log(`FAIL nieuw: ${n.sleutel} (${n.aantal}x)`);
      for (const n of r.erger.slice(0, 12)) console.log(`FAIL erger: ${n.sleutel} (${n.aantal}x, basis ${n.was})`);
      console.log(`cutscene_lint ratel: ${r.nieuw.length} nieuw en ${r.erger.length} verergerd. Los ze op (regie-bijbel: docs/CUTSCENE-REGIE-21-11.md); schuld bijschrijven mag niet.`);
    }
  }
  if (arg('strict') && sam.blokkerend) { fout = true; console.log(`FAIL strikt: ${sam.blokkerend} blokkerende vondsten`); }
  return fout ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(2); });
}
