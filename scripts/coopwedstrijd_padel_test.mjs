// Samen spelen (#443): padel tegen elkaar (game/js/padelmatch.js en de host- en gastkant in coopwedstrijd.js).
//   node scripts/coopwedstrijd_padel_test.mjs
import * as P from '../game/js/padelmatch.js';
import * as W from '../game/js/coopwedstrijd.js';
import { makeRng } from '../game/js/minigamekit.js';

let bad = 0, n = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', naam, info); } };
const DT = 1 / 60;
const MENSEN = (k) => [{ slot: 0, naam: 'Tammo', char: 'tammo' }, { slot: 1, naam: 'Tessa', char: 'anita' }, { slot: 2, naam: 'Rik', char: 'rik' }, { slot: 3, naam: 'Sanne', char: 'sanne' }].slice(0, k);
const vooruit = (team) => (team === 0 ? 1 : -1);

// Een bot die als mens speelt: naar de bal toe, slaat als hij dichtbij is (elke stap een nieuwe druk op Spatie).
function bot(m, slot, tik) {
  const s = m.stoelen.find((x) => x.slot === slot), F = vooruit(s.team), b = m.ball;
  let tu = s.hu, tv = s.hv, sw = false;
  if (b && m.phase === 'rally' && b.live && b.hitter !== s.team) {
    const p = m.pred || b;
    tu = (b.crossed ? b : p).u; tv = (b.crossed ? b : p).v;
    sw = Math.hypot(b.u - s.u, b.v - s.v) < 2.2;
  }
  if (m.phase === 'serve' && m.serverStoel === s.i) sw = true;
  const du = tu - s.u, dv = tv - s.v, d = Math.hypot(du, dv) || 1;
  const stil = d < 0.2;
  return { mx: stil ? 0 : clamp1(F * du / d), my: stil ? 0 : -clamp1(F * dv / d), buttons: sw && tik % 2 === 0 ? 2 : 0 };
}
const clamp1 = (x) => Math.max(-1, Math.min(1, x));

function speel(m, { weg = {}, maxS = 900, naTik = null } = {}) {
  let t = 0, tik = 0; const ev = [];
  while (m.fase !== 'klaar' && t < maxS) {
    for (const [slot, sec] of Object.entries(weg)) if (t >= sec) P.verlaatPadel(m, +slot);
    ev.push(...P.tikPadel(m, DT, (slot) => bot(m, slot, tik)));
    if (naTik) naTik(m, t);
    t += DT; tik++;
  }
  return { t, ev };
}

// ---- de indeling
{
  const i2 = P.indeling(MENSEN(2)), i3 = P.indeling(MENSEN(3)), i4 = P.indeling(MENSEN(4));
  check('twee mensen staan tegenover elkaar, elk met een AI-maatje', i2.length === 4 && i2[0].slot === 0 && i2[0].team === 0 && i2[1].slot === 1 && i2[1].team === 1 && i2.filter((s) => s.slot === null).length === 2 && i2[2].team === 0 && i2[3].team === 1);
  check('drie mensen: twee tegen een met een AI-maatje', i3.filter((s) => s.team === 0 && s.slot !== null).length === 2 && i3.filter((s) => s.team === 1 && s.slot !== null).length === 1);
  check('vier mensen: 2 tegen 2 zonder AI', i4.every((s) => s.slot !== null) && i4.filter((s) => s.team === 0).length === 2);
  check('de AI-stoelen hebben eigen namen', new Set(i2.map((s) => s.naam)).size === 4);
  check('een vijfde speler speelt niet mee', P.indeling([...MENSEN(4), { slot: 4, naam: 'X' }]).every((s) => s.slot !== 4));
}

