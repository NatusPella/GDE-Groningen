// Samen spelen (#443): races tegen elkaar (game/js/coopwedstrijd.js): de uitnodiging, de grid, een race met meerdere mensen,
// de eindstand en beloning per plek, wegvallen, de berichten, de vloeiende weergave bij een gast en de host-kant met een nephub.
//   node scripts/coopwedstrijd_test.mjs
import * as W from '../game/js/coopwedstrijd.js';
import * as S from '../game/js/coopwedstrijdscore.js';
import { bestInput, KART, LAPS } from '../game/js/kartrace.js';
import { KARTBAAN_TRACK } from '../game/js/kartbaanspoor.js';

let bad = 0, n = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', naam, info); } };
const DT = 1 / 60;
const T = KARTBAAN_TRACK;

// ---- invoer van een gast naar de kart
{
  const a = W.invoerNaarKart({ mx: 0, my: -1, buttons: 0 });
  check('vooruit is gas', a.throttle === 1 && a.steer === 0 && !a.drift);
  const b = W.invoerNaarKart({ mx: 0.5, my: 1, buttons: 2 });
  check('achteruit is rem, rechts stuurt, bit 1 is de handrem', b.throttle === -1 && b.steer === 0.5 && b.drift);
  const c = W.invoerNaarKart(null);
  check('geen invoer is niets', c.throttle === 0 && c.steer === 0 && !c.drift);
  check('rommel wordt genegeerd', W.invoerNaarKart({ mx: NaN, my: 'x', buttons: 'a' }).throttle === 0);
}

// ---- de grid: dezelfde kart voor iedereen, AI vult aan, een rematch schuift de pole
const MENSEN = [{ slot: 0, naam: 'Tammo', char: 'tammo' }, { slot: 1, naam: 'Tessa', char: 'anita' }];
{
  const r = W.maakRace(MENSEN);
  check('vier karts op de grid', r.karts.length === W.MAX_RIJDERS);
  check('twee mensen en twee AI-rijders', r.karts.filter((k) => k.mens).length === 2 && r.karts.filter((k) => !k.mens).length === 2);
  check('de host staat vooraan in de lijst', r.karts[0].slot === 0 && r.karts[1].slot === 1);
  check('AI-rijders hebben eigen namen', new Set(r.karts.map((k) => k.name)).size === 4);
  const pos = r.karts.map((k) => `${k.u.toFixed(2)},${k.v.toFixed(2)}`);
  check('iedereen staat op een eigen plek', new Set(pos).size === 4);
  const r2 = W.maakRace(MENSEN, { draai: 1 });
  check('een rematch zet de host niet meer op pole', r2.karts[0].u !== r.karts[0].u || r2.karts[0].v !== r.karts[0].v);
  const r5 = W.maakRace([...MENSEN, { slot: 2, naam: 'Rik', char: 'rik' }, { slot: 3, naam: 'Sanne', char: 'sanne' }, { slot: 4, naam: 'Bram', char: 'bram' }]);
  check('meer dan vier mensen: de vijfde rijdt niet mee', r5.karts.length === 4 && r5.karts.every((k) => k.mens) && !r5.karts.some((k) => k.slot === 4));
  check('niemand heeft een andere kart: dezelfde KART voor alle rijders', r.karts.every((k) => typeof k.f === 'number') && KART.top === 24);
}

// ---- een race met twee mensen (de goede bot rijdt voor beide) en AI
function rijRace(r, { stil = [], weg = {}, maxS = 400, onTik = null } = {}) {
  let t = 0; const ev = [];
  while (r.phase !== 'klaar' && t < maxS) {
    for (const [slot, sec] of Object.entries(weg)) if (t >= sec) W.verlaat(r, +slot);
    ev.push(...W.tikRace(r, DT, (slot) => {
      if (stil.includes(slot)) return null;
      const k = r.karts.find((x) => x.mens && x.slot === slot);
      return bestInput(k, T);
    }));
    if (onTik) onTik(r, t);
    t += DT;
  }
  return { t, ev };
}
{
  const r = W.maakRace(MENSEN);
  const { t, ev } = rijRace(r);
  check('de race eindigt', r.phase === 'klaar', `${r.phase} na ${t.toFixed(0)} s`);
  check('het aftellen 3-2-1 en daarna GO', ev.filter((e) => e.type === 'lights').map((e) => e.n).join() === '1,2,3' && ev.filter((e) => e.type === 'go').length === 1);
  check('beide mensen finishen', r.karts.filter((k) => k.mens).every((k) => k.finished));
  check('drie ronden per kart', r.karts.filter((k) => k.finished).every((k) => k.lapTimes.length === LAPS));
  const rijen = W.eindstand(r);
  check('een eindstand van vier, de plekken 1 tot 4', rijen.length === 4 && rijen.map((x) => x.plek).join() === '1,2,3,4');
  check('de tijden lopen op', rijen.filter((x) => x.fin).every((x, i, a) => i === 0 || x.tijd >= a[i - 1].tijd));
  const mensRijen = rijen.filter((x) => !x.ai);
  const geld = mensRijen.map((x) => W.beloning(x).geld);
  check('elke mens krijgt het bedrag van zijn plek', mensRijen.every((x) => W.beloning(x).geld === W.PRIJZEN[x.plek]) && geld.every((g) => g > 0));
  check('een betere plek geeft meer', mensRijen[0].plek === mensRijen[1].plek || W.beloning(mensRijen[0]).geld > W.beloning(mensRijen[1]).geld);
  check('de AI krijgt niets', rijen.filter((x) => x.ai).every((x) => W.beloning(x).geld === 0 && W.beloning(x).xp === 0));
  check('de loopbaanpunten dalen met de plek', W.beloning({ plek: 1, fin: true }).xp > W.beloning({ plek: 4, fin: true }).xp);
}

