// Doel en volgende stap in akte 1 altijd duidelijk, met weinig tekst (audit speelbaarheid en UX 23-11, akte 1 op eindniveau):
//   - elke verhaalstap van akte 1 (deel 'kop') heeft een kort doel in de balk (stepdoel.js, hoogstens MAX_DOEL tekens);
//   - elke speelbare missiestap van de akte-1-missies heeft een label (de doelregel) van hoogstens MAX_DOEL tekens, met een werkwoord
//     of richting voorop, en geen label dat de titel van de missie herhaalt;
//   - wat de metgezel erbij zegt (say) is hoogstens 25 woorden: details staan in het appje en in Te doen.
// Puur: de missiedefinities worden gebouwd met een kale kaart (geen wereld nodig).
//   node scripts/akte1_stapdoelen_test.mjs
import './node3d.mjs';

const { buildNieuwDefs } = await import('../game/js/missions_nieuw.js');
const { buildDefsVoorMuseum, buildDefsNaMuseum } = await import('../game/js/missions_defs.js');
const { STEPS } = await import('../game/js/storyarc_nieuw.js');
const { stepDoel, MAX_DOEL } = await import('../game/js/stepdoel.js');

let bad = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info === '' ? '' : `(${info})`); } };

const kaal = new Proxy({}, { get: (t, k) => (['landmarks', 'buildings', 'roads', 'shops'].includes(k) ? [] : () => []) });
const pt = (x, y) => ({ x, y, road: null });
const defs = [...buildDefsVoorMuseum({ map: kaal, walk: pt, drive: pt }), ...buildDefsNaMuseum({ map: kaal, walk: pt, drive: pt }), ...buildNieuwDefs({ map: kaal, walk: pt, drive: pt })];

const akte1 = STEPS.filter((s) => s.part === 'kop');
ok(akte1.length >= 8, 'akte 1 heeft zijn stappen', akte1.length);
for (const s of akte1) {
  const d = stepDoel(s);
  ok(!!d && d.length <= MAX_DOEL, `${s.id}: kort doel in de balk`, d);
  // 23-11 (beeldcontrole coördinator): een doel is één werkwoordelijke zin, geen 'X: bijzin'
  if (s.id !== 'M00') ok(!/:/.test(d), `${s.id}: doel zonder dubbele punt met bijzin`, d);
}

// Een doel begint met wat je doet of waar je heen gaat (Ga, Rij, Stap, Naar, Haal, ...): geen titel, geen grap.
const WERKWOORD = /^(Ga|Rij|Stap|Naar|Haal|Wacht|Schrijf|Spot|Lever|Breng|Volg|Zoek|Loop|Fiets|Vaar|Vlieg|Kijk|Praat|Houd|Pak|Duw|Ren|Klim|Spring|Glip|Lees|Terug|Kies|Betaal|Pin|Trek|Help|Blijf|Land|Sluip|Wees|Verwissel|Verdedig|Draag|Laat|Overtuig|Hoor|Luister|Maak|Zet|Open|Sla|Til|Win|Ontwijk|Bezorg|Rijd|Drijf|Vang|Proef|Door|Peuter|Kraak|Rol|Weg|Alarm)\b/;
const missies = akte1.filter((s) => s.kind === 'mission');
// M06 (museumkraak) staat nog in missions.js (zie missions_defs.js): de stappen uit de bron gelezen, zonder het spel te laden.
import fs from 'node:fs';
const missionsBron = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
function uitBron(titel) {
  const a = missionsBron.indexOf(`label: '${titel}'`);
  if (a < 0) return null;
  const b = missionsBron.indexOf('\n    },\n    {', a);
  const stages = [];
  for (const regel of missionsBron.slice(a, b > a ? b : a + 20000).split('\n')) {
    const k = /\{ kind: '(\w+)'/.exec(regel);
    if (!k) continue;
    const labels = [...regel.matchAll(/label: '((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
    const say = /say: '((?:[^'\\]|\\.)*)'/.exec(regel);
    stages.push({ kind: k[1], label: labels.length ? labels[labels.length - 1] : '', say: say ? say[1] : '' });
  }
  return { label: titel, stages };
}
for (const s of missies) {
  const def = defs.find((d) => d.label === s.title || d.id === s.mission) || uitBron(s.title);
  ok(!!def, `${s.id} (${s.mission}): definitie gevonden`, s.title);
  if (!def) continue;
  for (const [i, st] of (def.stages || []).entries()) {
    if (st.kind === 'scene') continue;
    const label = String(st.label || '');
    ok(label.length > 0 && label.length <= MAX_DOEL, `${s.id} stap ${i} (${st.kind}): doelregel hoogstens ${MAX_DOEL} tekens`, `${label.length}: ${label}`);
    ok(WERKWOORD.test(label), `${s.id} stap ${i}: doelregel begint met wat je doet`, label);
    ok(!/: /.test(label), `${s.id} stap ${i}: doelregel zonder dubbele punt met bijzin`, label);
    ok(label !== s.title, `${s.id} stap ${i}: doelregel is niet de titel`, label);
    const w = String(st.say || '').split(/\s+/).filter(Boolean).length;
    ok(w <= 25, `${s.id} stap ${i}: wat erbij gezegd wordt is kort (hoogstens 25 woorden)`, w);
  }
}

console.log(bad ? `akte1_stapdoelen_test: ${bad} van ${n} fout` : `akte1_stapdoelen_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
