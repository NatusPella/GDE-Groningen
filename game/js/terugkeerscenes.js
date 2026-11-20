// De vignetten van de terugkeerscène (#986 #987): korte flatmomenten van Tammo en Tessa, per fase van hun relatie
// (terugkeer.js). Elk vignet is data: twee figuren in de keuken of de woonkamer van de flat, drie tot vijf korte regels
// (alleen ondertitels, geen opname), een paar gebaren op die regels en een camera die per regel wisselt.
// Zuiver (geen THREE, geen DOM): bouwTerugkeerScene geeft een cutscript-definitie die cutscenehost.js speelt en
// scripts/terugkeer_test.mjs valideert. De gebaren komen uit actoranim.js (ACTOR_ANIMS); een gebarenbibliotheek van
// een andere tak wordt later gewoon extra namen in die lijst.
//
// Canon (docs/verhaal/nieuw): Tammo en Tessa zijn verzonnen; de regels zijn droog en klein, nooit een echt merk of
// echte persoon, nooit leed. Fase 1 ongemakkelijke huisgenoten, fase 2 plagen en een vonk (de kus en het dieptepunt
// van akte 3 en 4 worden niet genoemd), fase 3 samen, fase 4 na het slot (de vijf woorden komen terug).
//
// Samen spelen: de scène is van de gastheer; een gast speelt hem niet los (terugkeer.js).

// --- de regels: [wie, tekst, gebaar van de spreker?, gebaar van de ander?] --------------------------------------------

const T = 'tammo', S = 'tessa';

// Zitplekken in de keuken van de opening (cutscenes.js ACT_KEUKEN): aan weerszijden van de tafel.
const KT = { tessa: { at: [-0.82, 0], face: 0, sit: 0.46 }, tammo: { at: [0.82, 0.02], face: 180, sit: 0.46 } };
// Op de bank in de woonkamer (roomspec.js: de bank staat tegen de oostmuur, kijkend naar de tv).
const WB = { tessa: { at: [1.95, 0.55], face: 180, sit: 0.46 }, tammo: { at: [1.95, -0.55], face: 180, sit: 0.46 } };

