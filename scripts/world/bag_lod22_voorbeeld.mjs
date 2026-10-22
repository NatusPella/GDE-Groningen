// Een kleine voorbeeldtegel in CityJSON-vorm voor de conversietest en de ramingen (#410), zonder iets te downloaden.
//
//   node scripts/world/bag_lod22_voorbeeld.mjs [--extract <3dbag-extract .json.gz>] [--n 60] [--out <bestand .city.json.gz>]
//
// De gebouwen zijn ECHTE rijen uit een al aanwezige 3D BAG-extractie (data/cache/3dbag-province/extract/<versie>/<tegel>.json.gz: BAG-id,
// plek, oppervlak, dakhoogte, maaiveld, daktype), de GEOMETRIE is verzonnen: een blok met wanden, een zadel- of plat dak, bij een schuin dak een
// dakkapel en een schoorsteen. Het volgt de structuur van een 3D BAG-CityJSON (Building met BuildingPart, LoD 2.2 als Solid, semantiek
// GroundSurface / WallSurface / RoofSurface, `transform`, `b3_h_maaiveld`), maar het zegt NIETS over hoeveel driehoeken een echt LoD 2.2-gebouw
// heeft: die aantallen moeten uit de eerste echte tegel komen (docs/BAG-LOD22.md).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { RD_ORIGIN_X, RD_ORIGIN_Y } from '../../game/js/rdnew.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// rows: [{ id, c: [x, y] (wereldframe), a (m2), hmax, h50?, hg, roof? }] -> een CityJSON-object (versie 2.0, geheeltallige hoekpunten op mm)
export function makeCityJson(rows, { dormers = true } = {}) {
  const verts = [];
  const key = new Map();
  const V = (x, y, z) => {
    const q = [Math.round(x * 1000), Math.round(y * 1000), Math.round(z * 1000)];
    const k = q.join(',');
    if (!key.has(k)) { key.set(k, verts.length); verts.push(q); }
    return key.get(k);
  };
  const objs = {};
  rows.forEach((r, n) => {
    const slanted = r.roof && /slanted/.test(r.roof);
    const w = Math.sqrt(r.a * 1.5), d = r.a / w; // een blok van 3 : 2
    const rx = r.c[0] + RD_ORIGIN_X, ry = RD_ORIGIN_Y - r.c[1]; // terug naar RD
    const x0 = rx - w / 2, x1 = rx + w / 2, y0 = ry - d / 2, y1 = ry + d / 2;
    const g = r.hg, top = r.hmax > g + 1 ? r.hmax : g + 6; // (hmax en hg zijn m NAP)
    const eave = slanted ? g + (top - g) * 0.62 : top;
    const P = (x, y, z) => V(x, y, z);
    // een kamerblok: grondvlak, vier wanden, dak (zadel over de korte kant of plat); ringen tegen de klok in gezien van buiten
    const A = P(x0, y0, g), B = P(x1, y0, g), C = P(x1, y1, g), D = P(x0, y1, g);
    const E = P(x0, y0, eave), F = P(x1, y0, eave), G = P(x1, y1, eave), H = P(x0, y1, eave);
    const faces = [[[A, D, C, B]]], sem = [0];
    faces.push([[A, B, F, E]], [[B, C, G, F]], [[C, D, H, G]], [[D, A, E, H]]); sem.push(1, 1, 1, 1);
    if (slanted) {
      const R0 = P(x0, (y0 + y1) / 2, top), R1 = P(x1, (y0 + y1) / 2, top);
      faces.push([[E, F, R1, R0]], [[G, H, R0, R1]], [[F, G, R1]], [[H, E, R0]]); sem.push(2, 2, 1, 1);
      if (dormers && w > 6) { // een dakkapel op het voorvlak en een schoorsteen op de nok
        const dx = rx - 0.8, dz0 = eave + (top - eave) * 0.15;
        const a1 = P(dx, y0 + 0.4, dz0), a2 = P(dx + 1.6, y0 + 0.4, dz0), a3 = P(dx + 1.6, y0 + 0.4, dz0 + 1.3), a4 = P(dx, y0 + 0.4, dz0 + 1.3);
        const b3 = P(dx + 1.6, y0 + 1.6, dz0 + 1.3), b4 = P(dx, y0 + 1.6, dz0 + 1.3), b1 = P(dx, y0 + 1.6, dz0 + 0.55), b2 = P(dx + 1.6, y0 + 1.6, dz0 + 0.55);
        faces.push([[a1, a2, a3, a4]], [[a2, b2, b3, a3]], [[b1, a1, a4, b4]], [[a4, a3, b3, b4]]); sem.push(1, 1, 1, 2);
        const cx = rx + w * 0.3, cy = (y0 + y1) / 2 - 0.3, ch = top + 1.1;
        const k0 = P(cx, cy, top), k1 = P(cx + 0.6, cy, top), k2 = P(cx + 0.6, cy + 0.6, top), k3 = P(cx, cy + 0.6, top);
        const t0 = P(cx, cy, ch), t1 = P(cx + 0.6, cy, ch), t2 = P(cx + 0.6, cy + 0.6, ch), t3 = P(cx, cy + 0.6, ch);
        faces.push([[k0, k1, t1, t0]], [[k1, k2, t2, t1]], [[k2, k3, t3, t2]], [[k3, k0, t0, t3]], [[t0, t1, t2, t3]]); sem.push(1, 1, 1, 1, 2);
      }
    } else {
      faces.push([[E, F, G, H]]); sem.push(2);
    }
    const pid = 'NL.IMBAG.Pand.' + String(r.id).padStart(16, '0');
    const geom = { type: 'Solid', lod: '2.2', boundaries: [faces], semantics: { surfaces: [{ type: 'GroundSurface' }, { type: 'WallSurface' }, { type: 'RoofSurface' }], values: [sem] } };
    objs[pid] = { type: 'Building', attributes: { b3_h_maaiveld: g, b3_dak_type: r.roof || (slanted ? 'slanted' : 'horizontal') }, children: [pid + '-0'] };
    objs[pid + '-0'] = { type: 'BuildingPart', parents: [pid], geometry: [{ type: 'MultiSurface', lod: '1.2', boundaries: [[[A, D, C, B]]] }, geom] };
  });
  return { type: 'CityJSON', version: '2.0', transform: { scale: [0.001, 0.001, 0.001], translate: [0, 0, 0] }, metadata: { note: 'voorbeeld met verzonnen geometrie (bag_lod22_voorbeeld.mjs)' }, CityObjects: objs, vertices: verts };
}

