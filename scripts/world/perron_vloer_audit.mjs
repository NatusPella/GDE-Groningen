// Audit van de perronvloer van ALLE stations (#1348): kun je overal op een perron lopen zonder erdoor te vallen?
// Per perronstrook (stad: map.perrons; landhaltes: countryPlatformRow van stationtravel.js, zoals het spel ze bijzet):
//   - gat:         elk punt in de strook (om de 0,5 m, over de hele breedte) staat in de perronvloer (perronHitAt);
//   - hoogtevraag: een voetganger die op het perron staat, blijft er in surfaceAt (de hoogtevraag van het spel) op, over de hele strook;
//   - strook:      geen dubbel punt (de strook slaat dan een stuk over) en nergens een hals (halve breedte < MIN_HS);
//   - hoogte:      de vloer ligt op de spoorvloer (railZ) + PERRON_TOP (of de rail ligt er niet onder: dan geen controle);
//   - spoor:       de rand ligt minstens PLATFORM_EDGE van elk spoor (de trein raakt hem niet) en hooguit MAX_AF van het dichtstbijzijnde.
// auditPerronVloer is puur (rijen + hoogtemodel + railZ + spoorafstand); de test is scripts/perron_vloer_test.mjs (synthetisch en op de echte kaart).
import { PERRON_TOP, perronHitAt } from '../../game/js/perrons.js';
import { PLATFORM_EDGE } from '../../game/js/railprofile.js';
import { surfaceAt } from '../../game/js/elevation.js';

export const MIN_HS = 0.8;     // m halve breedte: smaller is een hals waar je niet overheen past
export const MAX_AF = 3.2;     // m tussen perronrand en dichtstbijzijnd spoor: verder weg is het perron losgeraakt van zijn spoor
const STEP = 0.5;              // m tussen de proefpunten

// rows: perronrijen { id, nm, st, p: [[x, y, hs, z]], r: [...] }. elev: het hoogtemodel met de perrons erin (addPerrons).
// railZ(x, y): hoogte van de spoorvloer of null (geen spoor in de buurt). trackDist(x, y): afstand tot het dichtstbijzijnde spoor of null.
// spoorRij(row): of de rand- en afstandscontrole voor deze strook geldt (de stadsperrons liggen tussen sporen die niet allemaal in trackDist zitten).
export function auditPerronVloer({ rows, elev, railZ = null, trackDist = null, spoorRij = () => true, tol = 0.1 }) {
  const bad = [];
  const fail = (row, what) => bad.push({ id: row.id, st: row.st || '?', wat: what });
  const f = (v) => v.map((q) => (typeof q === 'number' ? +q.toFixed(2) : q)).join(', ');
  for (const row of rows) {
    const p = row.p || [];
    if (p.length < 2) { fail(row, 'minder dan twee punten: geen vloer'); continue; }
    for (let i = 0; i < p.length - 1; i++) {
      const L = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
      if (L < 1e-3) fail(row, `dubbel punt ${i}: de strook slaat een stuk over`);
    }
    for (let i = 0; i < p.length; i++) if (p[i][2] < MIN_HS) fail(row, `hals bij punt ${i}: halve breedte ${p[i][2].toFixed(2)} m (min ${MIN_HS})`);
    // de vloer zelf: over elke doorsnede, binnen de breedte (0,25 m van de rand af: de rand zelf is een muur)
    let gat = 0, val = 0, hoogte = 0, rand = 0, af = 0;
    const eerste = {};
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, ay, ha, za] = p[i], [bx, by, hb, zb] = p[i + 1];
      const L = Math.hypot(bx - ax, by - ay);
      if (L < 1e-3) continue;
      const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
      // (de koppen van de strook zelf, op 0 en L, zijn een rand: de vloer begint 5 cm erbinnen)
      for (let a = 0.05; a <= L - 0.05 + 1e-9; a += STEP) {
        const t = Math.min(1, a / L), cx = ax + ux * a, cy = ay + uy * a, hs = ha + (hb - ha) * t, z = za + (zb - za) * t;
        for (const o of [0, hs * 0.5, -hs * 0.5, hs - 0.25, -(hs - 0.25)]) {
          const x = cx + nx * o, y = cy + ny * o;
          const h = perronHitAt(elev.perrons, x, y, z + tol);
          if (!h || Math.abs(h.z - z) > tol + 0.02) { gat++; eerste.gat = eerste.gat || [x, y, h ? h.z : null, z]; }
          const st = { z, ribbon: null, kind: 'ground' };
          surfaceAt(elev, x, y, st);
          if (st.z < z - tol) { val++; eerste.val = eerste.val || [x, y, st.z, z]; }
        }
        if (railZ) {
          const rz = railZ(cx, cy);
          if (rz !== null && Math.abs(z - (rz + PERRON_TOP)) > tol + 0.05) { hoogte++; eerste.hoogte = eerste.hoogte || [cx, cy, z, rz + PERRON_TOP]; }
        }
        if (trackDist && spoorRij(row)) {
          const ds = [1, -1].map((side) => trackDist(cx + nx * hs * side, cy + ny * hs * side)).filter((v) => v !== null);
          if (ds.some((d) => d < PLATFORM_EDGE - 0.1)) { rand++; eerste.rand = eerste.rand || [cx, cy, Math.min(...ds)]; }
          if (ds.length && Math.min(...ds) > MAX_AF) { af++; eerste.af = eerste.af || [cx, cy, Math.min(...ds)]; }
        }
      }
    }
    if (gat) fail(row, `${gat} proefpunten zonder perronvloer (eerste: ${f(eerste.gat)})`);
    if (val) fail(row, `${val} proefpunten waar de hoogtevraag de voetganger van het perron laat vallen (eerste: ${f(eerste.val)})`);
    if (hoogte) fail(row, `${hoogte} punten waar de vloer niet op de spoorvloer + ${PERRON_TOP.toFixed(2)} ligt (eerste: ${f(eerste.hoogte)})`);
    if (rand) fail(row, `${rand} punten waar de rand dichter dan ${PLATFORM_EDGE} m bij een spoor ligt (eerste: ${f(eerste.rand)})`);
    if (af) fail(row, `${af} punten waar het perron meer dan ${MAX_AF} m van zijn spoor af ligt (eerste: ${f(eerste.af)})`);
  }
  return bad;
}
