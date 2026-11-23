// De ene meldingenwachtrij (eigenaarsbesluit 22-11, voortgebouwd op de meldingenpoort van #990/#1069): alle meldingen van het spel
// (kaarten, prestaties, telefoon, naamkaart, radio, ontdekking, kaartonthulling, menumelding) komen hier langs. Rustig betekent:
//   - hooguit EEN melding tegelijk zichtbaar (een slot); de rest wacht met prioriteit;
//   - nooit tijdens een laadscherm, opstart, cutscene, dialoog, missiestart of -einde of een schermvullende kaart (de holds);
//   - wacht er te veel (MAX_WAITING), dan vouwt het laagste samen tot "en N meer" op de volgende melding;
//   - wat te lang wacht (MAX_AGE_S) vervalt, behalve prestaties en wat `keep` zegt: die gaan nooit verloren. Tips en hints
//     (soft) vervallen altijd, ook als hun kaart `keep` zegt: een tip die te laat komt is geen uitleg meer;
//   - prestaties vervallen niet, maar meer dan MAX_COLLAPSE wachtende van een soort met `collapse` worden een kaart "N nieuwe
//     prestaties" (de prestatie zelf blijft geregistreerd en staat in het menu): geen eindeloze rij;
//   - een harde bovengrens (MAX_TOTAL): de oudste van de laagste prioriteit valt af, nooit gevaar, politie, wanted of missie;
//   - nooit meer dan een melding per MIN_GAP_S (4 s), behalve gevaar, politie, wanted en missie; na een hold loopt de rij zo rustig leeg;
//   - de speler kan de lopende melding wegdrukken (dismissNotice: toets Delete, op de controller LB+RB);
//   - Samen spelen: lokaal per speler, geen netwerkverkeer; een gast en de opener houden elk hun eigen wachtrij.
// Puur: geen DOM; de tellers en probes komen van buiten. De DOM-kant en de bronnen staan in hudcards.js, achievements.js,
// phonefeed.js, namecard.js, hud_panel.js, mapview.js en menumelding.js; scripts/meldingen_audit.mjs bewaakt dat niets er omheen meldt.
// Test: scripts/notifyqueue_test.mjs.
import { noticeDuration, makeTimer, precedence } from './noticetiming.js';

export const MAX_AGE_S = 20;
export const MAX_WAITING = 4;      // meer dan dit wacht niet: het laagste vouwt samen tot "en N meer"
export const SLOT_GRACE_S = 15;    // een slot met `until` valt na de duur plus dit vrij, ook als de bron nooit klaar meldt
export const MAX_TOTAL = 12;       // harde bovengrens op de rij; boven dit valt het oudste van het laagste af (niet gevaar, politie, wanted, missie)
export const MAX_COLLAPSE = 2;     // meer wachtende prestaties dan dit vouwen samen tot een samenvattingskaart
export const MIN_GAP_S = 4;        // tussen twee meldingen zit minstens dit (gevaar, politie, wanted en missie slaan het over)
const PROTECT_PRIO = 7;     // vanaf deze prio valt een melding nooit af en wacht hij niet op de rust
export const PREEMPT_PRIO = 8;     // een melding met deze prio of hoger kapt een lopende lagere af (gevaar, politie)

