// Fuzz: een bewerkt of kapot instellingenbestand levert altijd bruikbare instellingen op (juiste typen, getallen in bereik,
// bekende keuzes). node scripts/settings_fuzz_test.mjs
let opslag = null;
globalThis.localStorage = { getItem: () => opslag, setItem: () => {}, removeItem: () => {} };
globalThis.document = undefined;
const basis = await import('../game/js/settings.js?basis');
const D = { ...basis.getSettings() }; // standaardwaarden (leeg bestand)
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const kies = (a) => a[Math.floor(rnd() * a.length)];
const rommel = ['a<b>\n\u0001x  y', null, true, false, 0, -1, 1e9, -1e9, 0.5, 'tekst', '', 'toString', '__proto__', [], {}, [1, 2], { a: 1 }, '1.5', 'NaN', 1e-9, 7];
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; if (fails < 15) console.log('FAIL', m, i); } };
const BEREIK = { brightness: [0.6, 1.6], uiScale: [0.8, 1.5], fov: [50, 90], cameraDistance: [0.8, 1.6], mouseSensitivity: [0.3, 2.5], resolution: [0.5, 1], minimapZoom: [0.6, 1.6], steerSensitivity: [0.5, 1.5], padLookSensitivity: [0.3, 2.5], rumbleStrength: [0.25, 1.5], masterVolume: [0, 1], musicVolume: [0, 1], sfxVolume: [0, 1], voiceVolume: [0, 1] };
const NULLABLE = new Set(['onlineMeedoen', 'startKeuze']);
for (let i = 0; i < 300; i++) {
  const o = {};
  for (const k of Object.keys(D)) if (rnd() < 0.6) o[k] = kies(rommel);
  if (rnd() < 0.3) o.v = kies([1, 5, 99, 'x', null]);
  if (rnd() < 0.2) o['onbekend' + i] = kies(rommel);
  opslag = rnd() < 0.05 ? '{kapot' : JSON.stringify(o);
  let S;
  try { S = (await import('../game/js/settings.js?run' + i)).getSettings(); } catch (e) { ok(false, 'laden gooide', e.message); continue; }
  for (const [k, def] of Object.entries(D)) {
    const w = S[k];
    if (NULLABLE.has(k)) { ok(w === null || typeof w === (k === 'onlineMeedoen' ? 'boolean' : 'string'), 'nullable type ' + k, JSON.stringify(w)); continue; }
    if (def !== null && typeof def === 'object') { ok(w && typeof w === 'object', 'object ' + k, JSON.stringify(w)); continue; }
    ok(typeof w === typeof def, 'type ' + k, JSON.stringify(w));
    if (typeof w === 'number') ok(Number.isFinite(w), 'eindig ' + k, w);
    if (BEREIK[k]) ok(w >= BEREIK[k][0] && w <= BEREIK[k][1], 'bereik ' + k, w);
  }
  ok(S.onlineNaam.length <= 16, 'online naam kort', S.onlineNaam.length);
  ok(/^#[0-9a-f]{6}$/i.test(S.onlineKleur), 'kleur', S.onlineKleur);
  ok(!/[\u0000-\u001f<>]/.test(S.onlineNaam), 'online naam zonder stuurtekens of haakjes', JSON.stringify(S.onlineNaam));
}
console.log(`settings_fuzz_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
