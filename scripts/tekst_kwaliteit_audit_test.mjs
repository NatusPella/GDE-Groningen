// Test voor scripts/tekst_kwaliteit_audit.mjs: elke regel vangt wat hij moet vangen, gewoon Nederlands
// komt erdoor, de uitzonderingenlijst heeft geen verouderde regels en de speltekst van het spel zelf
// heeft geen open bevindingen.
//   node scripts/tekst_kwaliteit_audit_test.mjs
import { checkKwaliteit, checkCss, audit, ALLOW } from './tekst_kwaliteit_audit.mjs';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.log('FAIL ' + msg); } };
const regels = (t, kind = 'story') => checkKwaliteit(t, kind).map((f) => f.rule);
const heeft = (t, r, kind) => regels(t, kind).includes(r);

// dubbele spaties en leestekens
ok(heeft('Pak de sleutel  en ga weg', 'dubbele-spatie'), 'dubbele spatie');
ok(heeft('Pak de sleutel , dan rij je weg', 'dubbele-spatie'), 'spatie voor een komma');
ok(!heeft('Pak de sleutel, dan rij je weg.', 'dubbele-spatie'), 'gewone zin heeft geen dubbele spatie');
ok(heeft('Dat is mooi!! Echt waar', 'leesteken') && heeft('Kom hier,nu graag', 'leesteken') && heeft('Dat klopt.Daarna verder', 'leesteken'), 'dubbel leesteken en geen spatie na een leesteken');
ok(!heeft('Wacht even... daar komt hij', 'leesteken') && !heeft('Kijk op de 3.5 kaart', 'leesteken'), 'beletselteken is geen fout');

// placeholders en codewaarden
ok(heeft('Je hebt undefined euro', 'placeholder') && heeft('Welkom {{naam}}', 'placeholder') && heeft('Prijs: ${p}', 'placeholder') && heeft('Je hebt NaN euro', 'placeholder') && heeft('[object Object] ligt hier', 'placeholder'), 'ruwe placeholders en codewaarden');
ok(!heeft('Druk op {E} om te praten bij {r} en %s', 'placeholder'), 'toetstokens, {naam} en %s worden bij het tonen ingevuld');

// afgekapte zinnen (alleen volledige tekstregels, geen sjabloonstukken)
ok(heeft('Ik loop naar de winkel en', 'afgekapt') && heeft('Zij pakt haar tas, de sleutel,', 'afgekapt'), 'afgekapt: eindigt op een voegwoord of komma');
ok(!heeft('Steek een kaarsje aan', 'afgekapt') && !heeft('De deur gaat open.', 'afgekapt') && !heeft('Wat gebeurt er dan…', 'afgekapt'), 'scheidbaar werkwoord en leestekens zijn geen afkapping');
ok(!heeft('Ik loop naar de winkel en', 'afgekapt', 'js'), 'een stuk van een sjabloon in code is geen afkapping');

// Engelse restanten, eenheden, getal- en tijdnotatie
ok(heeft('Zet een waypoint op de kaart', 'engels-restant') && heeft('Klik met LMB om te slaan', 'engels-restant') && heeft('Loading de wereld', 'engels-restant'), 'Engelse restanten: waypoint, LMB, loading');
ok(!heeft('Zet een routepunt op de kaart', 'engels-restant') && !heeft('Druk op {LMB} om te slaan', 'engels-restant'), 'routepunt en toetstoken zijn goed');
ok(heeft('Je rijdt 80 km/h', 'eenheid') && heeft('Nog 3 miles', 'eenheid') && !heeft('Je rijdt 80 km/u, nog 3 kilometer', 'eenheid'), 'eenheden: km/u, kilometer');
ok(heeft('Het kost 1,000 euro', 'getalformaat') && heeft('Het is 3.5 km verderop', 'getalformaat') && !heeft('Het kost 1.000 euro en 3,5 km', 'getalformaat') && !heeft('Prijs per 1.000 kg', 'getalformaat'), 'getalformaat: 1.000 en 3,5 km');
ok(heeft('We zien elkaar om 8:30 PM', 'datumtijd') && heeft('Op 2026-11-22 begint het', 'datumtijd') && heeft('Open vanaf 16.00 uur', 'datumtijd') && !heeft('Open vanaf 16:00 uur op 22 november', 'datumtijd'), 'datum en tijd: 24-uursklok met dubbele punt');