// prio: hoger gaat eerst. merge: wachtende meldingen van deze soort smelten samen. expires: valt weg na MAX_AGE_S.
// collapse: meer dan MAX_COLLAPSE wachtende van deze soort (met `summary`) smelten samen tot een samenvattingskaart.
// soft: `keep` van de bron telt niet: deze soort vervalt altijd en vouwt altijd.
// urgent: negeert de hold 'dialogue' (gevaar en politie spreken door een gesprek heen). mission: negeert de hold 'mission'.
export const KINDS = Object.freeze({
  danger: { prio: 9, merge: false, expires: true, urgent: true },
  police: { prio: 9, merge: false, expires: true, urgent: true },
  wanted: { prio: 8, merge: false, expires: true, urgent: true },
  mission: { prio: 7, merge: false, expires: true, mission: true },
  sidejob: { prio: 6, merge: false, expires: true, mission: true },
  achievement: { prio: 4, merge: false, expires: false, collapse: true },
  unlock: { prio: 4, merge: false, expires: false, collapse: true },
  outfit: { prio: 4, merge: false, expires: true },
  vehicle: { prio: 3, merge: true, expires: true },
  goal: { prio: 3, merge: false, expires: true },
  money: { prio: 3, merge: false, expires: true },
  phone: { prio: 3, merge: false, expires: true },
  namecard: { prio: 3, merge: false, expires: true },
  area: { prio: 2, merge: true, expires: true },
  discovery: { prio: 2, merge: true, expires: true },
  reveal: { prio: 2, merge: false, expires: true }, // de onthulling op de kaart: elke streek apart
  radio: { prio: 1, merge: true, expires: true },
  menu: { prio: 1, merge: false, expires: true },
  hint: { prio: 1, merge: true, expires: true, soft: true },
  tip: { prio: 1, merge: false, expires: true, soft: true },
});

// De kaartsoorten van hudcards.js (Nederlandse sleutels in de kaartdata) op de soorten van de wachtrij.
export const CARD_KIND_MAP = Object.freeze({
  politie: 'police', gevaar: 'danger', missie: 'mission', bijbaan: 'sidejob', reis: 'mission',
  geld: 'money', prestatie: 'achievement', tip: 'tip',
});
export const kindForCard = (cardKind) => CARD_KIND_MAP[cardKind] || 'tip';

// Het register van wat het scherm overneemt: naam -> () => bool. Elke module meldt zijn eigen probe aan.
// Bekende namen: loading, startup, cutscene, screen, dialogue, mission.
const holds = new Map();
export function registerNoticeHold(name, fn) { holds.set(name, fn); }
export function unregisterNoticeHold(name) { holds.delete(name); }

// De namen van wat nu vasthoudt (zonder `ignore`). Een falende probe houdt niets vast.
export function noticeHeldBy(ignore = []) {
  const out = [];
  for (const [name, fn] of holds) {
    if (ignore.includes(name)) continue;
    let h = false;
    try { h = !!fn(); } catch (e) { h = false; }
    if (h) out.push(name);
  }
  return out;
}
export const noticeHeld = (ignore = []) => noticeHeldBy(ignore).length > 0;

// Wat een soort zelf mag negeren: urgente soorten het gesprek, missiesoorten het missiescherm.
export function ignoreFor(kind, extra = []) {
  const def = KINDS[kind] || {};
  const out = [...extra];
  if (def.urgent) out.push('dialogue', MISSIE_HOLD);
  if (def.mission) out.push('mission', 'dialogue', MISSIE_HOLD);
  return out;
}

export const moreLabel = (n) => `en ${n} meer`;

// 23-11 (akte 1 op eindniveau, beelden M01-M06): bij de start van M01 stond een tip over de voetbalclub naast de doelbalk. Zolang er een
// missie loopt (missions.js registreert de hold), wachten meldingen die niet bij de missie horen: tips, hints, prestaties, telefoon,
// ontdekkingen. Gevaar, politie, wanted, missie- en bijbaanmeldingen gaan door (ignoreFor), en een kaart die zelf bij de missie hoort
// (spec.missie: de regelkaart, een missietip) ook (hudcards.js geeft dan ignore mee). Tips vervallen (soft); prestaties wachten.
export const MISSIE_HOLD = 'missie-actief';

