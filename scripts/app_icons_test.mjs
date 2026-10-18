// Checks the app icons: files, sizes, transparency, package.json references,
// the web favicon/manifest links, the window icon in main.js and, when a build
// exists in desktop/dist, that the .exe carries an icon resource and the .app
// points at an existing .icns. Does not run electron-builder.
//   node scripts/app_icons_test.mjs
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { pngInfo, readIco, readIcns } = require('../desktop/scripts/iconpack.cjs');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESK = path.join(ROOT, 'desktop');
let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.error('FAIL', msg); } };
const rd = (p) => fs.readFileSync(path.join(ROOT, p));

// decode a PNG just far enough to find out whether any pixel is transparent and
// whether the outer 4% border is fully transparent (safe margin)
function alphaStats(buf) {
  const { width, height, colorType } = pngInfo(buf);
  if (colorType !== 6 || buf[24] !== 8 || buf[28] !== 0) return null; // 8-bit RGBA, no interlace
  const idat = [];
  for (let o = 8; o < buf.length;) {
    const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8);
    if (type === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = 4, stride = width * bpp;
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + x] = v & 255;
    }
  }
  const m = Math.floor(width * 0.04);
  let transparent = 0, borderOpaque = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const al = px[y * stride + x * 4 + 3];
    if (al < 255) transparent++;
    if ((x < m || y < m || x >= width - m || y >= height - m) && al > 8) borderOpaque++;
  }
  return { transparent, borderOpaque };
}

// ---- source icons
const icon = rd('desktop/resources/icon.png');
const ii = pngInfo(icon);
ok(ii.width === 1024 && ii.height === 1024, 'icon.png is 1024x1024');
const st = alphaStats(icon);
ok(st && st.transparent > 0, 'icon.png heeft transparantie');
ok(st && st.borderOpaque === 0, 'icon.png heeft een transparante veilige marge');
const win = pngInfo(rd('desktop/resources/window-icon.png'));
ok(win.width === 256 && win.height === 256, 'window-icon.png is 256x256');

const ico = readIco(rd('desktop/resources/icon.ico'));
const icoSizes = ico.map((e) => e.size).sort((a, b) => a - b);
for (const s of [16, 32, 48, 256]) ok(icoSizes.includes(s), `icon.ico bevat ${s}px`);
for (const e of ico) { const i = pngInfo(e.png); ok(i.width === e.size && i.height === e.size && i.hasAlphaChannel, `icon.ico ${e.size}px klopt en heeft alfa`); }

const icns = readIcns(rd('desktop/resources/icon.icns'));
const bySize = new Set(icns.map((e) => pngInfo(e.png).width));
for (const s of [128, 256, 512, 1024]) ok(bySize.has(s), `icon.icns bevat ${s}px`);

