// Builds the browser version into ../web-dist: the desktop staging with
// relative paths, every voice/music clip also as Opus (WebM), the small clips
// packed per folder (itch.io takes at most 1000 files), an audio index, the
// loader (web.js) and the service worker (sw.js).
//
//   node web/build.mjs          build web-dist/
//   node web/build.mjs --zip    and zip it for itch.io
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFile, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(ROOT, 'web-dist');
const CACHE = path.join(HERE, '.cache', 'opus');
const ZIP = process.argv.includes('--zip');
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop', 'package.json'), 'utf8'));

// itch.io HTML5 limits (itch.io/docs/creators/html5)
const ITCH = { files: 1000, fileBytes: 200e6, totalBytes: 500e6 };
// a pack stays small enough to fetch whole where a server ignores Range
const PACK_MAX = 4e6;
const VOICE = ['-ac', '1', '-b:a', '32k'];
const MUSIC = ['-ac', '2', '-b:a', '96k'];
// files the loading screen counts as "the essentials"
const ESSENTIALS = ['stad.json', 'mapextras.json', 'facilities.json', 'shopplaces.json'];

const mb = (n) => (n / 1e6).toFixed(1) + ' MB';
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
const rel = (p) => path.relative(OUT, p).split(path.sep).join('/');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const sizeOf = (files) => files.reduce((a, f) => a + fs.statSync(f).size, 0);

// the G-Music tracks, the race/chase loops and the theme song; the rest is speech
const isMusic = (f) => /^audio\/(gmusic\/[^/]+|scenario\/.+|theme\/.+)\.mp3$/.test(rel(f));

function ffmpeg(src, dst, args) {
  return new Promise((res, rej) => execFile('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vn', '-map_metadata', '-1', '-c:a', 'libopus', ...args, '-f', 'webm', dst],
    (err) => (err ? rej(new Error(`ffmpeg ${src}: ${err.message}`)) : res())));
}

async function pool(items, n, fn) {
  let i = 0, done = 0;
  const tick = () => { if (++done % 250 === 0 || done === items.length) process.stdout.write(`\r  opus ${done}/${items.length}`); };
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const it = items[i++]; await fn(it); tick(); }
  }));
  process.stdout.write('\n');
}

