// Fuzz- en eigenschappentests op de kern (sprint kwaliteit 22-11):  node scripts/kern_fuzz_test.mjs
// Vaste zaadjes, dus herhaalbaar. Dekt: netwerkcodec (willekeurige bytes en bitflips op geldige berichten),
// de EXTRA-lezers van Samen spelen, de outfit-code (rondreis en rommel), de save- en instellingenmigratie
// op willekeurige JSON, en de invarianten van de economie. Elke lezer moet bij rommel null geven, nooit gooien.
import * as K from '../game/js/net/codec.js';
import * as X from '../game/js/coopextra.js';
import * as C from '../game/js/clothing.js';
import * as D from '../game/js/clothingdata.js';
import * as M from '../game/js/savemigrate.js';
import * as E from '../game/js/economy.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; if (fails < 40) console.log('FAIL ' + name + (info ? ' (' + info + ')' : '')); } };
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = mulberry(0x51ced);
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = (l) => l[ri(0, l.length - 1)];
const noThrow = (f, name) => { try { return { v: f() }; } catch (e) { ok(false, name + ' gooit', String(e && e.message).slice(0, 80)); return { v: undefined, threw: true }; } };

// ---------------------------------------------------------------- 1. netwerkcodec
const snap = {
  players: [{ slot: 0, x: 120.5, y: 0, z: 40, angle: 1.2, alive: true, inVeh: false, driver: false, run: true, crouch: false, down: false, health: 80, vehicle: null, seat: 0, weapon: 2, attack: 0 },
    { slot: 3, x: -300, y: 1, z: 50, angle: 5, alive: true, inVeh: true, driver: true, health: 100, vehicle: 7, seat: 0, weapon: 0, attack: 0 }],
  shared: { money: 1234, wanted: 2, clock: 12.5 }, mission: { stage: 3, state: 'run', present: 3 },
  entities: [{ id: 7, kind: 0, x: -300, z: 50, angle: 2 }, { id: 9, kind: 20, x: 5, z: 6, angle: 0 }], looks: [],
};
const valid = [K.encodeSnapshot(5, 99, 4, snap), K.encodeInput(1, 2, 3, { mx: 1, my: -1, buttons: 5, yaw: 3 }),
  K.encodeJson(K.T.HELLO, 1, 1, 1, { naam: 'Tessa', v: 2 }), K.encodeExtra(1, 1, 1, new Uint8Array([1, 2, 3, 4])), K.encodeSimple(K.T.PING, 1, 2, 3)];
const decoders = { readHeader: K.readHeader, decodeInput: K.decodeInput, decodeSnapshot: (b) => K.decodeSnapshot(b), decodeSnapshotCache: (b) => K.decodeSnapshot(b, new Map()), decodeJson: K.decodeJson, decodeExtra: K.decodeExtra };
const extraReaders = { leesExtra: X.leesExtra, leesStunt: X.leesStunt, leesPunten: X.leesPunten, leesPeds: X.leesPeds, leesDeuren: X.leesDeuren, leesWereld: X.leesWereld, leesSprekers: X.leesSprekers };

