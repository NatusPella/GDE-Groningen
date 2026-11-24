// Audit van het cutscene-geluid als data (game/js/cutscenesfx.js, feedback eigenaar 24-11):
//   node scripts/cutscene_sfx_test.mjs
// - elke sfx-id in cutscenesfx.js bestaat in sfx/sfxlist.js (sfxIdEvent) en audio.js speelt zijn soort gebeurtenis af;
// - elke scene die de game speelt (alle specs van akte 1-6, de openingsakten, de terugkeer-vignetten) heeft een regel met een ambient-bed;
// - een scene met een zichtbaar geluidsmoment (instappen in een auto, een kat, een friteuse, een set binnen, applaus in de regie) heeft de cue;
// - elk tijdsanker bestaat in de echte regels (script.json), en in akte 1 landt elke cue op de echte tijdlijn, zonder dubbel met de eigen fx;
// - de host vuurt het plan (planEvent, warm) en zet het bed (world.cutsceneAmb); de omgeving telt een cutscene niet als pauzemenu.
import { readFileSync } from 'node:fs';
import { CUT_SFX, GATEN, cueTime, sceneSfx, sceneAmbience } from '../game/js/cutscenesfx.js';
import { audioPlan, sceneCues, planEvent, warmKeys } from '../game/js/cutaudio.js';
import { sfxIdEvent } from '../game/js/sfx/sfxlist.js';
import { ROOM_TONES } from '../game/js/sfx/binnenklank.js';
import { SPECS, MORE_SPECS, missionScene } from '../game/js/cutscenes_akte1.js';
import '../game/js/cutscenes_akte3.js';
import '../game/js/cutscenes_akte4.js';
import '../game/js/cutscenes_akte5.js';
import '../game/js/cutscenes_akte6.js';
import { OPENING_ACTS, END_CARD } from '../game/js/cutscenes.js';
import { VIGNETTEN } from '../game/js/terugkeerscenes.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const read = (f) => readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const audioSrc = read('audio.js'), hostSrc = read('cutscenehost.js'), ambSrc = read('sfx/ambience.js');
const data = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));

const OUTDOOR = ['stad', 'dorp', 'ommeland', 'water', 'haven', 'kust', 'kermis'];
const ALL_SPECS = { ...SPECS, ...MORE_SPECS };

// 1. elke id bestaat in sfxlist en audio.js speelt zijn soort
const kinds = new Set();
let cues = 0;
for (const [id, s] of Object.entries(CUT_SFX)) {
  ok(s && typeof s.amb === 'string', id + ': heeft een ambient-bed');
  const m = /^binnen:(\w+)$/.exec(s.amb || '');
  ok(m ? Object.prototype.hasOwnProperty.call(ROOM_TONES, m[1]) : OUTDOOR.includes(s.amb), id + ': bed bestaat', s.amb);
  ok(Array.isArray(s.cues), id + ': cues is een lijst');
  for (const c of s.cues || []) {
    cues++;
    const ev = sfxIdEvent(c.id);
    ok(!!ev, `${id}: sfx-id ${c.id} bestaat in sfxlist`);
    if (ev) kinds.add(ev.kind);
    ok((c.on !== undefined) !== (c.t !== undefined), `${id} ${c.id}: precies een anker (on of t)`);
    if (c.at) ok(Array.isArray(c.at) && c.at.length === 2 && c.at.every(Number.isFinite), `${id} ${c.id}: at is [f, s]`);
    if (/^stap:/.test(c.id)) ok(c.n >= 1 && c.n <= 16 && c.every > 0.2 && c.every < 1.2, `${id} ${c.id}: n en every zijn voetstappen`);
    ok(!/^sfx:ui_|^fx:ui_|^fx:missie_|^fx:scene_|^fx:medaille_/.test(c.id), `${id} ${c.id}: geen menu- of stingklank als wereldgeluid`);
  }
}
for (const k of kinds) ok(k === 'fx' || k === 'sample' ? new RegExp(`case '${k}': play`).test(audioSrc) : new RegExp(`case '${k}'`).test(audioSrc), 'audio.js speelt ' + k);
ok(cues >= 60, 'er zijn genoeg cues', String(cues));
ok(!sfxIdEvent('sfx:bestaat_niet') && !sfxIdEvent('fx:nope') && !sfxIdEvent('ev:nope') && !sfxIdEvent('stap:ijs') && !sfxIdEvent('car_pass'), 'een onbekende id wordt geweigerd');
ok(sfxIdEvent('ev:weapon/carbid').sub === 'carbid' && sfxIdEvent('ev:animal/seagull').name === 'seagull', 'ev:<soort>/<sub> kiest de sub');
ok(sfxIdEvent('fx:horeca_hap') && sfxIdEvent('stap:grind').key === 'stap_grind_0', 'basisnaam met varianten en voetstappen');

