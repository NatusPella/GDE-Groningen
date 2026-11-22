// What the people in an interior DO (epic Interieurs, #1150, round 3): a small, cheap state machine per person with 3 to 6 activities
// per role, as data. A shopkeeper rings up, packs and restocks; a customer browses, takes something, queues and pays; a guest eats and
// talks, a waiter brings an order; an office worker types, phones and fetches coffee; a churchgoer sits, kneels and lights a candle; a
// reader searches the shelves; a traveller waits; a mechanic works on the car; a resident cooks and watches tv. Pure and deterministic
// from the building seed: the same room has the same people doing the same things in the same order on every client (the time they
// take comes from the same seeded generator, only the clock of the frames differs).
//
// An activity is { id, at, pose, dur: [min, max] s }. `at` names the kind of place to go to (an anchor derived from the layout: in front
// of a shelf, a seat, the counter, a machine ...) or 'home' (stay where you are: the staff behind a counter) or 'wander'. `pose` is one
// of the poses of models3d_people.js (null idle, 'sit', 'crouch', 'vendor', 'phone', 'call'). Movement is over the walk grid
// (interiorwander.js findPath), so nobody walks into furniture. A person who cannot reach an anchor does the next activity.
import { CELL, rectOf, footprint, faceDir, reachableAt } from './interiorlayout.js';
import { findPath } from './interiorwander.js';

export const MAX_ACTORS = 8;
export const SPEED = 1.1;

// --- the scripts ---------------------------------------------------------------------------------------------

