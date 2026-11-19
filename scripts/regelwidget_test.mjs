// De regelwidget (game/js/regelwidget.js, #987): pure staat -> vorm per type, de reduce-motion-variant, de sleutelvergelijking
// van de DOM-laag (geen schrijfbeurt bij gelijke staat), de Nederlandse aria-teksten en de tekstvloer van 13 px in de CSS.
//   node scripts/regelwidget_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from '../game/js/regelwidget.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

ok(R.TYPES.length === 7 && R.TYPES.every((t) => typeof R.VORMEN[t] === 'function'), 'zeven types, elk met een vormfunctie');

// ---- lege en NaN-invoer: een verborgen vorm, nooit een uitzondering of NaN in de tekst
for (const t of R.TYPES) {
  for (const inv of [undefined, null, {}, { waarde: NaN, limiet: NaN, rest: NaN, totaal: NaN, heel: NaN, afstand: NaN, hoek: NaN, naald: NaN, stappen: 'x', toetsen: 5 }]) {
    let v;
    try { v = R.vorm(t, inv); } catch (e) { v = null; }
    ok(v && v.verborgen === true && v.key === '' && v.aria === null, `${t}: lege of NaN-invoer is verborgen`, JSON.stringify(inv));
  }
}
ok(R.vorm('onbekend', {}).verborgen === true, 'een onbekend type is verborgen');

// ---- a. limietmeter (de eierrit: tractor 40 km/u, waarschuwing 2 km/u eerder)
{
  const l = (waarde, extra = {}) => R.limietVorm({ waarde, limiet: 40, ...extra });
  ok(l(20).stand === 'ok' && l(37.9).stand === 'ok', 'onder de waarschuwingszone is het ok');
  ok(l(38).stand === 'let-op' && l(39.9).stand === 'let-op', 'de waarschuwing begint 2 km/u onder de limiet');
  ok(l(40).stand === 'over' && l(55).stand === 'over', 'op en boven de limiet is het te snel');
  ok(l(38, { marge: 5 }).stand === 'let-op' && l(34.9, { marge: 5 }).stand === 'ok' && l(35, { marge: 5 }).stand === 'let-op', 'de marge is instelbaar');
  ok(l(-5).vul === 0 && l(1e9).vul === 100, 'de vulling blijft tussen 0 en 100');
  ok(l(20).limietBij === 80 && l(20).warnVan === 76, 'schaal: max is 1,25 x de limiet, de limiet op 80% en de zone vanaf 76%', [l(20).limietBij, l(20).warnVan]);
  ok(R.limietVorm({ waarde: 5, limiet: 40, max: 80 }).limietBij === 50, 'een eigen max verschuift de limietstreep');
  ok(l(39).tekst === '39 / 40 km/u' && l(39).woord === 'rustig aan' && l(41).woord === 'te snel' && l(10).woord === '', 'tekst en woord per stand (kleur is niet de enige drager)');
  ok(l(39).aria.role === 'meter' && l(39).aria.now === 39 && l(39).aria.max === 50 && /rustig aan/.test(l(39).aria.valuetext), 'aria: role meter met waarde en valuetext');
  ok(l(10).melding === '' && /rustig aan/.test(l(39).melding) && /boven het maximum/.test(l(41).melding), 'alleen waarschuwingsstanden geven een melding voor de schermnarratie');
  ok(l(39).anim === 'knipper' && l(41).anim === 'schud' && l(10).anim === 'geen', 'animatie per stand');
  ok(R.limietVorm({ waarde: 5, limiet: 0 }).verborgen && R.limietVorm({ waarde: 5, limiet: -3 }).verborgen, 'zonder geldige limiet geen meter');
  ok(l(20).key === l(20.2).key && l(20).key !== l(24).key, 'de sleutel verandert pas als de getoonde waarde verandert');
}

