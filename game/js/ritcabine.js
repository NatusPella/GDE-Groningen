// De binnenkant van de rit (#882 taxi, #926 trein): de pure kant. Hier staan de maten en de onderdelen van de
// taxicabine van "Gele Gans" (een verzonnen taxibedrijf, een eigen low-poly taxi zonder echt merk) en van het
// treinraam. Alles is een lijst dozen { at, b, rot, c, g }; ritcabine3d.js maakt er één geometrie van met
// vertexkleuren (geen eigen shader, geen licht per voertuig). Zonder THREE en zonder DOM, zodat
// scripts/ritcabine_test.mjs de maten, de zichtlijnen (vult de straat het beeld?) en de meter narekent.
//
// Taxi, in voertuigmaten zoals carinteriorlayout.js: +x vooruit, +y omhoog (vanaf de grond), +z rechts.
// De passagier zit voorin rechts; de chauffeur links, een eind voor de stoel van de passagier uit.

export const TAXI_NAAM = 'Gele Gans';
// Het verzonnen tarief op de meter: een instaptarief en een bedrag per kilometer.
export const TAXI_TARIEF = { start: 3.4, perKm: 2.2 };
export const TAXI_OOG = { x: -0.4, y: 1.26, z: 0.36 };   // het oog van de passagier
export const TAXI_VOORRUIT = { x0: 1.0, x1: 0.32 };       // onderkant (de bak) en bovenkant (de kop) van de voorruit

const FLOOR = 0x2b2e33, PANEEL = 0x3b4048, DASH = 0x2d3036, DASH_TOP = 0x3a3f46, STOEL = 0x6a707a, STOEL_RUG = 0x5a606a;
const HEMEL = 0xe8e4d8, STIJL = 0x2a2d33, TAXI_GEEL = 0xe8c13a, RUBBER = 0x1f2226, KNOP = 0x8a8f98;
const HUID = 0xf0bf9a, TRUI = 0x4f86c6, BROEK = 0x2c303a, PET = 0xf2f0e8;
export const METER_AAN = 0xffb02e, METER_UIT = 0x2e2412;

// Een stuk dat van punt p naar q loopt (arm, stijl, stang), als doos met de lengte langs x gedraaid.
export function staaf(p, q, dik, c, g = 0) {
  const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
  const l = Math.hypot(dx, dy, dz) || 1e-6, h = Math.hypot(dx, dz);
  return { at: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], b: [l, dik, dik], rot: [0, Math.atan2(-dz, dx), Math.atan2(dy, h)], c, g };
}
const doos = (at, b, c, rot = [0, 0, 0], g = 0) => ({ at, b, rot, c, g });

// De zeven segmenten van een cijfer van de meter: a boven, b rechtsboven, c rechtsonder, d onder, e linksonder, f linksboven, g midden.
const ZEVEN = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
export const zevenSegment = (cijfer) => ZEVEN[cijfer] || '';
export const SEGMENTEN = 'abcdefg';
export const METER_CIJFERS = 4; // 99,99

// Het bedrag op de meter na `afstandM` meter, in hele centen, nooit meer dan 99,99. Met een prijs (wat de rit de speler echt kost) en
// de lengte van de rit loopt de meter van het instaptarief naar die prijs, zodat het eindbedrag klopt met wat je betaalt; zonder
// prijs rekent hij instaptarief plus het bedrag per kilometer.
export function taxiBedrag(afstandM, { totaalM = 0, prijs = 0, tarief = TAXI_TARIEF } = {}) {
  const m = Math.max(0, Number.isFinite(afstandM) ? afstandM : 0);
  let b;
  if (prijs > 0 && totaalM > 0) {
    const start = Math.min(tarief.start, prijs);
    b = start + (prijs - start) * Math.min(1, m / totaalM);
  } else b = tarief.start + (tarief.perKm * m) / 1000;
  return Math.min(99.99, Math.round(b * 100) / 100);
}