// `when` (optional): the parts of the day (interiorcrowd.js PHASES) in which this is done; none = always
const S = (id, at, pose, a, b, when = null) => (when ? { id, at, pose, dur: [a, b], when } : { id, at, pose, dur: [a, b] });
const DN = ['dag', 'avond'], AN = ['avond', 'nacht'], DAG = ['dag'];
export const SCRIPTS = {
  // behind the counter (staff stay in their pocket)
  winkelier: [S('afrekenen', 'home', 'vendor', 5, 9), S('wachten', 'home', null, 3, 6), S('aanvullen', 'shelf', 'crouch', 5, 9), S('inpakken', 'home', 'vendor', 4, 7), S('bellen', 'home', 'phone', 4, 7)],
  barman: [S('schenken', 'home', 'vendor', 5, 9), S('poetsen', 'home', null, 3, 6), S('flessen', 'shelf', 'crouch', 4, 8), S('kletsen', 'home', 'call', 4, 8)],
  receptionist: [S('typen', 'home', 'phone', 6, 12), S('wachten', 'home', null, 3, 6), S('ontvangen', 'home', 'vendor', 4, 7)],
  loketmedewerker: [S('loket', 'home', 'vendor', 5, 9), S('wachten', 'home', null, 3, 6), S('bellen', 'home', 'phone', 4, 7)],
  baliemedewerker: [S('balie', 'home', 'vendor', 5, 9), S('wachten', 'home', null, 3, 6), S('bellen', 'home', 'phone', 4, 7)],
  kapper: [S('knippen', 'home', 'vendor', 8, 16), S('wachten', 'home', null, 3, 6), S('bellen', 'home', 'phone', 4, 7), S('schoonmaken', 'shelf', 'crouch', 4, 8)],
  bakker: [S('kneden', 'home', 'vendor', 8, 14), S('oven', 'home', null, 4, 8), S('uitstallen', 'home', 'vendor', 3, 6)],
  bibliothecaris: [S('uitlenen', 'home', 'vendor', 5, 9), S('wachten', 'home', null, 3, 6), S('terugzetten', 'shelf', 'crouch', 4, 8)],
  // the floor
  klant: [S('kijken', 'shelf', null, 4, 9), S('pakken', 'shelf', 'crouch', 2, 4), S('rondkijken', 'shelf', null, 3, 7), S('afrekenen', 'counterFront', null, 4, 7), S('slenteren', 'wander', null, 1, 2), S('wachten', 'seat', 'sit', 10, 24)],
  knipklant: [S('geknipt worden', 'home', 'sit', 20, 40), S('in de spiegel kijken', 'home', 'sit', 5, 10), S('praten', 'home', 'sit', 10, 20)],
  gast: [S('eten', 'seat', 'sit', 18, 40, DN), S('praten', 'seat', 'sit', 12, 28), S('naar de bar', 'counterFront', null, 3, 6), S('slenteren', 'wander', null, 1, 2)],
  serveerster: [S('bestelling halen', 'counterFront', 'vendor', 2, 4), S('bestelling brengen', 'seat', null, 3, 5), S('afruimen', 'seat', 'crouch', 2, 4), S('slenteren', 'wander', null, 1, 2)],
  medewerker: [S('typen', 'seat', 'sit', 20, 45), S('overleggen', 'seat', 'sit', 10, 20), S('koffie halen', 'machine', null, 4, 7), S('kopiëren', 'machine', null, 3, 6)],
  bezoeker: [S('zitten', 'seat', 'sit', 25, 60), S('knielen', 'seat', 'crouch', 8, 16), S('kaarsje', 'candle', null, 4, 8), S('rondkijken', 'board', null, 4, 8), S('slenteren', 'wander', null, 1, 2)],
  koster: [S('opruimen', 'candle', 'crouch', 4, 8), S('rondkijken', 'board', null, 3, 6), S('slenteren', 'wander', null, 1, 3)],
  lezer: [S('lezen', 'seat', 'phone', 25, 55), S('zoeken', 'shelf', null, 5, 10), S('terugzetten', 'shelf', 'crouch', 2, 4), S('slenteren', 'wander', null, 1, 2)],
  reiziger: [S('wachten', 'seat', 'sit', 12, 28), S('vertrektijden', 'board', null, 4, 9), S('kaartje', 'machine', null, 4, 7), S('slenteren', 'wander', null, 1, 2)],
  monteur: [S('sleutelen', 'work', 'crouch', 8, 15), S('gereedschap', 'work', null, 3, 6), S('onder de auto', 'work', 'crouch', 8, 14), S('slenteren', 'wander', null, 1, 2)],
  bewoner: [S('tv kijken', 'seat', 'sit', 20, 45, AN), S('koken', 'work', 'vendor', 10, 20, DN), S('lezen', 'seat', 'phone', 15, 30), S('slenteren', 'wander', null, 1, 3)],
  student: [S('studeren', 'seat', 'phone', 25, 55, DN), S('koken', 'work', 'vendor', 8, 16, DN), S('gamen', 'seat', 'sit', 20, 45, AN), S('lezen', 'seat', 'phone', 15, 30), S('slenteren', 'wander', null, 1, 3)],
  sporter: [S('hardlopen', 'machine', null, 20, 40), S('gewichten heffen', 'lift', 'crouch', 8, 14), S('uitrusten', 'seat', 'sit', 8, 16), S('water drinken', 'machine', null, 3, 6), S('slenteren', 'wander', null, 1, 2)],
  arts: [S('rondgang', 'wander', null, 2, 5), S('dossier', 'shelf', null, 4, 8), S('overleg', 'home', 'phone', 4, 8), S('handen wassen', 'machine', null, 3, 5)],
  leraar: [S('uitleggen', 'board', null, 8, 16), S('rondlopen', 'wander', null, 2, 5), S('nakijken', 'work', 'sit', 8, 16), S('kastje', 'shelf', null, 3, 6)],
  leerling: [S('opletten', 'seat', 'sit', 25, 55), S('schrijven', 'seat', 'phone', 12, 24), S('kastje', 'shelf', null, 3, 6), S('slenteren', 'wander', null, 1, 3)],
  suppoost: [S('rondkijken', 'board', null, 4, 8), S('vitrine', 'shelf', null, 4, 8), S('slenteren', 'wander', null, 2, 5), S('bankje', 'seat', 'sit', 6, 12)],
  museumbezoeker: [S('vitrine bekijken', 'shelf', null, 6, 12), S('schilderij bekijken', 'board', null, 6, 12), S('bankje', 'seat', 'sit', 8, 16), S('slenteren', 'wander', null, 1, 2)],
  filmbezoeker: [S('wachten op de film', 'seat', 'sit', 25, 60), S('affiche bekijken', 'board', null, 4, 8), S('popcorn halen', 'counterFront', null, 3, 6), S('slenteren', 'wander', null, 1, 2)],
  agent: [S('dossier typen', 'seat', 'sit', 10, 20), S('rondkijken', 'board', null, 4, 8), S('overleg', 'home', 'phone', 4, 8), S('rondgang', 'wander', null, 2, 5)],
  apotheker: [S('recept klaarmaken', 'home', 'vendor', 6, 12), S('schap aanvullen', 'shelf', 'crouch', 4, 8), S('wachten', 'home', null, 3, 6), S('bellen', 'home', 'phone', 4, 7)],
  hotelgast: [S('zitten', 'seat', 'sit', 20, 45), S('lezen', 'seat', 'phone', 15, 30), S('folders bekijken', 'board', null, 4, 8), S('slenteren', 'wander', null, 1, 3)],
  boer: [S('voeren', 'shelf', 'crouch', 6, 12), S('hooi verplaatsen', 'work', 'crouch', 5, 10), S('gereedschap', 'work', null, 3, 6), S('slenteren', 'wander', null, 1, 3)],
  trainer: [S('begeleiden', 'machine', null, 6, 12), S('aanwijzen', 'lift', null, 4, 8), S('slenteren', 'wander', null, 1, 3), S('pauze', 'seat', 'sit', 8, 16)],
};
const FALLBACK = [S('rondkijken', 'shelf', null, 3, 7), S('slenteren', 'wander', null, 1, 3)];
export const scriptOf = (role) => SCRIPTS[role] || FALLBACK;
export const STAFF_ROLES = new Set(['winkelier', 'barman', 'receptionist', 'loketmedewerker', 'baliemedewerker', 'bibliothecaris', 'kapper', 'bakker', 'knipklant', 'agent', 'apotheker']);

