// De HUD-stand van de voetbalwedstrijd (#981): puur, geen DOM en geen THREE (scripts/voetbal_test.mjs). Twee modellen uit dezelfde stand: de strook van de light sims (simhud.js: stappen,
// jouw doelpunten, de adem als meter, een paar cijfers, één zin "wat nu" en de uitleg met animaties) en het bord bovenin (minigamekit.js createBoard: de stand en de klok, een
// krachtmeter voor schot en voorzet, en de flits van een doelpunt). Toetsen staan als {TOKEN}: de HUD toont een toetsplaatje dat de echte keymap en de controller volgt.
import { SIMICOON as I } from './simicoon.js';
import { clockText } from './voetbalrules.js';
import { escapeHtml as esc } from './htmlescape.js';

const ICOON = { aanval: 'worp', verdedig: 'schild', herstart: 'vlag', score: 'plaats', schoten: 'doel', tijd: I.klok, adem: 'rennen', bezit: 'stand' };
export const STEPS = [
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
const HELP_TEXT = '{WASD} lopen · {F} pass · {E} lang · {SPATIE} schot · {CTRL} tackle · {Q} wissel · {3} camera';
// De toetsregel in groepen (Club-UI 24-11): een groep heeft een naam en hoort bij elkaar, zodat de regel nooit midden in een groep breekt. `render` maakt van een tekst met {TOKEN}s toetsplaatjes (keycap.js keyTextHtml).
export const TOETS_GROEPEN = [['Lopen', '{WASD} lopen'], ['Bal', '{F} pass · {E} lang · {SPATIE} schot'], ['Verdedigen', '{CTRL} tackle · {Q} wissel'], ['Tactiek', '{1} stijl · {2} vorming'], ['Verder', '{3} camera · {BACKSPACE} stopt']];
export const toetsGroepenHtml = (render) => TOETS_GROEPEN.map(([naam, tekst]) => `<span class="vb-hint__groep"><span class="vb-hint__naam">${esc(naam)}</span>${render(tekst)}</span>`).join('');

const PHASE_WORD = { intro: 'Aanstaande', aftrap: 'Aftrap', spel: '', hervat: 'Herstart', goal: 'Doelpunt', rust: 'Rust', eind: 'Einde', klaar: 'Einde' };
const helftTekst = (h) => `${h === 2 ? 'Tweede' : 'Eerste'} helft`;

// g: { fase, helft, klok, score: [a, b], namen: [a, b], bezitTeam (0, 1, of -1 als de bal los is), heeftBal (jij), rol ('keeper' | 'veld'), laad (0..1), laadSoort ('schot' | 'lang' | null),
//      stamina (0..1), moe, eigen (jouw doelpunten), schoten (jouw), bezit: [a, b] (seconden), hervat ('inworp', ...), tekst (een flits), uitleg (bool), slomo }
function stepOf(g) {
  if (g.fase === 'aftrap' || g.fase === 'hervat') return 'herstart';
  return g.bezitTeam === 1 ? 'verdedig' : g.bezitTeam === 0 ? 'aanval' : 'verdedig';
}

// Derby (#1114): een mens in team 1 ziet "jullie" en "tegen" vanuit zijn eigen kant. De sim telt absoluut (team 0 of 1); dit draait stand, bezit en baldrager om en is idempotent (mijnTeam wordt 0).
export function naarMijn(g) {
  if (!g || g.mijnTeam !== 1) return g;
  const sw = (a) => (Array.isArray(a) ? [a[1], a[0]] : a);
  return { ...g, mijnTeam: 0, score: sw(g.score), bezit: sw(g.bezit), bezitTeam: g.bezitTeam === 0 ? 1 : g.bezitTeam === 1 ? 0 : g.bezitTeam };
}
export function voetbalHudModel(g0) {
  if (!g0) return null;
  const g = naarMijn(g0);
  const idx = STEPS.findIndex((s) => s.id === stepOf(g));
  const steps = STEPS.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i === idx ? 'nu' : 'straks' }));
  const meter = { pct: Math.max(0, Math.min(100, (g.stamina == null ? 1 : g.stamina) * 100)), naam: 'Adem voor het sprinten', label: g.moe ? 'Buiten adem' : 'Adem', staat: g.moe ? 'laag' : '' };
  // de spelerskaart (Club-UI 24-11): hoogstens drie dingen spreken tegelijk (bord, een melding, deze kaart); de stand, het bezit en de klok staan op het bord en in de rust, dus hier alleen je eigen doelpunten
  const cijfers = [];
  if (g.eigen != null) cijfers.push({ label: 'Jouw doelpunten', waarde: String(g.eigen), icoon: ICOON.schoten, primair: true });
  return {
    id: 'voetbal', controller: 'voetbal', titel: 'Voetbal Euroborg', icoon: ICOON.aanval, plek: g.formaatNaam || '5 tegen 5', stappen: steps, meter, cijfers, uitleg: g.uitleg && (g.fase === 'aftrap' || g.fase === 'hervat') ? UITLEG : [],
    nu: watNu(g), hulp: HELP_TEXT, slecht: false,
  };
}