// opties: held(ignore) => namen die vasthouden (standaard het register), maxAge (s), maxWaiting.
export function createNoticeQueue({ held = noticeHeldBy, maxAge = MAX_AGE_S, maxWaiting = MAX_WAITING, maxTotal = MAX_TOTAL, minGap = MIN_GAP_S, maxCollapse = MAX_COLLAPSE } = {}) {
  let waiting = [];
  let active = null; // { item, timer, held (s) }
  let counter = 0;
  let folded = 0;    // hoeveel meldingen er samengevouwen zijn sinds de laatste die getoond werd
  let sinceShow = Infinity; // seconden sinds de laatste melding in beeld kwam (de rust tussen twee meldingen)
  const stat = { shown: 0, merged: 0, expired: 0, dropped: 0, folded: 0, dismissed: 0, preempted: 0, collapsed: 0, capped: 0 };

  const isHeld = (it) => held(it.ignore).length > 0;
  // ready: de bron zegt zelf of hij nu kan (kaarten volgen de aandachtsregels van hudcards.js); een falende ready telt als klaar
  const notReady = (it) => { if (typeof it.ready !== 'function') return false; try { return !it.ready(it); } catch (e) { return false; } };
  const rankOf = (it) => (Number.isFinite(it.prio) ? it.prio : (KINDS[it.kind] || { prio: 0 }).prio);
  const kindDef = (it) => KINDS[it.kind] || { prio: 0 };
  // nooit verloren: prestaties en wat `keep` zegt, behalve soorten die `soft` zijn (tips: een late tip is geen uitleg meer)
  const neverLost = (it) => { const d = kindDef(it); return d.expires === false || (!!it.keep && !d.soft); };
  const gapOk = (it) => rankOf(it) >= PROTECT_PRIO || sinceShow >= minGap;
  const order = (a, b) => precedence({ prio: rankOf(a), at: a.at }, { prio: rankOf(b), at: b.at });

  function release() { active = null; }
  // een wachtende melding valt weg (vervallen, samengevouwen, gedropt): de bron mag opruimen
  function dropped(it) { if (typeof it.onDrop === 'function') { try { it.onDrop(it); } catch (e) { /* een kapotte melding houdt de rij niet op */ } } }

  function show(it) {
    stat.shown++;
    sinceShow = 0;
    const more = folded; folded = 0;
    it.more = more;
    const slot = it.duration > 0 || typeof it.until === 'function';
    if (slot) {
      active = { item: it, held: 0, timer: it.duration > 0 ? makeTimer(it.duration) : null };
    }
    const handle = { finish: () => { if (active && active.item === it) release(); } };
    try { if (it.show) it.show(it, handle); } catch (e) { /* een kapotte melding houdt de rij niet op */ }
  }

  // Het volgende dat mag: de hoogste precedence (prio, dan de oudste) van wat niet vastgehouden wordt.
  function nextFree() {
    return waiting.filter((it) => !isHeld(it) && !notReady(it) && gapOk(it)).sort(order)[0] || null;
  }

  function advance() {
    while (!active) {
      const it = nextFree();
      if (!it) return;
      waiting = waiting.filter((w) => w !== it);
      show(it);
    }
  }

  // Te veel wachtend: het laagste (dan het nieuwste) vouwt samen, behalve wat nooit verloren mag gaan.
  function fold() {
    while (waiting.length > maxWaiting) {
      const cand = waiting.filter((w) => !neverLost(w)).sort(order).pop();
      if (!cand) return;
      waiting = waiting.filter((w) => w !== cand);
      folded += cand.count; stat.folded += cand.count;
      dropped(cand);
    }
  }

  // De harde bovengrens: boven maxTotal valt het oudste van de laagste prioriteit af. Gevaar, politie, wanted en missie (prio 7+)
  // en wat nooit verloren mag gaan blijven; zijn dat er zelf te veel, dan blijft de rij langer (die gaan voor).
  function cap() {
    while (waiting.length > maxTotal) {
      const cand = waiting.filter((w) => rankOf(w) < PROTECT_PRIO && !neverLost(w))
        .sort((a, b) => rankOf(a) - rankOf(b) || a.at - b.at)[0];
      if (!cand) return;
      waiting = waiting.filter((w) => w !== cand);
      stat.capped++;
      folded += cand.count; stat.folded += cand.count;
      dropped(cand);
    }
  }

  // Een stroom prestaties: meer dan maxCollapse wachtende van een soort met `collapse` en een `summary` worden een samenvattingskaart.
  // summary(n, items) geeft de velden van de samenvatting terug (text, show, until, ...); n is het totaal. De prestaties zelf blijven geregistreerd.
  function collapse(kind) {
    if (!(KINDS[kind] || {}).collapse) return;
    const group = waiting.filter((w) => w.kind === kind && typeof w.summary === 'function');
    if (group.length <= maxCollapse) return;
    const total = group.reduce((a, w) => a + w.count, 0);
    const last = group[group.length - 1];
    let spec = null;
    try { spec = last.summary(total, group); } catch (e) { spec = null; }
    if (!spec) return;
    const at = Math.min(...group.map((w) => w.at));
    waiting = waiting.filter((w) => !group.includes(w));
    for (const w of group) dropped(w);
    const sum = { ...spec, kind, key: spec.key || kind + '-samen', ignore: last.ignore, at, age: 0, count: total, prio: last.prio, summary: last.summary };
    sum.duration = Number.isFinite(spec.duration) ? spec.duration : noticeDuration({ tekst: spec.text || '' });
    waiting.push(sum);
    stat.collapsed += group.length;
  }

  return {
    // kind: sleutel van KINDS. m: { key, text, duration?, show(item, handle), until?(), cut?(), ready?(), ignore?: [holdnamen], prio?, keep?, maxAge?, maxHold?, surface?, onDrop?, summary?(n, items) }
    // duration 0 zonder until neemt geen slot (de onthulling op de kaart). until: de bron meldt zelf wanneer hij klaar is.
    // cut: de bron kan zijn melding afbreken (wegdrukken of een urgentere melding). Geeft 'shown', 'waiting' of 'merged'.
    push(kind, m = {}) {
      const def = KINDS[kind] || { prio: 0, merge: false, expires: true };
      const it = { ...m, kind, key: m.key || m.text || kind, ignore: ignoreFor(kind, m.ignore || []), at: ++counter, age: 0, count: 1, prio: m.prio };
      it.duration = Number.isFinite(m.duration) ? m.duration : noticeDuration({ tekst: m.text || '' });
      // dezelfde sleutel ververst wat wacht (geen stapeling)
      const same = waiting.findIndex((w) => w.kind === kind && w.key === it.key);
      if (same >= 0) { it.count = waiting[same].count; waiting[same] = it; stat.merged++; return 'merged'; }
      // een urgente melding kapt een lopende lagere af
      if (active && rankOf(it) >= PREEMPT_PRIO && rankOf(active.item) < rankOf(it) && typeof active.item.cut === 'function' && !isHeld(it)) {
        try { active.item.cut(active.item); } catch (e) { /* idem */ }
        stat.preempted++;
        release();
      }
      if (!active && !waiting.length && !isHeld(it) && !notReady(it) && gapOk(it)) { show(it); return 'shown'; }
      if (def.merge) {
        const i = waiting.findIndex((w) => w.kind === kind);
        if (i >= 0) {
          const old = waiting[i];
          // de belangrijkste wint; bij gelijke prio de laatste. Het aantal telt mee.
          const winner = (Number.isFinite(old.prio) && Number.isFinite(it.prio) && old.prio > it.prio) ? old : it;
          winner.count = old.count + it.count;
          waiting[i] = winner;
          stat.merged++;
          return 'merged';
        }
      }
      waiting.push(it);
      collapse(kind);
      fold();
      cap();
      advance();
      return waiting.includes(it) ? 'waiting' : 'shown';
    },

    // dtS: seconden sinds de vorige tik. Veroudert, laat vervallen, laat het lopende slot aflopen en geeft het volgende vrij.
    tick(dtS) {
      const dt = Number.isFinite(dtS) && dtS > 0 ? dtS : 0;
      for (const it of waiting) it.age += dt;
      sinceShow += dt;
      const before = waiting.length;
      const gone = waiting.filter((it) => !neverLost(it) && it.age > (Number.isFinite(it.maxAge) ? it.maxAge : maxAge));
      if (gone.length) { waiting = waiting.filter((it) => !gone.includes(it)); for (const it of gone) dropped(it); }
      stat.expired += before - waiting.length;
      if (active) {
        const it = active.item;
        const heldNow = isHeld(it);
        if (active.timer) active.timer.tik(dt, { pauze: heldNow });
        if (!heldNow) active.held += dt;
        let done = false;
        if (typeof it.until === 'function') {
          try { done = !!it.until(it); } catch (e) { done = true; }
          if (!done && active.held > (Number.isFinite(it.maxHold) ? it.maxHold : (it.duration || 0) + SLOT_GRACE_S)) done = true;
        } else if (active.timer && active.timer.klaar) done = true;
        if (done) release();
      }
      advance();
    },

    // De speler drukt de lopende melding weg: de bron breekt hem af (cut) en de volgende komt. Geeft true als er iets weg is.
    dismiss() {
      if (!active) return false;
      const it = active.item;
      if (typeof it.cut === 'function') { try { it.cut(it); } catch (e) { /* idem */ } }
      stat.dismissed++;
      release();
      advance();
      return true;
    },

    // Laat wachtende meldingen vallen (na een savegame of een laadpoort): alleen de genoemde soorten, anders alles behalve wat nooit verloren mag gaan.
    drop(kinds = null) {
      const before = waiting.length;
      const gone = waiting.filter((it) => !(kinds ? !kinds.includes(it.kind) : neverLost(it)));
      waiting = waiting.filter((it) => !gone.includes(it));
      for (const it of gone) dropped(it);
      stat.dropped += before - waiting.length;
    },

    // Is er een melding van deze soort die loopt of wacht? (de bronnen die op een lege HUD wachten)
    hasSurface(surface) { return (!!active && active.item.surface === surface) || waiting.some((w) => w.surface === surface); },
    // staat er nu een melding in het slot (zichtbaar)? Een filmmoment wacht daarop.
    shown() { return !!active; },
    has(kind) { return (!!active && (!kind || active.item.kind === kind)) || waiting.some((w) => !kind || w.kind === kind); },
    busy() { return !!active || waiting.length > 0; },
    reset() { waiting = []; active = null; counter = 0; folded = 0; sinceShow = Infinity; },
    state() {
      return {
        waiting: waiting.map((w) => ({ kind: w.kind, key: w.key, count: w.count, age: w.age })),
        active: active ? active.item.key : null,
        activeKind: active ? active.item.kind : null,
        folded,
        ...stat,
      };
    },
  };
}

