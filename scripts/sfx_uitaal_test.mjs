// De nieuwe geluiden van docs/SFX-GAPS.md: de UI-geluidstaal (sfx/uibank.js, sfx/uitaal.js, sfx/ui.js), de wereld-foley
// (sfx/worldbank.js) en de lagen per streek (sfx/streekklank.js). Gedrag, geen bronregex:
//   - elk geluid rendert deterministisch (twee keer dezelfde samples), zonder NaN of Infinity, onder de piekgrens, met een eindige duur
//   - de varianten verschillen van elkaar en de lagen hebben geen uitschieter of stilte (de lus-overhang is gecontroleerd)
//   - ui.js met een nagemaakte kit: de juiste melding speelt het juiste geluid, de afkoeltijd houdt een stortvloed klein,
//     stil en pauze zwijgen, en het aantal gelijktijdige stemmen blijft onder de grens in een willekeurig scenario
//   - de regels van de streeklagen (puur)
//   - elk geluid staat in docs/SFX-GAPS.md als gebouwd
//   node scripts/sfx_uitaal_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ui.js leest de DOM voor het pauzemenu en de opslagbalk: een lege stub is genoeg
globalThis.document = { querySelector: () => null, querySelectorAll: () => [], body: { classList: { contains: () => true } } };

const { renderData, variantsOf, bufferNames } = await import('../game/js/sfx/dsp.js');
const { FX_INFO } = await import('../game/js/sfx/fxbank.js');
const { UI_FX, UI_SOUNDS } = await import('../game/js/sfx/uibank.js');
const { WORLD_FX, BED_FX } = await import('../game/js/sfx/worldbank.js');
const { toastGeluid, magKlinken, wordtGesmoord, kiesVariant, toonSpreiding, UI_COOLDOWN, UI_NIVEAU, MELDING_RANG } = await import('../game/js/sfx/uitaal.js');
const { streekNiveaus, LAAG_NIVEAU, STREEK_LAGEN } = await import('../game/js/sfx/streekklank.js');
const { categoryLevel } = await import('../game/js/sfx/mixplan.js');
const { initUiSfx, uiWorldInit, updateUiSfx, uiDomEvent } = await import('../game/js/sfx/ui.js');
const { setMapOpenState } = await import('../game/js/pausestate.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };
const SR = 44100;

// --- 1. renderen: deterministisch, eindig, onder de piekgrens ----------------------------------------------------
const ALLE = { ...UI_FX, ...WORLD_FX };
const MAX_DUUR = { ui: 2.2, water: 1.6, winkel: 1.2 };
const stats = (chs) => {
  let peak = 0, e = 0, c = 0, bad = 0;
  for (const d of chs) for (let i = 0; i < d.length; i++) { const x = d[i]; if (!Number.isFinite(x)) { bad++; continue; } peak = Math.max(peak, Math.abs(x)); e += x * x; c++; }
  return { peak, rms: Math.sqrt(e / Math.max(1, c)), bad };
};
for (const [name, d] of Object.entries(ALLE)) {
  const a = renderData(name, SR), b = renderData(name, SR);
  ok(!!a && !!b, `${name}: rendert`);
  if (!a || !b) continue;
  let gelijk = a.chs.length === b.chs.length;
  for (let c = 0; c < a.chs.length && gelijk; c++) for (let i = 0; i < a.chs[c].length; i++) if (a.chs[c][i] !== b.chs[c][i]) { gelijk = false; break; }
  ok(gelijk, `${name}: twee keer renderen geeft dezelfde samples (zaad)`);
  const s = stats(a.chs);
  ok(s.bad === 0, `${name}: geen NaN of Infinity`, String(s.bad));
  ok(s.peak <= 0.92 && s.peak >= 0.5, `${name}: piek onder de grens en niet te zacht`, s.peak.toFixed(3));
  ok(s.rms > 0.02, `${name}: niet stil`, s.rms.toFixed(4));
  const dur = a.chs[0].length / a.sr;
  ok(Number.isFinite(dur) && dur > 0.1 && dur <= (MAX_DUUR[d.info.cat] || 1.6), `${name}: eindige, korte duur`, dur.toFixed(2));
  const lvl = d.info.gain * categoryLevel(d.info.cat);
  ok(lvl > 0.1 && lvl <= 0.6, `${name}: speelniveau onder het mixplan (gain x categorie)`, lvl.toFixed(2));
  ok(bufferNames().includes(name) && FX_INFO[name] === d.info, `${name}: staat in de bank en in FX_INFO`);
  // het begin en het einde mogen niet knallen: de eerste en laatste samples zijn weggefadet
  ok(Math.abs(a.chs[0][0]) < 0.05 && Math.abs(a.chs[0][a.chs[0].length - 1]) < 0.05, `${name}: geen klik aan de randen`);
}

// varianten: elk geluid met meer dan een naam verschilt echt per naam
for (const base of new Set(Object.keys(ALLE).filter((k) => /_\d$/.test(k)).map((k) => k.replace(/_\d$/, '')))) {
  const namen = variantsOf(base);
  ok(namen.length >= 2 && namen.length <= 6, `${base}: ${namen.length} varianten (2 tot 6)`);
  const a = renderData(namen[0], SR).chs[0];
  for (const nm of namen.slice(1)) {
    const b = renderData(nm, SR).chs[0];
    let v = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) v += Math.abs(a[i] - b[i]);
    ok(v / a.length > 0.005, `${nm} verschilt van ${namen[0]}`, (v / a.length).toFixed(4));
  }
}

