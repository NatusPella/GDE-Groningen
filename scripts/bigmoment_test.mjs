// Pure logic and CSS rules of the big moments (game/js/bigmoment.js, #996):  node scripts/bigmoment_test.mjs
// No DOM, no Electron: the planner, the formatters, the shapes per kind and what the stylesheet may not do.
import fs from 'node:fs';
import {
  SOORTEN, STANDAARD, MAX_WOORDEN, MAX_FLITS_PER_S, MAX_WACHTRIJ,
  bouwMoment, mayMomentTonen, momentVanBanner, momentVanWanted, momentVanOpgepakt, momentVanGebied, klemWoorden, formatBeloning, formatTijd, momentStijl, toelatenFlits, maakPlanner, showBigMoment, isRijdend, RIJDEN_MS, COMPACT_VORMEN,
} from '../game/js/bigmoment.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const woorden = (s) => s.trim().split(/\s+/).filter(Boolean).length;

// the five kinds and their forms
ok(SOORTEN.length === 5 && SOORTEN.every((s) => STANDAARD[s]), 'five kinds, each with defaults');
const vorm = (s) => bouwMoment({ soort: s }).vorm;
ok(vorm('geslaagd') === 'band' && vorm('mislukt') === 'band', 'passed and failed are the full-screen band');
ok(vorm('opgepakt') === 'stempel' && vorm('gebied') === 'plaats' && vorm('wanted') === 'rand', 'busted is a stamp, area a place stamp, wanted an edge tag');
ok(bouwMoment({ soort: 'geslaagd' }).schermvullend && bouwMoment({ soort: 'opgepakt' }).schermvullend, 'band and stamp are full screen');
ok(bouwMoment({ soort: 'mislukt', opnieuwToets: '<kbd>Enter</kbd>' }).opnieuw === '<kbd>Enter</kbd>' && !bouwMoment({ soort: 'geslaagd', opnieuwToets: 'x' }).opnieuw && /Opnieuw proberen/.test(bouwMoment({ soort: 'mislukt', opnieuwToets: 'x' }).aria), 'UX-audit 23-11: alleen een mislukte missie noemt Opnieuw proberen');
ok(/bm-i-opnieuw/.test(fs.readFileSync('game/js/bigmoment.js', 'utf8')) && /opnieuw: true/.test(fs.readFileSync('game/js/missionstory.js', 'utf8')), 'de mislukkaart van het verhaal toont de toets voor opnieuw');
ok(!bouwMoment({ soort: 'wanted' }).schermvullend && !bouwMoment({ soort: 'gebied' }).schermvullend, 'wanted and area are not full screen');
ok(bouwMoment({ soort: 'onzin' }).soort === 'geslaagd', 'an unknown kind falls back');
ok(bouwMoment().kop.length > 0 && bouwMoment().regelNl.length > 0, 'no options still gives words');

// words: every default carries its Dutch line within the 14-word budget; "Grunn", never "de Grunn"
for (const s of SOORTEN) {
  const m = bouwMoment({ soort: s });
  ok(woorden(m.regelNl) <= MAX_WOORDEN && m.regelNl.length > 10, `${s}: Dutch line within the budget`, m.regelNl);
  ok(!/de Grunn/i.test(JSON.stringify(STANDAARD[s])), `${s}: never "de Grunn"`);
  ok(!/winter|sneeuw/i.test(JSON.stringify(STANDAARD[s])), `${s}: always summer`);
}
ok(bouwMoment({ soort: 'geslaagd', titel: 'Dat gaait!', regelNl: 'Dat gaat goed.' }).kop === 'Dat gaait!', 'the caller sets the exclamation');
ok(bouwMoment({ soort: 'gebied', titel: 'Haren' }).kop === 'Haren' && bouwMoment({ soort: 'gebied', titel: 'Haren' }).klein === 'Moi!', 'a new area: the place is the print, the greeting the label');
ok(woorden(klemWoorden('een twee drie vier vijf zes zeven acht negen tien elf twaalf dertien veertien vijftien zestien')) === MAX_WOORDEN, 'long lines are clamped to 14 words');
ok(klemWoorden('Kort genoeg.') === 'Kort genoeg.' && klemWoorden(null) === '', 'short lines and null stay');
ok(bouwMoment({ titel: 'x'.repeat(200) }).kop.length <= 40, 'the title is clamped');

