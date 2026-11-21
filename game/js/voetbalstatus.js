// De HUD-stand van de voetbalwedstrijd (#981): puur, geen DOM en geen THREE (scripts/voetbal_test.mjs). Twee modellen uit dezelfde stand: de strook van de light sims (simhud.js: stappen,
// jouw doelpunten, de adem als meter, een paar cijfers, één zin "wat nu" en de uitleg met animaties) en het bord bovenin (minigamekit.js createBoard: de stand en de klok, een
// krachtmeter voor schot en voorzet, en de flits van een doelpunt). Toetsen staan als {TOKEN}: de HUD toont een toetsplaatje dat de echte keymap en de controller volgt.
import { SIMICOON as I } from './simicoon.js';
import { klokTekst } from './voetbalrules.js';

const ICOON = { aanval: 'worp', verdedig: 'schild', herstart: 'vlag', score: 'plaats', schoten: 'doel', tijd: I.klok, adem: 'rennen', bezit: 'stand' };
export const STAPPEN = [
  { id: 'aanval', label: 'Aanvallen', icoon: ICOON.aanval },
  { id: 'verdedig', label: 'Verdedigen', icoon: ICOON.verdedig },
  { id: 'herstart', label: 'Herstart', icoon: ICOON.herstart },
];
export const UITLEG_ID = 'voetbal';
// Vier stappen, hoogstens acht woorden per stap, geen ruwe toetsnamen: het toetsplaatje is het woord (uitleg.js).
export const UITLEG = [
  { toets: ['WASD', 'SHIFT'], animatie: 'druk', tekst: 'Loop en sprint' },
  { toets: ['F', 'E'], animatie: 'druk', tekst: 'Korte en lange pass' },
  { toets: 'SPACE', animatie: 'houd', tekst: 'Schot: houd vast voor kracht' },
  { toets: ['CTRL', 'Q'], animatie: 'druk', tekst: 'Tackle en wissel van speler' },
];
const HULP = '{WASD} lopen · {F} pass · {E} lang · {SPATIE} schot · {CTRL} tackle · {Q} wissel';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FASE_WOORD = { intro: 'Aanstaande', aftrap: 'Aftrap', spel: '', hervat: 'Herstart', goal: 'Doelpunt', rust: 'Rust', eind: 'Einde', klaar: 'Einde' };
const helftTekst = (h) => `${h === 2 ? 'Tweede' : 'Eerste'} helft`;

// g: { fase, helft, klok, score: [a, b], namen: [a, b], bezitTeam (0, 1, of -1 als de bal los is), heeftBal (jij), rol ('keeper' | 'veld'), laad (0..1), laadSoort ('schot' | 'lang' | null),
//      stamina (0..1), moe, eigen (jouw doelpunten), schoten (jouw), bezit: [a, b] (seconden), hervat ('inworp', ...), tekst (een flits), uitleg (bool), slomo }
function stapVan(g) {
  if (g.fase === 'aftrap' || g.fase === 'hervat') return 'herstart';
  return g.bezitTeam === 1 ? 'verdedig' : g.bezitTeam === 0 ? 'aanval' : 'verdedig';
}

export function voetbalHudModel(g) {
  if (!g) return null;
  const idx = STAPPEN.findIndex((s) => s.id === stapVan(g));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i === idx ? 'nu' : 'straks' }));
  const meter = { pct: Math.max(0, Math.min(100, (g.stamina == null ? 1 : g.stamina) * 100)), naam: 'Adem voor het sprinten', label: g.moe ? 'Buiten adem' : 'Adem', staat: g.moe ? 'laag' : '' };
  const cijfers = [
    { label: 'Jullie doelpunten', waarde: String((g.score || [0, 0])[0]), icoon: ICOON.score, primair: true },
    { label: 'Tegen', waarde: String((g.score || [0, 0])[1]), icoon: ICOON.verdedig },
  ];
  if (g.bezit) { const tot = Math.max(1, g.bezit[0] + g.bezit[1]); cijfers.push({ label: 'Bezit', waarde: `${Math.round((g.bezit[0] / tot) * 100)}%`, icoon: ICOON.bezit }); }
  if (g.eigen != null) cijfers.push({ label: 'Jouw doelpunten', waarde: String(g.eigen), icoon: ICOON.schoten });
  cijfers.push({ label: helftTekst(g.helft || 1), waarde: klokTekst(g.klok == null ? 0 : g.klok), icoon: ICOON.tijd });
  return {
    id: 'voetbal', titel: 'Voetbal Euroborg', icoon: ICOON.aanval, plek: '5 tegen 5', stappen, meter, cijfers, uitleg: g.uitleg && (g.fase === 'aftrap' || g.fase === 'hervat') ? UITLEG : [],
    nu: watNu(g), hulp: HULP, slecht: false,
  };
}