// 2. elke scene die de game speelt heeft een regel
const playable = [
  ...Object.keys(ALL_SPECS).map((k) => 'story-' + k),
  ...OPENING_ACTS.map((d) => d.id), END_CARD.id,
  ...VIGNETTEN.map((v) => 'terugkeer-' + v.id),
];
for (const id of playable) ok(!!sceneSfx(id), id + ': staat in cutscenesfx.js');
for (const id of Object.keys(CUT_SFX)) ok(playable.includes(id) || ['story-avond', 'story-wachten'].includes(id), id + ': is een scene die de game speelt');
for (const g of GATEN) ok(!!sceneSfx(g.scene) && typeof g.wat === 'string' && g.wat.length > 10, 'gat beschreven: ' + g.scene);

// 3. zichtbare geluidsmomenten hebben hun cue (de regels die een spec of def zelf laat zien)
const has = (id, re) => ((sceneSfx(id) || {}).cues || []).some((c) => re.test(c.id));
const regieOf = (key) => data.scenes.filter((s) => s.id === key).map((s) => (s.regie || []).join(' ')).join(' ');
for (const [key, spec] of Object.entries(ALL_SPECS)) {
  const id = 'story-' + key;
  const props = spec.props || {};
  const kinds2 = Object.values(props).map((p) => p.kind);
  const allCues = [...(spec.open || []), ...(spec.beats || [])];
  if (spec.set) ok((sceneAmbience(id) || {}).binnen, id + ': een set binnen heeft een bed binnen', spec.set);
  if (kinds2.includes('kat')) ok(has(id, /^sfx:cat_meow$/), id + ': een kat in beeld miauwt');
  if (kinds2.includes('friteuse')) ok(has(id, /^sfx:fryer_sizzle$/), id + ': de friteuse sist');
  // instappen: het duo verdwijnt (hide) bij een auto die blijft staan of daarna wegrijdt
  const duoHides = allCues.some((c) => (c.actor === 'tammo' || c.actor === 'tessa') && c.hide === true && c.on !== undefined);
  if (duoHides && kinds2.some((k) => k === 'auto' || k === 'bakkie')) ok(has(id, /^ev:door_open$/) && has(id, /^ev:engine_start$/), id + ': instappen geeft portier en motor');
  if (/applaudisseert|applaus/.test(regieOf(key))) ok(has(id, /^ev:applause$/), id + ': applaus uit de regie');
}
const keuken = OPENING_ACTS.find((d) => d.id === 'story-opening-keuken');
ok(keuken.fx.some((f) => f.fx === 'buzz') && has(keuken.id, /^sfx:phone_vibrate$/), 'keuken: de telefoon die trilt klinkt ook');
const verhuis = OPENING_ACTS.find((d) => d.id === 'story-opening-verhuisdag');
ok(verhuis.cues.some((c) => c.hide) && has(verhuis.id, /^ev:door_open$/) && has(verhuis.id, /^ev:engine_start$/), 'verhuisdag: instappen in de Escapade');
for (const v of VIGNETTEN) ok((sceneAmbience('terugkeer-' + v.id) || {}).binnen, 'terugkeer-' + v.id + ': binnen');

