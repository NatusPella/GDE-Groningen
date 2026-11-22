// Korte luisterlijst voor de eigenaar (22-11): van de 896 nieuwe stemclips van tts-ronde2 de ca. 40 die het meest verdacht zijn
// (top 30 op verdachtheid) plus een kleine steekproef (10 willekeurige uit de rest, vaste seed). De rest geldt als automatisch
// goedgekeurd: de detectoren (eindBurst, popBegin) zijn schoon en de maten liggen binnen de drempels.
//
//   node scripts/tts_verdacht.mjs            schrijft docs/TTS-VERDACHT-22-11.html (relatieve paden, in git),
//                                            docs/TTS-VERDACHT-22-11.md (methode, drempels, uitslag) en een file://-variant in %TEMP%
//   --base=<git-ref>                         basis van de nieuwe clips (standaard ff984eb61^1, de merge van tts-ronde2)
//   --top=30 --steekproef=10 --seed=2211     de omvang van de lijst
// Alleen ffmpeg (decoderen, één clip tegelijk) en wat rekenwerk; geen Electron.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { eindBurst, scoreClip } from './audio/ruisachtig_scan.mjs';
import { popBegin } from './audio/pop_begin.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VL = 'game/audio/voicelines';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const SR = 22050;
const TOP = Number(arg('top', '30')), SAMPLE = Number(arg('steekproef', '10')), SEED = Number(arg('seed', '2211'));
const BASE = arg('base', 'ff984eb61^1'), HEAD = arg('head', 'ff984eb61^2');

// Drempels (zie docs/TTS-VERDACHT-22-11.md)
export const T = {
  cpsPct: [0.01, 0.99],      // tekens per seconde buiten het 1e/99e percentiel van de spreker
  minTekens: 15,             // de tekens-per-seconde-maat geldt alleen voor regels van minstens zo veel tekens (korte regels zijn vooral stilte)
  minGroep: 20,              // kleinere sprekers gebruiken de gezamenlijke verdeling
  clipPeakDb: -0.1,          // piek tegen volle schaal
  clipSamples: 3,            // of meer monsters op >= 0,999
  lead: [0.35],              // stilte aan het begin (s) boven dit is verdacht (na de TTS-keten hoort die klein te zijn)
  trail: [0.5],              // stilte aan het eind (s)
  stilteDb: -45,
  rmsZ: 2.5,                 // RMS (dB) meer dan 2,5 standaarddeviatie van het gemiddelde van de spreker
  ruisAandeel: 0.25,         // aandeel ruisframes (ruisachtig_scan)
  herstelLead: 0.1,          // stilte aan het begin boven de ketenmarge (0,04 s) tot de grens hierboven: kenmerk van een pop-begin dat met staart_trimmer op nul is gezet
};
const W = { burst: 6, pop: 6, clip: 4, cps: 3, lead: 2, trail: 2, rms: 2, ruis: 3, getrimd: 1.5, gronings: 3 };

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
const files = git('diff', '--name-only', '--diff-filter=A', BASE, HEAD, '--', VL).split('\n').map((s) => s.trim()).filter((s) => /\.mp3$/.test(s));

// bestand -> sleutel, tekst, gesproken tekst, stem (manifest.json en tts.json per map)
const meta = new Map();
for (const dir of new Set(files.map((f) => f.split('/').slice(0, 4).join('/')))) {
  const mf = path.join(ROOT, dir, 'manifest.json');
  if (!fs.existsSync(mf)) continue;
  const man = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const tts = fs.existsSync(path.join(ROOT, dir, 'tts.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'tts.json'), 'utf8')) : {};
  for (const [key, v] of Object.entries(man)) {
    const sep = key.indexOf('|');
    meta.set(`${dir}/${v.src}`, { key, speaker: key.slice(0, sep), text: key.slice(sep + 1), dur: v.dur, voice: tts[key]?.voice || '', lang: tts[key]?.lang || '', spoken: tts[key]?.input || '' });
  }
}
const gronSet = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'gronings_spoken.json'), 'utf8'))));
const gronNieuw = new Set(git('diff', '-U0', BASE, HEAD, '--', 'scripts/gronings_spoken.json').split('\n').filter((l) => l.startsWith('+"')).map((l) => {
  try { return JSON.parse('{' + l.slice(1).replace(/,$/, '') + '}'); } catch (e) { return {}; }
}).flatMap((o) => Object.keys(o)));

