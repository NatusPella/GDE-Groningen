// Automatische analyse van een video-QA-opname (scripts/videoqa/opname.mjs): elk beeld wordt bekeken, op 96x54 grijs
// (een 16x9-raster van helderheid en een 32x18-raster van het verschil met het vorige beeld) en met de telemetrie per beeld.
//
//   node scripts/videoqa/analyse.mjs <opnamemap> [--fps=30]
//
// Schrijft <map>/analyse.json: statistiek en een lijst kandidaten (kind, beeld, tijd, score, context) en
// <map>/kandidaten.json (alleen de beeldnummers die het oog moet zien). Zonder netwerk, zonder schrijven buiten <map>.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ffmpegPath } from '../trailer/lib/tools.mjs';

const args = process.argv.slice(2);
const dir = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const FPS = Number(opt('fps', 30));
const W = 96, H = 54, N = W * H, TW = 32, TH = 18;
const segs = fs.readdirSync(dir).filter((f) => /^seg\d+\.mp4$/.test(f)).sort().slice(0, Number(opt('upto', 999)));
if (!segs.length) { console.error('geen seg*.mp4 in ' + dir); process.exit(1); }

// --- 1. alle beelden naar grijs 96x54 ---
const lumaFrames = []; // per beeld Uint8Array(N)
for (const s of segs) {
  const r = spawnSync(ffmpegPath(), ['-v', 'error', '-i', path.join(dir, s), '-an', '-vf', `scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(String(r.stderr));
  const n = Math.floor(r.stdout.length / N);
  for (let i = 0; i < n; i++) lumaFrames.push(new Uint8Array(r.stdout.buffer, r.stdout.byteOffset + i * N, N));
  console.log(`${s}: ${n} beelden`);
}
const F = lumaFrames.length;

// --- 2. telemetrie ---
const tele = []; // rijen [i, updMs, extra, pend, wallMs, tris, calls]
const snaps = [];
for (const f of fs.readdirSync(dir).filter((x) => /^tele-\d+\.json$/.test(x)).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  tele.push(...j.rows); snaps.push(...j.snaps);
}
const events = fs.existsSync(path.join(dir, 'events.jsonl')) ? fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const snapAt = (i) => { let lo = 0, hi = snaps.length - 1, best = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (snaps[m].i <= i) { best = snaps[m]; lo = m + 1; } else hi = m - 1; } return best; };
const ctx = (i) => { const s = snapAt(i); return s ? { story: s.story, stage: s.stage, cine: s.cine, talk: s.talk, veh: s.veh, v: s.v, x: s.x, y: s.y, msg: s.msg } : null; };
const tstr = (i) => { const t = i / FPS; return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${String(Math.round((t % 1) * 10)).padStart(1, '0')}`; };
const cand = [];
const add = (kind, i, score, note, extra = {}) => cand.push({ kind, frame: i, t: +(i / FPS).toFixed(2), tstr: tstr(i), score: +score.toFixed(2), note, ctx: ctx(i), ...extra });

// --- 3. helderheid per beeld: zwart, leeg, wit, flikkering ---
const mean = new Float32Array(F), sd = new Float32Array(F);
for (let i = 0; i < F; i++) {
  const a = lumaFrames[i]; let s = 0, q = 0;
  for (let k = 0; k < N; k++) { s += a[k]; q += a[k] * a[k]; }
  mean[i] = s / N; sd[i] = Math.sqrt(Math.max(0, q / N - mean[i] * mean[i]));
}
const runs = (pred, minLen) => { const out = []; for (let i = 0; i < F;) { if (pred(i)) { let j = i; while (j < F && pred(j)) j++; if (j - i >= minLen) out.push([i, j]); i = j; } else i++; } return out; };
for (const [a, b] of runs((i) => mean[i] < 8, 2)) add('zwart', a, b - a, `zwart beeld ${b - a} beelden (${((b - a) / FPS).toFixed(2)} s)`, { len: b - a });
for (const [a, b] of runs((i) => mean[i] >= 8 && sd[i] < 3.5, 8)) add('leeg-egaal', a, b - a, `egaal beeld (sd<3,5) ${b - a} beelden, gemiddeld ${mean[a].toFixed(0)}`, { len: b - a });
for (const [a, b] of runs((i) => mean[i] > 245, 2)) add('wit', a, b - a, `wit beeld ${b - a} beelden`, { len: b - a });
// flikkering: een sprong die binnen 1-3 beelden terugkeert, of een oscillatie
for (let i = 1; i < F - 3; i++) {
  const d = mean[i] - mean[i - 1];
  if (Math.abs(d) < 7) continue;
  for (let k = 1; k <= 3; k++) {
    const back = mean[i + k] - mean[i - 1];
    if (Math.abs(back) < Math.abs(d) * 0.35) { add('flikker-sprong', i, Math.abs(d), `helderheid ${mean[i - 1].toFixed(0)} -> ${mean[i].toFixed(0)} en na ${k} beeld(en) terug`); i += k; break; }
  }
}
for (let i = 4; i < F - 8; i++) {
  let flips = 0, amp = 0, last = 0;
  for (let k = i; k < i + 8; k++) { const d = mean[k + 1] - mean[k]; if (Math.abs(d) > 2.5) { if (last && Math.sign(d) !== Math.sign(last)) flips++; amp = Math.max(amp, Math.abs(d)); last = d; } }
  if (flips >= 4) { add('flikker-oscillatie', i, flips + amp / 10, `${flips} wisselingen in 8 beelden, amplitude ${amp.toFixed(1)}`); i += 8; }
}

// --- 4. verschil per beeld: dubbele beelden, sneden, pop-in ---
const D = (i) => { // 32x18 tegels: gemiddeld absoluut verschil tussen beeld i en i+1
  const a = lumaFrames[i], b = lumaFrames[i + 1], t = new Float32Array(TW * TH), sx = W / TW, sy = H / TH;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) t[Math.floor(y / sy) * TW + Math.floor(x / sx)] += Math.abs(a[y * W + x] - b[y * W + x]);
  for (let k = 0; k < t.length; k++) t[k] /= sx * sy;
  return t;
};
const tiles = new Array(F - 1);
const avg = new Float32Array(F - 1);
for (let i = 0; i < F - 1; i++) { tiles[i] = D(i); let s = 0; for (const v of tiles[i]) s += v; avg[i] = s / tiles[i].length; }
const localMed = (i) => { const w = []; for (let k = Math.max(0, i - 6); k <= Math.min(avg.length - 1, i + 6); k++) if (k !== i) w.push(avg[k]); w.sort((a, b) => a - b); return w[w.length >> 1]; };
const isCut = new Uint8Array(F - 1);
let cuts = 0;
for (let i = 0; i < F - 1; i++) if (avg[i] > 10 && avg[i] > 2.5 * localMed(i)) { isCut[i] = 1; cuts++; add('snede', i + 1, avg[i], `scènewissel/harde snede (verschil ${avg[i].toFixed(1)})`); }
// dubbele beelden: een reeks (bijna) identieke beelden
const dupRuns = runs((i) => i < F - 1 && avg[i] < 0.03, 1);
let dupFrames = 0;
for (const [a, b] of dupRuns) { dupFrames += b - a; if (b - a >= 12) { const c = ctx(a); add('stilstaand-beeld', a, b - a, `${b - a} identieke beelden (${((b - a) / FPS).toFixed(1)} s)`, { len: b - a, verwacht: !!(c && (c.cine || c.talk)) }); } }
// pop-in: een tegel springt in één beeld hoog en valt terug
for (let i = 2; i < F - 3; i++) {
  if (isCut[i] || isCut[i - 1] || isCut[i + 1]) continue;
  const a = tiles[i], p = tiles[i - 1], n = tiles[i + 1], p2 = tiles[i - 2], n2 = tiles[i + 2];
  const bl = [];
  for (let k = 0; k < TW * TH; k++) {
    const tx = k % TW, ty = Math.floor(k / TW);
    if (tx < 2 || tx >= TW - 2 || ty < 1 || ty >= TH - 1) continue;
    const nb = Math.max(p[k], n[k], p2[k] * 0.8, n2[k] * 0.8);
    if (a[k] >= 28 && a[k] > nb * 3 + 6) bl.push(k);
  }
  if (bl.length && bl.length <= 60) add('pop-in', i + 1, Math.max(...bl.map((k) => a[k])) * (1 + bl.length / 20), `${bl.length} tegel(s) springen in 1 beeld (piek ${Math.round(Math.max(...bl.map((k) => a[k])))}) bij tegel ${bl[0] % TW},${Math.floor(bl[0] / TW)}`, { blocks: bl.length });
}

// --- 5. telemetrie: haperingen, streamen, tekenwerk ---
const upd = tele.map((r) => r[1]), wallv = tele.map((r) => r[4]);
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const medUpd = pct(upd, 0.5), p99Upd = pct(upd, 0.99);
for (let i = 0; i < tele.length; i++) {
  const [fi, u, ex, pend, w] = tele[i];
  if (u > Math.max(45, medUpd * 4)) add('rekentijd-piek', fi, u / medUpd, `speltijd per beeld ${u.toFixed(0)} ms (mediaan ${medUpd.toFixed(0)} ms)`, { updMs: u });
}
// streamen: aaneengesloten beelden waarop de opname moest wachten (een echte speler ziet dat als haper of pop-in)
let nStall = 0, stallFrames = 0, maxExtra = 0;
for (const [a, b] of runs((i) => tele[i] && tele[i][2] > 0, 1)) {
  const ex = tele.slice(a, b).reduce((s, r) => s + r[2], 0), mx = Math.max(...tele.slice(a, b).map((r) => r[2]));
  nStall++; stallFrames += b - a; maxExtra = Math.max(maxExtra, mx);
  if (b - a >= 3 || mx >= 20) add('stream-wacht', a, mx + (b - a), `${b - a} beelden met wachten op streamen, ${ex} tussenbeelden, max ${mx} (resterend werk ${Math.max(...tele.slice(a, b).map((r) => r[3]))})`, { len: b - a, maxExtra: mx });
}
// driehoeken of tekenaanroepen die plots instorten of verdubbelen
const trisMed = pct(tele.map((r) => r[5]), 0.5);
for (let i = 5; i < tele.length - 5; i++) {
  const t = tele[i][5], pr = (tele[i - 1][5] + tele[i - 2][5]) / 2;
  if (pr > 5000 && t < pr * 0.25 && !isCut[i]) add('tekenwerk-instorting', tele[i][0], pr / Math.max(1, t), `driehoeken ${Math.round(pr)} -> ${t}`);
}

// --- 6. bot en console: stuk, vast, waarschuwingen ---
const evCand = [];
for (const e of events) {
  const fr = e.t != null ? null : null;
  if (e.type === 'console') evCand.push({ kind: 'console-' + e.level, msg: String(e.msg).slice(0, 240) });
  if (['stuck', 'vast', 'opgegeven', 'timeout', 'cheat-geweigerd', 'lusfout'].includes(e.type)) evCand.push({ kind: 'bot-' + e.type, t: e.t, msg: JSON.stringify(e).slice(0, 300) });
}
const consoleCounts = {};
for (const c of evCand) { const k = c.kind + ' ' + c.msg.replace(/[\d.]+/g, '#').slice(0, 140); consoleCounts[k] = (consoleCounts[k] || 0) + 1; }
// NaN: elke consoleregel met NaN telt als kandidaat
const nan = events.filter((e) => e.type === 'console' && /NaN|Infinity|not finite|degenerate/i.test(String(e.msg)));
// stilstand van de speler buiten filmpjes en gesprekken
for (let k = 0; k < snaps.length; k++) {
  const a = snaps[k];
  if (a.cine || a.talk || a.banner) continue;
  let j = k; while (j + 1 < snaps.length && !snaps[j + 1].cine && !snaps[j + 1].talk && !snaps[j + 1].banner && Math.hypot(snaps[j + 1].x - a.x, snaps[j + 1].y - a.y) < 1.5) j++;
  if ((snaps[j].t - a.t) >= 12) { add('speler-stilstand', a.i, snaps[j].t - a.t, `speler staat ${(snaps[j].t - a.t).toFixed(0)} s stil buiten filmpje/gesprek (${a.story || '?'} ${a.stage || ''} ${a.msg || ''})`); k = j; }
}

cand.sort((a, b) => a.frame - b.frame);
const stat = {
  frames: F, fps: FPS, seconds: +(F / FPS).toFixed(1), segments: segs.length,
  zwart: cand.filter((c) => c.kind === 'zwart').length, egaal: cand.filter((c) => c.kind === 'leeg-egaal').length, flikker: cand.filter((c) => c.kind.startsWith('flikker')).length,
  snedes: cuts, dubbeleBeelden: dupFrames, dubbeleReeksenLang: cand.filter((c) => c.kind === 'stilstaand-beeld').length, popIn: cand.filter((c) => c.kind === 'pop-in').length,
  rekentijdMs: { mediaan: +medUpd.toFixed(1), p99: +p99Upd.toFixed(1), max: +Math.max(...upd).toFixed(1) }, wallMsPerBeeld: { mediaan: +pct(wallv, 0.5).toFixed(0), p99: +pct(wallv, 0.99).toFixed(0), max: +Math.max(...wallv).toFixed(0) },
  streamWacht: { beeldenMetWachten: stallFrames, reeksen: nStall, maxTussenbeelden: maxExtra, aandeel: +(stallFrames / Math.max(1, tele.length)).toFixed(4) },
  driehoekenMediaan: Math.round(trisMed), nanRegels: nan.length, consoleGroepen: consoleCounts,
};
fs.writeFileSync(path.join(dir, 'analyse.json'), JSON.stringify({ stat, kandidaten: cand }, null, 1));
fs.writeFileSync(path.join(dir, 'lumaseries.json'), JSON.stringify({ fps: FPS, mean: Array.from(mean, (v) => Math.round(v * 10) / 10) }));
console.log(JSON.stringify(stat, null, 1));
const byKind = {}; for (const c of cand) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
console.log('kandidaten per soort:', JSON.stringify(byKind));
