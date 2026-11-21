// Samen spelen (#443, #981): voetbal in de Euroborg tegen de computer, twee tot vier mensen in één team (game/js/voetbalmatch.js en de host- en gastkant in multiplayerwedstrijd.js).
// Met een nephub (zoals coopwedstrijd_padel_test.mjs): uitnodigen, starten, tikken, wegvallen, uitbetalen, en het scherm van de gast.
//   node scripts/coopwedstrijd_voetbal_test.mjs
import * as V from '../game/js/voetbalmatch.js';
import * as W from '../game/js/multiplayerwedstrijd.js';
import { metGroepsbonus } from '../game/js/groepsbonus.js';
import { makeRng } from '../game/js/minigamekit.js';
import { KNOP, voetbalBeloning } from '../game/js/voetbalrules.js';
import { encodeRatings } from '../game/js/voetbalsamen.js';

let bad = 0, n = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', naam, info); } };
const DT = 1 / 30;
const ROSTER = () => [{ slot: 0, char: 'tammo', verbinding: 'ok' }, { slot: 1, char: 'anita', verbinding: 'ok' }, { slot: 2, char: 'rik', verbinding: 'ok' }, { slot: 3, char: 'sanne', verbinding: 'ok' }];
const MENSEN = (k) => [{ slot: 0, naam: 'Tammo', char: 'tammo' }, { slot: 1, naam: 'Tessa', char: 'anita' }, { slot: 2, naam: 'Rik', char: 'rik' }, { slot: 3, naam: 'Sanne', char: 'sanne' }].slice(0, k);
function nepWereld(spelers) {
  const log = [];
  const hub = { roster: { spelers }, announce: (b, slot) => { log.push([slot, b]); return true; } };
  const inv = { 1: { mx: 0, my: 0, buttons: 0 }, 2: { mx: 0, my: 0, buttons: 0 }, 3: { mx: 0, my: 0, buttons: 0 } };
  const world = { coopNet: { role: 'host', hub }, coop: { remote: false }, coopFigures: { 1: { slot: 1, x: 0, y: 0, input: inv[1] }, 2: { slot: 2, x: 0, y: 0, input: inv[2] }, 3: { slot: 3, x: 0, y: 0, input: inv[3] } }, messages: [], addMessage(t) { this.messages.push(t); } };
  return { world, log, hub, inv };
}
const regel = (op) => ({ naam: 'Voetbal Euroborg', soort: 'live', live: V.liveVoetbal, minSpelers: 2, maak: (deeln) => V.makeMatch(deeln, { duur: 'kort', seed: 5, tegenstander: 1 }), start: (w, sim) => { op.sim = sim; return true; }, plek: () => ({ x: 50, y: 60 }), extra: () => ({ v: 'k.s.1.k.2-2.e' }), solo: () => 'solo' });

