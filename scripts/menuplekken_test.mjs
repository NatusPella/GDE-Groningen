// De achtergrond van het hoofdmenu (#380): de keuze van de standpunten (nooit twee keer dezelfde eerste plek achter elkaar, een reeks
// uit verschillende streken, alles komt aan bod), de zon, de camerabeweging en de plekken zelf tegen de kaartdata.
//   node scripts/menuplekken_test.mjs      (puur: geen DOM, geen echte opslag)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MENU_PLEKKEN, STAD_STREEK, STAD_GEWICHT, PLEKKEN_SLEUTEL, RECENT_N, REEKS_N, SHOT_S, UREN, BEWEGINGEN,
  stadPlek, leesVerleden, bewaarVerleden, leegVerleden, kiesVolgende, kiesReeks, noteer, uurKandidaten, zonAzimut, kiesKantEnUur, maakBeeld,
} from '../game/js/menuplekken.js';
import { sunElevationDeg } from '../game/js/sunrules.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL ' + name); } };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const deg = (r) => r * 180 / Math.PI;

// ---- de plekken ----
const ids = MENU_PLEKKEN.map((p) => p.id);
ok(new Set(ids).size === ids.length, 'plek-ids zijn uniek');
ok(MENU_PLEKKEN.length >= 25, `minstens 25 plekken uit de provincie (nu ${MENU_PLEKKEN.length})`);
const streken = new Set(MENU_PLEKKEN.map((p) => p.streek));
ok(streken.size >= 8, `plekken uit minstens 8 streken (nu ${streken.size})`);
ok(MENU_PLEKKEN.every((p) => /^[a-z0-9-]+$/.test(p.id)), 'plek-ids zijn kebab-case');
ok(MENU_PLEKKEN.every((p) => [p.x, p.y, p.R, p.z, p.lookZ].every(Number.isFinite) && p.R >= 50 && p.R <= 650 && p.z > 3 && p.z < 60 && p.lookZ >= 0 && p.lookZ < 60), 'afstand en hoogte van elke plek zijn aannemelijk');
ok(MENU_PLEKKEN.every((p) => p.x > -30000 && p.x < 46000 && p.y > -29000 && p.y < 42000), 'elke plek ligt in het wereldframe van de provincie');
ok(MENU_PLEKKEN.every((p) => !p.hoek || (p.hoek[1] > p.hoek[0] && p.hoek[1] - p.hoek[0] <= 360)), 'hoekbereiken kloppen');
ok(!streken.has(STAD_STREEK), 'de stad is geen streek van de provincielijst (die komt uit de kaart)');

// de plekken liggen op wat de kaartdata kent: een kerk, molen of borg uit landmarkkits.json, of een plaats van de provincie
const kits = JSON.parse(read('game/landmarkkits.json')).items;
const indexFile = path.join(root, 'game', 'world', 'index-provincie.json');
const places = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')).global.places : null;
const dichtbij = (list, p, r) => list.some((q) => Math.hypot(q.x - p.x, q.y - p.y) <= r);
for (const p of MENU_PLEKKEN) {
  if (p.soort === 'kerk' || p.soort === 'molen' || p.soort === 'borg') ok(dichtbij(kits.filter((k) => ['church', 'mill', 'castle', 'chapel'].includes(k.k)), p, 300), `${p.id}: een ${p.soort} uit landmarkkits.json binnen 300 m`);
  else if (places) ok(dichtbij(places, p, 2500) || dichtbij(kits, p, 600), `${p.id}: een plaats of oriëntatiepunt in de kaartdata`);
}
if (!places) console.log('(geen game/world/index-provincie.json: plaatsen niet nagekeken)');