// reward and time
ok(formatBeloning(1250) === '€ 1.250' && formatBeloning(500) === '€ 500' && formatBeloning(1234567) === '€ 1.234.567', 'reward with the Dutch thousands dot');
ok(formatBeloning(0) === '' && formatBeloning(NaN) === '' && formatBeloning(undefined) === '', 'no reward, no line');
ok(formatBeloning(-250) === '− € 250' && formatBeloning('+ € 40 extra') === '+ € 40 extra', 'a loss and a ready-made text');
ok(formatTijd(272) === '4:32' && formatTijd(59) === '0:59' && formatTijd(3725) === '1:02:05' && formatTijd(0) === '' && formatTijd('4 min') === '4 min', 'time as m:ss');
const volledig = bouwMoment({ soort: 'geslaagd', beloning: 1250, tijd: 272 });
ok(volledig.aria.includes('€ 1.250') && volledig.aria.includes('4:32') && volledig.aria.includes('Beloning'), 'the spoken text has reward and time');
ok(bouwMoment({ soort: 'opgepakt', beloning: -250 }).beloningLabel === 'Boete', 'busted calls it a fine (no violence, no death)');
ok(!/doodgeschoten|neergeschoten|bloed|gore|geweld/i.test(JSON.stringify(STANDAARD)), 'no violence in the default words');
ok(bouwMoment({ soort: 'wanted', sterren: 9 }).sterren === 5 && bouwMoment({ soort: 'wanted', sterren: 2 }).aria.includes('2 van 5 sterren'), 'stars as a count in words too');

// Rustig drukwerk: another presentation, the same words
for (const s of SOORTEN) {
  const m = bouwMoment({ soort: s, beloning: 300, tijd: 90 });
  const a = momentStijl(m, false), b = momentStijl(m, true);
  ok(a.woorden === b.woorden, `${s}: the same words in both modes`);
  ok(b.schuin === 0 && b.beweging === 'geen' && !b.raster && !b.misdruk, `${s}: Rustig drukwerk has no tilt, motion, halftone or misregistration`);
  ok(a.schuin === -1.2 && Math.abs(a.schuin) < 1.2000001, `${s}: the tilt stays at 1.2 degrees`);
}

