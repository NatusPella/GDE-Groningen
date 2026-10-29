// De markerlaag mag geen vlakke plaat als hoofdgeometrie hebben (#432).
//   node scripts/markervlak_test.mjs
//
// In de beelden stond er een groot egaal olijfgroen vlak midden op straat bij
// Garage Knalpot, en in de video (opname #432) een groene plaat van 28 m hoog:
// dat bleek de holle lichtkolom van de wereldmarker (game/js/worldmarker3d.js),
// die je van dichtbij tegen de binnenkant ziet. Deze test bewijst twee dingen:
//   1. geen enkel markeronderdeel is een plat vlak, behalve de twee stukken die
//      plat op de grond horen te liggen (de ring en de schijf);
//   2. het volume van de marker (de kolom) is onzichtbaar waar de speler staat,
//      bij dag en bij nacht, terwijl ring en pictogram blijven staan.
import './node3d.mjs';

const THREE = await import('three');
const { buildWorldMarker3D, updateWorldMarker3D, setMarkerCamera, setMarkerEnv, columnNearFade, COLUMN_NEAR_M, COLUMN_FADE_M } = await import('../game/js/worldmarker3d.js');

let n = 0, bad = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', naam, info); } };
const SOORTEN = ['start', 'goal', 'optional', 'door', 'garage', 'vehicle', 'checkpoint', 'user', 'job'];

// ---- 1. een plaat is een plaat -------------------------------------------------
// Een vlak heeft één richting (bijna) nul; alleen daarmee kun je een plaat van een
// volume onderscheiden. De detector wordt eerst zelf getest, anders bewijst een
// groene uitslag niets.
const maat = (geo) => {
  geo.computeBoundingBox();
  const s = new THREE.Vector3();
  geo.boundingBox.getSize(s);
  return [s.x, s.y, s.z];
};
const plat = (geo) => maat(geo).some((v) => v < 1e-6);

check('detector: een PlaneGeometry is een plaat', plat(new THREE.PlaneGeometry(2, 30)));
check('detector: een doos met dikte is geen plaat', !plat(new THREE.BoxGeometry(2, 30, 0.2)));
check('detector: een cilinder is geen plaat', !plat(new THREE.CylinderGeometry(0.07, 0.16, 28, 10, 1, true)));

// ---- 2. de gebouwde marker: alleen de grondstukken zijn vlak --------------------
for (const soort of SOORTEN) {
  const g = buildWorldMarker3D(soort);
  const wm = g.userData.wm;
  const grond = new Set([wm.ground, wm.disc]);
  const platen = [];
  let diep = null;
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (grond.has(o)) {
      // de ring en de schijf horen plat op de grond te liggen, niet rechtop
      const [x, y, z] = maat(o.geometry);
      check(`${soort}: grondstuk ligt plat`, y < 1e-6 && Math.max(x, z) <= 5, `${x}/${y}/${z}`);
    } else if (plat(o.geometry)) {
      platen.push(o.geometry.type);
    } else {
      diep = o;
    }
  });
  check(`${soort}: geen vlakke plaat als markeronderdeel`, platen.length === 0, platen.join(','));
  // het volume van de marker is echt ruimtelijk: breedte én diepte, geen vlak
  const [cx, , cz] = maat(wm.column.geometry);
  check(`${soort}: de kolom heeft breedte en diepte`, cx > 0.2 && cz > 0.2, `${cx} x ${cz}`);
  check(`${soort}: de kolom is geen plaat`, !plat(wm.column.geometry));
  // en hij is halfdoorzichtig: nooit een dichte muur, ook niet ver weg
  check(`${soort}: de kolom blijft doorschijnend`, wm.column.material.transparent === true && wm.columnBase > 0 && wm.columnBase < 1, String(wm.columnBase));
  check(`${soort}: naast de grondstukken staat er ruimtelijke geometrie`, !!diep);
}

// ---- 3. waar de speler staat is het volume weg, dag én nacht --------------------
const dichtbij = buildWorldMarker3D('job'); // de bijbaan-/garagemarker uit de beelden (#432)
const wm = dichtbij.userData.wm;
const cam = { position: { x: 0, y: 0, z: 0 } };
setMarkerCamera(cam);
const zet = (d) => { dichtbij.position.set(d, 0, 0); updateWorldMarker3D(dichtbij, 1); };

for (const [label, env] of [['dag', [0, 0]], ['nacht', [1, 0]], ['nacht+regen', [1, 1]]]) {
  setMarkerEnv(...env);
  for (const d of [0, 1, 4, COLUMN_NEAR_M]) {
    zet(d);
    check(`${label}: geen zichtbaar volume op ${d} m`, wm.column.visible === false, String(wm.column.visible));
    check(`${label}: geen dekking van het volume op ${d} m`, wm.column.material.opacity === 0, String(wm.column.material.opacity));
    // wat de speler moet zien blijft staan: de ring op de grond en het pictogram
    check(`${label}: de ring blijft zichtbaar op ${d} m`, wm.ground.visible === true);
    check(`${label}: het pictogram blijft zichtbaar op ${d} m`, wm.top.visible === true && wm.icons.job.visible === true);
  }
  // van ver is de kolom er weer: dat is juist het baken (#115)
  zet(120);
  check(`${label}: ver weg is de kolom zichtbaar`, wm.column.visible === true);
  check(`${label}: ver weg is de kolom zacht`, wm.column.material.opacity > 0 && wm.column.material.opacity <= 0.8, String(wm.column.material.opacity));
}

// ---- 4. de inloop is egaal en begrensd (geen plop, geen NaN) --------------------
check('inloop: binnen de loopafstand 0', columnNearFade(0) === 0 && columnNearFade(COLUMN_NEAR_M) === 0);
check('inloop: ver weg 1', columnNearFade(COLUMN_FADE_M) === 1 && columnNearFade(1e6) === 1);
check('inloop: onzin telt als dichtbij', columnNearFade(NaN) === 0 && columnNearFade(-5) === 0);
let vorige = -1, egaal = true;
for (let d = 0; d <= COLUMN_FADE_M; d += 0.5) {
  const f = columnNearFade(d);
  if (!(f >= vorige) || f < 0 || f > 1) egaal = false;
  vorige = f;
}
check('inloop: nooit dalend en tussen 0 en 1', egaal);
check('inloop: halverwege echt tussenin', columnNearFade((COLUMN_NEAR_M + COLUMN_FADE_M) / 2) > 0.4 && columnNearFade((COLUMN_NEAR_M + COLUMN_FADE_M) / 2) < 0.6);

if (bad) { console.log(`${n - bad}/${n} markervlak`); process.exit(1); }
console.log(`${n}/${n} markervlak`);
