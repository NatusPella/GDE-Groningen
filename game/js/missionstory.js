import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildPersonMesh, animatePersonWalk, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { HABBO_PALETTE } from './pixelart3d.js';
import { playCinematic, roofAt, showBanner } from './cinematics.js';
import { isInWater } from './util.js';

// Story cutscenes around the mission chain: who asks and why (start), the
// payoff (success) and a short sting (fail). Tammo and Anita's relationship
// moves one step per mission; `stage` is how far the player has got.

let sceneMod = null;
import('./scene3d.js').then((m) => { sceneMod = m; }).catch(() => {});

const SKIN = HABBO_PALETTE;
const NPC = {
  berend: { name: 'Bommen Berend', shirt: 0x4a5a3a, skin: SKIN.woodLight, variant: 'male', seed: 393 },
  jelmer: { name: 'Jelmer', shirt: 0xe2b93b, skin: SKIN.woodMid, variant: 'male', seed: 164 },
  sjoerd: { name: 'Sjoerd', shirt: 0x2e7d4f, skin: SKIN.woodLight, variant: 'male', seed: 1507 },
  femke: { name: 'Femke', shirt: 0x7a3f8f, skin: SKIN.woodLight, variant: 'female', seed: 198, hairStyle: 'curly' },
  harm: { name: 'Harm', shirt: 0xe07b1f, skin: SKIN.woodMid, variant: 'male', seed: 137 },
  geert: { name: 'Geert', shirt: 0xe8e3d6, skin: SKIN.woodLight, variant: 'male', seed: 1523 },
  trijntje: { name: 'Oma Trijntje', shirt: 0x5c6f8a, skin: SKIN.woodLight, variant: 'female', seed: 195, hairStyle: 'bun' },
  klaas: { name: 'Kapitein Klaas', shirt: 0x1f2f4a, skin: SKIN.woodDark, variant: 'male', seed: 1659 },
};

