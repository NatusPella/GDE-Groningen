// De indeling van de stuurhut of roef van een boot (#847), in scheepscoördinaten: +x is vooruit (naar de
// boeg), +z is stuurboord (rechts), y is de hoogte boven de waterlijn van de romp. Puur: alleen maten en
// plekken, geen THREE (bootinterieur3d.js bouwt de geometrie), zodat scripts/bootinterieur_test.mjs alles
// in gewone node kan narekenen. De maten van de roef komen uit de bootfitters in models3d_vehicles.js en
// zeeschip3d.js: daar staan ze per bootsoort in de romp getekend, hier staan dezelfde getallen met een
// verwijzing ernaar (die bestanden zijn read-only voor dit werk). De stoel van de schipper komt uit
// boattypes.js (boatSeats), zodat het stuurwiel en de helmstok op dezelfde plek staan als de zitter.
//
// Soorten met een roef of stuurhut: de rondvaartboot (glazen passagiersdek), een sloep met een gesloten
// roef, de binnenvaart (spits en kempenaar), het zeeschip (vracht, container, tanker), de sleper en de
// skûtsje-kuip met de helmstok. De zeilboot heeft een open kuip met een helmstok; de roeiboot en de andere
// open boten (kano, kajak, sup, waterfiets, rubberboot, dinghy, skiff, acht) hebben geen roef en krijgen
// dus niets: daar is niets te betimmeren.
import { boatKind, boatHasCabin, boatSeats } from './boattypes.js';

// De afmetingen van een indeling; de 3D bouwt hieruit en de tests rekenen ermee.
//   x0..x1, halfW   de binnenruimte (roef/kuip) in scheepscoördinaten
//   vloer, dak      y van de vloer en van het plafond (dak = 0 bij een open kuip)
//   raam            het raamband { y0, y1 } waar glas zit (null bij een open kuip)
//   open            true = geen vaste wanden (open kuip of een dek met alleen een dak)
//   stuur           { soort: 'wiel', x, y, z, r, tilt } of { soort: 'helmstok', x0, y0, z0, x1, y1, z1 }
//   paneel          instrumentenpaneel: { x, y (onderkant), z, l (langs x), h (hoogte), b (breedte) }
//   banken          [{ x, y (zitting bovenkant), z, l, b, rug (hoogte rugleuning) }]
//   tafel/kombuis/bemanningsbank   { x, y, z, l, b, h } of null; bij tafel is y het blad, bij kombuis de vloer
//   vesten          [{ x, y, z }] reddingsvesten
const LEN_MIN = 1.5; // een boot korter dan dit heeft geen roef meer om in te richten

// De zitting van de schipper uit boattypes.js (bootSeats); een vangnet voor het geval een soort er geen heeft.
function schipperSeat(v) {
  const seats = boatSeats(v);
  return (seats && seats[0]) || { x: 0, z: 0, y: 0.4 };
}

// Een roef met een gesloten glasband (#847): sloepFit in models3d_vehicles.js r. 2115 tekent de roef als een
// vaste kast van 0,14 tot 0,85 met daarboven een glasband 0,85-1,19 en een dak op 1,22, over -0,35..0,35 van
// de lengte (cx0/cx1) en 0,72 van de breedte (cw). De kast is van buiten dicht, dus van buiten lees je de
// inrichting door de glasband; de vloer van de roef leggen we op de bovenkant van die kast (0,87), zodat je in
// eerste persoon een echte vloer ziet in plaats van de bovenkant van het plaatwerk. De schipper zit volgens
// boatSeats op -0,05 van de halve lengte, -0,16 van de halve breedte (arms: 'wheel').
function sloepRoef(v) {
  const len = v.model.len, wid = v.model.wid, hl = len / 2;
  const x0 = -hl * 0.35 + 0.12, x1 = hl * 0.35 - 0.12;
  const halfW = (wid * 0.72) / 2 - 0.1;
  const vloer = 0.87, dak = 1.18;
  const s = schipperSeat(v);
  const z = Math.max(-halfW + 0.22, Math.min(halfW - 0.22, s.z));
  const stuur = { soort: 'wiel', x: Math.min(x1 - 0.3, s.x + 0.42), y: vloer + 0.14, z, r: 0.13, tilt: 0.12 };
  return {
    soort: 'sloepRoef',
    open: false,
    lengte: len,
    breedte: wid,
    x0, x1, halfW,
    vloer, dak,
    raam: { y0: 0.87, y1: 1.16 },
    stuur,
    paneel: { x: stuur.x + 0.16, y: vloer, z, l: 0.08, h: 0.24, b: 0.5 },
    banken: [
      { x: s.x - 0.24, y: vloer + 0.02, z, l: 0.4, b: 0.42, rug: 0.24 },
      { x: s.x - 0.24, y: vloer + 0.02, z: -z, l: 0.4, b: 0.42, rug: 0.24 },
      { x: x0 + 0.28, y: vloer + 0.02, z: 0, l: 0.42, b: halfW * 1.7, rug: 0.2 },
    ],
    tafel: null,
    kombuis: null,
    bemanningsbank: null,
    vesten: [
      { x: x0 + 0.12, y: vloer + 0.1, z: halfW * 0.55 },
      { x: x0 + 0.12, y: vloer + 0.1, z: -halfW * 0.55 },
    ],
  };
}

