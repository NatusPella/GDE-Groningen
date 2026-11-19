// AAA-upgrade van akte 1 (AAA-upgradeplan, M01 tot M06): de pure delen. Geen three.js, geen DOM, dus met een
// test na te spelen (scripts/akte1_aaa_test.mjs). Het tekenen en de runnerhaken staan in akte1_aaa.js.
//
//   M05  finishcamera, podiumsting, "bijna"-regel van de klok
//   M06  korte handelingen: een stap die je ingedrukt houdt, en die nooit mislukt
//
// Samen spelen: alles hier is lokaal beeld of lokale stapstand van wie de stap zelf draait; er gaat niets over het
// net en er wordt niets in de wereld, de beloning of de voortgang geschreven (per speler, #429).

const eindig = (n) => typeof n === 'number' && Number.isFinite(n);
const klem = (v, a, b) => Math.min(b, Math.max(a, v));

// --- M05: de finish ----------------------------------------------------------------------------------------------

export const PODIUM_PLEKKEN = 3;
export const FINISHCAM_SECS = 3.6;

// De sting bij de plek waarop je binnenkomt: de winnaar goud, de tweede zilver, de derde brons; daarna niets
// (de missie mislukt toch al, de sting van mislukken komt vanzelf).
export function finishSting(plek) {
  if (!eindig(plek) || plek < 1 || plek > PODIUM_PLEKKEN) return null;
  return plek === 1 ? 'goud' : plek === 2 ? 'zilver' : 'brons';
}

// De klok loopt bijna af: één keer waarschuwen, niet bij een missie zonder klok en niet als hij al om is.
export function bijnaMoment(timeLeft, alGemeld, grens = 8) {
  return !alGemeld && eindig(timeLeft) && timeLeft > 0 && timeLeft <= grens;
}

// De finishcamera: laag naast de lijn, een stuk voorbij de boog, kijkend naar wie er aankomt. `finish` is { x, y, a }
// (a is de rijrichting), `focus` is waar de speler nu is, `t` de tijd sinds het begin van de opname. Geeft een
// camerapose { position: { x, y, z }, lookAt: { x, y, z }, fov } met x en y in kaartmaten en z als hoogte; altijd
// eindige getallen, ook bij een kapotte invoer (dan null, en de gewone camera blijft).
export function finishPose(finish, focus, t = 0, { zij = 7.5, voorbij = 7, hoogte = 1.5 } = {}) {
  if (!finish || !eindig(finish.x) || !eindig(finish.y) || !focus || !eindig(focus.x) || !eindig(focus.y)) return null;
  const a = eindig(finish.a) ? finish.a : 0;
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const tt = eindig(t) ? Math.max(0, t) : 0;
  // de camera zakt heel langzaam mee en schuift een halve meter per seconde van de lijn: levend, niet vastgeklikt
  const cx = finish.x + ux * (voorbij + tt * 0.5) + nx * zij;
  const cy = finish.y + uy * (voorbij + tt * 0.5) + ny * zij;
  return {
    position: { x: cx, y: cy, z: hoogte },
    lookAt: { x: focus.x, y: focus.y, z: 1.1 },
    fov: klem(52 - tt * 2, 38, 52),
  };
}

// --- M06: korte handelingen --------------------------------------------------------------------------------------

// De stroomkast, het slot en de vitrine van het museum waren tikspellen met een naald, pinnen en een draaischijf die
// konden mislukken. Als stap met `kort: { time }` zijn het nu korte handelingen: houd E ingedrukt bij de prop, de
// voortgang loopt en de figuur naast je doet mee. Het kan niet mislukken: wie wegloopt of loslaat verliest
// langzaam een deel van de voortgang, nooit alles, en nooit de stap. Het kost geen argwaan door tikken die missen
// (die zijn er niet meer); de bewakers blijven de enige tegenstander.
export const KORT_STANDAARD = { fuse: 3.2, lock: 3.0, crack: 4.2 };
export const KORT_ZAKKEN = 0.35; // deel van de snelheid waarmee de voortgang terugloopt bij loslaten
export const KORT_VLOER = 0.5;   // zo ver blijft de voortgang minstens staan na het eerste halve werk

export function kortTijd(st) {
  const k = st && st.kort;
  if (!k) return 0;
  const t = eindig(k.time) ? k.time : KORT_STANDAARD[st.kind] || 3;
  return klem(t, 1, 8);
}

export function maakKort(st) {
  const tijd = kortTijd(st);
  return tijd > 0 ? { tijd, voortgang: 0, klaar: false, sec: 0, hoogste: 0 } : null;
}