// N = the mission's NPC, T = Tammo, A = Anita. `ask` is the NPC line kept for
// the short replay version.
const STORY = [
  {
    npc: 'berend', outroPose: 'hips', ask: 1,
    intro: [
      ['N', 'Zo. Jullie zijn die twee waar iedereen het over heeft? Ik had er meer van verwacht.'],
      ['N', 'Mien bakkie staat hier. Naar het Boterdiep ermee, en geen kras.'],
      ['A', 'Ik rij.'],
      ['T', 'Jij rijdt als een fietser met een deadline.'],
      ['A', 'En jij als een fietser zonder fiets.'],
      ['N', 'Vóór mijn koffie koud is. Hup.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Hij staat er nog. Ik ben verbaasd.'],
      ['A', 'Zeg maar gewoon dank je, Berend.'],
      ['N', '…Dank je. Niet tegen de buren zeggen.'],
      ['T', 'Wij zeggen nooit wat. Tegen elkaar al helemaal niet.'],
    ],
    fail: [['A', 'Dit vertellen we Berend dus niet.'], ['T', 'Welke Berend?']],
  },
  {
    npc: 'jelmer', outroPose: 'cheer', ask: 0,
    intro: [
      ['N', 'Moi moi, ik ben live! De chat zegt dat de Grote Markt de saaiste plek van Grunn is.'],
      ['N', 'Jullie gaan daar iets aan doen, toch? Content, jongens. Content!'],
      ['T', 'Wij zijn geen content.'],
      ['A', 'Spreek voor jezelf. Ik ben heel veel content.'],
      ['T', 'Na dat bakkie van Berend dacht ik: rustig aan beginnen.'],
      ['A', 'Dit ís rustig aan, Tammo.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Tienduizend kijkers! De chat gaat helemaal los!'],
      ['T', 'Zeg tegen de chat dat ik niet op de foto wil.'],
      ['A', 'Je stond op elke foto. Met die pet.'],
      ['T', 'De pet blijft.'],
    ],
    fail: [['A', 'Saai. Zelfs ik val in slaap.'], ['T', 'Dat is het Grote Markt-gevoel.']],
  },
  {
    npc: 'sjoerd', outroPose: 'cheer', ask: 1,
    intro: [
      ['N', 'KEI-week, man! De eerstejaars zeggen dat niemand hun rondje kan verslaan.'],
      ['N', 'Vier checkpoints, rond het Academiegebouw. Winnaar krijgt eeuwige roem. En een bierviltje.'],
      ['A', 'Tammo heeft hier nog gestudeerd. Twee weken.'],
      ['T', 'Drie. De derde was ik ziek.'],
      ['A', 'Van het studeren?'],
      ['T', 'Van de mensa.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Record! Dit komt op het bierviltje!'],
      ['A', 'Niet slecht voor drie weken studie.'],
      ['T', 'Ik heb veel geleerd.'],
      ['A', 'Zoals?'],
      ['T', 'Dat ik bij jou in de buurt moet blijven.'],
    ],
    fail: [['T', 'Eerstejaars. Die hebben nog energie.'], ['A', 'Wij hadden dat vorige week ook.']],
  },
  {
    npc: 'femke', outroPose: 'cheer', ask: 1,
    intro: [
      ['N', 'Gelukkig, jullie zijn er! Alle spullen voor de voorstelling staan nog hier in de auto.'],
      ['N', 'Zo begint het in het Noorderplantsoen. Zonder decor is het gewoon mensen in een park.'],
      ['T', 'Wij hebben geen rijbewijs voor theater.'],
      ['A', 'Hij bedoelt: komt goed. Hij wordt altijd een beetje nerveus van kunst.'],
      ['T', 'Ik ben niet nerveus. Ik ben… aandachtig.'],
      ['N', 'Rijden! Nu!'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Het decor staat! Komen jullie vanavond kijken?'],
      ['A', 'Tammo houdt niet van theater.'],
      ['T', 'Wel als jij naast me zit.'],
      ['A', '…Zei je dat nou hardop?'],
      ['T', 'Nee.'],
    ],
    fail: [['A', 'Dan wordt het moderne dans.'], ['T', 'Minimalistisch. Dat vinden ze hier mooi.']],
  },
  {
    npc: 'harm', outroPose: 'cheer', ask: 1,
    intro: [
      ['N', 'Twintig jaar heb ik aan die ringweg gewerkt. Twintig jaar!'],
      ['N', 'Eén rondje om de stad, vol gas. Als de weg het houdt, mag ik eindelijk met pensioen.'],
      ['A', 'Een rondje? Is dat alles?'],
      ['T', 'Bij het Noorderplantsoen trok jij me nog net voor die bus weg.'],
      ['A', 'Anders was je nu een verkeersbord. Gordel om.'],
      ['T', 'Ik had hem heus wel gezien.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Hij ligt er nog! Ik ga met pensioen!'],
      ['T', 'Die laatste bocht was spannend.'],
      ['A', 'Je pakte mijn hand.'],
      ['T', 'Voor de grip.'],
      ['A', 'Natuurlijk, Tammo. Voor de grip.'],
    ],
    fail: [['T', 'De weg is klaar. Wij nog niet.'], ['A', 'Nog een rondje. Ik let op.']],
  },
  {
    npc: 'geert', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Vier kroegen, één avond. Wie het haalt, komt op de muur van de Poelestraat.'],
      ['N', 'En Anita: mijn nieuwe barman wil heel graag je nummer.'],
      ['T', 'Die barman heeft het druk.'],
      ['A', 'O ja? Sinds wanneer bepaal jij dat?'],
      ['T', 'Sinds nu. En we lopen, hè. Niemand rijdt vanavond.'],
      ['A', 'Moet je hem zien. Jaloers én verantwoordelijk.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Alle vier! Morgen hangen jullie aan de muur.'],
      ['A', 'Die barman was best leuk.'],
      ['T', 'Hij had een snor.'],
      ['A', 'Ik hou niet van snorren. Ik hou van petten.'],
      ['T', '…Goed om te weten.'],
    ],
    fail: [['A', 'Drie kroegen is ook een tocht.'], ['T', 'Een tochtje. Morgen de rest.']],
  },
  {
    npc: 'trijntje', outroPose: 'hips', ask: 1,
    intro: [
      ['N', 'Die fatbikes! Ze scheuren hier over het fietspad alsof heel Grunn van hen is.'],
      ['N', 'Loop jij daar eens heelhuids overheen, dan laat ik de gemeente een filmpje zien.'],
      ['A', 'Ik loop wel.'],
      ['T', 'Nee, ik loop. Jij hebt al eens een bus voor me tegengehouden.'],
      ['A', 'Dat was een bus, Tammo. Dit zijn pubers op dikke banden.'],
      ['T', 'Juist daarom.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Heelhuids! Dat filmpje gaat naar de gemeenteraad.'],
      ['A', 'Je had kunnen vallen, sukkel.'],
      ['T', 'Maar ik viel niet.'],
      ['A', 'Nooit meer zonder mij.'],
      ['T', 'Afgesproken. Voortaan vallen we samen.'],
    ],
    fail: [['T', 'Au. Die banden zijn echt dik.'], ['A', 'Kom, ik help je overeind. Weer.']],
  },
  {
    npc: 'klaas', ask: 1,
    intro: [
      ['N', 'Die rondvaartboot daar is… tijdelijk van niemand. Jullie varen, ik kijk de andere kant op.'],
      ['N', 'Eén rondje over de Diepenring. Doe alsof je gids bent, dan vraagt niemand iets.'],
      ['A', 'Tammo als gids. Dit wil ik zien.'],
      ['T', 'Links ziet u Grunn. Rechts ziet u ook Grunn.'],
      ['A', 'Professioneel. Ik ben onder de indruk.'],
    ],
    outroNpc: false,
    kiss: true,
    outro: [
      ['T', 'Weet je nog, Berends bakkie? Toen kreeg ik de sleutels niet eens.'],
      ['A', 'Die krijg je nog steeds niet.'],
      ['T', 'Maar de rest wel?'],
      ['A', 'De rest wel. Wij tweeën tegen Grunn.'],
      ['T', 'Wij tweeën tegen Grunn.'],
    ],
    fail: [['A', 'Gids zijn is moeilijker dan het lijkt.'], ['T', 'Links water. Rechts ook.']],
  },
];

