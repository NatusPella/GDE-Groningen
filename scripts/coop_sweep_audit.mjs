// Samen-sweep 22-11 (eigenaarseis: alles moet ook werken in Samen spelen). Keurt scripts/coop_coverage.json, sectie sweep22:
//   1. Elk systeem van de sweep verwijst naar systemen (features) met een Samen-regel (status OK, deels of nvt) en de vragen
//      van AGENTS.md (gast, beloning, wegvallen); de Samen-regel (doc plus zoektekst) en elke testverwijzing bestaan.
//   2. Geen gat: een systeem is OK, of deels met een reden en stappen die alleen met echte vensters te bewijzen zijn (venster).
//   3. Elk nieuw .js-bestand in game/js sinds de tag (git) hoort bij een systeem of staat met een reden onder nietCoopRelevant, en
//      een nieuw bestand dat world.player of host-/gastvelden raakt hoort bij een systeem (niet alleen nvt).
//   4. De expliciete controles (gast-eigen-verhaal, hostwissel, late aansluiter, ...) noemen bestaande tests.
//   5. Elke venster-stap bestaat in de testbank en staat in het draaiboek (docs/SAMEN-SWEEP-22-11.md); het draaiboek noemt elk systeem.
//   node scripts/coop_sweep_audit.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { claimedBy, MANIFEST } from './coop_coverage_audit.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const text = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TOUCH = /world\.player|\bw\.player\b|coopRole|coopNet|coopRoster|coopFigures|coopHost\b|coopGuest|coopInVoertuig|hoofdspeler\(|isHost\b|\.slot\b/;

