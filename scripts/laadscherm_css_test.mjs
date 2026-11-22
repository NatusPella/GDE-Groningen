// Pure controle (zonder browser) van het laadscherm (#1069, 22-11): de CSS en de markup volgen de vaste kolomstructuur, gebruiken de
// DS3-tokens en schalen mee; de echte meting van de boxen staat in scripts/laadscherm_layout_test.mjs.
import fs from 'node:fs';
import { loadScreenHtml } from '../game/js/loadscene.js';

let n = 0, fails = 0;
const ok = (c, m, extra) => { n++; if (!c) { fails++; console.log('FAIL ' + m + (extra !== undefined ? ' :: ' + extra : '')); } };
const rd = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const css = rd('../game/js/loadscreen.css'), html = rd('../game/index.html'), ls = rd('../game/js/loadscreen.js');
const rule = (sel) => { const m = new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}').exec(css); return m ? m[1] : ''; };

// 1. een vaste kolomstructuur: geen losse absolute hoeken die elkaar kunnen raken
for (const k of ['.ls-brand', '.ls-card', '.ls-bottom', '.ls-left', '.ls-main']) {
  ok(!/position:\s*absolute/.test(rule('#load-screen ' + k)), `${k} staat in de stroom, niet absoluut`);
}
ok(/display:\s*grid/.test(rule('#load-screen .ls-main')) && /grid-template-columns/.test(rule('#load-screen .ls-main')), 'het hoofdvak is een grid met twee kolommen');
ok(/flex-direction:\s*column/.test(rule('#load-screen .ls-stage')) && /gap:\s*var\(--ls-gap\)/.test(rule('#load-screen .ls-stage')), 'de stage is een kolom met een vaste tussenruimte (hoofdvak boven, vaste zone onderaan)');
ok(/justify-content:\s*space-between/.test(rule('#load-screen .ls-left')) && /gap:\s*var\(--ls-gap\)/.test(rule('#load-screen .ls-left')), 'links: logo boven, bestemming onder, nooit dichter dan --ls-gap');
ok(/--ls-gap:\s*clamp\(24px,/.test(rule('#load-screen .ls-stage')), 'de marge tussen logo en bestemming is minimaal 24 px en schaalt mee met de stagehoogte');
ok(/--ls-h:\s*calc\(100vh \/ var\(--ui, 1\)\)/.test(rule('#load-screen .ls-stage')) && /zoom:\s*var\(--ui, 1\)/.test(rule('#load-screen .ls-stage')), 'de stage is het HUD-vak (venster gedeeld door --ui)');
ok(/flex:\s*0 0 auto/.test(rule('#load-screen .ls-bottom')) && /min-height:\s*2\.6em/.test(rule('#load-screen .ls-step')), 'balk en statusregel staan in een vaste zone onderaan (ruimte voor twee regels, de zone springt niet)');
ok(/-webkit-line-clamp:\s*2/.test(rule('#load-screen .ls-step')), 'een lange statusregel wordt na twee regels afgekapt (één statusregel, tekstdieet)');

// 2. "Naar <plaats>" is één bord; de bestemming krimpt en kapt af, nooit over het logo heen
ok(/border:[^;]*var\(--ds-lijn-zeef\)/.test(rule('#load-screen .ls-card')) && /box-shadow:\s*var\(--ds-schaduw-hard\)/.test(rule('#load-screen .ls-card')), 'de bestemming staat op een bord (zeefdruklijn en harde schaduw)');
ok(/max-width:\s*100%/.test(rule('#load-screen .ls-card')) && /width:\s*fit-content/.test(rule('#load-screen .ls-card')), 'het bord is zo breed als zijn inhoud, nooit breder dan de kolom');
ok(!/position:\s*absolute/.test(rule('#load-screen .ls-kick')) && /background:\s*var\(--ds-c-ink-bord\)/.test(rule('#load-screen .ls-kick')), 'Naar is de groene strook van het bord, geen los label');
const plaats = rule('#load-screen .ls-place');
ok(/text-overflow:\s*ellipsis/.test(plaats) && /white-space:\s*nowrap/.test(plaats) && /overflow:\s*hidden/.test(plaats), 'een te lange plaatsnaam eindigt in een ellips');
ok(/clamp\(2\.5em, min\(calc\(\(100cqw/.test(plaats) && /var\(--n, 8\)/.test(plaats), 'het lettertype van de bestemming volgt de kolom en de naamlengte, met een ondergrens');
ok(/container-type:\s*inline-size/.test(rule('#load-screen .ls-left')), 'de linkerkolom is de container voor cqw');
ok(/--ls-fs:\s*clamp\(14px,/.test(rule('#load-screen .ls-stage')), 'de tekstgrootte van de stage schaalt met de hoogte, niet onder 14 px');
ok(/font:\s*400 max\(13px, 1em\)/.test(rule('#load-screen .ls-step')), 'de statusregel blijft op of boven de 13 px-vloer');
ok(/clamp\(5em, min\(calc\(var\(--ls-h\) \* 0\.2\)/.test(rule('#load-screen .gde-logo')), 'het logo schaalt met de stagehoogte en de kolombreedte');

// 3. gedraaide kaartjes: de rotatie komt uit het token, het plaatje en het logo houden ruimte voor draai en schaduw
ok(/rotate\(var\(--ds-schuin\)\)/.test(rule('#load-screen .ls-brand')) && /rotate\(calc\(var\(--ds-schuin\) \* -1\)\)/.test(rule('#load-screen .ls-bg')), 'de draai komt uit --ds-schuin (Rustig drukwerk zet hem op 0)');
ok(/margin:\s*0 0 0\.5em/.test(rule('#load-screen .ls-brand')), 'het logo houdt ruimte onder zich voor draai en schaduw');
ok(/left:\s*14px; top:\s*18px; width:\s*calc\(100% - 38px\); height:\s*calc\(100% - 42px\)/.test(rule('#load-screen .ls-bg')), 'het plaatje houdt in zijn vak ruimte voor draai en harde schaduw');
ok(/box-shadow:\s*var\(--ds-schaduw-hard-roze\)/.test(rule('#load-screen .ls-bg')), 'het plaatje gebruikt het schaduwtoken');

// 4. tokens, geen losse kleuren in de laadschermregels; minder beweging en rustig drukwerk
const kleurloos = css.split('\n').filter((l) => /#load-screen/.test(l)).join('\n');
ok(!/#[0-9a-fA-F]{3,8}\b/.test(kleurloos) && !/rgba?\(/.test(kleurloos), 'geen losse hex- of rgb-kleuren in het laadscherm (alleen tokens)');
ok(/html\.reduce-motion #load-screen \.ls-stage[^{]*\{\s*animation:\s*none/.test(css) && /prefers-reduced-motion:\s*reduce/.test(css), 'Minder beweging stopt de intrede');
ok(/html\.rustig-drukwerk #load-screen \.ls-bar/.test(css), 'Rustig drukwerk haalt het raster van de balk');
ok(!/backdrop-filter/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'geen backdrop-filter');

// 5. de markup
{
  const h = loadScreenHtml({ kind: 'travel', name: 'Noordlaren', special: 'Kiezelweek', img: 'vismarkt' });
  const kaart = /<div class="ls-card">([\s\S]*?)<\/div><\/div><div class="ls-pic">/.exec(h);
  ok(h.indexOf('class="ls-kick"') > h.indexOf('class="ls-card"') && h.indexOf('class="ls-kick"') < h.indexOf('class="ls-place"'), 'Naar staat in het bord, vóór de plaats');
  ok(kaart && /ls-kick/.test(kaart[1]) && /ls-place/.test(kaart[1]) && /ls-badge/.test(kaart[1]), 'kick, plaats en tag staan samen in één bord');
  ok(h.indexOf('class="ls-brand"') < h.indexOf('class="ls-card"') && h.indexOf('class="ls-card"') < h.indexOf('class="ls-pic"') && h.indexOf('class="ls-pic"') < h.indexOf('class="ls-bottom"'), 'volgorde: logo, bord, plaatje, onderste zone');
  ok(/style="--n:10"/.test(h) && /title="Noordlaren"/.test(h), 'de naamlengte staat als --n op de plaats, de volledige naam in de title');
  ok((h.match(/class="ls-step"/g) || []).length === 1 && (h.match(/role="progressbar"/g) || []).length === 1, 'één statusregel en één voortgangsbalk');
  ok(/Naar<\/span>/.test(h) && /Verder in<\/span>/.test(loadScreenHtml({ kind: 'save', name: 'X' })), 'Naar bij reizen, Verder in bij een save');
  ok(!/ls-badge/.test(loadScreenHtml({ name: 'Drenthe' })), 'zonder bijzondere dag geen tag');
  ok(/&lt;b&gt;/.test(loadScreenHtml({ name: '<b>' })) && /Grunn/.test(loadScreenHtml({})), 'de naam is geescaped, leeg wordt Grunn');
}
ok(/loadScreenHtml\(\{ kind, name: place\.name, special: date\.special, img \}\)/.test(ls), 'loadscreen.js bouwt het DOM met loadScreenHtml (dezelfde markup als de meting)');

// 6. het bootscherm: het logo schaalt met de hoogte, de balk blijft boven de voetregel, de statusregel is begrensd
const boot = html.split('\n').filter((l) => /#loading /.test(l)).join('\n');
ok(/#loading \.gde-logo \{ font-size: clamp\(100px, calc\(100vh \/ var\(--ui, 1\) \* 0\.24\), 216px\)/.test(boot), 'bootlogo: schaalt met de stagehoogte');
ok(/top: min\(72%, calc\(100% - 205px\)\)/.test(boot) && /top: min\(74%, calc\(100% - 205px\)\)/.test(boot), 'bootbalk: nooit lager dan 205 px boven de onderrand');
ok(/#loading \.ld-status \{[^}]*-webkit-line-clamp: 2/.test(boot) && /#loading \.ld-status \{[^}]*max-width: min\(calc\(100% - 96px\), 900px\)/.test(boot), 'bootstatus: hooguit twee regels en nooit tot de rand');

console.log(fails ? `laadscherm_css_test: ${fails} FAIL van ${n}` : `laadscherm_css_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
