// Stages the game for the desktop app: copies ../game to build/game, vendors
// every CDN module (three.js + the addons it pulls in, crawled recursively)
// and the Google fonts, rewrites the URLs to local paths and stamps the
// version. Downloads are cached in vendor-cache/ so rebuilds work offline.
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// the GTE_* names from before 0.29 still work
for (const [k, v] of Object.entries(process.env)) if (k.startsWith('GTE_') && process.env['GDE_' + k.slice(4)] === undefined) process.env['GDE_' + k.slice(4)] = v;
// GDE_STAGE_SRC / GDE_STAGE_OUT stage another checkout (perf runs against main)
const SRC = process.env.GDE_STAGE_SRC || path.join(HERE, '..', 'game');
const OUT = process.env.GDE_STAGE_OUT || path.join(HERE, 'build', 'game');
const CACHE = path.join(HERE, 'vendor-cache');
const CDN = 'https://cdn.jsdelivr.net/npm/';
const THREE = CDN + 'three@0.160.0/build/three.module.js';
const ADDONS = CDN + 'three@0.160.0/examples/jsm/';
// Bebas Neue for the UI, Big Shoulders Display for the logo (one variable font)
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Big+Shoulders+Display:wght@700;800;900&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
// GDE_STAGE_RELATIVE=1 (the web build): vendor paths relative to each file,
// so the folder works from any sub path (itch.io, GitHub Pages)
const RELATIVE = process.env.GDE_STAGE_RELATIVE === '1';
const { version } = JSON.parse(fs.readFileSync(path.join(HERE, 'package.json'), 'utf8'));

