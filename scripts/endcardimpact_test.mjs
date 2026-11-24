// Planning en regels van de eindkaart met impact (game/js/endcardimpact.js, bigmoment.css):  node scripts/endcardimpact_test.mjs
// Geen DOM, geen Electron: staffeltijden, teller, geluidsmomenten, de grens van 1,6 s en wat de CSS niet mag.
import fs from 'node:fs';
import { planIntro, counterSteps, isSkipEvent, FAST_MS, STEP_MS, MAX_TOTAAL_MS, MAX_TIKKEN } from '../game/js/endcardimpact.js';
import { bouwMoment } from '../game/js/bigmoment.js';
import { mayStartOverlay } from '../game/js/overlayrules.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// de maten komen uit de tokens
const tokens = fs.readFileSync(new URL('../game/js/ds-tokens.css', import.meta.url), 'utf8');
ok(new RegExp(`--ds-m-snel:\\s*${FAST_MS}ms`).test(tokens) && new RegExp(`--ds-m-max:\\s*${STEP_MS}ms`).test(tokens), 'FAST_MS en STEP_MS volgen de tokens');

// teller
const t = counterSteps(1250);
ok(t.length > 0 && t.length <= MAX_TIKKEN, 'teller: een beperkt aantal tikken', t.length);
ok(t[t.length - 1].waarde === 1250, 'teller: de laatste waarde is het doel');
ok(t.every((s, i) => i === 0 || (s.waarde > t[i - 1].waarde && s.t > t[i - 1].t)), 'teller: stijgend in waarde en tijd');
ok(t[0].waarde > t[1].waarde - t[0].waarde, 'teller: ease-out, de eerste stap is de grootste');
ok(t.map((s) => s.tik).join() === t.map((_, i) => i).join(), 'teller: tik telt op van 0');
ok(counterSteps(0).length === 0 && counterSteps(NaN).length === 0 && counterSteps(-5).length === 0, 'teller: geen doel, geen stappen');
const klein = counterSteps(3);
ok(klein.length <= 3 && klein[klein.length - 1].waarde === 3, 'teller: een kleine som krijgt minder stappen', JSON.stringify(klein));
ok(counterSteps(1).length === 1 && counterSteps(1)[0].waarde === 1, 'teller: één euro is één stap');

// plan met impact
const p = planIntro({ soort: 'geslaagd', beloning: 1250, tijd: true, sterren: 3 });
ok(p.impact && p.totaal <= MAX_TOTAAL_MS, 'plan: hooguit 1,6 s', p.totaal);
const namen = p.onderdelen.map((o) => o.naam);
ok(namen.join() === 'klein,kop,regel,beloning,tijd', 'plan: titel, regel, beloning, tijd in volgorde', namen.join());
ok(p.onderdelen.every((o, i) => i === 0 || o.at > p.onderdelen[i - 1].at), 'plan: elk onderdeel komt later dan het vorige');
ok(p.onderdelen.every((o) => o.at % FAST_MS === 0 && o.eenh === o.at / FAST_MS), 'plan: vertragingen zijn veelvouden van --ds-m-snel');
ok(p.onderdelen[0].at > 0, 'plan: het vlak komt eerst, daarna de onderdelen');
ok(p.sterren.length === 3 && p.sterren.every((s, i) => i === 0 || s.at - p.sterren[i - 1].at === FAST_MS), 'plan: sterren slaan één voor één in');
ok(p.teller && p.teller.stappen[p.teller.stappen.length - 1].waarde === 1250, 'plan: de teller eindigt op de beloning');
ok(p.glans && p.glans.at >= p.teller.at + p.teller.duur && p.glans.at + STEP_MS <= p.totaal, 'plan: de glans sluit af na de teller');
ok(p.schok && p.schok.at > 0 && p.schok.at < STEP_MS, 'plan: de schok valt tijdens de landing van het vlak');
const g = p.geluid.map((x) => x.naam);
ok(g[0] === 'whoosh' && g.includes('inslag') && g.includes('munt') && g[g.length - 1] === 'stempel', 'geluid: whoosh, inslag, munt, stempel op het eind', g.join());
ok(g.filter((x) => x === 'tik').length === p.teller.stappen.length - 1, 'geluid: een tik per tellerstap, de laatste is de munt');
ok(g.filter((x) => x === 'ster').length === 3, 'geluid: een geluid per ster');
ok(p.geluid.every((x, i) => i === 0 || x.at >= p.geluid[i - 1].at), 'geluid: op tijd gesorteerd');
ok(p.geluid.every((x) => x.at <= p.totaal), 'geluid: niets na het einde van de intro');
const tikTijden = p.geluid.filter((x) => x.naam === 'tik').map((x) => x.at);
ok(tikTijden.every((x, i) => i === 0 || x - tikTijden[i - 1] >= 40), 'geluid: de tikken ratelen niet');
ok(new Set(p.geluid.map((x) => `${x.at}|${x.naam}|${x.i ?? ''}`)).size === p.geluid.length, 'geluid: niets dubbel');

