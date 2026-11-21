// The `timing` stage of a stages mission (missions.js): a short run of timing presses on the same panel as
// the `choice` stage (choicepanel.js), so a story peak is played and not only watched. Used by the new arc:
//   M18 the server room    slip past the cameras: press when the sweep is in the dark zone
//   M20 the moat           the fierljep duel with Durk and Douwe: run-up, grab, climb (the best of the rounds counts)
//   M21 Tessa's wagons     jump from wagon to wagon of the moving goods train
//
// st { kind: 'timing', kicker, help, rounds: [round], failAt, failText, goodAt, tagGood, tagLow }
//   round { text, speed (sweeps per second), zone: [from, to] (0-1 on the bar), ok, bad (replies shown after the press) }
//   failAt: this many misses end the mission with failText; omitted: a miss only costs (the story goes on)
//   gebaar: true (#962): geen naald en geen zone, een druk (of na GEBAAR_AUTO seconden vanzelf) is altijd raak: het stuk is een gebaar in de
//           scène (de sprong, de aanloop) en geen proef; de teksten van `ok` komen als vertelling, de tags blijven de goede
//   Instellingen › Quicktime-events (qte.js, #962): Makkelijk (standaard) maakt de naald langzamer en de zone ruimer, laat een ronde weg bij drie of meer,
//           geeft een poging extra en laat een misser nooit de missie kosten; Overslaan speelt één ronde als gebaar; Normaal is de oude balk.
//   goodAt: hits needed for tagGood, fewer give tagLow (tags land in chain.tags, see missions.js consequenceAdjust)
// Space, E or F press. Nothing here imports game code but the panel; the stage state lives in S (missions.js).
import { createChoicePanel, keycap } from './choicepanel.js';
import { neemTimingDruk } from './coopgast.js'; // de toets van een gast bij de gastheer (#525)
import { timingGrace, widenZone, graceHint } from './timingassist.js'; // #957: ruimere zone per stand en hulp
import { qtePas, qteStandVan, qteKanFalen, qteTip } from './qte.js'; // #962: Normaal / Makkelijk / Overslaan, per speler
import { uitlegModel, uitlegHtml, uitlegIconenAan, zetUitlegGlyph } from './uitleg.js'; // #989: het toetsplaatje met een druk-lus als prompt

const REPLY_S = 1.5;
export const GEBAAR_AUTO = 5; // s: een gebaar loopt vanzelf door als er niet gedrukt wordt
let panel = null;
const ensure = () => panel || (panel = createChoicePanel('#7fb6e6'));

export function closeTiming() {
  if (panel) panel.hide();
}

// #957: de zone wordt ruimer per moeilijkheidsstand en hulp (opts.mode, opts.settings).
// Zonder die twee blijft de standaardmaat gelden, maar altijd ruimer dan de oude balk.
export function enterTiming(S, st, on, opts = {}) {
  S.grace = timingGrace(opts.mode, opts.settings);
  // #962: de quicktime-stand van deze speler; zonder instellingen (een test) blijft het de oude balk
  const q = qtePas(st, qteStandVan(opts.settings));
  S.qte = q.stand; S.goodAt = q.goodAt; S.extra = q.extraMissers; S.auto = q.overslaan ? q.auto : GEBAAR_AUTO;
  // een ronde met zoneIf krijgt een nog ruimere zone als die keuze gemaakt is (M26: de bondgenoot van M23)
  S.rounds = st && Array.isArray(st.rounds)
    ? q.rounds.map((r) => {
      const zone = widenZone(r.zone, S.grace * q.zoneFactor);
      return r.zoneIf && on && on(r.zoneIf)
        ? { ...r, zone: widenZone([zone[0] - 0.09, zone[1] + 0.09], 1), ok: r.okIf || r.ok }
        : { ...r, zone };
    })
    : null;
  S.gebaar = !!(st && st.gebaar) || q.overslaan;
  S.ti = 0;
  S.hits = 0;
  S.miss = 0;
  S.tipGezien = false;
  S.tphase = 'ask';
  S.needleT = 0;
  S.replyT = 0;
  S.treply = null;
}

// where the needle is (0-1) after `t` seconds of this round
export const needleAt = (round, t) => 0.5 + 0.5 * Math.sin(t * (round.speed || 0.7) * Math.PI * 2 - Math.PI / 2);
export const inZone = (round, v) => v >= round.zone[0] && v <= round.zone[1];