// De lichte segmenten van een bedrag: een lijst van METER_CIJFERS stukjes tekst ('abcdef' per cijfer).
export function meterSegmenten(bedrag) {
  const cent = Math.max(0, Math.min(9999, Math.round((Number.isFinite(bedrag) ? bedrag : 0) * 100)));
  const s = String(cent).padStart(METER_CIJFERS, '0');
  const uit = [];
  for (let i = 0; i < METER_CIJFERS; i++) uit.push(i === 0 && s[0] === '0' ? '' : zevenSegment(Number(s[i])));
  return uit;
}

// De doos van één segment van één cijfer, op de meter: lokaal (lx, ly) op het scherm, lz de diepte (voor het glas).
function segmentDoos(cijfer, seg, h, w, dik) {
  const hw = w / 2, hh = h / 2, t = w * 0.2;
  switch (seg) {
    case 'a': return { at: [0, hh, 0], b: [dik, t, w] };
    case 'd': return { at: [0, -hh, 0], b: [dik, t, w] };
    case 'g': return { at: [0, 0, 0], b: [dik, t, w] };
    case 'b': return { at: [0, hh / 2, hw], b: [dik, h / 2, t] };
    case 'c': return { at: [0, -hh / 2, hw], b: [dik, h / 2, t] };
    case 'f': return { at: [0, hh / 2, -hw], b: [dik, h / 2, t] };
    default: return { at: [0, -hh / 2, -hw], b: [dik, h / 2, t] }; // e
  }
}

// De meter (taxameter) bovenop het dashboard, naar de passagier gedraaid: een behuizing met een scherm van vier cijfers
// van zeven segmenten (groep 1: onverlicht en altijd leesbaar), een komma en een euroteken. De cijferdozen staan voor
// elke stand in dezelfde volgorde: cijfer 0..3, segment a..g, zodat ritcabine3d.js alleen de kleur van een segment hoeft te zetten.
export const METER = { x: 0.58, y: 1.0, z: 0.0, draai: 0.55 };
export function meterDelen() {
  const { x, y, z, draai } = METER, c = Math.cos(draai), s = Math.sin(draai);
  // lokale meterassen: lx = diepte (naar achteren is het scherm), ly omhoog, lz dwars; draai om y
  const wereld = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  const rot = [0, draai, 0];
  const huis = [doos(wereld(0, 0, 0), [0.1, 0.13, 0.32], STIJL, rot)];
  const plaat = doos(wereld(-0.052, 0, 0), [0.006, 0.1, 0.29], 0x14161a, rot);
  const cijfers = [];
  const bw = 0.034, bh = 0.064, stap = 0.056, start = -stap * 1.5 - 0.012;
  for (let i = 0; i < METER_CIJFERS; i++) {
    const cz = start + i * stap + (i >= 2 ? 0.024 : 0);
    for (const seg of SEGMENTEN) {
      const d = segmentDoos(i, seg, bh, bw, 0.006);
      cijfers.push(doos(wereld(-0.056 + d.at[0], d.at[1] + 0.006, cz + d.at[2]), d.b, METER_UIT, rot, 1));
    }
  }
  const komma = doos(wereld(-0.056, -bh / 2 + 0.004, start + stap * 1.5 + 0.012), [0.006, 0.012, 0.012], METER_AAN, rot, 1);
  const euro = doos(wereld(-0.056, -0.047, start - 0.036), [0.006, 0.014, 0.03], METER_AAN, rot, 1);
  const strook = doos(wereld(-0.054, 0.056, 0), [0.004, 0.012, 0.22], TAXI_GEEL, rot);
  return { vast: [...huis, plaat, komma, euro, strook], cijfers };
}

