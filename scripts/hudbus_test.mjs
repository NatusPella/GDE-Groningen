// Logic test for the one planner (game/js/hudbus.js): the priority table, the
// three rule sets and the single mayShow question. node scripts/hudbus_test.mjs
import * as B from '../game/js/hudbus.js';
import * as A from '../game/js/attention.js';
import * as R from '../game/js/hudrules.js';

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };

// one table feeds both scales, and the old modules re-export it
ok(A.CARD_PRIORITY === B.CARD_PRIORITY && R.CARD_P === B.CARD_P, 'old modules share the table');
ok(B.CARD_PRIORITY.missie > B.CARD_PRIORITY.politie && B.CARD_PRIORITY.politie > B.CARD_PRIORITY.geld && B.CARD_PRIORITY.geld > B.CARD_PRIORITY.tip, 'level order');
ok(B.CARD_PRIORITY.call === undefined && B.CARD_P.call === B.P1, 'phone items have a P but no level');
ok(B.cardPrio('onbekend') === B.P3 && B.cardZone('prestatie') === 'E' && B.cardZone('tip') === 'A', 'defaults and zones');
for (const [k, v] of Object.entries(B.KINDS)) if (v.level) ok(B.LEVEL[v.level] > 0, `level of ${k}`);

// HUD: P0/P1 always, busy holds P3 and zone-A P2, dialogue holds P3
ok(B.mayShow('hud', { p: B.P0, busy: true }) && B.mayShow('hud', { p: B.P1, busy: true }), 'P0/P1 pass');
ok(!B.mayShow('hud', { p: B.P3, busy: true }) && !B.mayShow('hud', { p: B.P2, busy: true, zone: 'A' }) && B.mayShow('hud', { p: B.P2, busy: true, zone: 'C' }), 'busy');
ok(!B.mayShow('hud', { p: B.P3, dialogue: true }) && B.mayShow('hud', { p: B.P2, dialogue: true, zone: 'A' }) && !B.mayShow('hud', { p: B.P2, dialogue: true, zone: 'E' }), 'dialogue');

// narrative: a fake view
const view = (o = {}) => ({
  isOn: (k) => (o.on || []).includes(k),
  pending: (k) => (o.pending || []).includes(k),
  since: (k) => (o.since && o.since[k]) ?? 100,
  sinceAny: (ks) => Math.min(...ks.map((k) => (o.since && o.since[k]) ?? 100)),
  subtitle: !!o.subtitle,
  toastAgo: o.toastAgo ?? 100,
});
const may = (kind, o, opts) => B.mayShow('narrative', { kind, view: view(o), ...opts });
ok(may('call') && may('card') && may('unknown'), 'quiet: all may start');
ok(!may('call', { on: ['scene'] }) && !may('award', { on: ['scene'] }), 'nothing during a scene');
ok(!may('call', { since: { scene: 1 } }) && may('award', { since: { scene: 1.3 } }), 'talk waits longer after a scene than toasts');
ok(!may('banter', { on: ['call'] }) && !may('contact', { on: ['text'] }), 'one talker; story text finishes first');
ok(!may('banter', { pending: ['contact'] }) && !may('banter', { since: { text: 3 } }), 'banter waits longest');
ok(!may('phone', { on: ['call'] }) && may('card', { on: ['call'] }, { urgent: true }), 'toasts held during a call unless urgent');
ok(!may('award', { subtitle: true }) && !may('award', { toastAgo: 0.5 }) && may('award', { toastAgo: 0.5 }, { urgent: true }), 'subtitle and toast gap');
ok(!may('text', { pending: ['contact'] }), 'story text waits for its contact');

// moments
const last = { any: -Infinity, level: 0, groups: {} };
const mo = (kind, o = {}) => B.mayShow('moment', { kind, now: 1000, busy: false, callOn: false, narrativeBusy: false, speed: 0, last, ...o });
ok(mo('wijk') && mo('onbekend', { busy: true }), 'moment free; unknown kinds are not rationed');
ok(!mo('wijk', { busy: true }) && !mo('wijk', { callOn: true }) && !mo('wijk', { narrativeBusy: true }), 'busy blocks');
ok(!mo('wijk', { speed: 20 }) && mo('crash', { speed: 20 }), 'fast driving blocks calm moments only');
ok(!mo('wijk', { last: { any: 990, level: 0, groups: {} } }), 'global gap');
ok(!mo('wijk', { last: { any: 950, level: B.LEVEL.danger, groups: {} } }) && mo('crash', { last: { any: 950, level: B.LEVEL.discovery, groups: {} } }), 'lower level waits after a higher one');
ok(!mo('crash', { last: { any: 0, level: 0, groups: { crash: 970 } } }), 'group cooldown');