export function watNu(g) {
  if (g.tekst) return g.tekst;
  if (g.fase === 'intro') return 'De teams komen het veld op';
  if (g.fase === 'rust') return 'Rust: even bijkomen';
  if (g.fase === 'eind' || g.fase === 'klaar') return 'Het eindsignaal klinkt';
  if (g.fase === 'goal') return 'Doelpunt!';
  if (g.fase === 'aftrap') return g.heeftBal ? 'Speel de bal aan met {F}' : 'Aftrap: loop naar je plek';
  if (g.fase === 'hervat') return g.heeftBal ? `${g.hervat === 'doelschop' ? 'Doelschop' : g.hervat === 'hoek' ? 'Hoekschop' : g.hervat === 'inworp' ? 'Inworp' : 'Vrije bal'}: speel aan met {F}` : 'Herstart: houd je plek';
  if (g.rol === 'keeper') return g.heeftBal ? 'Keeper met de bal: speel hem uit met {F}' : 'Keeper: duik met {SPATIE}';
  if (g.laad > 0.02) return g.laadSoort === 'lang' ? `Voorzet: laat {E} los voor kracht ${Math.round(g.laad * 100)}%` : `Schot: laat {SPATIE} los voor kracht ${Math.round(g.laad * 100)}%`;
  if (g.heeftBal) return 'Je hebt de bal: pass {F}, schot {SPATIE}';
  if (g.bezitTeam === 1) return 'Zet druk: tackle met {CTRL}';
  if (g.bezitTeam === 0) return 'Jullie hebben de bal: loop je vrij';
  return 'De bal is los: ga erop af';
}

// Het bord bovenin: de stand met de klok, de kracht van een schot of voorzet als meter, de flits van een doelpunt of herstart, en de hulp.
export function voetbalBord(g) {
  if (!g) return null;
  const [a, b] = g.score || [0, 0], namen = g.namen || ['Stadjers', 'Hunebedders'];
  const klokOver = g.fase === 'rust' ? 'rust' : g.fase === 'eind' || g.fase === 'klaar' ? 'einde' : klokTekst(g.klok == null ? 0 : g.klok);
  const row = `<span>${esc(namen[0])} <b>${a}</b></span><span>-</span><span><b>${b}</b> ${esc(namen[1])}</span><span class="mg-klok">${esc(helftTekst(g.helft || 1))} · <b>${esc(klokOver)}</b></span>`;
  const meter = g.laad > 0.02 ? { v: g.laad, mark: null, color: 'var(--mk-job, #ff9a3c)', text: `${Math.round(g.laad * 100)}%` } : null;
  const flash = g.tekst || FASE_WOORD[g.fase] || '';
  return { row, cells: null, meter, flash, bad: !!g.slecht, help: g.help || '' };
}

// Wat opspringt en klinkt bij een gebeurtenis van de sim (voetbalmatch.js ev): een doelpunt voor jou krijgt het geluid van iets gelukts, de rest klinkt niet.
export function popVan(e, mijnTeam = 0) {
  if (!e) return null;
  if (e.type === 'goal') return e.team === mijnTeam ? { tekst: e.eigen ? 'Eigen doelpunt van de tegenstander!' : 'GOAL!', geluid: 'ui_verzameld' } : { tekst: 'Tegendoelpunt', geluid: null };
  if (e.type === 'redding') return { tekst: e.soort === 'vangst' ? 'Gevangen door de keeper' : 'Weggeslagen door de keeper', geluid: null };
  if (e.type === 'paal') return { tekst: 'Tegen de paal', geluid: null };
  if (e.type === 'lat') return { tekst: 'Op de lat', geluid: null };
  if (e.type === 'overtreding') return { tekst: 'Overtreding: vrije bal', geluid: null };
  if (e.type === 'einde') return { tekst: e.winnaar === mijnTeam ? 'Gewonnen!' : e.winnaar < 0 ? 'Gelijkspel' : 'Verloren', geluid: e.winnaar === mijnTeam ? 'ui_loopbaan' : null };
  return null;
}