const dec = K.decodeSnapshot(valid[0]);
ok(dec && dec.players.length === 2 && dec.entities.length === 2 && dec.shared.money === 1234 && dec.mission.state === 'run', 'snapshot rondreis');
ok(dec && Math.abs(dec.players[0].x - 120.5) < 1e-3 && dec.players[1].slot === 3 && dec.players[1].vehicle === 7, 'snapshot rondreis: waarden');
for (let len = 0; len < valid[0].length; len++) ok(noThrow(() => K.decodeSnapshot(valid[0].subarray(0, len)), 'snapshot kort ' + len).v === null, 'afgekapte snapshot geeft null', 'len ' + len);
let accepted = 0;
for (const [name, f] of Object.entries(decoders)) {
  for (let i = 0; i < 600; i++) noThrow(() => f(Uint8Array.from({ length: ri(0, 80) }, () => ri(0, 255))), name + ' rommel');
  for (const base of valid) {
    for (let i = 0; i < 300; i++) {
      const b = Uint8Array.from(base);
      for (let k = ri(1, 3); k > 0; k--) b[ri(0, b.length - 1)] ^= 1 << ri(0, 7);
      const r = noThrow(() => f(b), name + ' bitflip');
      if (r.v) accepted++;
      if (r.v && name.startsWith('decodeSnapshot')) {
        const s = r.v;
        ok(s.players.length <= K.MAX_PLAYERS && s.entities.length <= K.MAX_ENTITIES && s.shared.wanted <= 5, 'snapshot na bitflip binnen grenzen');
        ok(s.players.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z) && p.slot < K.MAX_PLAYERS), 'snapshot na bitflip: eindige posities en slot');
      }
    }
  }
}
for (const [name, f] of Object.entries(extraReaders)) {
  for (let i = 0; i < 800; i++) noThrow(() => f(Uint8Array.from({ length: ri(0, 120) }, () => ri(0, 255))), name + ' rommel');
  noThrow(() => f(null), name + ' null'); noThrow(() => f(undefined), name + ' undefined'); noThrow(() => f(new Uint8Array(0)), name + ' leeg');
  noThrow(() => f([1, 2, 3]), name + ' gewone array');
}
const extraOk = noThrow(() => X.codeerExtra({ voetgangers: [{ id: 1, speed: 1, flags: 0 }], lichten: [{ i: 2, t: 1 }], kapot: null, dieren: [], uiterlijk: [], spraak: [], misc: [] }, { x: 0, y: 0 }), 'codeerExtra').v;
if (extraOk && extraOk.length) for (let i = 0; i < 1500; i++) { const b = Uint8Array.from(extraOk); b[ri(0, b.length - 1)] ^= 1 << ri(0, 7); noThrow(() => X.leesExtra(b), 'leesExtra bitflip'); }
ok(extraOk && extraOk.length > 0 && X.leesExtra(extraOk) !== null, 'codeerExtra en leesExtra rondreis');
ok(accepted > 0, 'de bitflips leveren soms een nog geldig bericht (de lezers zijn niet te streng)');
ok((() => { try { K.encodeJson(K.T.EVENT, 1, 1, 1, { x: 'a'.repeat(K.MAX_JSON + 10) }); return false; } catch (e) { return true; } })(), 'te groot JSON-bericht wordt geweigerd bij het maken');
{ const b = Uint8Array.from(valid[4]); b[1] = 99; ok(K.readHeader(b) === null, 'onbekende codecversie geeft null'); b[1] = K.CODEC_VERSION; b[2] = 0; ok(K.readHeader(b) === null, 'type 0 geeft null'); b[2] = 12; ok(K.readHeader(b) === null, 'type 12 geeft null'); }
for (let i = 0; i < 500; i++) { const a = (R() - 0.5) * 1000; const q = K.quantAngle(a); const back = K.dequantAngle(q); ok(q >= 0 && q <= 65535 && back >= 0 && back <= Math.PI * 2 + 1e-9, 'quantAngle binnen bereik', String(a)); }