// Nieuwe modules sinds de tag (zonder .js, met submap); null als git of de tag ontbreekt.
export function nieuweModules(tag, root = ROOT) {
  try {
    const uit = execSync(`git diff --name-only --diff-filter=A ${tag}..HEAD -- game/js`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return uit.split('\n').filter((x) => x.endsWith('.js')).map((x) => x.replace(/^game\/js\//, '').replace(/\.js$/, ''));
  } catch (e) { return null; }
}

export function auditSweep(opt = {}) {
  const manifest = opt.manifest || JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const ex = opt.exists || exists, tx = opt.text || text;
  const sw = manifest.sweep22;
  const fouten = [], info = [];
  if (!sw) return { fouten: ['coop_coverage.json mist de sectie sweep22'], info, aantal: 0 };
  const feat = new Map(manifest.features.map((f) => [f.id, f]));
  const vensters = new Map((sw.venster || []).map((v) => [v.stap, v]));
  const ids = new Set();
  const gebruikt = new Set();
  const vensterRef = (waar, v) => { gebruikt.add(v); if (!vensters.has(v)) fouten.push(`${waar}: venster-stap ${v} staat niet in sweep22.venster`); };

  for (const s of sw.systemen || []) {
    if (ids.has(s.id)) fouten.push(`${s.id}: dubbele id`);
    ids.add(s.id);
    if (!(s.features || []).length) fouten.push(`${s.id}: geen systeem (features) uit de matrix`);
    let deels = false;
    for (const id of s.features || []) {
      const f = feat.get(id);
      if (!f) { fouten.push(`${s.id}: feature ${id} bestaat niet in coop_coverage.json`); continue; }
      if (f.status === 'gat') fouten.push(`${s.id}: ${id} is nog een gat (${f.issue || f.lead || '?'}); breng hem naar OK of deels met venster-stappen`);
      else if (!['OK', 'deels', 'nvt'].includes(f.status)) fouten.push(`${s.id}: ${id} heeft status ${f.status}`);
      if (f.status === 'deels') {
        deels = true;
        if (!String(f.gat || '').trim()) fouten.push(`${s.id}: ${id} is deels zonder reden (veld gat)`);
        if (!(f.venster || []).length) fouten.push(`${s.id}: ${id} is deels maar noemt geen venster-stappen (veld venster)`);
        for (const v of f.venster || []) vensterRef(`${s.id}/${id}`, v);
      }
      if (f.status !== 'nvt') for (const k of ['gast', 'beloning', 'wegval']) if (!String(f[k] || '').trim()) fouten.push(`${s.id}: ${id} beantwoordt de vraag ${k} niet`);
      const r = f.regel || {};
      if (!r.doc || !ex(r.doc) || !tx(r.doc).includes(r.zoek)) fouten.push(`${s.id}: ${id} heeft geen vindbare Samen-regel (${r.doc || '-'} met "${r.zoek || '-'}")`);
      if (f.status !== 'nvt' && !(f.test || []).length) fouten.push(`${s.id}: ${id} noemt geen test`);
      for (const t of f.test || []) if (!ex(t)) fouten.push(`${s.id}: test ${t} van ${id} bestaat niet`);
    }
    if (!(s.tests || []).length) fouten.push(`${s.id}: noemt geen eigen test (veld tests)`);
    for (const t of s.tests || []) if (!ex(t)) fouten.push(`${s.id}: test ${t} bestaat niet`);
    for (const v of s.venster || []) vensterRef(s.id, v);
    if (deels && !(s.venster || []).length && !(s.features || []).some((id) => ((feat.get(id) || {}).venster || []).length)) fouten.push(`${s.id}: deels zonder venster-stappen`);
  }

  // 3. nieuwe modules sinds de tag
  const claim = claimedBy(manifest);
  const modules = opt.nieuw !== undefined ? opt.nieuw : nieuweModules(sw.sinds);
  let geraakt = 0;
  if (modules === null) info.push(`git of tag ${sw.sinds} niet beschikbaar: de controle op nieuwe modules is overgeslagen`);
  else for (const mod of modules) {
    const c = claim(mod);
    const bron = opt.bron ? opt.bron(mod) : (ex('game/js/' + mod + '.js') ? tx('game/js/' + mod + '.js') : '');
    const raakt = TOUCH.test(bron);
    if (raakt) geraakt++;
    if (!c.features.length && !c.nvt) fouten.push(`nieuwe module game/js/${mod}.js (sinds ${sw.sinds}) hoort bij geen systeem en staat niet onder nietCoopRelevant`);
    else if (!c.features.length && raakt) fouten.push(`nieuwe module game/js/${mod}.js raakt world.player of host-/gastvelden maar staat alleen onder nietCoopRelevant: breng hem onder bij een systeem`);
  }
  for (const x of manifest.nietCoopRelevant || []) if (!String(x.reden || '').trim()) fouten.push(`nietCoopRelevant ${x.glob}: reden ontbreekt`);

  // 4. controles
  for (const c of sw.controles || []) {
    if (!(c.tests || []).length) fouten.push(`controle ${c.id}: geen test`);
    for (const t of c.tests || []) if (!ex(t)) fouten.push(`controle ${c.id}: test ${t} bestaat niet`);
    for (const v of c.venster || []) vensterRef('controle ' + c.id, v);
  }
  // 5. vensterstappen en draaiboek
  const doc = sw.doc && ex(sw.doc) ? tx(sw.doc) : null;
  if (!doc) fouten.push(`het draaiboek ${sw.doc} bestaat niet`);
  for (const v of sw.venster || []) {
    if (!ex(v.bestand) || !tx(v.bestand).includes(v.zoek)) fouten.push(`venster-stap ${v.stap}: ${v.bestand} bevat "${v.zoek}" niet`);
    if (doc && !doc.includes('`' + v.stap + '`')) fouten.push(`venster-stap ${v.stap} staat niet in het draaiboek ${sw.doc}`);
    if (!gebruikt.has(v.stap)) fouten.push(`venster-stap ${v.stap} hoort bij geen systeem of controle`);
  }
  if (doc) {
    for (const s of sw.systemen || []) if (!doc.includes('`' + s.id + '`')) fouten.push(`het draaiboek noemt systeem ${s.id} niet`);
    for (const c of sw.controles || []) if (!doc.includes('`' + c.id + '`')) fouten.push(`het draaiboek noemt controle ${c.id} niet`);
  }
  return { fouten, info, aantal: (sw.systemen || []).length, nieuw: modules ? modules.length : null, geraakt };
}

function main() {
  const r = auditSweep();
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    console.log(`coop-sweep-audit: ${r.aantal} systemen, ${r.nieuw === null ? 'nieuwe modules niet gecontroleerd' : r.nieuw + ' nieuwe modules (' + r.geraakt + ' raken spelers of host/gast)'}, ${r.fouten.length} blokkerend`);
    for (const i of r.info) console.log('INFO  ' + i);
    for (const f of r.fouten) console.log('FOUT  ' + f);
  }
  return r.fouten.length ? 1 : 0;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) process.exit(main());