// ---- iemand die stilstaat houdt de race niet op, en krijgt geen geld
{
  const r = W.maakRace(MENSEN);
  const { t } = rijRace(r, { stil: [1] });
  check('de race eindigt ook als de gast niets doet', r.phase === 'klaar' && t < W.RACE_CAP, t.toFixed(0));
  const rijen = W.eindstand(r), tessa = rijen.find((x) => x.slot === 1), tammo = rijen.find((x) => x.slot === 0);
  check('wie niet finisht krijgt geen geld maar wel een paar punten', !tessa.fin && W.beloning(tessa).geld === 0 && W.beloning(tessa).xp > 0);
  check('de host finisht en krijgt zijn plek', tammo.fin && W.beloning(tammo).geld > 0);
  check('de gast die stilstond is niet verder gekomen dan de AI die reed', tessa.plek >= 3);
}
// ---- niemand finisht: de tijdslimiet
{
  const r = W.maakRace(MENSEN);
  const { t } = rijRace(r, { stil: [0, 1] });
  check('zonder finish houdt de tijdslimiet de race eerlijk kort', r.phase === 'klaar' && t < W.RACE_CAP + W.GO_AT + 8, t.toFixed(0));
}

// ---- wegvallen: de race loopt door voor de anderen
{
  const r = W.maakRace([...MENSEN, { slot: 2, naam: 'Rik', char: 'rik' }]);
  const { t } = rijRace(r, { weg: { 1: 14 } }); // een gast valt halverwege de eerste ronde weg
  const rijen = W.eindstand(r), g = rijen.find((x) => x.slot === 1);
  check('de race loopt door na het wegvallen', r.phase === 'klaar' && t < 200, t.toFixed(0));
  check('wie wegviel is gemarkeerd en krijgt niets', g.weg && W.beloning(g).geld === 0 && W.beloning(g).xp === 0);
  check('zijn kart rijdt door onder de AI', r.karts.find((k) => k.slot === 1).prog > 50);
  check('de anderen finishen en krijgen hun plek', rijen.filter((x) => !x.ai && !x.weg).every((x) => x.fin && W.beloning(x).geld > 0));
  check('verlaat een onbekende of al weggevallen slot doet niets', !W.verlaat(r, 9) && !W.verlaat(r, 1));
}
{
  const r = W.maakRace(MENSEN);
  rijRace(r, { weg: { 1: 0 } });
  check('iedereen behalve de host weg: de race gaat gewoon door voor de host', r.karts[0].finished);
}

// ---- de uitnodiging
{
  const u = W.maakUitnodiging('kartbaan', 'Karten in Ulrum', [1, 2, 3]);
  check('de uitnodiging wacht op iedereen', !W.klaarMetUitnodiging(u) && u.rest === W.UITNODIGING_S);
  check('J en N worden onthouden', W.antwoord(u, 1, true) && W.antwoord(u, 2, false) && u.keuze[1] === 'ja' && u.keuze[2] === 'nee');
  check('een tweede antwoord telt niet', !W.antwoord(u, 1, false) && u.keuze[1] === 'ja');
  check('een onbekende speler verandert niets', !W.antwoord(u, 9, true));
  check('na 9 seconden is plek 3 nog aan het kiezen', !W.tikUitnodiging(u, 9) && u.keuze[3] === 'wacht');
  check('na 10 seconden zonder antwoord doet iemand niet mee', W.tikUitnodiging(u, 1.2) && u.keuze[3] === 'nee');
  check('alleen wie ja zei rijdt mee', W.jaSlots(u).join() === '1');
  const v = W.maakUitnodiging('kartbaan', 'Karten in Ulrum', [1, 2]);
  W.antwoord(v, 1, true); W.antwoord(v, 2, true);
  check('als iedereen antwoordde begint de race meteen', W.klaarMetUitnodiging(v));
  check('de uitnodigingstekst noemt J, N en de tijd', /J = ja, N = nee/.test(W.uitnodigingTekst({ label: 'Karten in Ulrum', rest: 7.2 }, 'Tammo')) && /8 seconden/.test(W.uitnodigingTekst({ label: 'x', rest: 7.2 })));
}

