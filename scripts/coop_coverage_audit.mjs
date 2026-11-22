// Bewaakt dat de hele game rekening houdt met Samen spelen (21-11, opdracht van de eigenaar).
//
// Bron: scripts/coop_coverage.json (per systeem de zes vragen van AGENTS.md: wie is de eigenaar, wat ziet een gast,
// wie krijgt de beloning, wat bij wegvallen en hostwissel, enkelspeler-aanname, dekking). Uit die bron komt de
// matrix in docs/COOP-DEKKING-21-11.md (tussen de markeringen MATRIX:BEGIN en MATRIX:END).
//
// Wat de audit keurt (blokkerend, exit 1):
//   1. Nieuwe feature-module: elk bestand in game/js dat niet in de basislijn (scripts/coop_coverage_baseline.json)
//      staat, moet bij een systeem met een Samen-regel horen (veld modules) of onder nietCoopRelevant vallen.
//   2. Elk systeem heeft een Samen-regel: het genoemde doc bestaat en bevat de zoektekst. Systemen met wachtOp
//      (een epic-branch die nog niet in main staat) mogen die regel nog missen; zodra hij er staat, wordt hij gekeurd.
//   3. Elk systeem (behalve nvt) noemt minstens een test die bestaat.
//   4. Een gat of deels (alleen met echte vensters te bewijzen) heeft een eigenaar (issue als #nummer, of een lead) en een prioriteit.
//   5. Opslagsleutels: elke sleutel in game/js/storagekeys.js is ingedeeld als speler, apparaat of wereld; wereld mag
//      alleen voor de savegame zelf; een speler-sleutel staat niet in savegame.js; een nieuwe 'gde-...'-literal buiten
//      het register is een fout (nieuwe sleutels horen in storagekeys.js).
//   6. Feature-docs (docs/*-21-11.md en *-20-11.md) noemen Samen spelen of staan met een reden in docNvt.
//   7. De matrix in het doc klopt met de bron (herstel met --write).
//
// Gebruik:
//   node scripts/coop_coverage_audit.mjs            keurt
//   node scripts/coop_coverage_audit.mjs --write    schrijft de matrix in het doc
//   node scripts/coop_coverage_audit.mjs --update   zet de moduleslijst (basislijn) gelijk aan de bron
//   node scripts/coop_coverage_audit.mjs --json     machineleesbare samenvatting
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanDetail } from './player_singleton_audit.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MANIFEST = path.join(ROOT, 'scripts', 'coop_coverage.json');
export const BASELINE = path.join(ROOT, 'scripts', 'coop_coverage_baseline.json');
export const DOC = path.join(ROOT, 'docs', 'COOP-DEKKING-21-11.md');
const BEGIN = '<!-- MATRIX:BEGIN (gegenereerd door scripts/coop_coverage_audit.mjs --write; niet met de hand aanpassen) -->';
const END = '<!-- MATRIX:END -->';
const LEADS = ['Bezit', 'Verhaal', 'Kleding', 'Interieurs', 'Tuning'];

export const globToRe = (g) => new RegExp('^' + g.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const text = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Alle modules van het spel als sleutel zonder .js (vehicle/tuning voor een submap).
export function listModules(root = ROOT) {
  const dir = path.join(root, 'game', 'js');
  const out = [];
  const walk = (d, pre) => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) walk(p, pre + n + '/');
      else if (n.endsWith('.js')) out.push(pre + n.slice(0, -3));
    }
  };
  walk(dir, '');
  return out.sort();
}

const matcher = (patterns) => { const res = patterns.map(globToRe); return (m) => res.some((r) => r.test(m) || r.test(m.split('/').pop())); };

// Welke systemen claimen een module?
export function claimedBy(manifest) {
  const per = manifest.features.map((f) => ({ f, ok: matcher(f.modules || []) }));
  const nvt = matcher((manifest.nietCoopRelevant || []).map((x) => x.glob));
  return (m) => ({ features: per.filter((x) => x.ok(m)).map((x) => x.f.id), nvt: nvt(m) });
}

