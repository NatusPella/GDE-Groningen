// Test for scripts/text_audit.mjs: the word lists catch what they should, ordinary Dutch passes,
// the allowlist has no stale entries, and the game's own player text has no open findings.
//   node scripts/text_audit_test.mjs
import { checkText, isProse, jsStrings, audit, voicedLookup, ALLOW } from './text_audit.mjs';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.log('FAIL ' + msg); } };
const rules = (t) => checkText(t).map((f) => f.rule);

// must be caught
ok(rules('Ik koop een Coca-Cola bij de Albert Heijn').includes('merk'), 'merk: Coca-Cola / Albert Heijn');
ok(rules('We rijden in een Volkswagen').includes('merk'), 'merk: Volkswagen');
ok(rules('Zoek het op Google').includes('merk'), 'merk: Google');
ok(rules('Betaal met de ING of ABN AMRO').includes('merk'), 'merk: bank');
ok(rules('Mark Rutte komt langs').includes('persoon'), 'persoon: Rutte');
ok(rules('Klaas Dijkstra staat bij de deur').includes('naam'), 'naam: voornaam + achternaam');
ok(rules('Het ligt vol sneeuw op het plein').includes('winter'), 'winter: sneeuw');
ok(rules('Kom naar de kerstmarkt').includes('winter'), 'winter: kerst');
ok(rules('Schaatsen op de ijsbaan').includes('winter'), 'winter: schaatsen/ijsbaan');
ok(rules('Welkom in de Grunn, de Grunn is mooi').includes('de-grunn'), 'de Grunn');
ok(rules('Press the button and you will win').includes('engels'), 'engels: functiewoorden');

// must pass
ok(checkText('Welkom in Grunn, de Grunneger gastvrijheid').length === 0, "'Grunn' en 'de Grunneger' zijn goed");
ok(checkText('Een ijsje op het Martinikerkhof, in de zomer').length === 0, 'ijsje is zomer');
ok(checkText('Tammo rijdt met de trekker naar de Grote Markt').length === 0, 'gewone zin');
ok(checkText('Dat is niet in orde, maar het is mijn kans').length === 0, 'Nederlands met "in", "is", "of"');
ok(checkText('Jelle Terpstra wacht op het perron').filter((f) => f.rule !== 'naam').length === 0, 'verzonnen personage geeft geen merk');
ok(checkText('Je hebt een Fordje gekocht').length === 0, 'merknaam alleen als los woord');

// prose filter and reader
ok(!isProse('game/js/foo.js') && !isProse('rgba(0,0,0,0.5)') && !isProse('hud_panel'), 'ids en paden zijn geen proza');
ok(isProse('Welkom in Grunn'), 'zin is proza');
const s = jsStrings("// 'commentaar'\nconst a = 'één';\nconst b = `twee ${x + 'drie'} vier`;\nconst r = /'x/; const c = \"vijf zes\";\n");
ok(s.map((x) => x.text).join('|') === 'één|drie|twee | vier|vijf zes', 'jsStrings: ' + JSON.stringify(s.map((x) => x.text)));
ok(s[0].line === 2 && s[1].line === 3, 'jsStrings regelnummers');

// uitbreidingen (ronde 1 constitution/taal)
ok(isProse('Kermis in {plaats}: de draaimolens draaien; kom kijken.'), 'placeholders zijn proza');
ok(!isProse('x = a * b; y = f(x);'), 'code is geen proza');
const has = (t, rule) => checkText(t).some((f) => f.rule === rule);
ok(has('Ontworpen door Alessandro Mendini', 'persoon'), 'echte ontwerper');
ok(has('Ik speel op Eurosonic!', 'persoon'), 'echt festival');
ok(has('Oudjoarsknaller in november', 'winter'), 'winterlijst: oudjoar en november');
ok(has('Entschuldigung, wir haben das nicht gesehen', 'duits'), 'Duits');
ok(has('Bonjour, merci pour tout', 'frans'), 'Frans');
ok(!has('Wie is die man? Hier pas je op.', 'duits') && !has('Wie is die man? Hier pas je op.', 'frans'), 'Nederlandse woorden geen vals alarm');
ok(has('Je save is weg', 'anglicisme') && has('Vraag de host om een code', 'anglicisme') && has('Rond je run af met een combo', 'anglicisme'), 'anglicisme: save, host, run, combo');
ok(has('Bij het laatste checkpoint en total loss', 'anglicisme') && has('Mooie ghosts met tricks', 'anglicisme'), 'anglicisme: checkpoint, total loss, ghosts, tricks');
ok(!has('Je savegame is bewaard; de gastheer wacht, hatchback of sedan', 'anglicisme'), 'Nederlands en ingeburgerd: geen vals alarm');
ok(!has('Hoster Hostel, de runderen en het slot', 'anglicisme') && !has('<button data-action="save">Opslaan</button> .pm-rail-acts [data-boost]', 'anglicisme'), 'woorddelen en markup geven geen vals alarm');

// the allowlist: every entry has a reason, and still matches something
const findings = audit({ voiced: await voicedLookup() });
ok(ALLOW.every((a) => a.why && a.rule), 'elke allowlist-regel heeft rule en why');
for (const a of ALLOW) ok(findings.some((f) => f.allowed === a), `verouderde allowlist-regel: ${JSON.stringify(a)}`);

// the game itself
const open = findings.filter((f) => !f.allowed);
for (const f of open) console.log(`OPEN [${f.rule}] ${f.file}:${f.line}: ${f.term} | ${f.text.slice(0, 100)}`);
ok(open.length === 0, `${open.length} bevindingen buiten de allowlist (node scripts/text_audit.mjs)`);

if (failed) { console.log(`${failed} mislukt`); process.exit(1); }
console.log('text_audit_test ok');
