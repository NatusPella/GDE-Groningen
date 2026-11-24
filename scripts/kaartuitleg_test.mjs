// 'Zo werkt de kaart' moet altijd te sluiten zijn (21-11, eigenaar): Begrepen, Enter, Escape (en B) en een klik ernaast, en hij komt
// niet terug na heropenen, ook niet als de opslag niet schrijft. De DOM-kant zit in mapview.js; hier de pure en de bronkant.
// Het echte spel: node scripts/qa/gebieden_shots.mjs --page=scripts/qa/kaart_uitleg.page.js.
import fs from 'node:fs';
import { uitlegHtml } from '../game/js/kaartactieui.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const src = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

const html = uitlegHtml({ gast: false });
ok(/data-act="uitleg-sluit"/.test(html) && /class="ds-z-knop mv-help-ok ds-z-knop--toets"/.test(html) && /Begrepen/.test(html), 'één knop Begrepen met data-act uitleg-sluit');
ok(/role="dialog"/.test(html) && /aria-modal="true"/.test(html), 'de uitleg is een dialoog');
ok(uitlegHtml({ gast: true }).length > html.length, 'een gast leest er een regel bij');

// de hoofdoorzaak: .mapview-overlay heeft pointer-events: none en alleen de kinderen die klikbaar moeten zijn zetten auto; .mv-help erfde none en liet elke klik door naar het doek
const css = src('game/js/kaartactieui.js');
ok(/(?:\.mapview-overlay|:is\(\.mapview-overlay, \.reis-hud\)) :is\(\.mv-help, \.mv-reispop\) \{[^}]*pointer-events: auto/.test(css), 'de uitleg zet pointer-events: auto (anders klikt alles door naar het doek)');

const mv = src('game/js/mapview.js');
ok(/let uitlegGezien = false;/.test(mv) && /if \(uitlegGezien\) return true;/.test(mv), 'kaartGezien onthoudt het ook in het geheugen');
ok(/function sluitKaartUitleg\(btn\) \{\s*uitlegGezien = true;/.test(mv), 'sluiten zet eerst het geheugen, dan de opslag');
ok(/export function kaartUitlegSluiten\(\)/.test(mv) && /querySelector\('\.mv-help'\)/.test(mv), 'kaartUitlegSluiten is er voor Escape en B');
ok(/e\.target === uitleg\) \{ sluitKaartUitleg\(uitleg\)/.test(mv), 'een klik naast het kader sluit');
ok(/act === 'uitleg-sluit'\) sluitKaartUitleg\(btn\)/.test(mv), 'Begrepen sluit');

ok(mv.includes('(uitlegKnop || state.canvas).focus('), 'na het openen houdt de uitleg-knop de focus, niet het doek');
ok(mv.includes("(e.key === 'Enter' || e.key === ' ') && kaartUitlegSluiten()"), 'Enter en spatie sluiten de uitleg waar de focus ook staat');