// ---- de berichten
{
  const r = W.maakRace(MENSEN);
  for (let i = 0; i < 300; i++) W.tikRace(r, DT, () => ({ throttle: 1, steer: 0, drift: false }));
  const m = W.momentopname(r, 5);
  const json = JSON.stringify(m);
  check('een momentopname past ruim in een bericht (max 2048 bytes)', json.length < 700, json.length);
  const l = W.leesWed(JSON.parse(json));
  check('een momentopname wordt gelezen', l && l.f === 'st' && l.s.length === 4 && l.n === 5);
  check('een kapotte momentopname wordt geweigerd', !W.leesWed({ k: 'wed', f: 'st', n: 1, t: 0, rt: 0, s: [[1, 2]] }) && !W.leesWed({ k: 'wed', f: 'st', n: 1.5, t: 0, rt: 0, s: [] }) && !W.leesWed({ k: 'wed', f: 'st', n: 1, t: 'x', rt: 0, s: l.s }));
  check('een onbekende soort wordt geweigerd', !W.leesWed({ k: 'wed', f: 'boem' }) && !W.leesWed({ k: 'iets' }) && !W.leesWed(null));
  const s = W.leesWed(W.startEvent('kartbaan', [{ slot: 0, naam: 'Tammo', char: 'tammo' }, { slot: 1, naam: 'Tessa', char: 'anita' }], 2));
  check('een start wordt gelezen', s && s.deeln.length === 2 && s.draai === 2 && s.deeln[1].naam === 'Tessa');
  check('een start met dubbele plek of te veel rijders wordt geweigerd', !W.leesWed({ k: 'wed', f: 'start', id: 'x', deeln: [[0, 'a', ''], [0, 'b', '']] }) && !W.leesWed({ k: 'wed', f: 'start', id: 'x', deeln: [[0, 'a'], [1, 'b'], [2, 'c'], [3, 'd'], [4, 'e']] }));
  const e = W.leesWed(W.eindEvent(W.eindstand(r), { plek: 2, geld: 80, xp: 12, fin: 1 }));
  check('een uitslag wordt gelezen', e && e.rijen.length === 4 && e.jij.plek === 2 && e.jij.geld === 80);
  check('een stop-bericht heeft geen rijen', W.leesWed(W.eindEvent([], null, true)).gestopt === true);
  check('namen met opmaak worden schoongemaakt', W.leesWed({ k: 'wed', f: 'uit', id: 'a', label: '<b>Race</b>', sec: 5 }).label === 'bRace/b');
  check('een gast kan alleen ja, nee, weg of nogmaals zeggen', W.leesGast({ k: 'wedgast', a: 'ja' }) && !W.leesGast({ k: 'wedgast', a: 'geld' }) && !W.leesGast({ k: 'x', a: 'ja' }));
}

// ---- de gast tekent wat de host rekent, vloeiend en zonder haperen
{
  const host = W.maakRace(MENSEN);
  const start = W.leesWed(W.startEvent('kartbaan', MENSEN, 0));
  const g = W.maakSpiegel(start, 1);
  check('de eigen kart staat bij de gast vooraan', g.karts[0].slot === 1 && g.karts[0].player === true && g.karts.length === 4);
  const gev = [];
  let nHost = 0, sinds = 0, maxFout = 0, tot = 0;
  for (let i = 0; i < 60 * 24; i++) {
    W.tikRace(host, DT, (slot) => bestInput(host.karts.find((k) => k.slot === slot), T));
    sinds += DT;
    if (sinds >= 1 / W.STAND_HZ) { sinds = 0; W.voerIn(g, W.leesWed(JSON.parse(JSON.stringify(W.momentopname(host, ++nHost))))); }
    gev.push(...W.tikSpiegel(g, DT));
    if (i > 60 * 6 && host.phase === 'race') { // de gast loopt een vaste achterstand achter op de host (de weergavetijd), zonder sprongen
      const mijn = host.karts.find((k) => k.slot === 1), spiegel = g.karts[0];
      const d = Math.hypot(mijn.u - spiegel.u, mijn.v - spiegel.v); maxFout = Math.max(maxFout, d); tot++;
    }
  }
  check('de gast ziet het aftellen en de start', gev.filter((e) => e.type === 'lights').length === 3 && gev.filter((e) => e.type === 'go').length === 1, JSON.stringify(gev.filter((e) => e.type !== 'lap').map((e) => e.type)));
  check('de gast loopt een kwart seconde achter, niet meer', maxFout > 0 && maxFout < W.VERTRAGING * 24 * 1.8 + 1, maxFout.toFixed(2));
  check('een oudere momentopname wordt genegeerd', !W.voerIn(g, { n: 1, s: g.bron.map(() => new Array(11).fill(0)), t: 0, rt: 0, l: 0, ph: 0 }));
  const dubbel = W.voerIn(g, { n: g.laatste, s: g.bron.map(() => new Array(11).fill(0)), t: 0, rt: 0, l: 0, ph: 0 });
  check('dezelfde momentopname twee keer telt maar één keer', !dubbel);
  check('de positie van de gast is de positie van de host (zelfde baan)', Math.hypot(g.karts[0].u - host.karts[1].u, g.karts[0].v - host.karts[1].v) < 24 * (W.VERTRAGING + 0.15));
}
{ // een trage verbinding (100 ms momentopnamen heen, 150 ms invoer terug): de eigen kart reageert meteen en blijft dicht bij de host
  const lopen = (stuur) => {
    const host = W.maakRace(MENSEN), g = W.maakSpiegel(W.leesWed(W.startEvent('kartbaan', MENSEN, 0)), 1);
    const naarGast = [], naarHost = []; let sinds = 0, nHost = 0, hostInvoer = { throttle: 0, steer: 0, drift: false };
    let som = 0, maxFout = 0, tot = 0, aNa = null; const gastInvoer = { throttle: 0, steer: 0, drift: false };
    for (let i = 0; i < 60 * 50; i++) {
      const nu = i * DT;
      W.tikRace(host, DT, (slot) => (slot === 1 ? hostInvoer : bestInput(host.karts.find((k) => k.slot === slot), T)));
      sinds += DT;
      if (sinds >= 1 / W.STAND_HZ) { sinds = 0; naarGast.push([nu + 0.1, W.leesWed(JSON.parse(JSON.stringify(W.momentopname(host, ++nHost))))]); }
      while (naarGast.length && naarGast[0][0] <= nu) W.voerIn(g, naarGast.shift()[1]);
      while (naarHost.length && naarHost[0][0] <= nu) hostInvoer = naarHost.shift()[1];
      const me = g.karts[0];
      let echt = g.phase === 'race' ? bestInput(me, T) : { throttle: 0, steer: 0, drift: false };
      if (stuur && nu >= 30 && nu < 30.1) echt = { throttle: 1, steer: 1, drift: false }; // 0,1 s hard naar rechts
      Object.assign(gastInvoer, echt);
      naarHost.push([nu + 0.15, { ...echt }]);
      W.tikSpiegel(g, DT, () => gastInvoer);
      if (nu >= 30.1 && aNa == null) aNa = me.a;
      if (nu > 20 && host.phase === 'race' && !host.karts[1].finished) { const hk = host.karts[1], d = Math.hypot(hk.u - me.u, hk.v - me.v); som += d; tot++; maxFout = Math.max(maxFout, d); }
    }
    return { aNa, som: som / tot, maxFout, tot, g };
  };
  const met = lopen(true), zonder = lopen(false);
  check('de eigen kart draait meteen mee met het sturen (binnen 0,1 s, voor de host het weet)', Math.abs(met.aNa - zonder.aNa) > 0.04, (met.aNa - zonder.aNa).toFixed(3));
  check('de eigen kart blijft gemiddeld binnen 6 m van wat de host rekent', zonder.tot > 100 && zonder.som < 6, zonder.som.toFixed(2));
  check('en nooit ver weg (geen sprongen van meer dan 20 m)', zonder.maxFout < 20, zonder.maxFout.toFixed(1));
  const g = zonder.g;
  check('de voorspelling is er alleen met invoer: zonder invoer toont de gast wat de host rekent', g.sim && (W.tikSpiegel(g, DT, null), g.sim === null));
}
{ // de host staat even stil (pauze): de gast houdt de laatste stand vast
  const host = W.maakRace(MENSEN), g = W.maakSpiegel(W.leesWed(W.startEvent('kartbaan', MENSEN, 0)), 1);
  for (let i = 0; i < 400; i++) { W.tikRace(host, DT, () => ({ throttle: 1, steer: 0, drift: false })); if (i % 5 === 0) W.voerIn(g, W.leesWed(W.momentopname(host, i + 1))); W.tikSpiegel(g, DT); }
  const u0 = g.karts[0].u, v0 = g.karts[0].v;
  for (let i = 0; i < 300; i++) W.tikSpiegel(g, DT);
  const u1 = g.karts[0].u, v1 = g.karts[0].v;
  for (let i = 0; i < 300; i++) W.tikSpiegel(g, DT);
  check('geen nieuwe momentopnamen: de karts staan stil in plaats van door te schieten', Math.hypot(g.karts[0].u - u1, g.karts[0].v - v1) < 0.01 && Math.hypot(u1 - u0, v1 - v0) < 24 * 0.5);
}

