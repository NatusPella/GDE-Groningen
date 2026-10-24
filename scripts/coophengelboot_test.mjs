// Samen spelen (#434): een gast die bij de host in een stilliggende boot zit, kan vanaf het water hengelen op zijn eigen scherm.
// Een gast heeft geen voertuig in zijn eigen spel; coopnet.js zet world.coopBoot (plek en snelheid van de boot van de host) en hengelen.js leest dat.
import './node3d.mjs';
import assert from 'node:assert/strict';
const { HENGELEN, hengelVrijPrompt, HENGEL_POSE } = await import('../game/js/hengelen.js');
const { GAST_ACTIVITEITEN } = await import('../game/js/coopgast.js');

let n = 0;
const t = (name, f) => { f(); n++; };

const rechthoek = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const poly = (kind, name, pts) => ({ kind, name, pts, bounds: [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))] });
const meer = poly('meer', 'Zuidlaardermeer', rechthoek(0, 0, 2000, 1500));
const kaart = { waterNear: (x, y, r) => [meer].filter((w) => !(x + r < w.bounds[0] || x - r > w.bounds[2] || y + r < w.bounds[1] || y - r > w.bounds[3])), coveredAt: () => false };
const wereld = (o = {}) => ({ map: kaart, time: 0, player: { x: 1000, y: 700, vx: 0, vy: 0 }, wanted: 0, input: { wasPressed: () => false, consume() {}, isDown: () => false }, addMessage() {}, ...o });
const kijk = (w) => { HENGELEN.tick(0.5, w); return hengelVrijPrompt(w, true); };

t('hengelen blijft een activiteit die een gast zelf mag spelen', () => { assert.ok(GAST_ACTIVITEITEN.has('hengelen')); });
t('een gast in een stilliggende boot op het water krijgt het hengelprompt van de boot', () => {
  const w = wereld({ coopRole: 'client', coopBoot: { x: 1000, y: 700, speed: 0.2 } });
  const p = kijk(w);
  assert.ok(p, 'een prompt'); assert.equal(p.id, 'hengel-vrij'); assert.equal(p.key, 'I');
  assert.equal(hengelVrijPrompt(w, false), null, 'het prompt voor de kant is het niet');
});
t('een varende boot of een boot op het droge geeft geen prompt', () => {
  assert.equal(kijk(wereld({ coopRole: 'client', coopBoot: { x: 1000, y: 700, speed: 4 } })), null, 'sneller dan 1,2 m/s: je vaart');
  assert.equal(kijk(wereld({ coopRole: 'client', coopBoot: { x: 5000, y: 5000, speed: 0 } })), null, 'geen water');
});
t('zonder boot of niet als gast verandert er niets: aan de kant geen bootprompt, de host houdt zijn eigen regels', () => {
  assert.equal(kijk(wereld({ coopRole: 'client', coopBoot: null })), null);
  assert.equal(kijk(wereld({ coopRole: 'host', coopBoot: { x: 1000, y: 700, speed: 0 } })), null, 'alleen een gast leest world.coopBoot');
  const w = wereld({ player: { x: 1000, y: 1498, vx: 0, vy: 0 } }); HENGELEN.tick(0.5, w);
  assert.equal(hengelVrijPrompt(w, false) !== null, true, 'aan de kant van het meer: het gewone prompt');
});

// Vissen vanuit een boot (#437): de eigen boot van de speler, stil genoeg en op het water.
const inBoot = (speed, x = 1000, y = 700, extra = {}) => wereld({ player: { x, y, vx: 0, vy: 0, inVehicle: { isBoat: true, x, y, speed } }, ...extra });

t('de eigen boot: stilliggen op het water geeft het bootprompt, varen of op het droge niet', () => {
  const stil = inBoot(0.3); const p = kijk(stil);
  assert.ok(p, 'een prompt vanuit de boot'); assert.equal(p.id, 'hengel-vrij'); assert.equal(p.key, 'I');
  assert.equal(hengelVrijPrompt(stil, false), null, 'het prompt voor de kant is het niet');
  assert.equal(kijk(inBoot(3)), null, 'sneller dan 1,2 m/s: je vaart');
  assert.equal(kijk(inBoot(0, 5000, 5000)), null, 'de boot ligt op het droge');
});

t('een gast die zelf een boot bestuurt hengelt ook vanaf het water', () => {
  assert.ok(kijk(inBoot(0.2, 1000, 700, { coopRole: 'client' })), 'stil: wel');
  assert.equal(kijk(inBoot(4, 1000, 700, { coopRole: 'client' })), null, 'varend: niet');
});

t('de hengelhouding volgt de fase: uitwerpen, klaar, de ruk bij een beet en het binnenhalen (#437)', () => {
  assert.equal(HENGEL_POSE.cast, 'hengel-uit');
  assert.equal(HENGEL_POSE.idle, 'hengel');
  assert.equal(HENGEL_POSE.wait, 'hengel');
  assert.equal(HENGEL_POSE.bite, 'hengel-ruk');
  assert.equal(HENGEL_POSE.scare, 'hengel-haal');
  for (const fase of ['idle', 'cast', 'wait', 'bite', 'scare']) assert.ok(HENGEL_POSE[fase], fase);
});

console.log(`coophengelboot_test: ${n}/${n} ok`);