// De glazen passagierskas van de rondvaartboot (#847): rondvaartFit (models3d_vehicles.js r. 2196) zet de
// stijlen van het glazen dak op -hl+1,25 tot hl-1,35 (rx0/rx1) met het dak op 1,6, en de banken in rijen van
// 0,95 vanaf hl-2,1 tot -hl+1,6, aan beide kanten op ±(iw+0,15)/2 met iw = W/2-0,16. De skipperkruk staat op
// -hl+0,75 (y 0,62), het stuur op -hl+1,04 (y 1,0) en de console op -hl+1,2 (0,14-0,96). De zijkanten zijn open
// boven de banken: dit is geen dichte roef, maar wel de overdekte passagiersruimte waar dit interieur over gaat.
function rondvaartRoef(v) {
  const len = v.model.len, wid = v.model.wid, hl = len / 2;
  const iw = wid / 2 - 0.16;
  // de kuip begint bij de stuurplek achterop (skipperkruk -hl+0,75, stuur -hl+1,04) en loopt tot de voorste
  // dakstijl (rx1 = hl-1,35); de banken beginnen bij hl-2,1
  const x0 = -hl + 0.7, x1 = hl - 1.35;
  const zBank = (iw + 0.15) / 2;
  const banken = [];
  for (let x = hl - 2.1; x > x0; x -= 0.95) {
    for (const z of [-zBank, zBank]) banken.push({ x, y: 0.41, z, l: 0.4, b: Math.max(0.3, iw - 0.15), rug: 0.42 });
  }
  const s = schipperSeat(v);
  return {
    soort: 'rondvaart',
    open: true,
    lengte: len,
    breedte: wid,
    x0, x1, halfW: iw,
    vloer: 0.16, dak: 1.58,
    raam: null,
    stuur: { soort: 'wiel', x: -hl + 1.04, y: 1.0, z: 0, r: 0.14, tilt: 0.45 },
    paneel: { x: -hl + 1.22, y: 0.62, z: 0, l: 0.03, h: 0.32, b: 0.4 },
    banken,
    tafel: null,
    kombuis: { x: -hl + 2.55, y: 0.16, z: iw - 0.35, l: 0.7, b: 0.5, h: 0.85 }, // klein buffetje naast de ingang
    bemanningsbank: { x: Math.max(x0 + 0.6, s.x - 0.35), y: 0.16, z: 0, l: 0.5, b: 0.55, rug: 0.3 },
    vesten: [
      { x: x0 + 0.4, y: 0.52, z: zBank },
      { x: x0 + 1.35, y: 0.52, z: -zBank },
      { x: x1 - 0.6, y: 0.52, z: zBank },
    ],
  };
}