// de lagen: geen NaN, geen uitschieter, geen stilte (de lus-overhang liep eens uit de bocht: exp van een negatieve afstand)
for (const [name, d] of Object.entries(BED_FX)) {
  const a = renderData(name, SR), b = renderData(name, SR);
  ok(!!a && a.chs.length === 2, `${name}: stereo laag`);
  const s = stats(a.chs);
  ok(s.bad === 0 && s.peak <= 0.92, `${name}: eindig en onder de piek`, s.peak.toFixed(3));
  ok(a.chs[0].every((x, i) => x === b.chs[0][i]), `${name}: deterministisch`);
  const w = Math.floor(a.sr * 1), rmss = [];
  for (let s0 = 0; s0 + w <= a.chs[0].length; s0 += w) { let e = 0; for (let i = s0; i < s0 + w; i++) e += a.chs[0][i] ** 2; rmss.push(Math.sqrt(e / w)); }
  const mx = Math.max(...rmss), mn = Math.min(...rmss);
  ok(mn > 0.02 && mx / mn < 4, `${name}: gelijkmatig over de hele lus (geen stilte of uitschieter)`, rmss.map((x) => x.toFixed(3)).join(' '));
  ok(a.chs[0].length / a.sr >= 7.5, `${name}: lang genoeg om niet op te vallen als herhaling`);
  const info = BED_FX[name];
  ok(info.opts.loop > 0 && info.opts.rate === 22050, `${name}: naadloze lus op 22,05 kHz`);
}

