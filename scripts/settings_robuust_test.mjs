// Instellingen: een struikelende luisteraar, NaN en waarden buiten bereik. node scripts/settings_robuust_test.mjs
const KEY = 'gde-settings';
const opslag = new Map();
opslag.set(KEY, JSON.stringify({ v: 99, rumbleStrength: 9000, drunkFx: 'wild', masterVolume: 0.5 }));
globalThis.localStorage = {
  getItem: (k) => (opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => { if (k !== KEY) throw new Error('test schreef naar ' + k); opslag.set(k, String(v)); },
  removeItem: (k) => opslag.delete(k),
};
globalThis.document = undefined;
const fouten = [];
const origErr = console.error; console.error = (...a) => { fouten.push(a.join(' ')); };
const origWarn = console.warn; console.warn = (...a) => { fouten.push(a.join(' ')); };
const S = await import('../game/js/settings.js');
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; origErr('FAIL', m, i); } };
const g = S.getSettings();
ok(g.rumbleStrength === 1, 'trilsterkte buiten bereik valt terug', g.rumbleStrength);
ok(g.drunkFx === 'aan', 'onbekend dronken effect valt terug', g.drunkFx);
ok(g.masterVolume === 0.5, 'een goede waarde blijft');
// luisteraars: de eerste struikelt, de tweede hoort het toch
let gehoord = 0;
S.onSettingsChange(() => { if (gehoord++ > 0) throw new Error('boem'); });
S.onSettingsChange(() => {});
let tweede = 0;
S.onSettingsChange(() => { tweede++; });
const t0 = tweede;
let gooide = false;
try { S.setSetting('sfxVolume', 0.2); } catch (e) { gooide = true; }
ok(!gooide, 'setSetting gooit niet door een struikelende luisteraar');
ok(tweede - t0 === 1, 'de volgende luisteraar krijgt de wijziging toch', tweede - t0);
ok(g.sfxVolume === 0.2, 'de wijziging staat');
ok(fouten.some((f) => f.includes('luisteraar faalde')), 'de fout gaat naar het rapport', fouten.join('|'));
// NaN en oneindig worden geweigerd
S.setSetting('fov', 70);
S.setSetting('fov', 'abc');
S.setSetting('fov', NaN);
S.setSetting('fov', Infinity);
ok(g.fov === 70, 'fov blijft 70 bij NaN of Infinity', g.fov);
S.setSetting('brightness', '1.2');
ok(g.brightness === 1.2, 'een getal als tekst telt als getal');
// withTempSettings: ook daar blijft een struikelende luisteraar buiten
let terug;
try { terug = S.withTempSettings({ quality: 'laag' }); terug(); } catch (e) { terug = null; }
ok(terug !== null && g.quality === 'hoog', 'withTempSettings zet terug ondanks struikelende luisteraar', g.quality);
// aanmelden met een struikelende eerste aanroep
let unsub = null, gooide2 = false;
try { unsub = S.onSettingsChange(() => { throw new Error('bij aanmelden'); }); } catch (e) { gooide2 = true; }
ok(!gooide2 && typeof unsub === 'function', 'aanmelden gooit niet');
S.flushSettings();
ok(JSON.parse(opslag.get(KEY)).v === 99, 'de hogere versie van het bestand blijft');
// een volle opslag: één waarschuwing, geen gooi, de stand blijft in het geheugen
const voor = fouten.length;
globalThis.localStorage.setItem = () => { throw Object.assign(new Error("vol"), { name: "QuotaExceededError" }); };
let gooide3 = false;
try { S.setSetting("showHints", false); S.setSetting("showMinimap", false); S.setSetting("showFog", false); } catch (e) { gooide3 = true; }
ok(!gooide3 && g.showFog === false, "volle opslag: geen gooi, stand in geheugen");
ok(fouten.slice(voor).filter((f) => /bewaren mislukt/.test(f)).length === 1, "volle opslag: precies één waarschuwing", fouten.slice(voor).filter((f) => /bewaren/.test(f)).join("|"));
console.error = origErr;
console.log(`settings_robuust_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