// ---- de keuze ----
const stad = Array.from({ length: 20 }, (_, i) => stadPlek({ name: 'Plek ' + i, x: i * 10, y: i * 10, kind: 'canal' }, i));
const pool = [...MENU_PLEKKEN, ...stad];
ok(stad.every((s) => s.streek === STAD_STREEK && s.stad && s.gewicht === STAD_GEWICHT), 'stadsplekken hebben de streek stad en een lager gewicht');
ok(new Set(pool.map((p) => p.id)).size === pool.length, 'ids van provincie en stad botsen niet');

// opslag die niets doet, kapotte opslag en een opslag zonder toegang
ok(leesVerleden(null).recent.length === 0, 'geen opslag: leeg verleden');
ok(leesVerleden({ getItem: () => '{kapot' }).recent.length === 0, 'onleesbare opslag: leeg verleden');
ok(leesVerleden({ getItem: () => { throw new Error('geblokkeerd'); } }).recent.length === 0, 'geblokkeerde opslag gooit niet');
ok(leesVerleden({ getItem: () => JSON.stringify({ recent: [1, 'a', null, 'b'], eerste: 5 }) }).recent.join() === 'a,b', 'alleen tekst-ids worden gelezen');
ok(bewaarVerleden({ setItem: () => { throw new Error('vol'); } }, leegVerleden()) === undefined, 'volle opslag gooit niet');
const winkel = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, keys: () => [...m.keys()] }; };
{
  const s = winkel();
  bewaarVerleden(s, { eerste: 'a', recent: ['b', 'a'] });
  const h = leesVerleden(s);
  ok(h.eerste === 'a' && h.recent.join() === 'b,a', 'bewaren en teruglezen');
  ok(s.keys().join() === PLEKKEN_SLEUTEL && PLEKKEN_SLEUTEL === 'gde-menuplekken-v1', 'één sleutel, gde-menuplekken-v1');
}

// 4000 starts achter elkaar, elk met een reeks; de opslag blijft tussen de starts
{
  const rand = rng(380);
  const s = winkel();
  const eersten = [], reeksen = [];
  const telling = new Map();
  let stadEerste = 0;
  for (let i = 0; i < 4000; i++) {
    const h = leesVerleden(s);
    const { reeks, verleden } = kiesReeks(pool, h, rand);
    bewaarVerleden(s, verleden);
    eersten.push(reeks[0].id);
    reeksen.push(reeks);
    for (const p of reeks) telling.set(p.id, (telling.get(p.id) || 0) + 1);
    if (reeks[0].stad) stadEerste++;
  }
  let dubbel = 0, zelfdeStreek = 0, zelfdeId = 0, binnenReeks = 0, terugIn10 = 0;
  for (let i = 1; i < eersten.length; i++) if (eersten[i] === eersten[i - 1]) dubbel++;
  for (const r of reeksen) {
    if (new Set(r.map((p) => p.id)).size < r.length) zelfdeId++;
    if (new Set(r.map((p) => p.streek)).size < r.length) zelfdeStreek++;
  }
  // geen plek keert binnen RECENT_N getoonde plekken terug (over starts heen)
  const alles = reeksen.flat().map((p) => p.id);
  for (let i = 0; i < alles.length; i++) for (let j = Math.max(0, i - RECENT_N); j < i; j++) if (alles[j] === alles[i]) { terugIn10++; break; }
  ok(dubbel === 0, `de eerste plek is nooit die van de vorige start (${dubbel} keer wel)`);
  ok(zelfdeId === 0, 'een reeks heeft geen plek twee keer');
  ok(zelfdeStreek === 0, `een reeks komt uit verschillende streken (${zelfdeStreek} keer niet)`);
  ok(terugIn10 === 0, `geen plek binnen ${RECENT_N} getoonde plekken opnieuw (${terugIn10} keer wel)`);
  ok(pool.every((p) => telling.get(p.id) > 0), 'alle plekken komen aan bod');
  const aandeel = stadEerste / 4000;
  ok(aandeel > 0.03 && aandeel < 0.3, `de stad is een eerste plek in ${(aandeel * 100).toFixed(0)}% van de starts: de provincie krijgt de meeste kansen`);
  const provincie = MENU_PLEKKEN.map((p) => telling.get(p.id));
  ok(Math.max(...provincie) / Math.min(...provincie) < 1.8, `de provincieplekken komen ongeveer even vaak aan bod (${Math.min(...provincie)} tot ${Math.max(...provincie)})`);
}

