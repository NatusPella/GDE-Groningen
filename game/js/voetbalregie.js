// De tv-regie van de voetbalwedstrijd (epic voetbal-uitzending, 21-11): puur, geen THREE en geen DOM (scripts/voetbal_uitzending_test.mjs). Welke camera past bij dit moment (zijlijn-breed, hoog, doelcamera,
// speler, viering, hoekschop), en de opname voor de herhaling na een doelpunt of een grote kans. De posities zijn veldcoördinaten (x dwars, y in de lengte, z hoogte); voetbal.js zet ze om naar de
// wereld (toWorld). Vormtaal volgens docs/CUTSCENE-REGIE-21-11.md (een shot heeft een functie; geen camerawissel zonder reden), maar de wedstrijd blijft bestuurbaar: in de standaardstand
// (`auto`) wisselt de camera alleen bij een dode bal (aftrap, doelpunt, strafschop, hoekschop, kaart, rust, einde); `speler` wisselt nooit; `tv` is de volledige uitzending met ook een schotcamera.
import { PITCH, kl } from './voetbalrules.js';

export const CAMERA_MODI = ['auto', 'speler', 'tv', 'hoog'];
export const MODE_NAMES = { auto: 'Regie: automatisch', speler: 'Camera: achter je speler', tv: 'Regie: tv-uitzending', hoog: 'Camera: hoog' };
export const cleanModus = (m) => (CAMERA_MODI.includes(m) ? m : 'auto');
export const nextMode = (m) => CAMERA_MODI[(CAMERA_MODI.indexOf(cleanModus(m)) + 1) % CAMERA_MODI.length];
export const SHOTS = ['speler', 'hoog', 'zijlijn', 'breed', 'doel', 'viering', 'hoek', 'kaart'];
const GOAL_S = 3.2;                      // zoals voetbalmatch.js (de duur van de fase 'goal')
const schaal = (sim) => (sim.formaat === 'groot' ? 1.55 : 1);

export function makeRegie({ modus = 'auto' } = {}) {
  return { modus: cleanModus(modus), shot: 'speler', sinds: 99, hold: 0, forced: null, extra: {}, scorer: -1, t: 0 };
}

// Welk shot nu? Geeft { shot, cut } (cut: het shot is net gewisseld, dus een harde snit en geen zachte beweging).
export function regieTik(r, sim, evs = [], dt = 0) {
  r.t += dt; r.sinds += dt; r.hold = Math.max(0, r.hold - dt);
  const smartCam = r.modus === 'auto', tv = r.modus === 'tv', knip = smartCam || tv;
  const b = sim.bal;
  for (const e of evs) {
    if (e.type === 'goal') r.scorer = e.speler;
    else if (knip && e.type === 'kaart') { r.forced = 'kaart'; r.hold = 2.2; r.extra = { speler: e.speler }; }
    else if (tv && e.type === 'schop' && e.soort === 'schot' && e.sterkte > 0.55 && Math.abs(b.y) > PITCH.L * 0.2) { r.forced = 'doel'; r.hold = 1.6; r.extra = {}; }
  }
  let wens = r.modus === 'tv' ? 'zijlijn' : r.modus === 'hoog' ? 'hoog' : 'speler';
  const f = sim.fase;
  if (f === 'intro' || f === 'rust' || f === 'eind' || f === 'klaar') wens = 'breed';
  else if (f === 'goal' && knip) {
    const sinds = GOAL_S - (sim.faseT || 0);
    wens = sinds < 1.6 ? 'doel' : 'viering';
  } else if ((f === 'hervat' || f === 'aftrap') && knip && sim.hervat) {
    const k = sim.hervat.kind;
    if (k === 'strafschop') wens = 'doel';
    else if (k === 'hoek') wens = 'hoek';
    else if (k === 'vrij' && Math.abs(b.y) > PITCH.L * 0.3) wens = 'doel';
    else if (k === 'aftrap' && tv) wens = 'zijlijn';
  } else if (r.hold > 0 && r.forced) wens = r.forced;
  if (r.hold <= 0) r.forced = null;
  const cut = wens !== r.shot;
  if (cut) { r.shot = wens; r.sinds = 0; }
  return { shot: r.shot, cut };
}

