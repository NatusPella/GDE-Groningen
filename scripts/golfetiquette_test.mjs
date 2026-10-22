// Golfetiquette op de pitch & putt-baan (#394): Wolfie en Sir Cedric als verzonnen figuren met een eigen stem in de tekst, stil staan bij een
// slag en de speelvolgorde (de eer) als grapje zonder straf. Puur (geen DOM, geen opslag).
//   node scripts/golfetiquette_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ETQ_LINES, ALLE_ETQ_REGELS, WOLFIE, SIR, PEND_S, SWING_S, sirScore, eerNa, newEtiquette, beginHole, step, holeDone, misser, einde, hallo, vul,
} from '../game/js/golfetiquette.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---- de regels zelf ----
const regels = ALLE_ETQ_REGELS;
ok(regels.length >= 45, `genoeg regels (${regels.length})`);
ok(new Set(regels.map((r) => r.tekst)).size === regels.length, 'geen regel twee keer');
ok(regels.every((r) => r.tekst.length > 8 && r.tekst.length < 120), 'regels zijn korte ballonnen', regels.filter((r) => r.tekst.length <= 8 || r.tekst.length >= 120).map((r) => r.tekst).join(' | '));
ok(regels.every((r) => !/[Ѐ-ӿ]/.test(r.tekst) && !/\b(the|you|please|thank|sorry|okay|hello|yes|please|golf club)\b/i.test(r.tekst)), 'alleen Nederlands, geen Engelse woorden');
// geen echte merken, bedrijven of personen (constitution 2): alleen verzonnen namen en geen beroep van een echt persoon
const echt = /titleist|callaway|taylormade|ping\b|srixon|ryder|masters|tiger|woods|augusta|st\.? andrews|royal|matthijs|rory|jordan|spieth|mcilroy|nicklaus|trump|bernhard|golfbond|nederlandse golf|nvg|pga\b/i;
ok(!regels.some((r) => echt.test(r.tekst)), 'geen echte merken of personen in de regels', regels.filter((r) => echt.test(r.tekst)).map((r) => r.tekst).join(' | '));
ok(WOLFIE === 'Wolfie' && SIR === 'Sir Cedric' && !echt.test(WOLFIE + ' ' + SIR), 'de namen zijn verzonnen (geen achternamen)');
ok(!/[A-Z][a-z]+ [A-Z][a-z]+/.test(WOLFIE) && SIR.split(' ').length === 2, 'geen voor- en achternaam samen');
// de twee zinnen uit het issue
ok(ETQ_LINES.wolfie.pendule.some((t) => /laat de pendule maar doen/i.test(t)), "Wolfie zegt 'laat de pendule maar doen'");
ok(ETQ_LINES.sir.start.includes('Moet je nog huren?'), "Sir Cedric vraagt 'Moet je nog huren?'");
ok(ETQ_LINES.sir.start.some((t) => /beginner/i.test(t)) && ETQ_LINES.sir.start.some((t) => /charmant|stijve/i.test(t)), 'Sir Cedric doet hoogdravend nederig over beginners');
ok(ETQ_LINES.wolfie.stil.every((t) => /stil/i.test(t)) && ETQ_LINES.sir.stil.every((t) => /stil|schouwspel/i.test(t)), 'de stil-regels gaan over stil staan');
ok(['volgorde', 'eerSir', 'eerSpeler'].every((k) => ETQ_LINES.wolfie[k].every((t) => /eer|volgorde/i.test(t))), 'de volgorde-regels gaan over de eer');
// de accenten zitten in de tekst, niet in een stem: er is geen enkel audiobestand of spraakveld
ok(!/\b(voice|audio|tts|mp3|wav|ogg)\b/i.test(read('game/js/golfetiquette.js').replace(/\/\/[^\n]*/g, '')), 'geen spraak of opname in golfetiquette.js (alleen tekst)');
ok(regels.filter((r) => r.wie === 'wolfie').some((r) => /ja-nee|net nou/i.test(r.tekst)), 'Wolfie heeft zijn eigen manier van praten (ja-nee, net nou)');
ok(regels.filter((r) => r.wie === 'sir').every((r) => !/ja-nee|net nou|pendule/i.test(r.tekst)), 'Sir Cedric praat anders dan Wolfie');
ok(regels.filter((r) => r.tekst.includes('{n}')).every((r) => r.sleutel === 'sirBeter' || r.sleutel === 'spelerBeter' || r.sleutel === 'gelijk'), 'alleen de scoreregels hebben een {n}');
ok(vul('Een {n} dus', 4) === 'Een 4 dus', 'vul zet het getal in');

