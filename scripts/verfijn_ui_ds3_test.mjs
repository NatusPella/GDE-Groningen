// Verfijnronde UI en DS3 (22-11): regressietests en fuzz voor de randgevallen die de ronde vond.  node scripts/verfijn_ui_ds3_test.mjs
// Kapotte instellingen ('constructor', NaN, een venster van 0 px), te korte hexkleuren, een lange menumelding, een lege
// foutmelding en Enter naast de afsluitvraag: elk geval hieronder was een echte fout of een dode toets.
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log(`FAIL ${name}`); } };
const lees = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// DOM-nabootsing voor de afsluitvraag (zelfde opzet als quitconfirm_test.mjs)
const listeners = [];
const knoppen = ['nee', 'ja'].map((qc) => ({ dataset: { qc }, focus() { doc.activeElement = this; }, closest() { return this; } }));
const klikken = [];
const el = { id: '', className: '', set innerHTML(v) { this.html = v; }, querySelectorAll: () => knoppen, querySelector: (s) => knoppen.find((k) => s.includes(`"${k.dataset.qc}"`)), addEventListener: (t, f) => klikken.push(f), remove() {} };
const doc = { body: { appendChild() {}, classList: { toggle() {}, add() {}, remove() {}, contains: () => false } }, documentElement: { style: { setProperty() {} }, classList: { toggle() {}, add() {}, remove() {}, contains: () => false } }, createElement: () => el, activeElement: null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] };
globalThis.document = doc;
globalThis.window = { addEventListener: (t, f) => listeners.push(f), removeEventListener: (t, f) => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); }, matchMedia: () => ({ matches: false, addEventListener() {} }) };

const J = '../game/js/';
const A = await import(J + 'a11ylogic.js');
const N = await import(J + 'noticetiming.js');
const H = await import(J + 'hudlook.js');
const U = await import(J + 'achievementunlock.js');
const B = await import(J + 'bigmoment.js');
const M = await import(J + 'menumelding.js');
const F = await import(J + 'fouttoast.js');
const K = await import(J + 'keycap.js');
const Q = await import(J + 'quitconfirmui.js');

const VREEMD = [undefined, null, NaN, Infinity, -Infinity, -1, 0, '', 'constructor', 'toString', '__proto__', {}, [], true];

// 1 tot 3: een kapotte instelling ('constructor') geeft nooit een functie, een worp of NaN
ok(A.textScale('constructor') === 1 && A.textScale('toString') === 1 && A.textScale('groot') === 1.15, 'textScale: een prototypenaam is gewoon "normaal"');
ok(JSON.stringify(A.simulate('#ff0000', 'constructor')) === '[255,0,0]', 'simulate: een prototypenaam laat de kleur staan (geen worp)');
ok(N.noticeDuration({ tekst: 'Kort.', klas: 'constructor' }) === N.DURATION_CLASSES.kort, 'noticeDuration: een prototypenaam als klas telt niet');
ok(K.labelToken('constructor') === null && K.keyLabelGlyph('constructor') === null && K.keyLabelHtml('constructor').includes('constructor'), 'keycap: een label "constructor" blijft een woord');

// 4: korte hex (#fff) is wit, niet zwart (contrast klopt voor beide schrijfwijzen)
ok(JSON.stringify(A.toRgb('#fff')) === '[255,255,255]' && JSON.stringify(A.toRgb('0a0')) === '[0,170,0]', 'toRgb: korte hex wordt verdubbeld');
ok(Math.abs(A.contrastRatio('#fff', '#000') - 21) < 0.01 && A.contrastRatio('#fff', '#ffffff') === 1, 'contrastRatio: #fff tegen #000 is 21');
ok(Math.abs(H.contrast('#fff', '#000') - 21) < 0.01, 'hudlook.contrast: #fff tegen #000 is 21');