// ---- de host-kant met een nephub: uitnodigen, starten, bijhouden, uitbetalen, rematch
const HOST = () => ({ throttle: 1, steer: 0, drift: false }); // de eigen toetsen van wie het spel opende
function nepWereld(spelers) {
  const log = [];
  const hub = { roster: { spelers }, announce: (b, slot) => { log.push([slot, b]); return true; } };
  const world = { coopNet: { role: 'host', hub }, companion: { x: 0, y: 0 }, coop: { remote: true, remoteInput: { mx: 0, my: -1, buttons: 0 } }, coopFigures: { 2: { slot: 2, x: 0, y: 0, input: { mx: 0, my: -1, buttons: 0 } } }, messages: [], addMessage(t) { this.messages.push(t); }, coopMeld(slot, t) { this.messages.push([slot, t]); } };
  return { world, log, hub };
}
const ROSTER = () => [{ slot: 0, char: 'tammo', verbinding: 'ok' }, { slot: 1, char: 'anita', verbinding: 'ok' }, { slot: 2, char: 'rik', verbinding: 'ok' }, { slot: 3, char: 'sanne', verbinding: 'ok' }];
{
  const betaald = [];
  W.zetWedHaken({ betaalGast: (w, slot, geld, extra) => { betaald.push([slot, geld, extra]); return true; } });
  let gestart = null;
  W.registreerWedstrijd('kartbaan', { naam: 'Karten in Ulrum', start: (w, r) => { gestart = r; return true; }, solo: () => 'solo' });
  const { world, log, hub } = nepWereld(ROSTER());
  const r0 = W.wedNodigUit({ coopNet: null }, 'kartbaan');
  check('zonder sessie is het gewoon solo', !r0.ok && r0.reden === 'solo');
  const noGuests = nepWereld([{ slot: 0, char: 'tammo', verbinding: 'ok' }]);
  check('zonder gasten is het solo', !W.wedNodigUit(noGuests.world, 'kartbaan').ok);
  const u = W.wedNodigUit(world, 'kartbaan');
  check('elke verbonden gast krijgt Meedoen?', u.ok && log.filter(([, b]) => b.f === 'uit').map(([s]) => s).join() === '1,2,3' && log[0][1].sec === 10);
  check('nog een keer drukken tijdens het wachten start niet dubbel', W.wedNodigUit(world, 'kartbaan').reden === 'wacht' && log.filter(([, b]) => b.f === 'uit').length === 3);
  check('gast 1 zegt ja, gast 2 nee', W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1) && W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 2));
  check('de host zelf kan geen antwoord geven', !W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 0));
  W.wedHostTik(world, 5);
  check('na 5 seconden wacht de race nog op gast 3', !gestart);
  W.wedHostTik(world, 5.5);
  check('na het aftellen begint de race met de rijders die ja zeiden', gestart && gestart.karts.filter((k) => k.mens).map((k) => k.slot).join() === '0,1', gestart && gestart.karts.map((k) => k.slot).join());
  check('wie nee zei of niet antwoordde hoort dat het niet doorgaat', log.filter(([, b]) => b.f === 'af').map(([s]) => s).sort().join() === '2,3');
  const start = log.find(([, b]) => b.f === 'start');
  check('de gast die meedoet krijgt de start met de grid', start && start[0] === 1 && start[1].deeln.length === 2);
  check('zijn lichaam staat stil bij de host', world.companion.coopWedstrijd === true && !world.coopFigures[2].coopWedstrijd);
  // de race: gast 1 rijdt, de host ook; elke 1/12 s een momentopname
  const before = log.length;
  for (let i = 0; i < 60; i++) W.wedRaceTik(world, gestart, DT, HOST);
  const nSt = log.slice(before).filter(([, b]) => b.f === 'st').length;
  check('de gast krijgt ongeveer 12 momentopnamen per seconde', nSt >= 10 && nSt <= 13, nSt);
  check('alleen wie meedoet krijgt momentopnamen', log.slice(before).filter(([, b]) => b.f === 'st').every(([s]) => s === 1));
  // de invoer van gast 1 stuurt zijn kart
  const u1 = gestart.karts[1].prog;
  world.coop.remoteInput = { mx: 0, my: -1, buttons: 0 };
  for (let i = 0; i < 60 * 8; i++) W.wedRaceTik(world, gestart, DT, HOST);
  check('de stick van de gast laat zijn kart rijden', gestart.karts[1].prog > u1 + 20, gestart.karts[1].prog.toFixed(1));
  check('de eigen toetsen van wie het spel opende sturen zijn kart', gestart.karts[0].prog > 20, gestart.karts[0].prog.toFixed(1));
  check('het lichaam van de gast rijdt mee met zijn kart', Math.hypot(world.companion.x, world.companion.y) > 0);
  // een gast valt weg
  hub.roster.spelers.find((s) => s.slot === 1).verbinding = 'lost';
  W.wedRaceTik(world, gestart, DT, HOST);
  check('wegvallen markeert de kart en geeft het lichaam vrij', gestart.karts[1].weg === true && world.companion.coopWedstrijd === false);
  const na = log.length;
  for (let i = 0; i < 30; i++) W.wedRaceTik(world, gestart, DT, HOST);
  check('een weggevallen gast krijgt geen momentopnamen meer', log.slice(na).every(([, b]) => b.f !== 'st'));
  hub.roster.spelers.find((s) => s.slot === 1).verbinding = 'ok';
  // eindstand
  for (const k of gestart.karts) { k.prog = 330 * 3 + 1; k.finished = true; k.lapTimes = [30, 30, 30]; k.finishT = 90 + k.bron * 3; }
  gestart.karts[1].weg = false;
  gestart.result = null; gestart.phase = 'outro';
  const eind = W.wedHostEind(world, gestart);
  check('de host krijgt zijn eigen plek en beloning terug', eind && eind.jij && eind.jij.plek === 1 && eind.jij.geld === W.PRIJZEN[1]);
  check('de gast krijgt zijn uitslag en zijn eigen beloning', log.some(([s, b]) => s === 1 && b.f === 'eind' && b.jij && b.jij.plek === 2 && b.jij.geld === W.PRIJZEN[2]));
  check('de beloning gaat naar de eigen portemonnee en loopbaan van de gast', betaald.length === 1 && betaald[0][0] === 1 && betaald[0][1] === W.PRIJZEN[2] && betaald[0][2].vak === 'race' && betaald[0][2].xp > 0);
  check('niemand die niet meedeed krijgt geld', betaald.every(([s]) => s === 1));
  check('het lichaam van de gast staat niet meer vast', world.companion.coopWedstrijd === false);
  // rematch
  check('de gast die meedeed kan nog een keer vragen', W.wedHandleGast(world, { k: 'wedgast', a: 'nogmaals' }, 1) && W.willenOpnieuw(world).join() === '1');
  check('een gast die niet meedeed kan dat niet', !W.wedHandleGast(world, { k: 'wedgast', a: 'nogmaals' }, 3));
  gestart = null;
  const opn = W.wedOpnieuw(world);
  check('de host start de rematch met een nieuwe uitnodiging', opn.ok && log.filter(([, b]) => b.f === 'uit').length === 6);
  for (const s of [1, 2, 3]) W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, s);
  W.wedHostTik(world, 0.1);
  check('de rematch heeft een andere pole en meer rijders', gestart && gestart.draai === 1 && gestart.karts.filter((k) => k.mens).length === 4);
  // de host stopt
  const lg = log.length;
  W.wedHostEind(world, gestart, { gestopt: true });
  check('stopt de host dan krijgt iedereen een stopbericht en niemand een beloning', log.slice(lg).filter(([, b]) => b.f === 'eind' && b.gestopt).length === 3 && betaald.length === 1);
}