export function watNu(g0) {
  const g = naarMijn(g0);
  if (g.tekst) return g.tekst;
  if (g.fase === 'intro') return 'De teams komen het veld op';
  if (g.fase === 'rust') return 'Rust: even bijkomen';
  if (g.fase === 'eind' || g.fase === 'klaar') return 'Het eindsignaal klinkt';
  if (g.fase === 'goal') return 'Doelpunt!';
  if (g.fase === 'aftrap') return g.heeftBal ? 'Speel de bal aan met {F}' : 'Aftrap: loop naar je plek';
  if (g.fase === 'hervat' && g.hervat === 'strafschop') return g.heeftBal ? 'Strafschop: houd {SPATIE} vast en richt met de stick' : 'Strafschop: houd je plek';
  if (g.fase === 'hervat') return g.heeftBal ? `${g.hervat === 'doelschop' ? 'Doelschop' : g.hervat === 'hoek' ? 'Hoekschop' : g.hervat === 'inworp' ? 'Inworp' : 'Vrije bal'}: speel aan met {F}` : 'Herstart: houd je plek';
  if (g.rol === 'keeper') return g.heeftBal ? 'Keeper met de bal: speel hem uit met {F}' : 'Keeper: duik met {SPATIE}';
  if (g.laad > 0.02) return g.laadSoort === 'lang' ? `Voorzet: laat {E} los voor kracht ${Math.round(g.laad * 100)}%` : `Schot: laat {SPATIE} los voor kracht ${Math.round(g.laad * 100)}%`;
  if (g.heeftBal) return 'Je hebt de bal: pass {F}, schot {SPATIE}';
  if (g.moe) return 'Buiten adem: loop even rustig';
  if (g.bezitTeam === 1) return 'Zet druk: tackle met {CTRL}';
  if (g.bezitTeam === 0) return 'Jullie hebben de bal: loop je vrij';
  return 'De bal is los: ga erop af';
}

// Het bord bovenin: de stand met de klok, de kracht van een schot of voorzet als meter, de flits van een doelpunt of herstart, en de hulp.
export function voetbalBoard(g) {
  if (!g) return null;
  const [a, b] = g.score || [0, 0], namen = g.namen || ['Stadjers', 'Hunebedders'];
  const clockShown = g.fase === 'rust' ? 'rust' : g.fase === 'eind' || g.fase === 'klaar' ? 'einde' : clockText(g.klok == null ? 0 : g.klok);
  const row = `<span>${esc(namen[0])} <b>${a}</b></span><span>-</span><span><b>${b}</b> ${esc(namen[1])}</span><span class="mg-klok">${esc(helftTekst(g.helft || 1))} · <b>${esc(clockShown)}</b></span>`;
  const meter = g.laad > 0.02 ? { v: g.laad, mark: null, color: 'var(--mk-job, #ff9a3c)', text: `${Math.round(g.laad * 100)}%` } : null;
  const flash = g.tekst || PHASE_WORD[g.fase] || '';
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
  if (e.type === 'kaart') return { tekst: e.kleur === 'rood' ? (e.tweede ? 'Tweede geel: rood' : 'Rode kaart') : 'Gele kaart', geluid: null };
  if (e.type === 'blessure') return { tekst: 'Blessure: een wissel volgt', geluid: null };
  if (e.type === 'wisselspeler') return { tekst: `Wissel: ${e.in} erin`, geluid: null };
  if (e.type === 'buitenspel') return { tekst: 'Buitenspel', geluid: null };
  if (e.type === 'einde') return { tekst: e.winnaar === mijnTeam ? 'Gewonnen!' : e.winnaar < 0 ? 'Gelijkspel' : 'Verloren', geluid: e.winnaar === mijnTeam ? 'ui_loopbaan' : null };
  return null;
}
