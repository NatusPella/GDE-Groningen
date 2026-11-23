// Geen placeholdertekst in wat de speler ziet (23-11: een titelkaart "TEST / TEST" in een beeldrun bleek van het testscript,
// maar zo'n tekst mag nooit in het spel staan). Scant de verhaaldata (game/storydata/*.json, alle tekstwaarden) en de
// spelerzichtbare letterlijke teksten in game/js (kicker, title, caption, text, label, desc, addMessage, showBanner, naamkaart).
//   node scripts/speltekst_placeholder_test.mjs
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../game/', import.meta.url);
// een hele waarde die alleen een testwoord is, of een bekend placeholderwoord ergens in de tekst
const WHOLE = /^\s*(test|testje|todo|tbd|xxx|fixme|placeholder|lorem|asdf|foo|bar|dummy|tekst hier|titel|kicker)\s*[.!]?\s*$/i;
const PART = /\b(TODO|FIXME|TBD|XXX+)\b|lorem ipsum|placeholder|dummy ?tekst/i;
export function placeholderIssue(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  if (WHOLE.test(text)) return 'alleen een testwoord';
  const m = PART.exec(text);
  return m ? `bevat "${m[0]}"` : null;
}

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.error('FAIL', m); } };

// de proef zelf
ok(placeholderIssue('TEST') && placeholderIssue('Test') && placeholderIssue('TODO: tekst') && placeholderIssue('Lorem ipsum dolor'), 'de controle herkent TEST, TODO en lorem ipsum');
ok(!placeholderIssue('Testdag in Veendam') && !placeholderIssue('De Martinitoren') && !placeholderIssue('Rondvaart'), 'gewone tekst gaat door');

// 1. de verhaaldata: elke tekstwaarde
const walk = (v, path, out) => {
  if (typeof v === 'string') { const i = placeholderIssue(v); if (i) out.push(`${path}: ${i} (${v.slice(0, 60)})`); }
  else if (Array.isArray(v)) v.forEach((x, k) => walk(x, `${path}[${k}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, out);
};
const dataHits = [];
for (const f of readdirSync(new URL('storydata/', ROOT)).filter((f) => f.endsWith('.json'))) walk(JSON.parse(readFileSync(new URL('storydata/' + f, ROOT), 'utf8')), f, dataHits);
ok(dataHits.length === 0, 'verhaaldata zonder placeholdertekst: ' + dataHits.slice(0, 8).join(' | '));

// 2. spelerzichtbare letterlijke teksten in de code
const FIELD = /\b(kicker|title|caption|subtitle|label|desc|text|naam|banner)\s*:\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
const CALL = /\b(addMessage|showBanner|showNameCard|toast)\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
const codeHits = [];
for (const f of readdirSync(new URL('js/', ROOT)).filter((f) => f.endsWith('.js'))) {
  const src = readFileSync(new URL('js/' + f, ROOT), 'utf8');
  src.split('\n').forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    for (const re of [FIELD, CALL]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) { const iss = placeholderIssue(m[3]); if (iss) codeHits.push(`${f}:${i + 1}: ${iss} (${m[3].slice(0, 50)})`); }
    }
  });
}
ok(codeHits.length === 0, 'spelerzichtbare teksten in game/js zonder placeholder: ' + codeHits.slice(0, 8).join(' | '));
console.log(`speltekst_placeholder_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
