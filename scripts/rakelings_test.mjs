// Rakelings (#502): de detectie uit game/js/achievementtracker.js nagebootst.
//   node scripts/rakelings_test.mjs
//
// achievementtracker.js is niet in Node te laden (three.js van de CDN, en het is een lus over de
// wereld), dus dit testbestand doet twee dingen:
//   1. het leest de echte drempels (NEAR_MISS_GAP, NEAR_MISS_SPEED, NEAR_MISS_PASS,
//      NEAR_MISS_CLEAR) uit de bron, zodat de nabootsing niet stil kan afdrijven;
//   2. het herhaalt de twee lussen van trackVehicle() stap voor stap: kandidaat maken bij
//      langszij komen, en tellen zodra het paar verder uit elkaar staat dan op dat moment.
// Zo bewijst de test dat een echte inhaalactie op een stadsweg precies één keer telt en dat een
// auto die blijft hangen, een botsing of stilstand nooit telt.
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../game/js/achievementtracker.js', import.meta.url), 'utf8');
const GAP = Number((SRC.match(/const NEAR_MISS_GAP = ([0-9.]+)/) || [])[1]);
const SPEED = Number((SRC.match(/const NEAR_MISS_SPEED = ([0-9.]+)/) || [])[1]);
const PASS = Number((SRC.match(/const NEAR_MISS_PASS = ([0-9.]+)/) || [])[1]);
const CLEAR = Number((SRC.match(/const NEAR_MISS_CLEAR = ([0-9.]+)/) || [])[1]);

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// --- de nabootsing van trackVehicle (alleen het rakelingsdeel) ------------------------------
function makeDetectie() {
  const nearCand = new Map();
  const lastHitWith = new Map();
  let geteld = 0;
  return {
    get geteld() { return geteld; },
    get kandidaten() { return nearCand.size; },
    step(w, pv) {
      if (!pv || pv.isBoat || pv.wrecked) { nearCand.clear(); return; }
      const small = pv.isBike || pv.isScooter;
      if (!small && Math.abs(pv.speed) > SPEED) {
        const c = Math.cos(pv.angle), s = Math.sin(pv.angle);
        for (const o of w.vehicles) {
          if (o === pv || o.wrecked || o.isBoat || nearCand.has(o.id)) continue;
          const dx = o.x - pv.x, dy = o.y - pv.y;
          if (dx * dx + dy * dy > 100) continue;
          const lx = dx * c + dy * s, ly = -dx * s + dy * c;
          const gap = Math.abs(ly) - (pv.halfWid + o.halfWid);
          if (Math.abs(lx) < pv.halfLen + o.halfLen && gap > 0 && gap < GAP) {
            nearCand.set(o.id, { o, t: w.time, gap, dist: Math.hypot(dx, dy), sameDir: 1 });
          }
        }
      }
      for (const [id, cand] of nearCand) {
        const o = cand.o;
        const dist = Math.hypot(o.x - pv.x, o.y - pv.y);
        if (dist > CLEAR || o.wrecked) { nearCand.delete(id); continue; }
        if (cand.done) continue;
        if (!(Math.abs(pv.speed) > 1)) continue;
        if (!(dist > cand.dist + PASS)) continue;
        cand.done = true;
        if ((lastHitWith.get(id) ?? -99) < cand.t - 0.5) geteld++;
      }
    },
  };
}

const car = (id, x, y, speed, extra = {}) => ({
  id, x, y, angle: 0, speed, halfLen: 4.4, halfWid: 0.9, isBoat: false, wrecked: false, ...extra,
});

// Rijdt beide auto's langs een place()-functie; elke stap is een frame van 1/60 s.
function drive(d, w, pv, o, seconds, place) {
  const dt = 1 / 60;
  for (let i = 1; i <= Math.round(seconds / dt); i++) {
    w.time = i * dt;
    place(w.time, pv, o);
    d.step(w, pv);
  }
}

// --- 0. de drempels staan zoals bedoeld ----------------------------------------------------
ok(GAP >= 1.8 && GAP <= 2.0, 'drempel past bij een stadsweg', GAP);
ok(SPEED <= 13.9, '50 km/u valt binnen de snelheidsdrempel', SPEED);
ok(PASS > 0 && PASS < GAP, 'kleine marge op de toename', PASS);
ok(CLEAR >= 10, 'opruimafstand ligt buiten het kandidatenbereik', CLEAR);
ok(SRC.includes('dist > cand.dist + NEAR_MISS_PASS'), 'bron telt op afstandstoename');
ok(!/const far = Math\.hypot/.test(SRC) && !/w\.time - cand\.t < 3/.test(SRC), 'geen 12 m-binnen-3 s-regel meer');
ok(/gap > 0 && gap < NEAR_MISS_GAP/.test(SRC), 'botsing (gap <= 0) valt af');

