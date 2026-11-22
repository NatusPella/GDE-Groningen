// Statische beelden van de kaart voor en na de opruiming van de verzonnen randen (#1092): per locatie drie vlakken naast elkaar,
//  1. voor: wat het spel tekende (de lijnen van het hash-rooster in de kleuren van de kaart, de tegellijnen erbij),
//  2. voor, met herkomst: rood = procedureel (hash-rooster), de andere kleuren = rijen van de tegels met een bron-id,
//  3. na: alleen de tegelrijen.
// De lijnen van het hash-rooster komen uit drawCountryDetail van de twee codeversies (--voor=<map met game>, --na=<map met game>),
// de tegelrijen (water, wegen, gebouwen, groen) uit de echte tegels; het is geen schermafdruk van het spel maar de tekenopdrachten, statisch,
// in een SVG die headless Chrome (eigen profiel buiten de repo, eigen PID) naar PNG zet.
//   node scripts/randen_beeld.mjs --voor=<game> --na=<game> --world=<map> --uit=<map voor de PNG's> [--chrome=<exe>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import './node3d.mjs';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const VOOR = path.resolve(arg('voor', 'game')), NA = path.resolve(arg('na', 'game'));
const WORLD = path.resolve(arg('world', process.env.GDE_WORLD || 'game/world'));
const UIT = path.resolve(arg('uit', 'docs/beeld-22-11/randen'));
const CHROME = arg('chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe');
fs.mkdirSync(UIT, { recursive: true });

const LOC = [
  { id: 'marum-hoornweg', lat: 53.1427, lon: 6.2690, r: 380, mini: true },
  { id: 'usquert-kerkstraat', lat: 53.4007, lon: 6.6162, r: 380, mini: true },
  { id: 'warffum-hogeland', lat: 53.3894, lon: 6.5614, r: 380, mini: true },
  { id: 'terapel-westerwolde', lat: 52.8761, lon: 7.0600, r: 380, mini: true },
  { id: 'usquert-kaart', lat: 53.4007, lon: 6.6162, r: 750, mini: false },
  { id: 'marum-kaart', lat: 53.1427, lon: 6.2690, r: 750, mini: false },
];
const imp = (game, rel) => import(pathToFileURL(path.join(game, 'js', rel)).href);
const index = JSON.parse(fs.readFileSync(path.join(WORLD, 'index-provincie.json'), 'utf8'));
const RD = await imp(NA, 'rdnew.js');
const G = await imp(NA, 'gdt.js');
const names = Object.fromEntries(Object.entries(G.SECTION).map(([k, v]) => [v, k]));

// de tegelrijen in een venster
const fds = new Map();
const loadTile = (key) => {
  const t = index.tiles[key];
  if (!t) return null;
  const f = index.packs[t.pack].file;
  if (!fds.has(f)) fds.set(f, fs.openSync(path.join(WORLD, f), 'r'));
  const buf = Buffer.alloc(t.len);
  fs.readSync(fds.get(f), buf, 0, t.len, t.off);
  return G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
};
function tegelRijen(x0, y0, x1, y1) {
  const out = { water: [], roads: [], buildings: [], green: [] };
  const [ra, rb] = RD.worldToRd(x0, y0), [rc, rd] = RD.worldToRd(x1, y1);
  for (let i = Math.floor(Math.min(ra, rc) / 1000); i <= Math.floor(Math.max(ra, rc) / 1000); i++) for (let j = Math.floor(Math.min(rb, rd) / 1000); j <= Math.floor(Math.max(rb, rd) / 1000); j++) {
    const blob = loadTile(`${i}_${j}`);
    if (!blob) continue;
    for (const s of blob.sections) {
      const n = names[s.type];
      const k = n === 'WATER' ? 'water' : n === 'ROADS' ? 'roads' : n === 'BUILDINGS' ? 'buildings' : n === 'GREEN' ? 'green' : null;
      if (k) for (const r of s.rows) if (r.pts && r.pts.length > 1) out[k].push(r);
    }
  }
  return out;
}

// de hash-rooster-lijnen van een codeversie in een venster: [{ kleur, pts: [[x, y], ...] }]
async function hashLijnen(game, wx, wy, r, ppm, mini) {
  const CF = await imp(game, 'countryfield.js');
  const CM = await imp(game, 'countrymap.js');
  const R = await imp(game, 'regions.js');
  R.setRegionData(index.global || index.layers.provincie.global);
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  const BL = CF.BLOCK, rects = [];
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const k of Object.keys(index.tiles)) {
    const [i, j] = k.split('_').map(Number);
    if (!Number.isFinite(i) || !Number.isFinite(j)) continue;
    const [p, q] = RD.rdToWorld(i * 1000, j * 1000), [p2, q2] = RD.rdToWorld((i + 1) * 1000, (j + 1) * 1000);
    const q0 = Math.min(q, q2), q1 = Math.max(q, q2);
    rects.push([p, q0, p2, q1]);
    a = Math.min(a, p); b = Math.min(b, q0); c = Math.max(c, p2); d = Math.max(d, q1);
  }
  const bx0 = Math.floor(a / BL), by0 = Math.floor(b / BL), w = Math.floor(c / BL) - bx0 + 1, h = Math.floor(d / BL) - by0 + 1;
  const data = new Uint8Array(w * h);
  for (const t of rects) for (let bx = Math.floor(t[0] / BL); bx <= Math.floor((t[2] - 0.01) / BL); bx++) for (let by = Math.floor(t[1] / BL); by <= Math.floor((t[3] - 0.01) / BL); by++) data[(by - by0) * w + (bx - bx0)] = 1;
  CF.setProvinceBlocks({ x0: bx0, y0: by0, w, h, data });
  const st = mini ? CM.MINI_STYLE : CM.MAP_STYLE;
  const lijnen = [];
  let pts = [], style = null;
  const ctx = new Proxy({}, {
    get: (_, k) => {
      if (k === 'beginPath') return () => { pts = []; };
      if (k === 'moveTo') return (x, y) => { pts.push([[x, y]]); };
      if (k === 'lineTo') return (x, y) => { if (pts.length) pts[pts.length - 1].push([x, y]); };
      if (k === 'stroke') return () => { for (const p of pts) if (p.length > 1) lijnen.push({ kleur: style, pts: p }); pts = []; };
      return () => {};
    },
    set: (_, k, v) => { if (k === 'strokeStyle') style = v; return true; },
  });
  CM.drawCountryDetail(ctx, wx - r, wy - r, wx + r, wy + r, ppm, st);
  return { lijnen, st };
}

