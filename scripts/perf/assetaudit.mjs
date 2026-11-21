// Asset-audit (21-11, inefficientie): groottes per map, audio-headers (mp3-bitrate,
// samplerate, wav-formaat), grote JSON met minify-winst en exacte duplicaten.
//   node scripts/perf/assetaudit.mjs [--json]
// Alleen lezen; geen Electron nodig.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GAME = path.join(REPO, 'game');
const asJson = process.argv.includes('--json');
const MB = (n) => (n / 1048576).toFixed(1);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'world' && e.name !== 'node_modules') walk(p, out); } else out.push(p);
  }
  return out;
}

const BR = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]; // MPEG1 L3
const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];     // MPEG2/2.5 L3
const SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
function mp3Info(buf) {
  let i = 0;
  if (buf.slice(0, 3).toString() === 'ID3') i = 10 + (((buf[6] & 127) << 21) | ((buf[7] & 127) << 14) | ((buf[8] & 127) << 7) | (buf[9] & 127));
  const end = Math.min(buf.length - 4, i + 4096);
  for (; i < end; i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      const ver = (buf[i + 1] >> 3) & 3, layer = (buf[i + 1] >> 1) & 3;
      const bri = buf[i + 2] >> 4, sri = (buf[i + 2] >> 2) & 3;
      if (ver === 1 || layer !== 1 || bri === 0 || bri === 15 || sri === 3) continue;
      const kbps = (ver === 3 ? BR : BR2)[bri];
      return { kbps, hz: SR[ver][sri], ch: (buf[i + 3] >> 6) === 3 ? 1 : 2 };
    }
  }
  return null;
}
function wavInfo(buf) {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') return null;
  let o = 12;
  while (o + 8 < buf.length) {
    const id = buf.toString('ascii', o, o + 4), sz = buf.readUInt32LE(o + 4);
    if (id === 'fmt ') return { fmt: buf.readUInt16LE(o + 8), ch: buf.readUInt16LE(o + 10), hz: buf.readUInt32LE(o + 12), bits: buf.readUInt16LE(o + 22) };
    o += 8 + sz + (sz & 1);
  }
  return null;
}

const files = walk(GAME);
const byDir = {};
for (const f of files) {
  const parts = path.relative(GAME, f).split(path.sep);
  const top = parts[0] === 'audio' && parts.length > 2 ? `audio/${parts[1]}` : parts[0];
  byDir[top] = (byDir[top] || 0) + fs.statSync(f).size;
}
const rep = { dirs: byDir, mp3: { n: 0, bytes: 0, byRate: {} }, wav: { n: 0, bytes: 0, pcm: 0, big: [] }, json: [], dups: [], ogg: { n: 0, bytes: 0 } };
const hashes = new Map();
for (const f of files) {
  const rel = path.relative(GAME, f).split(path.sep).join('/');
  const ext = path.extname(f).toLowerCase();
  const st = fs.statSync(f);
  const b = fs.readFileSync(f);
  if (ext === '.mp3') {
    const inf = mp3Info(b);
    const k = inf ? `${inf.kbps}kbps/${inf.hz}Hz/${inf.ch}ch` : '?';
    rep.mp3.n++; rep.mp3.bytes += st.size;
    const r = rep.mp3.byRate[k] || (rep.mp3.byRate[k] = { n: 0, bytes: 0 }); r.n++; r.bytes += st.size;
  } else if (ext === '.wav') {
    const inf = wavInfo(b);
    rep.wav.n++; rep.wav.bytes += st.size;
    if (inf && inf.fmt === 1) rep.wav.pcm += st.size;
    rep.wav.big.push({ rel, bytes: st.size, ...inf });
  } else if (ext === '.ogg') { rep.ogg.n++; rep.ogg.bytes += st.size; }
  else if (ext === '.json') {
    const txt = b.toString('utf8');
    let min = st.size;
    try { min = Buffer.byteLength(JSON.stringify(JSON.parse(txt))); } catch { /* geen geldige JSON */ }
    rep.json.push({ rel, bytes: st.size, minified: min, saving: st.size - min });
  }
  if (st.size > 2048) {
    const h = crypto.createHash('md5').update(b).digest('hex');
    if (hashes.has(h)) rep.dups.push([hashes.get(h), rel]); else hashes.set(h, rel);
  }
}
rep.wav.big.sort((a, b) => b.bytes - a.bytes); rep.wav.big = rep.wav.big.slice(0, 12);
rep.json.sort((a, b) => b.bytes - a.bytes);
if (asJson) { console.log(JSON.stringify(rep, null, 1)); process.exit(0); }
console.log('Groottes per map (MB):');
for (const [k, v] of Object.entries(byDir).sort((a, b) => b[1] - a[1]).slice(0, 16)) console.log(`  ${k.padEnd(24)} ${MB(v)}`);
console.log(`\nmp3: ${rep.mp3.n} bestanden, ${MB(rep.mp3.bytes)} MB`);
for (const [k, v] of Object.entries(rep.mp3.byRate).sort((a, b) => b[1].bytes - a[1].bytes)) console.log(`  ${k.padEnd(22)} ${String(v.n).padStart(5)} bestanden ${MB(v.bytes)} MB`);
console.log(`wav: ${rep.wav.n} bestanden, ${MB(rep.wav.bytes)} MB (PCM ${MB(rep.wav.pcm)} MB)`);
for (const w of rep.wav.big.slice(0, 6)) console.log(`  ${w.rel} ${MB(w.bytes)} MB ${w.hz}Hz ${w.ch}ch ${w.bits}bit`);
console.log(`ogg: ${rep.ogg.n} bestanden, ${MB(rep.ogg.bytes)} MB`);
console.log('\nJSON (grootste 12, minify-winst):');
for (const j of rep.json.slice(0, 12)) console.log(`  ${j.rel.padEnd(44)} ${(j.bytes / 1024).toFixed(0).padStart(6)} KB  minified ${(j.minified / 1024).toFixed(0).padStart(6)} KB  winst ${(j.saving / 1024).toFixed(0)} KB`);
console.log(`\nExacte duplicaten (> 2 KB): ${rep.dups.length}`);
for (const d of rep.dups.slice(0, 10)) console.log('  ', d.join(' == '));