// Sleutels van het register (BASE_KEYS) zonder de module uit te voeren: lees de objectsleutels uit de bron.
export function registryKeys(src) {
  const m = /export const BASE_KEYS = \{([\s\S]*?)\n\};/.exec(src);
  if (!m) return [];
  const names = [];
  for (const line of m[1].split('\n')) {
    const k = /^\s{2}([A-Za-z_$][\w$]*):\s*'gde-/.exec(line);
    if (k) names.push(k[1]);
  }
  return names;
}

export function auditSources(opt = {}) {
  const manifest = opt.manifest || readJson(MANIFEST);
  const baseline = opt.baseline || (fs.existsSync(BASELINE) ? readJson(BASELINE) : { modules: [] });
  const modules = opt.modules || listModules();
  const fouten = [];
  const info = [];
  const features = manifest.features;

  // 1. nieuwe modules
  const claim = claimedBy(manifest);
  const bekend = new Set(baseline.modules || []);
  for (const m of modules) {
    if (bekend.has(m)) continue;
    const c = claim(m);
    if (!c.features.length && !c.nvt) fouten.push(`nieuwe module game/js/${m}.js hoort bij geen systeem in scripts/coop_coverage.json (voeg hem toe aan een systeem met een Samen-regel, of aan nietCoopRelevant met een reden)`);
  }
  const weg = (baseline.modules || []).filter((m) => !modules.includes(m));
  if (weg.length) info.push(`${weg.length} module(s) uit de basislijn bestaan niet meer; werk bij met --update`);

  // 2 en 3 en 4. systemen
  const ids = new Set();
  for (const f of features) {
    if (ids.has(f.id)) fouten.push(`${f.id}: dubbele id`);
    ids.add(f.id);
    if (!manifest.statussen.includes(f.status)) fouten.push(`${f.id}: onbekende status ${f.status}`);
    if (!manifest.prioriteiten.includes(f.prio)) fouten.push(`${f.id}: onbekende prioriteit ${f.prio}`);
    if (!manifest.eigenaren.includes(f.eigenaar)) fouten.push(`${f.id}: onbekende eigenaar ${f.eigenaar}`);
    for (const k of ['wereld', 'gast', 'beloning', 'wegval']) if (k !== 'wereld' && !String(f[k] || '').trim()) fouten.push(`${f.id}: veld ${k} ontbreekt`);
    const wacht = f.wachtOp || null;
    const regel = f.regel || {};
    if (!regel.doc || !regel.zoek) fouten.push(`${f.id}: de Samen-regel (regel.doc en regel.zoek) ontbreekt`);
    else if (!exists(regel.doc)) { if (wacht) info.push(`${f.id}: regel-doc ${regel.doc} wacht op ${wacht}`); else fouten.push(`${f.id}: regel-doc ${regel.doc} bestaat niet`); }
    else if (!text(regel.doc).includes(regel.zoek)) { if (wacht) info.push(`${f.id}: regel "${regel.zoek}" wacht op ${wacht}`); else fouten.push(`${f.id}: ${regel.doc} bevat de Samen-regel niet (zoektekst: ${regel.zoek})`); }
    const tests = f.test || [];
    if (f.status !== 'nvt' && !tests.length) fouten.push(`${f.id}: geen test genoemd`);
    for (const t of tests) if (!exists(t)) { if (wacht) info.push(`${f.id}: test ${t} wacht op ${wacht}`); else fouten.push(`${f.id}: test ${t} bestaat niet`); }
    if (f.status === 'gat' || f.status === 'deels') {
      if (!(f.issue && /^#\d+$/.test(f.issue)) && !(f.lead && LEADS.includes(f.lead))) fouten.push(`${f.id}: een gat heeft een issue (#nummer) of een lead (${LEADS.join(', ')}); dat geldt ook voor status deels`);
      if (f.prio === '-') fouten.push(`${f.id}: een gat heeft een prioriteit (hoog, middel of laag)`);
      if (!String(f.gat || '').trim()) fouten.push(`${f.id}: een gat beschrijft het gat (veld gat)`);
    }
  }

  // 5. opslagsleutels
  let regSrc = opt.storageSrc;
  if (regSrc === undefined) regSrc = fs.readFileSync(path.join(ROOT, 'game', 'js', 'storagekeys.js'), 'utf8');
  const sleutels = registryKeys(regSrc);
  const opslag = manifest.opslag || {};
  const scopes = ['speler', 'apparaat', 'wereld'];
  for (const k of sleutels) {
    const o = opslag[k];
    if (!o) { fouten.push(`opslagsleutel ${k} (storagekeys.js) is niet ingedeeld in scripts/coop_coverage.json: speler, apparaat of wereld, met een reden`); continue; }
    if (!scopes.includes(o.scope)) fouten.push(`opslagsleutel ${k}: onbekende scope ${o.scope}`);
    if (!String(o.reden || '').trim()) fouten.push(`opslagsleutel ${k}: reden ontbreekt`);
    if (o.scope === 'wereld' && !(manifest.wereldSleutels || []).includes(k)) fouten.push(`opslagsleutel ${k}: wereldstaat mag alleen voor ${(manifest.wereldSleutels || []).join(', ')}; een nieuwe sleutel hoort per speler of per apparaat te zijn`);
  }
  for (const k of Object.keys(opslag)) if (!sleutels.includes(k) && !opt.storageSrc) fouten.push(`opslagsleutel ${k} staat in coop_coverage.json maar niet meer in storagekeys.js`);
  if (opt.saveSrc !== undefined || !opt.storageSrc) {
    const saveSrc = opt.saveSrc !== undefined ? opt.saveSrc : fs.readFileSync(path.join(ROOT, 'game', 'js', 'savegame.js'), 'utf8');
    for (const k of sleutels) if (opslag[k] && opslag[k].scope === 'speler' && !(manifest.inSavegameToegestaan || []).includes(k) && new RegExp(`KEYS\\.${k}\\b`).test(saveSrc)) fouten.push(`opslagsleutel ${k} is per speler maar savegame.js leest of schrijft hem: dan zit hij in de wereldsave`);
  }
  const lit = opt.literals || literalenBuitenRegister();
  const toegestaan = new Set(manifest.sleutelLiteralenBuitenRegister || []);
  for (const l of lit) if (!toegestaan.has(l.sleutel)) fouten.push(`nieuwe opslagsleutel ${l.sleutel} in game/js/${l.bestand}: leg hem vast in storagekeys.js (en deel hem in als speler of apparaat in scripts/coop_coverage.json)`);

  // 6. feature-docs
  if (!opt.skipDocs) {
    const nvt = manifest.docNvt || {};
    const docs = fs.readdirSync(path.join(ROOT, 'docs')).filter((n) => /-(21|20)-11\.md$/.test(n));
    for (const d of docs) {
      const rel = 'docs/' + d;
      if (nvt[d]) continue;
      if (/samen spelen|multiplayer|\bcoop/i.test(text(rel))) continue;
      fouten.push(`${rel} noemt Samen spelen niet: voeg een regel Samen spelen toe, of zet het doc in docNvt (scripts/coop_coverage.json) met een reden`);
    }
    for (const d of Object.keys(nvt)) if (!exists('docs/' + d)) fouten.push(`docNvt noemt docs/${d}, dat niet bestaat`);
  }
  return { fouten, info, manifest };
}

// 'gde-...'-literals in game/js buiten het register, per bestand.
export function literalenBuitenRegister() {
  const out = [];
  const walk = (d) => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) { walk(p); continue; }
      if (!n.endsWith('.js') || n === 'storagekeys.js') continue;
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/['"`](gde-[a-z0-9:-]+)['"`]/g)) out.push({ sleutel: m[1], bestand: path.relative(path.join(ROOT, 'game', 'js'), p).split(path.sep).join('/') });
    }
  };
  walk(path.join(ROOT, 'game', 'js'));
  const seen = new Set();
  return out.filter((x) => { const k = x.sleutel + '|' + x.bestand; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ---------------------------------------------------------------- matrix
const esc = (s) => String(s || '').replace(/\|/g, '/').replace(/\r?\n/g, ' ');

export function singletonPerSysteem(manifest, modules, telling) {
  const out = {};
  for (const f of manifest.features) {
    const ok = matcher(f.modules || []);
    let n = 0, bestanden = [];
    for (const m of modules) {
      if (!ok(m)) continue;
      const c = telling['game/js/' + m + '.js'] || 0;
      if (c) { n += c; bestanden.push(`${m.split('/').pop()} ${c}`); }
    }
    out[f.id] = { n, bestanden };
  }
  return out;
}

export function maakMatrix(manifest, singleton, totaal = 0) {
  const f = manifest.features;
  const tel = (s) => f.filter((x) => x.status === s).length;
  const regels = [];
  regels.push(`**Samenvatting:** ${f.length} systemen: ${tel('OK')} OK, ${tel('gat')} gat, ${tel('deels')} deels, ${tel('nvt')} niet van toepassing. Directe verwijzingen naar world.player (de ratel in scripts/player_singleton_baseline.json): ${totaal} in totaal; kolom e toont ze per systeem (een bestand kan bij twee systemen horen, een deel hoort bij geen systeem: intromontage, dorpsuitjes, main).`);
  regels.push('');
  regels.push('| Systeem | a) Bezit | b) Gast | c) Beloning | d) Wegvallen, aansluiten, hostwissel | e) world.player | f) Dekking | Status |');
  regels.push('|---|---|---|---|---|---|---|---|');
  let groep = '';
  for (const x of f) {
    if (x.groep !== groep) { groep = x.groep; regels.push(`| **${esc(groep)}** | | | | | | | |`); }
    const s = singleton[x.id] || { n: 0, bestanden: [] };
    const aanname = s.n ? `ja: ${s.n} (${s.bestanden.slice(0, 4).join(', ')}${s.bestanden.length > 4 ? ', ...' : ''})` : 'nee';
    const tests = (x.test || []).map((t) => '`' + path.basename(t).replace(/\.mjs$/, '') + '`').join(', ') || 'nvt';
    const wacht = x.wachtOp ? ` (wacht op ${x.wachtOp})` : '';
    const eig = ({ wereld: 'wereld (wie het spel opende)', speler: 'per speler', gesynct: 'gedeeld, gesynct', lokaal: 'lokaal per apparaat', wedstrijd: 'wedstrijd' })[x.eigenaar];
    const st = x.status === 'gat' || x.status === 'deels' ? `**${x.status}**, ${x.prio}, ${x.issue || 'lead ' + x.lead}` : `${x.status}${x.prio && x.prio !== '-' ? ', ' + x.prio : ''}`;
    regels.push(`| ${esc(x.naam)}${wacht} | ${esc(eig)} | ${esc(x.gast)} | ${esc(x.beloning)} | ${esc(x.wegval)} | ${aanname} | ${tests} | ${st} |`);
  }
  regels.push('');
  regels.push('### Gaten');
  regels.push('');
  const gaten = f.filter((x) => x.status === 'gat' || x.status === 'deels');
  for (const x of gaten) regels.push(`- **${esc(x.naam)}** (${x.prio}, ${x.issue ? x.issue : 'lead ' + x.lead}${x.wachtOp ? ', epic ' + x.wachtOp : ''}): ${esc(x.gat)}`);
  const gefixt = f.filter((x) => x.gefixt);
  if (gefixt.length) {
    regels.push('');
    regels.push('### Gefixt in deze ronde');
    regels.push('');
    for (const x of gefixt) regels.push(`- **${esc(x.naam)}**: ${esc(x.gefixt)}`);
  }
  regels.push('');
  regels.push('### Opslagsleutels');
  regels.push('');
  regels.push('| Sleutel | Scope | Reden |');
  regels.push('|---|---|---|');
  for (const [k, v] of Object.entries(manifest.opslag)) regels.push(`| \`${k}\` | ${v.scope} | ${esc(v.reden)} |`);
  return regels.join('\n');
}

export function schrijfMatrix(docText, matrix) {
  const a = docText.indexOf(BEGIN), b = docText.indexOf(END);
  if (a < 0 || b < 0 || b < a) throw new Error('de markeringen MATRIX:BEGIN en MATRIX:END ontbreken in ' + DOC);
  return docText.slice(0, a) + BEGIN + '\n\n' + matrix + '\n\n' + docText.slice(b);
}

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const manifest = readJson(MANIFEST);
  const modules = listModules();

  if (argv.includes('--update')) {
    fs.writeFileSync(BASELINE, JSON.stringify({ version: 1, note: 'Alle modules van game/js op het moment van de laatste --update. Een module die hier niet in staat moet bij een systeem met een Samen-regel horen (scripts/coop_coverage_audit.mjs).', modules }, null, 1) + '\n');
    console.log(`Basislijn bijgewerkt: ${modules.length} modules.`);
    return 0;
  }

  const telling = scanDetail(path.join(ROOT, 'game', 'js'));
  const flat = Object.fromEntries(Object.entries(telling.files).map(([k, v]) => [k.startsWith('game/js/') ? k : 'game/js/' + k, v]));
  const singleton = singletonPerSysteem(manifest, modules, flat);
  const matrix = maakMatrix(manifest, singleton, Object.values(flat).reduce((s, n) => s + n, 0));

  if (argv.includes('--write')) {
    fs.writeFileSync(DOC, schrijfMatrix(fs.readFileSync(DOC, 'utf8'), matrix));
    console.log('Matrix geschreven in docs/COOP-DEKKING-21-11.md');
    return 0;
  }

  const { fouten, info } = auditSources({ manifest, modules });
  // 7. de matrix in het doc klopt met de bron
  if (!fs.existsSync(DOC)) fouten.push('docs/COOP-DEKKING-21-11.md ontbreekt');
  else {
    const d = fs.readFileSync(DOC, 'utf8');
    const a = d.indexOf(BEGIN), b = d.indexOf(END);
    if (a < 0 || b < 0) fouten.push('docs/COOP-DEKKING-21-11.md mist de markeringen MATRIX:BEGIN en MATRIX:END');
    else if (d.slice(a + BEGIN.length, b).trim() !== matrix.trim()) fouten.push('de matrix in docs/COOP-DEKKING-21-11.md is niet gelijk aan de bron: draai node scripts/coop_coverage_audit.mjs --write');
  }
  const tel = (s) => manifest.features.filter((x) => x.status === s).length;
  if (json) console.log(JSON.stringify({ systemen: manifest.features.length, ok: tel('OK'), gat: tel('gat'), deels: tel('deels'), nvt: tel('nvt'), blokkerend: fouten.length, fouten, info }, null, 1));
  else {
    console.log(`coop-dekking-audit: ${manifest.features.length} systemen (${tel('OK')} OK, ${tel('gat')} gat, ${tel('deels')} deels, ${tel('nvt')} nvt), ${fouten.length} blokkerend, ${info.length} wacht op een epic`);
    for (const i of info) console.log(`INFO  ${i}`);
    for (const f of fouten) console.log(`FOUT  ${f}`);
  }
  return fouten.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) process.exit(main());