// De ene wachtrij van dit spel (per apparaat, dus per speler). Zelf aangedreven: elke 250 ms een tik met de echte tijd.
export const noticeQueue = createNoticeQueue();
export const enqueueNotice = (kind, m) => noticeQueue.push(kind, m);
export const dismissNotice = () => noticeQueue.dismiss();

let timer = null;
let gamepadHeld = false;
// Wegdrukken: toets Delete, op de controller LB en RB samen (geen van beide doet iets zolang je ze samen indrukt).
function gamepadChord() {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return false;
  try {
    for (const p of navigator.getGamepads() || []) {
      if (p && p.buttons && p.buttons[4] && p.buttons[5] && p.buttons[4].pressed && p.buttons[5].pressed) return true;
    }
  } catch (e) { /* geen pad */ }
  return false;
}
export function runNoticeQueue() {
  if (timer || typeof setInterval !== 'function') return;
  let last = Date.now();
  timer = setInterval(() => {
    const now = Date.now();
    noticeQueue.tick((now - last) / 1000);
    last = now;
    const chord = gamepadChord();
    if (chord && !gamepadHeld) noticeQueue.dismiss();
    gamepadHeld = chord;
  }, 250);
  if (timer && timer.unref) timer.unref();
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('keydown', (e) => {
      // typen gaat voor: in een tekstveld (ook dat van het schermtoetsenbord) blijft Delete gewoon Delete
      const el = e.target;
      if (el && el.nodeType === 1 && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return;
      if (e.key === 'Delete' && !e.repeat && noticeQueue.dismiss()) e.preventDefault();
    });
  }
}