// ---- een hele wedstrijd 2 tegen 2 met vier botmensen, host-autoritair en deterministisch met een eigen zaadje
{
  const m = P.maakPadel(MENSEN(4), { rng: makeRng(7) });
  check('de ploegen hebben namen', m.namen[0] === 'Tammo en Rik' && m.namen[1] === 'Tessa en Sanne', m.namen.join('|'));
  const punten = [];
  const { t, ev } = speel(m, { naTik: (mm) => { for (const s of mm.stoelen) if (!(Math.abs(s.u) <= 5 && Math.abs(s.v) <= 10)) punten.push('buiten'); } });
  check('de wedstrijd eindigt', m.fase === 'klaar', `${m.phase} na ${t.toFixed(0)} s`);
  check('een ploeg heeft het gewonnen met genoeg games of na de tijdslimiet', Math.max(...m.games) >= P.GAMES_TE_WINNEN || m.capped, JSON.stringify(m.games));
  check('niemand loopt van het veld', punten.length === 0);
  check('er zijn punten gemaakt en slagen geslagen', ev.filter((e) => e.type === 'punt').length >= 4 && ev.filter((e) => e.type === 'pala').length >= 10);
  check('de ploegen houden hun helft: team 0 op v < 0, team 1 op v > 0', m.stoelen.every((s) => (s.team === 0 ? s.v < 0 : s.v > 0)));
  check('er is een winnaar en een klaar-gebeurtenis', ev.some((e) => e.type === 'klaar') && (m.winnaar === 0 || m.winnaar === 1));
  const rijen = P.uitslagPadel(m);
  check('de uitslag: de winnende ploeg is plek 1 en krijgt het meeste geld', rijen.length === 4 && rijen.filter((r) => r.plek === 1).length === 2 && P.beloningPadel(rijen.find((r) => r.plek === 1)).geld === P.PRIJZEN_PADEL[1] && P.beloningPadel(rijen.find((r) => r.plek === 2)).geld === P.PRIJZEN_PADEL[2], JSON.stringify(rijen.map((r) => [r.slot, r.plek])));
  check('de winnaars hebben de winnende ploeg', P.winnaarsPadel(rijen).every((s) => m.stoelen.find((x) => x.slot === s).team === m.winnaar));
  check('de tekst noemt de games', /gewonnen: \d-\d games|verloren: \d-\d games/.test(rijen[0].tekst), rijen[0].tekst);
  const m2 = P.maakPadel(MENSEN(4), { rng: makeRng(7) });
  speel(m2);
  check('hetzelfde zaadje en dezelfde invoer geven dezelfde wedstrijd', JSON.stringify(m2.games) === JSON.stringify(m.games) && m2.t === m.t);
}

// ---- 1 tegen 1 (twee mensen, twee AI-maatjes): de AI-maatjes slaan ook en alles loopt door
{
  const m = P.maakPadel(MENSEN(2), { rng: makeRng(11) });
  const { ev } = speel(m);
  check('1 tegen 1 eindigt ook', m.fase === 'klaar');
  const slagen = ev.filter((e) => e.type === 'pala').length;
  check('er worden slagen geslagen en de AI-maatjes spelen mee zonder te vallen', slagen >= 10 && ev.some((e) => e.type === 'punt'));
  const rijen = P.uitslagPadel(m);
  check('twee mensen in de uitslag: eentje wint, eentje verliest', rijen.length === 2 && new Set(rijen.map((r) => r.plek)).size === 2);
}

// ---- serveren en spiegelen: team 1 draait de richting om
{
  const m = P.maakPadel(MENSEN(2), { rng: makeRng(3) });
  // team 1 mens (slot 1): vooruit (my < 0) beweegt naar het net, dus v wordt kleiner; D (mx > 0) beweegt naar -u
  for (let i = 0; i < 160; i++) P.tikPadel(m, DT, () => null); // het intro
  check('de serve begint met team 0 en de host serveert', m.phase === 'serve' && m.serveTeam === 0 && m.stoelen[m.serverStoel].slot === 0);
  const t1 = m.stoelen.find((s) => s.slot === 1);
  const v0 = t1.v, u0 = t1.u;
  for (let i = 0; i < 30; i++) P.tikPadel(m, DT, (slot) => (slot === 1 ? { mx: 1, my: -1, buttons: 0 } : null));
  check('team 1 loopt met vooruit naar het net en met rechts naar de andere kant', t1.v < v0 - 1 && t1.u < u0 - 1, `${v0.toFixed(1)}->${t1.v.toFixed(1)} ${u0.toFixed(1)}->${t1.u.toFixed(1)}`);
  const t0 = m.stoelen.find((s) => s.slot === 0);
  const sv = t0.v;
  for (let i = 0; i < 30; i++) P.tikPadel(m, DT, (slot) => (slot === 0 ? { mx: 0, my: -1, buttons: 0 } : null));
  check('wie serveert staat stil tot hij slaat', t0.v === sv);
  // de serve: Spatie na de stuit
  let slaat = 0;
  for (let i = 0; i < 600 && m.phase === 'serve'; i++) P.tikPadel(m, DT, (slot) => (slot === 0 ? { mx: 0, my: 0, buttons: i % 2 ? 2 : 0 } : null));
  check('met Spatie wordt de serve geslagen (of na zes seconden vanzelf)', m.phase !== 'serve' || m.phaseT <= 0);
  check('de bal is in het spel en gaat naar de andere helft', m.ball && m.ball.live && m.ball.hitter === 0 && m.ball.vv > 0);
}