// no flash above three a second
ok(toelatenFlits([], 0) && toelatenFlits([0, 100], 200) && !toelatenFlits([0, 100, 200], 300), 'three starts in a second fill the gate');
ok(toelatenFlits([0, 100, 200], 1050), 'the gate opens after a second');
{
  const p = maakPlanner();
  const w = bouwMoment({ soort: 'wanted', titel: 'Pas op!' });
  const out = [];
  for (let i = 0; i < 10; i++) out.push(p.aanvraag(w, i * 50).actie);   // ten wanted flashes in half a second
  ok(out.filter((a) => a === 'toon').length === MAX_FLITS_PER_S, 'ten wanted requests in 0.5 s show only three', out.join());
  ok(p.aanvraag(w, 5000).actie === 'toon', 'later a wanted tag shows again');
}
{
  // any starts count, also the full-screen ones, and the history is trimmed
  const p = maakPlanner();
  const a = p.aanvraag(bouwMoment({ soort: 'geslaagd', titel: 'A' }), 0);
  ok(a.actie === 'toon', 'the first full-screen moment shows now');
  ok(p.aanvraag(bouwMoment({ soort: 'wanted' }), 100).actie === 'laat-vallen', 'a wanted tag does not cover a full-screen moment');
  ok(p.aanvraag(bouwMoment({ soort: 'mislukt', titel: 'B' }), 200).actie === 'wacht', 'a second full-screen moment waits');
  ok(p.aanvraag(bouwMoment({ soort: 'mislukt', titel: 'B' }), 300).reden === 'dubbel', 'the same moment twice collapses');
  ok(p.aanvraag(bouwMoment({ soort: 'geslaagd', titel: 'A' }), 400).reden === 'dubbel', 'the one on screen is not queued again');
  ok(p.state.historie.length <= MAX_FLITS_PER_S, 'history never exceeds the gate');
  const volgende = p.klaar(4000);
  ok(volgende.actie === 'toon' && volgende.moment.kop === 'B', 'the queue plays after the first');
  ok(p.klaar(8000).actie === 'leeg', 'then the planner is empty');
  // queue limit
  const q = maakPlanner();
  q.aanvraag(bouwMoment({ soort: 'geslaagd', titel: 'X0' }), 0);
  const res = [];
  for (let i = 1; i <= MAX_WACHTRIJ + 2; i++) res.push(q.aanvraag(bouwMoment({ soort: 'gebied', titel: 'X' + i }), 2000 * i).actie);
  ok(res.filter((r) => r === 'wacht').length === MAX_WACHTRIJ && res[res.length - 1] === 'laat-vallen', 'the queue holds at most three');
}
// the hooks (#996): banner, wanted, busted or down, area; and who sees it in Samen spelen
{
  const k = bouwMoment(momentVanBanner({ kind: 'fail', title: 'Sikkom.', reason: 'Probeer het nog eens.', reward: 0 }));
  ok(k.soort === 'mislukt' && k.kop === 'Sikkom.' && k.regelNl === 'Probeer het nog eens.', 'a short banner title is the big print');
  const l = bouwMoment(momentVanBanner({ kind: 'pass', title: 'KNAL IN DE POLDER', reason: 'Boer Roelf knikt.', reward: 750 }));
  ok(l.soort === 'geslaagd' && l.kop === STANDAARD.geslaagd.kop && l.regelNl.includes('KNAL IN DE POLDER') && l.beloning === '€ 750', 'a long mission title goes in the line, the reward stays');
  ok(momentVanWanted(2, 2) === null && momentVanWanted(NaN, 1) === null, 'no change in wanted, no moment');
  const op = bouwMoment(momentVanWanted(1, 3)), neer = bouwMoment(momentVanWanted(3, 1)), weg = bouwMoment(momentVanWanted(2, 0));
  ok(op.vorm === 'rand' && op.sterren === null && neer.sterren === null && weg.sterren === null && !/sterren/.test(op.aria + neer.aria + weg.aria), '#1080: wanted up and down are edge tags without a star count (one place for stars: the HUD card)');
  ok(op.klein !== neer.klein && neer.klein !== weg.klein, 'up, down and gone read differently in words');
  const bust = bouwMoment(momentVanOpgepakt({ busted: true, geld: 250 })), down = bouwMoment(momentVanOpgepakt({ busted: false, geld: 100 }));
  ok(bust.vorm === 'stempel' && bust.kop === 'Opgepakt' && bust.beloningLabel === 'Boete' && bust.beloning === '− € 250', 'busted is a stamp with a fine');
  ok(down.kop === 'Buiten westen' && down.klein === 'Neergegaan' && down.beloningLabel === 'Rekening' && woorden(down.regelNl) <= MAX_WOORDEN, 'knocked out is "Buiten westen" with a hospital bill');
  ok(!/doodgeschoten|neergeschoten|bloed|gore|geweld|dood/i.test(JSON.stringify([bust, down])), 'busted and down show no violence');
  const g = bouwMoment(momentVanGebied('Haren', 'Een groen dorp.'));
  ok(g.vorm === 'plaats' && g.kop === 'Haren' && g.regelNl === 'Een groen dorp.', 'a first visit is a place stamp');
  // guests see a moment only when it is theirs or a joint mission they joined
  ok(mayMomentTonen({}) && mayMomentTonen({ gast: false }), 'host and solo player see everything');
  ok(!mayMomentTonen({ gast: true }), 'a guest does not see the world state of the host');
  ok(mayMomentTonen({ gast: true, eigen: true }), 'a guest sees what happens to himself');
  ok(mayMomentTonen({ gast: true, gezamenlijk: true, deelnemer: true }) && !mayMomentTonen({ gast: true, gezamenlijk: true, deelnemer: false }), 'a joint mission shows only to a participating guest');
  ok(showBigMoment({ ...momentVanWanted(0, 1), gast: true }) === null, 'the gate also holds in the DOM function');
}
ok(showBigMoment({ soort: 'geslaagd' }) === null, 'without a document the DOM function does nothing');