function decode(f) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(ROOT, f), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength - (buf.byteLength % 4)));
}
const dB = (v) => 20 * Math.log10(v + 1e-9);

function measure(x) {
  const sec = x.length / SR;
  let peak = 0, hot = 0, e = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; if (a >= 0.999) hot++; e += x[i] * x[i]; }
  const g = Math.floor(0.02 * SR), n = Math.floor(x.length / g);
  const fr = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < g; j++) s += x[i * g + j] ** 2; fr[i] = dB(Math.sqrt(s / g)); }
  let a = 0; while (a < n && fr[a] < T.stilteDb) a++;
  let b = n - 1; while (b > 0 && fr[b] < T.stilteDb) b--;
  // RMS over de actieve frames (stilte telt niet mee)
  let es = 0, ec = 0; for (let i = 0; i < n; i++) if (fr[i] >= T.stilteDb) { es += 10 ** (fr[i] / 10); ec++; }
  const ruis = scoreClip(x);
  return {
    sec, peakDb: +dB(peak).toFixed(1), hot, rmsDb: +(ec ? 10 * Math.log10(es / ec) : -90).toFixed(1),
    lead: +(a * 0.02).toFixed(2), trail: +((n - 1 - b) * 0.02).toFixed(2),
    eind: eindBurst(x, SR), pop: popBegin(x, SR), ruisAandeel: +ruis.aandeel.toFixed(3), ruisStaart: ruis.staart,
  };
}

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };

console.log(`${files.length} nieuwe clips; meten...`);
const rows = [];
for (const f of files) {
  const m = meta.get(f);
  if (!m) { console.error('geen manifestregel voor', f); continue; }
  const x = decode(f);
  const ms = measure(x);
  rows.push({ f, ...m, ...ms, cps: m.text.length / Math.max(ms.sec, 0.1), tekens: m.text.length });
}

// verdelingen per spreker
const per = new Map();
for (const r of rows) { if (!per.has(r.speaker)) per.set(r.speaker, []); per.get(r.speaker).push(r); }
const alle = { cps: rows.map((r) => r.cps), rms: rows.map((r) => r.rmsDb) };
const stat = new Map();
for (const [spr, rs] of per) {
  const eigen = rs.length >= T.minGroep;
  const cps = eigen ? rs.map((r) => r.cps) : alle.cps, rms = eigen ? rs.map((r) => r.rmsDb) : alle.rms;
  stat.set(spr, { n: rs.length, eigen, cpsGem: mean(rs.map((r) => r.cps)), cpsSd: sd(rs.map((r) => r.cps)), rmsOwn: mean(rs.map((r) => r.rmsDb)), rmsOwnSd: sd(rs.map((r) => r.rmsDb)), cpsLo: pct(cps, T.cpsPct[0]), cpsHi: pct(cps, T.cpsPct[1]), rmsGem: mean(rms), rmsSd: sd(rms) });
}
for (const r of rows) {
  const s = stat.get(r.speaker), vlag = [];
  if (r.eind.burst) vlag.push(['burst', W.burst, `ruis-einde ${r.eind.ms} ms`]);
  if (r.pop.pop) vlag.push(['pop', W.pop, `pop begin (${r.pop.piekDb} dB op ${r.pop.vanMs} ms)`]);
  if (r.peakDb >= T.clipPeakDb && r.hot >= T.clipSamples) vlag.push(['clip', W.clip, `clipping (${r.hot} monsters)`]);
  if (r.tekens < T.minTekens) { /* korte regels: tekens per seconde zegt niets */ } else if (r.cps < s.cpsLo) vlag.push(['cps', W.cps, `te langzaam (${r.cps.toFixed(1)} tekens/s)`]);
  else if (r.cps > s.cpsHi) vlag.push(['cps', W.cps, `te snel (${r.cps.toFixed(1)} tekens/s)`]);
  if (r.lead > T.lead[0]) vlag.push(['lead', W.lead, `stilte begin ${r.lead} s`]);
  if (r.trail > T.trail[0]) vlag.push(['trail', W.trail, `stilte eind ${r.trail} s`]);
  r.rmsZ = s.rmsSd > 0 ? (r.rmsDb - s.rmsGem) / s.rmsSd : 0;
  if (Math.abs(r.rmsZ) > T.rmsZ) vlag.push(['rms', W.rms, `${r.rmsZ > 0 ? 'te luid' : 'te zacht'} (${r.rmsZ.toFixed(1)} sd)`]);
  if (r.ruisAandeel >= T.ruisAandeel) vlag.push(['ruis', W.ruis, `ruisframes ${(r.ruisAandeel * 100).toFixed(0)}%`]);
  r.getrimd = r.lead >= T.herstelLead && r.lead <= T.lead[0];
  if (r.getrimd) vlag.push(['getrimd', W.getrimd, `mogelijk herstelde clip (stilte begin ${r.lead} s: waarschijnlijk een pop-begin op nul gezet)`]);
  r.gronings = r.lang === 'gro' && gronNieuw.has(r.text);
  if (r.gronings) vlag.push(['gronings', W.gronings, 'Groningse spreektekst aangevuld, nog niet beluisterd']);
  r.vlag = vlag; r.score = vlag.reduce((t, v) => t + v[1], 0);
  // fijne rangschikking binnen dezelfde score: hoe ver buiten de drempels
  r.score += Math.min(1, Math.abs(r.rmsZ) / 10) + Math.min(1, Math.abs(Math.log(r.cps / ((s.cpsLo + s.cpsHi) / 2))) / 2);
}
const ranked = [...rows].sort((a, b) => b.score - a.score || a.f.localeCompare(b.f));
const top = ranked.slice(0, TOP);
// steekproef uit de rest, vaste seed (mulberry32)
let st = SEED >>> 0;
const rnd = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rest = ranked.slice(TOP).sort((a, b) => a.f.localeCompare(b.f));
const steek = [];
while (steek.length < SAMPLE && rest.length) steek.push(rest.splice(Math.floor(rnd() * rest.length), 1)[0]);
const lijst = [...top.map((r) => ({ ...r, soort: 'verdacht' })), ...steek.map((r) => ({ ...r, soort: 'steekproef' }))];

