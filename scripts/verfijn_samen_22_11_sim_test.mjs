// Verfijnronde Samen spelen (22-11): simulaties en randgevallen van het uitnodigscherm en de spelerslijst
// (docs/VERFIJNING-22-11-SAMEN.md). Deterministisch (vaste zaden), zonder netwerk.
//   node scripts/verfijn_samen_22_11_sim_test.mjs
import assert from 'node:assert/strict';
import * as L from '../game/js/lobby.js';
import * as P from '../game/js/coopplayers.js';

let n = 0;
const t = (naam, f) => { f(); n++; };
const WEB = { direct: false, rtc: true };
const run = (caps, ...evs) => evs.reduce((s, e) => L.reduce(s, e), L.createLobby(caps));

t('lijstgast met getypte code: de rol is gast en "verbonden" komt aan', () => {
  let s = L.createLobby({ rtc: true, consentSaved: true });
  for (const e of [{ t: 'lijst-vraag' }, { t: 'invoer', text: 'K3J9D-8F2MN' }]) s = L.reduce(s, e);
  assert.equal(s.rol, 'gast'); assert.equal(s.step, 'verbinden');
  assert.equal(L.reduce(s, { t: 'status', status: 'ok', partner: { slot: 1 } }).step, 'verbonden');
});

t('code: zonder gastheer geen wachtkamer; met gasten blijft de gastenlijst staan', () => {
  const weg = run(WEB, { t: 'kies', rol: 'host' }, { t: 'verbreek' });
  assert.equal(L.reduce(weg, { t: 'code', code: 'K3J9D-8F2MN' }).step, 'start');
  let h = run(WEB, { t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' }, { t: 'akkoord' }, { t: 'code', code: 'AAAAA-BBBBB' });
  h = L.reduce(h, { t: 'spelers', lijst: [{ slot: 0, naam: 'A' }, { slot: 1, naam: 'B' }], max: 4 });
  assert.equal(h.step, 'verbonden');
  h = L.reduce(h, { t: 'code', code: 'CCCCC-DDDDD' });
  assert.equal(h.step, 'verbonden'); assert.equal(h.code, 'CCCCC-DDDDD');
});

t('spelerslijst: 20.000 willekeurige aansluitingen, verlaten, avatars en maxima houden de regels', () => {
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const namen = ['Sanne', 'sanne', 'Sanne 2', 'x'.repeat(30), 'Bouwer', 'Ünï cödé', '  ', 'Rik', 'Tammo', '<b>', 'A'];
  const r = P.createRoster(16);
  const uniek = (a) => new Set(a).size === a.length;
  for (let i = 0; i < 20000; i++) {
    const op = rnd();
    if (op < 0.35) { const p = P.wijsPlekToe(r, pick(P.EXTRA_CHARS).id); if (p && rnd() < 0.7) P.zetAvatar(r, p.slot, { naam: pick(namen), kleur: pick(['#ff0000', '#e6194b', '#4fb3ff', 'x']), char: rnd() < 0.3 ? pick(P.EXTRA_CHARS).id : undefined }); }
    else if (op < 0.6) P.verwijder(r, pick(r.spelers).slot);
    else if (op < 0.75) P.zetVerbinding(r, pick(r.spelers).slot, pick(['ok', 'lag', 'lost']));
    else if (op < 0.85) P.zetMax(r, Math.floor(rnd() * 20) - 2);
    else P.zetAvatar(r, pick(r.spelers).slot, { naam: pick(namen), kleur: pick(['#e6194b', '#3cb44b', '#4363d8']) });
    const l = P.lijst(r);
    assert.ok(uniek(r.spelers.map((x) => x.slot)), 'plekken uniek @' + i);
    assert.ok(r.spelers.length <= r.max || r.max === 1, 'niet meer spelers dan max @' + i);
    assert.ok(r.spelers.some((x) => x.slot === 0), 'de gastheer blijft @' + i);
    assert.ok(uniek(l.map((x) => x.naam.toLowerCase())), 'namen uniek @' + i + ' ' + l.map((x) => x.naam));
    assert.ok(uniek(l.map((x) => x.kleur.toLowerCase())), 'kleuren uniek @' + i);
    assert.ok(uniek(l.map((x) => x.char)), 'figuren uniek @' + i);
    const ev = P.lijstEvent(r);
    assert.ok(new TextEncoder().encode(JSON.stringify(ev)).length <= P.LIJST_BUDGET, 'lijst past @' + i);
    assert.ok(P.leesLijstEvent(ev), 'lijst terug te lezen @' + i);
  }
});

t('aansluiten: een dubbele naam of figuur krijgt een nummer of blijft van de eerste', () => {
  const r = P.createRoster(8);
  const a = P.wijsPlekToe(r, 'sanne'); P.zetAvatar(r, a.slot, { naam: 'Bouwer' });
  const b = P.wijsPlekToe(r, 'rik'); P.zetAvatar(r, b.slot, { naam: 'Sanne' }); // de figuur Sanne heet al zo
  const namen = P.lijst(r).map((x) => x.naam.toLowerCase());
  assert.equal(new Set(namen).size, namen.length, namen.join());
  const c = P.wijsPlekToe(r, 'sanne'); // Sanne is al van een ander: een andere figuur
  assert.notEqual(c.char, 'sanne');
  P.zetAvatar(r, c.slot, { char: 'rik' }); // Rik is van b
  assert.notEqual(P.lijst(r).find((x) => x.slot === c.slot).char, 'rik');
});

t('uitnodigscherm: 1200 willekeurige reeksen van 40 gebeurtenissen houden het scherm bruikbaar', () => {
  let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const lijst = [{ slot: 0, naam: 'A', char: 'tammo', verbinding: 'ok' }, { slot: 1, naam: 'B', char: 'rik', verbinding: 'lost' }, { slot: 2, naam: 'C', char: 'sanne', verbinding: 'ok' }];
  const evs = () => pick([
    { t: 'kies', rol: pick(['host', 'gast']) }, { t: 'route', route: pick(['kamer', 'direct']) }, { t: 'invoer', text: pick(['K3J9D-8F2MN', 'x', '', null, 'GDE2-x']) },
    { t: 'akkoord' }, { t: 'consent-vink', aan: true }, { t: 'code', code: 'K3J9D-8F2MN' }, { t: 'fout', msg: 'x' }, { t: 'diag' }, { t: 'diag-go' }, { t: 'diag-klaar', beoordeling: null }, { t: 'diag-terug' },
    { t: 'openbaar-vraag' }, { t: 'openbaar-ja', naam: 'Test' }, { t: 'openbaar-terug' }, { t: 'privaat' }, { t: 'overdragen' }, { t: 'overdragen-terug' },
    { t: 'lijst-vraag' }, { t: 'lijst-go' }, { t: 'lijst-data', lijst: [{ naam: 'S', spelers: 1, max: 4, versie: '1', kan: true, room: 'K3J9D8F2MN', id: 'a', ouderdom: 3 }] }, { t: 'lijst-kies', i: 0 }, { t: 'lijst-terug' },
    { t: 'spelers', lijst: pick([[], lijst, lijst.slice(0, 1)]), max: pick([0, 4, 99, NaN]) }, { t: 'verbinden' }, { t: 'status', status: pick(['ok', 'lag', 'lost', 'geweigerd', 'verbroken', 'weg']), reason: pick([null, 'vol', 'wachtwoord', 'constructor']) },
    { t: 'hervat' }, { t: 'bron-hervat' }, { t: 'bron-mislukt' }, { t: 'probeer' }, { t: 'adopteer', rol: pick(['host', 'gast']), route: 'kamer', code: 'K', lijst, max: 8, slot: 1 },
    { t: 'start-bezig' }, { t: 'start-klaar' }, { t: 'start-gevraagd' }, { t: 'verbreek' }, { t: 'terug' }, { t: 'verbind-tik', n: 3 },
  ]);
  const MET_ROL = ['verbonden', 'host-wacht', 'verbroken', 'verbinden', 'geweigerd', 'host-maakt-code'];
  for (const caps of [{ direct: true, rtc: true, lijst: true, startGate: true, bron: true }, { rtc: false }, { rtc: true, consentSaved: true }]) {
    for (let ronde = 0; ronde < 400; ronde++) {
      let s = L.createLobby(caps); const pad = [];
      for (let i = 0; i < 40; i++) {
        const e = evs(); pad.push(e.t);
        s = L.reduce(s, e); const v = L.view(s);
        const wat = s.step + ' na ' + pad.join(',');
        if (MET_ROL.includes(s.step)) assert.ok(s.rol, 'een scherm met verbinding heeft een rol: ' + wat);
        if (s.step !== 'diag-bezig') assert.ok(v.buttons.some((b) => !b.disabled), 'er is altijd een knop: ' + wat);
      }
    }
  }
});

console.log(`verfijn_samen_22_11_sim_test: ${n}/${n} ok`);
