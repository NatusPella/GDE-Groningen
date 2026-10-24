// De wereldmarker (game/js/worldmarker3d.js, #115 en #434): elke soort heeft zijn eigen vorm en kleur, en de garagemarker
// van de spuitdienst hoort er ook bij. Een gast tekent het doel van de opdracht met dezelfde bouwer als de gastheer
// (coopentities3d.js), dus dit dekt de markerstijl van beide kanten.
//   node scripts/worldmarker_test.mjs
import './node3d.mjs';

const { buildWorldMarker3D, setWorldMarkerKind, updateWorldMarker3D, setMarkerCamera } = await import('../game/js/worldmarker3d.js');
const { markerColors } = await import('../game/js/a11y.js');

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const SOORTEN = ['start', 'goal', 'optional', 'door', 'garage', 'vehicle', 'checkpoint', 'user', 'job'];
const zichtbaar = (wm) => Object.entries(wm.icons).filter(([, ic]) => ic.visible).map(([k]) => k).join(',');

// elke soort bouwt en werkt één beeld lang zonder fouten of NaN's
for (const soort of SOORTEN) {
  const g = buildWorldMarker3D(soort);
  const wm = g.userData.wm;
  check(`${soort}: gebouwd`, !!wm && wm.kind === soort, String(wm && wm.kind));
  check(`${soort}: alleen zijn eigen pictogram zichtbaar`, zichtbaar(wm) === soort, zichtbaar(wm));
  updateWorldMarker3D(g, 1.5);
  const p = wm.top.position;
  check(`${soort}: geen NaN in het beeld`, [g.position.x, g.position.y, g.position.z, p.x, p.y, p.z, wm.column.position.y].every(Number.isFinite), `${p.x},${p.y},${p.z}`);
}

// de garagemarker (spuitdienst, #434): een eigen vorm en de oranje kleur van de garage op de kaart
const garage = buildWorldMarker3D('garage');
const wmG = garage.userData.wm;
updateWorldMarker3D(garage, 2);
check('garage: de eigen vorm, niet die van de deur', wmG.icons.garage.userData.solid.material.map !== wmG.icons.door.userData.solid.material.map);
const kleur = wmG.icons.garage.userData.solid.material.color.getHexString();
const oranje = markerColors().job.slice(1);
const bijna = (a, b) => Math.abs(parseInt(a, 16) - parseInt(b, 16)) <= 2; // kleurruimte heen en terug: hooguit een afronding
check('garage: de kleur is die van de categorie garage (job)', [0, 2, 4].every((i) => bijna(kleur.slice(i, i + 2), oranje.slice(i, i + 2))), `${kleur} vs ${oranje}`);

// een onbekende soort laat de marker staan (een oudere of nieuwere host kan niets stukmaken)
setWorldMarkerKind(garage, 'bestaatniet');
check('onbekende soort: niets verandert', wmG.kind === 'garage');

// de kolom groeit mee met de afstand: dichtbij 28 m, ver weg hoger (markerlook.js)
const ver = buildWorldMarker3D('goal');
setMarkerCamera({ position: { x: 0, y: 0, z: 0 } });
updateWorldMarker3D(ver, 0);
const dichtbij = ver.userData.wm.column.scale.y;
ver.position.set(600, 0, 0);
updateWorldMarker3D(ver, 0);
check('verder weg: een hogere kolom', ver.userData.wm.column.scale.y > dichtbij, `${dichtbij} -> ${ver.userData.wm.column.scale.y}`);
check('de kolom blijft eindig: geen NaN', Number.isFinite(ver.userData.wm.column.scale.y));

if (bad) { console.log(`${n - bad}/${n} worldmarker`); process.exit(1); }
console.log(`${n}/${n} worldmarker`);
