// M01-M06 als speler-ervaring (23-11, akte 1 op eindniveau): wat een speler bij elke missie van akte 1 krijgt, zonder het spel te spelen.
//   - bij succes: een korte afsluiter die zegt wat er gebeurde en wat het volgende doel is ("... Nieuw doel: ...")
//   - bij falen: een reden in één zin (klok om, voertuig kwijt) en een kaart die Opnieuw proberen noemt
//   - geen tekstmuren: afsluiter hoogstens 30 woorden, de introzinnen hoogstens 30 woorden per zin en hoogstens twee zinnen
//   - een missie met een klok heeft een tijd die te halen is (minstens 45 s) en een eigen tekst als de tijd om is, of de algemene
//   - een missie met een eigen voertuig heeft een korte reden voor elk soort verlies van dat voertuig
// De doelregels per stap keurt akte1_stapdoelen_test.mjs, de regie akte1_regie_test.mjs, de missiestart missiestart_test.mjs.
//   node scripts/akte1_ervaring_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { buildNieuwDefs } = await import('../game/js/missions_nieuw.js');
const { buildDefsVoorMuseum, buildDefsNaMuseum } = await import('../game/js/missions_defs.js');
const { STEPS } = await import('../game/js/storyarc_nieuw.js');

let bad = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info === '' ? '' : `(${info})`); } };
const woorden = (s) => String(s || '').split(/\s+/).filter(Boolean).length;
const kaal = new Proxy({}, { get: (t, k) => (['landmarks', 'buildings', 'roads', 'shops'].includes(k) ? [] : () => []) });
const pt = (x, y) => ({ x, y, road: null });
const defs = [...buildDefsVoorMuseum({ map: kaal, walk: pt, drive: pt }), ...buildDefsNaMuseum({ map: kaal, walk: pt, drive: pt }), ...buildNieuwDefs({ map: kaal, walk: pt, drive: pt })];
const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const missionsBron = bron('missions.js');

// M06 (de museumkraak) staat nog in missions.js: de velden die hier tellen uit de bron
function museumUitBron(titel) {
  const a = missionsBron.indexOf(`label: '${titel}'`);
  const blok = missionsBron.slice(a, a + 3000);
  const veld = (k) => { const m = new RegExp(`\\n\\s*${k}: '((?:[^'\\\\]|\\\\.)*)'`).exec(blok); return m ? m[1].replace(/\\'/g, "'") : null; };
  return { label: titel, outro: veld('outro'), intro: [], timeLimit: null };
}

const missies = STEPS.filter((s) => s.part === 'kop' && s.kind === 'mission');
ok(missies.length === 6, 'akte 1 heeft zes missies (M01-M06)', missies.length);
for (const s of missies) {
  const d = defs.find((x) => x.label === s.title) || museumUitBron(s.title);
  ok(!!d && !!d.label, `${s.id}: definitie`);
  // succes: wat er gebeurde en het volgende doel, kort
  ok(/Nieuw doel: \S/.test(d.outro || ''), `${s.id}: de afsluiter noemt het volgende doel`, d.outro);
  ok(woorden(d.outro) <= 30, `${s.id}: de afsluiter is kort (hoogstens 30 woorden)`, woorden(d.outro));
  // geen tekstmuur in de intro (die speelt als er geen verhaalscène is)
  const intro = [].concat(d.intro || []);
  ok(intro.length <= 2, `${s.id}: hoogstens twee introzinnen`, intro.length);
  for (const z of intro) ok(woorden(z) <= 30, `${s.id}: introzin hoogstens 30 woorden`, `${woorden(z)}: ${z.slice(0, 50)}`);
  // een klok die te halen is, en wat er gebeurt als hij om is
  if (Number.isFinite(d.timeLimit)) {
    ok(d.timeLimit >= 45, `${s.id}: de klok is te halen (minstens 45 s)`, d.timeLimit);
    ok(!d.timeUp || woorden(d.timeUp) <= 20, `${s.id}: de reden bij 'tijd op' is één korte zin`, d.timeUp);
  }
  // een eigen voertuig: een reden voor elk soort verlies
  if (d.vehicleFail) for (const k of ['gone', 'wrecked', 'left']) ok(woorden(d.vehicleFail[k]) > 0 && woorden(d.vehicleFail[k]) <= 20, `${s.id}: reden als het voertuig ${k} is`, d.vehicleFail[k]);
}

// de kaart bij falen noemt Opnieuw proberen, de algemene 'tijd op' bestaat
const verhaal = bron('missionstory.js');
ok(/kind: 'fail'[^\n]*opnieuw: true/.test(verhaal), 'de faalkaart van een verhaalmissie noemt Opnieuw proberen');
ok(/Opnieuw proberen/.test(bron('bigmoment.js')), 'de grote kaart toont Opnieuw proberen');
ok(/tijd op\. Zelfs de bus was sneller/.test(missionsBron), 'er is een algemene reden als de tijd om is');

console.log(bad ? `akte1_ervaring_test: ${bad} van ${n} fout` : `akte1_ervaring_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
