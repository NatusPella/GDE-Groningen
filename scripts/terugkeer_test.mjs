// #986 #987: de terugkeerscène (Doorgaan): fasekeuze uit de verhaalvoortgang, rotatie zonder herhaling, opslag per
// apparaat, voorwaarden en de vignetten zelf (geldig, kort, Nederlands, geen merken).
// node scripts/terugkeer_test.mjs
import fs from 'node:fs';
import { terugkeerFase, FASES, FASE_VANAF, kiesVignet, leesLaatste, schrijfLaatste, TERUGKEER_KEY, terugkeerBlockers, terugkeerKan, terugkeerBeslis, TERUGKEER_WACHT_MAX_S } from '../game/js/terugkeer.js';
import { VIGNETTEN, vignettenVoor, bouwTerugkeerScene, terugkeerRegels } from '../game/js/terugkeerscenes.js';
import { validateScene, compileScene, ACTOR_ANIMS } from '../game/js/cutscript.js';
import { STEPS } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// --- fasen ---------------------------------------------------------------------------------------------------------
ok(terugkeerFase('M00') === 1 && terugkeerFase('M01') === 1 && terugkeerFase('M11') === 1, 'akte 1 en 2 zijn fase 1 (huisgenoten)');
ok(terugkeerFase('M12') === 2 && terugkeerFase('M16') === 2 && terugkeerFase('A2') === 2 && terugkeerFase('M22') === 2, 'M12 tot en met M22 is fase 2 (vrienden)');
ok(terugkeerFase('M23') === 3 && terugkeerFase('M26') === 3 && terugkeerFase('E') === 3, 'na de knuffel (M23) tot en met het slot is fase 3 (relatie)');
ok(terugkeerFase('M27') === 4 && terugkeerFase('M30') === 4, 'nazomer is fase 4 (na het slot)');
ok(terugkeerFase(null, { end: true }) === 4 && terugkeerFase('M01', { end: true }) === 4, 'het einde van het gebouwde verhaal is fase 4');
ok(terugkeerFase('bestaat-niet') === 1 && terugkeerFase(undefined) === 1, 'onbekende stap: terugval op fase 1');
// monotoon: elke stap in volgorde geeft een fase die nooit terugloopt
let prev = 1, mono = true;
for (const s of STEPS) { const f = terugkeerFase(s.id); if (f < prev) mono = false; prev = f; }
ok(mono, 'de fase loopt nooit terug langs de stappen van het verhaal');
ok(FASES.every((f) => STEPS.some((s) => s.id === FASE_VANAF[f])), 'elke fasegrens verwijst naar een bestaande stap');
ok(FASES.every((f) => terugkeerFase(FASE_VANAF[f]) === f), 'elke fase begint bij zijn eerste stap');

// --- rotatie -------------------------------------------------------------------------------------------------------
for (const f of FASES) {
  const lijst = vignettenVoor(f);
  ok(lijst.length >= 4, `fase ${f} heeft minstens vier vignetten`, lijst.length);
  // nooit twee keer dezelfde achter elkaar, bij elke mogelijke vorige en elke mogelijke dobbelsteen
  let dubbel = false;
  for (const laatste of lijst.map((v) => v.id)) for (const r of [0, 0.01, 0.3, 0.5, 0.74, 0.99, 0.9999]) if (kiesVignet(lijst, laatste, () => r).id === laatste) dubbel = true;
  ok(!dubbel, `fase ${f}: nooit twee keer hetzelfde achter elkaar`);
  const gezien = new Set(); for (let i = 0; i < 400; i++) gezien.add(kiesVignet(lijst, null, () => i / 400).id);
  ok(gezien.size === lijst.length, `fase ${f}: elk vignet komt aan de beurt`, gezien.size);
}
ok(kiesVignet([], null) === null && kiesVignet(null, null) === null, 'lege lijst geeft null');
ok(kiesVignet([{ id: 'a' }], 'a', () => 0.5).id === 'a', 'één kandidaat: geen keus, dus die');
ok(kiesVignet([{ id: 'a' }, { id: 'b' }], 'a', () => NaN).id === 'b', 'een kapotte dobbelsteen (NaN) geeft toch een geldig vignet');
ok(kiesVignet([{ id: 'a' }, { id: 'b' }], 'a', () => 5).id === 'b', 'een dobbelsteen buiten [0,1) geeft toch een geldig vignet');