// ---- b. tellerring
{
  const t = (rest, totaal = 60) => R.tellerVorm({ rest, totaal });
  ok(t(60).stand === 'ok' && t(15).stand === 'laag' && t(6).stand === 'kritiek' && t(0).stand === 'kritiek', 'ok, laag (25%), kritiek (10%)');
  ok(t(42).tekst === '0:42' && t(125, 300).tekst === '2:05' && t(0).tekst === '0:00', 'tijd als m:ss');
  ok(t(-5).streep === 0 && t(500).streep === 100, 'de ring blijft tussen 0 en 100');
  ok(R.tellerVorm({ rest: 30, totaal: 100, eenheid: '%', label: 'Kans' }).tekst === '30 %', 'andere eenheid');
  ok(t(6).melding === 'Tijd bijna op' && t(40).melding === '', 'melding alleen in kritiek');
  ok(t(42).aria.role === 'timer' && /nog 42 seconden/.test(t(42).aria.valuetext), 'aria: nog 42 seconden');
  ok(R.tellerVorm({ rest: 1, totaal: 0 }).verborgen, 'totaal nul is verborgen');
}

// ---- c. voorraad (de eieren van M09: 60 stuks, tien icoontjes)
{
  const v = (heel, totaal = 60, extra = {}) => R.voorraadVorm({ heel, totaal, ...extra });
  ok(v(60).n === 10 && v(60).hele === 10 && v(60).stand === 'ok', 'vol: tien heel');
  ok(v(59).hele === 9, 'een enkel gebroken ei breekt al een icoon (nooit "vol" terwijl er een stuk is)');
  ok(v(1).hele === 1 && v(0).hele === 0 && v(0).stand === 'leeg', 'een enkel heel ei blijft zichtbaar, nul is leeg');
  ok(v(23).stand === 'kritiek' && v(40).stand === 'laag' && v(50).stand === 'ok', 'standen op 40% en 70%');
  ok(v(23).tekst === '23 / 60' && /23 van 60 heel/.test(v(23).alt), 'het echte aantal staat in tekst en alt');
  ok(v(99, 60).hele === 10 && v(-4).hele === 0, 'heel wordt in 0..totaal geklemd');
  ok(R.voorraadVorm({ heel: 2, totaal: 3, max: 10 }).n === 3, 'bij een klein totaal is er een icoon per stuk');
  ok(v(5, 60, { max: 4 }).n === 4, 'max beperkt het aantal icoontjes');
  ok(v(23).melding !== '' && v(55).melding === '', 'melding vanaf kritiek');
  ok(v(23).aria.role === 'meter' && v(23).aria.now === 23 && v(23).aria.max === 60, 'aria: meter met echte aantallen');
}

// ---- d. wijzer
{
  const w = (afstand, hoek, extra = {}) => R.wijzerVorm({ afstand, hoek, ...extra });
  ok(w(120, 0).kant === 'voor' && w(120, Math.PI / 2).kant === 'rechts' && w(120, -Math.PI / 2).kant === 'links' && w(120, Math.PI).kant === 'achter', 'vier hoofdrichtingen');
  ok(w(120, Math.PI / 4).kant === 'rechts voor' && w(120, -3 * Math.PI / 4).kant === 'links achter', 'tussenrichtingen');
  ok(w(120, 3 * Math.PI).graden === 180 && w(1, 2 * Math.PI).graden === 0, 'hoeken worden genormaliseerd');
  ok(w(30, 0).ring === 0 && w(100, 0).ring === 1 && w(300, 0).ring === 2 && w(900, 0).ring === 3, 'afstandsringen op 50, 150 en 400 m');
  ok(w(30, 0).stand === 'dichtbij' && w(900, 0).stand === 'ok', 'dichtbij is een eigen stand');
  ok(w(124, 0).tekst === '125 m' && w(1500, 0).tekst === '1,5 km' && w(-5, 0).tekst === '0 m', 'afstand in 5 m of in km met een komma');
  ok(w(100, 0, { ringen: [10, 20] }).ring === 2, 'eigen ringen');
  ok(w(100, 0.01).key === w(100, 0.02).key, 'kleine hoekjes (onder 5 graden) schrijven niets');
  ok(/Doel: 125 m, rechts/.test(w(125, Math.PI / 2).alt), 'alt-tekst Nederlands');
}