async function cached(url, key) {
  const file = path.join(CACHE, key);
  if (fs.existsSync(file)) return fs.readFileSync(file);
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return buf;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

function resolveSpec(spec, base) {
  if (spec === 'three') return THREE;
  if (spec.startsWith('three/addons/')) return ADDONS + spec.slice('three/addons/'.length);
  if (spec.startsWith('https://')) return spec;
  if (spec.startsWith('.') && base) return new URL(spec, base).href;
  return null;
}

function packWorld() {
  const root = path.join(SRC, '..');
  const packer = path.join(root, 'scripts', 'world', 'pack_tiles.mjs');
  if (!fs.existsSync(packer) || !fs.existsSync(path.join(SRC, 'js', 'gdt.js'))) { console.log('no tile packer in this checkout: JSON map only'); return; }
  const h = crypto.createHash('sha1');
  for (const f of ['citymap.json', 'mapextras.json', 'ommeland.json', 'ommeland.bin', 'js/gdt.js', 'js/mapdata.js', 'js/elevation.js', 'js/passages.js', 'js/museumplan.js', 'js/util.js']) h.update(fs.readFileSync(path.join(SRC, f)));
  h.update(fs.readFileSync(packer));
  const WCACHE = path.join(HERE, '.world-cache');
  const cache = path.join(WCACHE, 'world-' + h.digest('hex').slice(0, 16));
  if (!fs.existsSync(path.join(cache, 'index.json'))) {
    fs.rmSync(cache, { recursive: true, force: true });
    const t = Date.now();
    const r = spawnSync(process.execPath, [packer, '--game', SRC, '--out', cache], { stdio: 'inherit', cwd: root });
    if (r.status) { fs.rmSync(cache, { recursive: true, force: true }); throw new Error('packing the map tiles failed'); }
    for (const d of fs.readdirSync(WCACHE)) if (path.join(WCACHE, d) !== cache) fs.rmSync(path.join(WCACHE, d), { recursive: true, force: true });
    console.log(`packed the map tiles in ${((Date.now() - t) / 1000).toFixed(0)} s`);
  }
  fs.cpSync(cache, path.join(OUT, 'world'), { recursive: true });
  console.log('map tiles: ' + fs.readdirSync(path.join(OUT, 'world')).length + ' files');
}

async function main() {
  console.log(`staging GDE Groningen ${version}`);
  fs.rmSync(process.env.GDE_STAGE_OUT ? OUT : path.join(HERE, 'build'), { recursive: true, force: true });
  // tts.json records how each voice clip was made; the game never reads it
  fs.cpSync(SRC, OUT, { recursive: true, filter: (p) => path.basename(p) !== 'tts.json' });
  // the start screen's "Wat is er nieuw" panel reads the changelog
  fs.copyFileSync(path.join(HERE, '..', 'CHANGELOG.md'), path.join(OUT, 'CHANGELOG.md'));
  // the vendored three.js and fonts must ship with their licence texts
  fs.copyFileSync(path.join(HERE, '..', 'NOTICE.md'), path.join(OUT, 'NOTICE.md'));
  fs.cpSync(path.join(HERE, '..', 'licenses'), path.join(OUT, 'licenses'), { recursive: true });

  // 1. which CDN modules does the game use?
  const texts = walk(OUT).filter((f) => /\.(js|mjs|html)$/.test(f));
  const queue = new Set([THREE]);
  for (const f of texts) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/[^'"\s)]+\.js/g)) queue.add(m[0]);
    for (const m of src.matchAll(/['"](three\/addons\/[^'"]+)['"]/g)) queue.add(resolveSpec(m[1]));
  }

  // 2. download them and everything they import
  const done = new Set();
  const todo = [...queue];
  while (todo.length) {
    const url = todo.pop();
    if (done.has(url) || !url.startsWith(CDN)) continue;
    done.add(url);
    const rel = url.slice(CDN.length);
    const buf = await cached(url, path.join('npm', rel));
    const dst = path.join(OUT, 'vendor', 'npm', rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, buf);
    for (const m of buf.toString('utf8').matchAll(IMPORT_RE)) {
      const next = resolveSpec(m[1] || m[2] || m[3], url);
      if (next && !done.has(next)) todo.push(next);
    }
  }
  console.log(`vendored ${done.size} modules`);

  // 3. the fonts
  let css = (await cached(FONT_CSS, 'fonts/fonts-v2.css')).toString('utf8');
  const fontUrls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
  for (const [i, u] of fontUrls.entries()) {
    const name = `font-${i}${path.extname(new URL(u).pathname) || '.woff2'}`;
    const buf = await cached(u, path.join('fonts', name));
    fs.mkdirSync(path.join(OUT, 'vendor', 'fonts'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'vendor', 'fonts', name), buf);
    css = css.split(u).join(RELATIVE ? name : `/vendor/fonts/${name}`);
  }
  fs.writeFileSync(path.join(OUT, 'vendor', 'fonts', 'fonts.css'), css);
  console.log(`vendored fonts (${fontUrls.length} files)`);

  // 4. point the game at the local copies
  const vendorDir = (f) => {
    if (!RELATIVE) return '/vendor/';
    const rel = path.relative(path.dirname(f), path.join(OUT, 'vendor')).split(path.sep).join('/');
    return (rel.startsWith('.') ? rel : './' + rel) + '/';
  };
  for (const f of texts) {
    let src = fs.readFileSync(f, 'utf8');
    const before = src;
    const vendor = vendorDir(f);
    src = src.split(CDN).join(vendor + 'npm/');
    if (f.endsWith('index.html')) {
      src = src.replace(/<link[^>]+rel="preconnect"[^>]*>\s*/g, '');
      src = src.split(FONT_CSS.replace(/&/g, '&amp;')).join(vendor + 'fonts/fonts.css').split(FONT_CSS).join(vendor + 'fonts/fonts.css');
    }
    if (src !== before) fs.writeFileSync(f, src);
  }

  // 5. version stamp (shown in the main menu)
  fs.writeFileSync(path.join(OUT, 'js', 'version.js'), `export const VERSION = '${version}';\n`);

  // 5b. the map as .gdt tiles (scripts/world/pack_tiles.mjs): a build artifact,
  // cached by the content of its inputs
  packWorld();

  // 6. nothing may still come from the internet at load time
  const left = [];
  for (const f of walk(OUT).filter((p) => /\.(js|mjs|html|css)$/.test(p) && !p.includes(`${path.sep}vendor${path.sep}`))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:from\s*|import\s*\(\s*|href=|src=|url\()\s*['"]?(https?:\/\/[^'"\s)>]+)/g)) left.push(`${path.relative(OUT, f)}: ${m[1]}`);
  }
  if (left.length) console.log('WARNING - still external:\n  ' + left.join('\n  '));
  else console.log('offline check: no external load-time URLs left');
}

main().catch((e) => { console.error(e); process.exit(1); });