// ---------------------------------------------------------------- 2. outfit-code
const chars = Object.keys(D.DEFAULT_WORN || {});
ok(chars.length > 0, 'standaardlooks bestaan');
for (const ch of chars) {
  const code = C.encodeOutfit({ ...D.DEFAULT_WORN[ch] });
  ok(typeof code === 'string' && code.length <= 80, 'outfit-code van de standaardlook past (' + ch + ')', String(code && code.length));
  const back = C.decodeOutfit(code);
  ok(back && C.encodeOutfit(back) === code, 'outfit-code is een vast punt na een rondreis (' + ch + ')', code);
  ok(C.cleanOutfitCode(code) === code, 'cleanOutfitCode laat een geldige code door (' + ch + ')');
}
const alfabet = '0123456789abcdefghijklmnopqrstuvwxyz-_ .,;:!?/<>{}[]';
for (let i = 0; i < 4000; i++) {
  let s = R() < 0.7 ? 'k' + ri(0, 9) : ''; for (let j = ri(0, 90); j > 0; j--) s += alfabet[ri(0, alfabet.length - 1)];
  const r = noThrow(() => C.decodeOutfit(s), 'decodeOutfit rommel');
  if (r.v) {
    ok(Object.values(r.v).every((x) => typeof x === 'string' && x.length < 60), 'decodeOutfit levert alleen tekstwaarden', s);
    noThrow(() => C.outfitToLook({ ...D.DEFAULT_WORN[chars[0]], ...r.v }, {}), 'outfitToLook op gedecodeerde rommel');
  }
  noThrow(() => C.cleanOutfitCode(s), 'cleanOutfitCode rommel');
}
for (const bad of [null, undefined, 5, {}, [], 'k', 'k1', 'x1abc', 'k'.padEnd(81, '0')]) ok(C.decodeOutfit(bad) === null, 'decodeOutfit weigert ' + String(JSON.stringify(bad)).slice(0, 20));
{
  const code = C.encodeOutfit(D.DEFAULT_WORN[chars[0]]);
  for (let i = 0; i < 1500; i++) { const a = code.split(''); a[ri(0, a.length - 1)] = alfabet[ri(0, 35)]; noThrow(() => C.decodeOutfit(a.join('')), 'decodeOutfit tekenvervanging'); }
}

// ---------------------------------------------------------------- 3. save- en instellingenmigratie op willekeurige JSON
const SLEUTELS = ['v', 'money', 'missions', 'completed', 'story', 'done', 'pos', 'x', 'y', 'character', 'savedAt', 'speeltijd', 'wanted', 'arc', 'clothing', 'quality', 'sfxVolume', 'gore', 'verhaal', '__proto__', 'inventory'];
function rJson(depth = 0) {
  switch (ri(0, depth > 2 ? 5 : 8)) {
    case 0: return null;
    case 1: return ri(-5, 9999999);
    case 2: return R() < 0.1 ? NaN : R() * 1e6;
    case 3: return pick(['', 'tammo', 'x'.repeat(200), '__proto__', 'constructor']);
    case 4: return R() < 0.5;
    case 5: return undefined;
    case 6: return Array.from({ length: ri(0, 4) }, () => rJson(depth + 1));
    default: { const o = {}; for (let i = ri(0, 6); i > 0; i--) o[pick(SLEUTELS)] = rJson(depth + 1); return o; }
  }
}
for (let i = 0; i < 3000; i++) {
  const x = rJson();
  const a = noThrow(() => M.migrateSave(x), 'migrateSave willekeurig');
  if (a.v) { ok(a.v.data && a.v.data.v === M.SAVE_VERSION, 'migrateSave geeft de huidige versie of null', JSON.stringify(a.v.data && a.v.data.v)); noThrow(() => M.savedStoryStep(a.v.data), 'savedStoryStep op gemigreerde rommel'); }
  const b = noThrow(() => M.migrateSettings(x), 'migrateSettings willekeurig');
  if (b.v) ok(b.v.data && b.v.data.v === M.SETTINGS_VERSION, 'migrateSettings geeft de huidige versie of null');
  noThrow(() => M.plausiblePos(x), 'plausiblePos');
}
for (let i = 0; i < 800; i++) {
  const x = { v: ri(1, M.SAVE_VERSION), money: ri(0, 1e6), missions: { completed: [ri(0, 20)] }, character: 'tammo', savedAt: 5 };
  const a = noThrow(() => M.migrateSave(JSON.parse(JSON.stringify(x))), 'migrateSave geldig');
  if (a.v) { const b = noThrow(() => M.migrateSave(JSON.parse(JSON.stringify(a.v.data))), 'migrateSave tweede keer'); ok(b.v && JSON.stringify(b.v.data) === JSON.stringify(a.v.data), 'migrateSave is idempotent', 'v' + x.v); }
}
noThrow(() => M.migrateSave(JSON.parse('{"v":5,"__proto__":{"geheim":1},"money":3}')), 'migrateSave proto');
ok(({}).geheim === undefined, 'migrateSave vervuilt Object.prototype niet');

