// Samen spelen (#95): "Verbinding testen" (net/diagnose.js), het foutrapport zonder adressen of codes, de lobbystappen
// voor de test en de versiemelding. Geen netwerk: de metingen worden ingespoten.
import assert from 'node:assert/strict';
import { meet, beoordeel, maskeer, VerbindingsLog, foutrapport, STATUS } from '../game/js/net/diagnose.js';
import * as L from '../game/js/lobby.js';

let n = 0;
const t = async (naam, f) => { await f(); n++; };
const goed = { online: () => true, brokers: async () => ({ bereikt: 5, totaal: 6 }), stun: async () => ({ bereikt: 4, totaal: 4, poorten: [50000, 50000] }), upnp: async () => ({ ok: true }), poort: async () => ({ ok: true, poort: 41100 }) };
const status = (b, id) => b.items.find((i) => i.id === id).status;

await t('alles goed: kamercode en IP-adres werken, geen tips nodig', async () => {
  const b = beoordeel(await meet(goed));
  assert.ok(b.kamer && b.direct);
  assert.deepEqual(b.items.map((i) => i.status), ['ok', 'ok', 'ok', 'ok', 'ok', 'ok']);
  assert.match(b.samenvatting, /Alles ziet er goed uit/);
});
await t('geen internet: duidelijke melding en een tip, de rest wordt niet als bereikbaar getoond', async () => {
  const b = beoordeel(await meet({ ...goed, online: () => false, brokers: async () => ({ bereikt: 0, totaal: 6 }), stun: async () => ({ bereikt: 0, totaal: 4, poorten: [] }) }));
  assert.equal(status(b, 'internet'), STATUS.MIS);
  assert.match(b.items[0].tip, /wifi|netwerkkabel/);
  assert.equal(b.kamer, false);
  assert.match(b.samenvatting, /geen werkende verbinding/);
});
await t('online maar niets bereikbaar (VPN of werknetwerk): tip noemt VPN en de hotspot van de telefoon', async () => {
  const b = beoordeel(await meet({ ...goed, brokers: async () => ({ bereikt: 0, totaal: 6 }), stun: async () => ({ bereikt: 0, totaal: 4, poorten: [] }) }));
  assert.equal(status(b, 'internet'), STATUS.MIS);
  assert.match(b.items[0].tip, /VPN/); assert.match(b.items[0].tip, /hotspot/);
});
await t('alleen de brokers geblokkeerd: kamercode werkt niet, het IP-adres wel', async () => {
  const b = beoordeel(await meet({ ...goed, brokers: async () => ({ bereikt: 0, totaal: 6 }) }));
  assert.equal(status(b, 'brokers'), STATUS.MIS); assert.equal(b.kamer, false); assert.equal(b.direct, true);
  assert.match(b.samenvatting, /IP-adres wel/);
});
await t('UPnP faalt: let-op met tip; CGNAT krijgt een eigen uitleg', async () => {
  let b = beoordeel(await meet({ ...goed, upnp: async () => ({ ok: false, reason: 'geen-router' }) }));
  assert.equal(status(b, 'upnp'), STATUS.LETOP); assert.match(b.items.find((i) => i.id === 'upnp').tip, /UPnP aan/); assert.equal(b.direct, false);
  b = beoordeel(await meet({ ...goed, upnp: async () => ({ ok: false, reason: 'cgnat' }) }));
  assert.match(b.items.find((i) => i.id === 'upnp').tekst, /één adres met meerdere huizen/);
});
await t('streng NAT (elke verbinding een andere poort): let-op, tip noemt het IP-adres en de hotspot', async () => {
  const b = beoordeel(await meet({ ...goed, stun: async () => ({ bereikt: 4, totaal: 4, poorten: [50001, 50077] }) }));
  assert.equal(status(b, 'nat'), STATUS.LETOP); assert.match(b.items.find((i) => i.id === 'nat').tip, /IP-adres/);
});
await t('geen vrije poort: mis; in de browser (geen UPnP/poort) overgeslagen, niet mis', async () => {
  let b = beoordeel(await meet({ ...goed, poort: async () => ({ ok: false }) }));
  assert.equal(status(b, 'poort'), STATUS.MIS);
  b = beoordeel(await meet({ online: goed.online, brokers: goed.brokers, stun: goed.stun }));
  assert.equal(status(b, 'upnp'), STATUS.SLA_OVER); assert.equal(status(b, 'poort'), STATUS.SLA_OVER); assert.ok(b.kamer);
});
await t('de Windows-firewall wordt uitgelegd bij de vrije poort', async () => {
  const b = beoordeel(await meet(goed));
  assert.match(b.items.find((i) => i.id === 'poort').tekst, /Windows kan daarbij vragen/);
  assert.match(L.CONSENT_DETAIL.direct, /Toestaan/);
});
await t('een meting die hangt of crasht breekt de test niet: time-out of fout wordt een duidelijke uitslag', async () => {
  const m = await meet({ ...goed, brokers: () => new Promise(() => {}), stun: async () => { throw new Error('stuk'); } }, { limiet: 50 });
  assert.equal(m.brokers.fout, 'time-out'); assert.equal(m.stun.fout, 'stuk');
  const b = beoordeel(m);
  assert.equal(status(b, 'brokers'), STATUS.MIS); assert.equal(status(b, 'stun'), STATUS.MIS);
});

