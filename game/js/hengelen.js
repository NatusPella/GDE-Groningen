import { showBanner, isCinematicActive } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, setStatMax, recordUnique, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { pushAudioEvent } from './pedgeom.js';
import { standActivity, recLine } from './standactivity.js';
import { activityBlock } from './activitykit.js';
import { createBoard, key, bubble, clearBubbles, pick, stopPressed, geo } from './minigamekit.js';
import { HENGEL_LINES } from './minigamelines3.js';
import { FISH, createHengel, stepHengel, hengelMedal } from './hengelrules.js';
import { hourOf } from './streetlifedata.js';
import { kiesVis, vangstGewicht, vangstWaarde, vangstXp, NIEUWE_SOORT_XP, soort as soortVan, watertype } from './visdata.js';
import { vindHengelplek, plekNaam, plekSleutel } from './hengelplek.js';
import { boekVangst, boekVoortgang } from './visboeklive.js';
import { loopbaanTel, loopbaanVerdien } from './loopbaanlive.js';

// Hengelen overal in de provincie (#412), met het wedstrijdje aan het Meerstad-meer als begin. [Spatie] gooit uit; als het
// dobbertje zakt ("Beet!") druk je meteen weer [Spatie]; te vroeg trekken schrikt de vis af. Twee manieren:
//   - de Meerstad-wedstrijd (E bij de steiger): negentig seconden, de zwaarste vangst wint, medailles en een record;
//   - vrij hengelen (I) op elk water waar je aan de kant staat of waar je met een boot stilligt: geen klok, elk water zijn
//     eigen vissoorten (visdata.js), een visboek (visboek.js, scherm in het pauzemenu) en een kas die als loon wordt uitbetaald
//     in het vak Hengelen van de loopbaan (loopbaan.js). De vis gaat terug in het water of naar de visboer: nooit leed in beeld.
// Regels: hengelrules.js (wedstrijd en vrij), de soorten en het geld: visdata.js, het water: hengelplek.js.
// `window.__hengelen` debug. De plek aan het Meerstad-meer is bij de spotcheck gecontroleerd (#222).
const ACCENT = '#4aa8d8';
const ORIGIN = geo(53.22924, 6.65732); // the first dry ground out from the lake polygon (spotcheck, #222)
const STAND = { x: ORIGIN.x, y: ORIGIN.y };
const MEERSTAD = { type: 'meer', naam: 'Meerstad', plek: 'meer:Meerstad', x: STAND.x, y: STAND.y };
const VRIJ_WACHT = [4.5, 11];       // s tot de beet bij vrij hengelen (rustiger dan de wedstrijd)
const BOOT_SNELHEID = 1.2;          // m/s: sneller dan dit vaar je en hengel je niet
const TYPE_PRESTATIE = { gracht: 'vis_gracht', plas: 'vis_plas', meer: 'vis_meer', kanaal: 'vis_kanaal', rivier: 'vis_rivier', sloot: 'vis_sloot', wad: 'vis_wad' };
const ZOEK_TUSSENTIJD = 0.4;        // s tussen twee keer het water zoeken

let game = null;
let board = null;
let boardVrij = null;
let plekNu = null;                  // het hengelwater bij de speler nu (of null)
let zoekT = 0;

function say(w, kind, ttl = 0) {
  if (!game || game.mode !== 'wedstrijd') return;
  const list = HENGEL_LINES[kind];
  if (list) bubble(w, { x: STAND.x, y: STAND.y, name: HENGEL_LINES.who, text: pick(list), h: 2.3, tag: 'hengelen', ttl });
}

const euro = (v) => '€' + Math.round(v).toLocaleString('nl-NL');
const kgTekst = (v) => v.toFixed(v < 1 ? 2 : 1).replace('.', ',') + ' kg';

