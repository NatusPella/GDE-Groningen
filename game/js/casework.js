// Three small text jobs for the Stad (batch 2): "BOA voor een dag" (write the
// fine the invented rulebook asks for), "Dossier naar de rechtbank" (carry a file
// to the Gerechtsgebouw and answer the clerk's three questions about it) and
// "Cabaret in de Stadsschouwburg" (heckle a Frisian cabaret act on the beat).
// Pure rules and invented text only (no DOM, no THREE; scripts/casework_test.mjs
// tests them). Every rule, name and act is made up and meant as dry satire of
// fussiness, never of a real person or a real body. Money never blocks: a wrong
// answer only pays less, and every case can be skipped.
import { makeRng } from './minigamekit.js';

const rngOf = (r) => (typeof r === 'function' ? r : makeRng(r || 1));
const pickOf = (list, rng) => list[Math.floor(rng() * list.length)];
export const euroText = (n) => '€' + Math.round(n).toLocaleString('nl-NL');

// --- BOA voor een dag --------------------------------------------------------------------------

// The invented rulebook: terms [{ label, n, unit }] and a flat part.
export const BOA_CASES = [
  { id: 'bel', scene: 'Een student fietst voorbij en laat zijn bel maar doorgaan: vier keer ding-dong, en hij zwaait erbij.',
    rule: 'Vrolijkheidsbesluit: €8 per ding-dong, plus €12 als je er ook bij zwaait.', terms: [{ label: 'ding-dongs', n: 4, unit: 8 }], flat: 12 },
  { id: 'duif', scene: 'Iemand voert de duiven: drie broodkorsten, en vier duiven kijken op.',
    rule: 'Duivenverordening: €20 per broodkorst, plus €5 per duif die opkijkt.', terms: [{ label: 'korsten', n: 3, unit: 20 }, { label: 'duiven', n: 4, unit: 5 }], flat: 0 },
  { id: 'fluiten', scene: 'Een man fluit na tienen een liedje in een straat met vijf lantaarnpalen.',
    rule: 'Fluitverbod: €15 per lantaarnpaal boven de twee, plus €10 voor het liedje.', terms: [{ label: 'palen boven twee', n: 3, unit: 15 }], flat: 10 },
  { id: 'bakfiets', scene: 'Een bakfiets staat op het gras: vier wielen, en in de bak staan twee bloemen.',
    rule: 'Grasbesluit: €6 per wiel, plus €4 per bloem in de bak.', terms: [{ label: 'wielen', n: 4, unit: 6 }, { label: 'bloemen', n: 2, unit: 4 }], flat: 0 },
  { id: 'krat', scene: 'Een kratje zonder deksel: zes flesjes limonade, en geen een met een dopje.',
    rule: 'Kratbesluit: €3 per flesje zonder dopje, plus €14 voor het kratje.', terms: [{ label: 'flesjes', n: 6, unit: 3 }], flat: 14 },
  { id: 'hardlopen', scene: 'Iemand loopt op de markt met acht kilometer per uur, terwijl de limiet zes is.',
    rule: 'Marktsnelheid: €9 per kilometer per uur te hard, plus €11 voor de haast.', terms: [{ label: 'km/u te hard', n: 2, unit: 9 }], flat: 11 },
  { id: 'riem', scene: 'Een hond heeft een groene riem, terwijl zijn baasje een rode jas draagt: twee kleuren die elkaar bijten.',
    rule: 'Kleurenbesluit: €14 per kleur die niet bij elkaar past, plus €6 voor de hond.', terms: [{ label: 'kleuren', n: 2, unit: 14 }], flat: 6 },
  { id: 'terras', scene: 'Een terrasstoel staat vijf centimeter te ver over de lijn, en een tweede doet het ook.',
    rule: 'Terrasmaat: €7 per centimeter, plus €9 per stoel.', terms: [{ label: 'centimeters', n: 5, unit: 7 }, { label: 'stoelen', n: 2, unit: 9 }], flat: 0 },
  { id: 'bank', scene: 'Iemand zit op een bankje dat hij zelf heeft meegenomen, en dat staat midden op het plein.',
    rule: 'Zitbesluit: €25 voor een eigen bankje, plus €5 per poot.', terms: [{ label: 'poten', n: 4, unit: 5 }], flat: 25 },
  { id: 'eierbal', scene: 'Een eierbal wordt ongevraagd gedeeld: drie happen aan drie vrienden.',
    rule: 'Deelbesluit: €5 per hap, plus €7 per vriend die niet had gevraagd.', terms: [{ label: 'happen', n: 3, unit: 5 }, { label: 'vrienden', n: 3, unit: 7 }], flat: 0 },
];