// --- 1. een gewone stadsweg: langs elkaar op 3,4 m hart op hart ------------------------------
// Rijstrookmiddens 3,4 m, auto's 1,8 m breed -> 1,6 m vrije ruimte: met de oude 0,9 m nooit een
// kandidaat, met 1,9 m wel. De een haalt de ander in met 50 tegen 40 km/u.
{
  const d = makeDetectie();
  const pv = car('pv', 0, 0, 50 / 3.6);
  const o = car('o', 9, 3.4, 40 / 3.6);
  const w = { time: 0, vehicles: [pv, o] };
  drive(d, w, pv, o, 14, (t, a, b) => { a.x = (50 / 3.6) * t; b.x = 9 + (40 / 3.6) * t; });
  ok(d.geteld === 1, 'inhalen op de stadsweg telt precies één keer', d.geteld);
}

// --- 2. blijven hangen: zelfde snelheid, geen toename ---------------------------------------
for (const ruis of [0, 0.08]) {
  const d = makeDetectie();
  const pv = car('pv', 0, 0, 50 / 3.6);
  const o = car('o', 0, 3.4, 50 / 3.6);
  const w = { time: 0, vehicles: [pv, o] };
  drive(d, w, pv, o, 20, (t, a, b) => {
    a.x = (50 / 3.6) * t;
    b.x = a.x;
    b.y = 3.4 + (ruis ? ruis * Math.sin(t * 17) : 0); // frame-ruis op de zijdelingse positie
  });
  ok(d.geteld === 0, `blijft naast je rijden telt niet${ruis ? ' (met ruis)' : ''}`, d.geteld);
}

// --- 3. een botsing telt niet ---------------------------------------------------------------
{
  const d = makeDetectie();
  const pv = car('pv', 0, 0, 50 / 3.6);
  const o = car('o', 4, 1.0, 50 / 3.6); // 1,0 m hart op hart bij 1,8 m breed: gap = -0,8
  const w = { time: 0, vehicles: [pv, o] };
  drive(d, w, pv, o, 4, (t, a, b) => { a.x = (50 / 3.6) * t; b.x = 4 + (50 / 3.6) * t; });
  ok(d.geteld === 0, 'botsing (gap <= 0) telt niet', d.geteld);
  ok(d.kandidaten === 0, 'een botsing wordt niet eens een kandidaat', d.kandidaten);
}

// --- 4. stilstand telt niet, ook niet als de ander wegrijdt ---------------------------------
{
  const d = makeDetectie();
  const pv = car('pv', 0, 0, 0);
  const o = car('o', 0, 3.4, 30 / 3.6);
  const w = { time: 0, vehicles: [pv, o] };
  drive(d, w, pv, o, 6, (t, a, b) => { b.x = (30 / 3.6) * t; });
  ok(d.geteld === 0, 'stilstand telt niet', d.geteld);
}

// --- 5. 30 km/u is te langzaam, ook op dezelfde afstand -------------------------------------
{
  const d = makeDetectie();
  const pv = car('pv', 0, 0, 30 / 3.6);
  const o = car('o', 9, 3.4, 20 / 3.6);
  const w = { time: 0, vehicles: [pv, o] };
  drive(d, w, pv, o, 14, (t, a, b) => { a.x = (30 / 3.6) * t; b.x = 9 + (20 / 3.6) * t; });
  ok(d.geteld === 0, '30 km/u telt niet', d.geteld);
}

// --- 6. later, echt uit elkaar geweest: dan telt een nieuwe pass weer ------------------------
{
  const d = makeDetectie();
  const pv = car('pv', 0, 0, 50 / 3.6);
  const o = car('o', 9, 3.4, 40 / 3.6);
  const w = { time: 0, vehicles: [pv, o] };
  drive(d, w, pv, o, 14, (t, a, b) => { a.x = (50 / 3.6) * t; b.x = 9 + (40 / 3.6) * t; });
  ok(d.geteld === 1, 'eerste pass', d.geteld);
  // dezelfde auto's, opnieuw van achteren benaderd: eerst een frame of wat ruim buiten bereik
  const start = w.time;
  drive(d, w, pv, o, 1, (t, a, b) => { a.x = 100 + (50 / 3.6) * t; b.x = 100 + 40 * t; });
  ok(d.kandidaten === 0, 'ver uit elkaar: kandidaat opgeruimd', d.kandidaten);
  drive(d, w, pv, o, 14, (t, a, b) => {
    const lt = t - start - 1;
    a.x = 100 + (50 / 3.6) * lt;
    b.x = 109 + (40 / 3.6) * lt;
  });
  ok(d.geteld === 2, 'tweede pass telt er weer één bij', d.geteld);
}

console.log(`rakelings_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