// 4. ankers bestaan in de echte regels
const scriptLines = (prefix) => data.scenes.filter((s) => s.id === prefix || s.id.startsWith(prefix + '.')).flatMap((s) => s.lines.filter((l) => l.channel !== 'app-stil'));
const OPENING_SCENE = { 'story-opening-trailer': 'C00.1', 'story-opening-keuken': 'C00.2', 'story-opening-verhuisdag': 'C00.3' };
for (const [id, s] of Object.entries(CUT_SFX)) {
  for (const c of s.cues) {
    if (typeof c.on === 'string' && c.on !== 'end') {
      const prefix = id.replace(/^story-/, '').split(/[.#]/)[0];
      ok(scriptLines(prefix).some((l) => l.text.startsWith(c.on)), `${id}: anker '${c.on}' staat in de regels van ${prefix}`);
    }
    const m = typeof c.t === 'string' && /^L(\d+)/.exec(c.t);
    if (m && OPENING_SCENE[id]) ok(+m[1] < scriptLines(OPENING_SCENE[id]).length, `${id}: ${c.t} bestaat in ${OPENING_SCENE[id]}`);
    if (m && id.startsWith('terugkeer-')) { const v = VIGNETTEN.find((q) => 'terugkeer-' + q.id === id); ok(v && +m[1] < v.regels.length, `${id}: ${c.t} bestaat`); }
  }
}

// 5. akte 1 op de echte tijdlijn (dezelfde opbouw als scripts/cutscenes_akte1_test.mjs): elke cue landt, binnen de scene, zonder dubbel
const src = read('missionstory.js');
const looks = {};
for (const m of src.matchAll(/^  (\w+): \{.*?name: '([^']+)'/gm)) looks[m[1]] = { name: m[2], shirt: 0x808080, skin: 0xd0a080 };
const SCENES = {
  'M01.intro': ['M01.1'], 'M01.outro': ['M01.6'], 'M02.intro': ['M02.1'], 'M02.outro': ['M02.3'],
  'M03.intro': ['M03.1'], 'M03.outro': ['M03.4'], 'M04.intro': ['M04.1'], 'M04.outro': ['M04.3'],
  'M05.intro': ['M05.1'], 'M05.outro': ['M05.3'], 'M06.intro': ['M06.1'], 'M01.3': ['M01.3'], 'M01.5': ['M01.5'], 'M03.2': ['M03.2'],
};
const NAME = { T: 'Tammo', A: 'Anita' };
function linesOf(ids) {
  const out = [];
  let t = 0.6;
  for (const sid of ids) for (const l of data.scenes.find((s) => s.id === sid).lines) {
    if (l.channel === 'app-stil') continue;
    const dur = Math.max(2.2, Math.min(8, 1.3 + l.text.length * 0.058));
    out.push({ speaker: NAME[l.key] || (looks[l.key] && looks[l.key].name) || l.key, text: l.text, at: t, dur });
    t += dur + 0.1;
  }
  return { lines: out, total: t + 0.3 };
}
let akte1 = 0;
for (const [key, ids] of Object.entries(SCENES)) {
  const id = 'story-' + key;
  const { lines, total } = linesOf(ids);
  const def = missionScene(key, lines, { looks });
  ok(def && def.id === id, key + ': def-id is ' + id, def && def.id);
  if (!def) continue;
  const want = sceneSfx(id).cues.reduce((a, c) => a + (/^stap:/.test(c.id) ? c.n : 1), 0);
  const got = sceneCues(id, lines, total);
  ok(got.length === want, key + ': elke cue landt op de tijdlijn', `${got.length}/${want}`);
  for (const p of got) ok(p.t >= 0 && p.t <= total + 1, key + ': cue binnen de scene', `${p.id} ${p.t.toFixed(2)} / ${total.toFixed(1)}`);
  const plan = audioPlan(def, lines, total);
  ok(plan.filter((p) => p.why === 'scene').length === got.length, key + ': het plan neemt de cues op');
  ok(plan.every((p, i) => i === 0 || plan[i - 1].t <= p.t) && plan.every((p) => p.ev && p.ev.kind), key + ': plan gesorteerd, elk item een event');
  akte1 += got.length;
}
ok(akte1 >= 40, 'akte 1 heeft genoeg geluidsmomenten', String(akte1));
// de openingsakten op hun eigen tijdlijn (de def zelf, regels uit C00.x)
for (const def of OPENING_ACTS) {
  const sid = OPENING_SCENE[def.id];
  const { lines, total } = linesOf([sid]);
  const got = sceneCues(def.id, lines, total);
  const want = sceneSfx(def.id).cues.reduce((a, c) => a + (/^stap:/.test(c.id) ? c.n : 1), 0);
  ok(got.length === want, def.id + ': elke cue landt', `${got.length}/${want}`);
  const plan = audioPlan(def, lines, total);
  const own = (def.fx || []).filter((f) => f.fx === 'sfx');
  for (const f of own) ok(plan.filter((p) => p.why === 'scene' && p.kind === f.kind).length === 0 || f.kind !== 'door_open', def.id + ': geen dubbele deur');
}

// 6. de host, de warmte en de plek
ok(/audioPlan\(def, scene\.lines, scene\.duration\)/.test(hostSrc) && /planEvent\(f\.plan, anchor\)/.test(hostSrc), 'de host vuurt het plan op zijn plek in de set');
ok(/w\.cutsceneAmb = amb/.test(hostSrc) && /w\.cutsceneAmb === amb\) w\.cutsceneAmb = null/.test(hostSrc), 'de host zet het bed en ruimt het op');
ok(/fired\.add\(f\); if \(t - f\.t0 < 1\) sfx\(f\)/.test(hostSrc), 'een cue die al voorbij is (gast stapt later in, tijdsprong) klinkt niet als salvo');
ok(/kind: 'warm'/.test(hostSrc) && /case 'warm'/.test(audioSrc), 'de host warmt de opnames vooraf');
ok(/world\.cutsceneAmb/.test(ambSrc) && /export function stil\(world\)/.test(ambSrc) && !/[^!]!world\.paused/.test(ambSrc), 'de omgeving leest het bed en telt een cutscene niet als pauze');
const pe = planEvent({ ev: { kind: 'fx', name: 'car_pass' }, at: [2, 1] }, { x: 100, y: 50, facing: Math.PI / 2 });
ok(Math.abs(pe.x - 99) < 1e-9 && Math.abs(pe.y - 52) < 1e-9 && pe.kind === 'fx' && pe.name === 'car_pass', 'planEvent: lokale f, s naar de wereld', `${pe.x},${pe.y}`);
const wk = warmKeys(sceneCues('story-M02.intro', linesOf(['M02.1']).lines, 60));
ok(wk.includes('tractor_start_0') && wk.some((k) => k.startsWith('stap_ren_')), 'warmKeys: de opnames van het plan', wk.join());
ok(sceneAmbience('story-M03.intro').room === 'kantoor' && sceneAmbience('story-M01.intro').binnen === false && sceneAmbience('nope') === null, 'sceneAmbience');
ok(cueTime({ on: 'end', dt: -1 }, [], 10) === 9 && cueTime({ t: 'L1+0.5' }, [{ at: 0 }, { at: 3 }], 10) === 3.5 && cueTime({ on: 'Bestaat niet' }, [{ text: 'x', at: 1 }], 10) === null, 'cueTime');

// 7. samen spelen: de gast speelt dezelfde def (coopcut.js stuurt def mee) en dus hetzelfde plan, lokaal; er gaat geen geluid over het net
ok(/scène\.defId = def\.id/.test(read('coopcut.js')) && /m\.playScript\(w, p\.def/.test(read('coopcut.js')), 'de gast speelt de def met dezelfde id (zelfde cues, lokaal)');

console.log(fails ? `FAIL ${fails}/${n}` : `PASS ${n} checks (${Object.keys(CUT_SFX).length} scenes, ${cues} cues, ${GATEN.length} gaten)`);
process.exit(fails ? 1 : 0);