// --- 2. de regels van de UI-taal ----------------------------------------------------------------------------------
const msg = (text, kind, kicker) => ({ text, kind, kicker });
ok(toastGeluid(msg('Te weinig geld: ballen slaan kost EUR 8')) === 'ui_weiger', 'te weinig geld weigert');
ok(toastGeluid(msg('Geen geld voor een hapje bij de kroeg')) === 'ui_weiger', 'geen geld weigert');
ok(toastGeluid(msg('Boer: Tinus niveau 2', 'prestatie', 'Loopbaan')) === 'ui_loopbaan', 'loopbaantrap');
ok(toastGeluid(msg('Je kijkt uit over Hogeland', 'prestatie', 'Uitkijkpunt')) === 'ui_uitkijk', 'uitkijkpunt');
ok(toastGeluid(msg('Nieuwe streek: Hunsingo.', 'prestatie', 'Verkend')) === 'ui_ontdek', 'nieuwe streek');
ok(toastGeluid(msg('Visboek: Snoek, een nieuwe soort', 'prestatie', 'Visboek')) === 'ui_ontdek', 'nieuwe vissoort');
ok(toastGeluid(msg('Nu 3 van 12', 'tip', 'Verzamelen · dieren')) === 'ui_verzameld', 'verzamelen');
ok(toastGeluid(msg('Let op de politie', 'politie')) === 'ui_gevaar' && toastGeluid(msg('Dun ijs', 'gevaar')) === 'ui_gevaar', 'politie en gevaar');
ok(toastGeluid(msg('Een tip', 'tip')) === 'ui_toast' && toastGeluid(msg('Missie', 'missie')) === 'ui_toast', 'tip en missie krijgen de zachte toast');
ok(toastGeluid(msg('3')) === null && toastGeluid(msg('Hengelen klaar', 'prestatie', 'Hengelen')) === null && toastGeluid(null) === null, 'tellers, prestaties en niets blijven stil');
ok(UI_SOUNDS.every((s) => UI_COOLDOWN[s] > 0 && UI_NIVEAU[s] > 0), 'elk UI-geluid heeft een afkoeltijd en een niveau');
const last = new Map();
ok(magKlinken(last, 'ui_toast', 10) && !magKlinken(last, 'ui_toast', 10.5) && magKlinken(last, 'ui_toast', 11.3), 'afkoeltijd: net gespeeld mag niet, daarna weer wel');
{
  const l = new Map([['ui_loopbaan', 10]]);
  ok(wordtGesmoord(l, 'ui_toast', 10.2) && wordtGesmoord(l, 'ui_ontdek', 10.2) && !wordtGesmoord(l, 'ui_toast', 10.6) && !wordtGesmoord(l, 'ui_loopbaan', 10.2), 'een trap omhoog smoort lichtere meldingen een halve seconde');
  const t = new Map([['ui_toast', 10]]);
  ok(!wordtGesmoord(t, 'ui_loopbaan', 10.1) && !wordtGesmoord(t, 'ui_tab', 10.1) && !wordtGesmoord(new Map([['ui_loopbaan', 10]]), 'ui_tab', 10.1), 'een zwaarder geluid en handelingen (tab, kaart, uitgave) worden niet gesmoord');
  ok(Object.keys(MELDING_RANG).every((k) => UI_SOUNDS.includes(k)), 'elke rang hoort bij een bestaand UI-geluid');
}
ok(kiesVariant(['a', 'b', 'c'], 0.1, 'a') !== 'a' && kiesVariant(['a', 'b', 'c'], 0.99) === 'c' && kiesVariant(['a'], 0.5, 'a') === 'a' && kiesVariant([], 0.5) === null, 'variantkeuze vermijdt de vorige');
ok(toonSpreiding(0) >= 0.97 - 1e-9 && toonSpreiding(1) <= 1.03 + 1e-9 && toonSpreiding(0.5) === 1, 'toonspreiding binnen 3 procent');

// --- 3. ui.js met een nagemaakte kit ------------------------------------------------------------------------------
function maakKit() {
  const kit = {
    t: 0, plays: [], tones: 0, mutedNow: false,
    ctx: { get currentTime() { return kit.t; } },
    bank: { warm() {} },
    buses: { ui: { n: 'ui' }, sting: { n: 'sting' } },
    muted: () => kit.mutedNow,
    tone() { kit.tones++; },
    noise() { kit.tones++; },
    buf(name, o) { kit.plays.push({ name, t: kit.t, gain: o.gain, rate: o.rate, bus: o.bus.n, delay: o.delay || 0 }); return {}; },
  };
  return kit;
}
const wereld = (extra = {}) => ({ money: 500, wanted: 0, messages: [], vehicles: [], phoneHistory: [], paused: false, ...extra });
const melding = (w, text, kind, kicker) => w.messages.push({ text, kind: kind || null, kicker: kicker || null, key: text, until: 99 });
const uiPlays = (k) => k.plays.filter((p) => /^ui_/.test(p.name));
const duur = (name) => { const r = renderData(name, SR); return r.chs[0].length / r.sr; };