// ---------------------------------------------------------------- 4. economie: invarianten
for (let i = 0; i < 3000; i++) {
  const w = ri(0, 5), money = ri(-50, 100000), dmg = R() * 120, dents = ri(0, 4);
  const fine = E.bustFine(w, money);
  ok(Number.isInteger(fine) && fine >= 0 && fine <= w * 60 && fine <= Math.floor(Math.max(0, money) * 0.2), 'bustFine blijft binnen een vijfde en 60 per ster', w + ' ' + money);
  ok(E.bustFineIn(w, money, { missionCar: true }) === 0, 'bustFineIn is gratis in een geleende missieauto');
  ok(E.repairCost(dmg, dents, false) >= 10 && E.repairCost(dmg, dents, true) >= 3, 'repairCost heeft een ondergrens');
  ok(E.repairCost(dmg + 10, dents, false) >= E.repairCost(dmg, dents, false), 'repairCost is niet dalend met schade');
  ok(E.platesCost(w + 1) > E.platesCost(w), 'platesCost stijgt per ster');
  const world = { money };
  const bedrag = pick([ri(-10, 500), NaN, '12', null, undefined, 1e12, 0.4, 0.6]);
  const voor = world.money; const res = E.betaal(world, bedrag);
  ok(res ? world.money >= 0 && world.money < voor : world.money === voor, 'betaal: slaagt alleen met dekking en doet niets bij weigering', money + ' ' + bedrag);
  ok(Number.isFinite(world.money), 'betaal houdt het saldo eindig');
}
ok(E.betaal(null, 5) === false, 'betaal zonder wereld is onwaar');