// de eerste plek van een start is niet die van de vorige, ook niet na een lange sessie in het menu
{
  const rand = rng(7);
  let h = leegVerleden();
  let vorigeEerste = null, fout = 0;
  for (let start = 0; start < 500; start++) {
    h = { eerste: h.eerste, recent: h.recent };
    const p = kiesVolgende(pool, h, rand);
    if (p.id === vorigeEerste) fout++;
    h = noteer(h, p, { eerste: true });
    vorigeEerste = p.id;
    for (let i = 0; i < 40; i++) h = noteer(h, kiesVolgende(pool, h, rand)); // 40 wissels in dezelfde sessie
  }
  ok(fout === 0, `na een lange sessie begint de volgende start nog steeds anders (${fout} keer niet)`);
}

// een kleine pool: geen oneindige lus, geen leeg antwoord
{
  const klein = pool.slice(0, 2);
  const rand = rng(3);
  let h = leegVerleden();
  let goed = true;
  for (let i = 0; i < 20; i++) { const p = kiesVolgende(klein, h, rand); if (!p) goed = false; h = noteer(h, p); }
  ok(goed, 'met twee plekken geeft de keuze altijd een plek');
  ok(kiesVolgende([pool[0]], leegVerleden(), rng(1)).id === pool[0].id, 'met een plek geeft de keuze die plek');
  ok(kiesReeks(pool, leegVerleden(), rng(5)).reeks.length === REEKS_N, `een reeks heeft ${REEKS_N} plekken`);
}

// ---- de zon ----
{
  const bron = read('game/js/daynight.js');
  ok(/const NOON_BEARING = -60 \* Math\.PI \/ 180 \+ GRID_CONVERGENCE;/.test(bron), 'daynight.js heeft nog dezelfde middagrichting als menuplekken.js');
  ok(/hourAngle\(hour\) \{\s*return \(hour - 12\) \* 15/.test(read('game/js/sunrules.js')), 'sunrules.js draait de zon nog 15 graden per uur');
  ok(UREN.every((u) => u >= 7 && u <= 19), 'alle uren liggen in de dag');
  for (let th = 0; th < 360; th += 15) {
    const k = uurKandidaten(th * Math.PI / 180);
    ok(k.every((u) => sunElevationDeg(u) >= 8), `kant ${th}: de zon staat hoog genoeg`);
  }
  ok(uurKandidaten(270 * Math.PI / 180).length > 5 && uurKandidaten(0).length > 5, 'noord en oost hebben ruim keuze aan uren');
  ok(Math.abs(deg(zonAzimut(13)) - deg(zonAzimut(12)) - 15) < 1e-9, 'de zon draait 15 graden per uur');
}

// ---- de camera ----
{
  let fout = 0, zonOk = 0, totaal = 0;
  const gezien = new Set();
  for (const plek of MENU_PLEKKEN) {
    for (let i = 0; i < 40; i++) {
      const rand = rng(1000 + i * 31 + plek.x);
      const b = maakBeeld(plek, rand);
      gezien.add(b.beweging);
      totaal++;
      const k = uurKandidaten(b.theta);
      if (k.includes(b.uur)) zonOk++;
      let prev = null;
      for (let t = 0; t <= SHOT_S + 2; t += 0.5) {
        const q = b.pose(t);
        const d = Math.hypot(q.position.x - plek.x, q.position.y - plek.y);
        const velden = [q.position.x, q.position.y, q.position.z, q.lookAt.x, q.lookAt.y, q.lookAt.z, q.fov, q.focusDist];
        if (!velden.every(Number.isFinite) || d < 0.55 * plek.R || d > 1.35 * plek.R || q.position.z < 3 || q.position.z > 90 || q.lookAt.x !== plek.x) fout++;
        if (prev) {
          // rustig: de camera schuift minder dan 25 m/s en de kijkrichting draait minder dan 3 graden per seconde
          const v = Math.hypot(q.position.x - prev.position.x, q.position.y - prev.position.y, q.position.z - prev.position.z) / 0.5;
          const a0 = Math.atan2(plek.y - prev.position.y, plek.x - prev.position.x), a1 = Math.atan2(plek.y - q.position.y, plek.x - q.position.x);
          const dw = Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0))) * 2;
          if (v > 25 || deg(dw) > 3) fout++;
        }
        prev = q;
      }
    }
  }
  ok(fout === 0, `de camera blijft rond het doel, eindig en rustig (${fout} meetpunten niet)`);
  ok(zonOk / totaal > 0.97, `de zon staat bij ${(100 * zonOk / totaal).toFixed(1)}% van de beelden aan de kant van de camera`);
  ok(BEWEGINGEN.every((m) => gezien.has(m)), 'alle vier de bewegingen komen voor');
  const vast = maakBeeld(MENU_PLEKKEN[0], rng(1), { hoek: 300, uur: 9.5, beweging: 'zweef' });
  ok(Math.abs(deg(vast.theta) - 300) < 1e-9 && vast.uur === 9.5 && vast.beweging === 'zweef', 'hoek, uur en beweging zijn vast te leggen (voor de opnames)');
  const k1 = kiesKantEnUur({ ...MENU_PLEKKEN[0], hoek: [100, 160] }, rng(2));
  ok(Number.isFinite(k1.theta) && UREN.includes(k1.uur), 'ook een kant zonder zonuur geeft een uur (het dichtstbijzijnde)');
}

