// Kerken die als gewoon gebouw in de tegels staan (#406): een kerk gemapt als building=yes met alleen een naam werd een doos van 10 tot 20 m
// over de hele voetafdruk (de hoogte van de toren) met woonhuisramen. landmarkkit.js churchKindOfName en kitItemFromBuilding geven ze nu
// een kerkkit op hun eigen omtrek (landmarks3d.js kitBuilder). De namen hieronder komen uit de tegels van de provincie.
//   node scripts/kerknaam_test.mjs
import './node3d.mjs';

await import('../game/js/models3d_buildings.js');
const L = await import('../game/js/landmarks3d.js');
const K = await import('../game/js/landmarkkit.js');
let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const rect = (cx, cy, len, wid, a = 0) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [[-len / 2, -wid / 2], [len / 2, -wid / 2], [len / 2, wid / 2], [-len / 2, wid / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
};
const row = (name, type = 'yes', len = 18, wid = 11, hm = 12, cx = 5000, cy = -9000) => ({ type, name, hm, pts: rect(cx, cy, len, wid, 0.6) });

// ---- welke namen een kerk zijn: echte namen uit de tegels ----
const KERK = [
  'Kerk van Eenum', 'Kerk van Wirdum', 'Kerk van Oosterwijtwerd', 'Liudgerkerk', 'Gerefomeerde Kerk', 'Gereformeerde Kerk Stedum', 'Kandelaarskerk',
  'Doopsgezinde Kerk Zijldijk', 'Columnakerk', 'Refajahkerk', 'Maranathakerk', 'Martyriakerk', 'Ontmoetingskerk', 'Oosterkerk', 'Dorpskerk', 'Vredeskerk',
  'Nieuwe Kerk', 'Gastkerk (PKN)', 'Trefpuntkerk', 'Goede Herder kerk', 'De Hoeksteenkerk', 'Nieuw Apostolische Kerk', 'Magnalia Dei Kerk',
  'Kerk Hervormde Gemeente Ommelanderwijk - Zuidwending', 'Christelijke Gereformeerde Kerk Kornhorn', 'Gereformeerde kerk van Onderdendam', 'Kerk Woltersum',
  'Hervormde Kerk Opende', 'Chr. Geref. Kerk', 'Petrus en Pauluskerk', 'Kerk van Jezus Christus van de Heiligen der Laatste Dagen',
  'Parochie van de Heilige Transfiguratie', 'Protestantse gemeente Roodeschool', 'Doopsgezinde Gemeente Noordhorn', 'Baptisten Gemeente \'t Venster Winschoten',
  'Hervormde Gemeente Oostwold', 'Evangelische gemeente Immanuel', 'Voormalige synagoge', 'Synagoge Winsum', 'Het Witte Kerkje', "'t Nijkerkje", 'Het Kerkje', 'Kerkje van Heveskes',
];
const GEEN = [
  'Fierljepvereniging Grijpskerk', 'VV Grijpskerk', 'Vensterschool Hoogkerk', "Boerderij 'd Olle Kerke", 'Kerktoren Westerdijkshorn', 'Anda Kerkhoven Centre',
  'Staalbouw Smid Hoogkerk', 'Gemeente Groningen', 'Gemeentehuis', 'Gemeentewerf', 'Gemeentewerken Haren', 'Gemeentewerken Het Hogeland', 'Dorpshuis Kloosterstee',
  'Parochiehuis', 'Sint-Jozefkerk Pastorie', 'gemeentelijk_verzorgingsgesticht', 'De Kloosters', 'Kloostermolen', 'Klooster Ter Apel', 'Kerkhofcafé', 'Kapper Test', 'Museum Kerkje',
];
for (const nm of KERK) check(`'${nm}' is een kerk`, !!K.churchKindOfName('yes', nm), String(K.churchKindOfName('yes', nm)));
for (const nm of GEEN) check(`'${nm}' is geen kerk`, !K.churchKindOfName('yes', nm), String(K.churchKindOfName('yes', nm)));
check('een kapel of kerkje is een kapel, een kerk een kerk', K.churchKindOfName('yes', 'Het Kerkje') === 'chapel' && K.churchKindOfName('yes', 'Kapel Asingaborg') === 'chapel' && K.churchKindOfName('yes', 'Liudgerkerk') === 'church');
// de tegeltypes: een kerk als huis, winkel of flat mag; een rij die al kerk, kapel of synagoge heet houdt zijn eigen archetype
for (const t of ['house', 'retail', 'apartments', 'commercial', 'office', 'public', 'civic']) check(`kerk als ${t}`, K.churchKindOfName(t, 'Zuiderkerk') === 'church');
for (const t of ['church', 'chapel', 'cathedral', 'synagogue', 'mosque', 'school', 'farm', 'industrial', 'shed', 'garage']) check(`type ${t} blijft zoals het was`, K.churchKindOfName(t, 'Liudgerkerk') === null);
check('zonder naam geen kerk', !K.churchKindOfName('yes', '') && !K.churchKindOfName('yes', null) && !K.churchKindOfName('yes', undefined));

// ---- het item en de kit ----
{
  const b = row('Kerk van Eenum', 'yes', 20, 10, 18.7);
  const it = K.kitItemFromBuilding(b);
  check('Kerk van Eenum krijgt een kerkitem op zijn eigen omtrek', it && it.k === 'church' && it.o.length === 8 && it.n === 'Kerk van Eenum', JSON.stringify(it));
  check('de hoogte van de data (18,7 m) komt mee als hoogte tot de top', it && it.t.height === '18.7');
  const p = K.landmarkParams(it);
  check('landmarkParams geeft een kerk met de lengte en breedte van de omtrek', p && p.kit === 'church' && Math.abs(p.len - 20) < 1 && Math.abs(p.wid - 10) < 1, JSON.stringify(p));
  check('de toren is lager dan 48 m en hoger dan 16 m', p && p.towerH >= 16 && p.towerH <= 48);
  const hoog = K.kitItemFromBuilding(row('Hervormde Gemeente Tjamsweer', 'yes', 20, 12, 63));
  check('een onwaarschijnlijke hoogte (63 m) laat de kit zelf kiezen', hoog && hoog.t.height === undefined);
  const laag = K.kitItemFromBuilding(row('Het Kerkje', 'yes', 10, 7, 3));
  check('een te lage hoogte (3 m) ook', laag && laag.t.height === undefined);
  check('te klein (22 m2) of te groot (4677 m2) is geen kerk', !K.kitItemFromBuilding(row('Kerk van Test', 'yes', 6, 3.6)) && !K.kitItemFromBuilding(row('Kerk van Test', 'yes', 90, 52)));
  check('zonder punten geen item', !K.kitItemFromBuilding({ type: 'yes', name: 'Kerk van Test', pts: [] }));
  check('andere kits blijven zoals ze waren (boerderij, flat, museum)', K.kitItemFromBuilding({ type: 'farm', name: '', hm: 8, pts: rect(0, 0, 30, 16) }).k === 'farm' && K.kitItemFromBuilding({ type: 'yes', name: 'Museum Test', hm: 8, pts: rect(0, 0, 30, 16) }).k === 'museum');
}

// ---- het model: een eindige kerk op de voetafdruk ----
{
  const b = row('Liudgerkerk', 'yes', 18, 9, 21.5);
  check('hasLandmarkModel zegt ja voor een kerk als gewoon gebouw', L.hasLandmarkModel({ ...b }));
  const geo = L.buildLandmarkGeometry({ ...b }, b.pts, []);
  check('er komt een geometrie', !!geo);
  if (geo) {
    const pos = geo.attributes.position.array;
    check('de geometrie is eindig en groot genoeg voor een kerk', pos.every(Number.isFinite) && pos.length > 300, `${pos.length}`);
    let maxY = -Infinity, minY = Infinity, far = 0;
    const cx = b.pts.reduce((s, q) => s + q[0], 0) / 4, cy = b.pts.reduce((s, q) => s + q[1], 0) / 4;
    for (let i = 0; i < pos.length; i += 3) { maxY = Math.max(maxY, pos[i + 1]); minY = Math.min(minY, pos[i + 1]); far = Math.max(far, Math.hypot(pos[i] - cx, pos[i + 2] - cy)); }
    check('de top ligt rond de hoogte van de data, niet 40 m erboven', maxY > 14 && maxY < 30, `top ${maxY.toFixed(1)}`);
    check('de kerk begint op de grond en blijft bij de voetafdruk (geen heuvel, geen wierde)', minY > -1 && far < 26, `min ${minY.toFixed(1)}, ver ${far.toFixed(0)} m`);
    // het schip is lager dan de toren: de helft van de punten ligt onder 12 m, de toren steekt erboven uit
    let laag = 0, hoogN = 0;
    for (let i = 0; i < pos.length; i += 3) { if (pos[i + 1] < 12) laag++; else hoogN++; }
    check('een schip met een dak en een toren erboven (niet een doos van 21 m)', laag > hoogN && hoogN > 30, `onder 12 m: ${laag}, boven: ${hoogN}`);
  }
  // twee keer vragen geeft hetzelfde antwoord (gecached op het gebouw)
  const c = row('Liudgerkerk');
  check('het item wordt op het gebouw onthouden', L.hasLandmarkModel(c) && L.hasLandmarkModel(c) && c._kitItem && c._kitItem.k === 'church');
}

// ---- een kerk die de kit uit landmarkkits.json al tekent, laat het tegelgebouw aan die kit ----
{
  const b = row('Kerk van Test', 'yes', 20, 10, 15, 8000, -3000);
  K.setKitList([{ kind: 'church', x: 8000, y: -3000, angle: 0.6, len: 20, wid: 10 }]);
  check('een dekkende kit uit de lijst: het tegelgebouw krijgt geen eigen kit', K.kitItemFromBuilding(b) === null);
  check('een kit ver weg doet niets', K.kitItemFromBuilding(row('Kerk van Test', 'yes', 20, 10, 15, 9000, -3000)) !== null);
  K.setKitList(null);
  check('zonder lijst krijgt het gebouw een eigen kit', K.kitItemFromBuilding(b) !== null);
}

console.log(bad ? `${bad} van ${n} mislukt` : `${n}/${n} ok`);
process.exit(bad ? 1 : 0);
