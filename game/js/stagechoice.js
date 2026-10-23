// The `choice` stage of a stages mission (missions.js): a conversation puzzle at the top of the screen,
// built on the same panel as the text jobs (choicepanel.js). Used by the new arc's akte 4:
//   M18 Wie draaide de camera's uit?   the intake at Wiebelwerk: a wrong answer makes the account manager suspicious
//   M21 Tessa's wagon                  one round, the car or the ball (the ball is the way out: the wagon rolls away)
//   M21 Tammo's friends                every answer fails, the friends leave (designed, not a fail)
//
// st { kind: 'choice', kicker, rounds: [round], wrongFails, wrongText }
//   round  { who, text, rule, options: [option], hold }   who = the speaker shown above the line
//   option { label, ok, reply, fail }                     ok === false counts as wrong; reply is shown after the pick;
//                                                          fail: ends the mission with that reason (the wrong way out)
// Keys 1-3 pick. Nothing here imports game code but the panel; the stage state lives in S (missions.js).
import { menuSound } from './menusound.js';
import { createChoicePanel, keycap } from './choicepanel.js';

const REPLY_S = 2.6;
let panel = null;

const ensure = () => panel || (panel = createChoicePanel('#d9a441'));

export function closeChoice() {
  if (panel) panel.hide();
}

export function enterChoice(S) {
  S.ci = 0;
  S.cphase = 'ask';
  S.wrong = 0;
  S.picks = [];
  S.replyT = 0;
  S.askT = 0;
}

function paint(st, S, round) {
  const total = st.rounds.length;
  const reply = S.cphase === 'reply' ? S.reply : null;
  ensure().set({
    kicker: `${st.kicker || 'Gesprek'}${total > 1 ? ` · ${Math.min(S.ci + 1, total)} VAN ${total}` : ''}`,
    text: (round.who ? `${round.who}: ` : '') + round.text,
    rule: round.time && S.cphase === 'ask' ? `${round.rule ? round.rule + ' · ' : ''}nog ${Math.max(0, Math.ceil(round.time - (S.askT || 0)))} s` : round.rule || '',
    options: round.options.map((o, i) => ({ key: String(i + 1), label: o.label, cls: reply ? (i === S.pickedI ? (o.ok === false ? 'bad' : 'pick') : '') : '' })),
    flash: reply ? reply.text : '',
    bad: !!reply && reply.bad,
    help: reply ? '' : round.options.map((_, i) => keycap(String(i + 1))).join('') + ' kies',
  });
}

// The rules, without the panel: one frame of the stage. `key` is the option key pressed this frame ('1'-'3') or null.
// Returns 'done', { fail: reason } or null; S.cphase is 'ask' or 'reply' (S.reply is the line to show).
export function stepChoice(st, S, key, dt) {
  const round = st.rounds[Math.min(S.ci, st.rounds.length - 1)];
  if (S.cphase === 'ask' && round.time) {
    // an answer under time pressure: the clock picks `timeoutPick` (default the last answer) when it runs out
    S.askT = (S.askT || 0) + dt;
    if (!key && S.askT > round.time) key = String(round.timeoutPick || round.options.length);
  }
  if (S.cphase === 'ask') {
    const i = key ? Number(key) - 1 : -1;
    if (i >= 0 && i < round.options.length) {
      const o = round.options[i];
      S.pickedI = i;
      S.picks.push(i);
      if (o.ok === false) S.wrong++;
      S.reply = { text: o.reply || '', bad: o.ok === false };
      S.cphase = 'reply';
      S.replyT = o.reply ? REPLY_S : 0.5;
      S.pendingFail = o.fail || (st.wrongFails && S.wrong >= st.wrongFails ? st.wrongText || 'je viel door de mand' : null);
    }
    return null;
  }
  S.replyT -= dt;
  if (S.replyT > 0) return null;
  if (S.pendingFail) return { fail: S.pendingFail };
  S.ci++;
  S.askT = 0;
  S.cphase = 'ask';
  return S.ci >= st.rounds.length ? 'done' : null;
}

// per frame while the stage runs (missions.js). Returns 'done', { fail: reason } or null.
export function updateChoice(dt, world, st, S) {
  const p = ensure();
  if (!p.open) p.show();
  world.minigameUntil = world.time + 0.25;
  let key = null;
  if (S.cphase === 'ask') {
    const round = st.rounds[Math.min(S.ci, st.rounds.length - 1)];
    for (let i = 0; i < round.options.length; i++) {
      const k = String(i + 1);
      if (world.input.wasPressed(k)) { world.input.consume(k); key = k; break; }
    }
  }
  if (key) menuSound('select'); // the answer, heard like every menu's choice (#413)
  const r = stepChoice(st, S, key, dt);
  if (r) { closeChoice(); return r; }
  paint(st, S, st.rounds[Math.min(S.ci, st.rounds.length - 1)]);
  return null;
}