// the message queue: one at a time, ranked, same key replaces
const card = (key, rank, o = {}) => ({ key, rank, important: 0, at: 0, ...o });
let qu = [];
qu = B.enqueueCard(qu, card('tip1', B.LEVEL.tip, { at: 1 }));
qu = B.enqueueCard(qu, card('geld', B.LEVEL.reward, { at: 2 }));
qu = B.enqueueCard(qu, card('politie', B.LEVEL.danger, { at: 3 }));
ok(qu.map((c) => c.key).join() === 'politie,geld,tip1', 'queue ranks danger > reward > tip');
qu = B.enqueueCard(qu, card('tip2', B.LEVEL.tip, { at: 0, important: 1 }));
ok(qu[qu.length - 2].key === 'tip2', 'an important tip goes before a plain one');
qu = B.enqueueCard(qu, card('geld', B.LEVEL.reward, { at: 9 }));
ok(qu.filter((c) => c.key === 'geld').length === 1, 'same key replaces, never stacks');
ok(B.enqueueCard(qu, card('x', B.LEVEL.tip, { at: 99 }), 3).length === 3, 'queue is capped');
ok(B.enqueueCard(qu, card('x', B.LEVEL.story, { at: 99 }), 3)[0].key === 'x', 'a story card survives the cap');

// tips and read-aloud messages go through the same question
ok(B.mayShow('tip', { now: 100, last: -Infinity }) && !B.mayShow('tip', { now: 110, last: 100 }) && B.mayShow('tip', { now: 100 + B.RATION.TIP_GAP, last: 100 }), 'tips: one per gap');
ok(B.mayShow('voice', { kind: 'character', now: 5, voicedAt: { character: 4 } }), 'a character text is always read');
ok(B.mayShow('voice', { kind: 'news', now: 50, voicedAt: {} }) && !B.mayShow('voice', { kind: 'news', now: 60, voicedAt: { news: 50 } }) && B.mayShow('voice', { kind: 'news', now: 50 + B.VOICE_GAP.news, voicedAt: { news: 50 } }), 'news: once per gap');
ok(B.mayShow('onbekend', {}) === true, 'an unknown channel never blocks');

// overlays: a full-screen card holds the small ones (same answers as overlayrules.js)
ok(!B.mayShow('overlay', { name: 'naamkaart', active: ['resultaat'] }) && B.mayShow('overlay', { name: 'naamkaart', active: [] }), 'overlay: a result card holds the name card');
ok(B.mayShow('overlay', { name: 'resultaat', active: ['naamkaart', 'duelbalk'] }), 'overlay: the result card always begins');
ok(!B.mayShow('overlay', { name: 'prestatie', active: ['duelbalk'] }) && B.mayShow('overlay', { name: 'prestatie', active: ['naamkaart'] }), 'overlay: a duel bar holds an achievement, equal rank does not');
for (const [a, list] of Object.entries(B.OVERLAY_HOLDS)) for (const b of list) ok(B.OVERLAY_RANK[a] > B.OVERLAY_RANK[b], `overlay: ${a} outranks ${b}`);