// ---------- pagina ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const maten = (r) => `${r.sec.toFixed(1)} s, ${r.cps.toFixed(1)} tekens/s, piek ${r.peakDb} dB, RMS ${r.rmsDb} dB (${r.rmsZ >= 0 ? '+' : ''}${r.rmsZ.toFixed(1)} sd), stilte begin ${r.lead} s, eind ${r.trail} s, ruis-einde ${r.eind.burst ? 'JA' : 'nee'}, pop ${r.pop.pop ? 'JA' : 'nee'}`;
function page(prefix) {
  const items = lijst.map((r, i) => {
    const sp = r.spoken && r.spoken !== r.text ? `<div class="g">Gesproken: ${esc(r.spoken)}</div>` : '';
    const why = r.vlag.length ? r.vlag.map((v) => esc(v[2])).join('; ') : 'geen vlag, willekeurig gekozen';
    return `<div class="c ${r.soort}" id="c${i}" data-f="${esc(r.f)}"><div class="k">${i + 1}. ${esc(r.speaker)} <small>${r.soort === 'verdacht' ? 'verdacht' : 'steekproef'}, ${esc(r.voice)}</small></div>
<div class="t">${esc(r.text)}</div>${sp}<div class="m">${esc(why)}<br>${esc(maten(r))}</div>
<audio controls preload="none" src="${esc(prefix + r.f)}"></audio>
<span class="b"><button type="button" class="ok" onclick="z(${i},'goed')">Goed</button><button type="button" class="bad" onclick="z(${i},'slecht')">Slecht</button></span></div>`;
  }).join('\n');
  return `<!doctype html><html lang="nl"><meta charset="utf-8"><title>Stemclips: korte luisterlijst</title>
<style>body{font:15px system-ui;max-width:920px;margin:1rem auto;padding:0 1rem}.c{padding:.6rem;border-bottom:1px solid #ddd}.c.steekproef{background:#f6f9ff}
.k{font-weight:600}small{font-weight:normal;color:#666}.t{margin:.2rem 0}.g{color:#7a5200;font-size:13px}.m{font-size:12px;color:#555;margin:.2rem 0}audio{width:340px;height:32px;vertical-align:middle}
.b{margin-left:1rem}button{font:inherit;padding:.3rem .9rem;margin-right:.4rem;border:1px solid #999;border-radius:4px;background:#fff;cursor:pointer}
.c.goed{background:#e6f6e6}.c.slecht{background:#fde7e7}.c.goed .ok,.c.slecht .bad{font-weight:700;border-color:#000}textarea{width:100%;height:12rem;font:12px monospace}</style>
<h1>Stemclips: korte luisterlijst (${lijst.length} van ${rows.length})</h1>
<p>${top.length} verdachte clips (hoogste score op de maten) en ${steek.length} willekeurige uit de rest (lichtblauw). De overige ${rows.length - lijst.length} gelden als automatisch goedgekeurd. Luister, druk Goed of Slecht, kopieer onderaan de uitslag.</p>
${items}
<h2>Uitslag</h2><p><button type="button" onclick="kopieer()">Kopieer de uitslag</button> <span id="n"></span></p><textarea id="u" readonly></textarea>
<script>
var uit={};function z(i,w){var e=document.getElementById('c'+i);uit[e.dataset.f]=w;e.className=e.className.replace(/ (goed|slecht)/,'')+' '+w;ver();}
function ver(){var o={goed:0,slecht:0,open:${lijst.length}},k;for(k in uit){o[uit[k]]++;o.open--;}document.getElementById('n').textContent='goed '+o.goed+', slecht '+o.slecht+', nog open '+o.open;document.getElementById('u').value=JSON.stringify({aantal:${lijst.length},uitslag:uit},null,1);}
function kopieer(){var t=document.getElementById('u');t.select();if(navigator.clipboard)navigator.clipboard.writeText(t.value);else document.execCommand('copy');}
ver();
</script></html>
`;
}
fs.writeFileSync(path.join(ROOT, 'docs', 'TTS-VERDACHT-22-11.html'), page('../'));
const abs = path.join(os.tmpdir(), 'TTS-VERDACHT-22-11-abs.html');
fs.writeFileSync(abs, page(pathToFileURL(ROOT + path.sep).href));