{ // uitnodigen en starten
  const betaald = []; const op = {};
  W.zetWedHaken({ betaalGast: (w, slot, geld, extra) => { betaald.push([slot, geld, extra]); return true; } });
  W.registreerWedstrijd('voetbal', regel(op));
  const { world, log, hub, inv } = nepWereld(ROSTER());
  check('de uitnodiging gaat naar elke gast', W.wedNodigUit(world, 'voetbal').ok && log.filter(([, b]) => b.f === 'uit' && b.label === 'Voetbal Euroborg').length === 3);
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1); W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2); W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 3);
  W.wedHostTik(world, 0.1);
  const sim = op.sim;
  check('de wedstrijd begint met wie ja zei, de host eerst', sim && sim.mensen.map((m) => m.slot).join() === '0,1,2', sim && sim.mensen.map((m) => m.slot).join());
  const start = W.leesWed(log.find(([s, b]) => s === 1 && b.f === 'start')[1]);
  check('de start vertelt dat het een live wedstrijd is en wat de host koos', start && start.live === true && start.v === 'k.s.1.k.2-2.e' && start.deeln.length === 3);
  check('de lichamen van de gasten staan stil bij de poort', world.coopFigures[1].coopWedstrijd === true && world.coopFigures[2].coopWedstrijd === true && !world.coopFigures[3].coopWedstrijd);
  check('een tweede wedstrijd tegelijk kan niet', W.wedNodigUit(world, 'voetbal').reden === 'bezig');
  // tikken: de aanloop duurt even
  const hostInv = () => ({ mx: 0, my: 0, buttons: 0 });
  const n0 = log.length;
  for (let i = 0; i < 60; i++) W.wedLiveTik(world, sim, DT, hostInv);
  const lv = log.slice(n0).filter(([, b]) => b.f === 'lv');
  check('elke gast die meedoet krijgt ongeveer 12 momentopnamen per seconde, de rest niet', lv.length >= 36 && lv.length <= 52 && lv.every(([s]) => s === 1 || s === 2), `${lv.length}`);
  check('de momentopnamen zijn geldig voor de gast en voor de generieke lezer', lv.every(([, b]) => V.leesLiveVoetbal(b)) && W.leesWed(lv[0][1]).f === 'lv');
  // de invoer van gast 1 beweegt zijn speler (nadat de aanloop voorbij is)
  for (let i = 0; i < 400 && sim.fase !== 'spel'; i++) W.wedLiveTik(world, sim, DT, hostInv);
  check('de wedstrijd komt in het spel', sim.fase === 'spel', sim.fase);
  const p1 = sim.spelers[sim.mensen[1].ctl]; sim.mensen[1].autoT = 1e9; sim.bal.owner = -1; sim.bal.x = 11; sim.bal.y = 15; sim.bal.vx = 0; sim.bal.vy = 0;
  const y0 = p1.y; inv[1].my = -1;
  for (let i = 0; i < 45; i++) W.wedLiveTik(world, sim, DT, hostInv);
  check('de stick van de gast beweegt zijn speler via de host, en niemand anders', p1.y > y0 + 1.5 && sim.spelers[sim.mensen[2].ctl].slot === 2, `${y0}->${p1.y}`);
  // de knoppen van de gast: de bits zijn de voetbalknoppen
  inv[1].my = 0; inv[1].buttons = KNOP.SPRINT | KNOP.TACKLE;
  W.wedLiveTik(world, sim, DT, hostInv);
  check('de knoppen van een gast komen als voetbalknoppen aan (geen wapenbits)', (inv[1].buttons & (16 | 32)) === 0 && V.snapVoetbal(sim, 1).d.length === V.snapLengte('klein'));
  // gast 2 valt weg
  hub.roster.spelers.find((s) => s.slot === 2).verbinding = 'lost';
  W.wedLiveTik(world, sim, DT, hostInv);
  const p2 = sim.spelers[sim.mensen[2].ctl];
  check('een gast die wegvalt is weg, de computer neemt zijn speler over en zijn lichaam is vrij', sim.mensen[2].weg && p2.slot === null && world.coopFigures[2].coopWedstrijd === false);
  check('de momentopname zegt dat hij er niet meer is', V.snapVoetbal(sim, 9).d[18] === -1);
  hub.roster.spelers.find((s) => s.slot === 2).verbinding = 'ok';
  // gast 1 stopt zelf
  check('een gast kan zelf stoppen', W.wedHandleGast(world, { k: 'wedgast', a: 'weg' }, 1) && sim.mensen[1].weg && world.coopFigures[1].coopWedstrijd === false);
  // de wedstrijd loopt door voor de host en eindigt
  let ev = [];
  for (let i = 0; i < 5000 && sim.fase !== 'klaar'; i++) ev = W.wedLiveTik(world, sim, DT, hostInv);
  check('de wedstrijd eindigt voor wie nog speelt', sim.fase === 'klaar', sim.fase);
  const res = W.wedHostLiveEind(world, sim);
  check('de host krijgt de uitslag met zijn eigen beloning', res && res.jij && res.rijen.length === 3 && res.jij.xp > 0, JSON.stringify(res && res.jij));
  check('wie wegviel krijgt niets en geen uitslag', !log.some(([s, b]) => (s === 2 || s === 1) && b.f === 'eind' && !b.gestopt) && !betaald.some(([s]) => s === 1 || s === 2));
  check('daarna kan een nieuwe wedstrijd', world.coopFigures[1].coopWedstrijd === false && W.wedNodigUit(world, 'voetbal').ok);
}