// Tammo/Anita lines for when a mission is played before the ones leading up
// to it (via the phone), so no callback refers to something that hasn't happened.
const DUO_BY_STAGE = [
  { intro: [['A', 'Ik rij. Geen discussie.'], ['T', 'Er was ook geen discussie. Er was alleen jij.']], outro: [['T', 'Dat ging… verrassend goed.'], ['A', 'Verrassend voor jou.']] },
  { intro: [['T', 'Ik doe het wel, maar ik vind het niks.'], ['A', 'Dat zeg je elke keer.']], outro: [['A', 'Niet slecht, pet.'], ['T', 'De pet bedankt je.']] },
  { intro: [['A', 'Bijhouden, hè.'], ['T', 'Ik hou je al de hele week bij.']], outro: [['T', 'We worden hier best goed in.'], ['A', 'Ik werd er al goed in. Jij haakte aan.']] },
  { intro: [['T', 'Laat mij maar praten.'], ['A', 'Dan zijn we over een uur nog hier.']], outro: [['A', 'Je was er echt, vandaag.'], ['T', 'Ik ben er altijd. Meestal zwijgend.']] },
  { intro: [['A', 'Voorzichtig doen, hè.'], ['T', 'Zegt degene met de rode jas en de haast.']], outro: [['T', 'Je had me door, daar.'], ['A', 'Ik heb je altijd door.']] },
  { intro: [['T', 'Blijf een beetje bij mij in de buurt.'], ['A', 'Moi. Klinkt bijna lief.']], outro: [['A', 'Zeg het maar gewoon, Tammo.'], ['T', 'Wat zeggen?'], ['A', 'Laat maar. Ik weet het al.']] },
  { intro: [['A', 'Samen, of niet.'], ['T', 'Samen.']], outro: [['T', 'Zonder jou was ik allang gevallen.'], ['A', 'Weet ik. Daarom blijf ik.']] },
  { intro: [['T', 'Laatste klus?'], ['A', 'Voor vandaag.']], outro: [['A', 'Wij tweeën tegen Grunn?'], ['T', 'Wij tweeën tegen Grunn.']] },
];

