// Perfect-ronde 22-11 (scope: opening, titelkaart, eindkaarten, recapkaart, aftitels): de dingen die de speler aan de randen van het
// verhaal leest, kloppen met elkaar. Zuiver node, geen three, geen Electron.
//   node scripts/eindkaarten_opening_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kaartRegel, momentVanBanner, bouwMoment, MAX_WOORDEN } from '../game/js/bigmoment.js';
import { recapContent, RECAP_MAX_WORDS } from '../game/js/recapcard.js';
import { STEPS, WHY, partName } from '../game/js/storyarc.js';
import { BOOT_STEPS, BOOT_DONE_LABEL } from '../game/js/loadlogic.js';
import { TITLE, LINES, SEQUENCE, NAME_CARDS, SFX_KOPPELING, SFX_OPEN, validateOpening } from '../game/js/openingfilm.js';
import { SFX_MAP } from '../game/js/sfx/sfxmap.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info !== '' ? ` (${info})` : ''}`); } };
const woorden = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

// --- 1. de eindkaart van een missie ------------------------------------------------------------------------------------------------
{
  const lang = 'Podium! Sjoerd vertelt het: om twaalf uur gaan de camera\'s drie minuten uit. Nieuw doel: vannacht om twaalf uur de bal pakken.';
  ok(kaartRegel('Kort genoeg.') === 'Kort genoeg.', 'een korte regel blijft zoals hij is');
  ok(kaartRegel(lang) === 'Podium! Nieuw doel: vannacht om twaalf uur de bal pakken.', 'een lange regel houdt de zin "Nieuw doel" en breekt niet midden in een zin', kaartRegel(lang));
  ok(kaartRegel('') === '' && kaartRegel(null) === '', 'leeg blijft leeg');
  const zonderDoel = 'De vesting is genomen, door een leger van karton, meel en duiven. Berend zegt dat winnen verkeerd voelt.';
  ok(kaartRegel(zonderDoel, 14) === 'De vesting is genomen, door een leger van karton, meel en duiven.', 'zonder doel valt de laatste zin af, niet het midden', kaartRegel(zonderDoel));
  ok(!kaartRegel('Een zin die ver boven de limiet zit en toch geen punt heeft die iemand kan gebruiken om af te kappen').endsWith('.'), 'een enkele te lange zin wordt nog steeds geklemd');

  // elke `outro` van de missies (de regel onder MISSIE GESLAAGD) past in 14 woorden en eindigt op een punt, niet op een beletselteken
  const dir = path.join(ROOT, 'game', 'js');
  let aantal = 0;
  for (const f of fs.readdirSync(dir).filter((x) => /^missions.*\.js$/.test(x))) {
    lees(`game/js/${f}`).split('\n').forEach((regel, i) => {
      const m = /^\s*(?:\w+\.)?outro:?\s*=?\s*(['"`])((?:\\.|(?!\1).)*)\1/.exec(regel);
      if (!m) return;
      aantal++;
      const tekst = m[2].replace(/\\'/g, "'");
      const kaart = bouwMoment(momentVanBanner({ kind: 'pass', title: 'MISSIE GESLAAGD', reason: tekst, reward: 100 }));
      ok(woorden(kaart.regelNl) <= MAX_WOORDEN, `${f}:${i + 1} eindkaart past in ${MAX_WOORDEN} woorden`, kaart.regelNl);
      ok(!kaart.regelNl.endsWith('…'), `${f}:${i + 1} eindkaart eindigt niet op een afgebroken zin`, kaart.regelNl);
      ok(!/Nieuw doel/.test(tekst) || /Nieuw doel/.test(kaart.regelNl), `${f}:${i + 1} de eindkaart houdt "Nieuw doel"`, kaart.regelNl);
    });
  }
  ok(aantal >= 25, 'de missie-outros zijn gevonden', aantal);

  // het kleine label en het grote woord zijn niet dezelfde tekst
  const geslaagd = bouwMoment(momentVanBanner({ kind: 'pass', title: 'MISSIE GESLAAGD', reason: 'Gelukt.', reward: 0 }));
  ok(geslaagd.klein.toLowerCase() !== geslaagd.kop.toLowerCase(), 'de eindkaart zegt "Missie geslaagd" niet twee keer', `${geslaagd.klein} / ${geslaagd.kop}`);
  const korteTitel = bouwMoment(momentVanBanner({ kind: 'fail', title: 'Sikkom.', reason: 'Tijd op' }));
  ok(korteTitel.kop === 'Sikkom.', 'een eigen korte titel (Sikkom.) blijft het grote woord');
  const eigen = bouwMoment(momentVanBanner({ kind: 'pass', title: 'KNAL IN DE POLDER', reason: 'Boer Roelf knikt.', reward: 0 }));
  ok(eigen.klein === 'Missie geslaagd' && /^KNAL/.test(eigen.kop) === false, 'een lange activiteitstitel gaat in de regel, het grote woord blijft het Gronings standaardwoord', eigen.kop);
}

// --- 2. de recapkaart "Waar waren we?" ---------------------------------------------------------------------------------------------
{
  const langsteTitel = STEPS.reduce((m, s) => (woorden(s.title) > woorden(m) ? s.title : m), '');
  let metLead = 0, afgekapt = 0;
  const zonderDoel = [];
  for (const s of STEPS) {
    if (!s.lead) continue;
    metLead++;
    const lead = `${s.lead[0] === 'A' ? 'Tessa' : s.lead[0] === 'T' ? 'Tammo' : s.lead[0]}: ${s.lead[1]}`;
    const c = recapContent({ step: { id: s.id, part: s.part, title: s.title, lead }, ended: false, last: langsteTitel, partTitle: partName(s.part), why: WHY[s.part] || '' });
    const totaal = woorden(c.why) + woorden(c.last) + woorden(c.now);
    ok(totaal <= RECAP_MAX_WORDS, `${s.id}: de recapkaart past in ${RECAP_MAX_WORDS} woorden`, totaal);
    ok(/[.!?]$/.test(c.now), `${s.id}: "Nu" eindigt op een hele zin`, c.now);
    ok(!c.now.includes('…'), `${s.id}: "Nu" bevat geen beletselteken`);
    if (c.now !== lead.replace(/^\s*(Tammo|Anita|Tessa)\s*:\s*/, '').trim()) afgekapt++; // de kaart zet de spreker eraf (recapcard.js zonderSpreker, Spel-UI 24-11)
    // een leadzin die alleen een voorzetsel van de opdracht is ("Eerst de mosterd.") mag niet het hele "Nu" zijn als er meer staat
    if (woorden(c.now) <= 4 && woorden(lead) > 12) zonderDoel.push(s.id);
  }
  ok(metLead >= 60, 'bijna elke stap heeft een lead', metLead);
  ok(zonderDoel.length === 0, 'geen recapkaart waarvan "Nu" alleen een aanloopzin is', zonderDoel.join(', '));
  ok(afgekapt <= 12, 'hooguit een handvol leads wordt voor de kaart ingekort', afgekapt);
  const m17 = STEPS.find((s) => s.id === 'M17');
  const k17 = recapContent({ step: { id: 'M17', part: m17.part, title: m17.title, lead: `Tessa: ${m17.lead[1]}` }, ended: false, last: 'Even pinnen', partTitle: partName(m17.part), why: WHY[m17.part] });
  ok(/vaar voor Jelles mosterdschip uit/.test(k17.now), 'M17: de recapkaart noemt wat je nu moet doen, niet alleen "Eerst de mosterd."', k17.now);
}

// --- 3. de toast bij een nieuw weetje -----------------------------------------------------------------------------------------------
{
  const story = lees('game/js/story.js');
  ok(!/Nieuwe aanwijzing/.test(story), 'geen toast die een Aanwijzingen-lijst belooft die er niet meer is (#1122)');
  const pm = lees('game/js/pausemenu.js');
  ok(!/Verhaal.{0,20}Aanwijzingen|data-sub="aanwijzingen"/.test(pm), 'het pauzemenu heeft geen Aanwijzingen-tab meer');
}

// --- 4. aftitels en credits --------------------------------------------------------------------------------------------------------
{
  const story = lees('game/js/story.js');
  const blok = (naam) => {
    const van = story.indexOf(`const ${naam} = [`);
    const tot = van < 0 ? -1 : story.indexOf('\n];', van);
    return tot < 0 ? [] : [...story.slice(van, tot).matchAll(/\['((?:\.|[^'])*)', '((?:\.|[^'])*)'\]/g)].map((x) => [x[1], x[2]]);
  };
  const credits = blok('CREDITS'), terugblik = blok('TERUGBLIK');
  ok(credits.length >= 10 && terugblik.length >= 7, 'de aftitelkaarten zijn gevonden', `${credits.length}/${terugblik.length}`);
  ok(credits.some(([t]) => t === 'Beppe'), 'Beppe heeft een naamkaart in de aftitels');
  ok(terugblik.some(([t, k]) => /soep/i.test(t) && /Grunn en Fryslân/.test(k)), 'de verzoening van Grunn en Fryslân staat in de terugblik');
  for (const [t, k] of [...credits, ...terugblik]) {
    ok(!/\bde Grunn\b/i.test(`${t} ${k}`), `"Grunn", nooit "de Grunn": ${t}`);
    ok(woorden(k) <= 12, `kaart "${t}": de kicker is kort`, woorden(k));
  }
  ok(terugblik.every(([t]) => woorden(t) <= 5), 'de terugblikkoppen zijn kort (kaartvorm: kicker boven, titel groot)');
  // de mensen in de aftitels: alleen handles en de maker (grondwet 4); geen volledige namen met voor- en achternaam uit de testersgroep
  const cr = lees('game/js/credits.js');
  ok(/who: 'NatusPella'/.test(cr), 'de maker staat onder zijn handle');
  ok(!/Alexander|Buist/.test(cr), 'de echte naam van de eigenaar staat niet in de credits');
}

// --- 5. laadscherm (tekstdieet: één balk, één statusregel, geen tips) -----------------------------------------------------------------
{
  for (const s of BOOT_STEPS) {
    ok(woorden(s.label) <= 9, `laadstap ${s.id}: een korte statusregel`, woorden(s.label));
    ok(!/\.$/.test(s.label), `laadstap ${s.id}: geen punt aan het eind van een statusregel`);
  }
  ok(!/[.!?]$/.test(BOOT_DONE_LABEL) && /Grunn/.test(BOOT_DONE_LABEL), 'de klaar-regel noemt Grunn');
  const ls = lees('game/js/loadscreen.js');
  ok(!/Wist je dat/.test(ls), 'het laadscherm toont geen tips meer (tekstdieet, 21-11)');
}

// --- 6. de opening (film) ----------------------------------------------------------------------------------------------------------
{
  ok(validateOpening().length === 0, 'de openingfilm voldoet aan de regie-regels', validateOpening().join('; '));
  ok(TITLE.tagline === 'Een zomer in Grunn. Kon minder.' && !/snackwagen|frietwagen|Tam & Tes/i.test(`${TITLE.title} ${TITLE.tagline} ${TITLE.sub}`), 'de titelkaart belooft de snackwagen niet');
  ok(LINES.every((l) => !/\bde Grunn\b/i.test(l.text)), 'de openingsregels zeggen Grunn, nooit "de Grunn"');
  ok(LINES.every((l) => woorden(l.text) <= 25), 'geen openingsregel langer dan 25 woorden');
  const namen = SEQUENCE.filter((s) => s.tag).map((s) => s.tag.who);
  ok(Object.keys(NAME_CARDS).every((k) => namen.includes(k)), 'beide hoofdpersonen krijgen een naamkaart in een shot');
  ok(LINES.filter((l) => l.k !== 'V').every((l) => !/Rikus|Jelle/.test(l.text)), 'in de opening noemt niemand een naam die nog niet is voorgesteld (Rikus is een stem, Jelle een silhouet)');
}

// --- 7. geluidshaken van de opening ---------------------------------------------------------------------------------------------------
{
  for (const [shot, key] of Object.entries(SFX_KOPPELING)) {
    ok(SEQUENCE.some((x) => x.id === shot), `geluidshaak: shot ${shot} bestaat`);
    ok(!!SFX_MAP[key], `geluidshaak ${shot}: ${key} staat in de centrale geluidskaart`);
  }
  // elk geluidswoord van de reeks is gekoppeld, ontbreekt met reden (SFX_OPEN), of speelt al in de montage (meeuw, notify)
  const gespeeld = ['meeuw-frikandel', 'notify'];
  for (const s of SEQUENCE.filter((x) => x.sfx)) ok(SFX_KOPPELING[s.id] || SFX_OPEN[s.id] || gespeeld.includes(s.sfx), `shot ${s.id}: geluid "${s.sfx}" is gekoppeld of bewust open`);
  const montage = lees('game/js/intromontage.js');
  ok(montage.includes("sfxEvent(r.w, SFX_KOPPELING['c1-schouder']") && montage.includes("sfxEvent(r.w, SFX_KOPPELING['c2-raam']"), 'intromontage speelt de gekoppelde geluiden met sfxEvent');
}

console.log(`eindkaarten_opening_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
