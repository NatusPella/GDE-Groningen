// De labels en de voortgangsstrook op de grote kaart (#463): in de binnenstad
// liepen de wijknamen, de gebiedsnamen en de namen van de bezienswaardigheden
// door elkaar en door de pins heen, en "0 van 5 · 0%" viel midden op de iconen.
//   node scripts/kaartlabels_test.mjs
//
// De botsingsregel en de strook staan in game/js/mapview.js. Dat bestand is een
// browsermodule (het haalt three van een CDN), dus de zuivere functies worden
// als bronblok uit het bestand gehaald en met new Function gedraaid, precies
// zoals garage_schade_test.mjs dat doet. Zo test dit bestand de echte regel en
// niet een kopie die kan afdwalen.
import fs from 'node:fs';
import assert from 'node:assert/strict';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + naam + (info ? ' :: ' + info : '')); } };

const bron = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
const haalFunctie = (src, naam) => {
  const start = src.indexOf(`function ${naam}(`);
  assert.ok(start >= 0, `${naam} staat in mapview.js`);
  let diep = 0, eind = -1;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') diep++;
    else if (src[i] === '}' && --diep === 0) { eind = i; break; }
  }
  assert.ok(eind > start, `${naam} heeft een sluitende accolade`);
  return src.slice(start, eind + 1);
};
const namen = ['collides', 'plaatsLabels', 'labelDoos', 'isVoortgangsregel', 'voortgangsStrook', 'pinWijktVoorStrook', 'pinDoos', 'pinSetKey'];
const L = new Function(`${namen.map((k) => haalFunctie(bron, k)).join('\n')}\nreturn { ${namen.join(', ')} };`)();
const { collides, plaatsLabels, labelDoos, isVoortgangsregel, voortgangsStrook, pinWijktVoorStrook, pinDoos, pinSetKey } = L;

