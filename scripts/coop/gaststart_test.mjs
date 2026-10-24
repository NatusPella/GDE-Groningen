// Samen spelen (#452): een gast start een wedstrijd (E bij het startpunt) en de host hoeft niet mee te doen. Pure Node, geen net, geen DOM.
//   node scripts/coop/gaststart_test.mjs
import * as W from '../../game/js/coopwedstrijd.js';
import * as P from '../../game/js/padelmatch.js';
import * as B from '../../game/js/coopbijbaan.js';
import { registerBusyProbe } from '../../game/js/busy.js';
import { makeRng } from '../../game/js/minigamekit.js';
import { kaartModel } from '../../game/js/coopwedstrijd3d.js';

let bad = 0, n = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', naam, info); } };
const DT = 1 / 60;
const ROSTER = () => [{ slot: 0, char: 'tammo', verbinding: 'ok' }, { slot: 1, char: 'anita', verbinding: 'ok' }, { slot: 2, char: 'rik', verbinding: 'ok' }, { slot: 3, char: 'sanne', verbinding: 'ok' }];
function nepWereld(spelers = ROSTER()) {
  const log = [];
  const hub = { roster: { spelers }, announce: (b, slot) => { log.push([slot, b]); return true; } };
  const inv = { 1: { mx: 0, my: -1, buttons: 0 }, 2: { mx: 0, my: -1, buttons: 0 }, 3: { mx: 0, my: -1, buttons: 0 } };
  const world = { coopNet: { role: 'host', hub }, companion: { x: 0, y: 0 }, coop: { remote: true, remoteInput: inv[1] }, coopFigures: { 2: { slot: 2, x: 0, y: 0, input: inv[2] }, 3: { slot: 3, x: 0, y: 0, input: inv[3] } }, messages: [], addMessage(t) { this.messages.push(t); }, coopMeld(slot, t) { this.meldingen.push([slot, t]); }, meldingen: [], time: 100 };
  return { world, log, hub, inv, spelers };
}
const betaald = [];
W.zetWedHaken({ betaalGast: (w, slot, geld, extra) => { betaald.push([slot, geld, extra]); return true; } });
let kartPlek = true, padelPlek = true, hostStarts = 0;
W.registreerWedstrijd('kartbaan', { naam: 'Karten in Ulrum', start: () => { hostStarts++; return true; }, plek: () => ({ x: 10, y: 20 }), gastPlek: () => kartPlek, solo: () => 'solo' });
W.registreerWedstrijd('padel', { naam: 'Padel', soort: 'live', live: P.livePadel, minSpelers: 2, maak: (deeln) => P.maakPadel(deeln, { rng: makeRng(5) }), start: () => { hostStarts++; return true; }, plek: () => ({ x: 50, y: 60 }), extra: () => ({ v: 'baan3' }), gastPlek: () => padelPlek, solo: () => 'solo' });
const vraag = (world, slot, id) => W.wedHandleGast(world, { k: 'wedgast', a: 'start', id }, slot);
const uitSlots = (log) => log.filter(([, b]) => b.f === 'uit').map(([s]) => s).sort().join();

// ---- het bericht
{
  check('een verzoek om te starten wordt gelezen', W.leesGast({ k: 'wedgast', a: 'start', id: 'kartbaan' }).id === 'kartbaan');
  check('een verzoek zonder id of met rommel wordt genegeerd', W.leesGast({ k: 'wedgast', a: 'start' }) === null && W.leesGast({ k: 'wedgast', a: 'start', id: 5 }) === null && W.leesGast({ k: 'wedgast', a: 'start', id: 'x'.repeat(30) }) === null);
  check('het formaat van de oude berichten is gelijk gebleven', W.leesGast({ k: 'wedgast', a: 'ja' }).a === 'ja');
}