// ---- e. timingbalk
{
  const t = (naald, van = 0.4, tot = 0.6) => R.timingVorm({ naald, van, tot });
  ok(t(0.5).stand === 'raak' && t(0.5).tekst === 'Nu!' && t(0.1).stand === 'ok' && t(0.1).tekst === 'Wacht', 'in en buiten de zone');
  ok(t(0.4).stand === 'raak' && t(0.6).stand === 'raak', 'de randen horen bij de zone');
  const smal = R.timingVorm({ naald: 0.5, van: 0.49, tot: 0.51 });
  ok(smal.tot - smal.van >= R.MIN_ZONE * 100 - 1, 'een smalle zone wordt opgerekt tot de minimale ruimte (#957)', [smal.van, smal.tot]);
  const rand = R.timingVorm({ naald: 0.5, van: 0.98, tot: 1 });
  ok(rand.tot <= 100 && rand.van >= 0 && rand.tot - rand.van >= 19, 'een zone aan de rand blijft binnen de balk');
  ok(R.timingVorm({ naald: 0.5, van: 0.7, tot: 0.3 }).van === 30, 'van en tot in de verkeerde volgorde worden gewisseld');
  ok(t(-1).naald === 0 && t(2).naald === 100, 'de naald blijft in de balk');
  ok(t(0.5).aria.role === 'meter' && /in de zone/.test(t(0.5).aria.valuetext), 'aria in het Nederlands');
}

// ---- f. toets met lus
{
  const k = (toetsen, handeling) => R.toetsVorm({ toetsen, handeling });
  ok(k(['A', 'D'], 'houd').alt === 'Houd A en D ingedrukt' && k(['E'], 'tik').alt === 'Tik op E' && k(['Q', 'E', 'Z'], 'draai').alt === 'Draai met Q, E en Z', 'tekst per handeling');
  ok(k(['A'], 'houd').anim === 'houd' && k(['A'], 'tik').anim === 'tik' && k(['A'], 'draai').anim === 'draai', 'lus per handeling');
  ok(k(['A'], 'onzin').handeling === 'tik', 'een onbekende handeling wordt tikken');
  ok(k([], 'houd').verborgen && k([5, null], 'houd').verborgen, 'geen geldige toetsen: verborgen');
  ok(k(['A', 'D'], 'houd').tekst === 'vasthouden', 'een kort woord naast de toets in plaats van een zin');
  ok(R.toetsVorm({ toetsen: ['A'], handeling: 'houd', label: 'Klimmen' }).alt === 'Klimmen: Houd A ingedrukt', 'label ervoor');
}

// ---- g. stappen en legenda
{
  const st = (klaar, extra = {}) => R.stappenVorm({ stappen: [{ icoon: 'ei', label: 'Ei' }, { icoon: 'zout', label: 'Zout' }, { icoon: 'meel', label: 'Meel' }], klaar, ...extra });
  ok(st(0).lijst.map((s) => s.stand).join() === 'nu,straks,straks' && st(1).lijst.map((s) => s.stand).join() === 'klaar,nu,straks' && st(3).lijst.every((s) => s.stand === 'klaar'), 'eerst dit, dan dat: klaar, nu, straks');
  ok(st(3).stand === 'klaar' && /alles gedaan/.test(st(3).alt) && /stap 2 van 3, Zout/.test(st(1).alt), 'alt noemt de huidige stap');
  ok(st(1, { verberg: true }).lijst[2].label === '?' && st(1, { verberg: true }).lijst[1].label === 'Zout', 'verberg: alleen de latere stappen worden "?"');
  ok(st(99).klaar === 3 && st(-2).klaar === 0, 'klaar wordt geklemd');
  const lg = R.stappenVorm({ modus: 'legenda', stappen: [{ icoon: 'parasol', label: 'parasol', waarde: '+160' }, { icoon: 'kliko', label: 'kliko', waarde: '+110' }] });
  ok(lg.modus === 'legenda' && lg.lijst.every((s) => s.stand === 'nu') && /parasol \+160, kliko \+110/.test(lg.alt) && lg.tekst === '', 'legenda: icoon en waarde, geen volgorde');
  ok(R.stappenVorm({ stappen: [null, 4, 'x'] }).verborgen, 'ongeldige stappen: verborgen');
}

// ---- reduce motion: elke animatie uit, de vorm en de tekst blijven
for (const [t, inv] of [['limiet', { waarde: 41, limiet: 40 }], ['teller', { rest: 3, totaal: 60 }], ['voorraad', { heel: 10, totaal: 60 }], ['wijzer', { afstand: 10, hoek: 0 }], ['timing', { naald: 0.5, van: 0.4, tot: 0.6 }], ['toets', { toetsen: ['A'], handeling: 'houd' }], ['stappen', { stappen: [{ icoon: 'ei', label: 'Ei' }], klaar: 0 }]]) {
  const aan = R.vorm(t, inv, { reduce: false }), uit = R.vorm(t, inv, { reduce: true });
  ok(uit.anim === 'geen' && aan.anim !== 'geen', `${t}: reduce motion zet de animatie uit`, [aan.anim, uit.anim]);
  ok(uit.tekst === aan.tekst && uit.alt === aan.alt && uit.alt.length > 3 && uit.key !== aan.key, `${t}: zelfde tekstalternatief, eigen sleutel`);
}