// ---- de gast-kant: berichten van de host
{
  const ev = [];
  let spiegelBinnen = null;
  W.zetWedGastHaken('kartbaan', { start: (w, st, sp) => { spiegelBinnen = sp; return true; }, eind: (w, uit, sp) => { ev.push(['eind', uit.gestopt, !!sp]); } });
  const verzonden = [];
  const world = { coopNet: { role: 'client', session: { slot: 1, sendEvent: (b) => { verzonden.push(b); return true; } } }, messages: [], addMessage(t) { this.messages.push(t); } };
  W.wedHandleHost(world, { k: 'wed', f: 'uit', id: 'kartbaan', label: 'Karten in Ulrum', sec: 10 });
  check('de gast ziet de uitnodiging', world.coopWedGast.uitn && world.coopWedGast.uitn.rest === 10);
  check('een host-bericht bij de host zelf wordt genegeerd', !W.wedHandleHost({ coopNet: { role: 'host' } }, { k: 'wed', f: 'uit', id: 'a', label: 'b' }));
  check('J stuurt ja naar de host en sluit de uitnodiging', W.wedGastStuur(world, 'ja') && verzonden[0].a === 'ja' && !world.coopWedGast.uitn);
  check('een tweede antwoord zonder uitnodiging gaat niet', !W.wedGastStuur(world, 'nee'));
  W.wedHandleHost(world, W.startEvent('kartbaan', MENSEN, 0));
  check('de start zet de gast in de race', spiegelBinnen && world.coopWedstrijd === true && spiegelBinnen.karts[0].slot === 1);
  check('een start waar de gast niet in staat doet niets', !W.wedHandleHost({ ...world, coopWedGast: null, coopNet: { role: 'client', session: { slot: 3, sendEvent() {} } } }, W.startEvent('kartbaan', MENSEN, 0)));
  const host = W.maakRace(MENSEN); W.tikRace(host, DT, null);
  check('momentopnamen komen binnen', W.wedHandleHost(world, W.momentopname(host, 1)) && world.coopWedGast.spiegel.buf.length === 1);
  W.wedHandleHost(world, W.eindEvent(W.eindstand(host), { plek: 1, geld: 120, xp: 14, fin: 1 }));
  check('de uitslag beëindigt de race bij de gast', !world.coopWedGast.spiegel && world.coopWedstrijd === false && world.coopWedGast.uitslag && ev[0][0] === 'eind' && ev[0][2] === true);
  check('de gast kan nog een keer vragen, één keer', W.wedGastStuur(world, 'nogmaals') && !W.wedGastStuur(world, 'nogmaals') && verzonden.filter((b) => b.a === 'nogmaals').length === 1);
  W.wedHandleHost(world, { k: 'wed', f: 'uit', id: 'kartbaan', label: 'Karten in Ulrum', sec: 10 });
  W.wedHandleHost(world, W.startEvent('kartbaan', MENSEN, 0));
  W.wedHandleHost(world, W.eindEvent([], null, true));
  check('stopt de host dan staat de gast weer vrij zonder uitslag', world.coopWedstrijd === false && !world.coopWedGast.uitslag);
  W.wedHandleHost(world, W.startEvent('kartbaan', MENSEN, 0));
  W.wedGastReset(world);
  check('een gast die zelf wegvalt ruimt het scherm op', !world.coopWedGast.spiegel && world.coopWedstrijd === false && ev.at(-1)[1] === true);
}

