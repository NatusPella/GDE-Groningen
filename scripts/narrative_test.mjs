// Logic test for the narrative scheduler (game/js/narrative.js) on a fake clock:
//   node scripts/narrative_test.mjs
import * as N from '../game/js/narrative.js';

let t = 1000;
N.setNarrativeClock(() => t);
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name, JSON.stringify(N.narrativeState())); } };
const on = {}, wait = {};
for (const k of ['scene', 'contact', 'call', 'text', 'say', 'banter', 'sub-cine', 'sub-banter']) N.registerNarrative(k, { active: () => !!on[k], pending: () => !!wait[k] });
const step = (s) => { t += s; N.updateNarrative(); };

ok(N.mayStart('contact') && N.mayStart('banter') && N.mayStart('card'), 'all clear when nothing plays');

on.scene = true; step(0.1);
for (const k of ['contact', 'call', 'say', 'banter', 'text', 'phone', 'award', 'card']) ok(!N.mayStart(k), `${k} waits during a cutscene`);
ok(!N.mayStart('card', { urgent: true }), 'even a danger card waits during a cutscene');
on.scene = false; step(0); step(1);
ok(!N.mayStart('contact'), 'talk waits a beat after a cutscene');
ok(!N.mayStart('phone'), 'toasts wait a beat after a cutscene');
step(0.5);
ok(N.mayStart('phone') && !N.mayStart('contact'), 'toasts come back before talk');
step(1.2);
ok(N.mayStart('contact'), 'a contact may play 2.5 s after a cutscene');
ok(!N.mayStart('banter'), 'banter waits much longer after a cutscene');

on.contact = true; step(0.1);
ok(!N.mayStart('call') && !N.mayStart('banter') && !N.mayStart('say'), 'one talking item at a time');
ok(!N.mayStart('phone') && !N.mayStart('award') && !N.mayStart('card') && !N.mayStart('text'), 'toasts are held while the radio plays');
ok(N.mayStart('card', { urgent: true }), 'a danger card still shows during a call');
on.contact = false; step(0); step(0.5);
ok(!N.mayStart('call'), 'a gap between two talking items');
step(2);
ok(N.mayStart('call') && N.mayStart('say'), 'the next talking item after the gap');
ok(!N.mayStart('banter'), 'banter waits 8 s after a story contact');
step(6);
ok(N.mayStart('banter'), 'banter after the long gap');

wait.contact = true;
ok(!N.mayStart('text'), 'a story text waits for its "Bel Rikus"');
ok(!N.mayStart('banter') && !N.mayStart('say'), 'banter and the remark wait for a contact that is ready');
ok(N.mayStart('phone'), 'other phone texts do not wait for a waiting contact');
wait.contact = false;
ok(N.mayStart('text'), 'the story text once the contact is gone');

on.text = true; step(0.1);
ok(!N.mayStart('contact') && !N.mayStart('call'), 'a story text being read finishes before a contact');
ok(!N.mayStart('banter'), 'no banter over a story text');
on.text = false; step(0);

N.noteToast();
ok(!N.mayStart('award') && !N.mayStart('card'), 'two toasts never pop up at once');
ok(N.mayStart('card', { urgent: true }), 'an urgent card ignores the toast gap');
step(1.6);
ok(N.mayStart('award'), 'the next toast after the gap');

on.banter = true; step(0.1);
ok(N.narrativeBusy(), 'banter counts as busy (no flyovers over car talk)');
ok(!N.mayStart('contact'), 'a contact waits for banter to end (banter.js cuts itself off for a ready contact)');
on.banter = false; step(0); step(2.1);
ok(N.mayStart('contact'), 'the contact after the banter');

step(3);
on['sub-banter'] = true; step(0.1);
ok(!N.mayStart('phone') && !N.mayStart('award') && !N.mayStart('card'), 'no phone, Kiekdoar or HUD card over a subtitle');
ok(N.heldBack(), 'cards that are up step aside while a subtitle shows');
ok(N.mayStart('card', { urgent: true }), 'a danger card still shows over a subtitle');
on['sub-banter'] = false; step(0);
ok(!N.heldBack() && N.mayStart('phone'), 'cards come back after the subtitle');
on.contact = true; step(0.1);
ok(N.heldBack(), 'cards step aside for the radio');
on.contact = false; step(0);

// channel cases (#104): every narrative gate of a surface in hudbus.js is a kind the scheduler knows, and the
// surface gives the same answer as mayStart
{
  const B = await import('../game/js/hudbus.js');
  const kinds = [...new Set(Object.values(B.SURFACES).flatMap((s) => s.gates || []).filter(([c]) => c === 'narrative').map(([, k]) => k))];
  N.noteToast();
  const noted = t;
  // the view the scheduler builds, read back from its own state
  const view = () => {
    const st = N.narrativeState();
    const since = (k) => st.since[k] ?? Infinity;
    return {
      isOn: (k) => st.active.includes(k), pending: (k) => st.pending.includes(k),
      since, sinceAny: (ks) => Math.min(...ks.map(since)),
      subtitle: st.active.some((k) => k.startsWith('sub-')), toastAgo: t - noted,
    };
  };
  const agree = (label) => {
    for (const k of kinds) {
      for (const urgent of [false, true]) {
        const surface = Object.entries(B.SURFACES).find(([, s]) => (s.gates || []).some(([c, kk]) => c === 'narrative' && kk === k))[0];
        ok(B.mayShowSurface(surface, { narrative: { view: view(), urgent } }, k) === N.mayStart(k, { urgent }), `${label}: ${k}${urgent ? ' (urgent)' : ''} surface and mayStart agree`);
      }
    }
  };
  for (const k of Object.keys(on)) on[k] = false;
  for (const k of Object.keys(wait)) wait[k] = false;
  step(100);
  ok(kinds.every((k) => N.mayStart(k)), 'quiet: every surface kind may start');
  agree('quiet');
  on.scene = true; step(0.1); agree('scene'); ok(kinds.filter((k) => k !== 'scene').every((k) => !N.mayStart(k)), 'a scene holds every surface kind');
  on.scene = false; step(10); step(10);
  on.call = true; step(0.1); agree('call'); ok(!N.mayStart('banter') && !N.mayStart('award') && N.mayStart('award', { urgent: true }), 'a call holds banter and toasts, an urgent card still shows');
  on.call = false; step(10);
  on['sub-banter'] = true; step(0.1); agree('subtitle'); ok(!N.mayStart('award') && !N.mayStart('card'), 'a subtitle holds toasts');
  on['sub-banter'] = false; step(10);
  wait.contact = true; step(0.1); agree('contact waits'); ok(!N.mayStart('banter') && !N.mayStart('text'), 'a waiting contact holds banter and the story text');
  wait.contact = false; step(0);
  ok(B.NARRATIVE.KINDS.every((k) => k === 'scene' || kinds.includes(k)), 'every narrative kind belongs to a surface');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