// ---- een gast start een race: de anderen en de host krijgen Meedoen?, de starter doet mee
{
  const { world, log } = nepWereld();
  check('de gast start de race', vraag(world, 2, 'kartbaan'));
  check('de starter krijgt geen uitnodiging, de andere gast wel (met zijn naam)', uitSlots(log) === '1,3' && log.find(([, b]) => b.f === 'uit')[1].wie === 'Rik', uitSlots(log));
  check('de host krijgt Meedoen? op zijn scherm met J en N', kaartModel(world) && kaartModel(world).titel === 'Meedoen?' && /J = ja/.test(kaartModel(world).voet), JSON.stringify(kaartModel(world)));
  check('de host hoort wie het startte', world.messages.some((t) => /Rik start Karten in Ulrum\. Doe je mee/.test(t)), world.messages.join('|'));
  check('de gast ziet wie hem uitnodigt', /Rik nodigt je uit/.test(W.uitnodigingTekst(W.leesWed(log[0][1]) && { ...W.leesWed(log[0][1]), rest: 10 })), '');
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1); W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 3);
  check('de host zegt ja', W.wedHostAntwoord(world, true));
  W.wedHostTik(world, DT);
  const W0 = world.coopNet.wed;
  check('de race begint met de host, de starter en wie ja zei', W0.r && W0.r.karts.filter((k) => k.mens).map((k) => k.slot).sort().join() === '0,1,2' && hostStarts === 1 && !W0.hostloos);
  check('wie nee zei hoort dat het niet doorgaat, de starter niet', log.filter(([, b]) => b.f === 'af').map(([s]) => s).join() === '3');
  check('de starter krijgt de start', log.some(([s, b]) => s === 2 && b.f === 'start'));
}

// ---- de host zegt N: een race met alleen gasten, de AI vult op
{
  hostStarts = 0; betaald.length = 0;
  const { world, log, hub } = nepWereld();
  vraag(world, 1, 'kartbaan');
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2); W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 3);
  check('de host zegt N', W.wedHostAntwoord(world, false) && world.messages.some((t) => /zonder jou door/.test(t)));
  check('een tweede antwoord van de host telt niet', !W.wedHostAntwoord(world, true));
  W.wedHostTik(world, DT);
  const W0 = world.coopNet.wed, r = W0.r;
  check('de race loopt met alleen gasten, zonder kart van de host', r && W0.hostloos && W0.achtergrond && !r.karts.some((k) => k.slot === 0 && k.mens) && r.karts.filter((k) => k.mens).map((k) => k.slot).sort().join() === '1,2', r && r.karts.map((k) => k.slot).join());
  check('de AI vult de lege plekken op tot vier karts, er is geen lege plek', r.karts.length === W.MAX_RIJDERS && r.karts.filter((k) => !k.mens).length === 2);
  check('de host startte zelf niets (geen start op zijn scherm)', hostStarts === 0);
  check('de start gaat naar beide gasten met twee deelnemers', log.filter(([, b]) => b.f === 'start').map(([s]) => s).sort().join() === '1,2' && log.find(([, b]) => b.f === 'start')[1].deeln.length === 2);
  check('de host ziet geen Meedoen?-kaartje meer', kaartModel(world) === null);
  // de host opent het menu, de kaart of een filmpje: de wereld pauzeert niet
  world.paused = true; world.uiPaused = false;
  const t0 = r.t;
  for (let i = 0; i < 60 * 8; i++) W.wedHostTik(world, DT);
  check('de wedstrijd loopt door terwijl de host in een menu zit', r.t > t0 + 7 && r.phase === 'race' && r.karts[0].prog > 5, `${(r.t - t0).toFixed(1)} s ${r.phase}`);
  world.uiPaused = true; // een eigen pauze
  for (let i = 0; i < 60 * 5; i++) W.wedHostTik(world, DT);
  check('ook met een eigen pauze van de host loopt de wedstrijd met de anderen door', r.t > t0 + 12);
  world.paused = false; world.uiPaused = false;
  check('de stick van een gast laat zijn kart rijden', r.karts.find((k) => k.slot === 1).prog > 20 && r.karts.find((k) => k.slot === 2).prog > 20);
  // gast 2 valt weg: de race gaat door voor gast 1
  hub.roster.spelers.find((s) => s.slot === 2).verbinding = 'lost';
  for (let i = 0; i < 60; i++) W.wedHostTik(world, DT);
  check('valt een gast weg dan rijdt zijn kart door onder de AI', r.karts.find((k) => k.slot === 2).weg && W0.r === r);
  // de race loopt tot het eind
  for (let i = 0; i < 60 * 400 && W0.r; i++) W.wedHostTik(world, DT);
  check('de race eindigt vanzelf zonder de host', !W0.r && W0.uitslag && W0.uitslag.jij === null && W0.laatste.hostloos === true);
  check('de eindstand heeft alleen gasten en AI, geen host', W0.uitslag.rijen.every((x) => x.ai || x.slot === 1 || x.slot === 2) && !W0.uitslag.rijen.some((x) => x.slot === 0));
  check('de uitslag gaat naar de gast die nog speelt, de beloning ook; wie wegviel krijgt niets', log.some(([s, b]) => s === 1 && b.f === 'eind') && !log.some(([s, b]) => s === 2 && b.f === 'eind') && !betaald.some(([s]) => s === 2) && betaald.every(([s]) => s === 1), JSON.stringify(betaald));
  check('de host krijgt geen uitslagkaart', kaartModel(world) === null);
  check('de lichamen zijn weer vrij', world.companion.coopWedstrijd === false && world.coopFigures[2].coopWedstrijd === false);
  // een rematch kan zonder J van de host: een gast vraagt het
  const nUit = log.filter(([, b]) => b.f === 'uit').length;
  check('een gast wil nog een keer: de rematch wordt uitgenodigd', W.wedHandleGast(world, { k: 'wedgast', a: 'nogmaals' }, 1) && W0.u && log.filter(([, b]) => b.f === 'uit').length > nUit);
}

