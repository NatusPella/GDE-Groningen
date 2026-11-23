// Schietgevoel (game/js/combatfeel.js): vaste hand per houding en de raakbevestiging.
import { readFileSync } from 'node:fs';
import { steadiness, kickFactor, STEADY, makeHitMark, markHit, hitMarkActive, hitMarkOpacity, hitMarkScale, HIT_MARK_S, hitNetBody, hitFromNet, hitNetDue, HIT_NET_GAP } from '../game/js/combatfeel.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// vaste hand: gebukt en stil het rustigst, sprinten het wildst, monotoon met de snelheid
ok(steadiness(0, true) === STEADY.crouch, 'gebukt en stil is het rustigst');
ok(steadiness(0, false) === STEADY.still, 'stilstaan');
ok(Math.abs(steadiness(3.0, false) - STEADY.walk) < 0.06, 'joggen is ongeveer de basis', steadiness(3.0, false));
ok(steadiness(6.8, false) === STEADY.sprint && steadiness(40, false) === STEADY.sprint, 'sprinten is het maximum');
ok(steadiness(1.4, true) === STEADY.still, 'gebukt sluipen is als stilstaan');
ok(steadiness(20, false, true) === 1 && steadiness(0, true, true) === 1, 'vanuit een voertuig verandert niets');
ok(steadiness(NaN, false) === STEADY.still && steadiness(undefined, false) === STEADY.still, 'kapotte snelheid telt als stil');
ok(steadiness(-6.8, false) === STEADY.sprint, 'richting maakt niet uit');
{
  let prev = 0;
  for (let v = 0; v <= 10; v += 0.1) { const s = steadiness(v, false); ok(s >= prev - 1e-9, 'monotoon', v); prev = s; }
}
ok(STEADY.crouch < STEADY.still && STEADY.still < STEADY.walk && STEADY.walk < STEADY.sprint, 'volgorde van de houdingen');
// de spreiding bij stilstaan is wat ze altijd was (0,02 rad): SHOT_JITTER * still
{
  const src = readFileSync(new URL('../game/js/combat.js', import.meta.url), 'utf8');
  const m = /const SHOT_JITTER = ([0-9.]+);/.exec(src);
  ok(!!m && Math.abs(Number(m[1]) * STEADY.still - 0.02) < 0.0005, 'stilstaan houdt de oude spreiding van 0,02 rad', m && m[1]);
  ok(src.includes('* SHOT_JITTER * steady'), 'combat.js schaalt de spreiding met de houding');
  ok(src.includes('steadiness(Math.hypot(p.vx || 0, p.vy || 0), p.crouching, !!v)'), 'de houding komt van het lichaam dat schiet (ook dat van een gast)');
  ok(/if \(b\.dader\) \{ if \(world\.coopRaak\) world\.coopRaak\(b\.dader, x, y, [^;]+, kind\); return; \}/.test(src), 'de kogel van een gast tekent niets bij de gastheer, maar gaat als raak naar de gast (#1290)');
  // vier keer in de bron: de definitie en drie aanroepen
  ok(src.split('hitConfirm(world, b, ').length - 2 === 3, 'drie haken: voetganger, voertuig, medespeler');
  ok(!src.includes('hitConfirm(world, b, w.'), 'een muur geeft geen raakbevestiging');
}
// terugslag: gedempt gevolg van de houding, begrensd
ok(kickFactor(STEADY.crouch) === 0.7, 'gebukt: 30% minder terugslag', kickFactor(STEADY.crouch));
ok(Math.abs(kickFactor(STEADY.walk) - 1) < 1e-9, 'lopen: ongewijzigd');
ok(kickFactor(STEADY.sprint) <= 1.25 && kickFactor(STEADY.sprint) > 1, 'sprinten: iets meer, begrensd', kickFactor(STEADY.sprint));
ok(kickFactor(99) === 1.25 && kickFactor(0) === 0.7, 'grenzen');

