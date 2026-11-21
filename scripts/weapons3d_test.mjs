// De wapenmodellen (models3d_weapons.js): elk wapen uit WEAPONS heeft een model, binnen het driehoeken- en tekenaanroepbudget, met een
// eigen silhouet (de contour-hash verschilt), zonder NaN, met gedeelde geometrie (dispose geeft niets vrij wat het niet bezit), zonder
// merk of tekst, en de hand en de eerste-persoonhanden gebruiken dezelfde modellen.
//   node scripts/weapons3d_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const W = await import('../game/js/models3d_weapons.js');
const P = await import('../game/js/models3d_people.js');
const { WEAPONS, WEAPON_KEYS } = await import('../game/js/weapons.js');

export const TRIS_MAX = 1400; // per wapen in de hand (gemeten: zie de uitvoer; de zwaarste is de jachtbuks met richtkijker)
export const LAGEN_MAX = 6; // tekenaanroepen per wapen
const SLUITEN = process.argv.includes('--tabel');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const keys = WEAPON_KEYS.filter((k) => k !== 'fists');

// De contour van een wapen als bitmap, van opzij (f, u) en van boven (f, s): elke driehoek wordt bemonsterd. Genormaliseerd op de
// lengte, zodat het om de vorm gaat en niet om de maat. Geeft { hash, rijen } terug; `hash` is een korte tekenreeks van het raster.
export function contour(key, cols = 48, rows = 16) {
  const layers = W.weaponLayers(key);
  const pts = [];
  for (const l of layers) {
    const a = l.geometry.attributes.position.array;
    for (let i = 0; i < a.length; i += 9) {
      const tri = [0, 1, 2].map((v) => [-a[i + v * 3 + 1], a[i + v * 3], a[i + v * 3 + 2]]); // (f, u, s)
      for (let sA = 0; sA <= 6; sA++) for (let sB = 0; sB <= 6 - sA; sB++) {
        const w0 = sA / 6, w1 = sB / 6, w2 = 1 - w0 - w1;
        pts.push([0, 1, 2].map((k) => tri[0][k] * w0 + tri[1][k] * w1 + tri[2][k] * w2));
      }
    }
  }
  const lo = [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k]))), hi = [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k])));
  const lang = Math.max(hi[0] - lo[0], 1e-6);
  const aanzicht = (as) => {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (const p of pts) {
      const c = Math.min(cols - 1, Math.floor(((p[0] - lo[0]) / lang) * cols));
      const r = Math.floor(((p[as] - lo[as]) / lang) * cols); // dezelfde maat in beide richtingen
      if (r < rows) grid[r][c] = 1;
    }
    return grid.map((rw) => rw.map((v) => (v ? '#' : '.')).join('')).reverse();
  };
  const rijen = [...aanzicht(1), ...aanzicht(2)];
  let h = 2166136261;
  for (const ch of rijen.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return { hash: h.toString(16), rijen, lengte: lang, hoogte: hi[1] - lo[1] };
}

t('elk wapen uit WEAPONS heeft een model, de blote vuisten niet', () => {
  for (const k of WEAPON_KEYS) {
    const m = P.buildWeaponMesh(k);
    if (k === 'fists') assert.equal(m, null);
    else assert.ok(m && m.children.length > 0, `${k} heeft geen model`);
  }
  assert.deepEqual([...W.WEAPON_MODEL_KEYS].sort(), [...keys].sort(), 'models3d_weapons.js en weapons.js hebben dezelfde wapens');
});

t('driehoeken en tekenaanroepen binnen het budget (en meer detail dan de oude blokjes)', () => {
  for (const k of keys) {
    const tris = W.weaponTriangles(k), lagen = W.weaponLayers(k).length;
    assert.ok(tris >= 60, `${k}: ${tris} driehoeken is te weinig detail`);
    assert.ok(tris <= TRIS_MAX, `${k}: ${tris} driehoeken is te zwaar (max ${TRIS_MAX})`);
    assert.ok(lagen <= LAGEN_MAX, `${k}: ${lagen} lagen (max ${LAGEN_MAX})`);
  }
});

t('elk wapen heeft een eigen silhouet (de contour-hash verschilt)', () => {
  const zien = new Map();
  for (const k of keys) {
    const c = contour(k);
    assert.ok(!zien.has(c.hash), `${k} heeft hetzelfde silhouet als ${zien.get(c.hash)}`);
    zien.set(c.hash, k);
  }
  // en ook echt anders: minstens 6 procent van de cellen verschilt tussen elk paar
  const sil = keys.map((k) => [k, contour(k).rijen.join('')]);
  for (let i = 0; i < sil.length; i++) for (let j = i + 1; j < sil.length; j++) {
    let d = 0;
    for (let c = 0; c < sil[i][1].length; c++) if (sil[i][1][c] !== sil[j][1][c]) d++;
    assert.ok(d / sil[i][1].length >= 0.06, `${sil[i][0]} en ${sil[j][0]} lijken te veel op elkaar (${Math.round(1000 * d / sil[i][1].length) / 10}%)`);
  }
});