// Het stuur: een achthoek van staafjes met een naaf en een stuurkolom, gekanteld naar de chauffeur.
function stuurDelen(cx, cy, cz) {
  const r = 0.19, tilt = 1.0; // tilt: hoeveel de ring achterover helt (rad vanaf verticaal)
  const punten = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    // ring in het vlak met normaal (−cos tilt?): lokaal u = dwars (z), v = langs de helling
    const u = Math.cos(a) * r, v = Math.sin(a) * r;
    punten.push([cx + Math.sin(tilt) * v, cy + Math.cos(tilt) * v, cz + u]);
  }
  const out = [];
  for (let i = 0; i < 8; i++) out.push(staaf(punten[i], punten[(i + 1) % 8], 0.034, RUBBER));
  out.push(staaf(punten[0], punten[4], 0.026, STIJL), staaf(punten[2], punten[6], 0.026, STIJL));
  out.push(doos([cx, cy, cz], [0.09, 0.09, 0.09], STIJL));
  out.push(staaf([cx, cy, cz], [cx + 0.2, cy - 0.26, cz], 0.06, STIJL));
  return out;
}

// De chauffeur: een eenvoudige figuur in een donkerblauwe trui en een pet, met zijn handen aan het stuur. Alles dozen.
function chauffeurDelen(sx, sz, stuur) {
  const out = [];
  const zit = 0.5;
  out.push(doos([sx, zit, sz], [0.5, 0.12, 0.5], STOEL), doos([sx - 0.3, zit + 0.3, sz], [0.1, 0.62, 0.5], STOEL_RUG), doos([sx - 0.34, zit + 0.7, sz], [0.08, 0.2, 0.28], STOEL));
  out.push(doos([sx + 0.03, zit + 0.4, sz], [0.3, 0.55, 0.42], TRUI));                 // romp
  out.push(doos([sx + 0.03, zit + 0.1, sz], [0.3, 0.14, 0.42], BROEK));                // heup
  out.push(doos([sx + 0.02, zit + 0.64, sz], [0.18, 0.05, 0.26], 0xffffff));            // witte boord
  out.push(staaf([sx + 0.2, zit + 0.66, sz - 0.1], [sx + 0.2, zit + 0.1, sz + 0.12], 0.03, 0x1b1d20)); // gordel
  out.push(doos([sx + 0.0, zit + 0.78, sz], [0.2, 0.22, 0.2], HUID));                  // hoofd
  out.push(doos([sx - 0.06, zit + 0.86, sz], [0.1, 0.1, 0.22], 0x5a3a22));               // haar achter de pet
  out.push(doos([sx + 0.11, zit + 0.76, sz + 0.1], [0.05, 0.05, 0.03], 0x1b1d20), doos([sx + 0.11, zit + 0.76, sz - 0.1], [0.05, 0.05, 0.03], 0x1b1d20)); // ogen
  out.push(doos([sx + 0.12, zit + 0.72, sz], [0.06, 0.07, 0.05], 0xc7967a));             // neus
  for (const e of [-1, 1]) out.push(doos([sx - 0.02, zit + 0.76, sz + e * 0.11], [0.04, 0.07, 0.03], 0xc7967a)); // oren
  out.push(doos([sx - 0.02, zit + 0.92, sz], [0.24, 0.07, 0.24], PET), doos([sx + 0.13, zit + 0.9, sz], [0.1, 0.03, 0.2], PET)); // pet met klep
  for (const s of [-1, 1]) {
    const schouder = [sx + 0.0, zit + 0.62, sz + s * 0.22], hand = [stuur[0] + 0.01, stuur[1] + 0.02, sz + s * 0.16];
    out.push(staaf(schouder, [(schouder[0] + hand[0]) / 2 + 0.02, (schouder[1] + hand[1]) / 2 - 0.08, (schouder[2] + hand[2]) / 2], 0.075, TRUI));
    out.push(staaf([(schouder[0] + hand[0]) / 2 + 0.02, (schouder[1] + hand[1]) / 2 - 0.08, (schouder[2] + hand[2]) / 2], hand, 0.07, TRUI));
    out.push(doos(hand, [0.07, 0.07, 0.07], HUID));
    out.push(staaf([sx + 0.1, zit + 0.12, sz + s * 0.12], [sx + 0.5, zit + 0.08, sz + s * 0.14], 0.14, BROEK)); // dijen en onderbenen
    out.push(staaf([sx + 0.5, zit + 0.08, sz + s * 0.14], [sx + 0.55, zit - 0.22, sz + s * 0.14], 0.11, BROEK));
  }
  return out;
}

