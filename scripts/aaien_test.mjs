// Katten en honden aaien (#437): wie mag, de toetstip, de aai zelf, de beloning, afbreken en de prestatie.
import assert from 'node:assert/strict';
const mem = new Map();
globalThis.localStorage = { getItem: () => null, setItem: (k) => { mem.set(k, 1); }, removeItem() {}, clear() {} };
const { aaibaar, zoekAaibaar, aaiPrompt, startAaien, tryAaien, updateAaien, magAaien, AAI_M, AAI_S, AAI_HP, AAI_PAUZE_S } = await import('../game/js/aaien.js');
const { aaienStand, newStand } = await import('../game/js/bewegingrules.js');
const { ACHIEVEMENTS } = await import('../game/js/achievements.js');

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

const kat = (o = {}) => ({ kind: 'cat', x: 1, y: 0, state: 'sit', tam: true, ...o });
const hond = (o = {}) => ({ kind: 'dog', x: 0, y: 1.5, state: 'walk', ...o });
const maakWereld = (dieren) => {
  const msgs = [], pressed = new Set(['e']);
  return {
    time: 100, health: 50, wildlife: dieren, audioEvents: [], msgs,
    addMessage: (t) => msgs.push(t),
    player: { x: 0, y: 0, vx: 0, vy: 0, angle: 0 },
    input: { wasPressed: (k) => pressed.has(k), consume: (k) => pressed.delete(k) },
  };
};

// wie mag
ok(aaibaar(kat()), 'tamme kat');
ok(!aaibaar(kat({ tam: false })), 'schuwe kat niet');
ok(!aaibaar(kat({ state: 'flee' })), 'vluchtende kat niet');
ok(aaibaar(hond()), 'hond bij zijn baasje');
ok(!aaibaar(hond({ state: 'stray' })), 'loslopende hond niet');
ok(!aaibaar(hond({ agressief: true })), 'agressieve hond niet');
ok(!aaibaar(kat({ dead: true })), 'dood dier niet');
ok(!aaibaar({ kind: 'duck', x: 0, y: 0 }), 'geen eend');
ok(!aaibaar(kat({ aaiNaT: 130 }), 100), 'pas geaaid: even wachten');
ok(aaibaar(kat({ aaiNaT: 90 }), 100), 'pauze voorbij');

// afstand: binnen 2 m, het dichtstbijzijnde wint
const p = { x: 0, y: 0 };
ok(zoekAaibaar([kat({ x: AAI_M + 0.1, y: 0 })], p) === null, 'net buiten bereik');
const dichtbij = kat({ x: 0.5, y: 0 });
ok(zoekAaibaar([hond(), dichtbij], p) === dichtbij, 'dichtstbijzijnde');
ok(zoekAaibaar([], p) === null && zoekAaibaar(null, p) === null, 'geen dieren');

// toetstip: E, Aaien; niet in een voertuig, niet zwemmend, niet in een activiteit
let w = maakWereld([kat()]);
const tip = aaiPrompt(w);
ok(tip && tip.key === 'E' && tip.label === 'Aaien', 'tip: E, Aaien');
w.player.inVehicle = {};
ok(aaiPrompt(w) === null && !magAaien(w), 'niet in een voertuig');
w.player.inVehicle = null; w.player.swimming = true;
ok(aaiPrompt(w) === null, 'niet zwemmend');
w.player.swimming = false; w.activityGame = 'discgolf';
ok(aaiPrompt(w) === null, 'niet in een activiteit');
w.activityGame = null;
ok(aaiPrompt(maakWereld([kat({ x: 3, y: 0 })])) === null, 'te ver: geen tip');

// de aai zelf: E start, het dier gaat zitten, na de beloningsgrens +5 en een telling, daarna klaar
w = maakWereld([kat({ state: 'walk' })]);
ok(tryAaien(w) === true, 'E start de aai');
ok(w.player.aaien && w.player.aaien.dier.state === 'sit' && w.player.aaien.dier.aaiT > 0, 'kat zit en wordt geaaid');
ok(w.audioEvents.some((e) => e.kind === 'purr'), 'spinnen als geluid');
ok(w.health === 50, 'de beloning komt pas na een tel');
for (let i = 0; i < 28; i++) updateAaien(0.05, w);
ok(w.health === 50 + AAI_HP && w.msgs.length === 1, '+5 gezondheid en een bericht');
for (let i = 0; i < 60; i++) updateAaien(0.05, w);
ok(w.player.aaien === null && w.health === 50 + AAI_HP, 'klaar, maar één keer beloond');
ok(aaiPrompt(w) === null, 'hetzelfde dier wil niet meteen weer');
w.time += AAI_PAUZE_S + 1;
ok(aaiPrompt(w) !== null, 'na de pauze mag het weer');

// een hond: yip, en gezondheid blijft op 100 gekapt
w = maakWereld([hond()]); w.health = 98;
ok(startAaien(w) && w.audioEvents.some((e) => e.kind === 'yip'), 'hond: blij geluid');
for (let i = 0; i < 70; i++) updateAaien(0.05, w);
ok(w.health === 100, 'gezondheid tot 100');

// weglopen breekt af zonder beloning
w = maakWereld([kat()]);
startAaien(w);
updateAaien(0.3, w);
w.player.vx = 4;
updateAaien(0.1, w);
ok(w.player.aaien === null && w.health === 50 && w.wildlife[0].aaiT === 0, 'weglopen: geen beloning');

// de prestatie 'Dierenvriend'-drempels staan klaar
const drempels = ACHIEVEMENTS.filter((a) => a.stat === 'aaien').map((a) => a.goal);
ok(drempels.join() === '5,25,100', 'drie drempels voor aaien');

// de houding: eindig, zakt in en komt weer overeind
const mid = aaienStand(0.5, { ...newStand(), pelvisDrop: 0 });
const begin = aaienStand(0, { ...newStand(), pelvisDrop: 0 });
const eind = aaienStand(1, { ...newStand(), pelvisDrop: 0 });
ok(Object.values(mid).every((v) => typeof v === 'number' ? Number.isFinite(v) : Object.values(v).every(Number.isFinite)), 'houding eindig');
ok(mid.pelvisDrop > 0.2 && begin.pelvisDrop === 0 && eind.pelvisDrop === 0, 'zakt door de knieën en staat weer op');
ok(mid.armR.z > 1 && Math.abs(aaienStand(0.4, newStand()).armR.z - aaienStand(0.45, newStand()).armR.z) > 0, 'rechterhand strijkt');

console.log(`aaien_test: ${n}/${n} ok`);
