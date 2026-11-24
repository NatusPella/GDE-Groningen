// De intro van carbidschieten (24-11, feedback eigenaar: "in de cutscene van het carbidschieten is totaal niet te zien dat het
// carbidschieten is"). Vier shots op het erf van boer Roelf (carbidset.js), zodat een buitenstaander zonder ondertitel ziet wat er
// gebeurt: 1. het erf met de rij melkbussen op bokken, het publiek achter het hek en de koffietafel; 2. dichtbij: Roelf, met
// gehoorkappen op, houdt de brandende lontstok bij het gaatje achter op de bus; 3. de knal: vlam en rookwolk uit de mond, het
// deksel vliegt het veld in, de camera schudt; 4. de reactie van Tammo en Tessa aan het hek, het publiek klapt.
//
// De regie is data (CARBID_INTRO): shots met camera in veldcoördinaten (u langs de schietlijn, v dwars, h boven de grond), het
// licht per shot (klok: zomeravond, gouden uur) en de momenten (knal, regels). De beweging is een functie van de scènetijd t,
// zodat een beeld op elk tijdstip hetzelfde is (de render van de kwaliteitsmachine springt erin); alleen het vuur en de rook
// (fx3d) en het geluid starten op het moment dat t de knal passeert.
//
// Samen spelen: de intro speelt alleen op het scherm van wie de activiteit start (carbid is van wie het spel opende, coopstatus
// 'nee'); er gaat geen bericht over het net. Een gast ziet geen intro; het erf zelf staat bij iedereen in de buurt (carbid.js
// gastTick), dus de gast ziet de bussen, het hek en het publiek wel; het schot zelf gaat niet over het net.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { playCinematic, isCinematicActive } from './cinematics.js';
import { refreshDayNight } from './daynight.js';
import { spawnExplosionFx, spawnFxPuff } from './fx3d.js';
import { flashMuzzleLight } from './nightlights3d.js';
import { pushAudioEvent } from './pedgeom.js';
import { adoptSetLight } from './setlights.js';
import { animateActor } from './actoranim.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { DECOR_MAKERS } from './storyprops.js';
import { LONT } from './carbidprops3d.js';
import { setMens, zetGehoorkap, animateCarbidSet } from './carbidset.js';

export const CARBID_INTRO = {
  id: 'carbid-intro',
  kicker: 'Carbid schieten', titel: 'Knal in de klei',
  duur: 11.0,
  knal: 5.6,
  // licht als data: zomeravond (gouden uur), geen regen. Per shot kan `licht` de klok of de fakkel aanpassen.
  licht: { klok: 20.4, weer: 'helder' },
  shots: [
    { id: 'erf', t: 0, from: [-10, -10.5, 5.8], to: [-8, -9.5, 4.4], look: [3, 9, 1.4], fov: 52 },
    { id: 'ontsteking', t: 3.2, from: [-0.2, 1.7, 1.35], to: [-0.35, 1.45, 1.2], look: [-1.05, -0.75, 1.0], fov: 44, licht: { fakkel: 1 } },
    { id: 'knal', t: 5.6, from: [3.4, -7.2, 1.25], to: [4.6, -7.6, 1.6], look: 'deksel', fov: 46, schud: 0.16 },
    { id: 'reactie', t: 8.0, from: [-3.6, 1.5, 1.6], to: [-3.9, 1.8, 1.65], look: [-1.0, 5.4, 1.45], fov: 42 },
  ],
  // de mensen van de scène (veldcoördinaten, phi: kijkrichting)
  cast: {
    roelf: { at: [-1.85, -1.3], kap: true },
    tammo: { at: [-1.6, 5.2], phi: -1.27 },
    tessa: { at: [-0.6, 5.7], phi: -1.47, kap: true },
  },
  regels: [
    { at: 3.4, dur: 2.0, speaker: 'Boer Roelf', text: 'Kiek uut, hai gaait!' },
    { at: 6.3, dur: 1.6, speaker: 'Hilje', text: 'Hai vlugt! Hai vlugt!' },
    { at: 8.4, dur: 2.2, speaker: 'Boer Roelf', text: 'Wat n knaal!' },
  ],
  // het deksel: beginsnelheid en hoek (een goede knal: zo'n 40 m het veld in)
  deksel: { v0: 21, el: 0.42 },
};