// ---------- document ----------
const fx = (v, d = 1) => Number(v).toFixed(d).replace('.', ',');
const flagCount = {}; for (const r of rows) for (const v of r.vlag) flagCount[v[0]] = (flagCount[v[0]] || 0) + 1;
const geenVlag = rows.filter((r) => !r.vlag.length).length;
const tabelTop = top.map((r, i) => `| ${i + 1} | ${r.speaker} | ${r.text.replace(/\|/g, '/').slice(0, 70)} | ${fx(r.score)} | ${r.vlag.map((v) => v[0]).join(', ')} |`).join('\n');
const tabelSpr = [...stat].sort((a, b) => b[1].n - a[1].n).map(([spr, s]) => `| ${spr} | ${s.n} | ${fx(s.cpsGem)} | ${fx(s.cpsSd)} | ${fx(s.cpsLo)} tot ${fx(s.cpsHi)}${s.eigen ? '' : ' (gezamenlijk)'} | ${fx(s.rmsOwn)} | ${fx(s.rmsOwnSd)} |`).join('\n');
const tabelSteek = steek.map((r) => `| ${r.speaker} | ${r.text.replace(/\|/g, '/').slice(0, 70)} | ${fx(r.score)} |`).join('\n');
const md = `# TTS verdachte clips 22-11: korte luisterlijst

De eigenaar luistert niet naar alle ${rows.length} nieuwe stemclips van tts-ronde2 (zie [TTS-ACHTERSTAND-21-11.md](TTS-ACHTERSTAND-21-11.md)). \`node scripts/tts_verdacht.mjs\` meet elke clip, rangschikt op verdachtheid en maakt **één pagina** met ${lijst.length} clips: de top ${top.length} plus ${steek.length} willekeurige uit de rest (seed ${SEED}). Pagina: [TTS-VERDACHT-22-11.html](TTS-VERDACHT-22-11.html) (relatieve paden). Per clip: audio-speler, de regel, de spreker, de maten, en de knoppen Goed en Slecht met onderaan een kopieerbare JSON-uitslag. Een variant met \`file://\`-paden komt buiten git in de tijdelijke map.

## Methode

De clips zijn de ${rows.length} bestanden die \`ff984eb61\` (merge van tts-ronde2) aan \`game/audio/voicelines\` toevoegt. Elke clip wordt met ffmpeg naar 22,05 kHz mono gedecodeerd en gemeten. Elke vlag geeft punten; de score is de som plus een fijnslijper (hoe ver buiten de drempel).

| Maat | Drempel | Punten |
|---|---|---|
| \`eindBurst\` (ruisachtig_scan): ruis-einde | burst = ja | ${W.burst} |
| \`popBegin\` (pop_begin): klik in de eerste 80 ms | pop = ja | ${W.pop} |
| Clipping | piek >= ${T.clipPeakDb} dBFS met ${T.clipSamples} of meer monsters op 0,999 | ${W.clip} |
| Duur t.o.v. tekstlengte | tekens per seconde onder het 1e of boven het 99e percentiel van de spreker (sprekers met minder dan ${T.minGroep} clips: gezamenlijke verdeling) | ${W.cps} |
| Stilte aan het begin | meer dan ${fx(T.lead[0], 2)} s onder ${T.stilteDb} dBFS | ${W.lead} |
| Stilte aan het eind | meer dan ${fx(T.trail[0], 2)} s onder ${T.stilteDb} dBFS | ${W.trail} |
| RMS t.o.v. dezelfde spreker | meer dan ${T.rmsZ} standaarddeviaties van het gemiddelde (RMS over de actieve frames) | ${W.rms} |
| Ruisframes (ruisachtig_scan \`scoreClip\`) | aandeel >= ${T.ruisAandeel} | ${W.ruis} |
| Mogelijk herstelde clip (staart_trimmer) | stilte aan het begin van ${fx(T.herstelLead, 2)} tot ${fx(T.lead[0], 2)} s (de TTS-keten laat 0,04 s; een pop-begin dat op nul is gezet laat meer) | ${W.getrimd} |
| Groningse spreektekst door Claude aangevuld | de 9 Tammo-regels in \`scripts/gronings_spoken.json\` (commit 0f53a597c) | ${W.gronings} |

## Uitslag over alle ${rows.length} clips

- Clips zonder enige vlag: **${geenVlag}** van ${rows.length}.
- Vlaggen: ${Object.entries(flagCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}.
- Ruis-einde: ${rows.filter((r) => r.eind.burst).length}, pop-begin: ${rows.filter((r) => r.pop.pop).length}, clipping: ${flagCount.clip || 0}.
- Mogelijk herstelde clips (heuristiek op de stilte aan het begin): ${rows.filter((r) => r.getrimd).length}. De 9 echt herstelde clips zijn niet te achterhalen: de reparatie draaide vóór de commit en het manifest-dur klopt (verschil ten hoogste 0,005 s), dus de dur-afwijking werkt niet als merkteken.
- Groningse regels (lang gro, spreektekst aangevuld): ${rows.filter((r) => r.gronings).length} (verwacht 9).

### Per spreker

Tekens per seconde (gemiddelde, standaarddeviatie, 1e tot 99e percentiel) en RMS in dBFS over de actieve frames.

| Spreker | Clips | Tekens/s gem. | sd | Grens 1e tot 99e | RMS gem. | sd |
|---|---|---|---|---|---|---|
${tabelSpr}

### De top ${top.length} (op de pagina)

| # | Spreker | Regel | Score | Vlaggen |
|---|---|---|---|---|
${tabelTop}

### De steekproef (${steek.length}, seed ${SEED})

| Spreker | Regel | Score |
|---|---|---|
${tabelSteek}

## Besluit voor de rest

De overige ${rows.length - lijst.length} clips gelden als **automatisch goedgekeurd**. Op alle ${rows.length} clips zijn ruis-einde (${rows.filter((r) => r.eind.burst).length}), pop-begin (${rows.filter((r) => r.pop.pop).length}) en clipping (${flagCount.clip || 0}) schoon, en een ruisaandeel boven ${fx(T.ruisAandeel, 2)} komt niet voor (${flagCount.ruis || 0}). Wat buiten de lijst valt heeft hoogstens een lichte vlag (hoogste score in de rest: ${fx(ranked[TOP]?.score || 0)}). Dat is een meting en geen oordeel over uitspraak, accent of betekenis: niemand heeft ze beluisterd. Slechte clips uit de lijst worden opnieuw opgenomen met \`tts_lines.py\`; vindt de eigenaar bij de steekproef zelf fouten, dan vervalt 'automatisch goedgekeurd' en volgt een bredere luisterronde.
`;
fs.writeFileSync(path.join(ROOT, 'docs', 'TTS-VERDACHT-22-11.md'), md);
console.log(`${rows.length} gemeten, ${lijst.length} in de lijst (${top.length} + ${steek.length}); zonder vlag ${geenVlag}; vlaggen ${JSON.stringify(flagCount)}`);
console.log('ondergrens top-score', top[top.length - 1].score.toFixed(2), 'hoogste in de rest', ranked[TOP]?.score.toFixed(2));
console.log('abs-variant:', abs);