{
  const k = maakKit(), w = wereld();
  initUiSfx(k); uiWorldInit(w);
  melding(w, 'Een tip', 'tip'); updateUiSfx(0.016, w);
  ok(uiPlays(k).length === 1 && /^ui_toast_\d$/.test(uiPlays(k)[0].name), 'een tip speelt een toast', JSON.stringify(uiPlays(k).map((p) => p.name)));
  const p = uiPlays(k)[0];
  ok(p.bus === 'ui' && p.gain > 0 && p.gain < 0.5 && p.rate >= 0.97 && p.rate <= 1.03, 'op de UI-bus, zacht, met een kleine toonspreiding', JSON.stringify(p));
  // een stortvloed in een beeld: een geluid per soort, niet dertig
  for (let i = 0; i < 30; i++) melding(w, 'tip ' + i, 'tip');
  k.t = 5; updateUiSfx(0.016, w);
  ok(uiPlays(k).filter((x) => x.t === 5).length === 1, 'dertig meldingen in een beeld geven een toast');
  melding(w, 'Te weinig geld: dit kost EUR 5'); melding(w, 'Boer: Tinus niveau 2', 'prestatie', 'Loopbaan'); melding(w, 'Je kijkt uit', 'prestatie', 'Uitkijkpunt');
  k.t = 10; updateUiSfx(0.016, w);
  const namen = uiPlays(k).filter((x) => x.t === 10).map((x) => x.name.replace(/_\d$/, '')).sort();
  ok(namen.join() === 'ui_loopbaan,ui_weiger', 'weigeren en loopbaan klinken; de uitkijk in hetzelfde beeld wordt door de trap gesmoord', namen.join());
  k.t = 12; melding(w, 'Je kijkt uit', 'prestatie', 'Uitkijkpunt'); updateUiSfx(0.016, w);
  ok(uiPlays(k).some((x) => x.t === 12 && /^ui_uitkijk/.test(x.name)), 'even later klinkt de uitkijk wel');
  // de bestaande reacties gaan voor: een kassa-melding krijgt geen toast erbovenop
  const k2 = maakKit(), w2 = wereld(); initUiSfx(k2); uiWorldInit(w2);
  melding(w2, '+ €40', 'geld'); updateUiSfx(0.016, w2);
  ok(k2.plays.some((x) => x.name === 'cashreg') && uiPlays(k2).length === 0, 'geld erbij blijft de kassa');
}
{
  const k = maakKit(), w = wereld();
  initUiSfx(k); uiWorldInit(w);
  w.money = 460; k.t = 1; updateUiSfx(0.016, w);
  ok(uiPlays(k).length === 1 && /^ui_uitgave/.test(uiPlays(k)[0].name), 'geld dat daalt klinkt als een uitgave');
  w.money = 459; k.t = 1.2; updateUiSfx(0.016, w);
  ok(uiPlays(k).length === 1, 'binnen de afkoeltijd geen tweede uitgave');
  w.paused = true; w.money = 300; k.t = 9; updateUiSfx(0.016, w);
  ok(uiPlays(k).length === 1, 'in de pauze geen uitgavegeluid');
  w.paused = false; w.pendingRespawn = {}; w.money = 200; k.t = 12; updateUiSfx(0.016, w);
  ok(uiPlays(k).length === 1, 'bij een respawn geen uitgavegeluid');
  w.pendingRespawn = null; w.money = 100; k.mutedNow = true; k.t = 20; updateUiSfx(0.016, w);
  ok(uiPlays(k).length === 1, 'stil is stil');
  k.mutedNow = false;
  setMapOpenState(true); k.t = 30; updateUiSfx(0.016, w);
  const open = uiPlays(k).filter((x) => x.t === 30);
  ok(open.length === 1 && open[0].name === 'ui_kaart_open' && open[0].delay > 0, 'de kaart open klinkt na de telefoon-opening');
  setMapOpenState(false); k.t = 35; updateUiSfx(0.016, w);
  ok(uiPlays(k).some((x) => x.t === 35 && x.name === 'ui_kaart_dicht'), 'de kaart dicht klinkt');
}
{
  // een tab van een menu krijgt zijn eigen tikje, een gewone knop de bevestiging
  const k = maakKit(); const w = wereld(); initUiSfx(k); uiWorldInit(w);
  const doel = (...sels) => ({ closest: (sel) => sel.split(',').map((q) => q.trim()).some((q) => sels.includes(q)) });
  k.t = 1; uiDomEvent('visible', {});
  k.t = 2; uiDomEvent('click', { target: doel('#pause-menu', '[data-tab]', 'button'), detail: 1 });
  ok(uiPlays(k).length === 1 && /^ui_tab_\d$/.test(uiPlays(k)[0].name), 'een tab klinkt als ui_tab', JSON.stringify(uiPlays(k).map((p) => p.name)));
  const tonenVoor = k.tones;
  k.t = 4; uiDomEvent('click', { target: doel('#pause-menu', 'button'), detail: 1 });
  ok(uiPlays(k).length === 1 && k.tones > tonenVoor, 'een gewone knop blijft de bevestigingsklank');
}

