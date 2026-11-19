// #955: een vluchtende wagen die niet vooruitkomt (M07: de tankwagen zat vast in een doodlopend straatje langs het Eemskanaal en de
// jacht liep uit op 'ontsnapt') telt na CHASE_STUCK_S seconden binnen CHASE_STUCK_RADIUS meter als gestopt.
//   node scripts/chasestuck_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { CHASE_STUCK_S, CHASE_STUCK_RADIUS, chaseStuckStep } = await import('../game/js/missions.js');
const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { console.log('FAIL', naam, '\n  ', e.message.split('\n')[0]); process.exitCode = 1; } };

const loop = (S, v, seconden, dt = 0.5) => { let klaar = false; for (let s = 0; s < seconden; s += dt) klaar = chaseStuckStep(S, v, dt) || klaar; return klaar; };

t('een wagen die stilstaat telt na CHASE_STUCK_S als vast, niet eerder', () => {
  const S = {}, v = { x: 1794, y: 700 };
  assert.equal(loop(S, v, CHASE_STUCK_S - 2), false, 'te vroeg');
  assert.equal(loop(S, v, 3), true, 'na de tijd');
});

t('heen en weer wiebelen (achteruit, weer vooruit) binnen de straal telt als vast', () => {
  const S = {};
  let klaar = false;
  for (let s = 0; s < CHASE_STUCK_S + 1; s += 0.5) klaar = chaseStuckStep(S, { x: 1794 + Math.sin(s) * 2, y: 700 + Math.cos(s) * 2 }, 0.5) || klaar;
  assert.equal(klaar, true);
});

t('een wagen die echt rijdt wordt nooit vast gemeld', () => {
  const S = {};
  let klaar = false;
  for (let s = 0; s < 120; s += 0.5) klaar = chaseStuckStep(S, { x: 1900 + s * 10, y: 400 }, 0.5) || klaar;
  assert.equal(klaar, false);
});

t('een stop van korter dan de tijd wordt vergeven: bij nieuwe beweging begint de klok opnieuw', () => {
  const S = {}, v = { x: 100, y: 100 };
  loop(S, v, CHASE_STUCK_S - 3);
  assert.equal(chaseStuckStep(S, { x: 100 + CHASE_STUCK_RADIUS + 1, y: 100 }, 0.5), false, 'de straal uit: nieuw anker');
  assert.equal(S.stuckT, 0);
  assert.equal(loop(S, { x: 100 + CHASE_STUCK_RADIUS + 1, y: 100 }, CHASE_STUCK_S - 2), false);
});

t('M07 (de tankwagen) heeft een vast-tekst, en de missielus gebruikt hem alleen op aanvraag', () => {
  const defs = bron('missions_defs.js');
  assert.match(defs, /Kaap de tankwagen of schiet zijn banden plat[\s\S]{0,1200}vast: 'De tankwagen zit klem\./);
  const m = bron('missions.js');
  assert.match(m, /if \(st\.vast && chaseStuckStep\(S, t, dt\)\) \{ stopChaseVehicle\(world, def, st, st\.vast\); break; \}/);
});

console.log(`chasestuck_test: ${n} checks`);
process.exit(process.exitCode || 0);