// ---- een score-wedstrijd (golf): pure regels
const BANEN = [{ par: 2 }, { par: 3 }, { par: 2 }, { par: 3 }, { par: 2 }, { par: 3 }];
{
  const sc = S.maakScore('pitchputt', MENSEN, BANEN);
  check('iedereen begint met een lege kaart', sc.deeln.length === 2 && S.banenGespeeld(sc, 0) === 0 && S.banenGespeeld(sc, 1) === 0);
  check('alleen de eerstvolgende baan telt', !S.meldBaan(sc, 0, 1, 3) && S.meldBaan(sc, 0, 0, 2) && !S.meldBaan(sc, 0, 0, 2) && S.meldBaan(sc, 0, 1, 3));
  check('slagen buiten het bereik worden geweigerd (0, meer dan par + 4, geen geheel getal)', !S.meldBaan(sc, 0, 2, 0) && !S.meldBaan(sc, 0, 2, 7) && !S.meldBaan(sc, 0, 2, 1.5) && !S.meldBaan(sc, 0, 2, '2') && S.meldBaan(sc, 0, 2, 6));
  check('een onbekende speler of baan telt niet', !S.meldBaan(sc, 9, 0, 3) && !S.meldBaan(sc, 1, 6, 3) && !S.meldBaan(sc, 1, -1, 3));
  const st = S.standScore(sc);
  check('de live stand: wie het best staat tegen par staat bovenaan', st[0].slot === 0 && st[0].banen === 3 && st[0].slagen === 11 && st[0].rel === 4 || st[0].slot === 1, JSON.stringify(st));
  S.meldBaan(sc, 1, 0, 2); S.meldBaan(sc, 1, 1, 2); S.meldBaan(sc, 1, 2, 2);
  const st2 = S.standScore(sc);
  check('de stand telt par over de gespeelde banen', st2[0].slot === 1 && st2[0].rel === -1 && st2[1].slot === 0 && st2[1].rel === 4, JSON.stringify(st2));
  check('de stand-melding komt heel aan', S.leesStand(JSON.parse(JSON.stringify(S.standEvent(sc)))).rijen.length === 2 && !S.leesStand({ k: 'wed', f: 'sc', n: 1, r: [[1, 2, 3]] }));
}
{
  const sc = S.maakScore('pitchputt', [...MENSEN, { slot: 2, naam: 'Rik', char: 'rik' }], BANEN);
  const speel = (slot, lijst) => lijst.forEach((s, i) => S.meldBaan(sc, slot, i, s));
  speel(0, [2, 3, 2, 3, 2, 3]); // 15 = par, klaar
  check('de eerste die klaar is start de korte klok voor de anderen', sc.eersteKlaar === 0 && S.tikScore(sc, 100).length === 0);
  speel(1, [2, 3, 2, 3, 2, 3]);
  check('de ronde gaat door zolang iemand nog speelt', sc.fase === 'bezig' && S.tikScore(sc, 100).length === 0);
  const ev = S.tikScore(sc, S.NA_EERSTE_SCORE_S);
  check('na de korte klok eindigt de ronde, ook als iemand nog niet klaar is', ev.length === 1 && ev[0].reden === 'tijd na de eerste' && sc.fase === 'klaar');
  check('daarna telt een melding niet meer', !S.meldBaan(sc, 2, 0, 3));
  const u = S.uitslagScore(sc);
  check('wie niet klaar is krijgt par + 4 voor elke baan die niet af is', u.find((r) => r.slot === 2).slagen === BANEN.reduce((a, b) => a + b.par + 4, 0));
  check('gelijke totalen delen een plek, de volgende is de derde', u[0].plek === 1 && u[1].plek === 1 && u[2].plek === 3 && S.winnaars(u).length === 2, JSON.stringify(u.map((r) => [r.slot, r.plek, r.slagen])));
  check('de uitslagtekst zegt hoeveel banen af waren', /par \(15 slagen\)/.test(u[0].tekst) && /0 van 6 banen/.test(u[2].tekst), u[2].tekst);
  check('de beloning volgt de plek; wie niet klaar is krijgt alleen punten', S.beloningScore(u[0]).geld === S.PRIJZEN_SCORE[1] && S.beloningScore(u[2]).geld === 0 && S.beloningScore(u[2]).xp > 0);
}
{
  const sc = S.maakScore('pitchputt', MENSEN, BANEN);
  S.meldBaan(sc, 0, 0, 2); S.meldBaan(sc, 1, 0, 3);
  check('wie wegvalt telt niet meer mee', S.verlaatScore(sc, 1) && !S.meldBaan(sc, 1, 1, 3) && !S.verlaatScore(sc, 1));
  const ev = S.tikScore(sc, S.SCORE_CAP_S + 1);
  check('de tijdslimiet van de hele ronde', ev[0] && ev[0].reden === 'tijdslimiet');
  const u = S.uitslagScore(sc);
  check('wie wegviel staat onderaan, zonder beloning', u[1].slot === 1 && u[1].weg && S.beloningScore(u[1]).geld === 0 && S.beloningScore(u[1]).xp === 0);
  const sc2 = S.maakScore('pitchputt', MENSEN, BANEN);
  S.verlaatScore(sc2, 1);
  for (let i = 0; i < 6; i++) S.meldBaan(sc2, 0, i, 2 + (i % 2));
  check('de ronde eindigt als wie nog meedoet klaar is', S.tikScore(sc2, 1)[0].reden === 'allen klaar');
}