// --- opslag per apparaat ---------------------------------------------------------------------------------------------
{
  const mem = new Map();
  const st = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); } };
  ok(TERUGKEER_KEY.startsWith('gde-'), 'de sleutel heet gde-*');
  ok(leesLaatste(st) === null, 'leeg: nog niets gespeeld');
  ok(schrijfLaatste(st, 'f1-pan') && leesLaatste(st) === 'f1-pan', 'schrijven en teruglezen');
  mem.set(TERUGKEER_KEY, '{kapot');
  ok(leesLaatste(st) === null, 'kapotte opslag: geen fout, gewoon leeg');
  mem.set(TERUGKEER_KEY, JSON.stringify({ laatste: 42 }));
  ok(leesLaatste(st) === null, 'een getal als id telt niet');
  ok(leesLaatste(null) === null && !schrijfLaatste(null, 'x') && !schrijfLaatste(st, 7), 'zonder opslag of met een slecht id: geen fout');
  const kapot = { getItem() { throw new Error('geblokkeerd'); }, setItem() { throw new Error('vol'); } };
  ok(leesLaatste(kapot) === null && schrijfLaatste(kapot, 'x') === false, 'een geblokkeerde of volle opslag breekt niets');
  // een bestaande save blijft heel: de terugkeerscène schrijft nooit onder een andere sleutel
  mem.set('gde-save-v1', 'SAVE'); mem.set('gde-settings', 'INST');
  schrijfLaatste(st, 'f2-proeven');
  ok(mem.get('gde-save-v1') === 'SAVE' && mem.get('gde-settings') === 'INST', 'saves en instellingen blijven onaangeroerd');
}

// --- voorwaarden -----------------------------------------------------------------------------------------------------
const calm = { uit: false, started: true, loading: false, loaded: true, client: false, session: false, openingDue: false, missionActive: false, cinematicActive: false, sinceCinematicS: 1e9, narrativeBusy: false, pigeon: false, respawn: false, inVehicle: false, wanted: 0, sinceDeathS: 1e9, menuOpen: false, dataReady: true };
const met = (o) => ({ ...calm, ...o });
ok(terugkeerKan(calm), 'een rustig geladen spel mag de scène');
for (const [k, v, naam] of [['uit', true, 'instelling'], ['started', false, 'gestart'], ['loading', true, 'laadscherm'], ['loaded', false, 'geladen'], ['client', true, 'meespeler'], ['session', true, 'Samen spelen'], ['openingDue', true, 'opening'], ['missionActive', true, 'missie'], ['cinematicActive', true, 'film'], ['narrativeBusy', true, 'vertelling'], ['pigeon', true, 'duif'], ['respawn', true, 'terugzetten'], ['inVehicle', true, 'voertuig'], ['wanted', 2, 'politie'], ['sinceDeathS', 5, 'dood'], ['menuOpen', true, 'menu'], ['dataReady', false, 'verhaaldata'], ['sinceCinematicS', 0.5, 'net afgelopen']]) {
  const b = terugkeerBlockers(met({ [k]: v }));
  ok(b.length === 1 && b[0].includes(naam), `blokkeerder ${k} wordt bij naam genoemd`, b.join('|'));
}
ok(terugkeerBlockers(met({ missionActive: true, inVehicle: true, wanted: 3 })).length === 3, 'alle redenen worden genoemd');
ok(terugkeerBeslis({ blockers: [], wachtS: 0.2, rustigS: 0.2 }) === 'wacht', 'pas spelen als het even rustig is geweest');
ok(terugkeerBeslis({ blockers: [], wachtS: 2, rustigS: 1.1 }) === 'speel', 'rustig genoeg: spelen');
ok(terugkeerBeslis({ blockers: ['missie actief'], wachtS: 3, rustigS: 0 }) === 'wacht', 'een blokkeerder: wachten');
ok(terugkeerBeslis({ blockers: ['missie actief'], wachtS: TERUGKEER_WACHT_MAX_S + 1, rustigS: 0 }) === 'geef-op', 'te lang wachten: opgeven (niet midden in iets anders storen)');
ok(terugkeerBeslis({ blockers: [], wachtS: TERUGKEER_WACHT_MAX_S + 1, rustigS: 5 }) === 'geef-op', 'ook rustig maar te laat: opgeven');