export const VIGNETTEN = [
  // ===== fase 1: huisgenoten (ongemakkelijk, grappig) =====================================================
  { id: 'f1-pan', fase: 1, set: 'keuken', pos: { tessa: KT.tessa, tammo: { at: [0.3, 0.9], face: 200 } },
    regels: [[S, 'Die pan staat hier al sinds gisteren.', 'point'], [T, 'Dat is een pan met een verhaal.', 'shrug'], [S, 'Het verhaal heet: wie wast hem af.', 'talk'], [T, 'Ik. Morgen.', 'nod']],
    cues: [[0, T, { anim: 'look' }], ['L3+0.6', S, { anim: 'laugh' }]] },
  { id: 'f1-badkamer', fase: 1, set: 'keuken', pos: { tessa: KT.tessa, tammo: { at: [0.3, 0.9], face: 200 } },
    regels: [[T, 'Wie neemt de badkamer als eerste?', 'talk'], [S, 'Ik. Ik sta er al drie minuten voor.', 'point'], [T, 'Je zit hier aan tafel.', 'shrug'], [S, 'In gedachten.', 'lean']],
    cues: [[0, S, { anim: 'phone' }]] },
  { id: 'f1-yoghurt', fase: 1, set: 'keuken', pos: { tessa: KT.tessa, tammo: KT.tammo },
    regels: [[S, 'Wie heeft mijn yoghurt opgegeten?', 'point'], [T, 'Er stond geen naam op.', 'shrug'], [S, 'Er stond Tessa op.', 'point'], [T, 'Ik las dat als een suggestie.', 'shake']],
    cues: [[0, T, { anim: 'look' }]] },
  { id: 'f1-koffie', fase: 1, set: 'keuken', pos: { tessa: KT.tessa, tammo: { at: [1.3, 1.3], face: -150 } },
    regels: [[T, 'Koffie?', 'talk'], [S, 'Ja. Eh, nee. Ja.', 'shrug'], [T, 'Ik zet er twee neer. Dan kies jij zelf.', 'carry'], [S, 'Dat is eigenlijk heel redelijk.', 'nod']],
    fx: [{ t: 0, fx: 'cups', actor: T, on: true }, { t: 'L2+1.2', fx: 'cups', actor: T, on: false }, { t: 'L2+1.2', fx: 'tablecups', on: true }],
    cues: [['L2', T, { walk: [[1.0, 0.5], [0.82, 0.02]], speed: 1.2 }], ['L2+1.6', T, { face: 180 }], ['L2+1.8', T, { sit: true }]] },
  { id: 'f1-rooster', fase: 1, set: 'keuken', pos: { tessa: KT.tessa, tammo: KT.tammo },
    regels: [[S, 'Ik heb een schoonmaakrooster gemaakt.', 'point'], [T, 'Ik zie mijn naam. Zeven keer.', 'look'], [S, 'Ik zie jouw pan. Zeven keer.', 'talk'], [T, 'Dat is een eerlijke ruil.', 'shrug']],
    props: { rooster: { kind: 'briefje', at: [0, 0.1, 0.78], face: 90 } }, cues: [] },
  { id: 'f1-wekker', fase: 1, set: 'keuken', pos: { tessa: KT.tessa, tammo: { at: [0.3, 0.9], face: 200 } },
    regels: [[T, 'Je wekker ging om zes uur af.', 'talk'], [S, 'Dat weet ik. Ik leg hem ver weg.', 'shrug'], [T, 'Dat wist de hele flat nu ook.', 'shake'], [S, 'Dan zijn we eerlijk tegen elkaar.', 'lean']],
    cues: [[0, S, { anim: 'lean' }]] },

  // ===== fase 2: vrienden (plagen, samen koken, een eerste vonk) =============================================
  { id: 'f2-ontbijt', fase: 2, set: 'keuken', pos: { tessa: KT.tessa, tammo: { at: [0.3, 0.9], face: 200 } },
    regels: [[T, 'Roerei of spiegelei?', 'talk'], [S, 'Wat wordt het als jij er verstand van hebt?', 'point'], [T, 'Roerei. Dan zie je niet dat het mislukt is.', 'shrug'], [S, 'Ik eet het toch op.', 'laugh']],
    cues: [[0, T, { anim: 'hips' }]] },
  { id: 'f2-proeven', fase: 2, set: 'keuken', pos: { tessa: { at: [0.3, 0.9], face: 200 }, tammo: { at: [1.0, 0.9], face: 160 } },
    regels: [[S, 'Proef eens.', 'talk'], [T, 'Het is goed.', 'nod'], [S, 'Dat zeg je altijd.', 'point'], [T, 'Omdat het altijd goed is.', 'shrug']],
    cues: [['L3+0.4', S, { anim: 'laugh' }], [0, S, { face: 'actor:tammo' }]] },
  { id: 'f2-kruimel', fase: 2, set: 'keuken', pos: { tessa: KT.tessa, tammo: KT.tammo },
    regels: [[S, 'Je hebt een kruimel op je kin.', 'point'], [T, 'Waar?', 'look'], [S, 'Links. Nee, jouw links.', 'talk'], [T, 'Zo?', 'shrug'], [S, 'Nu zit hij op je mouw.', 'laugh']],
    cues: [] },
  { id: 'f2-dinsdag', fase: 2, set: 'keuken', pos: { tessa: KT.tessa, tammo: KT.tammo },
    regels: [[T, 'Je haar zit anders.', 'talk'], [S, 'Het is dinsdag.', 'shrug'], [T, 'Het staat je goed. Op dinsdag.', 'lean'], [S, 'Dank je. Eet je boterham.', 'look']],
    cues: [['L2+0.8', S, { gaze: [-2.2, 0, 1.4] }]] },
  { id: 'f2-eierbal', fase: 2, set: 'keuken', pos: { tessa: KT.tessa, tammo: { at: [0.3, 0.9], face: 200 } },
    regels: [[T, 'Ik heb een eierbal gebakken, voor de oefening.', 'carry'], [S, 'Hij is vierkant.', 'point'], [T, 'Hij is creatief.', 'shrug'], [S, 'Ik eet hem toch op. Voor de vriendschap.', 'nod']],
    cues: [] },
  { id: 'f2-plan', fase: 2, set: 'keuken', pos: { tessa: KT.tessa, tammo: KT.tammo },
    regels: [[S, 'Als we winnen, wat dan?', 'talk'], [T, 'Dan krijgt de frietwagen een nieuwe lamp.', 'nod'], [S, 'Een lamp.', 'look'], [T, 'Een grote. Zodat jij hem ziet.', 'lean']],
    cues: [] },

  // ===== fase 3: relatie (samen thuis) =======================================================================
  { id: 'f3-bank', fase: 3, set: 'woonkamer', pos: WB,
    regels: [[S, 'Wat kijken we?', 'talk'], [T, 'Maakt niet uit.', 'shrug'], [S, 'Dat zeg je altijd.', 'point'], [T, 'Omdat jij naast me zit.', 'lean'], [S, 'Dat was aardig. Zet maar iets aan.', 'laugh']],
    cues: [] },
  { id: 'f3-dansen', fase: 3, set: 'keuken', pos: { tessa: { at: [0.2, 0.7], face: 200 }, tammo: { at: [0.6, 0.7], face: 160 } },
    regels: [[S, 'Dit nummer ken ik.', 'cheer'], [T, 'Dans je mee?', 'talk'], [S, 'In de keuken?', 'laugh'], [T, 'Overal waar jij staat.', 'cheer']],
    fx: [{ t: 0, fx: 'pulse', dur: 12 }],
    cues: [[0.4, S, { walk: [[0.35, 0.5], [0.5, 0.9], [0.35, 0.7]], speed: 0.6 }], [0.4, T, { walk: [[0.5, 0.9], [0.4, 0.5], [0.5, 0.7]], speed: 0.6 }]] },
  { id: 'f3-wang', fase: 3, set: 'keuken', pos: { tessa: { at: [1.2, 1.9], face: -150 }, tammo: { at: [0.3, 0.9], face: 200 } },
    regels: [[S, 'Goedemorgen.', 'wave'], [T, 'Koffie staat klaar.', 'carry'], [S, 'Je bent de beste.', 'nod'], [T, 'Wacht. Ik moet even gaan zitten.', 'shake']],
    cues: [['L0', S, { walk: [[1.0, 1.1], [0.7, 0.9]], speed: 1.2 }], ['L2', S, { face: 'actor:tammo' }], ['L2+1.0', T, { anim: 'look' }]] },
  { id: 'f3-lijstje', fase: 3, set: 'keuken', pos: { tessa: KT.tessa, tammo: KT.tammo },
    regels: [[S, 'Eerst de Vismarkt.', 'point'], [T, 'Dan de kade.', 'talk'], [S, 'En daarna?', 'look'], [T, 'Daarna iets met jou.', 'lean'], [S, 'Dat staat al op de lijst.', 'laugh']],
    props: { lijst: { kind: 'briefje', at: [0, 0.1, 0.78], face: 90 } }, cues: [] },
  { id: 'f3-kopje', fase: 3, set: 'keuken', pos: { tessa: { at: [0.6, 0.9], face: 200 }, tammo: KT.tammo },
    regels: [[S, 'Met melk. Niet te veel.', 'carry'], [T, 'Je weet het nog.', 'nod'], [S, 'Ik weet alles van jou.', 'point'], [T, 'Dat is veel.', 'shrug']],
    fx: [{ t: 0, fx: 'cups', actor: S, on: true }, { t: 'L1', fx: 'cups', actor: S, on: false }, { t: 'L1', fx: 'tablecups', on: true }],
    cues: [['L0', S, { walk: [[0.2, 0.5]], speed: 1.0 }], ['L1', S, { face: 'actor:tammo' }]] },
  { id: 'f3-graden', fase: 3, set: 'woonkamer', pos: WB,
    regels: [[T, 'Het is tweeëntwintig graden.', 'talk'], [S, 'Dat zeg je elke dag.', 'shake'], [T, 'Omdat ik het fijn vind.', 'nod'], [S, 'Ik ook.', 'lean']],
    cues: [] },

  // ===== fase 4: na het slot (de zomer is nog lang niet op) ===================================================
  { id: 'f4-stil', fase: 4, set: 'woonkamer', pos: WB,
    regels: [[S, 'Het is stil in de flat.', 'look'], [T, 'Niemand zoekt ons.', 'shrug'], [S, 'Dat is nieuw.', 'talk'], [T, 'Ik wen eraan.', 'lean']],
    cues: [] },
  { id: 'f4-roerei', fase: 4, set: 'keuken', pos: { tessa: KT.tessa, tammo: { at: [0.3, 0.9], face: 200 } },
    regels: [[T, 'Roerei. Zoals jij het wilt.', 'carry'], [S, 'Zonder dat het mislukt is?', 'point'], [T, 'Dat was de oefening.', 'shrug'], [S, 'En dit is de les.', 'laugh']],
    cues: [] },
  { id: 'f4-vijf', fase: 4, set: 'woonkamer', pos: WB,
    regels: [[S, 'Hoeveel woorden waren het ook alweer?', 'talk'], [T, 'Vijf.', 'nod'], [S, 'Zeg ze nog eens.', 'lean'], [T, 'Ik wil bij jou blijven.', 'look'], [S, 'Dat bedoelde ik ook.', 'nod']],
    cues: [] },
  { id: 'f4-afwas', fase: 4, set: 'keuken', pos: { tessa: KT.tessa, tammo: { at: [0.3, 0.9], face: 200 } },
    regels: [[S, 'Je wast af.', 'look'], [T, 'Ik zei toch: morgen.', 'shrug'], [S, 'Dat was twee weken geleden.', 'point'], [T, 'Ik ben een man van mijn woord.', 'hips']],
    cues: [] },
  { id: 'f4-niks', fase: 4, set: 'woonkamer', pos: WB,
    regels: [[T, 'Wat doen we vandaag?', 'talk'], [S, 'Niks.', 'shrug'], [T, 'Niks is een goed plan.', 'nod'], [S, 'Dan is het al gelukt.', 'laugh']],
    cues: [] },
  { id: 'f4-krant', fase: 4, set: 'keuken', pos: { tessa: KT.tessa, tammo: KT.tammo },
    regels: [[S, 'Rikus zegt dat het zomer blijft.', 'talk'], [T, 'Rikus heeft altijd gelijk.', 'nod'], [S, 'Dat zegt hij zelf ook.', 'laugh'], [T, 'Dan zal het wel kloppen.', 'shrug']],
    cues: [] },
];