// ---- in het menu ----
{
  const ss = read('game/js/startscreen.js');
  ok(/from '\.\/menuplekken\.js'/.test(ss) && /kiesVolgende\(pool, verleden/.test(ss), 'startscreen.js kiest met menuplekken.js');
  ok(/window\.__menuStart\s*=/.test(ss) && /makeMenuGate\(\)/.test(ss) && /gate\.step\(/.test(ss), 'de menupoort en __menuStart staan er nog');
  ok(/if \(!intro\) \{\s*const first = nextSpot\(\);\s*cutTo\(first\);/.test(ss), 'de eerste plek staat klaar voordat de poort kijkt');
  ok(/function menuStorage\(\) \{\s*try \{ return window\.localStorage; \} catch/.test(ss), 'de opslag wordt veilig gelezen');
  ok(/extraDone && tilesReady/.test(ss), 'de poort wacht ook op de tegels rond de eerste plek');
  ok(/registerShots\(\[\{ at: \[spot\.x, spot\.y\] \}\]/.test(ss) && /map\.releaseShots\(\)/.test(ss), 'de tegels rond een plek worden vastgehouden en bij het starten losgelaten');
  ok(/tilesReady && sp\.buildings \+ sp\.roads === 0/.test(ss) && /BLACK_MAX_S = 8/.test(ss), 'een wissel wacht (hoogstens 8 s) tot de tegels en gebouwen er zijn');
  const mainSrc = read('game/js/main.js');
  ok(/planMenuStart\(map\)/.test(mainSrc) && /import \{[^}]*planMenuStart[^}]*\} from '\.\/startscreen\.js'/.test(mainSrc), 'main.js plant de eerste plek tijdens het laden');
  ok(!/rain: 0\.[0-9]|kind: 'storm'/.test(ss.slice(ss.indexOf('const SHOT_WEATHER'), ss.indexOf('const EXTRA_SPOTS'))), 'achter het menu regent het niet (zomerlicht)');
  ok(!/Math\.PI \* 2\) \+ '|sneeuw|winter/i.test(read('game/js/menuplekken.js')), 'geen winter in de plekken');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
