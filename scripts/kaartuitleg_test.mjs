// 'Zo werkt de kaart' moet altijd te sluiten zijn (21-11, eigenaar): Begrepen, Enter, Escape (en B) en een klik ernaast, en hij komt
// niet terug na heropenen, ook niet als de opslag niet schrijft. De DOM-kant zit in mapview.js; hier de pure en de bronkant.
// Het echte spel: node scripts/qa/gebieden_shots.mjs --page=scripts/qa/kaart_uitleg.page.js.
import fs from 'node:fs';
import { uitlegHtml } from '../game/js/kaartactieui.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const src = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

const html = uitlegHtml({ gast: false });
ok(/data-act="uitleg-sluit"/.test(html) && /class="ds-knop mv-help-ok"/.test(html) && /Begrepen/.test(html), 'één knop Begrepen met data-act uitleg-sluit');
ok(/role="dialog"/.test(html) && /aria-modal="true"/.test(html), 'de uitleg is een dialoog');
ok(uitlegHtml({ gast: true }).length > html.length, 'een gast leest er een regel bij');

// de hoofdoorzaak: .mapview-overlay heeft pointer-events: none en alleen de kinderen die klikbaar moeten zijn zetten auto; .mv-help erfde none en liet elke klik door naar het doek
const css = src('game/js/kaartactieui.js');
ok(/.mapview-overlay .mv-help {[^}]*pointer-events: auto/.test(css), 'de uitleg zet pointer-events: auto (anders klikt alles door naar het doek)');

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
ok(/function goBack\(\) \{[\s\S]{0,300}?if \(tab === 'map' && kaartUitlegSluiten\(\)\) return;/.test(pm), 'Escape (en B) sluit eerst de uitleg, dan pas de kaart');

console.log(fails ? `kaartuitleg_test: ${fails} van ${n} mislukt` : `kaartuitleg_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
