// #977: kavelgrenzen lopen op de kaart dwars door dorpen (Marum, Oude Pekela). De dunne sloten
// van het hash-rooster weten niets van de bebouwde kom; deze test tekent het platteland met een
// nep-canvas en een `built`-gebied en kijkt of er nog een lijn binnen dat gebied valt.
//   node scripts/kavelgrenzen_test.mjs
import './node3d.mjs';
const { drawCountryDetail, builtUpAt, MAP_STYLE } = await import('../game/js/countrymap.js');
const { countryRect, setCountryBounds, setCountryFiction } = await import('../game/js/countryfield.js');
// de echte kaart is één blok; hier een klein land, zodat het platteland eromheen getekend wordt
setCountryBounds([-20000, -20000, 20000, 20000]);
// #1092: het spel tekent geen verzonnen platteland meer; de generator staat hier alleen aan om de bebouwde-komregel te toetsen
setCountryFiction(true);

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// --- de bebouwde kom van de kaart: een gebouw binnen BUILT_R --------------------------------
{
  const map = {
    buildingsNear: (x, y, r) => (Math.abs(x - 100) <= r + 6 && Math.abs(y - 50) <= r + 4 ? [{ bounds: [94, 46, 106, 54] }] : []),
  };
  ok(builtUpAt(map, 100, 50), 'op een gebouw is bebouwde kom');
  ok(builtUpAt(map, 120, 50), 'naast een gebouw (binnen de marge) is bebouwde kom');
  ok(!builtUpAt(map, 200, 50), 'ver van een gebouw niet');
  ok(!builtUpAt(null, 100, 50) && !builtUpAt({}, 100, 50), 'zonder kaart niets');
  ok(!builtUpAt(map, NaN, 50), 'een ongeldig punt is geen bebouwde kom');
}

// --- de kaarttekening: geen kavellijn binnen de bebouwde kom --------------------------------
{
  const segs = [];
  let last = null;
  const ctx = new Proxy({}, {
    get: (_, k) => {
      if (k === 'moveTo') return (x, y) => { last = [x, y]; };
      if (k === 'lineTo') return (x, y) => { if (last) segs.push([last, [x, y]]); };
      return () => {};
    },
    set: () => true,
  });
  const r = countryRect();
  // een venster buiten de echte kaart, waar het platteland getekend wordt (zoals countrymap_far_test)
  const x0 = r.cx + r.hx + 3000, y0 = r.cy;
  const size = 4000;
  drawCountryDetail(ctx, x0, y0, x0 + size, y0 + size, 0.6, MAP_STYLE);
  ok(segs.length > 50, `het platteland wordt getekend (${segs.length} lijnen)`);
  // het dorp: een blok van 400 x 400 m midden in het venster
  const B = [x0 + 1800, y0 + 1800, x0 + 2200, y0 + 2200];
  const inside = (p) => p[0] > B[0] && p[0] < B[2] && p[1] > B[1] && p[1] < B[3];
  // de kaart toetst het midden van elk stuk lijn (dat is de regel), dus telt de test dat ook
  const mid = ([a, b]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const inVillage = segs.filter((s) => inside(mid(s))).length;
  ok(inVillage > 0, `zonder bebouwde kom lopen er lijnen door het dorp (${inVillage})`);
  segs.length = 0;
  drawCountryDetail(ctx, x0, y0, x0 + size, y0 + size, 0.6, MAP_STYLE, { built: (x, y) => x > B[0] && x < B[2] && y > B[1] && y < B[3] });
  const left = segs.filter((s) => inside(mid(s))).length;
  ok(left === 0, `met een bebouwde kom houdt elke kavellijn daarbuiten op (${left} binnen)`);
  ok(segs.length > 20, `en buiten het dorp wordt er nog steeds getekend (${segs.length})`);
}

console.log(bad ? `${bad} van ${n} mislukt` : `kavelgrenzen_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