// Een vangst: het visboek, de prestaties, de punten in het vak en de kas. Geeft wat er nieuw aan was terug (voor de melding).
function verwerkVangst(w, g, e) {
  const s = soortVan(e.fish);
  if (!s) return null;
  const plek = g.plek;
  const r = boekVangst(s.id, e.kg, plek.plek, plek.type);
  if (!r) return null;
  recordUnique(w, 'vissoorten', s.id);
  if (r.nieuwePlek) recordUnique(w, 'visplekken', plek.plek);
  recordStat(w, 'visVangsten', 1);
  if (r.typeCompleet) unlockAchievement(w, TYPE_PRESTATIE[r.typeCompleet]);
  if (r.alles) unlockAchievement(w, 'vis_alles');
  if (s.id === 'meerval') unlockAchievement(w, 'vis_meerval');
  const vg = boekVoortgang();
  let xp = vangstXp(s) + (r.nieuweSoort ? NIEUWE_SOORT_XP : 0);
  loopbaanTel(w, 'hengelen', { n: 1, xp, uniek: plek.plek });
  g.kas += vangstWaarde(s, e.kg, vg.gevangen, vg.plekken);
  g.vangsten++;
  g.soorten.set(s.id, (g.soorten.get(s.id) || 0) + 1);
  if (r.nieuweSoort) g.nieuw.push(s.id);
  // de kas: hele euro's gaan naar de portemonnee (met het loon van je niveau), de rest blijft staan
  if (g.kas >= 1) {
    const hele = Math.floor(g.kas);
    g.kas -= hele;
    g.betaald += loopbaanVerdien(w, 'hengelen', hele, { rubriek: 'Overig inkomsten', deel: false });
  }
  if (r.nieuweSoort) {
    w.addMessage(`Visboek: ${s.naam}, een nieuwe soort (${vg.gevangen} van ${vg.totaal})`, 4, { kind: 'prestatie', kicker: 'Visboek', key: 'visboek-nieuw' });
  } else if (r.nieuwRecord) {
    w.addMessage(`Visboek: nieuw record ${s.naam} ${kgTekst(e.kg)}`, 3, { kind: 'prestatie', kicker: 'Visboek', key: 'visboek-record' });
  }
  return r;
}

function einde(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.cameraOverride = null;
  if (board) board.hide();
  if (boardVrij) boardVrij.hide();
  clearBubbles(w, 'hengelen');
  const s = g.s;
  // de kas die nog niet vol was wordt afgerond: wat je ving is wat het opbrengt
  if (g.kas >= 0.5) g.betaald += loopbaanVerdien(w, 'hengelen', Math.max(1, Math.round(g.kas)), { rubriek: 'Overig inkomsten', deel: false });
  g.kas = 0;
  if (g.mode === 'vrij') {
    const waar = plekNaam(g.plek.type, g.plek.naam);
    if (g.vangsten > 0) {
      const soorten = g.soorten.size;
      const vis = `${g.vangsten} vis${g.vangsten === 1 ? '' : 'sen'}`, soortTekst = `${soorten} soort${soorten === 1 ? '' : 'en'}`, betaald = g.betaald > 0 ? `, ${euro(g.betaald)} van de visboer` : '';
      w.addMessage(`Hengelen klaar op ${waar}: ${vis} (${soortTekst}), ${kgTekst(s.kg)}${betaald}`, 5, { kind: 'tip', kicker: 'Hengelen', key: 'hengel-vrij-klaar' });
    } else if (!quit) w.addMessage('Niets aan de haak. Probeer een andere plek.', 3);
    return;
  }
  if (quit) { w.addMessage('Hengelen gestopt', 2.5); return; }
  const medal = hengelMedal(s.kg);
  const rec = recordChallengeResult(w, 'hengelen', { value: s.kg, medal });
  recordStat(w, 'hengelSessions');
  setStatMax(w, 'hengelBest', s.kg);
  unlockAchievement(w, 'hengel_klaar');
  if (s.catches.includes('karper')) unlockAchievement(w, 'hengel_karper');
  const stats = [['Gewicht', kgTekst(s.kg)], ['Gevangen', String(s.catches.length)], ['Ontsnapt', String(s.lost)], ['Te vroeg', String(s.scared)]];
  if (g.betaald > 0) stats.push(['Visboer', euro(g.betaald)]);
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'KONING VAN HET MEER' : medal ? 'MOOIE VANGST' : 'NIKS AAN DE HAAK', reason: medal ? `${kgTekst(s.kg)} aan de wal gebracht` : 'Wacht tot het dobbertje zakt en haal dan meteen binnen.', stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', 4.5);
}

function updateGame(w, dt) {
  const g = game, input = w.input, p = w.player;
  if (p.inVehicle) { p.inVehicle.speed = 0; if (p.inVehicle.vx !== undefined) { p.inVehicle.vx = 0; p.inVehicle.vy = 0; } }
  else { p.vx = p.vy = 0; p.speed = 0; p.moving = false; }
  if (stopPressed(input)) { einde(w, { quit: true }); return; }
  let cast = false;
  if (input.wasPressed(' ')) { input.consume(' '); cast = true; }
  const at = g.plek;
  for (const e of stepHengel(g.s, { cast }, dt)) {
    if (e.type === 'cast') pushAudioEvent(w, { kind: 'splash', x: at.x, y: at.y });
    else if (e.type === 'early') { g.flash = { text: 'Te vroeg! De vis schrikt', bad: true, t: 0 }; say(w, 'early'); }
    else if (e.type === 'bite') { g.flash = { text: 'BEET! Nu Spatie!', bad: false, t: 0 }; }
    else if (e.type === 'catch') {
      const s = soortVan(e.fish) || FISH.find((x) => x.id === e.fish);
      const r = verwerkVangst(w, g, e);
      const naam = (s && (s.naam || s.name)) || e.fish;
      g.flash = { text: `${r && r.nieuweSoort ? 'Nieuw: ' : ''}${naam} van ${kgTekst(e.kg)}!`, bad: false, t: 0 };
    } else if (e.type === 'lost') { g.flash = { text: 'Ontsnapt', bad: true, t: 0 }; say(w, 'lost'); }
    else if (e.type === 'done') { einde(w); return; }
  }
  if (g.flash && g.flash.text !== 'BEET! Nu Spatie!' && (g.flash.t += dt) > 1.8) g.flash = null;
  if (g.s.phase === 'done') { einde(w); return; }
  if (g.s.phase !== 'bite' && g.flash && g.flash.text === 'BEET! Nu Spatie!') g.flash = null;
}

