// Doorlopend viaduct (#1339): fillRailValleys vult een kuil tussen twee dekken; geen onderbreking, sprong, object of pijlerloos stuk na de pass.
//   node scripts/viaduct_doorloop_test.mjs   (het deel op de echte kaart: zonder game/world met de provincie: SKIP)
import { fillRailValleys, spoorKetens, DECK_Z, MAX_KUIL } from '../game/js/railvalley.js';
import { heeftProvincie } from './world/viaduct_doorloop_audit.mjs';

let n = 0, bad = 0;
const ok = (c, m, i = '') => { n++; if (!c) { bad++; console.log('FAIL', m, i); } };
// een spoor langs de x-as met een punt om de 10 m en hoogte zFn(x)
const spoor = (x0, x1, zFn, y = 0) => { const pts = [], z = []; for (let x = x0; x <= x1; x += 10) { pts.push([x, y]); z.push(zFn(x)); } return { pts, z }; };
// dek (4 m) - helling omlaag - kuil (0,7 m) - helling omhoog - dek (4 m)
const kuil = (x) => (x < 300 ? 4 : x < 400 ? 4 - (x - 300) * 0.033 : x < 600 ? 0.7 : x < 700 ? 0.7 + (x - 600) * 0.033 : 4);
const dekMeters = (r) => { let m = 0; for (let i = 1; i < r.z.length; i++) if (r.z[i] >= DECK_Z && r.z[i - 1] >= DECK_Z) m += 10; return m; };

// de kuil wordt gevuld tot een doorlopend dek
{
  const r = spoor(0, 1000, kuil);
  const voor = dekMeters(r);
  const rep = fillRailValleys([r]);
  ok(rep.gevuld.length === 1, 'een kuil van 300 m tussen twee dekken wordt gevuld', JSON.stringify(rep));
  ok(r.z.every((z) => z >= DECK_Z), 'het dek loopt door over de hele lengte', Math.min(...r.z).toFixed(2));
  ok(dekMeters(r) > voor && dekMeters(r) === 1000, 'het dek is langer: de hele lijn', String(dekMeters(r)));
  let sprong = 0; for (let i = 1; i < r.z.length; i++) sprong = Math.max(sprong, Math.abs(r.z[i] - r.z[i - 1]) / 10);
  ok(sprong < 0.04, 'geen hoogtesprong: de lijn glooit rustig', sprong.toFixed(3));
  ok(r.z[0] === 4 && r.z[r.z.length - 1] === 4, 'de eindpunten blijven zoals ze waren');
  const rep2 = fillRailValleys([r]);
  ok(rep2.gevuld.length === 0, 'een tweede keer verandert er niets (idempotent)');
}
// niets te vullen: een spoor zonder kuil, een kuil zonder dek aan een kant, een kuil die te lang is
{
  const vlak = spoor(0, 500, () => 4), voorVlak = vlak.z.join();
  fillRailValleys([vlak]);
  ok(vlak.z.join() === voorVlak, 'een doorlopend dek blijft zoals het is');
  const dijk = spoor(0, 1000, (x) => (x < 300 ? 4 : 0.5));
  const voorDijk = dijk.z.join();
  ok(fillRailValleys([dijk]).gevuld.length === 0 && dijk.z.join() === voorDijk, 'een dek dat eindigt (geen dek aan de andere kant) blijft eindigen: het logische einde');
  const lang = spoor(0, 2000, (x) => (x < 300 || x > 1500 ? 4 : 0.3));
  const rl = fillRailValleys([lang]);
  ok(rl.gevuld.length === 0 && rl.geblokkeerd.some((g) => g.reden === 'te lang'), `een dal langer dan ${MAX_KUIL} m is een echt dal`);
}
// hindernissen houden de kuil laag: een perron of overweg, een weg op maaiveld, een gebouw
{
  const mk = () => spoor(0, 1000, kuil);
  const a = mk(); const ra = fillRailValleys([a], { pins: [[500, 0, 30]] });
  ok(ra.gevuld.length === 0 && ra.geblokkeerd[0].reden === 'perron of overweg' && Math.min(...a.z) < 1, 'een perron of overweg in de kuil blijft op maaiveld');
  const b = mk(); const rb = fillRailValleys([b], { obstacle: (x) => (x > 480 && x < 520 ? 'weg op maaiveld onder het dek' : null) });
  ok(rb.gevuld.length === 0 && /weg/.test(rb.geblokkeerd[0].reden), 'een weg op maaiveld onder het nieuwe dek: de kuil blijft (geen dek zonder vrije hoogte)');
  const c = mk(); const rc = fillRailValleys([c], { obstacle: (x) => (x < 250 ? 'gebouw onder het dek' : null) });
  ok(rc.gevuld.length === 1, 'een hindernis buiten de kuil (onder het bestaande dek) telt niet');
}
// twee parallelle sporen die op een wissel samenkomen: beide takken worden gevuld (de tweede in een volgende ronde)
{
  const a = spoor(0, 1000, kuil, 0), b = spoor(0, 1000, kuil, 4.5);
  // ze delen het punt op x=500: een wissel van twee sporen aan een kant, een enkel spoor aan de andere
  const gedeeld = { pts: [[500, 2], [510, 2]], z: [0.7, 0.7] };
  a.pts.forEach((p, i) => { if (p[0] === 500) a.pts[i] = [500, 2]; if (p[0] === 510) a.pts[i] = [510, 2]; });
  b.pts.forEach((p, i) => { if (p[0] === 500) b.pts[i] = [500, 2]; if (p[0] === 510) b.pts[i] = [510, 2]; });
  void gedeeld;
  fillRailValleys([a, b]);
  ok(Math.min(...a.z) >= DECK_Z && Math.min(...b.z) >= DECK_Z, 'beide sporen van een paar worden doorlopend', `${Math.min(...a.z)} ${Math.min(...b.z)}`);
}
ok(spoorKetens([spoor(0, 100, () => 0)]).length === 1, 'een rij is een keten');