// ---- de score van Sir Cedric en de eer ----
{
  const rand = rng(394);
  const telling = {};
  for (let i = 0; i < 4000; i++) { const s = sirScore(3, rand); telling[s - 3] = (telling[s - 3] || 0) + 1; }
  ok(Object.keys(telling).every((k) => k >= -1 && k <= 2), 'zijn score ligt tussen een onder en twee boven par', JSON.stringify(telling));
  ok(telling[0] > 1200 && telling[1] > 1000 && telling[-1] > 200 && telling[2] > 300, 'meestal par of een erboven, soms een birdie', JSON.stringify(telling));
  ok(eerNa('sir', -1, 0) === 'speler' && eerNa('speler', 1, 0) === 'sir', 'de laagste score krijgt de eer');
  ok(eerNa('sir', 0, 0) === 'sir' && eerNa('speler', 1, 1) === 'speler', 'bij gelijk houdt de vorige zijn eer');
}

// ---- een baan door ----
const speel = (e, par, secs, ctx = {}) => {
  const ev = [];
  for (let t = 0; t < secs; t += 0.1) ev.push(...step(e, 0.1, typeof ctx === 'function' ? ctx(t) : ctx));
  return ev;
};
const sleutels = (ev) => ev.map((x) => `${x.wie}:${x.sleutel}`);
{
  const e = newEtiquette(rng(1));
  const begin = beginHole(e, 3);
  ok(sleutels(begin).join() === 'sir:start,wolfie:huren,sir:eer,wolfie:eerSir', 'de eerste baan: Sir Cedric vraagt of je nog moet huren en neemt de eer', sleutels(begin).join());
  const stil = speel(e, 3, PEND_S + SWING_S + 1);
  ok(sleutels(stil).join() === 'sir:slag', 'zonder iets te doen slaat Sir Cedric zijn bal en zegt hij er wat over', sleutels(stil).join());
}
{
  // de speelvolgorde omdraaien: laden voor zijn slag
  const e = newEtiquette(rng(2));
  beginHole(e, 4);
  const ev = speel(e, 4, 1.5, { laadt: true });
  ok(sleutels(ev).join() === 'sir:volgorde,wolfie:volgorde', 'wie voor zijn tijd laadt, krijgt één kleine reactie van allebei', sleutels(ev).join());
  ok(e.boos === 1, 'het wordt bijgehouden (voor de toon), niet bestraft');
  const nog = speel(e, 4, 1, { laadt: true });
  ok(nog.length === 0, 'de reactie komt maar één keer per baan');
  ok(!('strafslagen' in e) && !('straf' in e) && !('strokes' in e), 'de etiquette heeft geen straf of slagen');
}
{
  // stil staan bij zijn slag: draaien of laden tijdens zijn swing
  const e = newEtiquette(rng(3));
  beginHole(e, 3);
  speel(e, 3, PEND_S + 0.05);
  const ev = speel(e, 3, 0.6, { draait: true });
  ok(sleutels(ev).join() === 'wolfie:stil,sir:stil', 'wie tijdens zijn slag draait, hoort een sst', sleutels(ev).join());
  const nog = speel(e, 3, 0.4, { draait: true });
  ok(nog.every((x) => x.sleutel !== 'stil'), 'ook die sst komt maar één keer per baan');
  const rest = speel(e, 3, 2);
  ok(sleutels(rest).includes('sir:slag'), 'daarna slaat Sir Cedric gewoon');
}
{
  // de baan uit: de eer gaat naar de laagste, ook zonder dat de speler iets deed
  const e = newEtiquette(rng(4));
  beginHole(e, 3);
  e.hole.sirScore = 4; // Sir Cedric: een erboven
  const ev = holeDone(e, 3, 3, 'cup'); // speler: par
  ok(e.eer === 'speler', 'de speler scoort beter en krijgt de eer');
  ok(sleutels(ev).includes('sir:spelerBeter') && /\b4\b/.test(ev[ev.length - 1].tekst), 'Sir Cedric noteert zijn score en erkent het', JSON.stringify(ev));
  const volgende = beginHole(e, 4);
  ok(!sleutels(volgende).includes('sir:eer') && e.hole.fase === 'toekijken', 'bij de volgende baan heeft de speler de eer: Sir Cedric kijkt toe');
  let kijkt = 0;
  for (let s = 0; s < 400; s++) { const ee = newEtiquette(rng(900 + s)); ee.eer = 'speler'; beginHole(ee, 3); if (step(ee, 0.1, { schiet: true }).some((x) => x.sleutel === 'kijken')) kijkt++; }
  ok(kijkt > 120 && kijkt < 280, `Sir Cedric zegt nu en dan dat hij stil staat bij jouw slag (${kijkt} van 400)`);
}
{
  // een hole-in-one, een misser en het eind
  const e = newEtiquette(rng(5));
  beginHole(e, 3);
  ok(sleutels(holeDone(e, 3, 1, 'cup')).includes('sir:eenSlag'), 'in één slag krijgt zijn eigen reactie');
  beginHole(e, 3);
  ok(sleutels(holeDone(e, 3, 2, 'cup')).includes('sir:birdie'), 'onder par: beginnersgeluk');
  ok(misser(e).wie === 'wolfie' && ETQ_LINES.wolfie.pendule.includes(misser(e).tekst), 'bij een misser zegt Wolfie iets over de pendule');
  ok(einde(e, true).length === 2 && einde(e, false).every((x) => ETQ_LINES[x.wie][x.sleutel].includes(x.tekst)), 'aan het eind praten allebei nog even');
  ok(ETQ_LINES.wolfie.hallo.includes(hallo(rng(1)).tekst), 'Wolfie zegt hallo bij het hutje');
}
// 300 volledige rondes met willekeurige toetsen: nooit meer dan een handvol regels per baan, nooit een uitzondering, nooit een lege tekst
{
  let max = 0, leeg = 0;
  for (let s = 0; s < 300; s++) {
    const r = rng(7000 + s);
    const e = newEtiquette(r);
    for (let hole = 0; hole < 6; hole++) {
      const par = 2 + Math.floor(r() * 2);
      let ev = beginHole(e, par);
      for (let t = 0; t < 30; t += 0.1) ev = ev.concat(step(e, 0.1, { laadt: r() < 0.1, draait: r() < 0.2, schiet: r() < 0.01 }));
      ev = ev.concat(holeDone(e, par, 1 + Math.floor(r() * (par + 4)), r() < 0.1 ? 'opgepakt' : 'cup'));
      max = Math.max(max, ev.length);
      leeg += ev.filter((x) => !x.tekst || /[{}]/.test(x.tekst)).length;
    }
  }
  ok(max <= 11, `per baan hoogstens 11 regels (${max})`);
  ok(leeg === 0, 'nooit een lege regel of een open {n}');
}