{ // vier mensen met bots: een hele wedstrijd, de beloning per speler naar zijn eigen portemonnee
  const betaald = []; const op = {};
  W.zetWedHaken({ betaalGast: (w, slot, geld, extra) => { betaald.push([slot, geld, extra]); return true; } });
  W.registreerWedstrijd('voetbal', regel(op));
  const { world, log, inv } = nepWereld(ROSTER());
  W.wedNodigUit(world, 'voetbal');
  for (const s of [1, 2, 3]) W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, s);
  W.wedHostTik(world, 0.1);
  const sim = op.sim;
  check('vier mensen: vier verschillende veldspelers, de keeper blijft de computer', sim && new Set(sim.mensen.map((m) => m.ctl)).size === 4 && sim.mensen.every((m) => sim.spelers[m.ctl].rol !== 'keeper'));
  const rng = makeRng(9); const knop = [0, 0, 0, 0];
  const bot = (slot) => { if (rng() < 0.05) knop[slot] = [0, KNOP.SCHOT, KNOP.PASS, KNOP.SPRINT, KNOP.TACKLE, KNOP.LANG | KNOP.SPRINT][Math.floor(rng() * 6)]; return { mx: Math.sin(sim.tijd + slot), my: -Math.cos(sim.tijd * 0.8 + slot), buttons: knop[slot] }; };
  let tik = 0; const alleEv = [];
  while (sim.fase !== 'klaar' && tik < 30 * 400) {
    for (const s of [1, 2, 3]) Object.assign(inv[s], bot(s));
    alleEv.push(...W.wedLiveTik(world, sim, DT, () => bot(0))); tik++;
  }
  check('de wedstrijd loopt uit via de host', sim.fase === 'klaar', `${sim.fase} ${tik}`);
  const res = W.wedHostLiveEind(world, sim);
  const eind = log.filter(([, b]) => b.f === 'eind' && !b.gestopt);
  check('elke gast krijgt zijn uitslag met de stand', eind.length === 3 && eind.every(([s, b]) => { const l = W.leesWed(b); return l && l.rijen.length === 4 && l.jij && /\d+-\d+/.test(l.rijen[0].tekst); }));
  const uitk = sim.score[0] > sim.score[1] ? 1 : sim.score[0] < sim.score[1] ? 2 : 3;
  const verwacht = (rij) => metGroepsbonus(V.beloningVoetbal(rij).geld, world.coopNet.wed.deeln.length);
  check('het geld gaat per uitslag naar de eigen portemonnee van elke gast (vak buiten)', betaald.length === 3 && betaald.every(([s, geld, x]) => x.vak === 'buiten' && geld > 0), JSON.stringify(betaald));
  check('de host krijgt zijn eigen resultaat', res && res.jij && res.jij.plek === uitk && res.jij.geld === verwacht(V.uitslagVoetbal(sim)[0]), JSON.stringify(res && res.jij));
  check('elke speler kan zijn eigen medaille uit zijn eigen regel halen', eind.every(([, b]) => { const l = W.leesWed(b); return l.rijen.every((r) => V.medailleUitRij(r).medaille >= 0); }));
  check('een rematch kan met J van een gast', W.wedHandleGast(world, { k: 'wedgast', a: 'nogmaals' }, 1) && W.wedOpnieuw(world).ok);
}

{ // de host stopt de wedstrijd
  const op = {};
  W.registreerWedstrijd('voetbal', regel(op));
  const { world, log } = nepWereld(ROSTER());
  W.wedNodigUit(world, 'voetbal'); W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1); W.wedHostTik(world, 11);
  const lg = log.length;
  check('de host kan de wedstrijd voor iedereen stoppen, zonder beloning', W.wedHostLiveEind(world, op.sim, { gestopt: true }) === null && log.slice(lg).some(([s, b]) => s === 1 && b.f === 'eind' && b.gestopt) && world.coopFigures[1].coopWedstrijd === false);
}

{ // niemand meedoen: de host speelt alleen
  const op = {};
  W.registreerWedstrijd('voetbal', regel(op));
  const { world, log } = nepWereld(ROSTER());
  W.wedNodigUit(world, 'voetbal'); W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 1); W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 2); W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 3);
  W.wedHostTik(world, 11);
  check('als niemand meedoet speelt de host alleen en start het kader geen gedeelde wedstrijd', !op.sim && world.messages.some((t) => /alleen/.test(t)), JSON.stringify(world.messages));
}

