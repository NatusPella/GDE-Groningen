// Bereidt het humorpaneel voor (docs/verhaal/SCHRIJFREGELS-21-11.md): drie onafhankelijke beoordelaars krijgen elk dezelfde beats in een
// andere volgorde van varianten (positie-effect uitgemiddeld) en kiezen per beat de beste. Schrijft invoerbestanden en de
// ontsleutelkaart naar de map die als argument komt (niet in git). `--decode <map>` leest de stemmen en vult het paneel in de
// humorbestanden (chosen, panel). Geen netwerk.
//   node scripts/humor_panel_prepare.mjs <map>
//   node scripts/humor_panel_prepare.mjs --decode <map>
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const dataDir = new URL('game/storydata/', root);
const files = fs.readdirSync(dataDir).filter((x) => /^humor(\.[a-z0-9]+)?\.json$/.test(x)).sort();
const script = JSON.parse(fs.readFileSync(new URL('game/storydata/script.json', root), 'utf8'));
const scene = new Map(script.scenes.map((s) => [s.id, s]));

const all = [];
for (const f of files) for (const b of JSON.parse(fs.readFileSync(new URL(f, dataDir), 'utf8')).beats) all.push({ ...b, file: f });

// positie van de opties: 0..3 = variant 0, 1, 2 en de neutrale terugval ('neutral')
const ORDERS = [[0, 1, 2, 3], [3, 2, 1, 0], [1, 3, 0, 2]];
const LABELS = ['A', 'B', 'C', 'D'];
const optionText = (b, k) => (k === 3 ? b.neutral : b.variants[k]);
const optionKey = (k) => (k === 3 ? 'neutral' : k);

function around(b) {
  const sc = scene.get(b.scene);
  if (!sc) return { before: [], after: [] };
  const i = sc.lines.findIndex((l) => l.humor === b.id);
  const f = (l) => `${l.speaker}: ${l.text}`;
  return { before: sc.lines.slice(Math.max(0, i - 3), i).map(f), after: sc.lines.slice(i + 1, i + 2).map(f) };
}

const arg = process.argv.slice(2);
if (arg[0] === '--decode') {
  const dir = arg[1];
  const keyMap = JSON.parse(fs.readFileSync(path.join(dir, 'sleutel.json'), 'utf8'));
  const votes = {};
  for (let r = 0; r < 3; r++) {
    const p = path.join(dir, `stemmen-${r + 1}.json`);
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const v of j.stemmen || j) {
      const m = keyMap[r][v.id];
      if (!m) continue;
      const idx = LABELS.indexOf(String(v.keuze).toUpperCase());
      if (idx < 0) continue;
      (votes[v.id] = votes[v.id] || []).push({ key: m[idx], reden: v.reden, zekerheid: v.zekerheid });
    }
  }
  const out = [];
  const byFile = {};
  for (const b of all) (byFile[b.file] = byFile[b.file] || JSON.parse(fs.readFileSync(new URL(b.file, dataDir), 'utf8')));
  for (const b of all) {
    const v = votes[b.id];
    if (!v || v.length < 3) { console.log('geen drie stemmen voor ' + b.id); continue; }
    const keys = v.map((x) => x.key);
    const count = new Map();
    for (const k of keys) count.set(k, (count.get(k) || 0) + 1);
    const top = [...count.entries()].sort((a, c) => c[1] - a[1]);
    let chosen;
    let tiebreak;
    if (top[0][1] >= 2) chosen = top[0][0];
    else {
      // 1-1-1: de variant die het dichtst bij de bewezen grappen ligt = de eerste variant van de schrijver (variant 0), tenzij die niet in de stemmen zit
      chosen = keys.includes(0) ? 0 : keys.includes('neutral') ? 'neutral' : keys[0];
      tiebreak = chosen;
    }
    const sterkte = v.map((x) => x.zekerheid);
    const zek = top[0][1] === 3 ? (sterkte.includes('laag') ? 'midden' : 'hoog') : top[0][1] === 2 ? (sterkte.includes('hoog') ? 'midden' : 'laag') : 'laag';
    const reden = (v.find((x) => x.key === chosen) || v[0]).reden;
    const beat = byFile[b.file].beats.find((x) => x.id === b.id);
    beat.chosen = chosen;
    beat.panel = { votes: keys, reason: String(reden || '').slice(0, 220), certainty: zek, ...(tiebreak !== undefined ? { tiebreak } : {}) };
    out.push(b.id);
  }
  for (const [f, j] of Object.entries(byFile)) fs.writeFileSync(new URL(f, dataDir), JSON.stringify(j, null, 1) + '\n');
  console.log(`${out.length} beats beoordeeld`);
  process.exit(0);
}

const dir = arg[0];
if (!dir) { console.log('gebruik: humor_panel_prepare.mjs <map>'); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const sleutel = [];
for (let r = 0; r < 3; r++) {
  const map = {};
  const md = [`# Humorpaneel: beoordelaar ${r + 1} (${all.length} beats)\n`];
  md.push('Kies per beat de variant (A, B, C of D) die het best werkt als komische beat in het spel. Let op: timing, de toon van het personage, Groningse droogheid en understatement, geen uitleg, een kicker; en past het bij wat er voor en na komt? Een veilige neutrale optie kan de beste zijn als de grappen forceren.\n');
  for (const b of all) {
    const order = ORDERS[r];
    map[b.id] = order.map(optionKey);
    const { before, after } = around(b);
    md.push(`## ${b.id} (scène ${b.scene}, spreker ${b.speaker})`);
    md.push(`Context: ${b.context}`);
    md.push(`Shotpatroon: ${b.shot}`);
    if (before.length) md.push('Ervoor:\n' + before.map((x) => '- ' + x).join('\n'));
    if (after.length) md.push('Erna:\n' + after.map((x) => '- ' + x).join('\n'));
    md.push('Opties:\n' + order.map((k, i) => `- ${LABELS[i]}: ${optionText(b, k)}`).join('\n') + '\n');
  }
  fs.writeFileSync(path.join(dir, `invoer-${r + 1}.md`), md.join('\n'));
  sleutel.push(map);
}
fs.writeFileSync(path.join(dir, 'sleutel.json'), JSON.stringify(sleutel, null, 1));
console.log(`${all.length} beats naar ${dir}`);