// ---- in de baan ----
{
  const pp = read('game/js/pitchputt.js');
  ok(/from '\.\/golfetiquette\.js'/.test(pp) && /etqBegin\(g\.etq, h\.par\)/.test(pp), 'pitchputt.js speelt de etiquette af bij het begin van elke baan');
  ok(/etqStep\(g\.etq, dt, \{ laadt: charging, draait: turning, schiet: g\.strokes > shotsBefore \}\)/.test(pp), 'pitchputt.js geeft de toetsen van de speler door');
  ok(/etqHoleDone\(g\.etq, h\.par, strokes/.test(pp) && /etqEinde\(g\.etq/.test(pp), 'pitchputt.js laat de score en het eind aan Sir Cedric');
  ok(/bubble\(w, \{ x: c\.position\.x, y: c\.position\.z, name: e\.wie === 'sir' \? SIR : WOLFIE/.test(pp), 'de regels komen als tekstballon, niet als stem');
  ok(!/\.etq\.(strokes|penalty)|g\.strokes \+= /.test(pp), 'de etiquette raakt de slagen van de speler niet aan');
  ok(/built\.sir, built\.wolfie\);/.test(pp), 'de figuren gaan weg als de baan van plek wisselt');
  ok(!/new Audio\(|speechSynthesis|playVoice/.test(pp), 'pitchputt.js speelt geen stem af');
  // de gebeurtenissen hebben { wie, sleutel, tekst }: pitchputt.js leest tekst (een e.text gaf een uitzondering bij het starten van een ronde)
  const etqCode = pp.slice(pp.indexOf('function etqSay'), pp.indexOf('function pendule'));
  ok(/e\.tekst/.test(etqCode) && !/e\.text\b/.test(etqCode), 'pitchputt.js leest het veld tekst van de gebeurtenissen');
  const ev = beginHole(newEtiquette(rng(9)), 3);
  ok(ev.length > 0 && ev.every((x) => typeof x.tekst === 'string' && typeof x.wie === 'string' && typeof x.sleutel === 'string'), 'elke gebeurtenis heeft wie, sleutel en tekst');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