// De stuurhut van de binnenvaart (#847): binnenvaartFit (models3d_vehicles.js r. 2150) zet hem achterop op
// wx = -hl+3,6, 4,6 lang (wl), ww = min(0,78W, W-1,0) breed; de kast loopt van het dek (base, 1,1 hoog op het
// midden van de romp) tot base+1,8, met de glasband op base+0,8..base+1,5 (base+1,15 ± 0,35) en het
// overkragende dak op base+1,9. De schipper zit op dezelfde x als het midden van de hut (boatSeats: -hl+3,6,
// y 1,9). Het ruim, de luiken en de mast staan er al.
function binnenvaartHut(v) {
  const len = v.model.len, wid = v.model.wid, hl = len / 2;
  const deckTop = 1.1; // top van de romp op het midden: HULL_SHAPES.binnenvaart.top (models3d_vehicles.js r. 1991)
  const wx = -hl + 3.6, wl = 4.6, ww = Math.min(wid * 0.78, wid - 1.0);
  const x0 = wx - wl / 2 + 0.14, x1 = wx + wl / 2 - 0.14;
  const halfW = ww / 2 - 0.1;
  const vloer = deckTop + 0.06, dak = deckTop + 1.74;
  const s = schipperSeat(v);
  const stuur = { soort: 'wiel', x: wx + 0.9, y: s.y + 0.32, z: 0, r: 0.19, tilt: 0.35 };
  return {
    soort: 'binnenvaart',
    open: false,
    lengte: len,
    breedte: wid,
    x0, x1, halfW,
    vloer, dak,
    raam: { y0: deckTop + 0.8, y1: deckTop + 1.5 },
    stuur,
    paneel: { x: wx + 1.15, y: vloer, z: 0, l: 0.55, h: 0.72, b: 1.5 },
    banken: [
      { x: s.x - 0.15, y: s.y, z: 0, l: 0.5, b: 0.55, rug: 0.45 }, // stuurstoel, net als boatSeats
      { x: wx - 1.5, y: vloer + 0.45, z: -0.3, l: 1.15, b: 0.45, rug: 0.35 }, // bemanningsbank
    ],
    tafel: { x: wx - 0.9, y: vloer + 0.72, z: 0.9, l: 0.9, b: 0.6, h: 0.72 },
    kombuis: { x: wx - 1.55, y: vloer, z: 0.9, l: 0.85, b: 0.5, h: 0.86 },
    bemanningsbank: null,
    vesten: [
      { x: x0 + 0.12, y: s.y + 0.15, z: -0.35 },
      { x: x0 + 0.12, y: s.y + 0.15, z: 0.35 },
    ],
  };
}

// De brug van een zeeschip (#847): zeeschip3d.js opbouw() zet de brug op bx = x0+1,4 (x0 = -hl+2,4+lengte/2,
// lengte 13 voor vracht/container en 15 voor de tanker), 5,4 lang (bl) en 0,62W breed, van top+5,6 tot
// top+7,8, met de glasband op top+6,25..top+7,15 (by+0,1 ± 0,45) en het dak op by+1,2. top is de dekhoogte
// (3,4, ZEESCHIP_SHAPE.top in zeeschip3d.js r. 14). De schipper staat/zit op bx (boatSeats: -hl+10,3, y 9,9).
function zeeschipBrug(v) {
  const len = v.model.len, wid = v.model.wid, hl = len / 2;
  const top = 3.4; // ZEESCHIP_SHAPE.top op het midden (zeeschip3d.js r. 14)
  const opbouwL = v.model.soort === 'tanker' ? 15 : 13;
  const x0h = -hl + 2.4 + opbouwL / 2;
  const bx = x0h + 1.4, bl = 5.4;
  const by = top + 6.7;
  const x0 = bx - bl / 2 + 0.14, x1 = bx + bl / 2 - 0.14;
  const halfW = (wid * 0.62) / 2 - 0.12;
  const vloer = by - 1.1, dak = by + 1.06;
  const s = schipperSeat(v);
  const stuur = { soort: 'wiel', x: bx + 1.9, y: s.y + 0.3, z: 0, r: 0.22, tilt: 0.2 };
  return {
    soort: 'zeeschip',
    open: false,
    lengte: len,
    breedte: wid,
    x0, x1, halfW,
    vloer, dak,
    raam: { y0: by - 0.35, y1: by + 0.55 },
    stuur,
    paneel: { x: bx + 2.15, y: vloer, z: 0, l: 0.5, h: 0.95, b: Math.min(halfW * 1.8, 2.4) },
    banken: [
      { x: s.x - 0.1, y: s.y, z: 0, l: 0.5, b: 0.6, rug: 0.5 }, // stuurstoel
      { x: bx - 1.8, y: vloer + 0.45, z: -0.4, l: 1.3, b: 0.45, rug: 0.35 }, // bemanningsbank
    ],
    tafel: { x: bx - 1.0, y: vloer + 0.78, z: -1.3, l: 1.1, b: 0.7, h: 0.78 }, // kaartentafel
    kombuis: { x: bx - 1.95, y: vloer, z: 1.2, l: 1.0, b: 0.55, h: 0.9 },
    bemanningsbank: null,
    vesten: [
      { x: bx - 2.35, y: by - 0.25, z: -0.8 },
      { x: bx - 2.35, y: by - 0.25, z: 0.8 },
    ],
  };
}