// ---------------------------------------------------------------- 5. gaten die de mutatiecontrole aanwees (scripts/mutatie_check.mjs)
// Vaste prijzen: een tabel die stilletjes verandert is een balanswijziging.
ok(E.platesCost(0) === 40 && E.platesCost(3) === 190 && E.platesCost(5) === 290, 'platesCost: 40 plus 50 per ster');
// Een snapshot met 17 spelers (een erbij gezet na de zestiende) wordt geweigerd, ook als de rest netjes past.
{
  const zestien = { ...snap, players: Array.from({ length: K.MAX_PLAYERS }, (_, i) => ({ ...snap.players[0], slot: i })), entities: [] };
  const b = K.encodeSnapshot(1, 1, 1, zestien);
  ok(K.decodeSnapshot(b) && K.decodeSnapshot(b).players.length === K.MAX_PLAYERS, 'snapshot met 16 spelers rondreis');
  const extra = new Uint8Array(b.length + 22); extra.set(b.subarray(0, 12 + 16 * 22), 0); extra.set(b.subarray(12 + 15 * 22, 12 + 16 * 22), 12 + 16 * 22); extra.set(b.subarray(12 + 16 * 22), 12 + 17 * 22);
  extra[11] = 17;
  ok(K.decodeSnapshot(extra) === null, 'snapshot met 17 spelers wordt geweigerd');
}
// Een entiteit ver buiten de wereld maakt de hele snapshot ongeldig.
ok(K.decodeSnapshot(K.encodeSnapshot(1, 1, 1, { ...snap, entities: [{ id: 1, kind: 20, x: 5e7, z: 0, angle: 0 }] })) === null, 'entiteit buiten de wereld: snapshot geweigerd');
// Een JSON-bericht met losse bytes erachter is geen geldig bericht (een spatie: JSON.parse slikt hem, de lengtecontrole niet).
{ const j = valid[2]; const langer = new Uint8Array(j.length + 1); langer.set(j); langer[j.length] = 0x20; ok(K.decodeJson(j) && K.decodeJson(langer) === null, 'JSON-bericht met restbytes wordt geweigerd'); }
// Meer uiterlijkrecords dan MAX_LOOKS: vijf geldige records achter elkaar worden geweigerd.
{
  const L = { id: 7, model: 1, fl: 0, len: 4.2, wid: 1.8, color: 0x112233, color2: 0x445566, extra: 0, dents: [] };
  const zonder = K.encodeSnapshot(1, 1, 1, { ...snap, entities: [], looks: [] });
  const met1 = K.encodeSnapshot(1, 1, 1, { ...snap, entities: [], looks: [L] });
  ok(K.decodeSnapshot(met1) && K.decodeSnapshot(met1).looks.length === 1, 'snapshot met een uiterlijkrecord rondreis');
  const rec = met1.subarray(zonder.length);
  const vijf = new Uint8Array(zonder.length + rec.length * 5); vijf.set(zonder); vijf[zonder.length - 1] = 5;
  for (let i = 0; i < 5; i++) vijf.set(rec, zonder.length + i * rec.length);
  ok(K.decodeSnapshot(vijf) === null, 'vijf uiterlijkrecords (meer dan MAX_LOOKS) worden geweigerd');
}
// Outfit-code: een kleur die het stuk niet heeft wordt overgeslagen.
{
  const stuk = D.ITEMS.find((it) => D.PALETTE_IDS.some((c) => !it.colors.includes(c)));
  const kleur = D.PALETTE_IDS.find((c) => !stuk.colors.includes(c));
  const goed = 'k3---0' + D.ITEM_INDEX[stuk.id].toString(36).padStart(2, '0') + D.PALETTE_INDEX[stuk.colors[0]].toString(36).padStart(2, '0');
  const fout = 'k3---0' + D.ITEM_INDEX[stuk.id].toString(36).padStart(2, '0') + D.PALETTE_INDEX[kleur].toString(36).padStart(2, '0');
  ok(C.decodeOutfit(goed) && C.decodeOutfit(goed)[stuk.slot] === stuk.id + '.' + stuk.colors[0], 'outfit-code met een geldige kleur wordt gelezen');
  ok(C.decodeOutfit(fout) === null, 'outfit-code met een kleur die het stuk niet heeft draagt niets');
}
// Een bewaarde positie buiten de provincie wordt niet geplaatst.
ok(M.plausiblePos({ x: 149999, y: -149999 }) && !M.plausiblePos({ x: 1e6, y: 0 }) && !M.plausiblePos({ x: 0, y: -2e5 }) && !M.plausiblePos({ x: NaN, y: 0 }) && !M.plausiblePos(null), 'plausiblePos: binnen 150 km, eindig');
// EXTRA: een oorsprong buiten de wereld en te veel verkeerslichten worden geweigerd.
{
  const basis = { voetgangers: [{ id: 1, speed: 1, flags: 0 }], lichten: [], kapot: null, dieren: [], uiterlijk: [], spraak: [], misc: [] };
  ok(X.leesExtra(X.codeerExtra(basis, { x: 10, y: 20 })) !== null, 'EXTRA met een gewone oorsprong wordt gelezen');
  ok(X.leesExtra(X.codeerExtra(basis, { x: 2e6, y: 0 })) === null, 'EXTRA met een oorsprong buiten de wereld wordt geweigerd');
  const lichten = (k) => ({ ...basis, voetgangers: [], lichten: Array.from({ length: k }, (_, i) => ({ i, t: 1 })) });
  ok(X.leesExtra(X.codeerExtra(lichten(X.MAX_LICHTEN), { x: 0, y: 0 })) !== null, 'EXTRA met het maximum aan lichten wordt gelezen');
  ok(X.leesExtra(X.codeerExtra(lichten(X.MAX_LICHTEN + 1), { x: 0, y: 0 })) === null, 'EXTRA met een licht te veel wordt geweigerd');
}

console.log('kern_fuzz_test: ' + n + ' controles, ' + fails + ' mislukt');
process.exit(fails ? 1 : 0);