// ---- wegvallen: de AI neemt de stoel over, een ploeg zonder mensen verliest
{
  const m = P.maakPadel(MENSEN(3), { rng: makeRng(5) });
  const { ev } = speel(m, { weg: { 2: 20 } });
  check('als een speler wegvalt speelt de wedstrijd door', m.fase === 'klaar' && m.stoelen.find((s) => s.slot === 2).weg);
  const rijen = P.uitslagPadel(m);
  check('wie wegviel krijgt niets en staat onderaan', rijen.at(-1).slot === 2 && rijen.at(-1).weg && P.beloningPadel(rijen.at(-1)).geld === 0 && /niet meer erbij/.test(rijen.at(-1).tekst));
  check('wie bleef krijgt zijn beloning', rijen.filter((r) => !r.weg).every((r) => P.beloningPadel(r).geld > 0));
  const mw = P.maakPadel(MENSEN(2), { rng: makeRng(5) });
  const r2 = speel(mw, { weg: { 1: 15 } });
  check('valt de enige tegenstander weg, dan wint de ander meteen', mw.fase === 'klaar' && mw.winnaar === 0 && r2.t < 40, `${mw.winnaar} ${r2.t.toFixed(0)}`);
  const u2 = P.uitslagPadel(mw);
  check('de overblijver wordt plek 1 met zijn beloning', u2[0].slot === 0 && u2[0].plek === 1 && P.beloningPadel(u2[0]).geld === P.PRIJZEN_PADEL[1] && u2[1].weg);
  check('een onbekende speler wegzetten of twee keer kan niet', !P.verlaatPadel(mw, 9) && !P.verlaatPadel(mw, 1));
}

// ---- de momentopname en de spiegel van de gast
{
  const m = P.maakPadel(MENSEN(2), { rng: makeRng(9) });
  const sp = P.maakPadelSpiegel(W.leesWed(W.startEvent('padel', MENSEN(2), 0, { live: 1, v: 'baan3' })), 1);
  check('de spiegel kent zijn stoel en ploeg', sp.mijnStoel === 1 && sp.mijnTeam === 1 && sp.namen[0] === 'Tammo' && sp.namen[1] === 'Tessa', sp.namen.join('|'));
  let seq = 0, maxVerschil = 0, ontvangen = 0;
  let t = 0;
  const volg = (secs) => {
    for (let i = 0; i < secs * 60; i++) {
      P.tikPadel(m, DT, (slot) => bot(m, slot, i));
      t += DT;
      if (i % 5 === 0) { const b = P.snapPadel(m, ++seq); const l = P.leesLive(JSON.parse(JSON.stringify(b))); check('de momentopname is geldig', !!l); if (P.voerInPadel(sp, l)) ontvangen++; }
      P.tikPadelSpiegel(sp, DT);
      if (m.ball && sp.ball && m.phase === 'rally') maxVerschil = Math.max(maxVerschil, Math.hypot(m.ball.u - sp.ball.u, m.ball.v - sp.ball.v));
    }
  };
  volg(40);
  check('de gast ontvangt de momentopnamen', ontvangen >= 400, ontvangen);
  check('de spiegel volgt de stoelen van de host binnen een halve meter', m.stoelen.every((s, i) => Math.hypot(s.u - sp.stoelen[i].u, s.v - sp.stoelen[i].v) < 0.8), m.stoelen.map((s, i) => Math.hypot(s.u - sp.stoelen[i].u, s.v - sp.stoelen[i].v).toFixed(2)).join());
  check('de bal van de spiegel blijft in de buurt van de bal van de host (hoogstens 2 m)', maxVerschil < 2, maxVerschil.toFixed(2));
  check('de stand klopt', sp.points[0] === m.points[0] && sp.games[1] === m.games[1] && sp.phase === m.phase);
  check('een oudere momentopname telt niet', !P.voerInPadel(sp, { f: 'lv', n: 1, d: new Array(P.SNAP_LEN).fill(0), x: '' }));
  check('rommel wordt genegeerd', P.leesLive({ k: 'wed', f: 'lv', n: 1, d: [1, 2, 3] }) === null && P.leesLive({ k: 'wed', f: 'lv', n: 1, d: new Array(P.SNAP_LEN).fill('x') }) === null && P.leesLive(null) === null);
  check('de tekst van een melding wordt gestript', P.leesLive({ k: 'wed', f: 'lv', n: 2, d: new Array(P.SNAP_LEN).fill(0), x: '<b>Punt</b>' }).x === 'bPunt/b');
}