const DECK_H = 0.4;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const P = (x, y, z) => ({ x, y, z });

function lineDur(text) {
  return Math.max(1.8, Math.min(3.8, 0.95 + text.length * 0.042));
}

// --- actors -------------------------------------------------------------------

const SHADOW_GEO = new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });

function makeActor(app) {
  const m = buildPersonMesh(app.shirt, app.skin, app);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const sh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
  sh.position.y = 0.03;
  m.add(sh);
  m.userData.blob = sh;
  return m;
}

function disposeActor(m) {
  m.traverse((o) => {
    if (o.isSkinnedMesh) {
      o.geometry.dispose();
      if (o.skeleton) o.skeleton.dispose();
    }
  });
}

function resetLimbs(ud) {
  for (const k of ['armL', 'armR']) ud[k].rotation.set(0, 0, 0);
  ud.head.rotation.set(0, 0, 0);
  ud.chest.rotation.set(0, 0, 0);
}

function applyPose(m, pose, t, talking) {
  const ud = m.userData;
  const arm = (a, e, z, ez, x = 0) => { a.rotation.set(x, 0, z); if (e) e.rotation.z = ez; };
  if (pose === 'point') arm(ud.armR, ud.elbowR, 1.45, 0.1, -0.15);
  else if (pose === 'hips') { arm(ud.armL, ud.elbowL, 0.3, 1.5, 0.55); arm(ud.armR, ud.elbowR, 0.3, 1.5, -0.55); }
  else if (pose === 'phone') arm(ud.armR, ud.elbowR, 0.9, 1.9, -0.2);
  else if (pose === 'cheer') { const k = Math.sin(t * 7) * 0.2; arm(ud.armL, ud.elbowL, 2.6 + k, 0.3, -0.3); arm(ud.armR, ud.elbowR, 2.6 - k, 0.3, 0.3); }
  else if (pose === 'kissT') { ud.chest.rotation.z = -0.1; ud.head.rotation.z = -0.22; arm(ud.armL, ud.elbowL, 0.75, 1.25, -0.5); arm(ud.armR, ud.elbowR, 0.75, 1.25, 0.5); }
  else if (pose === 'kissA') { ud.chest.rotation.z = -0.04; ud.head.rotation.z = 0.12; arm(ud.armL, ud.elbowL, 2.05, 1.3, -0.45); arm(ud.armR, ud.elbowR, 2.05, 1.3, 0.45); }
  if (talking && pose !== 'kissT' && pose !== 'kissA') {
    ud.head.rotation.z += Math.sin(t * 8.5) * 0.045;
    if (!pose) arm(ud.armR, ud.elbowR, 0.35 + Math.sin(t * 3.1) * 0.18, 0.9 + Math.sin(t * 2.3) * 0.25, -0.25);
  }
}

function standActor(m, x, y, a, h = 0) {
  const ud = m.userData;
  m.visible = true;
  m.position.set(x, h, y);
  m.rotation.set(0, -a, 0);
  ud.blob.visible = true;
}

// --- set building ---------------------------------------------------------------

function blocked(w, x, y, z = 1.6) {
  return roofAt(w.map, x, y) > z - 0.5 || isInWater(w.map, x, y);
}

function carAt(w, x, y, r = 2.4) {
  return w.vehicles.some((v) => Math.hypot(v.x - x, v.y - y) < r + v.model.len * 0.3);
}