// the stylesheet: tokens only, no flashing, wanted is not full screen, Rustig drukwerk is covered
const css = fs.readFileSync(new URL('../game/js/bigmoment.css', import.meta.url), 'utf8');
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/#[0-9a-fA-F]{3,8}\b/.test(code), 'no raw hex in the stylesheet');
ok(!/!important/.test(code), 'no !important');
ok(!/rgba\((?!29,27,23,)/.test(code), 'rgba only in the ink tone');
ok(/rotate\(var\(--ds-schuin\)\)/.test(code) && !/rotate\(-?\d/.test(code), 'the tilt comes from the --ds-schuin token');
ok(/html\.rustig-drukwerk/.test(code) && /html\.reduce-motion/.test(code) && /prefers-reduced-motion/.test(code), 'Rustig drukwerk, Beweging beperken and the OS preference are covered');
ok(!/infinite/.test(code), 'nothing loops (no flashing)');
// microinteracties: de beweging komt uit ds-motion.css (.ds-mi-in .ds-mi-landing, hooguit 250 ms); hier geen eigen animatie meer
ok(!/animation\s*:\s*bm-/.test(code) && !/@keyframes/.test(code), 'no own animation or keyframes (ds-motion.css moves the moments)');
ok(/--ds-m\b/.test(code) && !/transition[^;]*\d\.\d+s/.test(code), 'the fade uses the --ds-m token, no literal seconds');
ok(!/\.bm-wanted\s*\{[^}]*inset\s*:/.test(code) && /\.bm-wanted\s*\{[^}]*right:\s*(?:0|var\(--ds-rand-hud\))/.test(code), 'the wanted tag sits at the edge, not full screen');
ok(/\.bm-geslaagd, \.bm-mislukt, \.bm-opgepakt \{ inset: 0/.test(code), 'passed, failed and busted cover the screen');
ok(/font: 800 clamp\(56px, 9vw/.test(code) && /Barlow Condensed|--ds-font-zeef-kop/.test(code), 'the big print is Barlow Condensed');
ok(!/pointer-events:\s*auto/.test(code) && /pointer-events: none/.test(code), 'a moment never takes input');

// Compact tijdens het rijden: kleiner, korter, dezelfde woorden; opgepakt en de band blijven vol
ok(isRijdend({ snelheid: 3.5 }) && !isRijdend({ snelheid: 2.9 }) && isRijdend({ inVehicle: true, snelheid: 0 }) && !isRijdend({}), 'rijdend: een voertuig, of sneller dan 3 m/s');
ok(RIJDEN_MS === 3, 'de drempel is 3 m/s');
{
  const voet = bouwMoment({ ...momentVanGebied('Selwerd', 'Je bent hier voor het eerst.'), rijdend: false });
  const rij = bouwMoment({ ...momentVanGebied('Selwerd', 'Je bent hier voor het eerst.'), rijdend: true });
  ok(!voet.compact && rij.compact, 'een nieuw gebied is compact tijdens het rijden');
  ok(rij.ms < voet.ms && rij.aria === voet.aria && rij.kop === voet.kop && rij.regelNl === voet.regelNl, 'compact: kortere verblijftijd, dezelfde woorden');
  const w = bouwMoment({ ...momentVanWanted(0, 2), rijdend: true });
  ok(w.compact && w.ms < STANDAARD.wanted.ms, 'wanted is ook compact tijdens het rijden');
  ok(!bouwMoment({ ...momentVanOpgepakt({ busted: true }), rijdend: true }).compact, 'opgepakt blijft vol');
  ok(!bouwMoment({ ...momentVanBanner({ kind: 'pass', title: 'X' }), rijdend: true }).compact, 'de einde-missie-band blijft vol');
  ok(COMPACT_VORMEN.join() === 'plaats,rand', 'alleen nieuw gebied en wanted kennen een compacte vorm');
}
ok(/\.bm-gebied\.bm-compact \{ bottom: auto; top: 15vh; \}/.test(code) && /\.bm-compact \.bm-kaart \{ min-width: min\(384px/.test(code), 'de compacte kaart staat boven in beeld en is 40% smaller (384 tegen 640 px)');

// #1204, #1205: de glans ligt onder de tekst (anders wordt de donkere titel dof) en het label raakt de titel niet
ok(/\.bm-band > :not\(\.bm-glans\) \{ position: relative; z-index: 1; \}/.test(css) && /\.bm-band > \.bm-glans \{ z-index: 0; \}/.test(css), 'de glans ligt onder de tekst van de band');
ok(/\.bm-band > \.bm-klein \{ margin-bottom: var\(--ds-s-2\); \}/.test(css), 'het label heeft lucht onder zich');

// #1208, #1218: op de bon staat het woord boete een keer (het label bij het bedrag) en het bedrag is groot, de stempel blijft binnen de kaart
{
  const bust = bouwMoment(momentVanOpgepakt({ busted: true, geld: 250 }));
  const zichtbaar = [bust.klein, bust.kop, bust.regelNl, bust.beloningLabel].join(' ');
  ok((zichtbaar.match(/boete/gi) || []).length === 1, 'boete staat een keer op de kaart', zichtbaar);
  ok(/\.bm-slip \.bm-i-beloning \.bm-teller \{ display: block; font-family: var\(--ds-font-zeef-kop\); font-weight: 800; font-size: clamp\(48px/.test(css), 'het bedrag van de bon is het grootste getal');
  ok(/\.bm-stempel \{[^}]*max-width: calc\(100% - 56px\)/.test(css), 'de stempel blijft binnen de kaart');
}
// #1206: een titel die alleen de uitkomst zegt komt niet nog eens als titel of in de regel, welk woord ervoor ook staat
{
  for (const [kind, titel] of [['pass', 'Opdracht geslaagd'], ['pass', 'MISSIE GESLAAGD'], ['fail', 'Taak mislukt.'], ['fail', 'missie mislukt']]) {
    const k = bouwMoment(momentVanBanner({ kind, title: titel, reason: 'Boer Roelf knikt.', reward: 100 }));
    ok(k.kop === STANDAARD[k.soort].kop && k.regelNl === 'Boer Roelf knikt.', `"${titel}" is het label al, niet nog eens titel of regel`, `${k.kop} / ${k.regelNl}`);
  }
  const eigen = bouwMoment(momentVanBanner({ kind: 'pass', title: 'Opdracht geslaagd: de Zilvervloot', reason: 'Netjes.' }));
  ok(/Zilvervloot/.test(eigen.regelNl), 'een echte missienaam blijft staan');
}
// #1219: het zegel van de gebiedskaart toont een plekicoon in plaats van een leeg stippelvierkant
{
  const bron = fs.readFileSync(new URL('../game/js/bigmoment.js', import.meta.url), 'utf8');
  ok(/class="bm-zegel" aria-hidden="true">\$\{icoon\('plek'/.test(bron), 'het zegel bevat een plekicoon');
  ok(!/\.bm-zegel \{[^}]*background-image/.test(css), 'het zegel heeft geen stippelpatroon meer');
}
// #1187: een mislukte missie toont nooit een beloning, ook niet als de aanroeper er een meegeeft
{
  const m = bouwMoment(momentVanBanner({ kind: 'fail', title: 'Sikkom.', reason: 'Dat ging mis.', reward: 250 }));
  ok(m.beloning === '' && m.beloningWaarde === 0 && !/Beloning|250/.test(m.aria), 'mislukt: geen beloningsregel, ook niet met reward 250', m.aria);
  ok(bouwMoment(momentVanBanner({ kind: 'pass', title: 'X', reason: 'y', reward: 250 })).beloning === '€ 250', 'geslaagd houdt de beloning');
  // #1332: ook rechtstreeks (showBigMoment met soort mislukt en een beloning) blijft de beloning weg
  const d = bouwMoment({ soort: 'mislukt', titel: 'Sikkom', beloning: 400 });
  ok(d.beloning === '' && d.beloningWaarde === 0 && !/Beloning|400/.test(d.aria), 'mislukt direct: geen beloning op de kaart', JSON.stringify(d));
  ok(bouwMoment({ soort: 'geslaagd', beloning: 400 }).beloning === '€ 400' && bouwMoment({ soort: 'opgepakt', beloning: -50 }).beloning !== '', 'geslaagd en opgepakt houden hun bedrag');
}
// #1188: achter een schermvullende eindkaart verdwijnt de doelbalk en zwijgen de sleutelhints
{
  const js = fs.readFileSync(new URL('../game/js/bigmoment.js', import.meta.url), 'utf8');
  const pr = fs.readFileSync(new URL('../game/js/prompts.js', import.meta.url), 'utf8');
  ok(/if \(m\.schermvullend\) document\.body\.classList\.add\('bm-eindkaart'\)/.test(js) && /classList\.remove\('bm-eindkaart'\)/.test(js), 'de eindkaart zet en haalt de bodyklasse bm-eindkaart weg');
  ok(/body\.bm-eindkaart #hud \.hud-mission \{ opacity: 0/.test(code), 'de doelbalk is onzichtbaar achter de eindkaart');
  ok(/b\.contains\('bm-eindkaart'\)/.test(pr), 'de sleutelhints (duifprompt) zwijgen achter de eindkaart');
}
// #1207, #1217: met de missienaam is die naam de titel, het label de uitkomst en de regel de reden
{
  const g = bouwMoment(momentVanBanner({ kind: 'pass', title: 'MISSIE GESLAAGD', reason: 'Jelle was jullie voor.', reward: 550, missie: 'Het museum stond er al zo' }));
  ok(g.kop === 'Het museum stond er al zo' && g.klein === STANDAARD.geslaagd.klein && g.regelNl === 'Jelle was jullie voor.' && g.beloning === '€ 550', 'de missienaam is de titel, de beloning blijft', JSON.stringify(g));
  ok(g.lang === true && !g.aria.includes(STANDAARD.geslaagd.kop), 'een lange titel krijgt de kleinere letter en de Groningse standaardkop vervalt');
  const f = bouwMoment(momentVanBanner({ kind: 'fail', title: 'Sikkom.', reason: 'Geleend van de Friezen', reward: 300, missie: 'Geleend van de Friezen' }));
  ok(f.kop === 'Geleend van de Friezen' && f.klein === STANDAARD.mislukt.klein && f.regelNl === STANDAARD.mislukt.regelNl && f.beloning === '', 'mislukt: geen naam twee keer, geen beloning', JSON.stringify(f));
  ok(bouwMoment(momentVanBanner({ kind: 'fail', title: 'Sikkom.' })).lang === false, 'een korte uitroep blijft groot');
  const ms = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
  ok(/stats, reason, missie: def\.label \}\);/.test(ms) && /failureStats\(runStats\(world, def\)\), missie: def\.label \}/.test(ms), 'missions.js geeft de missienaam mee bij geslaagd en mislukt');
}
console.log(`${n - fails}/${n} bigmoment`);
process.exit(fails ? 1 : 0);