// ---- de host en de gast met een nephub: golf
{
  const betaald = [];
  W.zetWedHaken({ betaalGast: (w, slot, geld, extra) => { betaald.push([slot, geld, extra]); return true; } });
  let gestart = null, eind = null;
  W.registreerWedstrijd('pitchputt', { naam: 'Pitch & putt', soort: 'score', banen: () => BANEN, start: (w, sc) => { gestart = sc; return true; }, plek: () => ({ x: 100, y: 200 }), extra: () => ({ v: 'concours' }), eind: (w, res) => { eind = res || 'gestopt'; }, solo: () => 'solo' });
  const { world, log, hub } = nepWereld(ROSTER());
  check('de uitnodiging voor golf gaat naar elke gast', W.wedNodigUit(world, 'pitchputt').ok && log.filter(([, b]) => b.f === 'uit' && b.label === 'Pitch & putt').length === 3);
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1); W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2); W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 3);
  W.wedHostTik(world, 0.1);
  check('de ronde begint met wie ja zei', gestart && gestart.deeln.map((d) => d.slot).join() === '0,1,2');
  const st = log.find(([s, b]) => s === 1 && b.f === 'start');
  const lees = W.leesWed(st[1]);
  check('de start vertelt de banen en de plek', lees && lees.banen.join() === '2,3,2,3,2,3' && lees.v === 'concours' && lees.deeln.length === 3);
  check('de lichamen van de gasten staan stil bij de eerste tee', world.companion.coopWedstrijd === true && world.coopFigures[2].coopWedstrijd === true && Math.hypot(world.companion.x - 100, world.companion.y - 200) < 3);
  check('wie nee zei hoort dat het niet doorgaat', log.some(([s, b]) => s === 3 && b.f === 'af'));
  check('een tweede wedstrijd tegelijk kan niet', W.wedNodigUit(world, 'pitchputt').reden === 'bezig');
  // de gast meldt zijn slagen (geldig), een valse melding niet
  check('een gast meldt zijn eerste baan', W.wedHandleGast(world, { k: 'wedgast', a: 'score', b: 0, s: 3 }, 1));
  check('een melding voor een baan die niet de volgende is telt niet', !W.wedHandleGast(world, { k: 'wedgast', a: 'score', b: 2, s: 3 }, 1) && !W.wedHandleGast(world, { k: 'wedgast', a: 'score', b: 1, s: 99 }, 1));
  check('de host meldt zijn eigen baan', W.wedHostScore(world, 0, 2) && !W.wedHostScore(world, 0, 2));
  const n0 = log.length;
  W.wedHostTik(world, 0.6);
  const sc1 = log.slice(n0).filter(([, b]) => b.f === 'sc');
  check('de stand gaat naar wie meedoet, niet naar wie nee zei', sc1.length === 2 && sc1.every(([s]) => s === 1 || s === 2), sc1.map(([s]) => s).join());
  const n1 = log.length; W.wedHostTik(world, 0.6);
  check('zonder nieuwe slagen geen nieuwe stand', log.slice(n1).filter(([, b]) => b.f === 'sc').length === 0);
  const rijen = W.wedScoreRijen(world);
  check('de host ziet de live stand voor het bord', rijen.length === 3 && rijen[0].naam && rijen.some((r) => r.slot === 1 && r.banen === 1 && r.rel === 1), JSON.stringify(rijen));
  // iedereen speelt door; gast 2 valt weg
  hub.roster.spelers.find((s) => s.slot === 2).verbinding = 'lost';
  W.wedHostTik(world, 0.1);
  check('een gast die wegvalt telt niet meer mee en zijn lichaam is vrij', gestart.weg[2] === true && world.coopFigures[2].coopWedstrijd === false);
  for (let b = 1; b < 6; b++) { W.wedHandleGast(world, { k: 'wedgast', a: 'score', b, s: BANEN[b].par }, 1); W.wedHostScore(world, b, BANEN[b].par); }
  W.wedHandleGast(world, { k: 'wedgast', a: 'score', b: 0, s: 3 }, 1);
  W.wedHostTik(world, 0.1);
  check('als wie nog meedoet klaar is, eindigt de ronde en de host krijgt de uitslag', eind && eind !== 'gestopt' && eind.rijen.length === 3, JSON.stringify(eind && eind.jij));
  check('de host wint (par) voor de gast (+1)', eind.jij.plek === 1 && eind.winnaars.join() === '0', JSON.stringify(eind.rijen.map((r) => [r.slot, r.plek, r.slagen])));
  const ge = log.filter(([s, b]) => s === 1 && b.f === 'eind').pop();
  const gl = W.leesWed(ge[1]);
  check('de gast krijgt zijn uitslag met tekst per speler en zijn eigen plek', gl && gl.rijen.length === 3 && /slagen/.test(gl.rijen[0].tekst) && gl.jij.plek === 2 && gl.jij.geld === S.PRIJZEN_SCORE[2], JSON.stringify(gl && gl.jij));
  check('de gast die wegviel krijgt geen uitslag en niets', !log.some(([s, b]) => s === 2 && b.f === 'eind') && !betaald.some(([s]) => s === 2));
  check('de beloning per plek gaat naar de eigen portemonnee en het vak golf', betaald.length === 1 && betaald[0][0] === 1 && betaald[0][1] === S.PRIJZEN_SCORE[2] && betaald[0][2].vak === 'golf');
  check('lichamen weer vrij en een rematch kan', world.companion.coopWedstrijd === false && W.wedHandleGast(world, { k: 'wedgast', a: 'nogmaals' }, 1) && W.wedOpnieuw(world).ok);
  // de host stopt de ronde
  for (const s of [1, 2, 3]) W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, s);
  hub.roster.spelers.find((s) => s.slot === 2).verbinding = 'ok';
  W.wedHostTik(world, 0.1); eind = null;
  const lg = log.length;
  check('de host kan de ronde voor iedereen stoppen', W.wedScoreStop(world) && eind === 'gestopt' && log.slice(lg).filter(([, b]) => b.f === 'eind' && b.gestopt).length >= 1 && betaald.length === 1);
}
{ // het scherm van de gast bij golf
  const ev = []; const verzonden = [];
  W.zetWedGastHaken('pitchputt', { start: (w, st) => { ev.push(['start', st.v, st.banen.length]); return true; }, eind: (w, uit, sp) => { ev.push(['eind', !!uit.gestopt, sp]); }, tik: (w, dt, sp) => { ev.push(['tik']); return true; } });
  const world = { coopNet: { role: 'client', session: { slot: 1, sendEvent: (b) => { verzonden.push(b); return true; } } }, messages: [], addMessage(t) { this.messages.push(t); } };
  W.wedHandleHost(world, W.startEvent('pitchputt', MENSEN, 0, { banen: [2, 3, 2, 3, 2, 3], v: 'concours' }));
  check('de start van golf zet de gast op zijn eigen scherm met de baan van de host', ev[0] && ev[0][1] === 'concours' && ev[0][2] === 6 && world.coopWedstrijd === true && world.coopWedGast.score && !world.coopWedGast.spiegel);
  check('elke frame draait de hook van de gast', W.wedGastTik(world, 0.016) === true && ev.some((e) => e[0] === 'tik'));
  check('een gast meldt zijn slagen', W.wedGastScore(world, 0, 3) && verzonden.at(-1).a === 'score' && verzonden.at(-1).b === 0 && verzonden.at(-1).s === 3);
  W.wedHandleHost(world, { k: 'wed', f: 'sc', n: 4, r: [[0, 2, 5, 0, 0], [1, 1, 3, 1, 0]], t: 30 });
  const rijen = W.wedScoreRijen(world);
  check('de stand komt van de host en staat op volgorde', rijen.length === 2 && rijen[0].slot === 0 && rijen[0].naam === 'Tammo' && rijen[1].rel === 1, JSON.stringify(rijen));
  check('stoppen: de host hoort het en het scherm is vrij', W.wedGastVerlaat(world) && verzonden.at(-1).a === 'weg' && !world.coopWedGast.score && world.coopWedstrijd === false && !W.wedGastTik(world, 0.016));
  W.wedHandleHost(world, W.startEvent('pitchputt', MENSEN, 0, { banen: [2, 3], v: 'x' }));
  W.wedHandleHost(world, W.eindEvent([{ plek: 1, naam: 'Tammo', slot: 0, fin: true, tijd: null, beste: null, weg: false, tekst: 'par (15 slagen)' }], { plek: 1, geld: 100, xp: 14, fin: 1 }));
  check('de uitslag van de host sluit de ronde en blijft als kaart staan', ev.at(-1)[0] === 'eind' && world.coopWedGast.uitslag && world.coopWedGast.uitslag.rijen[0].tekst === 'par (15 slagen)' && !world.coopWedGast.score);
  check('een start zonder geldige banen is een race-start: de baan van golf ontbreekt dan', !W.leesWed({ k: 'wed', f: 'start', id: 'pitchputt', deeln: [[0, 'a', '']], banen: [1, 9] }).banen);
}

console.log(bad ? `${bad} van ${n} controles mislukt` : `ok: ${n} controles`);
process.exit(bad ? 1 : 0);