t('de geometrie is eindig, heeft normalen en een begrenzing', () => {
  for (const k of keys) for (const l of W.weaponLayers(k)) {
    const a = l.geometry.attributes.position.array, nr = l.geometry.attributes.normal.array;
    assert.ok(a.every(Number.isFinite) && nr.every(Number.isFinite), `${k}/${l.name}: NaN of oneindig`);
    assert.ok(l.geometry.boundingSphere && l.geometry.boundingSphere.radius > 0, `${k}/${l.name}: geen begrenzing`);
    assert.ok(l.material && l.material.userData.shared, `${k}/${l.name}: materiaal niet gedeeld`);
  }
});

t('geen binnenstebuiten: de normalen van spiegelende onderdelen wijzen naar buiten', () => {
  for (const k of keys) for (const l of W.weaponLayers(k)) {
    const g = l.geometry, p = g.attributes.position.array, nr = g.attributes.normal.array;
    let binnen = 0, totaal = 0;
    for (let i = 0; i < p.length; i += 9) {
      const ab = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]], ac = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
      const c = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      if (Math.hypot(...c) < 1e-12) continue;
      totaal++;
      if (c[0] * nr[i] + c[1] * nr[i + 1] + c[2] * nr[i + 2] < 0) binnen++;
    }
    assert.ok(binnen / totaal < 0.02, `${k}/${l.name}: ${binnen} van ${totaal} driehoeken kijken van de normaal weg (windingsrichting)`);
  }
});

t('dispose: de geometrie en materialen zijn gedeeld, een mesh geeft niets weg wat de cache nog nodig heeft', () => {
  for (const k of keys) {
    const m = P.buildWeaponMesh(k);
    m.traverse((o) => {
      if (!o.isMesh) return;
      assert.ok(o.geometry.userData.shared, `${k}: geometrie niet als gedeeld gemerkt`);
      assert.ok(o.material.userData.shared, `${k}: materiaal niet als gedeeld gemerkt`);
    });
    assert.equal(P.buildWeaponMesh(k).children[0].children[0].geometry, m.children[0].children[0].geometry, `${k}: twee bouwbeurten delen de geometrie`);
  }
});

t('de hand toont hetzelfde model, met een loopmond op de plek van het model', () => {
  for (const k of keys) {
    const mesh = P.buildPersonMesh(0x3355aa, 0xd9a77a, {});
    P.setHeldWeapon(mesh, k);
    assert.equal(mesh.userData.gunKey, k);
    const gun = mesh.userData.guns[k];
    assert.equal(gun.children.filter((c) => c.isMesh).length, W.weaponLayers(k).length, `${k}: de hand en het voorbeeld hebben dezelfde lagen`);
    assert.ok(mesh.userData.muzzle, `${k}: loopmond`);
    // de loopmond ligt bij het verste punt van het model (binnen 8 cm, of 12 procent van de lengte bij lange wapens)
    let fMax = -Infinity;
    for (const l of W.weaponLayers(k)) { const a = l.geometry.attributes.position.array; for (let i = 1; i < a.length; i += 3) fMax = Math.max(fMax, -a[i]); }
    const tip = -mesh.userData.muzzle.position.y;
    assert.ok(Math.abs(tip - fMax) <= Math.max(0.08, 0.12 * fMax), `${k}: loopmond ${tip} ligt ver van het uiteinde ${fMax.toFixed(2)}`);
  }
});

t('geen merken of tekst op wapens: geen canvasstructuren, geen tekstregels in de bron', () => {
  const src = fs.readFileSync(new URL('../game/js/models3d_weapons.js', import.meta.url), 'utf8');
  assert.ok(!/fillText|CanvasTexture|new THREE\.Sprite|TextGeometry/.test(src));
});

t('de bron: alleen models3d_weapons.js bouwt wapens, de eerste-persoonhanden en de drops gebruiken buildWeaponMesh', () => {
  const people = fs.readFileSync(new URL('../game/js/models3d_people.js', import.meta.url), 'utf8');
  assert.ok(!/GUN_SPECS\[[^\]]+\]\.parts/.test(people), 'de oude blokjes zijn weg');
  for (const f of ['firstpersonhands.js', 'weapondrops.js', 'vehiclepreview.js']) {
    assert.match(fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8'), /buildWeaponMesh/, f);
  }
});

if (SLUITEN || process.env.WEAPONS_TABEL) {
  console.log('wapen          driehoeken  lagen  lengte  hoogte');
  for (const k of keys) { const c = contour(k); console.log(`${k.padEnd(14)} ${String(W.weaponTriangles(k)).padStart(8)}  ${String(W.weaponLayers(k).length).padStart(5)}  ${c.lengte.toFixed(2).padStart(6)}  ${c.hoogte.toFixed(2).padStart(6)}`); }
}
console.log(`weapons3d_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