{ // het scherm van de gast
  const ev = []; const verzonden = [];
  W.zetWedGastHaken('voetbal', { spiegel: (st, mijn) => V.makeFootballMirror(st, mijn, { duur: 'kort', stand: 'standaard', tegenstander: 1 }), voerIn: V.voerInVoetbal, start: (w, st, sp) => { ev.push(['start', st.v, !!sp]); return true; }, eind: (w, uit) => { ev.push(['eind', !!uit.gestopt]); }, tik: () => true });
  const world = { coopNet: { role: 'client', session: { slot: 1, sendEvent: (b) => { verzonden.push(b); return true; } } }, messages: [], addMessage(t) { this.messages.push(t); } };
  W.wedHandleHost(world, W.startEvent('voetbal', MENSEN(2), 0, { live: 1, v: 'k.s.1.k.2-2.e' }));
  const G = world.coopWedGast;
  check('de start zet de gast op zijn eigen scherm met een spiegel', ev[0] && ev[0][1] === 'k.s.1.k.2-2.e' && ev[0][2] === true && G.spiegel && G.spiegel.mijnSlot === 1 && world.coopWedstrijd === true);
  const m = V.makeMatch(MENSEN(2), { duur: 'kort', seed: 2 });
  for (let i = 0; i < 300; i++) V.tikWedstrijd(m, DT, () => ({ mx: 0.3, my: -1, buttons: 0 }));
  check('een momentopname van de host komt in de spiegel', W.wedHandleHost(world, V.snapVoetbal(m, 5)) && G.spiegel.fase === m.fase && G.spiegel.n === 5 && G.spiegel.mijnId === m.mensen[1].ctl);
  check('een oudere momentopname wordt genegeerd', !W.wedHandleHost(world, V.snapVoetbal(m, 3)));
  check('stoppen: de host hoort het en het scherm is vrij', W.wedGastVerlaat(world) && verzonden.at(-1).a === 'weg' && !G.spiegel && world.coopWedstrijd === false);
  W.wedHandleHost(world, W.startEvent('voetbal', MENSEN(2), 0, { live: 1, v: 'k.s.1.k.2-2.e' }));
  W.wedHandleHost(world, W.eindEvent([{ plek: 1, naam: 'Tessa', slot: 1, fin: true, tijd: 2, beste: null, weg: false, tekst: 'gewonnen: 3-0' }], { plek: 1, geld: 60, xp: 26, fin: 1 }));
  const l = G.uitslag;
  check('de uitslag sluit de wedstrijd en de gast kan zijn eigen medaille berekenen', ev.at(-1)[0] === 'eind' && l && l.rijen[0].tekst === 'gewonnen: 3-0' && V.medailleUitRij(l.rijen[0]).medaille === 2 && !G.spiegel);
}