export const shotOp = (t, shots = CARBID_INTRO.shots) => { let i = 0; for (let k = 0; k < shots.length; k++) if (t >= shots[k].t) i = k; return i; };
const smooth = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;

// De vlucht van het deksel na de knal (veldcoördinaten, s seconden na de knal): parabool met wat luchtweerstand, daarna ligt hij.
export function dekselOp(s, { v0, el } = CARBID_INTRO.deksel, mond = { u: 0.3, h: 0.95 }) {
  const vu = v0 * Math.cos(el), vh = v0 * Math.sin(el);
  const tLand = (vh + Math.sqrt(vh * vh + 2 * 9.81 * mond.h)) / 9.81;
  const k = Math.min(s, tLand);
  const u = mond.u + vu * k * (1 - 0.06 * k), h = Math.max(0.03, mond.h + vh * k - 4.9 * k * k);
  const rol = s > tLand ? Math.min(3, (s - tLand) * 2.5) : 0;
  return { u: u + rol, v: 0.4 * k, h, spin: s * 11, ligt: s > tLand };
}

// Speelt de intro. ctx: { w, toW(u, v) -> {x, y}, ground(x, y), root (veldgroep), bus (draaibare busgroep met kinderen gat en mond),
// deksel, boeren { Roelf, Hilje } (meshes), set (carbidset), onEinde(skipped) }. Geeft false als er al een scène loopt.
export function speelCarbidIntro(ctx) {
  const { w, toW, root, bus, deksel, set } = ctx;
  const D = CARBID_INTRO;
  if (isCinematicActive()) return false;
  // de cast: Tammo en Tessa uit het kledingsysteem, Roelf met lontstok en gehoorkappen (zijn eigen mesh van het veld)
  const cast = new THREE.Group();
  cast.name = 'carbid-intro-cast';
  root.add(cast);
  const at = (o, [u, v], phi = 0) => { o.position.set(u, 0, v); o.rotation.y = -phi; cast.add(o); return o; };
  const tammo = at(setMens(TAMMO_APPEARANCE), D.cast.tammo.at, D.cast.tammo.phi);
  const tessa = at(setMens(ANITA_APPEARANCE), D.cast.tessa.at, D.cast.tessa.phi);
  zetGehoorkap(tessa);
  const roelf = ctx.boeren.Roelf;
  const roelfWas = { p: roelf.position.clone(), r: roelf.rotation.y, parent: roelf.parent };
  // Roelf in het veldkader zetten (zijn mesh hangt in de scène in wereldcoördinaten)
  const rp = toW(...D.cast.roelf.at);
  roelf.position.set(rp.x, 0, rp.y);
  const kap = zetGehoorkap(roelf);
  const stok = DECOR_MAKERS.lontstok();
  root.add(stok);
  const vlam = adoptSetLight(new THREE.PointLight(0xff9a40, 0, 6, 2));
  root.add(vlam);
  // de bus van het spel: mond iets omhoog, het deksel erin (de intro beweegt hem zelf, carbid.js sync3D wacht)
  bus.rotation.set(0, 0, 0.3, 'YXZ');
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0);
  const gatL = () => root.worldToLocal(bus.userData.gat.getWorldPosition(_a.set(0, 0, 0)));
  const mondL = () => root.worldToLocal(bus.userData.mond.getWorldPosition(new THREE.Vector3()));
  let geknald = false, klok = null, laatst = 0;
  const mondStart = mondL();
  const dekselL = (s) => { const d = dekselOp(s, D.deksel, { u: mondStart.x, h: mondStart.y }); return new THREE.Vector3(d.u, d.h, mondStart.z + d.v); };
  // per beeld: de mensen, de stok, het vuur en het deksel als functie van t
  const stand = (t, dt) => {
    const s = t - D.knal;
    // Roelf kijkt naar het gaatje, houdt de stok met gestrekte arm; na de knal deinst hij terug en lacht
    const gat = gatL();
    const rA = Math.atan2(gat.z - D.cast.roelf.at[1], gat.x - D.cast.roelf.at[0]);
    roelf.rotation.y = -(ctx.fieldRot + rA);
    animateActor(roelf, { anim: s < 0 ? 'point' : s < 1.2 ? 'lean' : 'laugh', speed: 0, gaze: 0, t, dt });
    animateActor(tammo, { anim: s < 0 ? 'idle' : s < 1.5 ? 'laugh' : 'wave', speed: 0, gaze: 0, t, dt });
    animateActor(tessa, { anim: s < 0 ? 'look' : s < 2 ? 'laugh' : 'clap', speed: 0, gaze: 0, t, dt });
    animateCarbidSet(set, dt, s < 0.3 ? null : 'clap');
    if (ctx.boeren.Hilje) animateActor(ctx.boeren.Hilje, { anim: s < 0 ? 'idle' : 'cheer', speed: 0, gaze: 0, t, dt });
    // de stok: van de hand van Roelf naar het gaatje (voor de knal zakt de fakkel er langzaam heen, daarna trekt hij hem terug)
    roelf.updateMatrixWorld(true);
    const ud = roelf.userData;
    let hand = null;
    if (ud.elbowR && ud.armR) {
      const e = ud.elbowR.getWorldPosition(new THREE.Vector3()), a = ud.armR.getWorldPosition(new THREE.Vector3());
      hand = root.worldToLocal(e.clone().add(e.clone().sub(a).normalize().multiplyScalar(0.27)));
    } else hand = root.worldToLocal(roelf.localToWorld(new THREE.Vector3(0.45, 1.25, -0.2)));
    const naar = s < 0 ? smooth((t - 3.0) / 2.4) : 1 - smooth(s / 0.6);
    const tip = gat.clone().add(new THREE.Vector3(-0.06, lerp(0.55, 0.05, naar), 0));
    const dir = _b.copy(tip).sub(hand);
    const len = dir.length();
    stok.position.copy(tip).addScaledVector(dir.normalize(), -LONT);
    stok.quaternion.copy(_q.setFromUnitVectors(X, dir));
    stok.visible = len > 0.3;
    if (typeof window !== 'undefined') window.__carbidIntroDebug = { gat: gat.toArray(), hand: hand.toArray(), tip: tip.toArray(), stok: stok.position.toArray(), len };
    // het vuur aan de fakkel (tot de knal) en het licht dat erbij hoort
    const fakkel = stok.localToWorld(new THREE.Vector3(LONT + 0.04, 0.035, 0));
    vlam.position.copy(root.worldToLocal(fakkel.clone()));
    vlam.intensity = s < 0 ? 2.2 + Math.sin(t * 23) * 0.5 + Math.sin(t * 37) * 0.3 : Math.max(0, 6 * (1 - s / 0.35));
    if (s < 0 && dt > 0) for (let k = 0; k < 2; k++) spawnFxPuff(fakkel.x, fakkel.y + 0.02, fakkel.z, (Math.random() - 0.5) * 0.1, 0.25 + Math.random() * 0.2, (Math.random() - 0.5) * 0.1, 0.2, 0.05, 0.1, 1, 0.55 + Math.random() * 0.2, 0.18, 0.9, 1.6, 0.2, 1);
    // het deksel: in de mond, na de knal in de lucht
    if (s < 0) {
      if (deksel.parent !== bus) { bus.add(deksel); deksel.position.copy(bus.userData.dekselThuis); deksel.rotation.set(0, 0, -Math.PI / 2); }
    } else {
      if (deksel.parent !== root) root.add(deksel);
      const d = dekselOp(s, D.deksel, { u: mondStart.x, h: mondStart.y });
      deksel.position.set(d.u, d.h, mondStart.z + d.v);
      deksel.rotation.set(d.ligt ? 0 : d.spin, 0.3, d.ligt ? 0 : -Math.PI / 2 + Math.sin(d.spin) * 0.7);
    }
    // de knal: vuur, rook, licht en geluid (één keer, als de tijd hem passeert)
    if (!geknald && s >= 0) {
      geknald = true;
      const m = bus.userData.mond.getWorldPosition(new THREE.Vector3());
      const c = Math.cos(ctx.fieldRot), sn = Math.sin(ctx.fieldRot);
      pushAudioEvent(w, { kind: 'weapon', sub: 'carbid', x: m.x, y: m.z });
      spawnExplosionFx(m.x + c * 0.5, m.z + sn * 0.5, m.y, 0x8a9197, 0.3);
      flashMuzzleLight(m.x, m.y + 0.4, m.z, 4);
      for (let k = 0; k < 18; k++) spawnFxPuff(m.x, m.y, m.z, c * (2 + Math.random() * 6) + (Math.random() - 0.5) * 2, 0.4 + Math.random() * 1.6, sn * (2 + Math.random() * 6) + (Math.random() - 0.5) * 2, 1.2 + Math.random() * 1.2, 0.35, 1.8, 0.86, 0.85, 0.82, 0.55, 1.4, 0.3);
      // een trage wolk die blijft hangen (in het reactieshot drijft hij nog voor de bomen)
      for (let k = 0; k < 10; k++) spawnFxPuff(m.x + c * k * 0.5, m.y + 0.3, m.z + sn * k * 0.5, c * 0.8 + (Math.random() - 0.5) * 0.5, 0.25, sn * 0.8 + (Math.random() - 0.5) * 0.5, 4.5 + Math.random() * 1.5, 0.8, 3.2, 0.82, 0.81, 0.78, 0.45, 0.6, 0.15);
      for (let k = 0; k < 6; k++) spawnFxPuff(m.x, m.y, m.z, c * (5 + Math.random() * 4), Math.random(), sn * (5 + Math.random() * 4), 0.18, 0.15, 0.6, 1, 0.75, 0.3, 1, 3, 0, 1); // de vlam uit de mond
    }
  };
  // de camera: per shot een dolly, het licht uit de data, schudden na de knal
  const camVan = (t) => {
    const i = shotOp(t);
    const S = D.shots[i], eind = i + 1 < D.shots.length ? D.shots[i + 1].t : D.duur;
    const k = smooth((t - S.t) / Math.max(0.1, eind - S.t));
    const P = [0, 1, 2].map((j) => lerp(S.from[j], S.to[j], k));
    let L;
    if (S.look === 'deksel') {
      const d = dekselL(Math.max(0, t - D.knal));
      const m = mondStart;
      const f = smooth((t - D.knal - 0.25) / 0.8);
      L = [lerp(m.x + 1, d.x, f), lerp(m.y, d.y, f), lerp(m.z, d.z, f)];
    } else L = S.look;
    const sch = S.schud ? S.schud * Math.max(0, 1 - (t - D.knal) / 1.4) : 0;
    const n = (a) => Math.sin(t * a) * sch;
    const pw = toW(P[0], P[1]), lw = toW(L[0], L[2] !== undefined && S.look === 'deksel' ? L[2] : L[1]);
    const lh = S.look === 'deksel' ? L[1] : L[2];
    // licht per shot (de klok verschuift alleen als de data dat zegt)
    const kl = (S.licht && S.licht.klok) ?? D.licht.klok;
    if (kl !== klok) { klok = kl; w.clock = kl; refreshDayNight(w); }
    return { position: { x: pw.x + n(53), y: pw.y + n(41), z: ctx.ground(pw.x, pw.y) + P[2] + n(67) * 0.7 }, lookAt: { x: lw.x, y: lw.y, z: ctx.ground(lw.x, lw.y) + lh }, fov: S.fov, cut: true };
  };
  const opruimen = () => {
    cast.removeFromParent();
    stok.removeFromParent();
    vlam.removeFromParent();
    kap.removeFromParent();
    roelf.position.copy(roelfWas.p);
    roelf.rotation.y = roelfWas.r;
  };
  const ok = playCinematic({
    id: D.id, priority: 2, duration: D.duur, pause: false, letterbox: true, skippable: true, hideHud: true, hidePlayers: true,
    kicker: D.kicker, title: D.titel, cardFor: 2.6, lines: D.regels.map((r) => ({ ...r })),
    shot: (u, t) => {
      const dt = Math.max(0, Math.min(0.1, t - laatst));
      laatst = t;
      if (typeof window !== 'undefined') window.__carbidIntroT = t; // de render van de kwaliteitsmachine leest de scènetijd
      stand(t, dt);
      return camVan(t);
    },
    onStart() { w.cinematicHidePlayers = true; w.cinematicHideNav = true; },
    onEnd(skipped) {
      w.cinematicHidePlayers = false; w.cinematicHideNav = false;
      w.cameraOverride = null;
      opruimen();
      if (ctx.onEinde) ctx.onEinde(skipped);
    },
  });
  if (!ok) opruimen();
  return ok;
}
