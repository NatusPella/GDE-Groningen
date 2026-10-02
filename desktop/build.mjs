// Stages the game for the desktop app: copies ../game to build/game, vendors
// every CDN module (three.js + the addons it pulls in, crawled recursively)
// and the Google font, rewrites the URLs to local paths and stamps the
// version. Downloads are cached in vendor-cache/ so rebuilds work offline.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// GTE_STAGE_SRC / GTE_STAGE_OUT stage another checkout (perf runs against main)
const SRC = process.env.GTE_STAGE_SRC || path.join(HERE, '..', 'game');
const OUT = process.env.GTE_STAGE_OUT || path.join(HERE, 'build', 'game');
const CACHE = path.join(HERE, 'vendor-cache');
const CDN = 'https://cdn.jsdelivr.net/npm/';
const THREE = CDN + 'three@0.160.0/build/three.module.js';
const ADDONS = CDN + 'three@0.160.0/examples/jsm/';
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
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

async function main() {
  console.log(`staging GTE VI ${version}`);
  fs.rmSync(process.env.GTE_STAGE_OUT ? OUT : path.join(HERE, 'build'), { recursive: true, force: true });
  // tts.json records how each voice clip was made; the game never reads it
  fs.cpSync(SRC, OUT, { recursive: true, filter: (p) => path.basename(p) !== 'tts.json' });
  // the start screen's "Wat is er nieuw" panel reads the changelog
  fs.copyFileSync(path.join(HERE, '..', 'CHANGELOG.md'), path.join(OUT, 'CHANGELOG.md'));

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

  // 3. the Bebas Neue font
  let css = (await cached(FONT_CSS, 'fonts/bebas.css')).toString('utf8');
  const fontUrls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
  for (const [i, u] of fontUrls.entries()) {
    const name = `bebas-${i}${path.extname(new URL(u).pathname) || '.woff2'}`;
    const buf = await cached(u, path.join('fonts', name));
    fs.mkdirSync(path.join(OUT, 'vendor', 'fonts'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'vendor', 'fonts', name), buf);
    css = css.split(u).join(`/vendor/fonts/${name}`);
  }
  fs.writeFileSync(path.join(OUT, 'vendor', 'fonts', 'bebas.css'), css);
  console.log(`vendored font (${fontUrls.length} files)`);

  // 4. point the game at the local copies
  for (const f of texts) {
    let src = fs.readFileSync(f, 'utf8');
    const before = src;
    src = src.split(CDN).join('/vendor/npm/');
    if (f.endsWith('index.html')) {
      src = src.replace(/<link[^>]+rel="preconnect"[^>]*>\s*/g, '');
      src = src.split(FONT_CSS.replace(/&/g, '&amp;')).join('/vendor/fonts/bebas.css').split(FONT_CSS).join('/vendor/fonts/bebas.css');
    }
    if (src !== before) fs.writeFileSync(f, src);
  }

  // 5. version stamp (shown in the main menu)
  fs.writeFileSync(path.join(OUT, 'js', 'version.js'), `export const VERSION = '${version}';\n`);

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
