// De HUD-kaartenstapel (duivenspot en museum): geen overlap, prioriteit, compact en automatisch wegvallen.
//   node scripts/hudstack_test.mjs
import assert from 'node:assert/strict';
import { stapel, overlap, stapelRuimte, duivenKaarten, STAPEL_TOP, STAPEL_GAP } from '../game/js/hudstack.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('kaarten staan onder elkaar zonder overlap, met een vaste tussenruimte', () => {
  const r = stapel([{ id: 'a', prio: 3, h: 84 }, { id: 'b', prio: 2, h: 150 }, { id: 'c', prio: 1, h: 54 }], { ruimte: 400 });
  assert.equal(r.zichtbaar.length, 3);
  assert.deepEqual(overlap(r.zichtbaar), []);
  assert.equal(r.zichtbaar[0].top, STAPEL_TOP);
  assert.equal(r.zichtbaar[1].top, STAPEL_TOP + 84 + STAPEL_GAP);
  assert.equal(r.onder, STAPEL_TOP + 84 + 150 + 54 + 2 * STAPEL_GAP);
});

t('een kaart die niet nodig is valt automatisch weg', () => {
  const r = stapel(duivenKaarten({ introActief: false, holdActief: false, hoogteActief: false }), { ruimte: 400 });
  assert.deepEqual(r.zichtbaar.map((k) => k.id), ['opdracht']);
  assert.deepEqual([...r.weg].sort(), ['hoogte', 'uitleg']);
});

t('bij krappe ruimte wordt de uitleg eerst compact, dan valt de laagste prio weg; de opdracht blijft altijd', () => {
  const alles = duivenKaarten({ introActief: true, holdActief: true, hoogteActief: true });
  const ruim = stapel(alles, { ruimte: 600 });
  assert.equal(ruim.zichtbaar.length, 3);
  const krap = stapel(alles, { ruimte: 110 + STAPEL_GAP + 74 });
  assert.ok(krap.zichtbaar.some((k) => k.id === 'uitleg' && k.compact), 'uitleg compact');
  assert.ok(!krap.zichtbaar.some((k) => k.id === 'hoogte'), 'hoogtekaart (laagste prio) valt weg');
  const nauw = stapel(alles, { ruimte: 60 });
  assert.deepEqual(nauw.zichtbaar.map((k) => k.id), ['opdracht'], 'alleen de belangrijkste blijft');
  for (const r of [ruim, krap, nauw]) assert.deepEqual(overlap(r.zichtbaar), [], 'nooit overlap');
});

t('de stapel blijft boven de pijl in het midden van het scherm', () => {
  for (const h of [600, 720, 900, 1080, 1440]) {
    const ruimte = stapelRuimte(h);
    const r = stapel(duivenKaarten({ introActief: true, holdActief: true, hoogteActief: true }), { ruimte });
    assert.ok(r.onder <= Math.max(STAPEL_TOP + ruimte, STAPEL_TOP + 110) + 1e-9, `hoogte ${h}: onder ${r.onder}`);
    assert.deepEqual(overlap(r.zichtbaar), []);
  }
  assert.ok(stapelRuimte(NaN) >= 110, 'kapotte invoer geeft een bruikbare ruimte');
});

t('kapotte kaarten worden overgeslagen', () => {
  const r = stapel([null, { id: 'x', h: NaN }, { id: 'ok', prio: 1, h: 40 }], { ruimte: 100 });
  assert.deepEqual(r.zichtbaar.map((k) => k.id), ['ok']);
  assert.deepEqual(stapel(null).zichtbaar, []);
});

t('de museumkaart: ondertitel en naamplaten blijven buiten de stapel (eigen lane)', () => {
  // de stapel levert alleen de bovenste kaarten; de ondertitel zit onderaan het scherm en de naamplaten zijn sprites in de wereld
  const r = stapel(duivenKaarten({ introActief: true, holdActief: true, hoogteActief: true }), { ruimte: stapelRuimte(720) });
  assert.ok(r.onder < 720 * 0.5, `de stapel eindigt boven het midden (${r.onder} < 360)`);
});