export const vignettenVoor = (fase) => VIGNETTEN.filter((v) => v.fase === fase);

// --- de regie ------------------------------------------------------------------------------------------------------

const lineDur = (text) => Math.max(1.4, Math.min(3, 0.7 + String(text).length * 0.045));
const NAME = { [T]: 'Tammo', [S]: 'Tessa' };
const LEAD = 0.8, TAIL = 1.3, GAP = 0.2;

// De ondertiteltijden van een vignet: { lines, duration }. Gelijk aan de tijden die cutscenehost.js ziet.
export function terugkeerRegels(v) {
  let at = LEAD;
  const lines = v.regels.map(([who, text]) => {
    const dur = lineDur(text);
    const l = { speaker: NAME[who], text, at: Math.round(at * 100) / 100, dur: Math.round(dur * 100) / 100 };
    at += dur + GAP;
    return l;
  });
  const last = lines[lines.length - 1];
  return { lines, duration: Math.round((last.at + last.dur + TAIL) * 10) / 10 };
}

// De camera: eerst een breed beeld, dan per regel een close-up van de spreker (om en om de twee kanten, om de derde
// regel een tweeshot) en aan het eind weer breed. Alleen dolly's en korte cuts, zodat niets lang stilhangt.
function shotsFor(v, n) {
  const kitchen = v.set === 'keuken';
  const out = [];
  if (kitchen) out.push({ t: 0, shot: 'dolly', from: [1.9, 1.2, 1.7], to: [1.2, 0.9, 1.5], look: [-1.2, 0.2, 1.2], fov: 50 });
  else out.push({ t: 0, shot: 'dolly', from: [-1.8, -1.9, 1.6], to: [-1.2, -1.5, 1.5], look: 'mid:tammo,tessa@0.9', fov: 46 });
  v.regels.forEach(([who], i) => {
    const t = `L${i}`;
    const kant = i % 2;
    if (i % 3 === 2) {
      out.push(kitchen
        ? { t, shot: 'dolly', from: [-0.3, -1.15, 1.5], to: [-0.2, -1.0, 1.45], look: 'mid:tammo,tessa@1.2', fov: 38 }
        : { t, shot: 'dolly', from: [-0.6, -1.7, 1.3], to: [-0.3, -1.5, 1.3], look: 'mid:tammo,tessa@0.9', fov: 40 });
    } else if (kitchen) {
      const toS = who === S;
      out.push(toS
        ? { t, shot: 'dolly', from: kant ? [0.3, 0.5, 1.4] : [0.6, -0.8, 1.45], to: kant ? [0.15, 0.55, 1.35] : [0.4, -0.75, 1.4], look: 'tessa@1.15', fov: 28 }
        : { t, shot: 'dolly', from: kant ? [-0.35, -0.6, 1.4] : [-0.4, 0.7, 1.4], to: kant ? [-0.25, -0.55, 1.35] : [-0.3, 0.7, 1.35], look: 'tammo@1.2', fov: 28 });
    } else {
      out.push(who === S
        ? { t, shot: 'dolly', from: [0.2, -0.7, 1.2], to: [0.5, -0.6, 1.15], look: 'tessa@1.0', fov: 32 }
        : { t, shot: 'dolly', from: [0.2, 0.9, 1.2], to: [0.5, 0.8, 1.15], look: 'tammo@1.0', fov: 32 });
    }
  });
  out.push(kitchen
    ? { t: `L${n - 1}+1.5`, shot: 'cut', at: [1.4, -1.2, 1.7], look: 'mid:tammo,tessa@1.0', fov: 52 }
    : { t: `L${n - 1}+1.5`, shot: 'dolly', from: [-1.6, -1.6, 1.6], to: [-1.2, -1.2, 1.55], look: 'mid:tammo,tessa@0.9', fov: 46 });
  return out;
}

