// De proefspeler (Spelbot --mens): de pure regels die de bot op een mens laten lijken en wat hij 'ziet'.
// Geen Electron, geen DOM: run.mjs geeft dit bestand als window.__botMens aan bot.page.js (zoals nav.mjs),
// scripts/mens_test.mjs test het droog. Alles is seed-gestuurd: dezelfde seed geeft dezelfde run.
//   - reactietijd: een nieuwe situatie (ander doel, gesprek, einde filmpje) krijgt 250 tot 400 ms voordat de bot reageert
//   - stuur- en richtruis: een langzaam wandelende afwijking (geen witte ruis), op het stuur in een voertuig en op de looprichting te voet
//   - pogingen: hoeveel keer een mens dezelfde missie probeert voordat hij opgeeft (geen cheat als uitweg)
//   - waarneming: waar het doelwaypoint op het scherm valt en of er een gebouw voor staat (camera-wiskunde)
//   - vastzitten: de spreiding van de positie over een tijdvenster

export const MENS = {
  reactieMin: 250, reactieMax: 400,   // ms speltijd tussen het zien en het doen
  stuurSigma: 0.07,                   // standaardafwijking van het stuur (-1..1) in een voertuig
  richtSigma: 0.06,                   // idem, in radialen, voor de looprichting
  ruisTau: 1.4,                       // seconden waarover de ruis 'onthoudt' (hoe langzamer, hoe meer een hand lijkt)
  pogingen: 3,                        // zo vaak probeert een mens een missie, daarna geeft hij op
  stilVenster: 10, stilSd: 0.6,       // zo lang en zo weinig beweging = stilstand (m)
  oogMinGap: 4,                       // seconden speltijd tussen twee oogmomenten van dezelfde reden
};