// --- vaste zones (#1053, #1058): geen overlap bij 1280x720 en 1920x1080 ---------------------------------------------------------
import fs from 'node:fs';
import { uiScaleFor } from '../game/js/hudlook.js';
import { duivenZones, duivenMaten, zoneOverlap, pijlPlek, plaatSelectie, LINKS_RAND, LINKS_KAART_TOP, LINKS_KAART_BREED, HINTS_LINKS } from '../game/js/hudstack.js';

const VENSTERS = [[1280, 720], [1920, 1080], [1366, 768], [2560, 1440]];
const hudPx = (w, h, user = 1) => { const ui = uiScaleFor(w, h, user, false); return [w / ui, h / ui]; };

t('de zones van de duivenmodus raken elkaar nooit (1280x720, 1920x1080 en de tussenmaten)', () => {
  for (const [w, h] of VENSTERS) {
    const [vw, vh] = hudPx(w, h);
    const ruimte = stapelRuimte(vh);
    const s = stapel(duivenKaarten({ introActief: false, holdActief: true, hoogteActief: true }), { ruimte });
    const { zones } = duivenZones(vw, vh, s.onder);
    assert.deepEqual(zoneOverlap(zones), [], `${w}x${h}: ${JSON.stringify(zoneOverlap(zones))}`);
    for (const z of zones) assert.ok(z.x >= 0 && z.y >= 0 && z.x + z.w <= vw + 1e-9 && z.y + z.h <= vh + 1e-9, `${w}x${h}: ${z.id} ligt in beeld`);
  }
});

t('ook bij Grootte interface 1,2 tot 1,5 raken de zones elkaar niet (review 21-11: het HUD-vlak wordt dan smaller dan 1100 px)', () => {
  for (const [w, h] of VENSTERS) for (const user of [1.2, 1.25, 1.5]) {
    const [vw, vh] = hudPx(w, h, user);
    const ruimte = stapelRuimte(vh);
    const s = stapel(duivenKaarten({ introActief: false, holdActief: true, hoogteActief: true }), { ruimte });
    const { zones } = duivenZones(vw, vh, s.onder);
    assert.deepEqual(zoneOverlap(zones), [], `${w}x${h} x${user} (HUD ${Math.round(vw)}x${Math.round(vh)}): ${JSON.stringify(zoneOverlap(zones))}`);
    for (const z of zones) assert.ok(z.x >= -1e-9 && z.y >= 0 && z.x + z.w <= vw + 1e-9 && z.y + z.h <= vh + 1e-9, `${w}x${h} x${user}: ${z.id} ligt in beeld`);
  }
  assert.deepEqual(duivenMaten(1600), { links: 350, stapel: 480, boven: 600 }, 'op een ruim vlak blijven de vaste maten');
  const m = duivenMaten(1000);
  assert.ok(m.stapel < 480 && m.stapel >= 240 && m.links < 350, 'op een smal vlak krimpen ze');
  const pg = fs.readFileSync(new URL('../game/js/pigeonguide.js', import.meta.url), 'utf8');
  assert.ok(pg.includes("'width', `${duivenMaten(vw).stapel}px`"),'de stapel gebruikt dezelfde breedte als zijn zone');
});

t('de richtingspijl blijft in de vrije band, ook als het doel ver buiten beeld ligt', () => {
  for (const [w, h] of VENSTERS) {
    const [vw, vh] = hudPx(w, h);
    const s = stapel(duivenKaarten({ introActief: false, holdActief: true }), { ruimte: stapelRuimte(vh) });
    const { zones, pijl } = duivenZones(vw, vh, s.onder);
    assert.ok(pijl.w > 240 && pijl.h > 100, `${w}x${h}: de band is groot genoeg (${pijl.w} x ${pijl.h})`);
    for (const e of [{ x: -1, y: 1 }, { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0, onScreen: true }, { x: -0.4, y: 0.2, onScreen: true }, { x: NaN, y: NaN }]) {
      const p = pijlPlek(e, vw, vh, pijl, { w: 240, h: 100 });
      const r = { id: 'pijl', x: p.x - 120, y: p.y - 50, w: 240, h: 100 };
      assert.deepEqual(zoneOverlap([...zones, r]), [], `${w}x${h} ${JSON.stringify(e)}: ${JSON.stringify(zoneOverlap([...zones, r]))}`);
    }
  }
});