export function boaTotal(c) {
  return c.terms.reduce((a, t) => a + t.n * t.unit, 0) + c.flat;
}

// Three amounts, one right: the others forget a part of the rule or count one too many.
export function boaOptions(c, rng = Math.random) {
  const r = rngOf(rng);
  const right = boaTotal(c);
  const first = c.terms[0];
  const forgot = c.flat > 0 ? right - c.flat : right - first.unit * first.n + first.unit;
  const extra = right + (c.flat || first.unit);
  const set = new Set([right]);
  const list = [{ amount: right, ok: true }];
  for (const a of [forgot, extra, right + 10, Math.max(1, right - 10)]) {
    if (list.length >= 3) break;
    if (a > 0 && !set.has(a)) { set.add(a); list.push({ amount: a, ok: false, kind: a > right ? 'hoog' : 'laag' }); }
  }
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

export function boaVerdict(opt) {
  if (opt && opt.ok) return { kind: 'goed', base: 38, flawless: true };
  return { kind: opt && opt.kind === 'hoog' ? 'hoog' : 'laag', base: 10, flawless: false };
}

export function pickBoaCase(rng = Math.random, last = null) {
  const r = rngOf(rng);
  for (let i = 0; i < 8; i++) { const c = pickOf(BOA_CASES, r); if (!last || c.id !== last) return c; }
  return BOA_CASES[0];
}

export const BOA_SAY = {
  start: ['Goedemorgen. Mag ik even uw bel zien? Ik bedoel: uw gedrag.', 'Een momentje. Ik heb een boekje, en het boekje heeft een mening.', 'Ik zag het. Het boekje zag het ook.'],
  goed: ['Dat is precies wat er in het boekje staat. Ik betaal.', 'Netjes uitgerekend. Ik voel me bijna beschaamd.', 'Zo, dat klopt tot op de cent. Hier is het geld.'],
  hoog: ['Dat is te veel! Ik maak bezwaar.', 'Dat klopt niet, dat staat niet zo in het boekje.'],
  laag: ['Dat is wel heel mild. Is dit een proefboete?', 'Mag het wat meer? Ik voel me bijna beledigd.'],
  skip: ['Laat maar. Een waarschuwing is ook mooi.', 'Dan maar met een knipoog. Fijne dag nog.'],
  quit: 'Je hebt het boekje dichtgeslagen. Dat is ook een besluit.',
};

// --- Dossier naar de rechtbank ------------------------------------------------------------------

export const DOSSIERS = [
  { id: 'eend', title: 'De zaak van de eend', facts: ['De verdachte heet Kees en is een eend.', 'Het ging om een fietspad langs de gracht.', 'Het was kwart over drie, bij warm weer.'],
    questions: [
      { q: 'Hoe heet de verdachte?', options: ['Kees', 'Henk', 'Piet'], ok: 0 },
      { q: 'Waar speelde het zich af?', options: ['Op een plein', 'Op een fietspad langs de gracht', 'In een park'], ok: 1 },
      { q: 'Hoe laat was het?', options: ['Kwart over drie', 'Half acht', 'Middernacht'], ok: 0 },
    ] },
  { id: 'fiets', title: 'De zaak van het zadel', facts: ['Het ging om een zadel zonder fiets.', 'De eigenaar heet mevrouw Hoekstra-Jansen.', 'Het zadel is gevonden in een vuilcontainer.'],
    questions: [
      { q: 'Wat was er verdwenen?', options: ['Een stuur', 'Een zadel', 'Een bel'], ok: 1 },
      { q: 'Wie is de eigenaar?', options: ['Meneer Bakker', 'Mevrouw Hoekstra-Jansen', 'De gemeente'], ok: 1 },
      { q: 'Waar is het gevonden?', options: ['In een vuilcontainer', 'In het water', 'Op het dak'], ok: 0 },
    ] },
  { id: 'bank', title: 'De zaak van het bankje', facts: ['Het bankje stond op een plein met zeven bomen.', 'Er stond een bordje: "Niet zitten".', 'Een toerist heeft er toch op gezeten, drie minuten lang.'],
    questions: [
      { q: 'Hoeveel bomen stonden er bij het bankje?', options: ['Twee', 'Zeven', 'Twaalf'], ok: 1 },
      { q: 'Wat stond er op het bordje?', options: ['Niet zitten', 'Even wachten', 'Vers geverfd'], ok: 0 },
      { q: 'Hoe lang zat de toerist er?', options: ['Drie minuten', 'Een uur', 'Een halve dag'], ok: 0 },
    ] },
  { id: 'taart', title: 'De zaak van de taart', facts: ['Het ging om een appeltaart met veertien plakken.', 'Er ontbraken er drie bij de aankomst.', 'De bakker is de enige getuige.'],
    questions: [
      { q: 'Wat voor taart was het?', options: ['Appeltaart', 'Kersentaart', 'Worteltaart'], ok: 0 },
      { q: 'Hoeveel plakken ontbraken?', options: ['Eén', 'Drie', 'Zeven'], ok: 1 },
      { q: 'Wie is de getuige?', options: ['De bakker', 'De burgemeester', 'De duif'], ok: 0 },
    ] },
  { id: 'kikker', title: 'De zaak van de kikker', facts: ['Een kikker zat te kwaken in een brievenbus.', 'Dat was aan de Poelestraat, nummer elf.', 'De post kwam een uur te laat.'],
    questions: [
      { q: 'Waar zat de kikker?', options: ['In een brievenbus', 'In een tas', 'Onder een fiets'], ok: 0 },
      { q: 'Welk huisnummer was het?', options: ['Vier', 'Elf', 'Negentien'], ok: 1 },
      { q: 'Hoe laat kwam de post?', options: ['Een uur te laat', 'Een dag te vroeg', 'Op tijd'], ok: 0 },
    ] },
];

export function pickDossier(rng = Math.random, last = null) {
  const r = rngOf(rng);
  for (let i = 0; i < 8; i++) { const d = pickOf(DOSSIERS, r); if (!last || d.id !== last) return d; }
  return DOSSIERS[0];
}

// The answers shuffled per question; returns [{ q, options: [{ text, ok }] }].
export function dossierQuestions(d, rng = Math.random) {
  const r = rngOf(rng);
  return d.questions.map((qq) => {
    const opts = qq.options.map((text, i) => ({ text, ok: i === qq.ok }));
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    return { q: qq.q, options: opts };
  });
}

// Pay for the statement: 60 and 20 per right answer. Skipped questions count as wrong.
export function verklaringPay(right, total = 3) {
  const n = Math.max(0, Math.min(total, right | 0));
  return { base: 30 + 20 * n, tip: n === total ? 15 : 0, flawless: n === total, verdict: n === total ? 'Uw verklaring is volledig.' : n === 0 ? 'De rechter zucht. Dit komt in het proces-verbaal.' : 'Uw verklaring is bijna volledig.' };
}

export const COURT_SAY = {
  pickup: 'De agent aan de balie geeft je het dossier. "Lees het goed. De griffier stelt straks vragen."',
  arrive: 'Het Gerechtsgebouw. De griffier kijkt over zijn bril: "Eerst de verklaring, dan de koffie."',
  gavel: ['Orde in de zaal!', 'De rechter tikt twee keer met de hamer: "Dat staat genoteerd."'],
  quit: 'Je legt het dossier terug. De zaak wordt een andere keer behandeld.',
};

// --- Cabaret in de Stadsschouwburg ---------------------------------------------------------------

// The act of the invented Frisian cabaret artist Ype Tjaarda: a line each, then a beat to heckle on.
export const CABARET = {
  who: 'Ype Tjaarda',
  intro: 'Ype Tjaarda, Fries cabaretier, speelt vanavond voor een uitverkochte zaal. Jij zit op rij zeven en hebt één taak: op de maat een grapje terugroepen.',
  acts: [
    { text: 'Goeie jûn, dames en hearen! (Goedenavond, dames en heren!)', cue: 2.6 },
    { text: 'Wat is it hjir drok. Moai, moai. (Wat is het hier druk. Mooi, mooi.)', cue: 2.4 },
    { text: 'Ik kom út Fryslân. Wy sizze net folle, mar wy sizze it goed. (Ik kom uit Friesland. Wij zeggen niet veel, maar wij zeggen het goed.)', cue: 2.8 },
    { text: 'Yn Grunn is alles in bytsje tichterby. Ek de kroegen. (In Groningen is alles een beetje dichterbij. Ook de kroegen.)', cue: 2.6 },
    { text: 'Ja, ja, ik wit it. Jim wolle in gouden grap. (Ja, ja, ik weet het. Jullie willen een gouden grap.)', cue: 2.4 },
    { text: 'Tige tank, Grins. Jimme wiene in moai publyk. (Hartelijk dank, Groningen. Jullie waren een mooi publiek.)', cue: 0 },
  ],
  heckles: ['Doe maar gewoon!', 'Is dat alles?', 'Hé, grapjas!', 'Nog een keer!', 'Wat zegt hij nou?'],
  reply: {
    perfect: ['Moai sein! (Mooi gezegd!) Dat sit.', 'Ha! Dy hie ik net ferwachte. (Die had ik niet verwacht.)'],
    ok: ['Hm. Net hielendal. (Niet helemaal.) Maar toch bedankt.'],
    early: ['Wachtsje even, jonge. (Wacht even, jongen.)', 'Te let... eh, te betiid. (Te laat... eh, te vroeg.)'],
    late: ['Dat kaam te let. (Dat kwam te laat.)', 'Ik wie al fierder. (Ik was al verder.)'],
  },
  windows: { perfect: 0.18, ok: 0.45 },
  points: { perfect: 3, ok: 1, early: 0, late: 0 },
  pay: { base: 25, perPoint: 12, tipAt: 12, tip: 20 },
};

// How well a press at `pressAt` hit the beat at `cueAt` (seconds on one clock).
export function heckleTiming(cueAt, pressAt) {
  const d = pressAt - cueAt;
  const a = Math.abs(d);
  if (a <= CABARET.windows.perfect) return 'perfect';
  if (a <= CABARET.windows.ok) return 'ok';
  return d < 0 ? 'early' : 'late';
}

// The beat times of the act: when each line has been said, the beat comes `cue` seconds later.
export function cabaretSchedule(speakFor = 3.2) {
  const out = [];
  let t = 1.2;
  CABARET.acts.forEach((a, i) => {
    out.push({ i, speakAt: t, cueAt: a.cue > 0 ? t + speakFor + a.cue : null });
    t += speakFor + (a.cue || 0) + 1.2;
  });
  return { beats: out, end: t };
}

export function cabaretPay(points, beats) {
  const p = CABARET.pay;
  const max = beats * CABARET.points.perfect;
  return { base: p.base + p.perPoint * points, tip: points >= p.tipAt ? p.tip : 0, flawless: points >= max * 0.6, verdict: points >= max * 0.8 ? 'De zaal ligt dubbel. Ype niet.' : points >= max * 0.4 ? 'Een paar lachers. De zaal kijkt tevreden.' : 'Stilte. Zelfs de garderobe lacht niet.' };
}
