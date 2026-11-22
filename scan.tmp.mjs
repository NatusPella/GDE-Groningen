import { collectTexts, isProse } from './scripts/text_audit.mjs';
import { kaal } from './scripts/tekst_kwaliteit_audit.mjs';
const items = collectTexts().filter((i) => i.kind !== 'changelog' && isProse(kaal(i.text).split('\u0001').join(' ')));
const pats = {
  kmh: /\d\s?(?:km\/u|kmh|km per uur|km\/uur|kilometer per uur)\b/gi,
  eur: /(?:€\s?\d[\d.,]*|\d[\d.,]*\s?euro\b)/gi,
  meter: /\d\s?(?:meters?|m)\b(?!\/)/g,
  km: /\d\s?(?:km|kilometers?)\b(?!\/)/g,
  uur: /\d+\s?(?:u\b|uur\b|uren\b)/g,
  min: /\d+\s?(?:min\b|minuten?\b|min\.)/g,
  kleinletter: null,
};
for (const [k, re] of Object.entries(pats)) {
  if (!re) continue;
  const c = {};
  for (const it of items) for (const m of it.text.matchAll(re)) { const key = m[0].replace(/\d[\d.,]*/g, 'N').replace(/\s+/g, '_'); (c[key] ||= []).push(`${it.file}:${it.line}`); }
  console.log(k, Object.entries(c).map(([a, b]) => `${a}=${b.length}`).join('  '));
}
const ex = (re, n = 6) => { const r = []; for (const it of items) if (re.test(it.text)) r.push(`${it.file}:${it.line} ${it.text.slice(0, 90).replace(/\n/g, ' ')}`); return r.slice(0, n); };
console.log('--- euro voor getal'); console.log(ex(/€\s?\d/).join('\n'));
console.log('--- N euro'); console.log(ex(/\d\s?euro\b/).join('\n'));
console.log('--- getallen >= 1000 zonder punt');
const r = [];
for (const it of items) for (const m of it.text.matchAll(/(?<![\d.,:/#-])(\d{4,})(?![\d.,:/])\s?(€|euro|meter|m\b|km|kg|ha|punten|stappen|dagen|keer|stuks|liter|pk|seconden|sec|jaar)?/g)) { const n = +m[1]; if (n >= 1900 && n <= 2100 && !m[2]) continue; r.push(`${it.file}:${it.line} ${m[0]} | ${it.text.slice(0, 80).replace(/\n/g, ' ')}`); }
console.log(r.length); console.log(r.slice(0, 60).join('\n'));
