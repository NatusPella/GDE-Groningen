// Introductieprotocol (#1123, hoofdstuk 8 van docs/VERHAAL-ANALYSE-21-11.md): elk personage met meer dan één regel is
// aangekondigd voordat hij zelf praat (een ander personage noemt zijn naam in een eerdere scène) of krijgt bij zijn
// eerste scène een naamkaart (regie "Naamkaart: ..."). Radio en telefoon introduceren nooit: de aankondiging moet uit een
// stem komen die niet de eigen is. Bestaande uitzonderingen: scripts/introduction_allow.json (lijst van sprekers);
// de lijst wordt alleen korter (een opgelost personage moet eruit: `--write`).
// node scripts/introduction_test.mjs [--write]
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('game/storydata/script.json', root), 'utf8'));
const allowFile = new URL('scripts/introduction_allow.json', root);
const WRITE = process.argv.includes('--write');

const HEROES = new Set(['Tammo', 'Tessa']);
const norm = (s) => String(s || '').toLowerCase();
// naamsvarianten waarmee anderen een personage noemen: de voornaam en een los woord uit de naam ("Mevrouw Hoving" -> "hoving")
export function aliases(name) {
  const base = norm(name).replace(/^(mevrouw|dokter|kapitein|oma|duivenmelker|boer)\s+/, '');
  const set = new Set([norm(name), base]);
  for (const p of norm(name).split(/[\s&]+/)) if (p.length > 3) set.add(p);
  if (norm(name) === 'oma trijntje') set.add('oma');
  if (norm(name) === 'kapitein klaas') set.add('klaas');
  return [...set];
}
const has = (text, alias) => new RegExp(`(^|[^a-zà-ÿ])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zà-ÿ]|$)`, 'i').test(text);

export function introProblems(scenes) {
  const lines = {};
  for (const sc of scenes) for (const l of sc.lines || []) {
    if (l.channel === 'app-stil') continue;
    (lines[l.speaker] = lines[l.speaker] || []).push(sc.id);
  }
  const out = [];
  for (const [who, ids] of Object.entries(lines)) {
    if (HEROES.has(who) || ids.length < 2) continue;
    const first = ids[0];
    const idx = scenes.findIndex((s) => s.id === first);
    const al = aliases(who);
    const carded = (scenes[idx].regie || []).some((r) => /Naamkaart/i.test(r) && al.some((a) => has(r, a)));
    let announced = false;
    for (let i = 0; i <= idx && !announced; i++) {
      for (const l of scenes[i].lines || []) {
        if (i === idx && l.speaker === who) break;
        if (l.speaker !== who && al.some((a) => has(l.text, a))) { announced = true; break; }
      }
    }
    if (!carded && !announced) out.push(who);
  }
  return out;
}

const found = introProblems(data.scenes).sort();
if (WRITE) {
  fs.writeFileSync(allowFile, JSON.stringify(found, null, 1) + '\n');
  console.log(`introduction_test: ${found.length} toegestane sprekers geschreven`);
  process.exit(0);
}
const allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')) : [];
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
for (const who of found) ok(allow.includes(who), `${who}: niet aangekondigd en geen naamkaart`, 'laat een ander personage hem noemen vóór zijn eerste scène');
for (const who of allow) ok(found.includes(who), `${who}: toegestaan maar al opgelost`, 'draai --write');
console.log(`introduction_test: ${n - fails}/${n} ok (${allow.length} toegestane uitzonderingen)`);
if (fails) process.exit(1);
