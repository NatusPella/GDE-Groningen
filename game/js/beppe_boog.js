// The Beppe arc at run time (issue #1063): the phase of the house derived from the
// story state and the per-save marks (beppe_boog_rules.js), the invitation, the
// nudges, the quiet news, the rare echoes, and Beppe's figure. The pure rules and
// all text live elsewhere; this file only asks the game and tells the player.
//
// Per save: the marks are the per-save set 'beppe' (achievements.js; saved with the
// prestaties of the save and reset on a load), so a new game starts without
// them. The phase is never stored. A save that is already past the death point is
// in the memory phase from its first frame: the news and the farewell scene are
// skipped (their marks are set silently), after a short grace so that the marks of
// a load that is still coming in are not mistaken for "the first time".
//
// Samen spelen: every player runs this on his own device with his own marks and
// his own story state (the arc is "local per player", docs/COOP-GAST.md); nothing
// goes over the network.

import * as THREE from 'three';
import { getSaveSet, addToSaveSet } from './achievements.js';
import { getStorySave } from './storyquery.js';
import { isMissionCompleted } from './missions.js';
import { MISSION_IDS } from './storyarc.js';
import { playerBusy } from './busy.js';
import { isCinematicActive } from './cinematics.js';
import { showCard } from './hudcards.js';
import { buildPersonMesh } from './models3d_people.js';
import { visitUnlocked, reachedAct } from './beppe_visit_rules.js';
import { MARK, arcPhase, nudgeDue, echoDue } from './beppe_boog_rules.js';
import { NEWS } from './beppe_boog_texts.js';
import { INVITE } from './beppe_visit_texts.js';

const GRACE_S = 4;
let cache = { at: -1e9, unlocked: false, act: 'kop', phase: 'dicht', snap: { done: [], completed: [] } };
let seen = null;         // the phase seen first, and since when
let firstAt = 0;
let nextCheck = 0;

export const marks = () => getSaveSet(MARK.set);
export function mark(w, id) { const r = addToSaveSet(w, MARK.set, id); cache.at = -1e9; return r; }

// The story snapshot that the rules read: finished steps from the story save and the
// missions the chain counts as passed. Cached for a second (the map asks every frame).
function snapshot() {
  let done = [];
  try { done = getStorySave().done || []; } catch (e) { done = []; }
  const completed = [];
  try { MISSION_IDS.forEach((_, i) => { if (isMissionCompleted(i)) completed.push(i); }); } catch (e) { /* no chain yet */ }
  return { done, completed };
}

export function visitStatus(now = (typeof performance !== 'undefined' ? performance.now() : 0)) {
  if (now - cache.at > 1000) {
    const snap = snapshot();
    cache = { at: now, unlocked: visitUnlocked(snap), act: reachedAct(snap), phase: arcPhase(snap, marks()), snap };
  }
  return cache;
}
export function resetArc() {
  cache = { at: -1e9, unlocked: false, act: 'kop', phase: 'dicht', snap: { done: [], completed: [] } };
  seen = null; firstAt = 0; nextCheck = 0;
}

const calm = (w) => !playerBusy(w).busy && !isCinematicActive() && !w.cameraOverride && !w.paused && !w.uiPaused;

// Outside the house, about once a second: the invitation, the nudges, the news and the echoes.
export function arcTick(w, now = (typeof performance !== 'undefined' ? performance.now() : 0)) {
  if (!w || now < nextCheck) return;
  nextCheck = now + 1000;
  const st = visitStatus(now);
  if (!st.unlocked) return;
  const m = marks();
  if (seen == null) { seen = st.phase; firstAt = now; }
  // a save that is already past the death point: the memory from the first frame, silently
  if (st.phase === 'herinnering' && seen === 'herinnering' && !m.has(MARK.farewell)) {
    if (now - firstAt > GRACE_S * 1000) { mark(w, MARK.news); mark(w, MARK.farewell); }
    return;
  }
  if (!calm(w) || !w.phoneNotifications) return;
  // the invitation, once per save
  if (st.phase === 'levend' && !m.has('uitnodiging')) {
    mark(w, 'uitnodiging');
    w.phoneNotifications.push({ from: INVITE.from, text: INVITE.text, duration: 9 });
    showCard(w, { kind: 'tip', kicker: 'Beppe', title: INVITE.card.title, body: INVITE.card.body, duration: 8, key: 'beppe-uitnodiging', voice: false });
    return;
  }
  // the death point passed while playing: the quiet news, once
  if (st.phase === 'herinnering' && seen !== 'herinnering' && now - firstAt > GRACE_S * 1000 && !m.has(MARK.news)) {
    mark(w, MARK.news);
    seen = 'herinnering';
    w.phoneNotifications.push({ from: NEWS.from, text: NEWS.text, duration: 12 });
    showCard(w, { kind: 'tip', kicker: NEWS.card.kicker, title: NEWS.card.title, body: NEWS.card.body, duration: 12, key: 'beppe-nieuws', voice: false, important: true });
    return;
  }
  const nudge = nudgeDue(st.snap, m, st.phase);
  if (nudge) { mark(w, nudge.key); w.phoneNotifications.push({ from: nudge.from, text: nudge.text, duration: 9 }); return; }
  const echo = echoDue(st.snap, m, st.phase);
  if (echo && m.has(MARK.farewell)) { mark(w, MARK.echo(echo.id)); w.phoneNotifications.push({ from: echo.from, text: echo.text, duration: 9 }); }
}

// --- Beppe herself: a small old woman in a cardigan, at the stove or by the table ------

const BEPPE_LOOK = {
  shirt: 0x7a8f6a, skin: 0xecc8a8, hair: 0xd8d4cc, variant: 'female', pants: 0x3a3a42, shoes: 0x4a3426, hairStyle: 'bun', seed: 1311,
  look: { top: 'cardigan', topColor: 0x7a8f6a, under: 0xf4f1ea, glasses: true, shades: false, scarf: false, bottom: 'skirt', shoeType: 'leather', age: 'old', build: 'avg', heightScale: 0.93, hat: null, bag: null, umbrella: null },
};

export function buildBeppeFigure() {
  try {
    const m = buildPersonMesh(BEPPE_LOOK.shirt, BEPPE_LOOK.skin, BEPPE_LOOK);
    m.name = 'beppe-figuur';
    return m;
  } catch (e) {
    return new THREE.Group();
  }
}
