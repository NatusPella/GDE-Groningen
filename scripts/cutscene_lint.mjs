// Statische cutscene-linter (laag 2 van het cutscene-kwaliteitssysteem, docs/CUTSCENE-REGIE-21-11.md).
// Leest alle cutscene- en regiedata (cutscenes*.js, de scène-catalogus van cutpreview.js, script.json en de stemmanifesten),
// toetst de regels van de regie-bijbel zonder het spel te starten en geeft per cutscene een rapport (blokkerend, belangrijk,
// nit) en een globale score. Smaak (humor) telt nooit mee: dat gaat naar het humorpanel (scripts/cutscene_review_pack.mjs).
//
// STRENG VOOR ALLES (eigenaar-besluit 21-11): de regels gelden voor alle cutscenes, ook de bestaande. Er is geen baseline en geen
// ratel. Een regel die bij een bestaande cutscene bewust niet geldt, staat met een reden in scripts/release/cutscene-uitzonderingen.json;
// een uitzondering zonder reden of die niets meer dekt is zelf een fout. Overgang: alleen `blokkerend` blokkeert; `belangrijk` en
// `nit` tellen mee in de score. De release is pas groen als er geen blokkerende vondst meer is die niet is uitgezonderd.
//
//   node scripts/cutscene_lint.mjs [--strict | --meld] [--json=<bestand>] [--lijst=<bestand.md>] [--only=<id,id>] [--top=20] [--quiet]
//     --strict   exit 1 bij elke blokkerende vondst zonder uitzondering (de releasegate, static-fase)
//     --meld     meldt de blokkerende vondsten maar blokkeert niet (test_all en run_tests: anders faalt elke PR op de bestaande lijst);
//                exit 1 alleen bij een ongeldige of verouderde uitzonderingenlijst
//     --lijst    schrijft de faallijst (wat bestaande cutscenes nu laat falen) als markdown voor de verhaal-lead
//   Exit: 0 groen, 1 gefaald, 2 gebruiksfout.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadUnits, ROOT } from './lib/cutscene_data.mjs';
import { lintUnit, rapportVan, globaleScore, checkIntroductions, humorCandidates, valideerUitzonderingen, pasUitzonderingenToe, RULES, bijbelIds } from './lib/cutscene_lint.mjs';

