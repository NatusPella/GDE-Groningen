// Generates the readable casting booklet from the character dossiers: the cast list, the "who comes when"
// matrix (character x act, from game/storydata/script.json: the callsheet of the story), the scene board
// per step (who speaks, who is new), and one casting card per character with its relations.
// Reads only; writes markdown (and HTML with --html) to a folder outside the repo by default.
//   node scripts/characterdossiers_export.mjs                  markdown to <tmp>/gde-castingboekje
//   node scripts/characterdossiers_export.mjs --html           also a single HTML page
//   node scripts/characterdossiers_export.mjs --out=<dir>      choose the folder
//   node scripts/characterdossiers_export.mjs --id=tammo       one card to stdout
//   node scripts/characterdossiers_export.mjs --matrix         only the cast list and the matrix to stdout
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = await import('../game/js/characterdossiers.js');
const B = await import('../game/js/characterdossiers_base.js');
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/storydata/script.json'), 'utf8'));

const TIER_NL = { lead: 'hoofdrol', supporting: 'bijrol', minor: 'kleine rol', cameo: 'cameo', mentioned: 'genoemd (buiten beeld)', group: 'groep' };
const STATUS_NL = { canon: 'in het spel of de docs', candidate: 'kandidaat (inspiratielijst, nog niet besloten)' };
const act6 = 'Deel 4';

// ---- who comes when, from the script ----
const stepInfo = new Map(); // step -> { act, title, region, speakers: Map(key -> lines) }
const stepOrder = [];
for (const sc of script.scenes) {
  if (!stepInfo.has(sc.step)) { stepInfo.set(sc.step, { act: sc.act, title: sc.title.split(':')[0], region: sc.region, speakers: new Map() }); stepOrder.push(sc.step); }
  const info = stepInfo.get(sc.step);
  for (const l of sc.lines || []) if (l.key) info.speakers.set(l.key, (info.speakers.get(l.key) || 0) + 1);
}
const byKey = new Map(D.DOSSIERS.filter((d) => d.speakerKey !== B.NA).map((d) => [d.speakerKey, d]));
const actOf = (step) => (step === 'E' ? 5 : stepInfo.has(step) ? stepInfo.get(step).act : null);

function linesPerAct(d) {
  const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  if (d.speakerKey === B.NA) return out;
  for (const info of stepInfo.values()) out[info.act] += info.speakers.get(d.speakerKey) || 0;
  return out;
}
function presence(d) { // declared presence (first to last step) for the silent cells
  const a = actOf(d.firstStep), z = actOf(d.lastStep);
  return (act) => (a && z && act >= a && act <= z);
}

const esc = (s) => String(s).replace(/\|/g, '\\|');
const val = (v) => (Array.isArray(v) ? v.join('; ') : v && typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k === 'all' ? 'altijd' : k}: ${x}`).join('; ') : String(v));
const mark = (d, k) => (d.canon.includes(k) ? '' : (B.isNA(d[k]) ? '' : ' *(voorstel)*'));

function castList() {
  const rows = ['| Id | Naam | Rol | Leeftijd | Woont | Eerste | Laatste | Status |', '|---|---|---|---|---|---|---|---|'];
  for (const d of D.DOSSIERS) rows.push(`| ${d.id} | ${esc(d.name)} | ${TIER_NL[d.tier]} | ${d.age} | ${esc(d.homePlace)} | ${d.firstStep} | ${d.lastStep} | ${d.status === 'canon' ? 'canon' : 'kandidaat'} |`);
  return rows.join('\n');
}

function matrix() {
  const head = ['| Personage | Akte 1 | Akte 2 | Akte 3 | Akte 4 | Akte 5 | Deel 4 |', '|---|---|---|---|---|---|---|'];
  const rows = [];
  for (const d of D.DOSSIERS) {
    const l = linesPerAct(d), here = presence(d);
    const cells = [1, 2, 3, 4, 5, 6].map((a) => (l[a] ? String(l[a]) : here(a) ? '○' : '·'));
    if (cells.every((c) => c === '·')) continue; // never in the script: only on the cast list
    rows.push(`| ${esc(d.name)} | ${cells.join(' | ')} |`);
  }
  return head.concat(rows).join('\n') + '\n\nGetal = gesproken regels in het script; ○ = in de akte aanwezig of genoemd zonder regel; · = niet in beeld.';
}

function sceneBoard() {
  const rows = ['| Stap | Akte | Plaats | Wie praat (regels) | Nieuw in beeld |', '|---|---|---|---|---|'];
  for (const step of stepOrder) {
    const info = stepInfo.get(step);
    const who = [...info.speakers.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${(byKey.get(k) || { nick: k }).name.split(' ')[0]} ${n}`).join(', ');
    const fresh = D.DOSSIERS.filter((d) => d.firstStep === step).map((d) => d.name.split(' ')[0]).join(', ');
    rows.push(`| ${step} | ${info.act === 6 ? act6 : info.act} | ${esc(info.region)} | ${esc(who)} | ${esc(fresh)} |`);
  }
  return rows.join('\n');
}