// --- anchors: where a kind of activity happens, from the layout --------------------------------------------

const ANCHOR_TYPES = {
  shelf: ['shelf', 'bookcase', 'cabinet', 'fridge', 'gondola', 'rack', 'showcase', 'poster', 'tvwall', 'toolwall', 'wardrobe'],
  seat: ['chair', 'stool', 'bench', 'sofa', 'pew'],
  machine: ['machine', 'copier', 'coffee', 'sink'],
  candle: ['candle', 'altar'],
  board: ['board', 'noticeboard', 'clock', 'painting', 'poster', 'flag'],
  work: ['carlift', 'workbench', 'kitchen', 'sink', 'desk', 'table'],
  lift: ['bench', 'rack', 'rug'],
};
const SEATS = new Set(ANCHOR_TYPES.seat);

// anchors of every kind, validated against a reach map: [{ at, u, v, hu, hv, sit, key, item }]
export function anchorsOf(layout, reach) {
  const out = { shelf: [], seat: [], machine: [], candle: [], board: [], work: [], lift: [], counterFront: [] };
  const ok = (u, v) => reachableAt(reach, u, v, 0.3);
  layout.items.forEach((it, i) => {
    const [dx, dy] = faceDir(it.face), fp = footprint(it);
    for (const [at, types] of Object.entries(ANCHOR_TYPES)) {
      if (!types.includes(it.type)) continue;
      if (it.type === 'poster' && at === 'board' && it.solid) continue;
      if (SEATS.has(it.type)) {
        // you walk up to the front of the seat, then sit down on it
        const fp2 = footprint(it), r1 = (Math.abs(dx) > 0 ? fp2.su : fp2.sv) / 2 + 0.45, r2 = (Math.abs(dx) > 0 ? fp2.sv : fp2.su) / 2 + 0.45;
        const cands = [[dx * r1, dy * r1], [-dx * r1, -dy * r1], [dy * r2, dx * r2], [-dy * r2, -dx * r2]];
        const ap = cands.map(([cu, cv]) => ({ u: it.u + cu, v: it.v + cv })).find((q) => ok(q.u, q.v));
        if (ap) out.seat.push({ at: 'seat', u: it.u, v: it.v, ap, hu: dx, hv: dy, sit: true, key: 'i' + i, item: it });
        continue;
      }
      const half = (Math.abs(dx) > 0 ? fp.su : fp.sv) / 2;
      const u = it.u + dx * (half + 0.5), v = it.v + dy * (half + 0.5);
      if (ok(u, v)) out[at].push({ at, u, v, hu: -dx, hv: -dy, sit: false, key: 'i' + i + at, item: it });
    }
  });
  layout.use.forEach((s, i) => {
    if (!['kopen', 'bestellen', 'balie', 'kaartje'].includes(s.id)) return;
    const [dx, dy] = faceDir(s.face ?? 0);
    if (ok(s.u, s.v)) out.counterFront.push({ at: 'counterFront', u: s.u, v: s.v, hu: dx, hv: dy, sit: false, key: 'u' + i, item: null });
    // a place behind the customer at the counter: the queue
    if (ok(s.u - dx * 0.9, s.v - dy * 0.9)) out.counterFront.push({ at: 'counterFront', u: s.u - dx * 0.9, v: s.v - dy * 0.9, hu: dx, hv: dy, sit: false, key: 'q' + i, item: null, queue: true });
  });
  return out;
}