const PX = 480;
function svgVlak(loc, wx, wy, tegels, lijnen, st, modus, ox) {
  const r = loc.r, s = PX / (2 * r);
  const X = (x) => (ox + (x - (wx - r)) * s).toFixed(1), Y = (y) => ((y - (wy - r)) * s).toFixed(1);
  const path = (pts, close) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join('') + (close ? 'Z' : '');
  const o = [`<clipPath id="c${ox}"><rect x="${ox}" y="0" width="${PX}" height="${PX}"/></clipPath><g clip-path="url(#c${ox})"><rect x="${ox}" y="0" width="${PX}" height="${PX}" fill="${st.meadow}"/>`];
  for (const g of tegels.green) o.push(`<path d="${path(g.pts, true)}" fill="${st.park}"/>`);
  for (const w of tegels.water) o.push(`<path d="${path(w.pts, true)}" fill="${st.water}" stroke="${st.water}" stroke-width="0.8"/>`);
  // het hash-rooster (alleen in 'voor'): in het spel in dezelfde kleur als het water, in het herkomstvlak rood
  if (modus !== 'na') for (const l of lijnen) o.push(`<path d="${path(l.pts, false)}" fill="none" stroke="${modus === 'herkomst' ? '#ff2a2a' : l.kleur}" stroke-width="${modus === 'herkomst' ? 1.6 : Math.max(1, 1.6 * s * 2).toFixed(1)}" opacity="${modus === 'herkomst' ? 0.95 : 0.9}"/>`);
  for (const rd of tegels.roads) o.push(`<path d="${path(rd.pts, false)}" fill="none" stroke="${rd.cat === 'major' ? st.major : st.road}" stroke-width="${Math.max(1.2, (rd.width || 4) * s).toFixed(1)}" stroke-linecap="round"/>`);
  tegels.buildings.forEach((b, i) => o.push(`<path d="${path(b.pts, true)}" fill="${st.buildings ? st.buildings[i % st.buildings.length] : st.building}"/>`));
  o.push('</g>');
  const titel = modus === 'voor' ? 'voor (zo tekende het spel)' : modus === 'herkomst' ? 'voor, herkomst: rood = procedureel' : 'na: alleen tegelrijen met bron-id';
  o.push(`<rect x="${ox}" y="${PX}" width="${PX}" height="22" fill="#111"/><text x="${ox + 6}" y="${PX + 15}" font-family="Arial" font-size="13" fill="#eee">${titel}</text>`);
  return o.join('');
}

const klaar = [];
for (const loc of LOC) {
  const [wx, wy] = RD.wgsToWorld(loc.lat, loc.lon);
  const ppm = loc.mini ? 1.2 : 0.6;
  const tegels = tegelRijen(wx - loc.r, wy - loc.r, wx + loc.r, wy + loc.r);
  const voor = await hashLijnen(VOOR, wx, wy, loc.r, ppm, loc.mini);
  const na = await hashLijnen(NA, wx, wy, loc.r, ppm, loc.mini);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PX * 3}" height="${PX + 22}" viewBox="0 0 ${PX * 3} ${PX + 22}">${svgVlak(loc, wx, wy, tegels, voor.lijnen, voor.st, 'voor', 0)}${svgVlak(loc, wx, wy, tegels, voor.lijnen, voor.st, 'herkomst', PX)}${svgVlak(loc, wx, wy, tegels, na.lijnen, na.st, 'na', PX * 2)}</svg>`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-randen-'));
  const f = path.join(tmp, `${loc.id}.svg`);
  fs.writeFileSync(f, svg);
  const png = path.join(UIT, `${loc.id}.png`);
  const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${path.join(tmp, 'profiel')}`, `--screenshot=${png}`, `--window-size=${PX * 3},${PX + 22}`, pathToFileURL(f).href], { timeout: 60000, encoding: 'utf8' });
  klaar.push(`${loc.id}: ${fs.existsSync(png) ? 'ok' : 'mislukt (' + (r.error || r.status) + ')'} voor ${voor.lijnen.length} hash-lijnen, na ${na.lijnen.length}; tegelrijen water ${tegels.water.length}, wegen ${tegels.roads.length}, gebouwen ${tegels.buildings.length}`);
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(klaar.join('\n'));
