// The one registry for everything the player can do on the map: the activities
// (activities.js and its minigames), bijbanen (sidejobs.js), the post-game
// challenges (postgame.js) and the Ommelanden uitjes (ommelandfun.js). A kind
// is an adapter over its module, so main.js has one init, one interact and one
// update hook per phase instead of a line per module. The module keeps its own
// internals; adding a new minigame still means adding it to the activities.js
// list (that list is a kind of its own here).
//
// A kind: { id, init(w), interact(w, slot) -> handled, tick(dt, w, phase) }.
// `slot` and `phase` keep the old call order of main.js: interact slots run at
// the spot in the E-key chain where the module used to be called ('pre' before
// padel, 'act' after it, 'job' after the train, 'uitje' after the pigeon spots);
// tick phases are 'world' (with the other world updates) and 'late' (after
// the story and goal). A kind only acts in the slots and phases it lists.
//
// "May this start now?" is not asked here but through playerBusy (busy.js).

const KINDS = [];

export function registerActivityKind(kind) {
  if (!kind || !kind.id || KINDS.some((k) => k.id === kind.id)) return;
  KINDS.push(kind);
}

export function activityKinds() { return KINDS.map((k) => k.id); }

export function initActivityKinds(w, phase) {
  for (const k of KINDS) {
    if (!k.init || (k.initPhase || 'main') !== phase) continue;
    try { k.init(w); } catch (e) { console.error('activity kind', k.id, e); }
  }
}

export function interactActivityKinds(w, slot) {
  for (const k of KINDS) {
    if (k.slot === slot && k.interact) k.interact(w);
  }
}

export function tickActivityKinds(dt, w, phase) {
  // `tickRank` orders ticks within a phase (default 0, registration order on a tie)
  const due = KINDS.filter((k) => k.tickPhase === phase && k.tick).sort((a, b) => (a.tickRank || 0) - (b.tickRank || 0));
  for (const k of due) k.tick(dt, w);
}