ok(heeft('Verdien €1000 met de snackwagen', 'getalformaat') && heeft('Haal 5000 punten in een ronde', 'getalformaat') && !heeft('Verdien €1.000 met de snackwagen', 'getalformaat') && !heeft('In 1672 hield Stad stand', 'getalformaat') && !heeft('Nummer 4117 aan loket A', 'getalformaat'), 'duizendtal met punt; jaartallen en nummers blijven zoals ze zijn');

// hoofdletters
ok(heeft('Het is mooi. dan gaan we', 'hoofdletter') && !heeft('Het is mooi. Dan gaan we', 'hoofdletter') && !heeft('Gem. is de balans: genoeg ruimte', 'hoofdletter'), 'zinsbegin met een kleine letter');
ok(heeft('Wij gaan naar de grunn vandaag', 'hoofdletter') && !heeft('Wij gaan naar Grunn vandaag', 'hoofdletter'), "'Grunn' met hoofdletter");

// markup en css-stukken tellen niet als tekst
ok(regels('<button class="x" data-act="cancel">Annuleren</button> <span aria-pressed="true">Klaar</span>').length === 0, 'tags en attributen zijn geen tekst');
ok(regels(' 0 6%, transparent 6.5%), linear-gradient(0deg, red').length === 0, 'een kleurverloop is geen tekst');

// css: kleine letters en HUD-tekst zonder halo
const css = (sel, body) => checkCss([{ file: 'x.css', line: 1, sel, body }]).map((f) => f.rule);
ok(css('.msg', 'font-size: 11px;').includes('css-grootte') && css('.msg', 'font-size: 0.6rem;').includes('css-grootte'), 'css-grootte: onder 12 px');
ok(!css('.msg', 'font-size: 12px;').length && !css('.msg', 'font-size: var(--hud-min);').length, 'css-grootte: 12 px en een token zijn goed');
ok(css('#hud .hud-wat', 'position: absolute; font-size: 14px; color: #fff;').includes('css-leesbaar'), 'css-leesbaar: HUD-tekst zonder halo of vlak');
ok(!css('#hud .hud-wat', 'position: absolute; font-size: 14px; color: #fff; text-shadow: var(--hud-shadow);').includes('css-leesbaar'), 'css-leesbaar: met halo');
ok(!css('#hud .hud-wat', 'position: absolute; font-size: 14px; background: rgba(0,0,0,0.7);').includes('css-leesbaar'), 'css-leesbaar: met een donker vlak');
ok(!css('#hud .wp', 'position: absolute; width: 0; height: 0; font-size: 14px;').includes('css-leesbaar'), 'css-leesbaar: een leeg anker zonder tekst telt niet');

// de uitzonderingenlijst: elke regel heeft een reden en slaat nog ergens op
ok(ALLOW.length > 0 && ALLOW.every((a) => a.rule && a.why && a.why.length > 15), 'elke uitzondering heeft een regel en een reden');
const alles = audit();
const stale = ALLOW.filter((a) => !alles.some((f) => f.allowed === a));
ok(stale.length === 0, 'geen verouderde uitzonderingen: ' + stale.map((a) => `${a.rule}@${a.file}:${a.ctx}`).join('; '));

// de speltekst zelf
const open = alles.filter((f) => !f.allowed);
ok(open.length === 0, `geen open bevindingen in de speltekst (${open.length}): ` + open.slice(0, 5).map((f) => `[${f.rule}] ${f.file}:${f.line} ${f.term}`).join(' | '));

if (failed) { console.log(`${failed} mislukt`); process.exit(1); }
console.log('tekst_kwaliteit_audit_test ok');