// ---- Nederlandse teksten: geen Engels, geen NaN of undefined
{
  const alle = [R.limietVorm({ waarde: 39, limiet: 40 }), R.tellerVorm({ rest: 5, totaal: 60 }), R.voorraadVorm({ heel: 20, totaal: 60 }), R.wijzerVorm({ afstand: 80, hoek: 1 }), R.timingVorm({ naald: 0.5, van: 0.4, tot: 0.6 }), R.toetsVorm({ toetsen: ['A', 'D'], handeling: 'houd' }), R.stappenVorm({ stappen: [{ icoon: 'ei', label: 'Ei' }, { icoon: 'zout', label: 'Zout' }], klaar: 1 })];
  for (const v of alle) {
    const tekst = [v.tekst, v.alt, v.melding, v.aria && v.aria.label, v.aria && v.aria.valuetext].join(' ');
    ok(!/NaN|undefined|null|\bthe\b|\bpress\b|\bhold\b/i.test(tekst), `${v.type}: teksten zijn schoon en Nederlands`, tekst);
    ok(v.aria && ['meter', 'timer', 'status', 'img'].includes(v.aria.role) && v.aria.label, `${v.type}: aria met role en label`);
  }
}

// ---- de DOM-laag met een minimaal nepdocument: sleutelvergelijking en aria
{
  let writes = 0;
  class El {
    constructor(tag) {
      this.tag = tag; this.kids = []; this.cache = new Map(); this._a = new Map(); this.className = ''; this.hidden = false;
      this.dataset = new Proxy({}, { set: (o, k, v) => { if (o[k] !== v) writes++; o[k] = v; return true; } });
      this.style = { setProperty: () => { writes++; }, set left(v) { writes++; }, set width(v) { writes++; } };
      this.classList = { toggle: () => { writes++; }, add() {}, remove() {}, contains: () => false };
      this._t = ''; this._h = ''; this.parentNode = null;
    }
    get firstChild() { return this.child('#first'); }
    child(sel) { if (!this.cache.has(sel)) { const c = new El('x'); c.parentNode = this; this.cache.set(sel, c); } return this.cache.get(sel); }
    querySelector(sel) { return this.child(sel); }
    set innerHTML(v) { writes++; this._h = v; }
    get innerHTML() { return this._h; }
    set textContent(v) { writes++; this._t = v; }
    get textContent() { return this._t; }
    setAttribute(k, v) { if (this._a.get(k) !== String(v)) writes++; this._a.set(k, String(v)); }
    removeAttribute(k) { this._a.delete(k); }
    getAttribute(k) { return this._a.get(k); }
    appendChild(c) { this.kids.push(c); c.parentNode = this; return c; }
    get children() { return this.kids; }
  }
  const stand = { reduce: false };
  globalThis.document = { documentElement: { classList: { contains: () => stand.reduce } }, createElement: (t) => new El(t), head: new El('head') };
  const ouder = new El('div');
  const log = [];
  R.zetAankondiger((t) => log.push(t));
  const w = R.maakWidget('limiet', ouder, { limiet: 40, eenheid: 'km/u', label: 'Snelheid', icoon: 'meter' });
  ok(w && w.root.hidden === true, 'een nieuwe widget is verborgen tot hij een staat heeft');
  w.inv.waarde = 20;
  ok(w.ververs() === true && w.root.hidden === false && w.root.getAttribute('role') === 'meter', 'eerste staat: zichtbaar met role meter');
  ok(w.root.getAttribute('aria-label') === 'Snelheid' && /20 van maximaal 40 km\/u/.test(w.root.getAttribute('aria-valuetext')), 'aria-label en valuetext in het Nederlands');
  const voor = writes;
  ok(w.ververs() === false && writes === voor, 'gelijke staat: geen enkele DOM-schrijfbeurt');
  w.inv.waarde = 20.2;
  ok(w.ververs() === false && writes === voor, 'dezelfde getoonde waarde (afgerond): ook niets');
  w.inv.waarde = 38.5;
  ok(w.ververs() === true && writes > voor && log.length === 1 && /rustig aan/.test(log[0]), 'een nieuwe stand schrijft en kondigt eenmaal aan');
  w.inv.waarde = 38.9;
  w.ververs();
  ok(log.length === 1, 'dezelfde stand kondigt niet opnieuw aan');
  w.inv.waarde = 41;
  w.ververs();
  ok(log.length === 2 && /boven het maximum/.test(log[1]), 'de volgende stand kondigt zich aan');
  stand.reduce = true;
  ok(w.ververs() === true && /\|1\|/.test(w.key), 'reduce motion: eigen sleutel, de widget wordt opnieuw getekend');
  w.verberg();
  ok(w.root.hidden === true, 'verberg verbergt');
  ok(R.maakWidget('onbekend', ouder) === null, 'onbekend type: geen widget');
  delete globalThis.document;
}