const PHASE_TEXT = { idle: 'Gooi uit met Spatie', cast: 'De lijn zoeft uit...', wait: 'Wacht op het dobbertje...', bite: 'BEET!', scare: 'De vissen zijn gevlucht...' };

function updateHud() {
  const g = game;
  if (!g) return;
  const s = g.s;
  const cells = ['idle', 'cast', 'wait', 'bite'].map((ph, i) => ({ t: ['Uitgooien', 'Lijn', 'Wachten', 'Beet'][i], cls: s.phase === ph ? (ph === 'bite' ? 'on good' : 'on') : '' }));
  const flash = g.flash ? g.flash.text : PHASE_TEXT[s.phase];
  if (g.mode === 'vrij') {
    if (!boardVrij) return;
    const t = watertype(g.plek.type);
    const row = `<span>${plekNaam(g.plek.type, g.plek.naam)}</span><span>Vangsten <b>${g.vangsten}</b></span><span>Soorten <b>${g.soorten.size}</b></span><span>Gewicht <b>${kgTekst(s.kg)}</b></span><span>Visboer <b>${euro(g.betaald + g.kas)}</b></span>`;
    boardVrij.set({ row, cells, flash, bad: !!(g.flash && g.flash.bad), help: `${t ? t.naam + ' · ' : ''}${key('SPATIE')} uitgooien en binnenhalen · ${key('BACKSPACE')} stoppen` });
    return;
  }
  if (!board) return;
  const row = `<span>Gewicht <b>${kgTekst(s.kg)}</b></span><span>Tijd <b>${Math.max(0, Math.ceil(s.left))}</b></span><span>Gevangen <b>${s.catches.length}</b></span><span>Ontsnapt <b>${s.lost}</b></span>`;
  board.set({ row, cells, flash, bad: !!(g.flash && g.flash.bad), help: `${key('SPATIE')} uitgooien en binnenhalen · ${key('BACKSPACE')} stoppen` });
}

function glyph(ctx) {
  ctx.strokeStyle = '#f2ede0'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(2.5, -3); ctx.lineTo(2.5, 1); ctx.stroke();
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.arc(2.5, 1.8, 0.8, 0, Math.PI * 2); ctx.fill();
}

// De Meerstad-wedstrijd: negentig seconden, de vaste vissen van het meer.
function start(w) {
  if (game) return false;
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  if (!board) board = createBoard('HENGELEN MEERSTAD', ACCENT);
  board.show();
  game = { mode: 'wedstrijd', s: createHengel(Math.random), flash: null, plek: MEERSTAD, kas: 0, betaald: 0, vangsten: 0, soorten: new Map(), nieuw: [] };
  showCard(w, { kind: 'tip', kicker: 'Hengelen', title: 'Geduld aan het meer', body: '[Spatie] gooit uit. Zakt het dobbertje (Beet!), druk dan meteen weer [Spatie]. Te vroeg trekken schrikt de vis af; grote vissen zijn minder lang onder.', key: 'hengel-help', voice: false, duration: 7 });
  say(w, 'start');
  return true;
}

// Vrij hengelen op het water bij de speler: de vis van dit watertype, op dit uur en bij dit weer, zonder klok.
function startVrij(w, plek) {
  if (game || !plek) return false;
  const p = w.player;
  if (!boardVrij) boardVrij = createBoard('HENGELEN', ACCENT);
  boardVrij.show();
  const kies = (rand) => {
    const regen = !!(w.weather && w.weather.active && w.weather.intensity > 0.25 && w.weather.kind !== 'mist');
    const s = kiesVis(plek.type, rand, { uur: hourOf(w), regen });
    return { id: s.id, name: s.naam, kg: vangstGewicht(s, rand), window: s.venster };
  };
  game = { mode: 'vrij', s: createHengel(Math.random, { kies, duur: Infinity, wacht: VRIJ_WACHT }), flash: null, plek, kas: 0, betaald: 0, vangsten: 0, soorten: new Map(), nieuw: [] };
  const t = watertype(plek.type);
  showCard(w, { kind: 'tip', kicker: 'Hengelen', title: plekNaam(plek.type, plek.naam), body: `${t ? t.wat + ' ' : ''}[Spatie] gooit uit, bij Beet weer [Spatie]. Elk water heeft zijn eigen vis: alles wat je vangt komt in je visboek in het pauzemenu.`, key: 'hengel-vrij-help', voice: false, duration: 8 });
  if (!p.inVehicle) { p.vx = p.vy = 0; }
  return true;
}

