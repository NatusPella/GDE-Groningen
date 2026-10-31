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
  `let worldRef = null;\n${blok}\nreturn { chains, chainKey, chainState, setChainState, setChainKey, zetWereld: (w) => { worldRef = w; } };`,
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

// --- de keten verhuist mee naar de sleutel van de sessie (#523)
{
  const h = houder();
  const world = {};
  h.zetWereld(world);
  h.setChainState({ index: 4, completed: new Set([1]), armed: false, label: 'eigen' });

  ok(h.setChainKey(world, 'sessie-a') === 'sessie-a', 'setChainKey geeft de nieuwe sleutel terug');
  ok(h.chainKey(world) === 'sessie-a' && world.coopGroepSleutel === 'sessie-a', 'de wereld kent de sessiesleutel');
  ok(h.chainState(world).label === 'eigen', 'de keten loopt door onder de nieuwe sleutel');
  ok(h.chains.has(0) === false, 'onder de oude sleutel blijft niets achter');

  // de eigen opdracht loopt door, ook als de sessie een andere index heeft opgeschoven
  h.chainState(world).index = 9;
  ok(h.setChainKey(world, null) === 0 && h.chainState(world).index === 9, 'bij het einde komt de keten terug op 0 met dezelfde stand');
  ok(h.chains.has('sessie-a') === false, 'de sessiesleutel is opgeruimd');

  // een volgende sessie begint waar de eigen wereld staat, niet met wat de vorige sessie deed
  h.setChainState({ index: 2, completed: new Set(), armed: true }, { coopGroepSleutel: 0 });
  h.setChainKey(world, 'sessie-b');
  ok(h.chainState(world).index === 2, 'de nieuwe sessie erft de oude sessieketen niet');
  ok(h.chains.has('sessie-a') === false, 'en de oude sessiesleutel blijft weg');
}

// --- de bedrading zelf: missions.js hangt de haak op de wereld, coopnet.js zet en wist hem (#523)
{
  ok(/world\.coopKetenZet = \(key\) => setChainKey\(world, key\);/.test(src), 'initMissions geeft de wereld de ketenhaak');

  const net = fs.readFileSync(new URL('../game/js/coopnet.js', import.meta.url), 'utf8');
  ok(/zetKetenSleutel\(world, hub\.id\)/.test(net), 'de gastheer zet de sleutel op de vaste id van de hub');
  ok(/zetKetenSleutel\(world, s\.sessie && s\.sessie\.id \? s\.sessie\.id : null\)/.test(net), 'een gast neemt de sleutel uit het welkom');
  ok(/zetKetenSleutel\(world, null\)/.test(net), 'stopCoopNet wist de sleutel');
  ok(/typeof world\.coopKetenZet === 'function'/.test(net), 'zonder missies (een testwereld) is de haak een no-op');
}

// --- heen en terug over de echte sessie: gastheer, gast en het einde (#523)
{
  const N = await import('../game/js/coopnet.js');
  const { createLink } = await import('../game/js/net/memtransport.js');
  const hInf = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
  const mk = (h) => {
    const world = { player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false } };
    world.coopKetenZet = (key) => h.setChainKey(world, key); // precies de haak uit initMissions
    h.zetWereld(world);
    h.setChainState({ index: 5, completed: new Set([3, 4]), armed: false, label: 'eigen keten' });
    return world;
  };
  const hh = houder(), hg = houder();
  const host = mk(hh), gast = mk(hg);
  N.startHost(host, hInf, { seed: 7, max: 4 });
  const sessieId = host.coopNet.hub.id;
  ok(typeof sessieId === 'string' && sessieId.length > 0, 'de hub heeft een vaste id voor deze sessie');
  ok(host.coopGroepSleutel === sessieId, 'de gastheer speelt zijn keten onder de sessiesleutel');
  ok(hh.chainState(host).index === 5, 'en zijn eigen opdracht staat er nog');

  const link = createLink({ latency: 0.03, seed: 21 });
  N.addGuest(host, link.a);
  N.startClient(gast, link.b, hInf, {});
  for (let k = 0; k < 120; k++) { N.tickCoopNet(host, 1 / 60); N.tickCoopNet(gast, 1 / 60); link.advance(1 / 60); host.time += 1 / 60; gast.time += 1 / 60; }
  ok(!!(gast.coopNet && gast.coopNet.session.joined), 'de gast zit in de sessie');
  ok(gast.coopGroepSleutel === sessieId, 'de gast gebruikt dezelfde sessiesleutel als de gastheer');

  // twee werelden in dezelfde sessie: elk houdt zijn eigen index, completed en armed
  hh.chainState(host).index = 6; hh.chainState(host).armed = true;
  ok(hg.chainState(gast).index === 5 && hg.chainState(gast).armed === false, 'de keten van de gast blijft ongemoeid');
  ok(hh.chainState(host).completed.has(4) && hg.chainState(gast).completed.has(4), 'elk heeft zijn eigen set');
  ok(hh.chains !== hg.chains, 'twee werelden, twee houders');

  N.stopCoopNet(host);
  ok(host.coopGroepSleutel === 0, 'na het einde staat de gastheer weer op zijn eigen wereld');
  ok(hh.chainState(host).index === 6 && hh.chainState(host).completed.has(3), 'zijn keten is ongewijzigd terug');
  ok(hh.chains.has(sessieId) === false, 'de sessiesleutel is uit de houder verdwenen');

  N.stopCoopNet(gast);
  ok(gast.coopGroepSleutel === 0, 'ook de gast staat weer op zijn eigen wereld');
  ok(hg.chainState(gast).index === 5, 'met zijn eigen keten');
}

console.log(`mission_chain_test: ${n}/${n} ok`);