const arg = (k, d = '') => { const a = process.argv.find((v) => v === `--${k}` || v.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : d; };
export const UITZONDERINGEN = path.join(ROOT, 'scripts', 'release', 'cutscene-uitzonderingen.json');

export function leesUitzonderingen(pad = UITZONDERINGEN) {
  if (!fs.existsSync(pad)) return { uitzonderingen: [], fouten: [`${path.relative(ROOT, pad)} ontbreekt`] };
  try { const data = JSON.parse(fs.readFileSync(pad, 'utf8')); return { uitzonderingen: Array.isArray(data.uitzonderingen) ? data.uitzonderingen : [], data, fouten: [] }; } catch (e) { return { uitzonderingen: [], fouten: [`${path.relative(ROOT, pad)} is geen geldige JSON: ${e.message}`] }; }
}

// Alles toetsen: eenheden bouwen, vondsten verzamelen, uitzonderingen toepassen, rapporten maken.
export async function runLint({ uitzonderingen = null } = {}) {
  const data = await loadUnits();
  const { units, kaleUnits, scriptUnits, dekking, names, speakers, looks } = data;
  const ctx = { speakers, npc: looks };
  const alle = [...units, ...kaleUnits];
  const eenheidVan = (sceneId) => dekking.get(sceneId) || sceneId;
  // introducties over de hele lijn in verhaalvolgorde (scriptscènes), toegekend aan de eenheid die de scène speelt
  const intro = checkIntroductions(scriptUnits.map((u) => ({ id: u.id, kind: u.kind, lines: u.lines, regie: u.regie })), names);
  const perId = {};
  for (const u of alle) {
    const v = lintUnit(u, ctx);
    for (const sceneId of u.sceneIds || [u.id]) for (const iv of intro.get(sceneId) || []) if (eenheidVan(sceneId) === u.id) v.push({ ...iv, cutscene: u.id });
    perId[u.id] = v;
  }
  const lijst = uitzonderingen == null ? leesUitzonderingen() : { uitzonderingen, fouten: [] };
  const fouten = [...lijst.fouten, ...valideerUitzonderingen({ uitzonderingen: lijst.uitzonderingen }, { cutscenes: new Set(alle.map((u) => u.id)) })];
  const { verouderd } = pasUitzonderingenToe(perId, lijst.uitzonderingen);
  for (const u of verouderd) fouten.push(`verouderde uitzondering ${u.cutscene} ${u.regel}${u.regelNr != null ? ' regel ' + u.regelNr : ''}: er is geen vondst meer die hij dekt (verwijder hem)`);
  const rapporten = alle.map((u) => {
    const r = rapportVan(u, perId[u.id]);
    r.act = u.act;
    r.titel = u.titel || u.id;
    r.humor = humorCandidates(u);
    return r;
  });
  return { rapporten, data, uitzonderingFouten: fouten };
}

function perRegel(rapporten) {
  const t = {};
  for (const r of rapporten) for (const v of r.vondsten) {
    if (v.uitzondering) continue;
    const x = t[v.regel] = t[v.regel] || { regel: v.regel, cutscenes: new Set(), aantal: 0, ernst: {} };
    x.aantal++; x.cutscenes.add(r.id); x.ernst[v.ernst] = (x.ernst[v.ernst] || 0) + 1;
  }
  return Object.values(t).map((x) => ({ ...x, cutscenes: x.cutscenes.size })).sort((a, b) => a.regel.localeCompare(b.regel));
}

export function samenvatting(rapporten) {
  const totaal = { blokkerend: 0, belangrijk: 0, nit: 0, smaak: 0, uitgezonderd: 0 };
  for (const r of rapporten) for (const k of Object.keys(totaal)) totaal[k] += r[k] || 0;
  return { cutscenes: rapporten.length, gestaged: rapporten.filter((r) => r.group !== 'Script').length, score: globaleScore(rapporten), ...totaal, falend: rapporten.filter((r) => r.blokkerend > 0).length, schoon: rapporten.filter((r) => !r.blokkerend && !r.belangrijk).length, perRegel: perRegel(rapporten) };
}

// De faallijst voor de verhaal-lead: elke blokkerende vondst (waar, welke regel, wat), per groep, met de belangrijke vondsten als aantal.
export function faalLijst(rapporten, idVan = (x) => x) {
  const L = ['# Faallijst cutscenes (wat bestaande cutscenes nu laat falen)', '', 'Gemaakt door `node scripts/cutscene_lint.mjs --lijst`. De regels gelden voor alle cutscenes; de release (releasegate, static) wordt pas groen als deze lijst leeg is of elke vondst een gedocumenteerde uitzondering heeft in `scripts/release/cutscene-uitzonderingen.json`.', ''];
  const blok = rapporten.flatMap((r) => r.vondsten.filter((v) => v.ernst === 'blokkerend' && !v.uitzondering && v.categorie !== 'smaak').map((v) => ({ ...v, id: r.id, akte: r.act })));
  L.push(`## Blokkerend (${blok.length})`, '');
  if (!blok.length) L.push('Niets: de lijst is leeg.', '');
  const perRegelGroep = {};
  for (const b of blok) (perRegelGroep[b.regel] = perRegelGroep[b.regel] || []).push(b);
  for (const [regel, lijst] of Object.entries(perRegelGroep)) {
    L.push(`### ${idVan(regel)} ${RULES[regel] ? RULES[regel].titel : ''} (${lijst.length})`, '');
    for (const b of lijst) L.push(`- \`${b.id}\` (akte ${b.akte || '?'})${b.t != null ? ` bij ${b.t} s` : ''}${b.regelNr != null ? `, regel ${b.regelNr}` : ''}: ${b.bericht}`);
    L.push('');
  }
  const bel = rapporten.filter((r) => r.belangrijk > 0).sort((a, b) => b.belangrijk - a.belangrijk);
  L.push(`## Belangrijk (tellen mee in de score, blokkeren nog niet): ${bel.reduce((s, r) => s + r.belangrijk, 0)} vondsten in ${bel.length} cutscenes`, '');
  L.push('| cutscene | akte | score | belangrijk | nit |', '|---|---|---|---|---|');
  for (const r of bel.slice(0, 40)) L.push(`| ${r.id} | ${r.act || '?'} | ${r.score} | ${r.belangrijk} | ${r.nit} |`);
  if (bel.length > 40) L.push(`| ... | | | ${bel.length - 40} cutscenes meer | |`);
  return L.join('\n') + '\n';
}

async function main() {
  const only = String(arg('only', '')).split(',').filter(Boolean);
  const { rapporten: alle, uitzonderingFouten } = await runLint();
  const rapporten = only.length ? alle.filter((r) => only.includes(r.id)) : alle;
  const sam = samenvatting(rapporten);
  let bijbel = {};
  const regelsPad = path.join(ROOT, 'scripts', 'release', 'cutscene-regels.json');
  if (fs.existsSync(regelsPad)) { try { bijbel = bijbelIds(JSON.parse(fs.readFileSync(regelsPad, 'utf8'))); } catch { /* ongeldige lijst: voorlopige ID's blijven */ } }
  const id = (regel) => (bijbel[regel] ? `${regel} (${bijbel[regel]})` : regel);

  if (arg('json')) {
    const pad = path.resolve(String(arg('json')));
    fs.mkdirSync(path.dirname(pad), { recursive: true });
    fs.writeFileSync(pad, JSON.stringify({ gemaakt: new Date().toISOString().slice(0, 10), samenvatting: sam, uitzonderingFouten, rapporten }, null, 1) + '\n');
  }
  if (arg('lijst')) fs.writeFileSync(path.resolve(String(arg('lijst'))), faalLijst(rapporten, id));

  if (!arg('quiet')) {
    console.log(`cutscene_lint: ${sam.cutscenes} cutscenes (${sam.gestaged} geregisseerd), globale score ${sam.score}/100; ${sam.blokkerend} blokkerend, ${sam.belangrijk} belangrijk, ${sam.nit} nit, ${sam.uitgezonderd} uitgezonderd (smaak: ${sam.smaak}, geen oordeel); ${sam.falend} cutscenes met een blokkerende vondst, ${sam.schoon} schoon`);
    for (const x of sam.perRegel) console.log(`  ${id(x.regel).padEnd(16)} ${String(x.aantal).padStart(4)}x in ${String(x.cutscenes).padStart(3)} cutscenes  ${RULES[x.regel] ? RULES[x.regel].titel : ''}`);
    const top = Number(arg('top', 20)) || 20;
    const slecht = rapporten.slice().sort((a, b) => a.score - b.score || b.blokkerend - a.blokkerend).slice(0, top);
    console.log(`\nSlechtste ${slecht.length}:`);
    for (const s of slecht) console.log(`  ${String(s.score).padStart(3)}  ${s.id.padEnd(24)} ${s.blokkerend} blokkerend, ${s.belangrijk} belangrijk, ${s.nit} nit`);
  }
  if (only.length) for (const o of rapporten) for (const v of o.vondsten) console.log(`    [${v.uitzondering ? 'uitgezonderd' : v.ernst}] ${id(v.regel)} ${v.bericht}`);
  let fout = false;
  for (const f of uitzonderingFouten) { fout = true; console.log(`FAIL uitzonderingen: ${f}`); }
  const blok = rapporten.flatMap((r) => r.vondsten.filter((v) => v.ernst === 'blokkerend' && !v.uitzondering && v.categorie !== 'smaak').map((v) => `${r.id} ${id(v.regel)} ${v.bericht}`));
  if (arg('strict') && blok.length) {
    fout = true;
    for (const b of blok.slice(0, 15)) console.log(`FAIL blokkerend: ${b}`);
    console.log(`cutscene_lint strikt: ${blok.length} blokkerende vondst(en) zonder uitzondering. Los ze op (WP15 regie #1138, WP11 dialoogvorm #1134) of leg een uitzondering met reden vast in scripts/release/cutscene-uitzonderingen.json.`);
  } else if (arg('meld') && blok.length) {
    console.log(`WAARSCHUWING cutscene_lint: ${blok.length} blokkerende vondst(en) bij bestaande cutscenes; de releasegate blokkeert hierop (lijst: node scripts/cutscene_lint.mjs --lijst=<bestand>).`);
  }
  return fout ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(2); });
}