// --- the actor -----------------------------------------------------------------------------------------------

// shared state of one interior: which anchors are taken; `phase` (interiorcrowd.js phaseOf) is set by the game from the clock
export const makeStage = (layout, grid, reach) => ({ layout, grid, reach, anchors: anchorsOf(layout, reach), taken: new Map(), staffAnchors: new Map() });

// n: the layout person { role, u, v, face, pose }; rnd: a seeded generator; domainReach: reach map the person can walk in (staff: their pocket)
export function makeActor(stage, n, rnd, id, domainReach = null) {
  const staff = STAFF_ROLES.has(n.role);
  const a = {
    id, role: n.role, staff, u: n.u, v: n.v, hu: faceDir(n.face)[0], hv: faceDir(n.face)[1], pose: null, moving: false, act: null, rnd,
    script: scriptOf(n.role), idx: Math.floor(rnd() * scriptOf(n.role).length), state: 'do', t: 1 + rnd() * 3, path: [], anchor: null, home: { u: n.u, v: n.v, hu: faceDir(n.face)[0], hv: faceDir(n.face)[1] },
    reach: domainReach || stage.reach, sit: false,
  };
  // someone who starts seated: begin at that seat
  if (n.pose === 'sit') {
    const s = stage.anchors.seat.find((q) => Math.hypot(q.u - n.u, q.v - n.v) < 0.3);
    a.sit = true; a.pose = 'sit';
    if (s) { stage.taken.set(s.key, id); a.anchor = s; }
    const k = a.script.findIndex((x) => x.at === 'seat');
    if (k >= 0) { a.idx = k; a.act = a.script[k]; a.t = a.act.dur[0] + rnd() * (a.act.dur[1] - a.act.dur[0]); }
  }
  return a;
}

const releaseAnchor = (stage, a) => { if (a.anchor && stage.taken.get(a.anchor.key) === a.id) stage.taken.delete(a.anchor.key); a.anchor = null; };

function pickAnchor(stage, a, at) {
  let list = at === 'counterFront' ? stage.anchors.counterFront : stage.anchors[at] || [];
  if (a.staff && at === 'shelf') list = list.filter((q) => reachableAt(a.reach, q.u, q.v, 0.3)); // staff restock only what they can reach behind the counter
  if (a.staff && at !== 'shelf') return null;
  const free = list.filter((q) => !stage.taken.has(q.key) && reachableAt(a.reach, (q.ap || q).u, (q.ap || q).v, 0.3));
  if (!free.length) return null;
  // not the one we are standing at; random among the nearest few
  free.sort((p, q) => Math.hypot(p.u - a.u, p.v - a.v) - Math.hypot(q.u - a.u, q.v - a.v));
  // (the seat itself is the anchor; walking goes to its front)
  const cand = free.filter((q) => Math.hypot(q.u - a.u, q.v - a.v) > 0.4);
  const pool = (cand.length ? cand : free).slice(0, Math.min(4, (cand.length ? cand : free).length));
  return pool[Math.floor(a.rnd() * pool.length)];
}