{ // derby (#1114): vrienden in twee teams, ratings van een gast bij Meedoen, uitbetaling per team
  const betaald = []; const op = {};
  W.zetWedHaken({ betaalGast: (w, slot, geld, extra) => { betaald.push([slot, geld, extra]); return true; } });
  const gezien = [];
  W.registreerWedstrijd('voetbal', { ...regel(op), maak: (deeln) => { gezien.push(deeln.map((d) => ({ slot: d.slot, r: d.r }))); return V.makeMatch(deeln.map((d) => ({ ...d, team: d.slot % 2 })), { duur: 'kort', seed: 7, tegenstander: 1 }); } });
  const { world, log, inv } = nepWereld(ROSTER());
  W.wedNodigUit(world, 'voetbal');
  const blok = encodeRatings([{ slot: 0, f: { sprint: 9, schot: 9, aanname: 9, verd: 9, uit: 9 } }]);
  check('de lezer van een gast neemt een geldig ratingblok mee en weigert rommel', W.leesGast({ k: 'wedgast', a: 'ja', r: blok }).r === blok && W.leesGast({ k: 'wedgast', a: 'ja', r: '<script>' }).r === undefined && W.leesGast({ k: 'wedgast', a: 'ja' }).r === undefined);
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja', r: blok }, 1); W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2); W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 3);
  W.wedHostTik(world, 0.1);
  const sim = op.sim;
  check('de ratings van een gast komen bij de maak van de host aan, een gast zonder blok niet', gezien[0].find((d) => d.slot === 1).r === blok && gezien[0].find((d) => d.slot === 2).r === undefined);
  check('twee mensen in elk team, een eigen veldspeler per mens, en de ctl wijst in de eigen helft van de lijst', sim.mensen.map((m) => m.team).join() === '0,1,0,1' && sim.mensen.every((m) => Math.floor(m.ctl / sim.perTeam) === m.team && sim.spelers[m.ctl].rol !== 'keeper') && new Set(sim.mensen.map((m) => m.ctl)).size === 4);
  const rng = makeRng(4); const knop = [0, 0, 0, 0];
  const bot = (slot) => { if (rng() < 0.05) knop[slot] = [0, KNOP.SCHOT, KNOP.PASS, KNOP.SPRINT, KNOP.TACKLE][Math.floor(rng() * 5)]; return { mx: Math.sin(sim.tijd + slot), my: -Math.cos(sim.tijd * 0.8 + slot), buttons: knop[slot] }; };
  let tik = 0;
  while (sim.fase !== 'klaar' && tik < 30 * 400) { for (const s of [1, 2, 3]) Object.assign(inv[s], bot(s)); W.wedLiveTik(world, sim, DT, () => bot(0)); tik++; }
  check('de derby loopt uit', sim.fase === 'klaar', sim.fase);
  const rijen = V.uitslagVoetbal(sim);
  const plekVan = (g1, g2) => (g1 > g2 ? 1 : g1 < g2 ? 2 : 3);
  check('elke mens krijgt zijn uitslag vanuit zijn eigen team (team 1 wint bij score[1] > score[0])', rijen.every((r) => r.plek === plekVan(sim.score[sim.mensen.find((m) => m.slot === r.slot).team], sim.score[1 - sim.mensen.find((m) => m.slot === r.slot).team])), JSON.stringify([sim.score, rijen.map((r) => [r.slot, r.plek, r.tekst])]));
  check('de tekst begint met de eigen goals', rijen.every((r) => { const t = sim.mensen.find((m) => m.slot === r.slot).team; return r.tekst.includes(`${sim.score[t]}-${sim.score[1 - t]}`); }));
  W.wedHostLiveEind(world, sim);
  const eind = log.filter(([, b]) => b.f === 'eind' && !b.gestopt);
  check('elke gast krijgt zijn eigen regel en zijn eigen geld', eind.length === 3 && betaald.length <= 3 && betaald.every(([s, geld]) => geld >= 0 && s >= 1));
  // de momentopname en de spiegel kennen het team van elke mens
  const m2 = V.makeMatch([{ slot: 0, naam: 'A', team: 0 }, { slot: 1, naam: 'B', team: 1 }], { duur: 'kort', seed: 1 });   // de spiegel bouwt met zaad 1
  const sp = V.makeFootballMirror({ deeln: [{ slot: 0, naam: 'A' }, { slot: 1, naam: 'B' }] }, 1, { team1: [1] });
  check('de spiegel zet de gast in team 1, net als de host', sp.mensen[1].team === 1 && sp.mensen[1].ctl === m2.mensen[1].ctl && sp.mensen[0].ctl === m2.mensen[0].ctl);
  for (let i = 0; i < 200; i++) V.tikWedstrijd(m2, DT, () => ({ mx: 0.2, my: -1, buttons: 0 }));
  check('een momentopname met een mens in team 1 komt in de spiegel aan', V.voerInVoetbal(sp, V.snapVoetbal(m2, 1)) && sp.mijnId === m2.mensen[1].ctl && sp.mijnId >= sp.perTeam);
}
{ // de gast stuurt zijn ratings mee bij J (alleen als zijn wedstrijd de haak heeft) en niets bij N
  const verzonden = [];
  const world = { coopNet: { role: 'client', session: { sendEvent: (b) => { verzonden.push(b); return true; } } }, coopWedGast: null };
  W.zetWedGastHaken('voetbal', { ratings: () => 'ab.cd' });
  const G = W.gastStaat(world); G.uitn = { id: 'voetbal', label: 'Voetbal', rest: 8, wie: 'Tammo' };
  check('J stuurt de ratings mee', W.wedGastStuur(world, 'ja') && verzonden[0].a === 'ja' && verzonden[0].r === 'ab.cd', JSON.stringify(verzonden));
  G.uitn = { id: 'voetbal', label: 'Voetbal', rest: 8, wie: 'Tammo' };
  check('N stuurt niets mee', W.wedGastStuur(world, 'nee') && verzonden[1].r === undefined);
}

console.log(bad ? `${bad} van ${n} controles mislukt` : `ok: ${n} controles`);
process.exit(bad ? 1 : 0);