// De hele cabine van de taxi. Geeft { vast, cijfers, oog }: vast zijn dozen voor het gewone materiaal (groep 0) en
// voor het scherm van de meter (groep 1, de donkere en lichte segmenten staan apart in cijfers).
export function taxiCabine() {
  const D = [];
  const o = TAXI_OOG;
  const V = TAXI_VOORRUIT;
  // vloer en matten
  D.push(doos([-0.3, 0.3, 0], [3.0, 0.04, 1.6], FLOOR), doos([-0.3, 0.325, o.z], [0.8, 0.012, 0.5], RUBBER));
  // dashboard: de bak achter de voorruit, een lage rand voor de passagier, en de bovenkant
  const dikte = V.x0 - 0.7;
  D.push(doos([V.x0 - dikte / 2, 0.64, 0], [dikte, 0.48, 1.56], DASH));
  D.push(doos([V.x0 - dikte / 2 - 0.02, 0.89, 0], [dikte - 0.04, 0.03, 1.56], DASH_TOP));
  D.push(doos([V.x0 - 0.02, 0.905, 0], [0.03, 0.012, 1.56], TAXI_GEEL));  // de gele sierstrook van Gele Gans langs de bak
  // handschoenenkastje voor de passagier en de luchtroosters
  D.push(doos([0.64, 0.75, 0.5], [0.03, 0.2, 0.5], 0x23262b), doos([0.63, 0.9, 0.22], [0.03, 0.06, 0.2], RUBBER), doos([0.63, 0.9, -0.1], [0.03, 0.06, 0.2], RUBBER));
  // instrumentenkap voor de chauffeur
  D.push(doos([0.74, 1.0, -0.42], [0.22, 0.14, 0.42], STIJL));
  // het stuur en de chauffeur
  const stuur = [0.4, 0.98, -0.42];
  D.push(...stuurDelen(stuur[0], stuur[1], stuur[2]));
  D.push(...chauffeurDelen(-0.2, -0.42, stuur));
  // het midden: tunnel, versnellingspook en de handrem
  D.push(doos([-0.1, 0.46, 0], [1.4, 0.26, 0.26], DASH), doos([0.15, 0.7, 0.0], [0.05, 0.3, 0.05], STIJL), doos([0.15, 0.86, 0.0], [0.09, 0.07, 0.07], RUBBER));
  // stoel van de passagier: alleen de zijkant en de rug achter het oog (de camera zit er net voor)
  D.push(doos([-0.4, 0.52, o.z], [0.5, 0.12, 0.5], STOEL), doos([-0.72, 0.82, o.z], [0.1, 0.7, 0.5], STOEL_RUG), doos([-0.76, 1.3, o.z], [0.08, 0.2, 0.28], STOEL));
  // portieren: binnenpaneel tot de raamlijn met armleuning en deurkruk
  for (const s of [-1, 1]) {
    const z = s * 0.86;
    D.push(doos([-0.3, 0.6, z], [2.1, 0.6, 0.06], PANEEL), doos([-0.3, 0.9, z - s * 0.02], [2.1, 0.06, 0.1], STIJL));
    D.push(doos([-0.1, 0.72, z - s * 0.06], [0.5, 0.05, 0.1], STOEL), doos([-0.4, 0.78, z - s * 0.05], [0.12, 0.03, 0.04], KNOP));
  }
  // de stijlen: A (naar de voorruit), B (midden) en C (achter), links en rechts; een dak- en kopstijl
  for (const s of [-1, 1]) {
    D.push(staaf([V.x0, 0.9, s * 0.8], [V.x1, 1.74, s * 0.72], 0.045, STIJL));
    D.push(doos([-0.78, 1.33, s * 0.84], [0.06, 0.8, 0.05], STIJL));                    // B-stijl
    D.push(staaf([-1.42, 0.93, s * 0.76], [-1.58, 1.7, s * 0.66], 0.06, STIJL));        // C-stijl
    D.push(doos([-0.62, 1.73, s * 0.78], [2.1, 0.03, 0.04], STIJL));                    // dakrail
  }
  D.push(doos([V.x1 - 0.0, 1.74, 0], [0.04, 0.04, 1.5], STIJL));                          // kopstijl bovenin de voorruit
  D.push(doos([-1.58, 1.72, 0], [0.05, 0.05, 1.36], STIJL));                              // bovenkant achterruit
  D.push(doos([-1.46, 1.02, 0], [0.4, 0.08, 1.5], PANEEL));                               // hoedenplank onder de achterruit
  // de hemel
  D.push(doos([-0.69, 1.77, 0], [2.04, 0.03, 1.6], HEMEL), doos([-0.5, 1.75, 0.0], [0.24, 0.03, 0.14], 0xf4e6c0));
  // de binnenspiegel, aan de kop van de voorruit
  D.push(doos([V.x1 - 0.04, 1.62, 0.04], [0.03, 0.1, 0.24], STIJL), staaf([V.x1 - 0.01, 1.73, 0.04], [V.x1 - 0.04, 1.66, 0.04], 0.025, KNOP));
  // de achterbank, met twee hoofdsteunen
  D.push(doos([-1.1, 0.52, 0], [0.55, 0.12, 1.4], STOEL), doos([-1.36, 0.85, 0], [0.1, 0.62, 1.4], STOEL_RUG));
  for (const s of [-1, 1]) D.push(doos([-1.38, 1.22, s * 0.38], [0.08, 0.2, 0.3], STOEL));
  // de motorkap voorbij de voorruit, en twee ruitenwissers
  D.push(doos([V.x0 + 0.6, 0.9, 0], [1.2, 0.05, 1.3], TAXI_GEEL), doos([V.x0 + 1.5, 0.78, 0], [0.7, 0.18, 1.1], TAXI_GEEL));
  for (const s of [-1, 1]) D.push(staaf([V.x0 + 0.05, 0.95, s * 0.2], [V.x0 + 0.08, 1.04, s * 0.72], 0.02, RUBBER));
  // buitenspiegels, door de zijruit te zien
  for (const s of [-1, 1]) D.push(staaf([0.5, 0.98, s * 0.88], [0.56, 1.03, s * 1.0], 0.03, STIJL), doos([0.56, 1.06, s * 1.06], [0.05, 0.14, 0.2], TAXI_GEEL));
  const m = meterDelen();
  D.push(...m.vast);
  return { vast: D, cijfers: m.cijfers, oog: o };
}