// De camera voor een shot: { pos: {x,y,z}, at: {x,y,z}, fov } in veldcoördinaten. eigenId: de speler die jij bestuurt (of -1); extra: { speler } voor viering en kaart.
export function cameraVoor(shot, sim, eigenId = -1, t = 0, extra = {}) {
  // derby (#1114): wie in team 1 speelt valt aan naar de andere kant; zijn eigen shots (achter de speler, hoog) draaien het veld een halve slag (bal en spelers gespiegeld door het midden),
  // zodat ook hij naar boven in beeld aanvalt. De tv-shots (zijlijn, breed, doel, hoek) blijven gewoon.
  if (extra && extra.team1 && (shot === 'speler' || shot === 'hoog')) {
    const m = (q) => ({ ...q, x: -q.x, y: -q.y });
    const r = cameraVoor(shot, { ...sim, bal: m(sim.bal), spelers: sim.spelers.map(m) }, eigenId, t, { ...extra, team1: false });
    return { ...r, pos: m(r.pos), at: m(r.at) };
  }
  const sc = schaal(sim), b = sim.bal, me = eigenId >= 0 ? sim.spelers[eigenId] : null;
  const H = PITCH.L / 2, W = PITCH.B / 2, sgn = (v) => (v < 0 ? -1 : 1);
  const groot = sim.formaat === 'groot';
  if (shot === 'hoog') return { pos: { x: b.x * 0.4, y: kl(b.y - 12 * sc, -H - 8 * sc, H - 6 * sc), z: 30 * sc }, at: { x: b.x * 0.6, y: kl(b.y + 4 * sc, -H, H), z: 0 }, fov: 56 };
  if (shot === 'zijlijn') return { pos: { x: W + 15 * sc, y: kl(b.y * 0.85, -(H - 10 * sc), H - 10 * sc), z: 9.5 * sc }, at: { x: b.x * 0.3, y: b.y * 0.95, z: 0.8 }, fov: 50 };
  if (shot === 'breed') return { pos: { x: W + 24 * sc, y: Math.sin(t * 0.18) * H * 0.18, z: 17 * sc }, at: { x: 0, y: 0, z: 0 }, fov: 54 };
  if (shot === 'doel') { const s = sgn(b.y || 1); return { pos: { x: kl(b.x * 0.3, -4, 4), y: s * (H + 4.5 * (groot ? 1.3 : 1)), z: 2.7 }, at: { x: b.x * 0.55, y: b.y, z: 0.9 }, fov: 48 }; }
  if (shot === 'hoek') { const sx = sgn(b.x || 1), sy = sgn(b.y || 1); return { pos: { x: sx * (W + 5 * sc), y: sy * (H + 7 * sc), z: 4.2 }, at: { x: 0, y: sy * (H - PITCH.STRAF_D * 0.8), z: 1.2 }, fov: 52 }; }
  if (shot === 'viering' || shot === 'kaart') {
    const p = sim.spelers[extra.speler != null && extra.speler >= 0 ? extra.speler : (me ? me.id : 0)] || sim.spelers[0];
    const kant = p.x >= 0 ? -1 : 1, voor = p.y >= 0 ? -1 : 1;                        // de camera staat aan de kant van het midden en kijkt naar de speler
    return { pos: { x: p.x + kant * 3.4, y: p.y + voor * 5.2, z: 2.1 }, at: { x: p.x, y: p.y, z: 1.35 }, fov: 40 };
  }
  // 'speler': achter je speler en de bal (de bestaande wedstrijdcamera)
  const fx = me ? b.x * 0.7 + me.x * 0.3 : b.x, fy = me ? b.y * 0.8 + me.y * 0.2 : b.y;
  return { pos: { x: kl(fx * 0.55, -7 * sc, 7 * sc), y: kl(fy - 15 * sc, -H - 8 * sc, H - 7 * sc), z: 16 * sc }, at: { x: kl(fx * 0.9, -W, W), y: kl(fy + 2.5 * sc, -H, H), z: 0.5 }, fov: groot ? 62 : 58 };
}

// ---------------------------------------------------------------- de opname voor de herhaling