// The rules, without the panel: one frame. `press` is true when a key was hit this frame, or { hit } when the
// caller already judged the press (a guest's press is judged on the bar he saw, #525).
// Returns 'done', { fail: reason } or null; S.tphase is 'ask' or 'reply' (S.treply is the line to show).
export function stepTiming(st, S, press, dt) {
  const rondes = S.rounds || st.rounds;
  const round = rondes[Math.min(S.ti, rondes.length - 1)];
  if (S.tphase === 'ask') {
    S.needleT += dt;
    const gebaar = S.gebaar !== undefined ? !!S.gebaar : !!st.gebaar;
    if (!press && !(gebaar && S.needleT >= (S.auto || GEBAAR_AUTO))) return null;
    const hit = gebaar ? true : typeof press === 'object' ? !!press.hit : inZone(round, needleAt(round, S.needleT));
    if (hit) S.hits++;
    else {
      S.miss++;
      if (!S.tipGezien && qteTip(S.qte || 'normaal', S.miss)) S.tipGezien = true; // #962: bij de tweede misser eenmaal de uitweg in beeld (paint)
      // #962: een gemiste druk maakt de volgende poging makkelijker (ruimere
      // zone, langzamere naald) in plaats van het verhaal meteen te laten
      // mislukken. Alleen de kopie van deze ronde wordt aangepast.
      const r = S.rounds && S.rounds[S.ti];
      if (r) { r.zone = widenZone(r.zone, 1.35); r.speed = Math.max(0.35, (r.speed || 0.7) * 0.85); }
    }
    S.treply = { text: (hit ? round.ok : round.bad) || '', bad: !hit };
    S.tphase = 'reply';
    S.replyT = REPLY_S;
    // #962: één misser extra voordat een verhaalstap mislukt; de QTE blijft
    // een kort moment, geen poortwachter.
    // Makkelijk en Overslaan: nooit een afloop, alleen de lage tag (qteKanFalen); Makkelijk geeft daarnaast een poging extra.
    S.pendingFail = st.failAt && qteKanFalen(S.qte || 'normaal') && S.miss >= st.failAt + 1 + (S.extra || 0) ? st.failText || 'het lukte niet' : null;
    return null;
  }
  S.replyT -= dt;
  if (S.replyT > 0) return null;
  if (S.pendingFail) return { fail: S.pendingFail };
  S.ti++;
  S.tphase = 'ask';
  S.needleT = 0;
  return S.ti >= rondes.length ? 'done' : null;
}

// the tag a finished stage earns: enough hits is good
export function timingTag(st, S) {
  if (!st.tagGood && !st.tagLow) return null;
  return S.hits >= (S.goodAt ?? st.goodAt ?? (S.rounds || st.rounds).length) ? st.tagGood || null : st.tagLow || null;
}

// #962 #989: de prompt is een toetsplaatje dat zakt (de lus van uitleg.js) en de voortgang staat als stippen (gedaan, nu, nog te gaan), niet alleen als tekst
function promptHtml(st, S, tekst) {
  const rondes = S.rounds || st.rounds;
  const stippen = '<span class="cw-pips" role="img" aria-label="Ronde ' + Math.min(S.ti + 1, rondes.length) + ' van ' + rondes.length + '">' + rondes.map((_, i) => '<i class="cw-pip' + (i < S.ti ? ' is-klaar' : i === S.ti ? ' is-nu' : '') + '"></i>').join('') + '</span>';
  if (!uitlegIconenAan()) return keycap('SPATIE') + ' ' + tekst + stippen;
  zetUitlegGlyph(() => keycap('SPATIE'));
  return uitlegHtml(uitlegModel([{ toets: 'SPATIE', animatie: 'druk', tekst }]), { compact: true, titel: false }) + stippen;
}

function paint(st, S, round) {
  const reply = S.tphase === 'reply' ? S.treply : null;
  const rondes = S.rounds || st.rounds;
  const gebaar = S.gebaar !== undefined ? !!S.gebaar : !!st.gebaar;
  ensure().set({
    kicker: `${st.kicker || 'Timing'} · ${Math.min(S.ti + 1, rondes.length)} VAN ${rondes.length}`,
    text: round.text,
    rule: '',
    options: [],
    meter: gebaar ? null : { v: needleAt(round, S.needleT), from: round.zone[0], to: round.zone[1] },
    nr: Math.min(S.ti + 1, rondes.length),
    flash: reply ? reply.text : '',
    bad: !!reply && reply.bad,
    help: reply ? '' : promptHtml(st, S, S.qte === 'overslaan' ? 'Het verhaal gaat zo door' : `${st.help || 'druk als de streep in het groen is'}${!gebaar && graceHint(S.grace) ? ` · ${graceHint(S.grace).toLowerCase()}` : ''}`) + (S.tipGezien ? '<span class="cw-tip">' + qteTip(S.qte || 'normaal', 99) + '</span>' : ''),
  });
}

// per frame while the stage runs (missions.js). Returns 'done', { fail: reason } or null.
export function updateTiming(dt, world, st, S) {
  const p = ensure();
  if (!p.open) p.show();
  world.minigameUntil = world.time + 0.25;
  let press = false;
  if (S.tphase === 'ask') {
    // Samen spelen (#525): een gast ziet de balk en drukt mee. Zijn druk komt uit de wachtrij van de gastheer met de
    // ronde en de naaldstand die hij zag, en wordt daarmee beoordeeld: een goede druk telt ook als hij pas een beeld
    // later aankomt. Een druk uit een ronde die al voorbij is valt weg (neemTimingDruk), zodat hij de opdracht van
    // de gastheer niet kan laten mislukken (failAt).
    const rondes = S.rounds || st.rounds;
    const round = rondes[Math.min(S.ti, rondes.length - 1)];
    const gebaar = S.gebaar !== undefined ? !!S.gebaar : !!st.gebaar;
    const vanGast = neemTimingDruk(world, S.ti + 1);
    if (vanGast.length && gebaar) press = { hit: true };
    else if (vanGast.length) press = { hit: vanGast.some((d) => inZone(round, Number.isFinite(d.v) ? d.v : needleAt(round, S.needleT))) };
    else for (const k of [' ', 'e', 'f']) if (world.input.wasPressed(k)) { world.input.consume(k); press = true; }
  }
  const r = stepTiming(st, S, press, dt);
  if (r) { closeTiming(); return r; }
  const rondes2 = S.rounds || st.rounds;
  paint(st, S, rondes2[Math.min(S.ti, rondes2.length - 1)]);
  return null;
}