// 5 tot 8: getallen die kapot binnenkomen geven nooit NaN in de HUD-maten
for (const w of VREEMD) {
  const s = H.uiScaleFor(w, w, w, w);
  ok(Number.isFinite(s) && s >= 0.5 && s <= 4, `uiScaleFor(${String(w)}) is een eindig getal binnen 0,5 en 4`);
  ok(Number.isFinite(H.hudEdge(w, w, w)), `hudEdge(${String(w)}) is eindig`);
  ok(Number.isFinite(H.textPx(w, w)) && H.textPx(w, w) >= H.READABLE_MIN, `textPx(${String(w)}) blijft minstens 13 px`);
}
ok(H.uiScaleFor(0, 0) === H.uiScaleFor(1440, 900) && H.hudEdge(0, 0) === H.EDGE_MIN, 'een venster van 0 px (verborgen of nog niet gemeten) valt terug op het ontwerp');
for (const [w, h, u] of [[1280, 720, 0.8], [1280, 720, 2], [1920, 1080, 1], [3840, 2160, 1], [3840, 2160, 2]]) {
  const s = H.uiScaleFor(w, h, u);
  ok(s >= 0.8 && s <= 4 && H.textPx(13, s) >= 13, `${w}x${h} bij ui-schaal ${u}: schaal ${s} blijft leesbaar (tekst nooit onder 13 px)`);
}

// 9 en 10: een niet-eindige duur of rest blijft ongewijzigd (geen NaN in de timer)
ok(Number.isNaN(N.queueDuration(NaN, 3)) && N.queueDuration(6, 3) === 4 && N.queueDuration(Infinity, 5) === Infinity, 'queueDuration: NaN en oneindig blijven zoals ze zijn, 6 s wordt 4 s bij een rij');
ok(Number.isNaN(N.shortening(NaN, 10, 2)) && N.shortening(8, 10, 2) === 1 && N.shortening(8, 1, 2) === 8, 'shortening: NaN blijft NaN, een lange melding wordt ingekort pas na 3 s');

// 11 tot 13: de prestatiewachtrij hangt nooit en toont nooit "NaN"
ok(U.wachtrijPlan(Infinity).length === 0 && U.wachtrijPlan(NaN).length === 0 && U.wachtrijPlan(7).length === 4, 'wachtrijPlan: oneindig en NaN zijn leeg, 7 prestaties zijn drie kaarten plus één samenvatting');
ok(!/NaN/.test(JSON.stringify(U.samenvattingTekst(NaN))) && U.samenvattingTekst(NaN).titel === 'Nog 1 prestatie', 'samenvattingTekst: nooit "Nog NaN prestaties"');
ok(U.queueStep({ index: NaN, resterend: NaN }).variant === 'vol', 'queueStep: NaN begint gewoon met een volle kaart');

// 14 en 15: geldbedrag en flitspoort
ok(B.formatBeloning(-0.4) === '' && B.formatBeloning(0.2) === '' && B.formatBeloning(-1250) === '− € 1.250' && B.formatBeloning(1250) === '€ 1.250', 'formatBeloning: onder een halve euro is leeg, niet "− € 0"');
ok(B.toelatenFlits(undefined, 1000) === true && B.toelatenFlits([990, 995, 999], 1000) === false, 'toelatenFlits: een ontbrekende historie is leeg');

// 3 (vervolg): de menumelding blijft zo lang als de tekst vraagt
{
  const kort = M.voegToe([], 'Niet nu.', 0)[0];
  const lang = M.voegToe([], 'Je kunt hier niet slapen zolang er een missie loopt; rond die eerst af of sla de missie over in het menu Missies.', 0)[0];
  ok(kort.duur === N.DURATION_CLASSES.kort && kort.tot === 4, 'menumelding: een korte tekst blijft 4 s');
  ok(lang.duur > kort.duur && lang.duur <= N.NOTICE_MAX_S && lang.tot === lang.duur, `menumelding: een lange tekst (${lang.duur} s) blijft langer dan een korte`);
  ok([4, 6, 9, 10].includes(lang.duur), 'menumelding: de duur is altijd een van de vier gedeelde klassen');
}

// 16: de foutmelding heeft altijd een leesbare regel
ok(F.frameErrorModel(null).details === 'Onbekende fout' && F.frameErrorModel('').details === 'Onbekende fout' && F.frameErrorModel(new Error('kapot')).details === 'kapot', 'frameErrorModel: null en een lege tekst worden "Onbekende fout"');

