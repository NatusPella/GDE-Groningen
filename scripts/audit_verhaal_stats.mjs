// Telt herhaling en tics in de speltekst van het verhaal (alleen lezen, geen netwerk).
//   node scripts/audit_verhaal_stats.mjs            samenvatting
//   node scripts/audit_verhaal_stats.mjs --json     alles als json
// Doel: de redactie-audit (docs/AUDIT-VERHAAL-23-11.md) kan herhaalde openingen, uitlegzinnen,
// kliches en een gedeelde stem per personage aanwijzen met getallen in plaats van gevoel.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/storydata/script.json'), 'utf8'));
const JSON_OUT = process.argv.includes('--json');

const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
const lines = [];
for (const s of data.scenes) for (const l of s.lines) lines.push({ scene: s.id, speaker: l.speaker, text: l.text, channel: l.channel, n: norm(l.text).split(' ').filter(Boolean).length });

const top = (map, k, min = 2) => [...map.entries()].filter(([, v]) => v >= min).sort((a, b) => b[1] - a[1]).slice(0, k);
const bump = (m, k, id) => { const e = m.get(k) || { n: 0, ids: [] }; e.n++; if (e.ids.length < 4) e.ids.push(id); m.set(k, e); };
const flat = (m, k, min) => [...m.entries()].filter(([, v]) => v.n >= min).sort((a, b) => b[1].n - a[1].n).slice(0, k).map(([w, v]) => `${v.n}x "${w}" (${v.ids.join(', ')})`);

const out = {};
out.totalLines = lines.length;

// 1. per spreker: aantal, gemiddelde lengte, lange beurten, vraagzinnen, puntjes
const per = new Map();
for (const l of lines) {
  const p = per.get(l.speaker) || { n: 0, w: 0, long: 0, q: 0, ell: 0, excl: 0, hee: 0 };
  p.n++; p.w += l.n; if (l.n > 25) p.long++;
  if (/\?\s*$/.test(l.text)) p.q++;
  if (/…|\.\.\./.test(l.text)) p.ell++;
  if (/!\s*$/.test(l.text)) p.excl++;
  if (/,? (hè|he)\?\s*$/i.test(l.text)) p.hee++;
  per.set(l.speaker, p);
}
out.perSpeaker = [...per.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 24).map(([s, p]) => `${s}: ${p.n} regels, gem ${(p.w / p.n).toFixed(1)} w, >25w ${p.long}, vraag ${p.q}, puntjes ${p.ell}, uitroep ${p.excl}, hè? ${p.hee}`);

// 2. openingen (eerste twee woorden), over alles en per spreker
const open2 = new Map(), open1 = new Map();
for (const l of lines) { const w = norm(l.text).split(' '); bump(open2, w.slice(0, 2).join(' '), l.scene); bump(open1, w[0], l.scene); }
out.openings2 = flat(open2, 25, 8);
out.openings1 = flat(open1, 15, 30);

// 3. herhaalde trigrammen en 4-grammen (over sprekers heen en binnen een spreker)
for (const [N, key] of [[3, 'trigrams'], [4, 'fourgrams']]) {
  const m = new Map();
  for (const l of lines) {
    const w = norm(l.text).split(' ');
    const seen = new Set();
    for (let i = 0; i + N <= w.length; i++) { const g = w.slice(i, i + N).join(' '); if (seen.has(g)) continue; seen.add(g); bump(m, g, `${l.scene}/${l.speaker}`); }
  }
  out[key] = flat(m, 40, N === 3 ? 7 : 4);
}

// 4. kliche- en uitlegpatronen
const PATTERNS = {
  'zoals je weet / weet je nog (uitleg)': /\b(zoals je weet|weet je nog|je weet hoe|je weet wat|zoals ik al zei|zoals gezegd)\b/i,
  'laat me raden / laat ik je': /\b(laat me raden|laat ik je|laat mij je)\b/i,
  'luister(, )': /^luister\b|\bluister,/i,
  'dat is niet wat het lijkt': /niet wat het lijkt|ziet er (niet )?uit als/i,
  'ik heb een slecht gevoel': /slecht gevoel|niet pluis|dat voelt niet goed/i,
  'wat een ... (uitroep)': /^wat een\b/i,
  'dat is nogal wat': /nogal wat|dat is een hele|dat is geen kleinigheid/i,
  'laten we (aanzet)': /\blaten we\b/i,
  'tijd om': /\btijd om\b|\bhet is tijd\b/i,
  'dit is (het) moment': /dit is het moment|het moment (is|van)/i,
  'alles of niets / nu of nooit': /alles of niets|nu of nooit/i,
  'ik zweer': /\bik zweer\b/i,
  'dat kun je niet menen': /niet menen|dat meen je niet|serieus\?/i,
  'op een of andere manier': /een of andere manier|op de een of andere/i,
  'verdomd/verdorie als stoplap': /\b(verdorie|verdomme|verdomd)\b/i,
  'echt waar / echt?': /\bechtwaar|echt waar\b|^echt\?/i,
  'wacht even / wacht': /^wacht( even)?\b/i,
  'dat is precies': /\bdat is precies\b/i,
  'dat is het': /^dat is het\b|^en dat is\b/i,
  'ik zeg niks (grap)': /\bik zeg niks\b/i,
  'geen woord / kein woord': /\bgeen woord\b/i,
  'het is een tekening/concept': /\bdat is een concept\b|\bhet is een concept\b/i,
  'dat betekent (nee/ja) (vertaalgrap)': /\bdat betekent\b/i,
  'eigenlijk': /\beigenlijk\b/i,
  'gewoon': /\bgewoon\b/i,
  'echt': /\bechte?\b/i,
  'precies': /\bprecies\b/i,
  'natuurlijk': /\bnatuurlijk\b/i,
  'weet je': /\bweet je\b/i,
  'ja maar': /^ja,? maar\b/i,
  'nou ja / nou': /^nou\b/i,
  'tja': /^tja\b/i,
  'hm / hmm': /^hm+\b/i,
  'kijk (aanzet)': /^kijk\b/i,
  'oke / oké': /^(oke|oké|ok)\b/i,
  'prima.': /^prima\b/i,
  'goed.': /^goed[,.]/i,
  'ach': /^ach\b/i,
  'tsja / pff / pfff': /^(pff+|tsja)\b/i,
  'drie-vier woorden staccato (<=3 w)': null,
};
out.patterns = [];
for (const [name, re] of Object.entries(PATTERNS)) {
  if (!re) continue;
  const hits = lines.filter((l) => re.test(l.text));
  out.patterns.push({ name, n: hits.length, voorbeelden: hits.slice(0, 4).map((h) => `${h.scene} ${h.speaker}: ${h.text.slice(0, 70)}`) });
}
out.patterns.sort((a, b) => b.n - a.n);