function sightBlocked(w, ax, ay, bx, by) {
  for (let k = 1; k < 5; k++) {
    const x = ax + (bx - ax) * k / 5, y = ay + (by - ay) * k / 5;
    if (carAt(w, x, y, 1.2) || roofAt(w.map, x, y) > 1) return true;
  }
  return false;
}

function freeSpot(w, x, y) {
  const [sx, sy] = w.map.escapeBuilding(x, y);
  return { x: sx, y: sy };
}

// Picks the facing that keeps the NPC and the close-up cameras out of walls
// and water, preferring to look towards the mission target.
function chooseFacing(w, ax, ay, prefer) {
  const offs = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, Math.PI];
  let best = null;
  for (const o of offs) {
    const a = prefer + o, fx = Math.cos(a), fy = Math.sin(a), nx = -fy, ny = fx;
    const pts = [
      [ax + fx * 2.1, ay + fy * 2.1], [ax - fx * 1.5 + nx * 1.9, ay - fy * 1.5 + ny * 1.9],
      [ax + fx * 3.9 - nx * 0.9, ay + fy * 3.9 - ny * 0.9], [ax - fx * 7 + nx * 4, ay - fy * 7 + ny * 4],
    ];
    let score = 0;
    pts.forEach(([x, y], i) => { if (blocked(w, x, y) || carAt(w, x, y)) score += i < 2 ? 3 : 1; });
    if (sightBlocked(w, pts[2][0], pts[2][1], ax, ay)) score += 2;
    if (sightBlocked(w, pts[1][0], pts[1][1], pts[0][0], pts[0][1])) score += 2;
    score += Math.abs(o) * 0.2;
    if (!best || score < best.score) best = { a, score };
  }
  return best.a;
}

function camClear(w, pos) {
  const top = roofAt(w.map, pos.x, pos.y);
  if (top && pos.z < top + 1.5) return P(pos.x, pos.y, top + 1.5);
  return pos;
}

function pose(pos, look, fov) {
  return { position: pos, lookAt: look, fov, cut: true };
}

// --- runtime --------------------------------------------------------------------

let run = null;

function speakerName(key, npc) {
  if (key === 'T') return 'Tammo';
  if (key === 'A') return 'Anita';
  return npc ? npc.name : '';
}

function timeline(lines, npc, lead = 0.5) {
  let t = lead;
  const out = lines.map(([who, text]) => {
    const d = lineDur(text);
    const l = { who, speaker: speakerName(who, npc), text, at: t, dur: d };
    t += d + 0.1;
    return l;
  });
  return { lines: out, total: t + 0.3 };
}

function buildRun(w, { npcKey, anchor, facing, kiss, h = 0 }) {
  const scene = sceneMod && sceneMod.getScene();
  if (!scene) return null;
  const group = new THREE.Group();
  group.name = 'mission-story';
  scene.add(group);
  const tammo = makeActor(TAMMO_APPEARANCE);
  const anita = makeActor(ANITA_APPEARANCE);
  group.add(tammo, anita);
  const npcDef = npcKey ? NPC[npcKey] : null;
  const npc = npcDef ? makeActor(npcDef) : null;
  if (npc) group.add(npc);

  const r = { w, group, tammo, anita, npc, npcDef, lastT: 0, kiss };
  const a = facing, fx = Math.cos(a), fy = Math.sin(a), nx = -fy, ny = fx;
  r.f = { x: fx, y: fy };
  r.n = { x: nx, y: ny };
  if (kiss) {
    standActor(tammo, anchor.x - fx * 0.23, anchor.y - fy * 0.23, a, h);
    standActor(anita, anchor.x + fx * 0.23, anchor.y + fy * 0.23, a + Math.PI, h);
    r.mid = { x: anchor.x, y: anchor.y };
  } else {
    const t = freeSpot(w, anchor.x + nx * 0.5, anchor.y + ny * 0.5);
    const an = freeSpot(w, anchor.x - nx * 0.5, anchor.y - ny * 0.5);
    standActor(tammo, t.x, t.y, a - 0.18, h);
    standActor(anita, an.x, an.y, a + 0.18, h);
    r.mid = { x: (t.x + an.x) / 2, y: (t.y + an.y) / 2 };
    if (npc) {
      const spot = freeSpot(w, anchor.x + fx * 2.1, anchor.y + fy * 2.1);
      standActor(npc, spot.x, spot.y, a + Math.PI, h);
      r.npcPos = spot;
    }
  }
  r.h = h;
  const near = (q) => q.state !== 'dead' && Math.hypot(q.x - r.mid.x, q.y - r.mid.y) < 10;
  r.peds = w.pedestrians.filter(near);
  if (r.peds.length) w.pedestrians = w.pedestrians.filter((q) => !r.peds.includes(q));
  w.cinematicHidePlayers = true;
  w.cinematicHideNav = true;
  return r;
}

