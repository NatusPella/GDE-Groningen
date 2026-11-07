// De missieketen per groep (#492): de houder in game/js/missions.js houdt per sleutel een eigen keten.
// Deze test haalt het houderblok tussen de markers uit missions.js en draait het zoals het daar staat,
// zodat er geen tweede kopie van de regel kan afwijken. missions.js zelf is een browsermodule en
// laadt niet in node (three.js via een https-import), vandaar deze route.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as ML from '../game/js/missielus.js';
import * as MG from '../game/js/missiegroepen.js';

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
  `let worldRef = null;\n${blok}\nreturn { chains, missionPubs, chainKey, chainState, setChainState, setChainKey, missionPub, setMissionPub, zetWereld: (w) => { worldRef = w; } };`,
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

// --- #492 slice 2b: de wereldvelden van de opdracht (pub: missie, marker, waypoints, deuren en vlaggen) per groep
{
  const h = houder();
  const host = { coopGroepSleutel: 0 };
  const gast = { coopGroepSleutel: 1 };
  h.zetWereld(host);
  h.setChainState({ index: 2, pub: { label: 'host' } });
  const hostPub = { label: 'host', marker: { x: 1, y: 2 }, doors: { poort: true }, flags: { toren: 'op' } };
  h.setMissionPub(host, hostPub);
  ok(h.missionPub(host) === hostPub, 'de pub van de host staat er');
  ok(h.missionPub(gast) === null, 'de gast heeft nog geen pub');
  const gastPub = { label: 'gast', marker: { x: 9, y: 8 }, doors: { poort: false }, flags: { toren: 'neer' } };
  h.setMissionPub(gast, gastPub);
  ok(h.missionPub(host) === hostPub && h.missionPub(gast) === gastPub, 'twee groepen houden twee pubs');
  ok(h.missionPub(host).marker.x === 1 && h.missionPub(gast).marker.x === 9, 'de markers raken elkaar niet');
  ok(h.missionPub(host).doors.poort === true && h.missionPub(gast).doors.poort === false, 'de deuren raken elkaar niet');
  ok(h.missionPub(host).flags.toren === 'op' && h.missionPub(gast).flags.toren === 'neer', 'de vlaggen raken elkaar niet');

  // de pub verhuist mee met de keten (#523), zoals de keten zelf
  h.setChainKey(host, 'sessie-a');
  ok(h.missionPub(host) === hostPub, 'de pub verhuist mee naar de sessiesleutel');
  ok(h.missionPubs.has(0) === false, 'onder de oude sleutel blijft geen pub achter');
  h.setChainKey(host, null);
  ok(h.missionPub(host) === hostPub && h.missionPub(gast) === gastPub, 'na de sessie staan beide pubs nog goed');

  // een lege of onbekende wereld: null, en het gooit niet
  h.zetWereld(null);
  ok(h.missionPub(null) === null, 'zonder wereld geen pub');
  h.zetWereld(host);
  h.setMissionPub(host, null);
  ok(h.missionPub(host) === null, 'null wist de pub van die groep');
  ok(h.missionPub(gast) === gastPub, 'en laat de andere groep staan');
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
  // #492 slice 2b: de pub (missie, marker, waypoints, deuren, vlaggen) hangt per groep aan world.mission
  ok(/const missionPubs = new Map\(\);/.test(src), 'de pubs staan per sleutel');
  ok(/Object\.defineProperty\(world, 'mission', \{/.test(src), 'world.mission is een accessor per groep');
  ok(/get: \(\) => missionPub\(world\)/.test(src), 'de accessor leest de pub van de eigen groep');
  ok(/set: \(pub\) => setMissionPub\(world, pub\)/.test(src), 'de accessor schrijft de pub van de eigen groep');
  ok(/world\.mission = chainState\(\)\.pub;/.test(src), 'initMissions zet de eerste pub via de accessor');
  ok(/const pub = missionPubs\.get\(current\);/.test(src) && /missionPubs\.set\(next, pub\)/.test(src), 'de pub verhuist mee met setChainKey');
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

// --- #492: de missielus per groep: welke ketens doen mee en hoeveel tijd krijgt elk
{
  const lus = ML.maakMissielus();
  const tellers = new Map([['a', 0], ['b', 0]]);
  ML.zetGroep(lus, 'a', true); ML.zetGroep(lus, 'b', true);
  ok(ML.aantalActief(lus) === 2 && ML.actieveGroepen(lus).join() === 'a,b', 'twee groepen in vaste volgorde');
  const r = ML.tik(lus, 0.3, (sleutel, dt) => tellers.set(sleutel, (tellers.get(sleutel) || 0) + dt));
  ok(r.aantal === 2 && Math.abs(r.deel - 0.15) < 1e-9, 'de frame-tijd wordt verdeeld');
  ok(Math.abs(tellers.get('a') - 0.15) < 1e-9 && Math.abs(tellers.get('b') - 0.15) < 1e-9, 'beide groepen krijgen hun deel');
  // een uitgezette groep doet niet meer mee; de andere loopt door
  ML.zetGroep(lus, 'a', false);
  const r2 = ML.tik(lus, 0.2, (sleutel, dt) => tellers.set(sleutel, tellers.get(sleutel) + dt));
  ok(r2.aantal === 1 && tellers.get('a') === 0.15 && Math.abs(tellers.get('b') - 0.35) < 1e-9, 'uit is uit, de ander loopt');
  // een fout in de ene groep laat de andere niet vallen
  ML.zetGroep(lus, 'a', true);
  const r3 = ML.tik(lus, 0.2, (sleutel) => { if (sleutel === 'a') throw new Error('kapot'); tellers.set('b', tellers.get('b') + 0.1); });
  ok(r3.fouten.length === 1 && r3.fouten[0].sleutel === 'a' && Math.abs(tellers.get('b') - 0.45) < 1e-9, 'de ene fout stopt de andere groep niet');
  // de eigen keten en de loop staan vast in missions.js
  ok(/import \{ maakMissielus, zetGroep, actieveGroepen, tik as tikMissielus \}/.test(src), 'missions.js haalt de missielus binnen');
  ok(/const missieLus = maakMissielus\(\)/.test(src), 'de lus is er één per wereld');
  ok(/const sleutels = \[\.\.\.chains\.keys\(\)\]\.filter/.test(src), 'alle ketens uit de houder doen mee');
  ok(/tikMissielus\(missieLus, dt, \(sleutel, deel\) => \{/.test(src), 'de lus tikt per ketensleutel');
  ok(/world\.coopGroepSleutel = sleutel/.test(src) && /updateMissionKern\(deel, world\)/.test(src), 'de sleutel staat om de update van die groep');
  ok(/updateMissionsAlgemeen\(dt, world\)/.test(src), 'de wereldtaken staan buiten de lus');
  ok(/st\.phase === 'active' \|\| st\.phase === 'cooldown' \|\| k === eigen/.test(src), 'een gastketen doet alleen mee als die loopt');
}

// --- #492: de keten van een gastgroep (missiegroepen.js): eigen keten, eigen index, eigen pub
{
  const bron = { defs: [{ label: 'A' }, { label: 'B' }], completed: new Set([1]), seen: new Set(), medalPaid: {}, checkpoints: new Map(), pub: { id: '0|A', phase: 'idle', label: 'A', index: 0 } };
  const houder = new Map();
  const sleutel = MG.openGroepKeten(houder, '5|B', 1, bron);
  ok(sleutel === 'groep:5|B' && MG.isGroepSleutel(sleutel), 'de keten van de gastgroep heeft een groepssleutel');
  ok(MG.groepIdVanSleutel(sleutel) === '5|B', 'de sleutel wijst terug naar de groep');
  const st = MG.groepKeten(houder, '5|B');
  ok(st && st.index === 1 && st.phase === 'active', 'de groepsketen begint bij zijn eigen stap');
  ok(st.pub.id === '5|B' && st.pub.phase === 'active' && st.pub.index === 1, 'de pub is van de groep');
  ok(st.completed.has(1) && st.completed !== bron.completed, 'de voortgang is gekopieerd, niet gedeeld');
  ok(bron.index === undefined && bron.phase === undefined && bron.completed.size === 1, 'de bronketen blijft ongemoeid');
  ok(MG.groepKetens(houder).length === 1 && MG.groepKetens(houder)[0].id === '5|B', 'de houder kent de groepsketen');
  MG.sluitGroepKeten(houder, '5|B');
  ok(!MG.groepKeten(houder, '5|B') && !houder.has(sleutel), 'sluiten haalt de keten weg');
}

// --- #492: de gastmissie en het per-groep bericht in de bedrading
{
  ok(/import \{ openGroepKeten, sluitGroepKeten, groepKeten, groepKetens, isGroepSleutel, groepIdVanSleutel \}/.test(src), 'missions.js haalt de groepsketen binnen');
  ok(/function startGroepMissie\(world, i, van\)/.test(src), 'een gastverzoek opent een groepsketen');
  ok(/metLokaalLichaam\(world, lichaam, \(\) => startMission\(world, def\)\)/.test(src), 'de gastmissie speelt met het lichaam van die gast');
  ok(/metLokaalLichaam\(world, lichaam, \(\) => updateMissionKern\(deel, world\)\)/.test(src), 'de missielus tikt de gastgroep met dat lichaam');
  ok(/world\.input = groepInvoer\.get\(sleutel\)/.test(src), 'de gastmissie speelt met de invoer van die gast');
  ok(/world\.coopMissieStart = \(i, van = 0\) => \(van >= 1 \? startGroepMissie/.test(src), 'de start-haak kiest de groepsketen voor een gast');
  ok(/world\.coopGroepToets = \(slot, toets\)/.test(src), 'de toetsen van de gast gaan naar zijn groepsinvoer');
  ok(/world\.coopGroepMissieVoor = \(id\) => groepMissieVoor\(id\)/.test(src), 'de opdracht van een groep is op te vragen voor het bericht');
  const glue = fs.readFileSync(new URL('../game/js/coopglue.js', import.meta.url), 'utf8');
  ok(/coopMissieStart\(v\.i, van\)/.test(glue), 'coopglue geeft de vragende gast mee');
  const net = fs.readFileSync(new URL('../game/js/coopnet.js', import.meta.url), 'utf8');
  ok(/coopGroepMissieIds\(\).filter\(\(id\) => id && id !== n\.groepId\)/.test(net), 'coopnet stuurt de eigen opdracht van een gastgroep apart');
  ok(/missieBericht\(vorige, world\.coopGroepMissieVoor\(id\), null\)/.test(net), 'per groep een eigen missiebericht');
  ok(/for \(const slot of groepLeden\(n, id\)\) n\.hub\.announce\(gmb\.event, slot\)/.test(net), 'alleen de leden van die groep krijgen hem');
  ok(/coopGroepToets\(van, 'e'\)/.test(net), 'E van een gast gaat naar zijn eigen opdracht');
}

console.log(`mission_chain_test: ${n}/${n} ok`);