// de echte kaart: stad en provincie
if (!heeftProvincie()) {
  console.log('SKIP viaduct_doorloop_test (echte kaart): geen game/world met de provincie');
} else {
  const A = await import('./world/viaduct_doorloop_audit.mjs');
  const PF = await import('../game/js/propfilter.js');
  const { map, rails } = await A.laadAlleSporen();
  const voor = A.dekStats(rails), kop = A.kopie(rails);
  const rep = fillRailValleys(kop, (await import('../game/js/railvalley.js')).kaartHindernis(map, PF));
  const na = A.dekStats(kop);
  ok(rep.gevuld.some((g) => Math.hypot(g.x + 799, g.y + 909) < 40), 'de kuil bij de Moesstraat (de dip naar 0,7 m) is gevuld');
  ok(na.stukken < voor.stukken && na.meters > voor.meters, `minder dekstukken (${voor.stukken} -> ${na.stukken}), meer dek (${voor.meters} -> ${na.meters} m)`);
  const slecht = A.auditDek(kop, map, PF);
  const nieuw = (soort) => slecht.filter((b) => b.soort === soort);
  for (const soort of ['onderbreking', 'hoogtesprong', 'object-in-dek', 'vrije-hoogte']) ok(nieuw(soort).length === 0, `geen ${soort} in het hele spoornet na de pass`, JSON.stringify(nieuw(soort).slice(0, 3)));
  // een dek zonder pijlerplek bestond al in de wereldbouw en wordt door de pass niet erger
  const voorBad = A.auditDek(A.kopie(rails), map, PF).filter((b) => b.soort === 'dek-zonder-pijlers').length;
  ok(nieuw('dek-zonder-pijlers').length <= voorBad, 'de pass maakt geen dek zonder pijlers erbij', `${nieuw('dek-zonder-pijlers').length} tegen ${voorBad}`);
  ok(rep.geblokkeerd.every((g) => g.reden), 'elke kuil die blijft heeft een reden');
}

console.log(bad ? `${bad} van ${n} mislukt` : `viaduct_doorloop_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
