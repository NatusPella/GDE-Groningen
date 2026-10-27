// De missieketen per groep (#492): de houder in game/js/missions.js houdt per sleutel een eigen keten.
// Deze test haalt het houderblok tussen de markers uit missions.js en draait het zoals het daar staat,
// zodat er geen tweede kopie van de regel kan afwijken. missions.js zelf is een browsermodule en
// laadt niet in node (three.js via een https-import), vandaar deze route.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
const BEGIN = '// --- ketenhouder begin ---';
const EIND = '// --- ketenhouder eind ---';
const van = src.indexOf(BEGIN);
const tot = src.indexOf(EIND);
assert.ok(van >= 0 && tot > van, 'missions.js heeft het ketenhouder-blok met markers');
const blok = src.slice(van + BEGIN.length, tot);

// `worldRef` hoort in missions.js bij het bestand (de wereld waarmee het start); hier is het een
// lokale variabele zodat de test hem kan omzetten, precies zoals initMissions dat doet.
const houder = () => new Function(
  `let worldRef = null;\n${blok}\nreturn { chains, chainKey, chainState, setChainState, zetWereld: (w) => { worldRef = w; } };`,
)();

let n = 0;
const ok = (c, naam) => { n++; if (!c) { console.log(`FAIL ${naam}`); process.exitCode = 1; } };

// --- zonder wereld: null, en het gooit niet
{
  const h = houder();
  ok(h.chainState() === null, 'chainState() zonder wereld geeft null');
  ok(h.chainKey() === null, 'chainKey() zonder wereld geeft null');
  ok(h.setChainState({ index: 3 }) && h.chainState() === null, 'setChainState() zonder wereld bewaart niets en gooit niet');
}

// --- met een wereld maar zonder keten: null
{
  const h = houder();
  const world = {};
  ok(h.chainState(world) === null, 'een wereld zonder keten geeft null');
  ok(h.chainKey(world) === 0, 'zonder groepen is de sleutel 0');
}

// --- twee sleutels, twee ketens
{
  const h = houder();
  const host = { coopGroepSleutel: 0 };
  const gast = { coopGroepSleutel: 1 };
  h.zetWereld(host); // zoals initMissions: de wereld van dit bestand
  const eigen = h.setChainState({ index: 2, completed: new Set([1, 2]), label: 'host' });
  ok(h.chainState() === eigen && h.chainState(host) === eigen, 'de standaardsleutel geeft wat er eerst was');

  ok(h.setChainState({ index: 7, completed: new Set([9]), label: 'gast' }, gast).label === 'gast', 'de gast krijgt zijn eigen keten');
  ok(h.chainState(gast).index === 7 && h.chainState(host).index === 2, 'twee sleutels houden twee ketens');
  ok(h.chainState().index === 2, 'de eigen keten blijft staan na een schrijfactie op de andere');

  // een schrijfactie op de ene sleutel laat de andere ongemoeid, ook in de diepte
  h.chainState(gast).completed.add(10);
  h.setChainState({ index: 8, completed: new Set(), label: 'gast2' }, gast);
  ok(h.chainState(host).completed.has(10) === false && h.chainState(host).completed.size === 2, 'de keten van de host blijft ongemoeid');
  ok(h.chainState(gast).label === 'gast2' && h.chainState(host).label === 'host', 'de nieuwe keten van de gast raakt de host niet');

  // een derde sleutel begint leeg en raakt de eerste twee niet
  const derde = { coopGroepSleutel: 2 };
  ok(h.chainState(derde) === null, 'een nieuwe groep begint zonder keten');
  h.setChainState({ index: 0 }, derde);
  ok(h.chainState(host).index === 2 && h.chainState(gast).index === 8 && h.chainState(derde).index === 0, 'drie ketens naast elkaar');
}

// --- de bedrading in missions.js zelf
{
  ok(!/^\s*let chain = null;/m.test(src), 'de oude modulevariabele chain is weg');
  ok(/setChainState\(\{/.test(src), 'initMissions zet de keten via setChainState');
  const lezers = (src.match(/chainState\(\)/g) || []).length;
  ok(lezers > 600, `de lezers gaan via chainState() (${lezers} sites)`);
  // geen kale `chain`-toegang of -opdracht meer: alles loopt via de houder
  ok((src.match(/(^|[^.\w$])chain\./gm) || []).length === 0, 'geen chain.veld-toegang meer');
  ok((src.match(/(^|[^.\w$])chain\s*=/gm) || []).length === 0, 'geen toewijzing aan chain meer');
  ok((src.match(/chain: chainState\(\),/g) || []).length === 1, 'de shorthand in makeCheckpoint is mee omgezet');
}

console.log(`mission_chain_test: ${n}/${n} ok`);