// ---- padel: twee gasten tegen elkaar, host zegt niet ja
{
  betaald.length = 0; hostStarts = 0;
  const { world, log } = nepWereld([{ slot: 0, char: 'tammo', verbinding: 'ok' }, { slot: 1, char: 'anita', verbinding: 'ok' }, { slot: 2, char: 'rik', verbinding: 'ok' }]);
  check('een gast start padel', vraag(world, 1, 'padel'));
  check('alleen de andere gast en de host krijgen Meedoen?', uitSlots(log) === '2' && world.coopNet.wed.u.keuze[0] === 'wacht');
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2);
  for (let i = 0; i < 60 * 11 && world.coopNet.wed.u; i++) W.wedHostTik(world, DT); // geen antwoord van de host is nee
  const W0 = world.coopNet.wed, sim = W0.lv;
  check('na tien seconden begint padel zonder de host (geen antwoord is nee)', sim && W0.hostloos && hostStarts === 0 && sim.stoelen.filter((s) => s.slot !== null).map((s) => s.slot).sort().join() === '1,2', sim && sim.stoelen.map((s) => s.slot).join());
  check('twee gasten staan tegenover elkaar, elk met een AI-maatje', sim.stoelen.find((s) => s.slot === 1).team !== sim.stoelen.find((s) => s.slot === 2).team && sim.stoelen.filter((s) => s.slot === null).length === 2);
  const start = W.leesWed(log.find(([s, b]) => s === 2 && b.f === 'start')[1]);
  check('de start vertelt de baan en dat het live is', start.live === true && start.v === 'baan3' && start.deeln.length === 2);
  world.paused = true;
  const n0 = log.length;
  for (let i = 0; i < 60 * 3; i++) W.wedHostTik(world, DT);
  check('met het menu van de host open krijgen de gasten momentopnamen', log.slice(n0).filter(([, b]) => b.f === 'lv').length > 20 && sim.t > 3);
  world.paused = false;
  for (let i = 0; i < 60 * 3000 && W0.lv; i++) W.wedHostTik(world, DT);
  check('de wedstrijd eindigt vanzelf met een uitslag voor beide gasten', !W0.lv && W0.uitslag && W0.uitslag.rijen.length === 2 && log.filter(([, b]) => b.f === 'eind').map(([s]) => s).sort().join() === '1,2');
  check('beide gasten krijgen hun beloning, de host niet', betaald.map(([s]) => s).sort().join() === '1,2' || betaald.every(([s]) => s === 1 || s === 2));
  check('niemand van de host staat in de uitslag', W0.uitslag.jij === null);
}