const pm = src('game/js/pausemenu.js');
ok(/kaartUitlegSluiten/.test(pm.split('\n').find((l) => l.startsWith('import') && l.includes('mapview.js')) || ''), 'pausemenu.js importeert kaartUitlegSluiten');
ok(/function goBack\(\) \{[\s\S]{0,300}?if \(tab === 'map' && \(kaartUitlegSluiten\(\) \|\| kaartReisPopupSluiten\(\) \|\| kaartPlekkaartSluiten\(\)\)\) return;/.test(pm), 'Escape (en B) sluit eerst de uitleg, dan de popup, dan de plekkaart, dan pas de kaart');

// ---- herontwerp 21-11 (eigenaar: "dat is nu een zootje"): compact, leesbaar, rustig, wijst naar de echte kaart ----
import { UITLEG_DATA, MAX_WOORDEN } from '../game/js/uitlegdata.js';
import { woordenTelling } from '../game/js/uitleg.js';
import { BRACE_KEY_RE } from '../game/js/keycap.js';
import { UITLEG_ID } from '../game/js/kaartactie.js';
import { KEYS } from '../game/js/storagekeys.js';
const ruw = uitlegHtml({ gast: false });
// inhoud: vier genummerde rijen met één icoon, de toetsen als toetskap in de zin, hooguit acht woorden
const kd = UITLEG_DATA['kaart-actie'];
ok(kd.stappen.length === 4, 'de kaartuitleg heeft vier rijen');
ok(kd.stappen.every((s) => s.icoon && !s.toets), 'elke rij heeft één icoon; de toetsen staan als {TOKEN} in de zin');
ok(kd.stappen.every((s) => woordenTelling(s.tekst) <= MAX_WOORDEN), 'elke rij heeft hooguit acht woorden');
const bekend = new RegExp(BRACE_KEY_RE.source);
ok(kd.stappen.every((s) => [...s.tekst.matchAll(/\{[A-Z0-9]+\}/g)].every((m) => bekend.test(m[0]))), 'elk {TOKEN} in de rijen is een bekende toets');
ok(kd.stappen.some((s) => /\{LMB\}/.test(s.tekst)) && kd.stappen.some((s) => /\{M\}/.test(s.tekst) && /\{ESC\}/.test(s.tekst)) && !kd.stappen.some((s) => /\{Q\}|\{E\}/.test(s.tekst)), 'de rijen noemen muisklik, M en Esc als toets; Q en E wisselen het menu onder de kaart en horen niet in de kaartuitleg');
ok(kd.stappen.filter((s) => s.wijs).map((s) => s.wijs).join() === 'zoek,lagen', 'rij 1 en 2 wijzen naar het zoekveld en de knop Lagen');
ok((ruw.match(/class="ds-uitleg__nr"/g) || []).length === 4 && /ds-uitleg--rij/.test(ruw), 'de rijen zijn genummerd 1 tot 4 (ds-uitleg--rij)');
ok(/data-wijs="zoek"/.test(ruw) && /data-wijs="lagen"/.test(ruw), 'de rijen dragen data-wijs voor de wijzers');
// onderaan: één primaire knop met de Enter-toets IN de knop; geen uitklapper (een controller kwam er niet bij) en geen verwijzing naar Instellingen (21-11)
ok(!/<details|Meer uitleg/.test(ruw), 'geen Meer uitleg-uitklapper meer: de rijen zijn de uitleg');
ok(!/Instellingen|mv-help-hulp/.test(ruw), 'geen verwijzing naar Instellingen onderaan (de Hulp-knop op de kaart opent de uitleg opnieuw)');
ok((ruw.match(/<button/g) || []).length === 1, 'één knop: Begrepen');
ok(/<button[^>]*data-key="ENTER"[^>]*>[\s\S]*Begrepen[\s\S]*ds-z-knop__toets[\s\S]*<\/button>/.test(ruw) && !/mv-help-toets/.test(ruw), 'de Enter-toets staat IN de knop Begrepen, niet ernaast');
ok(/id="mv-help-t"/.test(ruw) && /aria-labelledby="mv-help-t"/.test(ruw), 'de dialoog heeft een naam voor de schermlezer');
// de maten: kaart 420 tot 480 px, tekst 15 px of meer, geen vaste px-maat voor een toets, rustig bij verminderde beweging
const mvCss = src('game/js/kaartactieui.js');
ok(/\.mv-help-box, \.mv-reispop-box\) \{ width: min\(460px, 100%\)/.test(mvCss), 'de uitlegkaart is 460 px breed (420 tot 480)');
const helpBlok = mvCss.slice(mvCss.indexOf('/* de uitleg en de reispopup')).split('\n').filter((l) => /mv-help|mv-reispop/.test(l));
const maten = helpBlok.flatMap((l) => [...l.matchAll(/font-size:\s*([^;}]+)[;}]/g)].map((m) => m[1].trim()));
ok(maten.length >= 8 && maten.every((m) => /^(max\((1[3-9]|[2-9]\d)px|var\(--ds-t-label\))/.test(m)), 'alle tekst in de uitleg en de reispopup is 13 px of meer (tekst 15 px)', maten.join(' | '));
ok(helpBlok.filter((l) => /font-size:\s*max\(1[0-4]px/.test(l)).every((l) => /mv-aanb|mv-reispop-eb/.test(l)), 'alleen de labels (Aanbevolen en de kicker boven de reiskaart, hertest 24-11) staan op 13 px, de rest op 15 px of meer');
ok(!helpBlok.some((l) => /hud-key[^{]*\{[^}]*(width|height|font-size):\s*\d+px/.test(l)), 'geen vaste px-maten voor toetsen in de uitleg');
ok(/prefers-reduced-motion[^\n]*mv-help/.test(mvCss) && /html\.reduce-motion (?:\.mapview-overlay|:is\(\.mapview-overlay, \.reis-hud\)) :is\(\.mv-help/.test(mvCss) && /html\.rustig-drukwerk (?:\.mapview-overlay|:is\(\.mapview-overlay, \.reis-hud\)) :is\(\.mv-help/.test(mvCss), 'de binnenkomst staat stil bij verminderde beweging en Rustig drukwerk');
ok(!/backdrop-filter:\s*blur/.test(mvCss), 'geen vervaging achter de kaart');
// rustig: Lagen dicht zolang de uitleg openstaat, de dim 45 %, de wijzers in de eigen laag
ok(/toggleLegend\(false\);\s*plaatsWijzers\(\);/.test(mv), 'bij het openen van de uitleg gaat Lagen dicht en komen de wijzers');
ok(/const uitlegOpen = !!state\.overlay\.querySelector\('\.mv-help'\);\s*if \(!state\.legendGezien && !uitlegOpen\)/.test(mv), 'de eerste keer opent Lagen niet als de uitleg openstaat');
ok(/\.mv-help, \.mv-reispop\) \{ background: color-mix\(in srgb, var\(--ds-c-ink-inkt\) 45%/.test(src('game/js/pausemenu.css')), 'de kaart is gedimd (45 %), er is geen transparante override meer');
ok(!/\.mv-help \{ background: transparent/.test(src('game/js/pausemenu.css')), 'geen override die de dim weghaalt');
ok(/WIJS_DOEL = \{ zoek: '\.mapview-search', lagen: '\.mv-layers' \}/.test(mv) && /aria-hidden', 'true'/.test(mv), 'de wijzers staan op het zoekveld en de knop Lagen en zijn aria-hidden');
// gezien: dezelfde sleutel, geen savegame-breuk
ok(UITLEG_ID === 'kaart:uitleg' && KEYS.hudSeen === 'gde-hud-gezien', 'de gezien-sleutel is ongewijzigd (kaart:uitleg in gde-hud-gezien)', `${UITLEG_ID} ${KEYS.hudSeen}`);
ok(/localStorage\.setItem\(KEYS\.hudSeen, JSON\.stringify\(markSeen\(parseSeen\(localStorage\.getItem\(KEYS\.hudSeen\)\), UITLEG_ID\)\)\)/.test(mv), 'sluiten onthoudt het in de bestaande sleutel');
// focus en Esc
ok(/aria-modal="true"/.test(ruw) && /mv-help-ok/.test(ruw), 'Begrepen is de enige knop en dus de standaardfocus');
// de gedeelde component: geen eigen rij-CSS per scherm, de maten staan in ds-components.css
ok(!/ds-uitleg__stap|ds-uitleg__lijst/.test(mvCss.replace(/\/\/.*$/gm, '')), 'kaartactieui.js heeft geen eigen CSS voor de uitlegrijen: dat is .ds-uitleg--rij in ds-components.css');

console.log(fails ? `kaartuitleg_test: ${fails} van ${n} mislukt` : `kaartuitleg_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