// een willekeurig scenario van twee minuten: hoeveel stemmen tegelijk en hoeveel geluiden per seconde
{
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const k = maakKit(), w = wereld({ money: 1000 });
  initUiSfx(k); uiWorldInit(w);
  const SOORT = [['Een tip', 'tip'], ['Missie nieuw', 'missie'], ['Te weinig geld voor dit', null], ['Boer: x niveau 2', 'prestatie', 'Loopbaan'], ['Je kijkt uit', 'prestatie', 'Uitkijkpunt'], ['Nieuwe streek: x', 'prestatie', 'Verkend'], ['Let op', 'politie'], ['Dun ijs', 'gevaar'], ['Nu 3 van 9', 'tip', 'Verzamelen']];
  let kaart = false, i = 0;
  for (let t = 0; t < 120; t += 0.1, i++) {
    k.t = t;
    if (rnd() < 0.45) { const s = SOORT[Math.floor(rnd() * SOORT.length)]; melding(w, `${s[0]} ${i}`, s[1], s[2]); }
    if (rnd() < 0.2) w.money -= 5 + Math.floor(rnd() * 30);
    if (rnd() < 0.05) { kaart = !kaart; setMapOpenState(kaart); }
    if (w.money < 50) w.money += 2000;
    updateUiSfx(0.1, w);
  }
  setMapOpenState(false);
  const lijst = uiPlays(k).map((p) => ({ ...p, eind: p.t + p.delay + duur(p.name) }));
  let piek = 0;
  for (const p of lijst) piek = Math.max(piek, lijst.filter((q) => q.t + q.delay <= p.t + p.delay && q.eind > p.t + p.delay).length);
  ok(lijst.length > 40, 'het scenario speelt genoeg geluiden', String(lijst.length));
  ok(piek <= 6, `hooguit 6 UI-stemmen tegelijk bij een zeer druk scenario, een zesde van de ruimte voor must-play (nu ${piek})`, String(piek));
  let perSeconde = 0;
  for (let s = 0; s < 120; s++) perSeconde = Math.max(perSeconde, lijst.filter((q) => q.t >= s && q.t < s + 1).length);
  ok(perSeconde <= 6, `hooguit 6 UI-geluiden per seconde (nu ${perSeconde})`, String(perSeconde));
  ok(lijst.every((p) => Number.isFinite(p.gain) && p.gain > 0 && p.gain < 0.6), 'elk speelniveau is eindig en klein');
  ok(new Set(lijst.map((p) => p.name)).size >= 10, 'het scenario raakt veel verschillende varianten');
}