function chooseNext(stage, a) {
  if (a.sit && a.anchor && a.anchor.ap) { a.u = a.anchor.ap.u; a.v = a.anchor.ap.v; } // stand up: out of the seat, in front of it
  releaseAnchor(stage, a);
  a.sit = false; a.pose = null;
  for (let tries = 0; tries < a.script.length + 1; tries++) {
    a.idx = (a.idx + 1 + (tries === 0 && a.rnd() < 0.3 ? 1 : 0)) % a.script.length;
    const act = a.script[a.idx];
    if (act.when && stage.phase && !act.when.includes(stage.phase)) continue; // not at this time of day
    a.act = act;
    if (act.at === 'home') {
      // go back to the place behind the counter (or stay)
      a.anchor = null;
      a.path = Math.hypot(a.home.u - a.u, a.home.v - a.v) > 0.3 ? (findPath(stage.grid, a.reach, ...cellOf(stage.grid, a.u, a.v), ...cellOf(stage.grid, a.home.u, a.home.v)) || []) : [];
      a.state = a.path.length ? 'move' : 'do'; a.t = dur(a, act);
      if (a.state === 'do') { a.hu = a.home.hu; a.hv = a.home.hv; a.pose = act.pose; }
      return;
    }
    if (act.at === 'wander') {
      for (let k = 0; k < 8; k++) {
        const ang = a.rnd() * Math.PI * 2, d = 2 + a.rnd() * 6;
        const [i1, k1] = cellOf(stage.grid, a.u + Math.cos(ang) * d, a.v + Math.sin(ang) * d);
        const p = findPath(stage.grid, a.reach, ...cellOf(stage.grid, a.u, a.v), i1, k1);
        if (p && p.length) { a.path = p; a.state = 'move'; a.t = dur(a, act); a.anchor = null; return; }
      }
      continue;
    }
    const an = pickAnchor(stage, a, act.at);
    if (!an) continue;
    const tgt = an.ap || an;
    const p = findPath(stage.grid, a.reach, ...cellOf(stage.grid, a.u, a.v), ...cellOf(stage.grid, tgt.u, tgt.v));
    if (!p) continue;
    stage.taken.set(an.key, a.id);
    a.anchor = an; a.path = p; a.state = 'move'; a.t = dur(a, act);
    if (!p.length) { a.state = 'do'; arrive(a); }
    return;
  }
  a.state = 'do'; a.t = 2 + a.rnd() * 3; a.act = null;
}
const dur = (a, act) => act.dur[0] + a.rnd() * (act.dur[1] - act.dur[0]);
const cellOf = (g, u, v) => [Math.floor((u - g.H.u0) / CELL), Math.floor((v - g.H.v0) / CELL)];
function arrive(a) {
  a.state = 'do';
  if (a.anchor) { a.hu = a.anchor.hu; a.hv = a.anchor.hv; if (a.anchor.sit) { a.u = a.anchor.u; a.v = a.anchor.v; } }
  a.sit = !!(a.anchor && a.anchor.sit);
  a.pose = a.act && a.act.pose ? a.act.pose : a.sit ? 'sit' : null;
  if (a.sit && a.pose !== 'sit' && a.pose !== 'phone' && a.pose !== 'crouch') a.pose = 'sit';
  a.moving = false;
}

// advance by dt; returns the actor (u, v, hu, hv, pose, moving, sit, act)
export function stepActor(stage, a, dt) {
  if (a.state === 'do') {
    a.moving = false;
    a.t -= dt;
    if (a.t <= 0) chooseNext(stage, a);
    return a;
  }
  // move along the path
  a.sit = false; a.pose = null;
  let left = SPEED * dt;
  while (left > 1e-9 && a.path.length) {
    const [tu, tv] = a.path[0], du = tu - a.u, dv = tv - a.v, L = Math.hypot(du, dv);
    if (L < 1e-6) { a.path.shift(); continue; }
    a.hu = du / L; a.hv = dv / L;
    const s = Math.min(left, L);
    a.u += a.hu * s; a.v += a.hv * s; left -= s;
    if (s >= L - 1e-9) a.path.shift();
  }
  a.moving = a.path.length > 0 || left < SPEED * dt - 1e-9;
  if (!a.path.length) {
    if (a.act && a.act.at === 'wander') { a.state = 'do'; a.t = dur(a, a.act); a.moving = false; a.pose = null; }
    else if (a.act && a.act.at === 'home') { a.state = 'do'; a.hu = a.home.hu; a.hv = a.home.hv; a.pose = a.act.pose; a.t = dur(a, a.act); a.moving = false; }
    else { arrive(a); a.t = a.act ? dur(a, a.act) : 3; }
  }
  return a;
}

export { rectOf };