// De cutscript-definitie van een vignet (cutscript.js). Elke regel krijgt een gebaar voor de spreker en een korte
// reactie van de ander (om en om kijken en knikken), tenzij het vignet het zelf anders zegt.
export function bouwTerugkeerScene(v) {
  const { lines, duration } = terugkeerRegels(v);
  const actors = {
    tessa: { look: 'anita', at: v.pos.tessa.at, face: v.pos.tessa.face, anim: 'idle', speaker: ['Anita', 'Tessa'], gaze: 'speaker', ...(v.pos.tessa.sit ? { sit: v.pos.tessa.sit } : {}) },
    tammo: { look: 'tammo', at: v.pos.tammo.at, face: v.pos.tammo.face, anim: 'idle', speaker: 'Tammo', gaze: 'speaker', ...(v.pos.tammo.sit ? { sit: v.pos.tammo.sit } : {}) },
  };
  const cues = [];
  v.regels.forEach(([who, , gebaar], i) => {
    const other = who === T ? S : T;
    cues.push({ t: `L${i}`, actor: who, anim: gebaar || 'talk' });
    cues.push({ t: `L${i}+0.2`, actor: other, anim: i % 2 ? 'nod' : 'look' });
  });
  for (const [t, actor, verb] of v.cues || []) cues.push({ t, actor, ...verb });
  // houd de cues op tijdsvolgorde per acteur waar de motor dat vraagt: de motor sorteert zelf, dit is voor de leesbaarheid
  const def = {
    id: 'terugkeer-' + v.id, set: v.set, actors,
    ...(v.props ? { props: v.props } : {}),
    ...(v.fx ? { fx: v.fx } : {}),
    cues, shots: shotsFor(v, lines.length), duration,
  };
  return { def, lines, duration };
}