const OPNAME_HZ = 15;
const OPNAME_MAX_S = 12;
export function makeOpname() { return { frames: [], acc: 0, t: 0, n: 0 }; }
const flags = (p) => (p.duikT > 0 ? 1 : 0) | (p.tackleT > 0 ? 2 : 0) | (p.stun > 0 ? 4 : 0) | (p.vier > 0 ? 8 : 0);
export function opnameTik(op, sim, dt) {
  op.t += dt; op.acc += dt;
  if (op.acc < 1 / OPNAME_HZ) return;
  op.acc = 0;
  const p = [];
  for (const s of sim.spelers) p.push(s.x, s.y, s.face, s.speed || 0, flags(s));
  op.frames.push({ t: op.t, b: [sim.bal.x, sim.bal.y, sim.bal.z || 0], p });
  op.n++;
  const min = op.t - OPNAME_MAX_S;
  while (op.frames.length && op.frames[0].t < min) op.frames.shift();
}
// Een stuk van de opname als herhaling: van de tijd `van` tot `tot` (de opnameklok, op.t).
export function opnameClip(op, van, tot) {
  const frames = op.frames.filter((f) => f.t >= van && f.t <= tot);
  return frames.length >= 2 ? { frames, duur: frames[frames.length - 1].t - frames[0].t, t0: frames[0].t } : null;
}
const hoekMix = (a, b, k) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };
// Het beeld op tijd t (0 tot duur) van de clip, tussen twee frames in.
export function clipFrame(clip, t) {
  const fr = clip.frames, T = clip.t0 + kl(t, 0, clip.duur);
  let i = 0;
  while (i < fr.length - 2 && fr[i + 1].t < T) i++;
  const a = fr[i], c = fr[i + 1], k = c.t > a.t ? kl((T - a.t) / (c.t - a.t), 0, 1) : 0;
  const b = [0, 1, 2].map((j) => a.b[j] + (c.b[j] - a.b[j]) * k);
  const p = [];
  for (let j = 0; j < a.p.length; j += 5) p.push(a.p[j] + (c.p[j] - a.p[j]) * k, a.p[j + 1] + (c.p[j + 1] - a.p[j + 1]) * k, hoekMix(a.p[j + 2], c.p[j + 2], k), a.p[j + 3] + (c.p[j + 3] - a.p[j + 3]) * k, k < 0.5 ? a.p[j + 4] : c.p[j + 4]);
  return { b, p };
}
// Het beeld op de sim zetten (voor het tekenen) en weer terug: de sim staat tijdens de herhaling stil, dus dit is veilig.
export function pasFrameToe(sim, fr) {
  const bewaard = { b: [sim.bal.x, sim.bal.y, sim.bal.z], p: sim.spelers.map((s) => [s.x, s.y, s.face, s.speed, s.duikT, s.tackleT, s.stun, s.vier]) };
  sim.bal.x = fr.b[0]; sim.bal.y = fr.b[1]; sim.bal.z = fr.b[2];
  sim.spelers.forEach((s, i) => { const o = i * 5, fl = fr.p[o + 4] | 0; s.x = fr.p[o]; s.y = fr.p[o + 1]; s.face = fr.p[o + 2]; s.speed = fr.p[o + 3]; s.duikT = fl & 1 ? 0.3 : 0; s.tackleT = fl & 2 ? 0.3 : 0; s.stun = fl & 4 ? 0.3 : 0; s.vier = fl & 8 ? 1 : 0; });
  return bewaard;
}
export function herstelStaat(sim, bw) {
  sim.bal.x = bw.b[0]; sim.bal.y = bw.b[1]; sim.bal.z = bw.b[2];
  sim.spelers.forEach((s, i) => { const q = bw.p[i]; s.x = q[0]; s.y = q[1]; s.face = q[2]; s.speed = q[3]; s.duikT = q[4]; s.tackleT = q[5]; s.stun = q[6]; s.vier = q[7]; });
}

// Een herhaling plannen: bij een doelpunt (altijd, 5 seconden ervoor en 1,2 erna) of een grote kans (paal, lat of een felle schot dat wordt gestopt; hoogstens één per anderhalve minuut en niet vlak voor
// een fluitsignaal). Samen spelen: de sim loopt door voor iedereen, dus daar komt geen herhaling. Geeft { van, tot, soort } in opnametijd of null.
export function planHerhaling(op, ev, { online = false, klok = 99, laatste = -999 } = {}) {
  if (online || !ev) return null;
  if (ev.type === 'goal') return { van: op.t - 5, tot: op.t + 1.2, soort: 'goal' };
  if ((ev.type === 'paal' || ev.type === 'lat') && op.t - laatste > 90 && klok > 20) return { van: op.t - 4, tot: op.t + 0.8, soort: 'kans' };
  return null;
}
// Bij een herhaling hoort een eigen schotvolgorde: eerst de zijlijn, dan de doelcamera voor het laatste deel.
export const herhalingShot = (voortgang) => (voortgang < 0.6 ? 'zijlijn' : 'doel');