// 17 en 18: de afsluitvraag heeft nooit een dode Enter en sluit één keer
{
  const key = (k) => { const e = { key: k, preventDefault() {}, stopPropagation() {} }; [...listeners].forEach((f) => f(e)); };
  let ja = 0, nee = 0;
  Q.askQuitConfirm({ onYes: () => ja++, onNo: () => nee++ });
  doc.activeElement = null; // de speler klikte naast de kaart: geen knop heeft focus
  key('Enter');
  ok(nee === 1 && ja === 0 && !Q.isQuitConfirmOpen(), 'Enter zonder focus kiest de veilige knop Annuleren (was: niets)');
  Q.askQuitConfirm({ onYes: () => ja++, onNo: () => nee++ });
  const klik = klikken[klikken.length - 1];
  klik({ target: knoppen[1] }); klik({ target: knoppen[1] });
  ok(ja === 1 && nee === 1, 'een dubbele klik op Ja sluit één keer af');
}

// 19: de bewegingstokens van het hele spel blijven binnen 250 ms (DS3), ook de oude --dur-*
{
  const idx = lees('game/index.html');
  const reg = idx.match(/:root \{[^}]*--dur-fast: (\d+)ms; --dur-base: (\d+)ms; --dur-slow: (\d+)ms; --dur-bar: (\d+)ms;/);
  ok(!!reg && reg.slice(1).every((x) => Number(x) <= 250), 'index.html: --dur-fast/base/slow/bar zijn hooguit 250 ms');
  ok(/html\.reduce-motion \{ --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; --dur-bar: 0ms; \}/.test(idx), 'index.html: Beweging beperken zet ze op 0');
}

// 20: de hele ratel voor beweging (geen onbedoelde lange animatie in de HUD-opmaak)
{
  const css = lees('game/js/hud_panel.css');
  const regel = css.split('\n').find((l) => l.includes('animation: hud-ontdek'));
  ok(!!regel && /ds3-dwell/.test(regel), 'hud_panel.css: de minimaprand voor een nieuwe streek is als verblijf (2,2 s) gemarkeerd');
}

// 21: simulatie over lange speelduur (2 uur spel): een meldingenrij met willekeurige aanvoer loopt nooit vast en overlapt nooit
{
  let seed = 22;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const MAX = 1, DT = 0.25;
  let zichtbaar = [], wachtend = [], id = 0, getoond = 0, aangeboden = 0, maxTegelijk = 0, langste = 0, klasFout = 0;
  for (let t = 0; t < 7200; t += DT) {
    if (rnd() < 0.18) { // een nieuwe melding, soms kritiek-loos, soms met een prioriteit
      const tekst = 'x'.repeat(Math.floor(rnd() * 200));
      wachtend.push({ id: ++id, prio: Math.floor(rnd() * 3), at: t, tekst, duur: N.noticeDuration({ tekst, klas: rnd() < 0.3 ? 'lang' : null }) });
      aangeboden++;
    }
    const plan = N.queuePlan({ zichtbaar, wachtend, max: MAX });
    for (const i of plan.toon) {
      const m = wachtend.find((w) => w.id === i);
      wachtend = wachtend.filter((w) => w.id !== i);
      const d = N.queueDuration(m.duur, wachtend.length);
      if (![4, 6, 9, 10].includes(d)) klasFout++;
      zichtbaar.push({ id: i, timer: N.makeTimer(d), t0: t });
      getoond++;
    }
    for (const z of zichtbaar) {
      z.timer.tik(DT, {});
      const rest = N.shortening(z.timer.rest, t - z.t0, wachtend.length);
      if (rest < z.timer.rest) z.timer.ververs(rest);
    }
    zichtbaar = zichtbaar.filter((z) => !z.timer.klaar);
    maxTegelijk = Math.max(maxTegelijk, zichtbaar.length);
    langste = Math.max(langste, wachtend.length);
    wachtend = wachtend.filter((w) => t - w.at < 30); // een melding die te oud is vervalt (hudcards.js, 30 s)
  }
  ok(maxTegelijk <= MAX, 'simulatie: nooit meer dan één melding tegelijk in beeld (max ' + maxTegelijk + ')');
  ok(klasFout === 0, 'simulatie: elke duur is een van de vier gedeelde klassen');
  ok(getoond > 100 && getoond <= aangeboden && wachtend.length < 400, 'simulatie: er wordt getoond (' + getoond + ' van ' + aangeboden + ') en de rij loopt niet vol (' + wachtend.length + ')');
}

console.log(`verfijn_ui_ds3_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