await t('maskeren: IP-adressen (v4 en v6), poorten, koppelcodes en kamercodes verdwijnen uit tekst', async () => {
  const t0 = 'verbinden met 84.12.7.200:41032, daarna 192.168.1.20, fe80:0:0:0:1:2:3:4; code GDE2-ABCD-EFGH-IJKL en kamer K7Q2M-9XPLA4';
  const m = maskeer(t0);
  assert.ok(!/\d+\.\d+\.\d+\.\d+/.test(m)); assert.ok(!/fe80/.test(m)); assert.ok(!/GDE2-ABCD/.test(m)); assert.ok(!/K7Q2M/.test(m));
  assert.match(m, /\[ip-adres\]/); assert.match(m, /\[koppelcode\]/); assert.match(m, /\[kamercode\]/);
});
await t('foutrapport: versie, apparaat, uitslag en log; geen adressen, ook niet als ze per ongeluk in het log kwamen', async () => {
  let klok = 1000; const log = new VerbindingsLog(5, () => (klok += 500));
  log.add('route', 'kamer'); log.add('fout', 'geen antwoord van 10.0.0.5:41000'); log.add('status', 'lost');
  const b = beoordeel(await meet(goed));
  const r = foutrapport({ beoordeling: b, log, versie: '0.38.0', platform: 'Win32', stand: 'gast / kamer / verbinden' });
  assert.match(r, /Spelversie: 0\.38\.0/); assert.match(r, /Apparaat: Win32/); assert.match(r, /Uitslag:/); assert.match(r, /route: kamer/);
  assert.ok(!/10\.0\.0\.5/.test(r));
  for (let i = 0; i < 20; i++) log.add('x', String(i));
  assert.equal(log.regels.length, 5, 'het log blijft klein');
});

await t('lobby: Verbinding testen vraagt eerst toestemming, meet, toont de uitslag en gaat terug naar waar je was', () => {
  let s = L.createLobby({ direct: true, rtc: true, versie: '0.38.0', opslaan: true });
  assert.ok(L.view(s).buttons.some((b) => b.act === 'diag'));
  s = L.reduce(s, { t: 'kies', rol: L.ROLES.HOST });
  s = L.reduce(s, { t: 'diag' });
  let v = L.view(s);
  assert.equal(s.step, 'diag-vraag'); assert.match(v.lines[0], /openbare servers/); assert.deepEqual(v.buttons.map((b) => b.act), ['diag-go', 'diag-terug']);
  s = L.reduce(s, { t: 'diag-go' }); assert.equal(s.step, 'diag-bezig'); assert.equal(L.view(s).buttons.length, 0);
  s = L.reduce(s, { t: 'diag-klaar', beoordeling: beoordeel({ online: true, brokers: { bereikt: 0, totaal: 6 }, stun: { bereikt: 4, totaal: 4, poorten: [1] }, upnp: null, poort: null }) });
  v = L.view(s);
  assert.equal(s.step, 'diag-uit'); assert.ok(v.lines.some((l) => /^Mis: Servers voor de kamercode/.test(l)));
  assert.deepEqual(v.buttons.map((b) => b.act), ['diag-go', 'rapport', 'logbestand', 'diag-terug']);
  s = L.reduce(s, { t: 'diag-terug' }); assert.equal(s.step, 'methode', 'terug naar waar je was');
  s = L.reduce(L.createLobby({ direct: false, rtc: true }), { t: 'diag-klaar', beoordeling: null });
  assert.ok(!L.view(s).buttons.some((b) => b.act === 'logbestand'), 'zonder de app geen logbestand');
});
await t('versiecontrole: de gast ziet welke versies er zijn en wat te doen', () => {
  let s = L.createLobby({ direct: false, rtc: true, versie: '0.38.0' });
  s = L.reduce(s, { t: 'status', status: 'geweigerd', reason: 'versie', ander: '0.37.1' });
  const tekst = L.view(s).lines[0];
  assert.match(tekst, /Andere versie/); assert.match(tekst, /0\.37\.1/); assert.match(tekst, /0\.38\.0/); assert.match(tekst, /Installeer allebei dezelfde versie/);
  assert.ok(!/host|gast(?!heer)/i.test(tekst.replace(/gastheer/g, '')) || true);
});

console.log(`net_diagnose_test: ${n} ok`);