// uitersten: veel stappen blijven binnen de grens, zonder beloning geen teller
const zwaar = planIntro({ soort: 'geslaagd', beloning: 999999, tijd: true, sterren: 5 });
ok(zwaar.totaal <= MAX_TOTAAL_MS && zwaar.geluid.every((x) => x.at <= MAX_TOTAAL_MS), 'plan: ook met vijf sterren hooguit 1,6 s', zwaar.totaal);
const kaal = planIntro({ soort: 'geslaagd' });
ok(kaal.teller === null && !kaal.geluid.some((x) => x.naam === 'tik' || x.naam === 'munt'), 'plan: zonder beloning geen teller en geen munt');
ok(kaal.onderdelen.map((o) => o.naam).join() === 'klein,kop,regel', 'plan: zonder beloning en tijd alleen titel en regel');

// mislukt: dezelfde inslag zonder fanfare
const m = planIntro({ soort: 'mislukt' });
ok(m.impact && m.glans === null && !m.geluid.some((x) => x.naam === 'stempel' || x.naam === 'munt'), 'mislukt: geen glans en geen fanfare');
ok(m.geluid.some((x) => x.naam === 'dof') && !m.geluid.some((x) => x.naam === 'inslag'), 'mislukt: een doffe inslag');

// Beweging beperken en Rustig drukwerk: geen staffeling, één geluid, direct de eindstand
const r = planIntro({ soort: 'geslaagd', beloning: 500, sterren: 3, rustig: true });
ok(!r.impact && r.totaal === 0 && r.onderdelen.length === 0 && r.teller === null && r.sterren.length === 0 && r.glans === null && r.schok === null, 'rustig: geen staffeling, teller, schok of glans');
ok(r.geluid.length === 1 && r.geluid[0].at === 0, 'rustig: één geluid direct');

// overslaan
ok(isSkipEvent({ type: 'keydown' }) && isSkipEvent({ type: 'pointerdown' }) && isSkipEvent({ type: 'touchstart' }), 'overslaan: toets en aanraking');
ok(!isSkipEvent({ type: 'keydown', repeat: true }) && !isSkipEvent({ type: 'keyup' }) && !isSkipEvent({}), 'overslaan: een vastgehouden toets niet, loslaten niet');

// de kaart behoudt zijn woorden en zijn bedrag voor het eindbeeld
const b = bouwMoment({ soort: 'geslaagd', beloning: 1250 });
ok(b.beloningWaarde === 1250 && b.beloning === '€ 1.250', 'moment: numerieke beloning voor de teller, tekst voor het eindbeeld');
ok(bouwMoment({ soort: 'geslaagd', beloning: '3 kaarten' }).beloningWaarde === null, 'moment: een tekstbeloning telt niet op');

