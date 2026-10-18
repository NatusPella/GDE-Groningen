// Vrachtwagen met oplegger: pure logica (geen THREE, geen DOM). De koppeling zit
// op het hulpstuk van de trekker (kingpin), de oplegger scharniert daar omheen en
// zijn as volgt de trekker zoals een echte oplegger: stabiel vooruit, onhandig
// achteruit. Gebruikt door sidejob_vracht.js; de tests staan in
// scripts/semitrailer_test.mjs.

export const TRAILER_KINDS = {
  koel: { name: 'Koeloplegger', len: 12.8, wid: 2.55, axle: 9.2, mass: 1, color: '#dfe6ea' },
  zeil: { name: 'Zeilenoplegger', len: 13.6, wid: 2.55, axle: 10.0, mass: 1.2, color: '#3e6f9e' },
  bak: { name: 'Kipper', len: 9.5, wid: 2.5, axle: 6.4, mass: 1.4, color: '#c9a53a' },
};

export const COUPLE_R = 1.6;          // m: hoe dicht de trekker bij het hulpstuk moet zijn
export const COUPLE_ANGLE = 0.45;     // rad: maximaal verschil in koers bij het koppelen
export const JACKKNIFE_ANGLE = 1.4;   // rad: daarna staat de oplegger dwars

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Het koppelpunt van de trekker ligt `kpBack` meter achter zijn midden.
export function fifthWheel(tractor, kpBack = 1.6) {
  return { x: tractor.x - Math.cos(tractor.angle) * kpBack, y: tractor.y - Math.sin(tractor.angle) * kpBack };
}

// Een losse oplegger staat op zijn steunpoten; het hulpstuk zit voorin.
export function newTrailer(kind, x, y, angle) {
  const k = TRAILER_KINDS[kind] || TRAILER_KINDS.koel;
  return { kind, spec: k, angle, kx: x, ky: y, coupled: false, jackknifed: false, load: 0 };
}

export function kingpin(tr) { return { x: tr.kx, y: tr.ky }; }

export function canCouple(tractor, tr, kpBack = 1.6) {
  if (tr.coupled) return false;
  const fw = fifthWheel(tractor, kpBack);
  if (Math.hypot(fw.x - tr.kx, fw.y - tr.ky) > COUPLE_R) return false;
  return Math.abs(wrap(tractor.angle - tr.angle)) < COUPLE_ANGLE;
}

export function couple(tractor, tr, kpBack = 1.6) {
  if (!canCouple(tractor, tr, kpBack)) return false;
  tr.coupled = true;
  return true;
}

export function uncouple(tr) {
  tr.coupled = false;
  tr.jackknifed = false;
}

// Eén stap. `vel` is de snelheid van het koppelpunt in wereldcoördinaten.
// De oplegger-as mag alleen langs de oplegger zelf bewegen: theta' = v_dwars / L.
export function stepTrailer(tr, tractor, dt, kpBack = 1.6) {
  if (!tr.coupled) return tr;
  const fw = fifthWheel(tractor, kpBack);
  const vx = (fw.x - tr.kx) / dt, vy = (fw.y - tr.ky) / dt;
  tr.kx = fw.x; tr.ky = fw.y;
  const L = tr.spec.axle;
  const lateral = -Math.sin(tr.angle) * vx + Math.cos(tr.angle) * vy;
  tr.angle = wrap(tr.angle + (lateral / L) * dt);
  const rel = wrap(tractor.angle - tr.angle);
  tr.jackknifed = Math.abs(rel) > JACKKNIFE_ANGLE;
  if (tr.jackknifed) tr.angle = wrap(tractor.angle - Math.sign(rel) * JACKKNIFE_ANGLE);
  return tr;
}


// Hoek tussen trekker en oplegger, positief als de oplegger naar links uitzwaait.
export function hitchAngle(tractor, tr) { return wrap(tractor.angle - tr.angle); }

// Stuur de bak van de oplegger langs een punt: past de achterkant in de bocht?
// Teruggegeven: hoeveel meter de achteras binnen de bocht van de trekker snijdt.
export function offtracking(radius, axle) {
  if (radius <= axle) return radius;
  return radius - Math.sqrt(radius * radius - axle * axle);
}

// Massa-effect: een zware oplegger remt en trekt traag op.
export function loadedHandling(tr, base) {
  const m = 1 + (tr.coupled ? tr.spec.mass * (0.35 + 0.65 * tr.load) : 0);
  return { maxSpeed: base.maxSpeed * (tr.coupled ? 0.92 : 1), accel: base.accel / m, brake: base.brake / Math.sqrt(m), turnRate: base.turnRate / Math.sqrt(m) };
}

// Koppelhulp voor het bord: hoe ver en hoe scheef staat de trekker nog van het hulpstuk?
// `achter` is de afstand langs de koers van de trekker (positief: het hulpstuk ligt erachter),
// `opzij` de zijwaartse afwijking (positief: links van de trekker), `hoek` het koersverschil in graden.
export function koppelHulp(tractor, tr, kpBack = 1.6) {
  const fw = fifthWheel(tractor, kpBack);
  const dx = tr.kx - fw.x, dy = tr.ky - fw.y;
  const c = Math.cos(tractor.angle), s = Math.sin(tractor.angle);
  const achter = -(dx * c + dy * s), opzij = -dx * s + dy * c;
  const hoek = Math.round(wrap(tractor.angle - tr.angle) * 180 / Math.PI);
  const dist = Math.hypot(dx, dy);
  const ok = canCouple(tractor, tr, kpBack);
  let tip = 'Rustig achteruit';
  if (ok) tip = 'Stop: hij klikt vast';
  else if (achter < -COUPLE_R) tip = 'Je bent er voorbij, rij naar voren';
  else if (Math.abs(hoek) > COUPLE_ANGLE * 57.3) tip = `Zet de wagen recht (${hoek > 0 ? 'oplegger staat links' : 'oplegger staat rechts'})`;
  else if (Math.abs(opzij) > 0.8 && achter > 2) tip = opzij > 0 ? 'Stuur naar links' : 'Stuur naar rechts';
  return { dist, achter, opzij, hoek, ok, tip };
}