// ---- zichtlijnen: vult de straat het beeld? ---------------------------------------------------------------

const maak = (rx, ry, rz) => {
  // R = Rx * Ry * Rz (de volgorde van THREE.Euler 'XYZ'): kolommen van de 3x3-matrix
  const [cx, cy, cz] = [Math.cos(rx), Math.cos(ry), Math.cos(rz)], [sx, sy, sz] = [Math.sin(rx), Math.sin(ry), Math.sin(rz)];
  return [
    [cy * cz, -cy * sz, sy],
    [cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy],
    [sx * sz - cx * sy * cz, sx * cz + cx * sy * sz, cx * cy],
  ];
};

// Raakt de straal (o + t d, t > tNear) deze doos? Geeft de afstand of Infinity.
export function straalDoos(o, d, doosDeel, tNear = 0) {
  const R = maak(...(doosDeel.rot || [0, 0, 0]));
  const p = [o[0] - doosDeel.at[0], o[1] - doosDeel.at[1], o[2] - doosDeel.at[2]];
  // naar de lokale assen: R^T * v
  const lok = (v) => [R[0][0] * v[0] + R[1][0] * v[1] + R[2][0] * v[2], R[0][1] * v[0] + R[1][1] * v[1] + R[2][1] * v[2], R[0][2] * v[0] + R[1][2] * v[1] + R[2][2] * v[2]];
  const lo = lok(p), ld = lok(d);
  let t0 = tNear, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    const h = doosDeel.b[i] / 2;
    if (Math.abs(ld[i]) < 1e-9) { if (lo[i] < -h || lo[i] > h) return Infinity; continue; }
    let a = (-h - lo[i]) / ld[i], b = (h - lo[i]) / ld[i];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

// Welk deel van het beeld is open (je ziet de straat en niet de cabine)? De camera kijkt vanuit `oog` met yaw (rad, rechts is
// positief) en pitch (rad) en een vertikale beeldhoek `fov` (graden); aspect = breedte / hoogte. Stappen x stappen stralen door
// het beeld; wat binnen `near` meter voor de lens zit, telt niet (het wordt weggeknipt, zoals de camera dat doet).
export function beeldDekking(delen, oog, { yaw = 0, pitch = 0, fov = 70, aspect = 16 / 9, near = 0.5, stappen = 36 } = {}) {
  const vy = Math.tan((fov * Math.PI) / 360), vx = vy * aspect;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const fw = [cy * cp, sp, sy * cp], rt = [-sy, 0, cy], up = [-cy * sp, cp, -sy * sp];
  let open = 0, n = 0;
  const geraakt = {};
  for (let i = 0; i < stappen * 2; i++) {
    for (let j = 0; j < stappen; j++) {
      const u = ((i + 0.5) / (stappen * 2)) * 2 - 1, v = 1 - ((j + 0.5) / stappen) * 2;
      const d = [fw[0] + rt[0] * u * vx + up[0] * v * vy, fw[1] + rt[1] * u * vx + up[1] * v * vy, fw[2] + rt[2] * u * vx + up[2] * v * vy];
      const l = Math.hypot(...d); d[0] /= l; d[1] /= l; d[2] /= l;
      // clip: alleen wat voorbij het near-vlak ligt (afstand langs de kijkrichting >= near)
      const tNear = near / (d[0] * fw[0] + d[1] * fw[1] + d[2] * fw[2]);
      let best = Infinity, who = -1;
      delen.forEach((dl, k) => { const t = straalDoos([oog.x, oog.y, oog.z], d, dl, tNear); if (t < best) { best = t; who = k; } });
      n++;
      if (best === Infinity) open++; else geraakt[who] = (geraakt[who] || 0) + 1;
    }
  }
  return { open: open / n, geraakt: Object.fromEntries(Object.entries(geraakt).map(([k, c]) => [k, c / n])) };
}

// ---- het treinraam -----------------------------------------------------------------------------------------
// Het kader van een treincoupé, in cameramaten (+x rechts, +y omhoog, de lens kijkt naar -z; de afstand tot het kader is
// KADER_D): een wand met een raam, de raamstijl, een vensterbank met een tafeltje en de rug van de stoel ervoor. Het zit
// op de camera (niet op de trein), want de camera zit bij het raam; wat door het raam valt is de echte polder.
export const KADER_D = 1.0;
const T_WAND = 0xd9d7cf, T_RUBBER = 0x5c616a, T_BANK = 0xb9b6ab, T_STOEL = 0x2f5d8a, T_STOEL_DONKER = 0x233f5d, T_HOUT = 0x8a6a45, T_REK = 0xbfbcb2, T_DONKER = 0x2b2f36;
export const KADER_RAAM = { x0: -0.86, x1: 0.88, y0: -0.36, y1: 0.44 }; // de opening, op afstand KADER_D, bij een beeldhoek van 62 graden

export function treinKaderDelen() {
  const d = -KADER_D, R = KADER_RAAM;
  const rand = 0.045;
  const D = [];
  const vlak = (x0, x1, y0, y1, c, z = d, dik = 0.03) => D.push(doos([(x0 + x1) / 2, (y0 + y1) / 2, z], [x1 - x0, y1 - y0, dik], c));
  const wijd = 2.4, hoog = 1.4; // ruim voorbij het beeld
  // de wand rond het raam
  vlak(-wijd, R.x0, -hoog, hoog, T_WAND);
  vlak(R.x1, wijd, -hoog, hoog, T_WAND);
  vlak(R.x0, R.x1, R.y1, hoog, T_WAND);
  vlak(R.x0, R.x1, -hoog, R.y0, T_WAND);
  // het rubber om het glas
  vlak(R.x0 - 0.02, R.x1 + 0.02, R.y1 - rand, R.y1 + 0.02, T_RUBBER, d + 0.02, 0.04);
  vlak(R.x0 - 0.02, R.x1 + 0.02, R.y0 - 0.02, R.y0 + rand * 0.6, T_RUBBER, d + 0.02, 0.04);
  vlak(R.x0 - 0.02, R.x0 + rand, R.y0, R.y1, T_RUBBER, d + 0.02, 0.04);
  vlak(R.x1 - rand, R.x1 + 0.02, R.y0, R.y1, T_RUBBER, d + 0.02, 0.04);
  // een raamstijl, iets rechts van het midden
  vlak(0.3, 0.3 + 0.07, R.y0, R.y1, T_WAND, d + 0.01, 0.04);
  // het bagagerek langs de bovenkant van de wand
  vlak(-wijd, wijd, R.y1 + 0.1, R.y1 + 0.13, T_REK, d + 0.05, 0.1);
  vlak(-wijd, wijd, R.y1 + 0.13, R.y1 + 0.16, T_DONKER, d + 0.12, 0.02);
  // de vensterbank met een uitstekend tafeltje (een blad dat naar de lens toe uitsteekt)
  D.push(doos([0.0, R.y0 - 0.02, d + 0.16], [wijd * 2, 0.04, 0.34], T_HOUT));
  D.push(doos([0.0, R.y0 - 0.055, d + 0.33], [wijd * 2, 0.07, 0.02], T_DONKER)); // de voorrand van het blad (de dozen staan van ver naar dichtbij: het kader tekent zonder diepte)
  // de rug van de stoel ervoor, links in beeld: een blauwe rug met een hoofdsteun
  D.push(doos([-0.82, -0.2, d + 0.28], [0.5, 0.78, 0.12], T_STOEL));
  D.push(doos([-0.82, 0.24, d + 0.28], [0.3, 0.16, 0.1], T_STOEL_DONKER));
  return D;
}

// ---- de landing op het perron ------------------------------------------------------------------------------

// Een plek op het perron langs het spoor van de aankomst (#926). rijen: de perronrijen van de kaart (map.perrons, zie
// perrons.js: { st, nm, p: [[x, y, halveBreedte, hoogte], ...] }); punt: [x, y] waar de trein stopt; naam: het station dat bij
// de rit hoort (die rijen gaan voor). Geeft { x, y, z, rail: [x, y], rij } of null als er geen perron binnen maxM ligt. De plek is
// het punt van de middellijn van het perron dat het dichtst bij de trein ligt, een halve perronbreedte van de rand af.
export function perronPlek(rijen, punt, { naam = '', maxM = 70 } = {}) {
  if (!Array.isArray(rijen) || !punt || !Number.isFinite(punt[0]) || !Number.isFinite(punt[1])) return null;
  let best = null;
  for (const rij of rijen) {
    const p = rij && Array.isArray(rij.p) ? rij.p : [];
    for (let i = 0; i + 1 < p.length; i++) {
      const [ax, ay, ha, za] = p[i], [bx, by, hb, zb] = p[i + 1];
      if (![ax, ay, bx, by].every(Number.isFinite)) continue;
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      if (l2 < 1e-6) continue;
      const k = Math.max(0, Math.min(1, ((punt[0] - ax) * dx + (punt[1] - ay) * dy) / l2));
      const x = ax + dx * k, y = ay + dy * k, d = Math.hypot(x - punt[0], y - punt[1]);
      if (d > maxM) continue;
      const eigen = naam && rij.st === naam ? -1000 : 0;
      const score = d + eigen;
      if (!best || score < best.score) best = { score, x, y, z: Number.isFinite(za) && Number.isFinite(zb) ? za + (zb - za) * k : (Number.isFinite(za) ? za : 0), hs: Math.max(ha || 0, hb || 0), rij };
    }
  }
  if (!best) return null;
  // een stap vanaf de middellijn naar het spoor toe is gevaarlijk dicht bij de rand; blijf op de middellijn zelf
  return { x: best.x, y: best.y, z: best.z, rail: [punt[0], punt[1]], rij: best.rij.id || null };
}