t('naamplaten: alleen het dichtstbijzijnde doel groot, de rest valt weg bij overlap, onder een kaart of buiten beeld', () => {
  const [vw, vh] = [1600, 900];
  const { zones } = duivenZones(vw, vh, 300);
  const platen = [
    { id: 'dichtbij', prio: 0, x: 800, y: 500, w: 240, h: 54 },
    { id: 'over', prio: 1, x: 850, y: 520, w: 150, h: 34 },          // raakt de dichtstbijzijnde
    { id: 'naast', prio: 2, x: 1100, y: 480, w: 150, h: 34 },
    { id: 'onder-kaart', prio: 3, x: 800, y: 250, w: 150, h: 34 },   // in de stapel
    { id: 'buiten', prio: 4, x: -20, y: 500, w: 150, h: 34 },
    { id: 'kapot', prio: 5, x: NaN, y: 500, w: 150, h: 34 },
  ];
  assert.deepEqual(plaatSelectie(platen, vw, vh, zones), ['dichtbij', 'naast']);
  assert.deepEqual(plaatSelectie(platen, vw, vh, zones, 1), ['dichtbij'], 'het maximum telt');
  assert.deepEqual(plaatSelectie(null, vw, vh, zones), []);
});

t('de CSS gebruikt de getallen van de zones (links onder het paneel, toetsbalk rechts van de plaatsnaam)', () => {
  const pm = fs.readFileSync(new URL('../game/js/pigeonmode.js', import.meta.url), 'utf8');
  const hc = fs.readFileSync(new URL('../game/js/hudcards.css', import.meta.url), 'utf8');
  const pf = fs.readFileSync(new URL('../game/js/phonefeed.css', import.meta.url), 'utf8');
  assert.match(pm, new RegExp(`\\.ph-card \\{ position: absolute; top: ${LINKS_KAART_TOP}px; left: ${LINKS_RAND}px; width: min\\(calc\\(30vw / var\\(--ui, 1\\)\\), ${LINKS_KAART_BREED}px\\)`), 'prestatiekaart in de linkerzone');
  assert.match(pm, new RegExp(`\\.ph-hints \\{ position: absolute; left: ${HINTS_LINKS}px; right: ${LINKS_RAND}px;`), 'toetsbalk in zijn zone');
  assert.match(hc, new RegExp(`body\\.pigeon-mode #hud \\.hud-cards \\{ top: ${LINKS_KAART_TOP}px;`), 'missiekaart onder het paneel van de duif (#1058)');
  assert.match(pf, new RegExp(`body\\.pigeon-mode #hud \\.phonefeed \\{ top: ${LINKS_KAART_TOP}px;`), 'nieuwsregel in dezelfde zone');
  // #1033: het heli-paneel is hoger (vijf regels, ca. 240 px); daar staan kaart en nieuwsregel op 256 px (gezien in Electron: eronder)
  assert.match(hc, /body\.heli-run #hud \.hud-cards \{ top: 256px;/, 'missiekaart onder het heli-paneel');
  assert.match(pf, /body\.heli-run #hud \.phonefeed \{ top: 256px;/, 'nieuwsregel onder het heli-paneel');
  assert.match(hc, /body\.pg-melding #hud \.hud-cards, body\.pg-melding #hud \.phonefeed \{ visibility: hidden; \}/, 'de prestatiekaart gaat voor');
});

t('de toetsuitleg staat op één plek: de uitlegkaart "Je bent de duif" en de toetsen in de missietekst zijn weg', () => {
  const pg = fs.readFileSync(new URL('../game/js/pigeonguide.js', import.meta.url), 'utf8');
  const md = fs.readFileSync(new URL('../game/js/missions_defs.js', import.meta.url), 'utf8');
  assert.ok(!/pg-intro|pg-keys|GUIDE_INTRO|glyphHtml/.test(pg), 'geen tweede toetsuitleg in de gids');
  const say = (md.match(/kind: 'pigeon', spot: 'station'[^\n]*?say: '([^']+)'/) || [])[1] || '';
  assert.ok(say.length > 20 && !/\bW\/S\b|Shift|WASD/.test(say), `de missietekst noemt geen toetsen meer: ${say}`);
});

console.log(`hudstack_test: ${n}/${n} ok`);