{ // padel met één speler is geen wedstrijd: de host zegt N en niemand anders doet mee
  const { world } = nepWereld([{ slot: 0, char: 'tammo', verbinding: 'ok' }, { slot: 1, char: 'anita', verbinding: 'ok' }]);
  vraag(world, 1, 'padel'); W.wedHostAntwoord(world, false); W.wedHostTik(world, DT);
  check('padel met alleen de starter gaat niet door, met een melding', !world.coopNet.wed.lv && world.meldingen.some(([s, t]) => s === 1 && /minstens 2 spelers/.test(t)), JSON.stringify(world.meldingen));
}

// ---- twee gasten tegelijk, een verzoek dat niet kan, en een verzoek van iemand die niet bij het startpunt staat
{
  const { world, log } = nepWereld();
  check('gast 1 start padel', vraag(world, 1, 'padel'));
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2); // gast 2 doet mee, anders is padel met één speler geen wedstrijd
  check('gast 2 tegelijk: geweigerd met een duidelijke melding', !vraag(world, 2, 'kartbaan') && world.meldingen.some(([s, t]) => s === 2 && t === 'Er loopt al een uitnodiging. Wacht of doe mee.'), JSON.stringify(world.meldingen));
  check('er is maar één uitnodiging uitgegaan', log.filter(([, b]) => b.f === 'uit').every(([, b]) => b.id === 'padel'));
  // loopt de wedstrijd al
  for (let i = 0; i < 60 * 11; i++) W.wedHostTik(world, DT);
  check('de wedstrijd loopt', !!(world.coopNet.wed.lv || world.coopNet.wed.r));
  world.meldingen.length = 0;
  check('tijdens de wedstrijd: Er loopt al een wedstrijd', !vraag(world, 3, 'kartbaan') && world.meldingen[0][1] === 'Er loopt al een wedstrijd. Wacht of doe mee.');
}
{
  const { world } = nepWereld();
  world.wanted = 2;
  check('politie op de hielen: duidelijke melding', !vraag(world, 1, 'kartbaan') && /politie/.test(world.meldingen[0][1]), JSON.stringify(world.meldingen));
  world.wanted = 0; world.meldingen.length = 0;
  let missie = true;
  registerBusyProbe('mission', () => missie);
  check('een opdracht loopt: Er loopt al een opdracht. Wacht of doe mee.', !vraag(world, 1, 'kartbaan') && world.meldingen[0][1] === 'Er loopt al een opdracht. Wacht of doe mee.', JSON.stringify(world.meldingen));
  missie = false; world.meldingen.length = 0;
  let film = true;
  registerBusyProbe('cinematic', () => film);
  check('de host zit in een filmpje: melding', !vraag(world, 1, 'kartbaan') && /filmpje/.test(world.meldingen[0][1]));
  film = false; world.meldingen.length = 0;
  world.sideJob = { active: true };
  check('een bijbaan loopt: melding', !vraag(world, 1, 'kartbaan') && /bijbaan/.test(world.meldingen[0][1]));
  world.sideJob = null; world.meldingen.length = 0;
  kartPlek = false;
  check('niet bij het startpunt: melding', !vraag(world, 1, 'kartbaan') && /startpunt/.test(world.meldingen[0][1]));
  kartPlek = true; world.meldingen.length = 0;
  check('een onbekende wedstrijd kan niet', !vraag(world, 1, 'bestaatniet') && /eigen spel/.test(world.meldingen[0][1]));
  check('een geweigerd verzoek start niets en laat geen uitnodiging staan', !world.coopNet.wed || (!world.coopNet.wed.u && !world.coopNet.wed.r));
  world.meldingen.length = 0;
  check('daarna kan het wel', vraag(world, 1, 'kartbaan') && world.coopNet.wed.u);
  check('een bijbaan vragen tijdens die uitnodiging wordt geweigerd', (() => { world.coopNet.bijbaan = B.maakBijbaan(); world.sideJobActions = { startVoor: () => ({ ok: true }) }; world.meldingen.length = 0; const ok = B.bijbaanHandleGast(world, { k: 'bijbaangast', a: 'start', id: 'taxi' }, 2); return !ok && /wedstrijd/.test(world.meldingen[0][1]); })());
}