// Een nep-canvas: measureText is breed genoeg voor de echte namen, het font
// bepaalt de hoogte van de doos (dat leest labelDoos uit ctx.font).
const nepCtx = (font = '600 13px sans-serif', perTeken = 7) => ({ font, measureText: (t) => ({ width: String(t).length * perTeken }) });
const raakt = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const doos = (x, y, w = 20, h = 20) => [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
const rooster = (x0, y0, x1, y1, stap, w = 20) => {
  const uit = [];
  for (let x = x0; x <= x1; x += stap) for (let y = y0; y <= y1; y += stap) uit.push(doos(x, y, w, w));
  return uit;
};
const PRIO = { missie: 0, wijk: 1, poi: 2 }; // dezelfde volgorde als LABEL_PRIO in mapview.js

// --- 1. het echt gemelde beeld: de binnenstad --------------------------------
// De namen en pins van de beeldronde (1920x1080): de wijknamen, de gebiedsnaam
// met zijn voortgang en de twee bezienswaardigheden lagen op een kluitje, met
// een rij pins ertussen. De labels komen nu uit dezelfde regel als op de kaart.
{
  const scherm = { w: 1920, h: 1080 };
  const pins = [];
  // de pins rond het centrum, op de plekken van de schermafbeelding
  for (const [x, y] of [
    [900, 380], [980, 372], [1000, 430], [960, 470], [910, 470], [880, 420],
    [840, 400], [1010, 520], [930, 540], [860, 520], [800, 470], [1040, 470],
    [880, 560], [960, 590], [1020, 560], [1120, 470], [1090, 400], [1000, 300],
  ]) pins.push(pinDoos(x, y, 3.2));

  const namen = [
    ['VAN STARKENBORGH', 940, 330, PRIO.wijk],
    ['ACADEMIEBUURT', 880, 405, PRIO.wijk],
    ['CENTRUM', 930, 435, PRIO.wijk],
    ['MARTINIKERK', 1010, 405, PRIO.poi],
    ['FORUM GRONINGEN', 1015, 432, PRIO.poi],
  ];
  const ctx = nepCtx();
  const kandidaten = namen.map(([tekst, x, y, prio], i) => ({ i, tekst, prio, box: labelDoos(ctx, tekst, x, y), ctx }));
  const geplaatst = plaatsLabels(kandidaten, pins);

  ok(geplaatst.length >= 2 && geplaatst.length < kandidaten.length, 'dichte pins: een deel van de namen valt weg, niet alles', geplaatst.map((k) => k.tekst).join(' | '));
  let paar = 0;
  for (let i = 0; i < geplaatst.length; i++) {
    for (let j = i + 1; j < geplaatst.length; j++) { paar++; ok(!raakt(geplaatst[i].box, geplaatst[j].box), 'geen twee labels over elkaar: ' + geplaatst[i].tekst + ' / ' + geplaatst[j].tekst); }
    for (const p of pins) ok(!raakt(geplaatst[i].box, p), 'label valt niet over een pin: ' + geplaatst[i].tekst);
  }
  ok(paar >= 1, 'de paren zijn echt vergeleken', paar);
  // de wijknaam wint van de bezienswaardigheid als ze op dezelfde plek staan
  ok(geplaatst.some((k) => k.prio === PRIO.wijk) && !geplaatst.some((k) => k.tekst === 'FORUM GRONINGEN' && raakt(k.box, geplaatst.find((q) => q.tekst === 'ACADEMIEBUURT')?.box || [1, 1, 0, 0])), 'wijk gaat voor bezienswaardigheid');
}

// --- 2. kunstmatige set dichte pins -----------------------------------------
// Een blok pins midden op het scherm en labels over het hele scherm: alles wat
// buiten het blok valt wordt geplaatst, niets valt over een pin of over elkaar.
{
  const pins = rooster(700, 350, 1220, 750, 30, 22);
  const ctx = nepCtx();
  const kandidaten = [];
  let i = 0;
  for (let x = 120; x <= 1800; x += 150) {
    for (let y = 90; y <= 1010; y += 42) kandidaten.push({ i: i++, tekst: 'WIJK ' + x + '-' + y, prio: i % 3 === 0 ? PRIO.poi : PRIO.wijk, box: labelDoos(ctx, 'WIJK ' + x + '-' + y, x, y) });
  }
  const geplaatst = plaatsLabels(kandidaten, pins);
  ok(geplaatst.length > kandidaten.length / 2, 'buiten het pinblok blijven de namen staan', geplaatst.length + '/' + kandidaten.length);
  let fout = 0;
  for (let a = 0; a < geplaatst.length; a++) {
    for (let b = a + 1; b < geplaatst.length; b++) if (raakt(geplaatst[a].box, geplaatst[b].box)) fout++;
    for (const p of pins) if (raakt(geplaatst[a].box, p)) fout++;
  }
  ok(fout === 0, 'geen enkel label raakt een ander label of een pin', fout);
  ok(geplaatst.every((k) => k.box[0] >= 0 && k.box[2] <= 1920 && k.box[1] >= 0 && k.box[3] <= 1080), 'de dozen blijven binnen het scherm');
}

// --- 3. voorrang: missie > wijk > POI ---------------------------------------
{
  const plek = [400, 200, 520, 216];
  const drie = [
    { tekst: 'DOEL', prio: PRIO.missie, box: plek },
    { tekst: 'WIJK', prio: PRIO.wijk, box: plek },
    { tekst: 'POI', prio: PRIO.poi, box: plek },
  ];
  const uit = plaatsLabels(drie, []);
  ok(uit.length === 1 && uit[0].tekst === 'DOEL', 'drie labels op dezelfde plek: de missie wint', uit.map((k) => k.tekst).join());
  const zonderMissie = plaatsLabels(drie.slice(1), []);
  ok(zonderMissie.length === 1 && zonderMissie[0].tekst === 'WIJK', 'zonder missie wint de wijk van de POI');
  const los = plaatsLabels([{ tekst: 'A', prio: PRIO.poi, box: [0, 0, 10, 10] }, { tekst: 'B', prio: PRIO.wijk, box: [200, 200, 210, 210] }], []);
  ok(los.length === 2, 'labels die elkaar niet raken blijven allebei staan');
}

// --- 4. de voortgangsstrook -------------------------------------------------
// "0 van 5 · 0%" hoort in een eigen strook: rechtsboven onder het kompas, dus
// nooit midden op de kaart tussen de pins.
{
  for (const [cw, ch] of [[1920, 1080], [1280, 720], [360, 800]]) {
    const box = voortgangsStrook(cw, ch, 150, 44);
    ok(box[2] === cw - 12 && box[0] >= 12, `strook ${cw}x${ch}: rechts uitgelijnd met een rand van 12`, box.join());
    ok(box[1] >= 56 && box[3] <= ch - 12, `strook ${cw}x${ch}: onder het kompas en binnen het scherm`, box.join());
    ok(box[2] - box[0] >= 120 && box[3] - box[1] >= 18, `strook ${cw}x${ch}: leesbaar formaat`, box.join());
    ok(voortgangsStrook(cw, ch, 9999, 44)[0] >= 12, `strook ${cw}x${ch}: nooit breder dan het scherm`);
  }
  // op een smal scherm (mobiel) past hij nog: 360 breed, de strook houdt 24 px vrij
  const smal = voortgangsStrook(360, 800, 400, 44);
  ok(smal[2] - smal[0] <= 336 && smal[0] >= 12, 'mobiel 360 breed: de strook blijft binnen het scherm', smal.join());

  const strook = voortgangsStrook(1920, 1080, 150, 44);
  const pins = rooster(0, 0, 1920, 1080, 40, 22);
  const onder = pins.filter((p) => raakt(p, strook));
  ok(onder.length > 0, 'er liggen pins onder de strook in dit rooster', onder.length);
  const GeenBelangrijk = onder.filter((p) => pinWijktVoorStrook((p[0] + p[2]) / 2, (p[1] + p[3]) / 2, 250, strook));
  ok(GeenBelangrijk.length === onder.length, 'elke gewone pin onder de strook wijkt');
  const missie = pinWijktVoorStrook((strook[0] + strook[2]) / 2, (strook[1] + strook[3]) / 2, 900, strook);
  ok(!missie && !pinWijktVoorStrook(300, 300, 900, strook), 'een missiepin houdt zijn plek, ook onder de strook');
  ok(!pinWijktVoorStrook(strook[0] - 40, strook[1] - 40, 250, strook) && !pinWijktVoorStrook(600, 600, 250, null), 'buiten de strook (of zonder strook) wijkt er niets');
  // de chip zelf valt dus nooit over een pin die blijft staan
  let over = 0;
  for (const p of pins) {
    const cx = (p[0] + p[2]) / 2, cy = (p[1] + p[3]) / 2;
    if (pinWijktVoorStrook(cx, cy, 250, strook)) continue;
    if (raakt(p, strook)) over++;
  }
  ok(over === 0, 'geen enkele pin die blijft staan valt onder de chip', over);
}

// --- 5. de bouwstenen -------------------------------------------------------
{
  ok(isVoortgangsregel('0 van 5 · 0%') && isVoortgangsregel('12 van 80 · 15%') && isVoortgangsregel('veroverd'), 'de voortgangsregels van een gebied gaan naar de strook');
  ok(!isVoortgangsregel('CENTRUM') && !isVoortgangsregel('WIJK') && !isVoortgangsregel('5 van 5'), 'een naam (of een halve regel) is geen voortgangsregel');

  const ctx = nepCtx('600 13px sans-serif', 10);
  const midden = labelDoos(ctx, 'ABCDE', 100, 200);
  ok(midden[0] === 75 && midden[2] === 125 && midden[1] === 193.5 && midden[3] === 206.5, 'labelDoos midden: 50 px breed en 13 px hoog om (100,200)', midden.join());
  const links = labelDoos(ctx, 'ABCDE', 100, 200, 'left');
  ok(links[0] === 100 && links[2] === 150, 'labelDoos links: de doos begint bij x', links.join());
  const groot = labelDoos(nepCtx('30px sans-serif', 10), 'ABCDE', 0, 0);
  ok(groot[3] - groot[1] === 30, 'labelDoos leest de hoogte uit het font', (groot[3] - groot[1]));

  const p1 = pinDoos(100, 100, 2.1), p2 = pinDoos(100, 100, 3.2);
  ok(p1[2] - p1[0] >= 18 && p2[2] - p2[0] > p1[2] - p1[0], 'een pin heeft een doos die met de zoom meegroeit', (p1[2] - p1[0]) + ' / ' + (p2[2] - p2[0]));
  ok(collides([p1], [(p2[0]), (p2[1]), (p2[2]), (p2[3])]), 'twee pins op dezelfde plek raken elkaar');

  // de marge: twee labels die elkaar net niet raken botsen wel met de marge
  const a = [0, 0, 100, 14], b = [100, 0, 200, 14];
  ok(!raakt(a, b) && plaatsLabels([{ tekst: 'A', prio: 1, box: a }, { tekst: 'B', prio: 2, box: b }], []).length === 1, 'de marge houdt twee labels uit elkaar die anders tegen elkaar plakken');
}

// --- 6. bronchecks: de kaart gebruikt de regel echt -------------------------
{
  ok(bron.includes('const LABEL_PRIO = { missie: 0, wijk: 1, poi: 2 }'), 'de volgorde missie > wijk > POI staat in de kaart');
  ok(bron.includes('const bezet = pinDozen()') && bron.includes('const vrij = (box) => !collides(boxes, box) && !collides(bezet, box)'), 'de vaste laag begint met de pins als bezette plekken');
  ok(bron.includes('bezet.push(pinDoos(sx, sy, sc))'), 'de vaste pictogrammen (horeca, flitspaal, bezienswaardigheid) bezetten hun plek');
  ok(bron.includes('plaatsLabels(kandidaten, [...bezet, ...boxes])'), 'de gebiedsnamen gaan door de botsingsregel');
  ok(bron.includes("if (!vrij(box)) continue; // geen naam over een pin of een andere naam heen (#463)"), 'de namen van bezienswaardigheden vallen niet meer ongecontroleerd over de kaart');
  ok(!bron.includes("drawLabel(ctx, l.name, sx + 6 + 5 * sc, sy + 1, INK.paper, 'left');\n"), 'de oude onbeveiligde regel voor de bezienswaardigheid is weg');
  ok(bron.includes('drawStreetNames(ctx, boxes, bezet)'), 'straatnamen wijken ook voor pins');
  ok(bron.includes('isVoortgangsregel(it.tekst)') && bron.includes('tekenVoortgangsStrook(ctx, strookRegels, state.strook)'), 'de gebiedsvoortgang gaat naar de strook');
  // #759: de set pins (soort en naam) bepaalt een herschil van de vaste laag, niet de
  // positie: in Samen spelen bewegen medespelers en politie elke frame achter de kaart.
  const setA = [{ kind: 'partner', name: 'Tammo', x: 1, y: 2 }, { kind: 'politie', name: 'Politie', x: 9, y: 9 }];
  ok(pinSetKey(setA) === pinSetKey([{ ...setA[0], x: 40, y: -50 }, { ...setA[1], x: 0, y: 0 }]), '#759: dezelfde pins op andere plekken geven dezelfde sleutel (geen herschil per beweging)');
  ok(pinSetKey(setA) !== pinSetKey([...setA, { kind: 'waypoint', name: 'Controlepunt' }]), '#759: een pin erbij vraagt wel een herschil');
  ok(pinSetKey([]) === '' && pinSetKey(null) === '', 'zonder pins is de sleutel leeg');
  ok(bron.includes('state.pins = geplaatst.map((q) => [q.x, q.y])') && bron.includes('state.pinsSleutel = pinSetKey(geplaatst)'), 'de kaart onthoudt de pins en schilt opnieuw als de set verandert');
  ok(bron.includes('if (state.pinsGebruikt !== state.pinsSleutel) { state.dirty = true; state.pinsDirtyAt = t * 1000; }') && bron.includes('PIN_RECOMPOSE_MS'), 'bewegende pins vragen hooguit een begrensde herschil (#759)');
  ok(!bron.includes('state.pinsSleutel = geplaatst.map((q) => q.x.toFixed(1)'), '#759: de positie van een pin maakt de vaste laag niet meer vuil');
  ok(bron.includes('pinWijktVoorStrook(q.sx, q.sy, mapPriority(q.kind), strook)'), 'een pin onder de strook wijkt (behalve de belangrijke)');
  ok(bron.includes('state.pinsGebruikt = state.pinsSleutel') && bron.includes("pins: [],\n    pinsSleutel: '',\n    pinsGebruikt: '',\n    strook: null,"), 'de staat kent de pins en de strook vanaf het begin');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