// --- de vignetten ----------------------------------------------------------------------------------------------------
const ids = VIGNETTEN.map((v) => v.id);
ok(new Set(ids).size === ids.length, 'ids zijn uniek');
ok(VIGNETTEN.length >= 24, 'minstens 24 vignetten in totaal', VIGNETTEN.length);
const VERBODEN = /\b(google|facebook|instagram|whatsapp|netflix|coca|mcdonald|albert heijn|jumbo|spotify|ikea|trump|poetin)\b/i;
const ENGELS = /\b(the|and|you|your|what|hello|please)\b/i;
for (const v of VIGNETTEN) {
  const naam = v.id;
  ok(['keuken', 'woonkamer'].includes(v.set), `${naam}: set is de keuken of de woonkamer`);
  const { def, lines, duration } = bouwTerugkeerScene(v);
  ok(duration >= 6 && duration <= 12, `${naam}: duurt 6 tot 12 s`, duration);
  ok(lines.length >= 4 && lines.length <= 5, `${naam}: vier of vijf regels`, lines.length);
  const issues = validateScene(def, { lines, duration });
  ok(issues.length === 0, `${naam}: geldige cutscript-definitie`, issues.join(' | '));
  let compiled = null;
  try { compiled = compileScene(def, { lines, duration }); } catch (e) { ok(false, `${naam}: compileert`, e.message); }
  if (compiled) {
    let bad = '';
    for (let t = 0; t <= duration; t += 0.5) {
      const s = compiled.sample(t, { x: 0, y: 0, facing: 0, z: 0 }, null);
      if (!s || !s.camera || ![s.camera.position.x, s.camera.position.y, s.camera.position.z].every(Number.isFinite)) bad = `camera t=${t}`;
      for (const a of Object.values(s.actors)) if (![a.x, a.y].every(Number.isFinite)) bad = `acteur t=${t}`;
    }
    ok(!bad, `${naam}: elke halve seconde een geldige camera en geldige figuren`, bad);
  }
  for (const l of lines) {
    ok(!VERBODEN.test(l.text) && !ENGELS.test(l.text), `${naam}: geen merk of Engels in "${l.text}"`);
    ok(l.text.length <= 52, `${naam}: korte regel`, l.text.length);
  }
  ok(v.regels.every(([w, , g]) => ['tammo', 'tessa'].includes(w) && (!g || ACTOR_ANIMS.includes(g))), `${naam}: sprekers en gebaren bestaan`);
  ok(terugkeerRegels(v).duration === duration, `${naam}: regels en scène delen dezelfde duur`);
}
// geen woord over de zomer van de eigenaar: altijd zomer, geen winter (constitutie 3)
ok(!VIGNETTEN.some((v) => v.regels.some(([, t]) => /winter|sneeuw|ijs\b|kerst/i.test(t))), 'altijd zomer: geen winter in de regels');

// de bron: de runner houdt zich aan dezelfde regels en raakt geen speler, klok of telefoon aan
{
  const run = fs.readFileSync(new URL('../game/js/terugkeerrun.js', import.meta.url), 'utf8');
  ok(/terugkeerBlockers/.test(run) && /kiesVignet/.test(run) && /schrijfLaatste/.test(run), 'terugkeerrun.js gebruikt de zuivere regels');
  ok(!/world\.clock\s*=|w\.clock\s*=|\.phone/.test(run.replace(/\/\/.*$/gm, '')), 'terugkeerrun.js zet de klok niet en raakt de telefoon niet aan');
  ok(!/\.(x|y)\s*=[^=]/.test(run.replace(/\/\/.*$/gm, '')), 'terugkeerrun.js verplaatst de speler niet');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
