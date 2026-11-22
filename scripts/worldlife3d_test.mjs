// Wereld levend, tekenkant (game/js/worldlife3d.js, 21-11): drie instanced meshes, de limieten, de bubbels in world.extraSpeakers.
// Heeft de gebundelde three nodig (cd desktop && npm run stage); zonder die slaat de test zichzelf over.
// node scripts/worldlife3d_test.mjs
import './node3d.mjs';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
let W3, W;
try { W3 = await import('../game/js/worldlife3d.js'); W = await import('../game/js/worldlife.js'); } catch (e) { console.log(`overgeslagen: ${String(e.message).slice(0, 90)}`); process.exit(0); }

const added = [];
const scene = { add: (o) => added.push(o) };
const place = W.LIFE_PLACES.vismarkt;
const world = { calendar: { day: 1 }, clock: 11, time: 0, extraSpeakers: [] }; // dag 1 is vrijdag: marktdag
let calls = 0, maxSpeak = 0, naam = false;
for (let f = 0; f < 600; f++) {
  world.time += 0.1;
  calls = W3.updateWorldLife(scene, world, place.x, place.y, 0.1);
  const sp = world.extraSpeakers.filter((e) => e.mgTag === 'wereldleven');
  maxSpeak = Math.max(maxSpeak, sp.length);
  if (sp.some((e) => e.speechName)) naam = true;
}
const group = added[0];
ok(added.length === 1 && group && group.name === 'wereldleven', 'een groep in de scène');
const meshes = group.children;
ok(meshes.length === 3 && meshes.every((m) => m.isInstancedMesh), 'precies drie InstancedMesh-objecten');
ok(calls === 3, 'op een marktdag kost het drie draw calls', String(calls));
ok(meshes[0].count > 8 && meshes[0].count <= W.LIFE_LIMITS.maxPeople && meshes[0].count === meshes[1].count, 'mensen: lichamen en hoofden gelijk en binnen de limiet', String(meshes[0].count));
ok(meshes[2].count > 0 && meshes[2].count <= W.LIFE_LIMITS.maxAnimals, 'dieren binnen de limiet', String(meshes[2].count));
ok(meshes.every((m) => m.instanceMatrix.count === (m === meshes[2] ? W.LIFE_LIMITS.maxAnimals : W.LIFE_LIMITS.maxPeople)), 'de buffers hebben de vaste limiet als grootte');
ok(maxSpeak >= 1 && maxSpeak <= 2 && !naam, 'bubbels: 1 tot 2 tegelijk, zonder sprekernaam', String(maxSpeak));
ok(world.extraSpeakers.every((e) => e.mgTag !== 'wereldleven' || (e.speechUntil > world.time - 0.01 && typeof e.speechText === 'string')), 'elke bubbel heeft tekst en een einde');
// ver weg: niets tekenen, geen bubbels, geen draw calls
const ver = W3.updateWorldLife(scene, world, 5e5, 5e5, 0.1);
ok(ver === 0 && group.visible === false && !world.extraSpeakers.some((e) => e.mgTag === 'wereldleven'), 'ver weg: onzichtbaar, 0 draw calls, geen bubbels');
// Samen spelen (review 22-11): een gast gebruikt de dag van de host, niet de kalender van zijn eigen save
ok(W3.lifeDay({ calendar: { day: 5 } }) === 5, 'alleen spelen: de eigen kalender');
ok(W3.lifeDay({ coopRole: 'client', coopDag: 9, calendar: { day: 5 } }) === 9, 'gast: de dag van de host');
ok(W3.lifeDay({ coopRole: 'client', calendar: { day: 5 } }) === 5, 'gast zonder hostdag (nog niet binnen): eigen kalender');
ok(W3.lifeDay({ coopRole: 'host', coopDag: 9, calendar: { day: 5 } }) === 5, 'host: eigen kalender');
// geen nieuwe array per beeld zonder eigen bubbels
{
  const arr = [{ mgTag: 'iets-anders', speechUntil: 1e9 }];
  const w2 = { calendar: { day: 1 }, clock: 11, time: 0, extraSpeakers: arr };
  W3.updateWorldLife(scene, w2, 5e5, 5e5, 0.1);
  ok(w2.extraSpeakers === arr, 'leeg rooster: dezelfde array, geen allocatie per beeld');
}
console.log(`${n - fails}/${n} checks ok`);
process.exit(fails ? 1 : 0);