function cleanupRun(r) {
  if (!r) return;
  r.group.removeFromParent();
  for (const m of [r.tammo, r.anita, r.npc]) if (m) disposeActor(m);
  r.w.cinematicHidePlayers = false;
  r.w.cinematicHideNav = false;
  if (r.peds && r.peds.length) r.w.pedestrians.push(...r.peds);
  if (run === r) run = null;
}

function animate(r, t, dt, talker, poses) {
  for (const [m, key] of [[r.tammo, 'T'], [r.anita, 'A'], [r.npc, 'N']]) {
    if (!m) continue;
    const ud = m.userData;
    resetLimbs(ud);
    animatePersonWalk(m, 0, dt);
    applyPose(m, poses[key] || null, t, talker === key);
  }
}

// Camera helpers, all relative to the pair (mid), the NPC and facing f/n.
function camsFor(r) {
  const w = r.w, f = r.f, n = r.n, mid = r.mid, h = r.h;
  const npc = r.npcPos || { x: mid.x + f.x * 2.1, y: mid.y + f.y * 2.1 };
  const head = (p, z = 1.5) => P(p.x, p.y, h + z);
  const side = (k) => (blocked(w, mid.x - f.x * 1.5 + n.x * 1.9 * k, mid.y - f.y * 1.5 + n.y * 1.9 * k) ? -k : k);
  const s1 = side(1);
  return {
    est: (u) => {
      const a = camClear(w, P(mid.x - f.x * lerp(9, 6, smooth(u)) + n.x * lerp(5, 3.2, u) * s1, mid.y - f.y * lerp(9, 6, smooth(u)) + n.y * lerp(5, 3.2, u) * s1, h + lerp(4.2, 2.8, u)));
      return pose(a, head({ x: (mid.x + npc.x) / 2, y: (mid.y + npc.y) / 2 }, 1.3), 50);
    },
    npc: (u) => {
      const a = camClear(w, P(mid.x - f.x * (1.5 + u * 0.3) + n.x * 1.9 * s1, mid.y - f.y * (1.5 + u * 0.3) + n.y * 1.9 * s1, h + 1.7));
      return pose(a, head(npc, 1.5), 40);
    },
    duo: (u) => {
      const a = camClear(w, P(npc.x + f.x * 1.8 - n.x * 0.9 * s1 + f.x * u * 0.3, npc.y + f.y * 1.8 - n.y * 0.9 * s1 + f.y * u * 0.3, h + 1.68));
      return pose(a, head(mid, 1.42), 40);
    },
    two: (u) => {
      const a = camClear(w, P(mid.x + f.x * lerp(3.6, 3.0, u) + n.x * 0.4, mid.y + f.y * lerp(3.6, 3.0, u) + n.y * 0.4, h + 1.6));
      return pose(a, head(mid, 1.35), 42);
    },
    kiss: (u) => {
      const a = camClear(w, P(mid.x + n.x * lerp(3.6, 3.0, smooth(u)), mid.y + n.y * lerp(3.6, 3.0, smooth(u)), h + lerp(1.8, 1.65, u)));
      return pose(a, head(mid, 1.35), lerp(42, 38, u));
    },
    rise: (u) => {
      const k = smooth(u);
      const a = camClear(w, P(mid.x + n.x * lerp(3, 10, k) * s1 - f.x * lerp(2, 8, k), mid.y + n.y * lerp(3, 10, k) * s1 - f.y * lerp(2, 8, k), h + lerp(1.8, 9, k)));
      return pose(a, head(mid, lerp(1.4, 0.6, k)), 48);
    },
    glance: (u, target) => {
      const k = smooth(u);
      const tx = target ? target.x : mid.x + f.x * 60, ty = target ? target.y : mid.y + f.y * 60;
      const d = Math.hypot(tx - mid.x, ty - mid.y) || 1;
      const lim = Math.min(d, 140);
      const gx = mid.x + (tx - mid.x) / d * lim, gy = mid.y + (ty - mid.y) / d * lim;
      const a = camClear(w, P(mid.x - (gx - mid.x) / lim * 4 + n.x * 2.5 * s1, mid.y - (gy - mid.y) / lim * 4 + n.y * 2.5 * s1, h + lerp(2.2, 8, k)));
      return pose(a, P(lerp(mid.x, gx, k), lerp(mid.y, gy, k), lerp(1.4, 2.5, k)), 50);
    },
  };
}