// raakbevestiging: kort, hergebruikt hetzelfde object, dooft uit
{
  const m = makeHitMark();
  ok(!hitMarkActive(m, 0) && hitMarkOpacity(m, 0) === 0, 'in rust onzichtbaar');
  ok(!hitMarkActive(null, 1) && hitMarkOpacity(undefined, 1) === 0, 'zonder staat onzichtbaar');
  const same = markHit(m, 10, 1, 2, 3, 'voertuig');
  ok(same === m && m.x === 1 && m.y === 2 && m.z === 3 && m.kind === 'voertuig', 'hergebruikt het object, bewaart de plek');
  ok(hitMarkActive(m, 10) && hitMarkOpacity(m, 10) === 1, 'meteen vol zichtbaar');
  ok(hitMarkScale(m, 10) > 1.3 && hitMarkScale(m, 10.07) === 1, 'begint wijd en sluit');
  ok(hitMarkScale(m, 10, true) === 1 && hitMarkScale(m, 10.03, true) === 1, 'bewegingsreductie: geen beweging');
  let prev = 2;
  for (let t = 10; t < 10.3; t += 0.01) { const o = hitMarkOpacity(m, t); ok(o <= prev + 1e-9 && o >= 0 && o <= 1, 'dooft monotoon uit', t); prev = o; }
  ok(!hitMarkActive(m, 10 + HIT_MARK_S) && hitMarkOpacity(m, 10 + HIT_MARK_S + 0.01) === 0, 'weg na de duur');
  ok(HIT_MARK_S <= 0.3, 'korter dan 0,3 s: geen blijvend teken');
  markHit(m, 10.1, 5, 5, 1); // een tweede kogel (hagel) ververst
  ok(hitMarkOpacity(m, 10.1) === 1 && m.kind === 'doel', 'een nieuwe treffer ververst');
  ok(!hitMarkActive(m, 9.9), 'voor het tijdstip (klok teruggezet) niet actief');
}
// tekenen: abstract HUD-teken, alleen aangeraakt als er iets te zien is
{
  const src = readFileSync(new URL('../game/js/aimassist.js', import.meta.url), 'utf8');
  ok(src.includes("hitEl.setAttribute('aria-hidden', 'true');"), 'het teken is aria-hidden');
  ok(src.includes("if (hitShown) { hitEl.style.opacity = '0'; hitShown = false; }"), 'geen DOM-schrijfactie per frame in rust');
  ok(src.includes("renderHitMark(world, !b.contains('game-started') || b.contains('cine-hide-hud') || world.paused);"), 'verborgen in filmpjes en pauze');
}

// #1290: de gast ziet de raakbevestiging van zijn eigen kogel (bericht 'raak' van de gastheer)
{
  const b = hitNetBody(12.34, -5.06, 1.25, 'voertuig');
  ok(b && b.k === 'raak' && b.x === 12.3 && b.y === -5.1 && b.soort === 'voertuig', 'klein bericht, op 10 cm afgerond', JSON.stringify(b));
  ok(hitNetBody(NaN, 0, 1, 'doel') === null && hitNetBody(0, 0, 1, 'muur') === null, 'geen bericht voor NaN of een muur');
  const h = hitFromNet(b);
  ok(h && h.kind === 'voertuig' && h.x === 12.3, 'de gast leest het terug');
  ok(hitFromNet({ x: 1, y: 2, z: 'a', soort: 'doel' }) === null && hitFromNet({ x: 1, y: 2, z: 1, soort: '<b>' }) === null && hitFromNet(null) === null, 'een onzinbericht tekent niets');
  ok(hitNetDue(undefined, 5) && !hitNetDue(5, 5 + HIT_NET_GAP / 2) && hitNetDue(5, 5 + HIT_NET_GAP) && hitNetDue(9, 1), 'hooguit eens per HIT_NET_GAP s per gast (een nieuwe sessie met een lagere klok mag meteen)');
  const net = readFileSync(new URL('../game/js/coopnet.js', import.meta.url), 'utf8');
  ok(/case 'raak':/.test(net) && /world\.coopRaak = \(slot/.test(net) && /world\.coopRaak = null/.test(net), 'coopnet stuurt raak naar de schutter, de gast tekent hem en het einde van de sessie ruimt de haak op');
}
console.log(`combatfeel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
