// Over-scherm (#612): de hele changelog stond in één luik. Vanaf nu toont het eerste beeld
// hooguit twee versies binnen de 270 woorden van een naslagscherm, zit de rest achter "Alles"
// (lui gevuld), zijn credits en licenties elk in te klappen, en gebruikt de nieuwmarkering de
// menu-set in plaats van de .ss-*-klassen van het oude startscherm.
//   node scripts/over_menu_test.mjs
import fs from 'node:fs';
import { changelogVersions, overBodyHtml, allVersionsHtml, recentVersions, setNewsSince, loadChangelog, loadChangelogVersions } from '../game/js/over.js';
import { wordCount } from '../game/js/hudtext.js';
import { CREDITS_HTML, LICENSES_HTML, ABOUT_HTML } from '../game/js/credits.js';

let n = 0, fails = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', m, extra); } };

const md = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const versions = changelogVersions(md);

// --- de parser ---------------------------------------------------------------
const eersteKop = (md.match(/^## \[(?!Unreleased\])([^\]]+)\]/m) || [])[1];
ok(versions.length > 50, 'de changelog levert alle versies als losse blokken', String(versions.length));
ok(versions[0].version === eersteKop, 'de nieuwste versie staat vooraan', versions[0].version);
ok(versions.every((v) => v.version && v.html), 'elke versie heeft een nummer en inhoud');
ok(!versions.some((v) => /^unreleased$/i.test(v.version)), '[Unreleased] is geen spelersversie en valt weg');
ok(versions.every((v, i) => i === 0 || versions[i - 1].version !== v.version), 'geen dubbele versies');
ok(typeof loadChangelog === 'function' && typeof loadChangelogVersions === 'function', 'de oude laadfunctie en de nieuwe versielader bestaan naast elkaar');

// --- het eerste beeld: hooguit twee versies, onder 270 woorden ----------------
setNewsSince(undefined);
const body = overBodyHtml(versions);
const heads = (body.match(/<h3[^>]*>Versie /g) || []).length;
ok(heads >= 1 && heads <= 2, 'het eerste beeld toont hooguit twee versies', String(heads));
ok(wordCount(body) <= 270, 'het eerste beeld blijft onder de 270 woorden van een naslagscherm', String(wordCount(body)));
ok(recentVersions(versions, { maxVersions: 2, maxWords: 270 }).length === heads, 'de woordgrens en het versie-aantal komen uit dezelfde regel');
// te veel tekst: dan zakt het aantal versies mee in plaats van over de grens te gaan
const nep = [
  { version: '9.9.9', date: '', html: '<p>kort</p>' },
  { version: '9.9.8', date: '', html: '<p>' + 'woord '.repeat(400) + '</p>' },
];
ok(recentVersions(nep, { maxVersions: 2, maxWords: 270 }).length === 1, 'een te lange tweede versie valt weg');
ok(recentVersions(versions, { maxVersions: 2, maxWords: 60 }).length <= 1, 'de tweede versie valt weg als het budget op is');

// --- de rest achter "Alles", lui gevuld --------------------------------------
ok(/data-over-alles aria-expanded="false"/.test(body), 'de rest van de changelog zit achter "Alles"');
ok(/data-over-alles-body hidden><\/div>/.test(body), 'de "Alles"-lijst wordt pas bij openen gevuld');
ok(/Alle \d+ versies/.test(body), 'de vouw zegt hoeveel versies erachter zitten');
const all = allVersionsHtml(versions);
ok((all.match(/<h3/g) || []).length === versions.length, '"Alles" bevat alle versies', String((all.match(/<h3/g) || []).length));
ok(all.includes(versions[versions.length - 1].version), 'ook de oudste versie staat erin');

// --- credits en licenties apart in te klappen --------------------------------
ok(/data-fold="over-credits"/.test(body), 'credits is een eigen vouw');
ok(/data-fold="over-licenses"/.test(body), 'licenties en privacy zijn een eigen vouw');
ok(/data-fold-body="over-credits" hidden><\/div>/.test(body) && /data-fold-body="over-licenses" hidden><\/div>/.test(body), 'de inhoud van beide vouwen wordt pas bij openen gevuld');
ok(!/class="ss-news/.test(body), 'geen .ss-*-klassen meer in de markup van het pauzemenu');
ok(/class="m-disc"/.test(body) && /class="m-fold"/.test(body), 'de vouwen gebruiken de gedeelde .m-*-set');
ok(/class="m-eb g"/.test((setNewsSince(null), overBodyHtml(versions))), 'de nieuwmarkering gebruikt de menu-eyebrow (m-eb) in het groen');
ok(CREDITS_HTML.includes('Kaart') && CREDITS_HTML.includes('Muziek en stemmen') && !CREDITS_HTML.includes('<h4>Licenties</h4>'), 'credits bevatten de bronnen, niet de licenties');
ok(LICENSES_HTML.includes('<h4>Licenties</h4>') && LICENSES_HTML.includes('<h4>Privacy</h4>'), 'licenties en privacy staan bij elkaar');
ok(ABOUT_HTML === CREDITS_HTML + LICENSES_HTML, 'het oude Over-paneel is beide helften samen');

// --- de nieuwmarkering -------------------------------------------------------
let html = (setNewsSince(null), overBodyHtml(versions));
ok(/<h3 class="g">Versie [^<]+<small>[^<]+<\/small><span class="m-eb g">Nieuw sinds je vorige keer<\/span><\/h3>/.test(html), 'zonder bekende vorige versie is de nieuwste nieuw');
ok((html.match(/Nieuw sinds je vorige keer/g) || []).length === 1, 'en alleen de nieuwste');
html = (setNewsSince(versions[0].version), overBodyHtml(versions));
ok(!/Nieuw sinds je vorige keer/.test(html), 'heb je de nieuwste versie gezien, dan is er niets nieuw');
html = (setNewsSince(versions[1].version), overBodyHtml(versions));
ok((html.match(/Nieuw sinds je vorige keer/g) || []).length === 1, 'een oudere vorige versie markeert alleen de nieuwste');
setNewsSince(undefined);
ok(!/Nieuw sinds je vorige keer/.test(overBodyHtml(versions)), 'zonder mijlpaal is er geen markering');

// --- de lader: één fetch deelt het oude startscherm en het Over-scherm --------
const echtFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async () => { calls++; return { ok: true, text: async () => md }; };
const volledig = await loadChangelog();
const viaVersies = await loadChangelogVersions();
globalThis.fetch = echtFetch;
ok(calls === 1, 'de changelog wordt één keer opgehaald voor beide schermen', String(calls));
ok((volledig.match(/<h3/g) || []).length === versions.length, 'de oude laadfunctie geeft alle versies als HTML');
ok(viaVersies.length === versions.length, 'de nieuwe lader geeft dezelfde versies');
const mislukt = await import('../game/js/over.js?test=mislukt');
globalThis.fetch = async () => ({ ok: false, status: 404 });
ok((await mislukt.loadChangelogVersions()) === null, 'een mislukte lading geeft null in plaats van een halve lijst');
ok((await mislukt.loadChangelog()).includes('kon niet worden geladen'), 'en het oude pad zegt het gewoon in tekst');
globalThis.fetch = echtFetch;

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);