// spoken lines: one at a time, the higher class cuts the lower
const sp = (cls, o = {}) => B.mayShow('speech', { cls, ...o });
ok(sp('react') && sp('story', { clip: { prio: B.SPEECH_PRIO.call, own: false }, hold: { prio: 7 } }), 'speech: free channel; a story line always');
ok(!sp('ambient', { clip: { prio: B.SPEECH_PRIO.react, own: false } }) && sp('ambient', { clip: { prio: 1, own: true } }), 'speech: a clip blocks the lower, not your own');
ok(sp('job', { clip: { prio: B.SPEECH_PRIO.radio } }) && sp('job', { clip: { prio: B.SPEECH_PRIO.react } }) && sp('react', { clip: { prio: B.SPEECH_PRIO.radio } }), 'speech: a bijbaan line cuts the radio and a reaction; any voice cuts the radio');
ok(!sp('react', { clip: { prio: B.SPEECH_PRIO.react } }) && !sp('react', { clip: { prio: B.SPEECH_PRIO.ambient } }) && !sp('banter', { clip: { prio: B.SPEECH_PRIO.call } }), 'speech: an equal or lower class never cuts, nothing cuts a call clip');
ok(!sp('banter', { hold: { prio: B.SPEECH_PRIO.call } }) && sp('call', { hold: { prio: B.SPEECH_PRIO.banter } }), 'speech: a call cuts the banter hold, banter does not cut a call');
ok(!sp('react', { silentFor: 0.2 }) && sp('react', { silentFor: B.SPEECH_GAP.react }) && sp('call', { silentFor: 0 }), 'speech: a gap per class');
ok(sp('onbekend', { silentFor: 1 }) && !sp('onbekend', { silentFor: 0.5 }), 'speech: an unknown class counts as ambient');

// surfaces: the table, and the one question per surface
const S = B.SURFACES;
ok(Object.keys(S).length >= 20, 'surfaces are listed');
ok(B.surfaceP('kaart') === B.P0 && B.surfaceZone('kaart') === 'A' && B.surfaceP('bel') === B.P1 && B.surfaceP('bericht') === B.P1 && B.surfaceZone('prestatie') === 'E', 'surface P and zone come from the card kinds or their own');
ok(B.surfaceP('menu') === null && B.surfaceZone('menu') === null, 'a surface without P or zone says so');
const quiet = { isOn: () => false, pending: () => false, since: () => 100, sinceAny: () => 100, subtitle: false, toastAgo: 100 };
const onCall = { ...quiet, isOn: (k) => k === 'call' };
ok(B.mayShowSurface('prestatie', { narrative: { view: quiet }, overlay: { active: [] } }), 'surface: an achievement shows when quiet');
ok(!B.mayShowSurface('prestatie', { narrative: { view: onCall }, overlay: { active: [] } }), 'surface: an achievement waits for a call');
ok(!B.mayShowSurface('prestatie', { narrative: { view: quiet }, overlay: { active: ['duelbalk'] } }), 'surface: an achievement waits for the duel bar');
ok(!B.mayShowSurface('naamkaart', { overlay: { active: ['keuze'] } }) && B.mayShowSurface('naamkaart', { overlay: { active: ['prestatie'] } }), 'surface: the name card waits for the choice panel');
ok(!B.mayShowSurface('plaatsnaam', { overlay: { active: ['resultaat'] } }), 'surface: the place name waits for the result card');
ok(B.mayShowSurface('bord', { overlay: { active: ['naamkaart'] } }), 'surface: the minigame board is not held by small cards');
ok(B.mayShowSurface('banner', { overlay: { active: ['keuze'] } }), 'surface: the result banner always begins');
ok(B.mayShowSurface('kaart', { narrative: { view: quiet } }) && !B.mayShowSurface('kaart', { narrative: { view: onCall } }) && B.mayShowSurface('kaart', { narrative: { view: onCall, urgent: true } }), 'surface: cards wait for a call unless urgent');
ok(!B.mayShowSurface('kaart', { tip: { now: 110, last: 100 } }) && B.mayShowSurface('kaart', { tip: { now: 120, last: 100 } }), 'surface: the card surface asks the tip ration');
ok(!B.mayShowSurface('autopraat', { speech: { hold: { prio: B.SPEECH_PRIO.call } } }) && B.mayShowSurface('autopraat', { speech: { silentFor: 10 } }), 'surface: car talk waits for a call hold');
const far = { any: -Infinity, level: 0, groups: {} };
const mctx = { moment: { now: 1000, busy: false, callOn: false, narrativeBusy: false, speed: 0, last: far } };
ok(B.mayShowSurface('moment', mctx, 'wijk') && !B.mayShowSurface('moment', { moment: { ...mctx.moment, speed: 20 } }, 'wijk') && B.mayShowSurface('moment', { moment: { ...mctx.moment, speed: 20 } }, 'crash'), 'surface: moments are asked one kind at a time');
ok(B.mayShowSurface('menu') && B.mayShowSurface('onbekend') && B.mayShowSurface('effect', { hud: { busy: true } }), 'surface: no gate, no wait');

console.log(`${n - bad}/${n} hudbus rules ok`);
process.exit(bad ? 1 : 0);