// ---- CSS: tekstvloer, reduce motion, geen vaste kleuren buiten de tokens
{
  const css = fs.readFileSync(path.join(ROOT, 'game/js/regelwidget.css'), 'utf8');
  const sizes = [...css.matchAll(/font(?:-size)?:\s*(?:bold\s+)?([\d.]+)px/g)].map((m) => Number(m[1]));
  ok(sizes.length > 3 && sizes.every((s) => s >= 13), 'alle tekst is minstens 13 px', sizes.join());
  ok(/html\.reduce-motion \.rw/.test(css) && /prefers-reduced-motion: reduce/.test(css), 'reduce motion in CSS (klasse en OS-instelling)');
  ok(/\.rw\.rw-statisch \.rw-alt \{[^}]*position: static/.test(css), 'bij reduce motion staat het tekstalternatief in beeld');
  const strays = css.split(/\r?\n/).filter((l) => /#[0-9a-f]{3,8}\b/i.test(l) && !/var\(--[\w-]+,\s*#[0-9a-f]{3,8}\)/i.test(l) && !/--rw-gat:/.test(l));
  ok(strays.length === 0, 'kleuren komen uit de HUD-tokens (met terugval), geen losse hex', strays.join(' | '));
  ok(!/@keyframes[^{]*\{[^@]*?\b(width|height|top|left)\s*:/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'animaties alleen met transform, opacity en schaduw');
  ok(/\.rw-limiet \.rw-warn \{[^}]*repeating-linear-gradient/.test(css) && /\.rw-timing \.rw-zone \{[^}]*repeating-linear-gradient/.test(css), 'zones hebben een arcering: kleur is niet de enige betekenis');
  // contrast van de tekstkleuren op het glas
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  ok(cr('#f0ede4', '#0c140e') >= 4.5 && cr('#f08a8a', '#0c140e') >= 4.5, 'tekst en foutkleur halen 4,5:1 op het glas', [cr('#f0ede4', '#0c140e'), cr('#f08a8a', '#0c140e')]);
  ok(cr('#d93f3f', '#0c140e') >= 3 && cr('#3fc97a', '#0c140e') >= 3 && cr('#ff9a3c', '#0c140e') >= 3, 'vulkleuren halen 3:1 (grafiek)');
}

// ---- gebruik: de HUD en de missies gebruiken de module
{
  const lees = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');
  ok(/regelwidget\.js/.test(lees('hud_panel.js')) && /maakWidget\('limiet'/.test(lees('hud_panel.js')) && /maakWidget\('voorraad'/.test(lees('hud_panel.js')), 'eierrit: HUD gebruikt limiet en voorraad');
  ok(/legenda/.test(lees('stunthud.js')) && /legenda/.test(lees('stuntavond.js')), 'stunt: puntenlegenda');
  ok(/maakWidget\('toets'/.test(lees('klimtoren.js')), 'klimtoren: toetswidget');
  ok(/maakWidget\('stappen'/.test(lees('bakeround.js')), 'bakeround: stappenwidget');
  ok(/eggsHeel/.test(lees('missions.js')), 'missions publiceert het aantal eieren');
}

console.log(`regelwidget_test: ${n} checks, ${fails} mislukt`);
process.exit(fails ? 1 : 0);