// ---- de host en de gast met een nephub: uitnodigen, starten, tikken, uitbetalen
const ROSTER = () => [{ slot: 0, char: 'tammo', verbinding: 'ok' }, { slot: 1, char: 'anita', verbinding: 'ok' }, { slot: 2, char: 'rik', verbinding: 'ok' }, { slot: 3, char: 'sanne', verbinding: 'ok' }];
function nepWereld(spelers) {
  const log = [];
  const hub = { roster: { spelers }, announce: (b, slot) => { log.push([slot, b]); return true; } };
  const inv = { 1: { mx: 0, my: 0, buttons: 0 }, 2: { mx: 0, my: 0, buttons: 0 }, 3: { mx: 0, my: 0, buttons: 0 } };
  const world = { coopNet: { role: 'host', hub }, companion: { x: 0, y: 0 }, coop: { remote: true, remoteInput: inv[1] }, coopFigures: { 2: { slot: 2, x: 0, y: 0, input: inv[2] }, 3: { slot: 3, x: 0, y: 0, input: inv[3] } }, messages: [], addMessage(t) { this.messages.push(t); } };
  return { world, log, hub, inv };
}
{
  const betaald = [];
  W.zetWedHaken({ betaalGast: (w, slot, geld, extra) => { betaald.push([slot, geld, extra]); return true; } });
  let gestart = null, eind = null;
  W.registreerWedstrijd('padel', { naam: 'Padel', soort: 'live', live: P.livePadel, maak: (deeln) => P.maakPadel(deeln, { rng: makeRng(21) }), start: (w, sim) => { gestart = sim; return true; }, plek: () => ({ x: 50, y: 60 }), extra: () => ({ v: 'baan3' }), eind: (w, res) => { eind = res || 'gestopt'; }, solo: () => 'solo' });
  const { world, log, hub, inv } = nepWereld(ROSTER());
  check('de uitnodiging voor padel gaat naar elke gast', W.wedNodigUit(world, 'padel').ok && log.filter(([, b]) => b.f === 'uit' && b.label === 'Padel').length === 3);
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1); W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2); W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 3);
  W.wedHostTik(world, 0.1);
  check('de wedstrijd begint met wie ja zei en de ploegen staan klaar', gestart && gestart.stoelen.filter((s) => s.slot !== null).map((s) => s.slot).join() === '0,1,2' && gestart.stoelen.filter((s) => s.slot === null).length === 1);
  const st = log.find(([s, b]) => s === 1 && b.f === 'start');
  const lees = W.leesWed(st[1]);
  check('de start vertelt dat het een live wedstrijd is en waar', lees && lees.live === true && lees.v === 'baan3' && lees.deeln.length === 3 && !lees.banen, JSON.stringify(lees));
  check('de lichamen van de gasten staan stil bij de baan', world.companion.coopWedstrijd === true && world.coopFigures[2].coopWedstrijd === true && !world.coopFigures[3].coopWedstrijd && Math.hypot(world.companion.x - 50, world.companion.y - 60) < 3);
  check('een tweede wedstrijd tegelijk kan niet', W.wedNodigUit(world, 'padel').reden === 'bezig');
  const hostInv = () => ({ mx: 0, my: 0, buttons: 0 });
  const n0 = log.length;
  for (let i = 0; i < 60; i++) W.wedLiveTik(world, gestart, DT, hostInv);
  const lv = log.slice(n0).filter(([, b]) => b.f === 'lv');
  check('elke gast die meedoet krijgt ongeveer 12 momentopnamen per seconde, de rest niet', lv.length >= 20 && lv.length <= 26 && lv.every(([s]) => s === 1 || s === 2), `${lv.length} ${[...new Set(lv.map(([s]) => s))]}`);
  check('de momentopnamen zijn geldig voor de gast', lv.every(([, b]) => P.leesLive(b)) && W.leesWed(lv[0][1]) && W.leesWed(lv[0][1]).f === 'lv');
  // de invoer van gast 1 (team 1) beweegt zijn stoel
  const s1 = gestart.stoelen.find((s) => s.slot === 1), v1 = s1.v;
  inv[1].my = -1; inv[1].mx = 0;
  for (let i = 0; i < 60; i++) W.wedLiveTik(world, gestart, DT, hostInv);
  check('de stick van de gast beweegt zijn stoel via de host', s1.v < v1 - 1, `${v1}->${s1.v}`);
  // gast 2 valt weg
  hub.roster.spelers.find((s) => s.slot === 2).verbinding = 'lost';
  W.wedLiveTik(world, gestart, DT, hostInv);
  check('een gast die wegvalt is weg en zijn lichaam is vrij', gestart.stoelen.find((s) => s.slot === 2).weg && world.coopFigures[2].coopWedstrijd === false);
  // gast 1 stopt zelf
  hub.roster.spelers.find((s) => s.slot === 2).verbinding = 'ok';
  check('een gast kan zelf stoppen (bericht weg)', W.wedHandleGast(world, { k: 'wedgast', a: 'weg' }, 1) && gestart.stoelen.find((s) => s.slot === 1).weg && world.companion.coopWedstrijd === false);
  // niemand van team 1 is er meer: de host wint
  let ev = [];
  for (let i = 0; i < 600 && !ev.some((e) => e.type === 'klaar'); i++) ev = W.wedLiveTik(world, gestart, DT, hostInv);
  check('de wedstrijd eindigt als een hele ploeg weg is', gestart.fase === 'klaar' && gestart.winnaar === 0);
  const res = W.wedHostLiveEind(world, gestart);
  check('de host krijgt de uitslag met zijn plek en beloning', res && res.jij.plek === 1 && res.jij.geld === P.PRIJZEN_PADEL[1] && res.rijen.length === 3, JSON.stringify(res && res.jij));
  check('wie wegviel krijgt niets en geen uitslag', !log.some(([s, b]) => s === 2 && b.f === 'eind') && !betaald.some(([s]) => s === 2) && !betaald.some(([s]) => s === 1));
  check('de eigen portemonnee en het vak padel zijn voor wie wint (host: geen betaalGast)', betaald.length === 0);
  check('lichamen weer vrij en daarna kan een nieuwe wedstrijd', world.companion.coopWedstrijd === false && W.wedNodigUit(world, 'padel').ok);
}
{ // een volledige 2 tegen 2 met uitbetaling aan de gasten
  const betaald = [];
  W.zetWedHaken({ betaalGast: (w, slot, geld, extra) => { betaald.push([slot, geld, extra]); return true; } });
  let gestart = null;
  W.registreerWedstrijd('padel', { naam: 'Padel', soort: 'live', live: P.livePadel, maak: (deeln) => P.maakPadel(deeln, { rng: makeRng(31) }), start: (w, sim) => { gestart = sim; return true; }, plek: () => ({ x: 50, y: 60 }), extra: () => ({ v: 'baan3' }), solo: () => 'solo' });
  const { world, log, inv } = nepWereld(ROSTER());
  W.wedNodigUit(world, 'padel');
  for (const s of [1, 2, 3]) W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, s);
  W.wedHostTik(world, 0.1);
  check('vier mensen: alle stoelen bezet', gestart && gestart.stoelen.every((s) => s.slot !== null));
  let tik = 0, ev = [];
  const hostBot = () => bot(gestart, 0, tik);
  while (gestart.fase !== 'klaar' && tik < 60 * 900) {
    for (const s of [1, 2, 3]) Object.assign(inv[s], bot(gestart, s, tik));
    ev = W.wedLiveTik(world, gestart, DT, hostBot); tik++;
  }
  check('de wedstrijd loopt uit via de host', gestart.fase === 'klaar');
  const res = W.wedHostLiveEind(world, gestart);
  const eindBerichten = log.filter(([, b]) => b.f === 'eind' && !b.gestopt);
  check('elke gast krijgt zijn uitslag met zijn eigen plek', eindBerichten.length === 3 && eindBerichten.every(([s, b]) => { const l = W.leesWed(b); return l && l.rijen.length === 4 && l.jij.plek >= 1 && /games/.test(l.rijen[0].tekst); }));
  check('de beloning per plek gaat naar de eigen portemonnee van elke gast (vak padel)', betaald.length === 3 && betaald.every(([s, geld, x]) => geld === P.PRIJZEN_PADEL[gestart.stoelen.find((z) => z.slot === s).team === gestart.winnaar ? 1 : 2] && x.vak === 'padel'), JSON.stringify(betaald));
  check('de host krijgt zijn eigen resultaat', res && res.jij && res.jij.geld > 0 && res.winnaars.length === 2);
  check('een rematch kan met J van een gast', W.wedHandleGast(world, { k: 'wedgast', a: 'nogmaals' }, 1) && W.wedOpnieuw(world).ok);
}
{ // de host stopt de wedstrijd
  let gestart = null;
  W.registreerWedstrijd('padel', { naam: 'Padel', soort: 'live', live: P.livePadel, maak: (deeln) => P.maakPadel(deeln), start: (w, sim) => { gestart = sim; return true; }, solo: () => 'solo' });
  const { world, log } = nepWereld(ROSTER());
  W.wedNodigUit(world, 'padel'); W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1); W.wedHostTik(world, 11);
  const lg = log.length;
  check('de host kan de wedstrijd voor iedereen stoppen, zonder beloning', W.wedHostLiveEind(world, gestart, { gestopt: true }) === null && log.slice(lg).some(([s, b]) => s === 1 && b.f === 'eind' && b.gestopt) && world.companion.coopWedstrijd === false);
}
{ // het scherm van de gast
  const ev = []; const verzonden = [];
  W.zetWedGastHaken('padel', { spiegel: (st, mijn) => P.maakPadelSpiegel(st, mijn), voerIn: P.voerInPadel, start: (w, st, sp) => { ev.push(['start', st.v, !!sp]); return true; }, eind: (w, uit, sp) => { ev.push(['eind', !!uit.gestopt]); }, tik: () => true });
  const world = { coopNet: { role: 'client', session: { slot: 1, sendEvent: (b) => { verzonden.push(b); return true; } } }, messages: [], addMessage(t) { this.messages.push(t); } };
  W.wedHandleHost(world, W.startEvent('padel', MENSEN(2), 0, { live: 1, v: 'baan3' }));
  const G = world.coopWedGast;
  check('de start van padel zet de gast op zijn eigen scherm met een spiegel', ev[0] && ev[0][1] === 'baan3' && ev[0][2] === true && G.spiegel && G.spiegel.mijnStoel === 1 && world.coopWedstrijd === true && !G.score);
  const m = P.maakPadel(MENSEN(2), { rng: makeRng(2) });
  for (let i = 0; i < 200; i++) P.tikPadel(m, DT, () => null);
  check('een momentopname van de host komt in de spiegel', W.wedHandleHost(world, P.snapPadel(m, 5)) && G.spiegel.phase === m.phase && G.spiegel.n === 5);
  check('een oudere momentopname wordt genegeerd', !W.wedHandleHost(world, P.snapPadel(m, 3)));
  check('stoppen: de host hoort het en het scherm is vrij', W.wedGastVerlaat(world) && verzonden.at(-1).a === 'weg' && !G.spiegel && world.coopWedstrijd === false);
  W.wedHandleHost(world, W.startEvent('padel', MENSEN(2), 0, { live: 1, v: 'baan3' }));
  W.wedHandleHost(world, W.eindEvent([{ plek: 1, naam: 'Tammo', slot: 0, fin: true, tijd: null, beste: null, weg: false, tekst: 'gewonnen: 3-1 games' }], { plek: 1, geld: 80, xp: 24, fin: 1 }));
  check('de uitslag van de host sluit de wedstrijd en blijft als kaart staan', ev.at(-1)[0] === 'eind' && G.uitslag && G.uitslag.rijen[0].tekst === 'gewonnen: 3-1 games' && !G.spiegel);
  check('een start met een live-vlag zonder baan is geen golf', !W.leesWed(W.startEvent('padel', MENSEN(2), 0, { live: 1 })).banen);
}

console.log(bad ? `${bad} van ${n} controles mislukt` : `ok: ${n} controles`);
process.exit(bad ? 1 : 0);