function card(d) {
  const L = [];
  const f = (label, k) => L.push(`- **${label}:** ${val(d[k])}${mark(d, k)}`);
  L.push(`### ${d.name} (\`${d.id}\`)`, '');
  L.push(`${TIER_NL[d.tier]} | ${STATUS_NL[d.status]} | ${d.tagline === B.NA ? '' : `*${d.tagline}*`}`, '');
  L.push('**Wie**', '');
  f('Roepnaam', 'nick'); f('Leeftijd', 'age'); f('Aanspreekvorm', 'pronoun');
  const by = B.birthYears(d);
  L.push(`- **Geboortejaar (afgeleid, nooit getoond):** ${by ? `${by[0]} of ${by[1]}` : B.NA}`);
  L.push('', '**Wonen**', '');
  f('Woonplaats', 'homePlace'); f('Woonadres in woorden', 'homeAddress'); f('Huisgenoten', 'household'); f('Woonplek per akte', 'homeByAct'); f('Op de kaart', 'mapLink');
  L.push('', '**Achtergrond**', '');
  f('Komt uit', 'origin'); f('Opleiding', 'education'); f('Werk', 'work'); f('Werkgever', 'employer'); f('Hobby\'s', 'hobbies');
  L.push('', '**Karakter**', '');
  f('Eigenschappen', 'traits'); f('Wil', 'want'); f('Heeft nodig', 'need'); f('Wond of angst', 'fear'); f('Gewoontes en tics', 'habits'); f('Karakterboog per akte', 'arc');
  L.push('', '**Taal, stem, uiterlijk**', '');
  f('Taal', 'dialect'); f('Zinsritme', 'rhythm'); f('Uitdrukkingen', 'phrases'); f('Stem', 'voice'); f('Stemtag', 'voiceTag'); f('Uiterlijk', 'look'); f('Kledingrol', 'outfitRole'); f('Kostuum per akte', 'outfitByAct');
  L.push('', '**In het verhaal**', '');
  f('Eerste verschijning', 'firstStep'); f('Laatste verschijning', 'lastStep'); f('Geïntroduceerd door', 'introducedBy'); f('Rol', 'storyRole'); f('Heeft nodig van het duo', 'needsFromDuo'); f('Minigames en bijbanen', 'minigames');
  f('Canon-opmerkingen', 'canonNotes'); f('Gevoelig', 'sensitive');
  const reveals = Object.entries(d.reveal).map(([k, v]) => `${k} vanaf ${v}`).join('; ') || 'alles direct bij de ontmoeting';
  L.push(`- **Bekend in het spel vanaf:** ${reveals}`);
  const rels = D.relationsFor(d.id);
  if (rels.length) {
    L.push('', '**Relaties**', '', '| Met | Soort | Hij of zij is | Ziet in mij | Sinds | Toon | Weet van de ander | Gedeeld verhaaltje |', '|---|---|---|---|---|---|---|---|');
    for (const r of rels) L.push(`| ${esc(D.dossierOf(r.to).name)} | ${r.type}${r.canon ? '' : ' (voorstel)'} | ${esc(r.is)} | ${esc(r.theyAre)} | ${esc(r.since)} | ${esc(r.tone)} | ${esc(r.knows)} | ${esc(r.shared)} |`);
  }
  return L.join('\n');
}