// Waar je nu kunt hengelen (of null): een boot die bijna stilligt of iemand op de kant, niet in een auto, niet zwemmend.
function zoekPlek(w) {
  const p = w.player;
  if (!w.map || w.pigeonMode || w.heliRun || p.swimming) return null;
  const v = p.inVehicle;
  if (v) {
    if (!v.isBoat || Math.abs(v.speed || 0) > BOOT_SNELHEID) return null;
    return vindHengelplek(w.map, v.x, v.y, { opWater: true });
  }
  return vindHengelplek(w.map, p.x, p.y);
}

// prompts.js: het hengelprompt voor het water waar je nu bij staat (alleen als er niets anders te doen is).
export function hengelVrijPrompt(w, alleenBoot = false) {
  if (game || !plekNu) return null;
  const boot = !!w.player.inVehicle;
  if (alleenBoot !== boot) return null;
  const why = activityBlock(w);
  const t = watertype(plekNu.type);
  const sub = why || `${plekNaam(plekNu.type, plekNu.naam)}${t ? ' · ' + t.naam : ''}`;
  return { id: 'hengel-vrij', x: plekNu.x, y: plekNu.y, h: 1.0, key: 'I', label: 'Hengelen', sub, ring: false, dim: !!why };
}

function tick(dt, w) {
  if (game) { updateHud(); return; }
  zoekT -= dt;
  if (zoekT <= 0) { zoekT = ZOEK_TUSSENTIJD; plekNu = zoekPlek(w); }
  if (!plekNu || !w.input || w.paused || isCinematicActive()) return;
  if (w.input.wasPressed('i')) {
    const why = activityBlock(w);
    w.input.consume('i');
    if (why) { w.addMessage(why, 2.5); return; }
    const p = w.player;
    if (p.inVehicle && !p.inVehicle.isBoat) return;
    startVrij(w, plekNu);
  }
}

function recText() {
  return recLine(getChallengeRecord('hengelen'), (v) => `${v.toFixed(1).replace('.', ',')} kg`, MEDALS);
}

const basis = standActivity({
  id: 'hengelen',
  name: 'Hengelen Meerstad',
  label: 'Hengelen',
  note: 'hengelplek aan het meer in Meerstad: de zwaarste vangst in negentig seconden. Overal aan het water kun je vrij hengelen met I',
  accent: ACCENT,
  stand: () => STAND,
  origin: () => ORIGIN,
  useRadius: 3,
  labelRadius: 160,
  sub: 'Vis aan het meer in Meerstad · gratis',
  hint: 'Loop naar de steiger en druk E',
  ubboSub: 'hengelen aan het meer in Meerstad, gratis',
  where: 'het meer in Meerstad',
  recText,
  glyph,
  isActive: () => !!game,
  start,
  quit: (w) => einde(w, { quit: true }),
  update: (dt, w) => updateGame(w, dt),
  tick,
  camera: () => {},
  debug: (w) => ({
    spot: () => ({ ...STAND }),
    start: () => start(w),
    state: () => (game ? { mode: game.mode, phase: game.s.phase, kg: game.s.kg, left: game.s.left, vangsten: game.vangsten, kas: game.kas, betaald: game.betaald, plek: game.plek.plek } : null),
    finish: () => { if (!game) return false; game.s.phase = 'done'; game.s.kg = 8; return true; },
    quit: () => { if (!game) return false; einde(w, { quit: true }); return true; },
    plek: () => (plekNu ? { type: plekNu.type, naam: plekNu.naam, plek: plekNu.plek, afstand: plekNu.afstand, opWater: plekNu.opWater } : null),
    zoek: () => { plekNu = zoekPlek(w); return plekNu ? { type: plekNu.type, naam: plekNu.naam, plek: plekNu.plek } : null; },
    vrij: (type, naam) => startVrij(w, type ? { type, naam: naam || null, plek: plekSleutel(type, naam, w.player.x, w.player.y), x: w.player.x, y: w.player.y, afstand: 0, opWater: false } : plekNu),
  }),
});
export const HENGELEN = basis;