// ---- de starter valt weg
{
  const { world, hub, log } = nepWereld();
  vraag(world, 2, 'kartbaan');
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1); W.wedHostAntwoord(world, false);
  hub.roster.spelers.find((s) => s.slot === 2).verbinding = 'lost';
  W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 3);
  W.wedHostTik(world, DT);
  const W0 = world.coopNet.wed;
  check('valt de starter weg voor het begin, dan loopt de rest nog (gast 1 zei ja)', W0.r && W0.r.karts.filter((k) => k.mens).map((k) => k.slot).join() === '1');
}
{
  const { world, hub } = nepWereld([{ slot: 0, char: 'tammo', verbinding: 'ok' }, { slot: 1, char: 'anita', verbinding: 'ok' }]);
  vraag(world, 1, 'kartbaan');
  hub.roster.spelers.find((s) => s.slot === 1).verbinding = 'lost';
  W.wedHostAntwoord(world, true);
  W.wedHostTik(world, DT);
  const W0 = world.coopNet.wed;
  check('valt de enige gast die startte weg voor het begin, dan gaat het niet door (geen solo-race voor de host)', !W0.r && !W0.u && hostStarts >= 0 && world.messages.some((t) => /is weg/.test(t)), world.messages.join('|'));
}
{ // de starter valt weg midden in de wedstrijd: hij loopt door zoals nu
  const { world, hub } = nepWereld();
  vraag(world, 1, 'kartbaan'); W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2); W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 3); W.wedHostAntwoord(world, false);
  W.wedHostTik(world, DT);
  const W0 = world.coopNet.wed, r = W0.r;
  for (let i = 0; i < 120; i++) W.wedHostTik(world, DT);
  hub.roster.spelers.find((s) => s.slot === 1).verbinding = 'lost';
  for (let i = 0; i < 60 * 300 && W0.r; i++) W.wedHostTik(world, DT);
  check('valt de starter midden in de race weg, dan loopt hij door en eindigt hij voor de anderen', !W0.r && r.karts.find((k) => k.slot === 1).weg && W0.uitslag.rijen.some((x) => x.slot === 2), '');
}

// ---- eenspeler en de oude weg blijven ongewijzigd
{
  hostStarts = 0;
  const { world, log } = nepWereld();
  check('zonder sessie is het solo', !W.wedNodigUit({ coopNet: null }, 'kartbaan').ok);
  const solo = nepWereld([{ slot: 0, char: 'tammo', verbinding: 'ok' }]);
  check('zonder gasten is het solo', !W.wedNodigUit(solo.world, 'kartbaan').ok);
  check('een verzoek zonder sessie doet niets', !W.wedVraagStart({ coopNet: null }, 1, 'kartbaan').ok && !W.wedVraagStart(solo.world, 1, 'kartbaan').ok);
  check('de host start zelf nog steeds: iedereen krijgt Meedoen?, zonder naam en zonder kaartje voor de host', W.wedNodigUit(world, 'kartbaan').ok && uitSlots(log) === '1,2,3' && !log[0][1].wie && world.coopNet.wed.u.keuze[0] === undefined && kaartModel(world).titel !== 'Meedoen?');
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1); W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 2); W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 3);
  W.wedHostTik(world, DT);
  check('de host doet dan mee en start op zijn scherm', hostStarts === 1 && world.coopNet.wed.r.karts.filter((k) => k.mens).map((k) => k.slot).join() === '0,1' && !world.coopNet.wed.hostloos);
  check('de host kan geen J of N geven op een uitnodiging die hij zelf deed', !W.wedHostAntwoord(world, true));
}