// Eén tik. `binnen`: staat de speler bij de prop; `vast`: houdt hij E in. Geeft de staat terug (gewijzigd).
export function tikKort(k, dt, { binnen = false, vast = false } = {}) {
  if (!k || k.klaar) return k;
  const d = eindig(dt) && dt > 0 ? Math.min(dt, 0.25) : 0;
  k.sec += d;
  if (binnen && vast) k.voortgang += d / k.tijd;
  else {
    // wie loslaat of weg is zakt terug, maar nooit onder de helft van wat hij al had
    const ondergrens = k.hoogste >= KORT_VLOER ? k.hoogste * KORT_VLOER : 0;
    k.voortgang = Math.max(ondergrens, k.voortgang - (d / k.tijd) * KORT_ZAKKEN);
  }
  k.voortgang = klem(k.voortgang, 0, 1);
  k.hoogste = Math.max(k.hoogste, k.voortgang);
  if (k.voortgang >= 1) k.klaar = true;
  return k;
}

// De prompt boven de prop: de toets, de voortgang als ring (missionPrompt, zoals de rolstap in heist.js).
export function kortPrompt(st, k, plek) {
  if (!k || !plek || !eindig(plek.x) || !eindig(plek.y)) return null;
  const werk = st.kind === 'fuse' ? 'De stroomkast' : st.kind === 'lock' ? 'Het slot' : 'De vitrine';
  return {
    id: 'kort-' + st.kind, x: plek.x, y: plek.y, h: 2.2, key: 'E', ring: true,
    label: k.voortgang > 0 ? `${werk}: ${Math.round(k.voortgang * 100)}%` : `Houd E ingedrukt: ${werk.toLowerCase()}`,
    sub: 'Rustig, het kan niet misgaan',
    cooldown: Math.max(0.001, 1 - k.voortgang), // de ring loopt vol terwijl je werkt (prompts.js)
  };
}

// --- M03: de wachtrij in de hal van het Loket ------------------------------------------------------------------------

// Zes mensen in de rij, in de lokale maten van de set (u langs de hal, v dwars; de speler staat op u = -0,8 en kijkt
// naar +u, de loketten staan op u = 3,6). Vier staan voor je, twee achter je; ze staan binnen de touwen van de
// rij (|v| < 1,9) en niet in elkaar. `anim` is de idle van actoranim.js; de ritmes verschillen per figuur, zodat de rij
// niet in de maat beweegt (wachten, op het scherm kijken, de telefoon, de handen in de zij).
export const LOKET_SPELER_U = -0.8;
export function loketRij() {
  const rij = [
    { u: 0.25, v: 0.5, face: 0.15, shirt: 0x6a3a3a, skin: 0xd9a06e, seed: 9101, variant: 'male', cyc: ['idle', 'look', 'idle'], tempo: 0.55, fase: 0.3 },
    { u: 1.1, v: -0.45, face: -0.1, shirt: 0x3a5a6a, skin: 0xf1c9a5, seed: 9102, variant: 'female', cyc: ['phone', 'idle'], tempo: 0.7, fase: 1.4 },
    { u: 1.95, v: 0.4, face: 0.05, shirt: 0x5a5a3a, skin: 0xa9744a, seed: 9103, variant: 'male', cyc: ['hips', 'idle', 'look'], tempo: 0.45, fase: 2.2 },
    { u: 2.8, v: -0.35, face: 0, shirt: 0x7a4a6a, skin: 0xf1c9a5, seed: 9104, variant: 'female', cyc: ['idle', 'talk'], tempo: 0.6, fase: 0.9 },
    { u: -1.9, v: 0.35, face: 0.1, shirt: 0x3a6a4a, skin: 0xd9a06e, seed: 9105, variant: 'male', cyc: ['look', 'idle', 'phone'], tempo: 0.5, fase: 3.1 },
    { u: -2.8, v: -0.4, face: -0.05, shirt: 0x8a6a2a, skin: 0x7a4e2e, seed: 9106, variant: 'female', cyc: ['idle', 'hips'], tempo: 0.65, fase: 1.9 },
  ];
  return rij.map((q) => ({ ...q, cyc: [...q.cyc] }));
}

// De animatie van figuur q op tijd t (puur): de cyclus loopt rond, per figuur met eigen tempo en fase.
export function loketRijAnim(q, t) {
  const c = q && q.cyc;
  if (!c || !c.length) return 'idle';
  const tt = eindig(t) ? t : 0;
  const i = Math.floor(Math.abs(tt * q.tempo * 0.5 + q.fase)) % c.length;
  return c[i];
}