// De brug van de sleper (#847): sleperFit (zeeschip3d.js r. 157) zet de hoge stuurhut midscheeps op
// -hl*0,15+0,6, 0,22L lang en 0,6W breed, van top+2,4 tot top+4,4 met de glasband op top+3,0..top+3,8;
// top is de dekhoogte (1,9, SLEPER_SHAPE.top in zeeschip3d.js r. 23). De schipper zit op dezelfde x
// (boatSeats: -hl*0,15+0,6, y 5,1).
function sleperBrug(v) {
  const len = v.model.len, wid = v.model.wid, hl = len / 2;
  const top = 1.9; // SLEPER_SHAPE.top op het midden (zeeschip3d.js r. 23)
  const xb = -hl * 0.15 + 0.6, bl = len * 0.22, bw = wid * 0.6;
  const x0 = xb - bl / 2 + 0.12, x1 = xb + bl / 2 - 0.12;
  const halfW = bw / 2 - 0.1;
  const vloer = top + 2.4, dak = top + 4.3;
  const s = schipperSeat(v);
  const stuur = { soort: 'wiel', x: xb + 0.65, y: s.y + 0.28, z: 0, r: 0.17, tilt: 0.25 };
  return {
    soort: 'sleper',
    open: false,
    lengte: len,
    breedte: wid,
    x0, x1, halfW,
    vloer, dak,
    raam: { y0: top + 3.0, y1: top + 3.8 },
    stuur,
    paneel: { x: xb + 0.85, y: vloer, z: 0, l: 0.45, h: 0.7, b: 1.0 },
    banken: [
      { x: s.x - 0.1, y: s.y, z: 0, l: 0.5, b: 0.55, rug: 0.5 }, // stuurstoel
      { x: xb - 1.3, y: vloer + 0.45, z: -0.2, l: 1.0, b: 0.4, rug: 0.35 }, // bemanningsbank
    ],
    tafel: { x: xb - 0.85, y: vloer + 0.74, z: -0.7, l: 0.8, b: 0.55, h: 0.74 },
    kombuis: { x: xb - 1.25, y: vloer, z: 0.7, l: 0.8, b: 0.5, h: 0.85 },
    bemanningsbank: null,
    vesten: [
      { x: xb - bl / 2 + 0.14, y: vloer + 0.9, z: -0.5 },
      { x: xb - bl / 2 + 0.14, y: vloer + 0.9, z: 0.5 },
    ],
  };
}

// De open kuip van de skûtsje (#847): skutsjeFit (models3d_vehicles.js r. 2353) legt het dek op 0,66, de
// luikenkap tussen -0,55hl en 0,42hl met de luiken op 0,83..0,93, en de helmstok van (sx+0,02, 0,98) via
// (sx+0,9, 1,12) naar (sx+1,45, 1,02) met sx = -hl. De schipper zit aan de helmstok op -hl+1,25, z 0,35,
// y 0,72 (boatSeats: arms 'tiller'); de gasten zitten op de luiken. Dit is een open kuip: geen wanden of dak.
function skutsjeKuip(v) {
  const len = v.model.len, wid = v.model.wid, hl = len / 2;
  const deckY = 0.66; // skutsjeFit: deckY
  const fx0 = hl * 0.42, ax1 = -hl * 0.55; // skutsjeFit: voorste en achterste luik
  const x0 = -hl + 0.35, x1 = fx0;
  const halfW = wid / 2 - 0.3;
  const s = schipperSeat(v);
  const banken = [];
  const hLen = fx0 - ax1, n = 3;
  for (let i = 0; i < n; i++) {
    banken.push({ x: ax1 + hLen * (i + 0.5) / n, y: 0.95, z: 0, l: hLen / n - 0.1, b: Math.min(halfW * 1.6, 2.3), rug: 0 });
  }
  return {
    soort: 'skutsje',
    open: true,
    lengte: len,
    breedte: wid,
    x0, x1, halfW,
    vloer: deckY, dak: 0,
    raam: null,
    stuur: { soort: 'helmstok', x0: -hl + 0.9, y0: 1.06, z0: 0, x1: -hl + 1.45, y1: 1.02, z1: 0 },
    paneel: null,
    banken: [
      { x: s.x - 0.12, y: s.y, z: s.z, l: 0.5, b: 0.45, rug: 0.3 }, // stuurmansbank bij de helmstok
      ...banken,
      { x: x0 + 0.6, y: deckY + 0.06, z: -0.2, l: 1.0, b: 0.35, rug: 0 }, // bankje op het achterdek
    ],
    tafel: null,
    kombuis: null,
    bemanningsbank: null,
    vesten: [
      { x: ax1 + hLen * 0.5, y: 1.02, z: halfW * 0.6 },
      { x: fx0 - 0.5, y: 1.02, z: -halfW * 0.5 },
    ],
  };
}