// rijen uit een extractiebestand van fetch_3dbag.py --province ([id, x, y, a, hmax, h50, hg, roof-index]) als rijen voor makeCityJson
export function rowsFromExtract(file, n = 60) {
  const d = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString());
  // de eerste n met een plausibele maat; verspreid over het bestand
  const ok = d.rows.filter((r) => r[3] >= 25 && r[3] <= 400 && r[4] != null && r[6] != null);
  const step = Math.max(1, Math.floor(ok.length / n));
  return ok.filter((_, i) => i % step === 0).slice(0, n).map((r) => ({ id: r[0], c: [r[1], r[2]], a: r[3], hmax: r[4], h50: r[5], hg: r[6], roof: r[7] != null ? d.roofs[r[7]] : null }));
}

function arg(args, name, d) { const a = args.find((q) => q.startsWith('--' + name + '=')); if (a) return a.slice(name.length + 3); const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] ? args[i + 1] : d; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dir = path.join(ROOT, 'data', 'cache', '3dbag-province', 'extract');
  const file = arg(args, 'extract', null) || (fs.existsSync(dir) ? (() => { const v = fs.readdirSync(dir).sort().pop(); const f = fs.readdirSync(path.join(dir, v)).sort()[0]; return path.join(dir, v, f); })() : null);
  if (!file) { console.error('geen extractie gevonden: geef --extract <bestand>'); process.exit(1); }
  const rows = rowsFromExtract(file, Number(arg(args, 'n', 60)));
  const out = path.resolve(arg(args, 'out', path.join(ROOT, 'data', 'cache', '3dbag-lod22', 'voorbeeld', 'voorbeeld.city.json.gz')));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, zlib.gzipSync(JSON.stringify(makeCityJson(rows))));
  console.log(`${rows.length} gebouwen uit ${path.basename(file)} -> ${path.relative(ROOT, out)}`);
}