// --- 4. de lagen per streek (puur) ---------------------------------------------------------------------------------
const basis = { sea: false, coast: 0, streek: null, rural: 0, open: 0, industrial: 0, waterD: 999, density: 0.5, closed: false, night: 0 };
const nv = (o) => streekNiveaus({ ...basis, ...o });
ok(nv({ sea: true }).kust === LAAG_NIVEAU.kust && nv({}).kust === 0, 'de kust klinkt op zee en zwijgt in het binnenland');
ok(nv({ coast: 1, rural: 0.6, streek: 'hogeland' }).kust > 0.1 && nv({ coast: 1, rural: 0.6, streek: 'hogeland' }).polder < nv({ rural: 0.6, open: 0.8, streek: 'hogeland' }).polder, 'aan de dijk klinkt de zee en wijkt de polder');
ok(nv({ rural: 1, open: 1, streek: 'hogeland' }).polder > 0.09 && nv({ density: 0.9 }).polder === 0, 'de polder klinkt in open land, niet in de stad');
ok(nv({ rural: 1, waterD: 5, streek: 'lauwerskust' }).riet > nv({ rural: 1, waterD: 5, streek: 'oldambt' }).riet && nv({ rural: 1, waterD: 80 }).riet === 0, 'riet langs het water, het meest aan de Lauwerskust');
ok(nv({ industrial: 1, density: 0.2 }).industrie > 0.05 && nv({ industrial: 1, rural: 1 }).industrie < nv({ industrial: 1 }).industrie && nv({}).industrie === 0, 'industrie bij loodsen, niet in het open land');
ok(nv({ sea: true, closed: true }).kust < nv({ sea: true }).kust * 0.5, 'in een afgesloten voertuig zachter');
ok(nv({ rural: 1, open: 1, streek: 'hogeland', night: 1 }).polder < nv({ rural: 1, open: 1, streek: 'hogeland' }).polder, 's nachts is de polder zachter');
const uit = {};
ok(streekNiveaus({ ...basis, sea: true }, uit) === uit && uit.kust > 0, 'streekNiveaus schrijft in het meegegeven object (geen allocatie per beeld)');
for (const lagen of [nv({ sea: true, rural: 1, industrial: 1, waterD: 0, streek: 'lauwerskust' }), nv({ rural: 1, open: 1, waterD: 0 })]) {
  ok(STREEK_LAGEN.every((l) => lagen[l] >= 0 && lagen[l] <= LAAG_NIVEAU[l] + 1e-9), 'elk niveau tussen 0 en het laagmaximum');
}
ok(STREEK_LAGEN.every((l) => bufferNames().includes(`bed_${l}`)), 'elke streeklaag staat in de bank');

// --- 5. de dekkingstabel: elk nieuw geluid staat als gebouwd in docs/SFX-GAPS.md --------------------------------------
const doc = fs.readFileSync(path.join(root, 'docs', 'SFX-GAPS.md'), 'utf8');
const nieuw = new Set([...Object.keys(ALLE).map((k) => k.replace(/_\d$/, '')), ...Object.keys(BED_FX)]);
for (const naam of nieuw) ok(doc.includes('`' + naam + '`'), `SFX-GAPS.md noemt ${naam}`);
ok(/Gebouwd/.test(doc) && /Nog niet/.test(doc), 'SFX-GAPS.md scheidt gebouwd van nog niet gebouwd');

if (fails) { console.log(`${fails} van ${n} mislukt`); process.exit(1); }
console.log(`sfx_uitaal_test: ${n}/${n} ok`);