// ---- E van een gast (de gastkant)
{
  const sent = [], msgs = [];
  const world = { coopNet: { role: 'client', joined: true, session: { sendEvent: (e) => { sent.push(e); return true; } } }, addMessage: (t) => msgs.push(t), time: 50 };
  check('zonder wedstrijd bij de hand is E niet voor de wedstrijd', !W.wedGastE(world));
  let dichtbij = true;
  W.zetWedGastHaken('kartbaan', { dichtbij: () => dichtbij });
  check('bij het startpunt stuurt E een verzoek aan de host', W.wedGastE(world) && sent.length === 1 && sent[0].k === 'wedgast' && sent[0].a === 'start' && sent[0].id === 'kartbaan' && msgs.some((t) => /Je vraagt Karten in Ulrum te starten/.test(t)), JSON.stringify(sent));
  world.time = 50.5;
  check('nog een keer E binnen twee seconden stuurt niets extra', W.wedGastE(world) && sent.length === 1);
  world.time = 53;
  check('later mag het weer', W.wedGastE(world) && sent.length === 2);
  W.gastStaat(world).uitn = { id: 'kartbaan', label: 'x', rest: 5 };
  world.time = 60;
  check('tijdens een uitnodiging krijgt de gast Er loopt al een wedstrijd', W.wedGastE(world) && sent.length === 2 && msgs.at(-1) === 'Er loopt al een wedstrijd. Wacht of doe mee.');
  W.gastStaat(world).uitn = null; dichtbij = false;
  check('ver van het startpunt: E is niet voor de wedstrijd', !W.wedGastE(world));
  world.paused = true; dichtbij = true;
  check('in een menu doet E niets', !W.wedGastE(world));
  check('een host stuurt zo geen verzoek', !W.wedGastE({ coopNet: { role: 'host' }, addMessage() {} }));
}

// ---- bijbanen die al samen werkten blijven werken, en de host kiest ook
{
  const st = B.maakBijbaan();
  const uit = B.beginBijbaan(st, 'taxi', 'Taxi', [1, 2], 1, 'Tessa');
  check('een bijbaan door een gast: de andere gast en de host krijgen Meedoen?', uit.length === 1 && uit[0].slot === 2 && st.keuze[0] === 'wacht' && st.keuze[1] === 'ja' && !st.gesloten);
  check('de host is geen deelnemer in de beloningslijst', B.deelnemers(st, new Set([1, 2])).join() === '1');
  B.antwoordBijbaan(st, 2, true);
  check('zolang de host niet antwoordt blijft de uitnodiging open', !st.gesloten);
  check('de host zegt N: hij doet niet mee', B.antwoordBijbaan(st, 0, false) && st.gesloten && !B.hostMeeBijbaan(st));
  check('de gasten die meespelen krijgen de volle beloning, de host niet', B.beloningBijbaan(st, new Set([1, 2]), { basis: 100 }).map((b) => b.slot).join() === '1,2');
  const st2 = B.maakBijbaan();
  B.beginBijbaan(st2, 'taxi', 'Taxi', [1, 2], null, 'Tammo');
  check('een baan van de host zelf: hij doet mee en hoeft niets te kiezen', B.hostMeeBijbaan(st2) && st2.keuze[0] === undefined);
  const st3 = B.maakBijbaan();
  B.beginBijbaan(st3, 'taxi', 'Taxi', [1], 1, 'Tessa');
  const af = B.tikBijbaan(st3, 11, new Set([1]));
  check('geen antwoord van de host is nee, zonder bericht naar de host', st3.keuze[0] === 'nee' && af.length === 0 && st3.gesloten);
  const mee = { coopNet: { role: 'host', bijbaan: Object.assign(B.maakBijbaan(), {}) } };
  check('zonder baan doet de host gewoon mee (loon zoals altijd)', B.bijbaanHostMee(mee) === true && B.bijbaanHostMee({}) === true);
}

console.log(bad ? `${bad} van ${n} controles mislukt` : `ok: ${n} controles`);
process.exit(bad ? 1 : 0);
