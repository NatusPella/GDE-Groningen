// Bot-sim van de voetbalwedstrijd (#981): 100 wedstrijden computer tegen computer, met statistiek en bewakers: scripts/voetbal_botsim.mjs [aantal] [--duur=kort|normaal] [--stand=standaard] [--stil]
// Eisen: gemiddeld 2 tot 5 doelpunten per wedstrijd, geen vastlopers (een wedstrijd die niet eindigt, een bal die lang stilligt zonder drager), geen NaN, niemand buiten het veld.
import { maakWedstrijd, tikWedstrijd } from '../game/js/voetbalmatch.js';
import { VELD } from '../game/js/voetbalrules.js';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const aantal = +(process.argv.find((x) => /^\d+$/.test(x)) || 100);
const duur = arg('duur', 'normaal'), stand = arg('stand', 'standaard');
const stil = process.argv.includes('--stil');
const DT = 1 / 30;

export function speelWedstrijd(seed, { duur = 'normaal', stand = 'standaard' } = {}) {
  const m = maakWedstrijd([], { duur, stand, seed, tegenstander: seed % 4, aiBeide: true });
  const r = { seed, goals: 0, score: null, schoten: 0, overtredingen: 0, uit: 0, nan: 0, buiten: 0, vast: 0, langstStil: 0, stappen: 0, eindigde: false, fases: {}, redd: 0, tackles: 0, passes: 0, lang: 0, hervattingen: {} };
  let stilT = 0;
  const max = Math.ceil((m.duurHelft * 2 + 60) / DT) + 4000;
  for (let i = 0; i < max && m.fase !== 'klaar'; i++) {
    const ev = tikWedstrijd(m, DT, null);
    r.stappen++;
    for (const e of ev) {
      if (e.type === 'goal') r.goals++;
      else if (e.type === 'overtreding') r.overtredingen++;
      else if (e.type === 'uit') r.uit++;
      else if (e.type === 'redding') r.redd++;
      else if (e.type === 'tackle') r.tackles++;
      else if (e.type === 'schop') { if (e.soort === 'pass') r.passes++; else if (e.soort === 'lang') r.lang++; }
      else if (e.type === 'hervat') r.hervattingen[e.kind] = (r.hervattingen[e.kind] || 0) + 1;
    }
    const b = m.bal;
    if (![b.x, b.y, b.z, b.vx, b.vy, b.vz].every(Number.isFinite)) r.nan++;
    for (const p of m.spelers) {
      if (![p.x, p.y, p.vx, p.vy, p.face, p.stamina].every(Number.isFinite)) r.nan++;
      else if (Math.abs(p.x) > VELD.B / 2 + 0.01 || Math.abs(p.y) > VELD.L / 2 + 0.01) r.buiten++;
    }
    r.fases[m.fase] = (r.fases[m.fase] || 0) + 1;
    // een vastloper: in het spel ligt de bal bijna stil zonder drager (of een herstart wacht eindeloos)
    const stilStaand = m.fase === 'spel' && b.owner < 0 && Math.hypot(b.vx, b.vy) < 0.15;
    const wacht = (m.fase === 'hervat' || m.fase === 'aftrap') && m.hervat && m.hervat.t > 8;
    stilT = stilStaand ? stilT + DT : 0;
    if (stilT > r.langstStil) r.langstStil = stilT;
    if (stilT > 12 || wacht) { r.vast++; stilT = 0; }
  }
  r.eindigde = m.fase === 'klaar';
  r.score = m.score.slice();
  r.schoten = m.stat.schoten[0] + m.stat.schoten[1];
  r.bezit = m.stat.bezit.map((x) => Math.round(x));
  return r;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('voetbal_botsim.mjs')) {
  const t0 = Date.now();
  const alle = [];
  for (let s = 1; s <= aantal; s++) alle.push(speelWedstrijd(s, { duur, stand }));
  const som = (f) => alle.reduce((a, r) => a + f(r), 0);
  const gem = (f) => (som(f) / alle.length);
  const goals = alle.map((r) => r.goals);
  const samenvatting = {
    wedstrijden: alle.length, duur, stand, gemDoelpunten: +gem((r) => r.goals).toFixed(2), min: Math.min(...goals), max: Math.max(...goals),
    gemSchoten: +gem((r) => r.schoten).toFixed(1), gemOvertredingen: +gem((r) => r.overtredingen).toFixed(1), gemUit: +gem((r) => r.uit).toFixed(1), gemRedd: +gem((r) => r.redd).toFixed(1),
    gemTackles: +gem((r) => r.tackles).toFixed(1), gemPasses: +gem((r) => r.passes).toFixed(1), gemLang: +gem((r) => r.lang).toFixed(1),
    thuisWinst: alle.filter((r) => r.score[0] > r.score[1]).length, gelijk: alle.filter((r) => r.score[0] === r.score[1]).length, uitWinst: alle.filter((r) => r.score[0] < r.score[1]).length,
    nulNul: alle.filter((r) => r.goals === 0).length, nan: som((r) => r.nan), buiten: som((r) => r.buiten), vast: som((r) => r.vast), nietKlaar: alle.filter((r) => !r.eindigde).length,
    langstStil: +Math.max(...alle.map((r) => r.langstStil)).toFixed(1), ms: Date.now() - t0,
  };
  if (!stil) console.log(JSON.stringify(samenvatting, null, 1));
  const fouten = [];
  if (samenvatting.gemDoelpunten < 2 || samenvatting.gemDoelpunten > 5) fouten.push(`gemiddeld ${samenvatting.gemDoelpunten} doelpunten (eis 2 tot 5)`);
  if (samenvatting.nan) fouten.push(`${samenvatting.nan} NaN-waarden`);
  if (samenvatting.buiten) fouten.push(`${samenvatting.buiten} keer een speler buiten het veld`);
  if (samenvatting.vast) fouten.push(`${samenvatting.vast} vastlopers`);
  if (samenvatting.nietKlaar) fouten.push(`${samenvatting.nietKlaar} wedstrijden zonder einde`);
  if (fouten.length) { console.error('voetbal_botsim MIS: ' + fouten.join('; ')); process.exit(1); }
  console.log(`voetbal_botsim ok: ${alle.length} wedstrijden, gemiddeld ${samenvatting.gemDoelpunten} doelpunten`);
}