for (const f of ['favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  const i = pngInfo(rd('game/img/icons/' + f));
  const want = f.startsWith('apple') ? 180 : +f.match(/\d+/)[0];
  ok(i.width === want && i.height === want, `${f} is ${want}x${want}`);
}
const fav = readIco(rd('game/img/icons/favicon.ico'));
ok([16, 32, 48].every((s) => fav.some((e) => e.size === s)), 'favicon.ico bevat 16, 32 en 48');

// ---- package.json
const pkg = JSON.parse(rd('desktop/package.json'));
const b = pkg.build;
const refs = { mac: [b.mac.icon, '.icns'], win: [b.win.icon, '.ico'], linux: [b.linux.icon, '.png'] };
for (const [k, [p, ext]] of Object.entries(refs)) {
  ok(p && p.endsWith(ext), `build.${k}.icon is een ${ext}-bestand (${p})`);
  ok(p && fs.existsSync(path.join(DESK, p)), `build.${k}.icon bestaat`);
}
ok(b.files.includes('resources/window-icon.png'), 'window-icon.png zit in build.files (anders ontbreekt het in de verpakte app)');

// ---- main.js and the web page
const main = rd('desktop/main.js').toString('utf8');
ok(b.files.includes('resources/icon.ico'), 'icon.ico zit in build.files (venstericoon op Windows)');
ok(/icon:\s*path\.join\(__dirname,\s*'resources',\s*process\.platform === 'win32' \? 'icon\.ico' : 'window-icon\.png'\)/.test(main),'main.js geeft het BrowserWindow een icoon');
ok(/process\.platform === 'darwin' && !app\.isPackaged && app\.dock/.test(main), 'dock.setIcon voor macOS-dev staat er nog');
const html = rd('game/index.html').toString('utf8');
for (const re of [/rel="icon"[^>]*favicon\.ico/, /rel="apple-touch-icon"[^>]*apple-touch-icon\.png/, /rel="manifest"[^>]*manifest\.webmanifest/]) ok(re.test(html), `index.html: ${re.source.slice(0, 30)}`);
const man = JSON.parse(rd('game/manifest.webmanifest'));
for (const i of man.icons) ok(fs.existsSync(path.join(ROOT, 'game', i.src)), `manifest-icoon ${i.src} bestaat`);

// ---- a finished build, when there is one
// RT_ICON (3) images inside a PE file's resource section, by walking the resource tree
function peIconImages(buf) {
  if (buf.toString('latin1', 0, 2) !== 'MZ') return null;
  const pe = buf.readUInt32LE(0x3c);
  if (buf.readUInt32LE(pe) !== 0x4550) return null;
  const nsec = buf.readUInt16LE(pe + 6), optSize = buf.readUInt16LE(pe + 20), opt = pe + 24;
  const ddOff = opt + (buf.readUInt16LE(opt) === 0x20b ? 112 : 96);
  const rva = buf.readUInt32LE(ddOff + 2 * 8);
  if (!rva) return null;
  const secs = [];
  for (let i = 0; i < nsec; i++) { const o = opt + optSize + 40 * i; secs.push({ va: buf.readUInt32LE(o + 12), vs: Math.max(buf.readUInt32LE(o + 8), buf.readUInt32LE(o + 16)), raw: buf.readUInt32LE(o + 20) }); }
  const toOff = (r) => { const s = secs.find((x) => r >= x.va && r < x.va + x.vs); return s ? s.raw + r - s.va : -1; };
  const base = toOff(rva);
  if (base < 0) return null;
  const entries = (dirOff) => {
    const n = buf.readUInt16LE(dirOff + 12) + buf.readUInt16LE(dirOff + 14), out = [];
    for (let i = 0; i < n; i++) { const o = dirOff + 16 + 8 * i, off = buf.readUInt32LE(o + 4); out.push({ id: buf.readUInt32LE(o) & 0x7fffffff, sub: off & 0x80000000 ? base + (off & 0x7fffffff) : null, leaf: off & 0x80000000 ? null : base + off }); }
    return out;
  };
  const leaves = (e) => { if (e.leaf !== null) return [e.leaf]; return entries(e.sub).flatMap(leaves); };
  const images = [];
  for (const t of entries(base)) {
    if (t.id !== 3 || t.sub === null) continue;
    for (const l of leaves(t)) { const dataRva = buf.readUInt32LE(l), size = buf.readUInt32LE(l + 4), o = toOff(dataRva); if (o >= 0) images.push(buf.subarray(o, o + size)); }
  }
  return { images, hasGroup: entries(base).some((e) => e.id === 14) };
}
const dist = process.argv[2] ? path.resolve(process.argv[2]) : path.join(DESK, 'dist'); // node scripts/app_icons_test.mjs [build-map]
let built = 0;
if (fs.existsSync(dist)) {
  const walk = (d, depth = 0) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name.endsWith('.app') ? [p] : depth < 3 && e.name !== 'node_modules' ? walk(p, depth + 1) : [];
    return e.name.endsWith('.exe') && !/uninstall|elevate/i.test(e.name) ? [p] : [];
  });
  for (const p of walk(dist)) {
    built++;
    if (p.endsWith('.exe')) {
      const r = peIconImages(fs.readFileSync(p)), rel = path.relative(DESK, p);
      ok(r && r.hasGroup && r.images.length > 0, `${rel} bevat een icoon-resource`);
      // the default Electron icon is not ours: the exe must hold our 256 px image byte for byte
      ok(r && ico.filter((e) => e.size === 256).every((e) => r.images.some((im) => im.equals(e.png))), `${rel} bevat ons icon.ico (niet het standaard Electron-icoon)`);
    }
    else {
      const plist = fs.readFileSync(path.join(p, 'Contents', 'Info.plist'), 'utf8');
      const name = (plist.match(/<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/) || [])[1];
      ok(name && fs.existsSync(path.join(p, 'Contents', 'Resources', name.endsWith('.icns') ? name : name + '.icns')), `${path.relative(DESK, p)}: CFBundleIconFile wijst naar een bestaand .icns`);
    }
  }
}
console.log(`app_icons_test: ${checks - fails}/${checks} ok${built ? `, ${built} gebouwde app(s) gecontroleerd` : ', geen build in desktop/dist (alleen bronnen gecontroleerd)'}`);
process.exit(fails ? 1 : 0);