function camFor(cams, who, isFirst, isLast, closing, target) {
  if (closing === 'two') return cams.two;
  if (isFirst) return (u) => cams.est(u);
  if (closing === 'kiss') return cams.kiss;
  if (isLast && closing === 'glance') return (u) => cams.glance(u, target);
  if (isLast && closing === 'rise') return cams.rise;
  return who === 'N' ? cams.npc : cams.duo;
}

function play(w, id, r, tl, { kicker, title, cardFor, closing, target, poses = () => ({}), banner, bannerAfter }) {
  const cams = camsFor(r);
  const lines = tl.lines;
  const plan = lines.map((l, i) => ({ from: l.at - (i === 0 ? l.at : 0.06), to: l.at + l.dur + 0.06, fn: camFor(cams, l.who, i === 0 && lines.length > 1, i === lines.length - 1, closing, target) }));
  if (lines.length === 1) plan[0].fn = closing === 'glance' ? (u) => cams.glance(u, target) : cams.two;
  plan[plan.length - 1].to = tl.total;
  run = r;
  const ok = playCinematic({
    id, priority: 3, duration: tl.total, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker, title, cardFor,
    lines: lines.map((l) => ({ speaker: l.speaker, text: l.text, at: l.at, dur: l.dur })),
    shot: (u, t) => {
      const dt = Math.max(0, Math.min(0.1, t - r.lastT));
      r.lastT = t;
      const cur = lines.find((l) => t >= l.at && t < l.at + l.dur);
      animate(r, t, dt, cur ? cur.who : null, poses(t, cur));
      const seg = plan.find((p) => t < p.to) || plan[plan.length - 1];
      return seg.fn(clamp01((t - seg.from) / Math.max(0.1, seg.to - seg.from)));
    },
    onStart: () => { if (banner) showBanner(banner); },
    onEnd: () => {
      cleanupRun(r);
      if (bannerAfter) showBanner(bannerAfter);
    },
  });
  if (!ok) {
    cleanupRun(r);
    if (banner || bannerAfter) showBanner(banner || bannerAfter);
  }
  return ok;
}

function stageLines(i, stage, kind) {
  const s = STORY[i];
  const base = s[kind];
  if (stage >= i) return base;
  const npcLines = base.filter((l) => l[0] === 'N');
  const duo = DUO_BY_STAGE[Math.max(0, Math.min(DUO_BY_STAGE.length - 1, stage))][kind];
  return kind === 'intro' ? [...npcLines.slice(0, 2), ...duo, ...npcLines.slice(2)] : [...npcLines.slice(0, 1), ...duo];
}

