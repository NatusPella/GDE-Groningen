// Copies the unpacked desktop builds from desktop/dist into steam/content/,
// one folder per depot (see scripts/depot_build_*.vdf). Local only: nothing
// here contacts Steam. Run after `npm run dist:mac` / `dist:win` / `dist:linux`
// in desktop/ (or `npm run release -- <bump> --steam`), before dist/ is cleaned.
//
//   node steam/copy-builds.mjs            every platform that was built
//   node steam/copy-builds.mjs linux mac  only these
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, '..', 'desktop', 'dist');
const CONTENT = path.join(HERE, 'content');
const APP = 'GDE Groningen';

// Steam installs the unpacked app, not the installer/portable/AppImage
const SOURCES = {
  windows: { from: path.join(DIST, 'win-unpacked'), launch: `${APP}.exe` },
  mac: { from: path.join(DIST, 'mac-universal'), only: `${APP}.app`, launch: `${APP}.app` },
  linux: { from: path.join(DIST, 'linux-unpacked'), launch: 'gde-groningen' },
};

const wanted = process.argv.slice(2);
for (const w of wanted) if (!SOURCES[w]) { console.error(`unknown platform: ${w} (windows, mac, linux)`); process.exit(1); }
const platforms = wanted.length ? wanted : Object.keys(SOURCES);

let copied = 0;
for (const name of platforms) {
  const { from, only, launch } = SOURCES[name];
  const src = only ? path.join(from, only) : from;
  if (!fs.existsSync(path.join(src, only ? '' : launch))) {
    const msg = `${name}: no build in ${path.relative(process.cwd(), src)}`;
    if (wanted.length) { console.error(msg); process.exit(1); }
    console.log(`${msg}, skipped`);
    continue;
  }
  const dest = path.join(CONTENT, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  // keep the symlinks inside the .app (Electron frameworks) and the file modes
  fs.cpSync(src, only ? path.join(dest, only) : dest, { recursive: true, verbatimSymlinks: true });
  console.log(`${name}: ${path.relative(process.cwd(), dest)} (launch: ${launch})`);
  copied++;
}
if (!copied) { console.error('Nothing copied: build first (desktop: npm run dist:mac / dist:win / dist:linux).'); process.exit(1); }