// 5. stemverschil: woorden die per spreker typisch zijn (log-ratio) en overlap in topwoorden
const STOP = new Set('de het een en van in is dat die op te ik je jij we wij ze zij hij het niet maar dan nog ook er aan voor met als zo bij naar om wat nu hier daar kan wil ga heb ben was zijn wordt worden mijn jouw ons dit deze dus al nee ja moi'.split(' '));
const bySp = new Map();
for (const l of lines) { const m = bySp.get(l.speaker) || { n: 0, c: new Map() }; for (const w of norm(l.text).split(' ')) { if (w.length < 3 || STOP.has(w)) continue; m.n++; m.c.set(w, (m.c.get(w) || 0) + 1); } bySp.set(l.speaker, m); }
const hoofd = [...per.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12).map(([s]) => s);
out.topWords = hoofd.map((s) => `${s}: ` + [...bySp.get(s).c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w, c]) => `${w}(${c})`).join(' '));
// overlap tussen sprekerparen (Jaccard van top-60 woorden): hoge overlap = dezelfde stem
const topSet = (s) => new Set([...bySp.get(s).c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([w]) => w));
const pairs = [];
for (let i = 0; i < hoofd.length; i++) for (let j = i + 1; j < hoofd.length; j++) { const A = topSet(hoofd[i]), B = topSet(hoofd[j]); const inter = [...A].filter((w) => B.has(w)).length; pairs.push([hoofd[i], hoofd[j], inter / (A.size + B.size - inter)]); }
out.voiceOverlap = pairs.sort((a, b) => b[2] - a[2]).slice(0, 8).map(([a, b, v]) => `${a} / ${b}: ${v.toFixed(2)}`);

// 6. lange beurten en regels per scene
out.longTurns = lines.filter((l) => l.n > 28).sort((a, b) => b.n - a.n).slice(0, 25).map((l) => `${l.scene} ${l.speaker} (${l.n}w): ${l.text.slice(0, 80)}`);

// 7. dezelfde slotzin / grapstructuur "X. Dat is Y." en "Dat is een/geen ..."
const structs = {
  'Dat is een X.': /^dat is (een|geen) [^.!?]{2,40}[.!]$/i,
  'Het is een X.': /^het is (een|geen) [^.!?]{2,40}[.!]$/i,
  'X, maar dan Y': /\bmaar dan\b/i,
  'niet X maar Y': /\bniet [^,.]{2,30}, maar\b/i,
  'Een X is een Y met een Z (definitiegrap)': /\bis (een|de) [^.]{2,30} met (een|de|haar|zijn) /i,
  'Dat betekent X, met een Y (strikje)': /\bmet een [a-zë]+je\b/i,
  'drie-opsomming X, Y en Z': /^[^,]{3,30}, [^,]{3,30} en [^,.]{3,30}[.!]$/,
  'X? Y.? (vraag-antwoord zelf)': /^[^?]{3,40}\? [^?]{3,40}\.$/,
};
out.structures = Object.entries(structs).map(([n, re]) => ({ n: lines.filter((l) => re.test(l.text)).length, name: n }));

// 8. scenes met meer dan 14 regels, en scenes zonder wens (alleen telling)
const perScene = new Map();
for (const l of lines) perScene.set(l.scene, (perScene.get(l.scene) || 0) + 1);
out.longScenes = [...perScene.entries()].filter(([, n]) => n > 16).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([s, n]) => `${s}: ${n} regels`);

if (JSON_OUT) console.log(JSON.stringify(out, null, 1));
else for (const [k, v] of Object.entries(out)) {
  console.log(`\n## ${k}`);
  if (Array.isArray(v)) for (const x of v) console.log(typeof x === 'string' ? '  ' + x : '  ' + (x.n !== undefined ? `${x.n}x ${x.name}${x.voorbeelden ? '  | ' + x.voorbeelden.slice(0, 2).join(' | ') : ''}` : JSON.stringify(x)));
  else console.log('  ' + v);
}