// mulberry32: klein, snel en seed-gestuurd (botlogic.seededRandom kan hier niet: dit bestand is zelfstandig)
export function rng(seed = 1) {
  let a = (Number(seed) || 1) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// een normaalverdeling uit twee gelijkmatige trekkingen (Box-Muller)
export function gauss(r) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// reactietijd in ms: tussen min en max, vaker in het midden dan aan de randen (gemiddelde van twee trekkingen)
export function reactieMs(r, { reactieMin = MENS.reactieMin, reactieMax = MENS.reactieMax } = {}) {
  return Math.round(reactieMin + (reactieMax - reactieMin) * (r() + r()) / 2);
}

// Ornstein-Uhlenbeck: een afwijking die naar nul trekt en onderweg wandelt. `stap(dt)` in seconden.
export class Ruis {
  constructor(r, sigma = 0.07, tau = MENS.ruisTau) { this.r = r; this.sigma = sigma; this.tau = tau; this.x = 0; }
  stap(dt = 0.1) {
    const a = Math.exp(-Math.max(0, dt) / this.tau);
    this.x = this.x * a + this.sigma * Math.sqrt(1 - a * a) * gauss(this.r);
    return this.x;
  }
}

// De stick die de bot wil zetten wordt de stick die een mens zou zetten. In een voertuig is x het stuur: optellen.
// Te voet is (x, y) een richting: draaien over de richtingruis. Stilstaan (0, 0) blijft stilstaan.
export function ruisStick(x, y, { voertuig = false, stuurRuis = 0, richtRuis = 0 } = {}) {
  if (Math.abs(x) < 0.02 && Math.abs(y) < 0.02) return [x, y];
  if (voertuig) return [Math.max(-1, Math.min(1, x + stuurRuis)), y];
  const c = Math.cos(richtRuis), s = Math.sin(richtRuis);
  return [x * c - y * s, x * s + y * c];   // een draaiing behoudt de lengte
}

// Het profiel van één run: alles wat de pagina nodig heeft, uit één seed.
export function mensProfiel(seed = 1, opts = {}) {
  const o = { ...MENS, ...opts };
  const r = rng(seed * 7919 + 17);
  const stuur = new Ruis(rng(seed * 104729 + 3), o.stuurSigma, o.ruisTau);
  const richt = new Ruis(rng(seed * 1299709 + 5), o.richtSigma, o.ruisTau);
  return {
    seed, opts: o,
    reactie: () => reactieMs(r, o),
    stick: (x, y, voertuig, dt = 0.1) => ruisStick(x, y, { voertuig, stuurRuis: stuur.stap(dt), richtRuis: richt.stap(dt) }),
    pogingen: o.pogingen,
  };
}

// Is er een nieuwe situatie waar een mens eerst even naar kijkt? De pagina geeft een handtekening; verandert die, dan wacht de bot de reactietijd.
// Niet de dialoogtekst zelf: die wordt letter voor letter getypt en zou elke tik 'nieuw' zijn.
export function situatieSleutel(s) {
  const b = s.blocking || {};
  return [
    s.story && s.story.id, s.mission && s.mission.active, s.mission && s.mission.stage,
    s.target ? s.target.name : '', b.cinematic ? 'c' : '', b.talk ? 't' : '', b.banner ? 'b' : '', b.dialog ? 'd' + ((b.dialog.options || []).length) : '', b.respawn ? 'r' : '',
  ].join('|');
}

// Een pogingen-budget: de bot geeft op als de missie vaker mislukt dan een mens zou willen proberen.
export function pogingenOp(mislukt, max = MENS.pogingen) { return mislukt >= max; }

// --- waarneming: camera-wiskunde ------------------------------------------------------------------------------

// Camerabasis uit de wereldmatrix van een three-camera (kolommen: rechts, boven, achter, plek). Three-ruimte: X = x, Y = z (omhoog), Z = y.
export function cameraUitMatrix(e, fovV = 60, aspect = 16 / 9) {
  if (!e || e.length < 16) return null;
  return { pos: [e[12], e[13], e[14]], right: [e[0], e[1], e[2]], up: [e[4], e[5], e[6]], fwd: [-e[8], -e[9], -e[10]], fovV, aspect };
}

// Camera die naar een punt kijkt (voor tests en voor filmpjes met een lookAt-pose); wereldcoördinaten x, y, z (z omhoog).
export function cameraKijkt(pos, lookAt, fovV = 60, aspect = 16 / 9) {
  const P = [pos.x, pos.z || 0, pos.y];
  let f = [lookAt.x - pos.x, (lookAt.z || 0) - (pos.z || 0), lookAt.y - pos.y];
  const fl = Math.hypot(...f) || 1; f = f.map((v) => v / fl);
  let r = [-f[2], 0, f[0]]; const rl = Math.hypot(...r) || 1; r = r.map((v) => v / rl);
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  return { pos: P, right: r, up: u, fwd: f, fovV, aspect };
}

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Een wereldpunt (x, y, z omhoog) naar schermcoördinaten -1..1 (y omhoog); null als het achter de camera ligt.
export function projecteer(cam, p) {
  const v = [p.x - cam.pos[0], (p.z || 0) - cam.pos[1], p.y - cam.pos[2]];
  const zc = dot3(v, cam.fwd);
  if (zc < 0.1) return null;
  const th = Math.tan((cam.fovV * Math.PI) / 360);
  return { sx: dot3(v, cam.right) / (zc * th * cam.aspect), sy: dot3(v, cam.up) / (zc * th), diepte: zc };
}

// Wat een gebouw tussen camera en doel is: tast de lijn af met `hoogteAt(x, y)` (hoogte van het gebouw daar, of null). Een gebouw telt
// alleen als de lijn op dat punt lager loopt dan zijn dak. Benadering: stap van 2 m, dak = opgegeven hoogte.
export function afdekking(camPos, doel, hoogteAt, { stap = 2, rand = 1.5 } = {}) {
  const ax = camPos[0], az = camPos[1], ay = camPos[2];   // three: X, Y(omhoog), Z
  const bx = doel.x, by = doel.y, bz = doel.z || 1.2;
  const d = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(d / stap));
  for (let k = 1; k < n; k++) {
    const u = k / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, z = az + (bz - az) * u;
    if (Math.hypot(bx - x, by - y) < rand) break;   // vlak bij het doel: een gebouw waar het doel in staat telt niet
    const h = hoogteAt(x, y);
    if (h != null && z < h) return { afgedekt: true, x: Math.round(x), y: Math.round(y), hoogte: Math.round(h) };
  }
  return { afgedekt: false };
}

// Zie ik het doel? opScherm: binnen het beeld (met een kleine rand), voorCamera: niet erachter, afgedekt: een gebouw ervoor.
export function doelZichtbaarheid(cam, doel, { hoogteAt = null, rand = 0.96 } = {}) {
  if (!cam || !doel || !Number.isFinite(doel.x) || !Number.isFinite(doel.y)) return { bekend: false };
  const p = projecteer(cam, doel);
  if (!p) return { bekend: true, voorCamera: false, opScherm: false, zichtbaar: false, reden: 'achter de camera' };
  const opScherm = Math.abs(p.sx) <= rand && Math.abs(p.sy) <= rand;
  const af = opScherm && hoogteAt ? afdekking(cam.pos, doel, hoogteAt) : { afgedekt: false };
  const r1 = (v) => Math.round(v * 100) / 100;
  return {
    bekend: true, voorCamera: true, opScherm, afgedekt: af.afgedekt, zichtbaar: opScherm && !af.afgedekt,
    sx: r1(p.sx), sy: r1(p.sy), diepte: Math.round(p.diepte),
    reden: !opScherm ? (p.sx < -rand ? 'links buiten beeld' : p.sx > rand ? 'rechts buiten beeld' : p.sy > rand ? 'boven buiten beeld' : 'onder buiten beeld') : af.afgedekt ? `gebouw ervoor (${af.x}, ${af.y})` : 'in beeld',
  };
}