// De open kuip van de zeilboot (#847): dinghyFit (models3d_vehicles.js r. 2287) legt twee banken op y 0,3
// (x 0,1 en -hl+0,38) en de romp heeft zijn eigen vloer op 0,08. De schipper zit volgens boatSeats op
// -hl+0,38 met de tiller; een zeilboot hoort een helmstok te hebben, dus die komt hier (het model tekent er
// een voor de dinghy met motor, niet voor de zeilboot).
function zeilbootKuip(v) {
  const len = v.model.len, wid = v.model.wid, hl = len / 2;
  const halfW = wid / 2 - 0.2;
  const x0 = -hl + 0.18, x1 = hl - 0.7;
  const s = schipperSeat(v);
  return {
    soort: 'zeilboot',
    open: true,
    lengte: len,
    breedte: wid,
    x0, x1, halfW,
    vloer: 0.1, dak: 0,
    raam: null,
    stuur: { soort: 'helmstok', x0: -hl + 0.55, y0: 0.56, z0: 0, x1: -hl + 1.2, y1: 0.5, z1: 0 },
    paneel: null,
    banken: [
      { x: s.x, y: 0.33, z: 0, l: 0.4, b: Math.min(halfW * 1.8, 1.7), rug: 0 },
      { x: x1 - 0.35, y: 0.33, z: 0, l: 0.3, b: Math.min(halfW * 1.6, 1.3), rug: 0 },
    ],
    tafel: null,
    kombuis: null,
    bemanningsbank: null,
    vesten: [
      { x: x0 + 0.3, y: 0.24, z: -halfW * 0.6 },
      { x: x1 - 0.5, y: 0.24, z: halfW * 0.6 },
    ],
  };
}

// Welke indeling deze boot krijgt (of null voor een open boot zonder roef).
export function bootInterieurSoort(v) {
  if (!v || !v.model) return null;
  if (!(v.model.len > LEN_MIN) || !(v.model.wid > 0.4)) return null;
  switch (boatKind(v)) {
    case 'rondvaart': return 'rondvaart';
    case 'binnenvaart': return 'binnenvaart';
    case 'zeeschip': return 'zeeschip';
    case 'sleper': return 'sleper';
    case 'skutsje': return 'skutsje';
    // een sloep krijgt alleen een interieur als het model ook echt een roef heeft (boatHasCabin; politie altijd)
    case 'sloep': return boatHasCabin(v) ? 'sloepRoef' : null;
    // de zeilboot heeft een open kuip met een helmstok; de gewone dinghy (met motor) is te open voor een indeling
    case 'dinghy': return v.model.soort === 'zeilboot' ? 'zeilboot' : null;
    default: return null;
  }
}

// Heeft deze boot een roef of stuurhut om in te richten? Een wrak of een zinkende boot niet: daar is de
// inrichting weg of onder water. Puur en zonder allocaties, zodat de wereldtick hem per boot per frame mag
// vragen voordat er iets gebouwd wordt.
export function heeftBootInterieur(v) {
  if (!v || !v.model || v.wrecked || v.sinking) return false;
  return bootInterieurSoort(v) !== null;
}

// De indeling van deze boot in scheepscoördinaten, of null (open boot zonder roef, wrak, zinkende boot).
export function bootInterieur(v) {
  if (!heeftBootInterieur(v)) return null;
  switch (bootInterieurSoort(v)) {
    case 'sloepRoef': return sloepRoef(v);
    case 'rondvaart': return rondvaartRoef(v);
    case 'binnenvaart': return binnenvaartHut(v);
    case 'zeeschip': return zeeschipBrug(v);
    case 'sleper': return sleperBrug(v);
    case 'skutsje': return skutsjeKuip(v);
    case 'zeilboot': return zeilbootKuip(v);
    default: return null;
  }
}

// De sleutel waaronder de 3D de gedeelde geometrie bewaart: één indeling per (soort, lengte, breedte,
// uitvoering). Boten van hetzelfde model delen dus één geometrie per detailniveau (#847).
export function bootInterieurKey(v) {
  const soort = bootInterieurSoort(v);
  if (!soort) return '';
  return `${soort}|${v.model.len}|${v.model.wid}|${v.model.soort || ''}`;
}