function facingTowards(w, anchor, target) {
  const pref = target ? Math.atan2(target.y - anchor.y, target.x - anchor.x) : w.player.angle;
  return chooseFacing(w, anchor.x, anchor.y, Number.isFinite(pref) ? pref : 0);
}

function onFootAnchor(w) {
  const p = w.player;
  if (!p.inVehicle) return { x: p.x, y: p.y };
  const v = p.inVehicle;
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  for (const k of [-1, 1]) {
    const x = v.x - s * k * 2.6, y = v.y + c * k * 2.6;
    if (!blocked(w, x, y)) return freeSpot(w, x, y);
  }
  return freeSpot(w, v.x - s * 2.6, v.y + c * 2.6);
}

export function playStoryIntro(w, i, { stage = i, short = false, kicker = '', title = '', target = null } = {}) {
  const s = STORY[i];
  if (!s || run) return false;
  const anchor = onFootAnchor(w);
  const facing = facingTowards(w, anchor, target);
  const r = buildRun(w, { npcKey: s.npc, anchor, facing });
  if (!r) return false;
  const all = stageLines(i, stage, 'intro');
  const lines = short ? [s.intro[s.ask]] : all;
  const tl = timeline(lines, r.npcDef, short ? 0.4 : 0.6);
  const askText = s.intro[s.ask][1];
  return play(w, 'mission-intro', r, tl, {
    kicker, title, cardFor: short ? tl.total : 3.6, closing: 'glance', target,
    poses: (t, cur) => ({ N: cur && cur.text === askText ? 'point' : i === 1 ? 'phone' : null, A: i === 5 && cur && cur.who === 'A' ? 'hips' : null }),
  });
}

export function playStoryOutro(w, i, { stage = i, short = false, reward = 0, stats = [], reason = '' } = {}) {
  const s = STORY[i];
  const banner = { kind: 'pass', title: 'MISSIE GESLAAGD', reason, reward, stats };
  if (!s || run) { showBanner(banner); return false; }
  const p = w.player;
  const v = p.inVehicle;
  const kiss = !!s.kiss && !short && stage >= i;
  let r;
  if (v && v.isBoat) {
    r = buildRun(w, { anchor: { x: v.x, y: v.y }, facing: v.angle + Math.PI / 2, kiss, h: DECK_H });
  } else {
    const anchor = onFootAnchor(w);
    r = buildRun(w, { npcKey: s.outroNpc && !kiss ? s.npc : null, anchor, facing: facingTowards(w, anchor, null), kiss });
  }
  if (!r) { showBanner(banner); return false; }
  const all = stageLines(i, stage, 'outro');
  const lines = short ? [all[all.length - 1]] : all;
  const tl = timeline(lines, r.npcDef, short ? 0.3 : 0.5);
  return play(w, 'mission-outro', r, tl, {
    closing: kiss ? 'kiss' : 'rise', banner,
    poses: (t, cur) => (kiss && cur === tl.lines[tl.lines.length - 1]
      ? { T: 'kissT', A: 'kissA' }
      : kiss ? {} : { N: s.outroPose || null }),
  });
}

export function playStoryFail(w, i, { reason = '', stats = [] } = {}) {
  const s = STORY[i];
  const banner = { kind: 'fail', title: 'MISSIE MISLUKT', reason, stats };
  if (!s || run) { showBanner(banner); return false; }
  const v = w.player.inVehicle;
  let r;
  if (v && v.isBoat) r = buildRun(w, { anchor: { x: v.x, y: v.y }, facing: v.angle + Math.PI / 2, h: DECK_H });
  else {
    const anchor = onFootAnchor(w);
    r = buildRun(w, { anchor, facing: facingTowards(w, anchor, null) });
  }
  if (!r) { showBanner(banner); return false; }
  const tl = timeline(s.fail, null, 0.3);
  return play(w, 'mission-fail', r, tl, { closing: 'two', bannerAfter: banner, poses: (t, cur) => ({ A: cur && cur.who === 'A' ? 'hips' : null }) });
}