function booklet() {
  const parts = ['# Castingboekje: personagedossiers van GDE Groningen', '',
    'Gegenereerd door `scripts/characterdossiers_export.mjs` uit `game/js/characterdossiers*.js`. Niet met de hand bewerken: pas de dossiers aan en genereer opnieuw. *(voorstel)* achter een veld betekent: ingevuld door de dossierschrijver, nog te beoordelen; zonder markering komt het uit een bron in de repo (canon).', '',
    '## 1. Castlijst', '', castList(), '', '## 2. Wie komt wanneer (callsheet)', '', matrix(), '', '## 3. Scènebord per stap', '', sceneBoard(), '', '## 4. Castingkaarten', ''];
  for (const tier of ['lead', 'supporting', 'minor', 'cameo', 'mentioned', 'group']) {
    const list = D.DOSSIERS.filter((d) => d.tier === tier);
    if (!list.length) continue;
    parts.push(`## 4.${['lead', 'supporting', 'minor', 'cameo', 'mentioned', 'group'].indexOf(tier) + 1} ${TIER_NL[tier][0].toUpperCase()}${TIER_NL[tier].slice(1)}`, '');
    for (const d of list) parts.push(card(d), '');
  }
  return parts.join('\n');
}

// a tiny markdown to HTML for what the booklet uses (headings, tables, bullets, bold, italics, code)
function html(md) {
  const inline = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\\\|/g, '|').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`(.+?)`/g, '<code>$1</code>');
  const out = [];
  let table = null, list = false;
  const closeTable = () => { if (table) { out.push('</table>'); table = null; } };
  const closeList = () => { if (list) { out.push('</ul>'); list = false; } };
  for (const line of md.split('\n')) {
    if (line.startsWith('|')) {
      closeList();
      const cells = line.split(/(?<!\\)\|/).slice(1, -1);
      if (cells.every((c) => /^-+$/.test(c.trim()))) continue;
      if (!table) { out.push('<table>'); table = 'head'; out.push('<tr>' + cells.map((c) => `<th>${inline(c.trim())}</th>`).join('') + '</tr>'); continue; }
      out.push('<tr>' + cells.map((c) => `<td>${inline(c.trim())}</td>`).join('') + '</tr>');
      continue;
    }
    closeTable();
    const h = line.match(/^(#{1,3}) (.*)/);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (line.startsWith('- ')) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    closeList();
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  closeTable(); closeList();
  return `<!doctype html><html lang="nl"><meta charset="utf-8"><title>Castingboekje GDE Groningen</title><style>body{font:15px/1.45 system-ui,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse;margin:.8rem 0;font-size:13px}td,th{border:1px solid #bbb;padding:3px 6px;vertical-align:top}th{background:#eee}h3{border-top:3px solid #333;padding-top:.6rem}</style><body>${out.join('\n')}</body></html>`;
}

const arg = (n) => process.argv.slice(2).find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const flag = (n) => process.argv.includes(`--${n}`);
if (arg('id')) {
  const d = D.dossierOf(arg('id'));
  if (!d) { console.error(`onbekend personage: ${arg('id')}`); process.exit(1); }
  console.log(card(d));
} else if (flag('matrix')) {
  console.log(`## Castlijst\n\n${castList()}\n\n## Wie komt wanneer\n\n${matrix()}`);
} else {
  const dir = arg('out') || path.join(os.tmpdir(), 'gde-castingboekje');
  fs.mkdirSync(dir, { recursive: true });
  const md = booklet();
  fs.writeFileSync(path.join(dir, 'castingboekje.md'), md);
  if (flag('html')) fs.writeFileSync(path.join(dir, 'castingboekje.html'), html(md));
  console.log(`castingboekje: ${D.DOSSIERS.length} kaarten, ${(md.length / 1024).toFixed(0)} kB, geschreven naar ${dir}`);
}