// --- vastzitten en prompts -------------------------------------------------------------------------------------

// Spreiding van de positie (standaardafwijking van de afstand tot het zwaartepunt) over de laatste `venster` seconden.
// samples: [{ t, x, y }]; geeft { sd, spanS, stil } of null als de reeks het venster nog niet vult.
export function bewegingsSpreiding(samples, venster = MENS.stilVenster, drempel = MENS.stilSd) {
  if (!samples || samples.length < 3) return null;
  const eind = samples[samples.length - 1].t;
  const w = samples.filter((q) => eind - q.t <= venster);
  const spanS = w[w.length - 1].t - w[0].t;
  if (w.length < 3 || spanS < venster * 0.8) return null;
  const cx = w.reduce((a, q) => a + q.x, 0) / w.length, cy = w.reduce((a, q) => a + q.y, 0) / w.length;
  const sd = Math.sqrt(w.reduce((a, q) => a + (q.x - cx) ** 2 + (q.y - cy) ** 2, 0) / w.length);
  return { sd: Math.round(sd * 100) / 100, spanS: Math.round(spanS * 10) / 10, stil: sd < drempel };
}

// Hoe lang een tekst (prompt, uitlegkaart) al in beeld staat: `zie(t, tekst)` per tick, geeft de seconden sinds de tekst verscheen.
export class TekstDuur {
  constructor() { this.tekst = ''; this.sinds = 0; }
  zie(t, tekst) {
    const x = String(tekst || '').trim();
    if (x !== this.tekst) { this.tekst = x; this.sinds = t; }
    return x ? Math.round((t - this.sinds) * 10) / 10 : 0;
  }
}

// Een oogmoment mag niet elke tick: per reden hooguit om de `gap` seconden speltijd.
export class OogRem {
  constructor(gap = MENS.oogMinGap) { this.gap = gap; this.laatste = {}; }
  mag(reden, t, { dwing = false } = {}) {
    if (!dwing && this.laatste[reden] != null && t - this.laatste[reden] < this.gap) return false;
    this.laatste[reden] = t;
    return true;
  }
}

// De gestructureerde momentopname van een oogmoment (wat de bot 'ziet'), uit de bot-status plus de metingen van de pagina.
export function bouwOogMoment({ reden, naam = '', s, zicht = null, frameMs = null, kaartTekst = '', kaartS = 0, spreiding = null, stilS = 0, shot = '' }) {
  const v = s.player && s.player.vehicle;
  const sub = s.hud && s.hud.subtitle;
  const dlg = s.blocking && s.blocking.dialog;
  return {
    reden, naam, shot,
    stap: (s.story && s.story.id) || '', fase: (s.mission && s.mission.stage) || '', missieActief: !!(s.mission && s.mission.active),
    doelTekst: (s.hud && s.hud.objective) || (s.mission && s.mission.label) || '',
    doelNaam: s.target ? s.target.name || '' : '',
    afstand: s.target ? s.target.distance : null,
    zicht: zicht || { bekend: false },
    ondertitel: sub ? `${sub.speaker ? sub.speaker + ': ' : ''}${sub.text}` : '',
    dialoog: dlg ? { tekst: dlg.text, opties: (dlg.options || []).map((o) => o.label) } : null,
    berichten: ((s.hud && s.hud.messages) || []).slice(0, 3),
    kaart: kaartTekst ? { tekst: kaartTekst, zichtbaarS: kaartS } : null,
    voertuig: v ? { soort: v.kind, gezondheid: v.health, snelheid: v.speed } : null,
    gezondheid: s.player.health,
    snelheid: v ? v.speed : null,
    frameMs: frameMs == null ? null : Math.round(frameMs * 10) / 10,
    gezocht: s.wanted || 0,
    geld: s.player.money, mislukt: (s.story && s.story.fails) || 0,
    plek: [s.player.x, s.player.y],
    spreiding, stilS: Math.round(stilS * 10) / 10,
    filmpje: !!(s.blocking && s.blocking.cinematic), tijd: s.t,
  };
}