async function main() {
  console.log(`web build GDE Groningen ${version}`);
  execFileSync(process.execPath, [path.join(ROOT, 'desktop', 'build.mjs')], {
    stdio: 'inherit', env: { ...process.env, GDE_STAGE_OUT: OUT, GDE_STAGE_RELATIVE: '1' },
  });
  const before = walk(OUT);
  const beforeBytes = sizeOf(before);

  // 1. every clip as Opus, cached by content so rebuilds are quick
  const audio = before.filter((f) => /\.(mp3|wav)$/i.test(f));
  const audioBytes = sizeOf(audio);
  fs.mkdirSync(CACHE, { recursive: true });
  const opusOf = new Map();
  await pool(audio, Math.min(4, os.cpus().length), async (f) => {
    const stereo = isMusic(f);
    const args = stereo ? MUSIC : VOICE;
    const key = sha(Buffer.concat([fs.readFileSync(f), Buffer.from(args.join(' '))]));
    const out = path.join(CACHE, key + '.webm');
    if (!fs.existsSync(out)) { await ffmpeg(f, out + '.tmp', args); fs.renameSync(out + '.tmp', out); }
    opusOf.set(f, { file: out, stereo });
  });

  // 2. music stays one file per track (<audio> plays it); short clips go into
  // packs per folder, one set of Opus packs and one of the originals (Safari
  // before 18.4 has no Opus in WebM)
  const index = { packs: [], files: {}, music: {} };
  const byDir = new Map();
  for (const f of audio) {
    const o = opusOf.get(f);
    if (o.stereo) {
      const dst = f.replace(/\.[^.]+$/, '.webm');
      fs.copyFileSync(o.file, dst);
      index.music[rel(f)] = rel(dst);
    } else {
      const d = path.dirname(f);
      if (!byDir.has(d)) byDir.set(d, []);
      byDir.get(d).push(f);
    }
  }
  fs.mkdirSync(path.join(OUT, 'audio', 'packs'), { recursive: true });
  const writePack = (parts) => {
    const buf = Buffer.concat(parts);
    const name = `audio/packs/${sha(buf).slice(0, 12)}.pack`;
    fs.writeFileSync(path.join(OUT, name), buf);
    index.packs.push(name);
    return index.packs.length - 1;
  };
  const pack = (files, read) => {
    const out = new Map();
    let parts = [], members = [], size = 0;
    const flush = () => {
      if (!parts.length) return;
      const p = writePack(parts);
      for (const [f, off, len] of members) out.set(f, [p, off, len]);
      parts = []; members = []; size = 0;
    };
    for (const f of files) {
      const buf = read(f);
      if (size && size + buf.length > PACK_MAX) flush();
      members.push([f, size, buf.length]);
      parts.push(buf);
      size += buf.length;
    }
    flush();
    return out;
  };
  for (const [, files] of [...byDir].sort((a, b) => a[0].localeCompare(b[0]))) {
    files.sort();
    const opus = pack(files, (f) => fs.readFileSync(opusOf.get(f).file));
    const orig = pack(files, (f) => fs.readFileSync(f));
    for (const f of files) { index.files[rel(f)] = [...opus.get(f), ...orig.get(f)]; fs.rmSync(f); }
  }
  fs.writeFileSync(path.join(OUT, 'audio', 'index.json'), JSON.stringify(index));

  // 3. loader + service worker, stamped with the version and a content hash
  // (the cache name) so every build replaces the previous cache
  const files = walk(OUT).sort();
  const h = crypto.createHash('sha1');
  for (const f of files) h.update(rel(f) + '\0' + sha(fs.readFileSync(f)) + '\0');
  for (const f of ['web.js', 'sw.js']) h.update(fs.readFileSync(path.join(HERE, f)));
  const cacheName = `gde-${version}-${h.digest('hex').slice(0, 10)}`;
  const sizes = Object.fromEntries(ESSENTIALS.filter((f) => fs.existsSync(path.join(OUT, f))).map((f) => [f, fs.statSync(path.join(OUT, f)).size]));
  const shell = ['', 'web.js', ...walk(path.join(OUT, 'vendor', 'fonts')).map(rel)];
  const stamp = (src) => src.split('__GDE_CACHE__').join(cacheName).split('__GDE_SIZES__').join(JSON.stringify(sizes)).split('__GDE_SHELL__').join(JSON.stringify(shell));
  fs.writeFileSync(path.join(OUT, 'web.js'), stamp(fs.readFileSync(path.join(HERE, 'web.js'), 'utf8')));
  fs.writeFileSync(path.join(OUT, 'sw.js'), stamp(fs.readFileSync(path.join(HERE, 'sw.js'), 'utf8')));
  const html = path.join(OUT, 'index.html');
  let page = fs.readFileSync(html, 'utf8');
  const main = '<script type="module" src="js/main.js"></script>';
  if (!page.includes(main)) throw new Error('index.html: main.js script tag not found');
  page = page.replace(main, '<script src="web.js"></script>');
  fs.writeFileSync(html, page);

  // 4. report and the itch.io limits
  const after = walk(OUT);
  const afterBytes = sizeOf(after);
  const opusBytes = [...opusOf.values()].reduce((a, o) => a + fs.statSync(o.file).size, 0);
  const biggest = after.reduce((a, f) => Math.max(a, fs.statSync(f).size), 0);
  console.log(`audio: ${audio.length} clips, ${mb(audioBytes)} as mp3/wav -> ${mb(opusBytes)} as Opus`);
  console.log(`web-dist: ${after.length} files, ${mb(afterBytes)} on disk (staging was ${before.length} files, ${mb(beforeBytes)})`);
  console.log(`download with Opus: ~${mb(beforeBytes - audioBytes + opusBytes)} if every clip is heard (mp3 fallback: ${mb(beforeBytes)})`);
  console.log(`cache: ${cacheName}`);
  const fits = after.length < ITCH.files && biggest < ITCH.fileBytes && afterBytes < ITCH.totalBytes;
  console.log(`itch.io: ${after.length}/${ITCH.files} files, largest ${mb(biggest)}/200 MB, total ${mb(afterBytes)}/500 MB -> ${fits ? 'fits' : 'DOES NOT FIT'}`);

  if (ZIP) {
    if (!fits) throw new Error('not zipping: over the itch.io limits');
    const zip = path.join(ROOT, `GDE-Groningen-${version}-web.zip`);
    fs.rmSync(zip, { force: true });
    execFileSync('zip', ['-q', '-r', '-X', '-n', '.webm:.mp3:.pack:.bin:.glb:.woff2:.gdp', zip, '.'], { cwd: OUT, stdio: 'inherit' });
    console.log(`zip: ${path.relative(ROOT, zip)} (${mb(fs.statSync(zip).size)})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