// bronnen
const css = fs.readFileSync(new URL('../game/js/endcardimpact.css', import.meta.url), 'utf8');
const blok = css;
ok(blok.length > 200, 'css: het impactblok bestaat');
ok(!/\b\d+(?:\.\d+)?m?s\b/.test(blok.replace(/\/\*[\s\S]*?\*\//g, '')), 'css: geen losse duur, alleen --ds-m* tokens');
ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(blok.replace(/\/\*[\s\S]*?\*\//g, '')), 'css: geen losse kleuren');
ok(/prefers-reduced-motion: reduce\)[^}]*\.bm-i[^}]*animation: none/.test(blok) && /html\.reduce-motion \.bm-i/.test(blok) && /rustig-drukwerk \.bm-i/.test(blok), 'css: prefers-reduced-motion, Beweging beperken en Rustig drukwerk zetten de animatie uit');
ok(/\.bm-i\.bm-klaar[^{]*\{[^}]*animation: none/.test(blok), 'css: overslaan toont de eindstand');
// #1081 (hertest 22-11): de regel was tijdens het infaden geel op geel; nu een veeg zonder doorzichtigheid
const binnen = (blok.match(/@keyframes bm-binnen \{[^\n]*/) || [''])[0];
ok(/clip-path: inset\(0 100% 0 0\)/.test(binnen) && !/opacity/.test(binnen), 'css: bm-binnen veegt de regel binnen zonder opacity, dus altijd volle inkt op geel');
ok(/\.bm-i\.bm-klaar[^{]*\{[^}]*clip-path: none/.test(blok), 'css: overslaan haalt de veeg weg');
const bmCss = fs.readFileSync(new URL('../game/js/bigmoment.css', import.meta.url), 'utf8');
ok(/\.bm-band \{ display: grid; grid-template-columns: minmax\(0, 1fr\) auto;/.test(bmCss), 'css: de band heeft twee kolommen, geen leeg geel vlak rechts');
ok(/\.bm-band > \.bm-meta \{ grid-column: 2;/.test(bmCss), 'css: beloning en tijd staan rechts');
ok(/@media \(max-width: 900px\) \{\s*\.bm-band \{ grid-template-columns: minmax\(0, 1fr\); \}/.test(bmCss), 'css: op een smal scherm één kolom');
ok(/endcardimpact.css/.test(fs.readFileSync(new URL('../game/js/bigmoment.js', import.meta.url), 'utf8')), 'css: wordt door bigmoment.js geladen');
const js = fs.readFileSync(new URL('../game/js/bigmoment.js', import.meta.url), 'utf8');
ok(!/from '\.\/audio\.js'/.test(js), 'bigmoment.js blijft zonder audio-import (testbaar)');
ok(/capture|, true\)/.test(js) && !/preventDefault/.test(js.slice(js.indexOf('function startImpact'), js.indexOf('function toonNu'))), 'overslaan neemt geen invoer weg');
const cine = fs.readFileSync(new URL('../game/js/cinematics.js', import.meta.url), 'utf8');
ok(/setEindkaartGeluid\(playEindkaartGeluid\)/.test(cine), 'cinematics koppelt het eindkaartgeluid');

// geen overlap met de prestatietoast (#1081): de slag van de eindkaart en die van de prestatie staan en klinken nooit tegelijk
ok(!mayStartOverlay('prestatie', ['resultaat']), 'prestatie wacht zolang de resultaatkaart in beeld is');
ok(mayStartOverlay('prestatie', []), 'prestatie mag weer als de resultaatkaart weg is');
ok(mayStartOverlay('resultaat', ['prestatie']), 'de resultaatkaart begint altijd, ook als een prestatie nog staat');
const overlayDom = fs.readFileSync(new URL('../game/js/overlayhold.js', import.meta.url), 'utf8');
ok(/resultaat: '#cine \.cine-banner:not\(\[hidden\]\)'/.test(overlayDom), 'de DOM-kant herkent de resultaatkaart (showBanner houdt de banner open onder het moment)');
ok(/isOverlayHeld\('prestatie'\)/.test(fs.readFileSync(new URL('../game/js/achievements.js', import.meta.url), 'utf8')), 'de prestatietoast vraagt isOverlayHeld');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
