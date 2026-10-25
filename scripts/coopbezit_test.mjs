// Samen spelen (#449): een eigen voertuig meenemen naar de wereld van een ander
// (bezorgen en delen). De regel is puur (coopbezit.js); de host zet de kopie neer.
// Hier zonder Electron en zonder three.js:
//   node scripts/coopbezit_test.mjs
import assert from 'node:assert/strict';
import {
  RECHTEN, STANDAARD_RECHT, STANDAARD_PAND_RECHT, MAX_BEZORG, MAX_PANDEN, SOORTEN, PAND_SLEUTEL,
  nieuweDeelStaat, rechtVan, zetDeelRecht, wisselRecht, magGebruiken, leesBezorg, bezorgEvent,
  pandEvent, bezorgVraag, pandVraag, bezorgControle, bezorgHost, bezorgPandHost, bezorgWeg,
  bezorgAllesWeg, zetDeelHaken, soortVan,
} from '../game/js/coopbezit.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok  ' + naam); };

const SPEC = {
  hero: { label: 'Fjord Escapade', kind: 'car', color: '#a11f1f', model: { name: 'escort', len: 4, wid: 1.65, maxSpeed: 50 } },
  mug: { label: 'Hunze Mug', kind: 'car', color: '#2e6b9e', model: { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42 } },
  sloep: { label: 'Sloep Nait Soezen', kind: 'boat', color: '#e8e6e0', model: { name: 'boat', len: 5, wid: 1.9, maxSpeed: 7 } },
  wiekenwubbo: { label: 'Wieken Wubbo', kind: 'heli', color: '#b8322a', model: { name: 'heli', len: 8.8, wid: 2.1, maxSpeed: 40 } },
};
// De nepwereldhaken: dezelfde vorm die main.js en home.js zetten, zonder de echte wereld.
const deuren = [];
const gevraagd = [];
zetDeelHaken({
  spec: (key) => SPEC[key] || null,
  plek: (world, x, y, model) => { gevraagd.push({ x, y, model }); return { x: 20, y: 30, angle: 0.5 }; },
  maak: (world, g, x, y, angle) => {
    const v = { x, y, angle, model: { ...g.spec.model, color: g.color }, color: g.color, upgrades: g.upgrades, health: g.health, dentLog: g.dents || [], flat: g.flat };
    world.vehicles.push(v);
    return v;
  },
  pand: (world, p) => (PAND_SLEUTEL.test(p.id) ? { x: p.x, y: p.y, ang: p.ang, gz: 0 } : null),
  pandZet: (world, slot, p) => { const m = { slot, id: p.id, x: p.x, y: p.y, ang: p.ang }; deuren.push(m); return m; },
  pandWeg: (world, slot) => { for (let i = deuren.length - 1; i >= 0; i--) if (deuren[i].slot === slot) deuren.splice(i, 1); },
});

function mkWorld() {
  const w = {
    coop: { remote: true }, companion: { x: 12, y: 8, angle: 0 },
    coopFigures: { 2: { slot: 2, x: 40, y: 40, angle: 0 } },
    vehicles: [], berichten: [], meldingen: [], aan: [],
    coopRoster: [{ slot: 1, naam: 'Tessa' }, { slot: 2, naam: 'Sven' }],
    addMessage(t) { this.berichten.push(t); },
    coopMeld(slot, t) { this.meldingen.push([slot, t]); },
    coopNet: { role: 'host', hub: { roster: { spelers: [{ slot: 0 }, { slot: 1 }, { slot: 2 }] }, announce(b, s) { w.aan.push([b, s]); } } },
  };
  return w;
}
const vraag = (extra = {}) => ({ k: 'bezorg', id: 'hero', color: '#a11f1f', upgrades: ['tyres1'], dents: [], health: 100, recht: 'iedereen', ...extra });
const pandBody = (extra = {}) => ({ k: 'bezorg', soort: 'pand', id: 'h:wp:WP1017', x: 120, y: 80, ang: 0.5, recht: 'iedereen', ...extra });

t('rechten: standaard deelt iedereen, alleen ik houdt hem voor jezelf, onzin verandert niets', () => {
  const s = nieuweDeelStaat();
  assert.equal(rechtVan(s, 'hero'), STANDAARD_RECHT);
  assert.equal(RECHTEN.includes(STANDAARD_RECHT), true);
  assert.equal(zetDeelRecht(s, 'hero', 'ik'), 'ik');
  assert.equal(rechtVan(s, 'hero'), 'ik');
  assert.equal(zetDeelRecht(s, 'hero', 'vrienden'), null, 'nog geen vriendenlijst: geen recht');
  assert.equal(rechtVan(s, 'hero'), 'ik', 'een onbekend recht laat de keuze staan');
  assert.equal(wisselRecht('ik'), 'iedereen'); assert.equal(wisselRecht('iedereen'), 'ik');
  assert.equal(zetDeelRecht(null, 'hero', 'ik'), null);
});

t('magGebruiken: de eigenaar altijd, een ander alleen als de eigenaar deelt (de host rijdt in zijn eigen wereld)', () => {
  assert.equal(magGebruiken('iedereen', 2, 1), true);
  assert.equal(magGebruiken('ik', 2, 1), false);
  assert.equal(magGebruiken('ik', 1, 1), true, 'de eigenaar zelf');
  assert.equal(magGebruiken(undefined, 2, 1), true, 'zonder recht: standaard delen');
  assert.equal(magGebruiken('ik', 0, 1), false, 'de host is ook maar een speler');
});

t('leesBezorg: alleen gegevens, en wat de host leest is gecontroleerd (een gast kan niets forceren)', () => {
  assert.equal(leesBezorg(null), null);
  assert.equal(leesBezorg({ k: 'iets' }), null);
  assert.equal(leesBezorg(vraag({ id: 'hero drop table' })), null);
  assert.equal(leesBezorg(vraag({ id: '' })), null);
  const v = leesBezorg(vraag({
    color: 'rood', upgrades: ['tyres1', 5, 'x'.repeat(40), null], dents: [[1, 2, 3], [1, 2], ['a', 'b', 'c'], [9, -9, 0.5]], health: 500, recht: 'vrienden',
  }));
  assert.equal(v.color, null, 'geen hex: de fabriekskleur');
  assert.deepEqual(v.upgrades, ['tyres1'], 'alleen echte onderdeelnamen');
  assert.deepEqual(v.dents, [[1, 2, 2], [2, -2, 0.5]], 'drie getallen per deuk, binnen de maat');
  assert.equal(v.health, 100, 'de gezondheid blijft tussen 5 en 100');
  assert.equal(v.recht, STANDAARD_RECHT, 'een onbekend recht valt terug op de standaard');
  assert.equal(leesBezorg(vraag({ health: -20 })).health, 5);
  assert.equal(leesBezorg(vraag()).soort, 'voertuig', 'een bericht zonder soort is een voertuig');
  assert.equal(SOORTEN.includes('pand'), true);
});

t('een gast stuurt alleen een vraag: niets van zijn wereld of save gaat mee en er verschijnt niets bij hem', () => {
  const w = { player: { inVehicle: null }, vehicles: [], coopBezit: nieuweDeelStaat(), verstuurd: [] };
  w.coopNet = { role: 'client', session: { slot: 1, sendEvent(b) { w.verstuurd.push(b); return true; } } };
  zetDeelRecht(w.coopBezit, 'hero', 'ik');
  const g = { id: 'hero', kind: 'car', label: 'Fjord Escapade', model: 'Escapade', color: '#a11f1f', upgrades: ['tyres1'], dents: [], health: 88, flat: false };
  const r = bezorgVraag(w, g);
  assert.equal(r.ok, true);
  assert.equal(w.verstuurd.length, 1);
  assert.equal(w.verstuurd[0].k, 'bezorg');
  assert.equal(w.verstuurd[0].soort, 'voertuig');
  assert.equal(w.verstuurd[0].recht, 'ik', 'de gast stuurt zijn eigen recht mee');
  assert.equal(w.vehicles.length, 0, 'de gast zet niets in zijn eigen wereld');
  // een boot en de heli gaan met dezelfde vraag, met hun eigen soort (#449)
  assert.equal(bezorgVraag(w, { ...g, id: 'sloep', kind: 'boat' }).ok, true, 'een boot gaat nu ook mee');
  assert.equal(w.verstuurd[1].soort, 'boot');
  assert.equal(bezorgVraag(w, { ...g, id: 'wiekenwubbo', kind: 'heli' }).ok, true, 'de heli gaat nu ook mee');
  assert.equal(w.verstuurd[2].soort, 'heli');
  assert.match(r.tekst, /klaar/, 'de gast hoort wat de gastheer doet');
  w.player.inVehicle = {};
  assert.equal(bezorgVraag(w, g).ok, false, 'stap eerst uit');
  assert.deepEqual(bezorgEvent(g, 'iedereen'), { k: 'bezorg', soort: 'voertuig', id: 'hero', color: '#a11f1f', upgrades: ['tyres1'], dents: [], health: 88, flat: false, recht: 'iedereen' });
  assert.equal(soortVan({ kind: 'boat' }), 'boot');
  assert.equal(soortVan({ kind: 'heli' }), 'heli');
  assert.equal(soortVan({ kind: 'bike' }), 'voertuig');
});

t('de host zet de kopie bij de gast neer, met kleur en schade, en vertelt het de anderen', () => {
  const w = mkWorld();
  assert.equal(bezorgHost(w, 1, vraag({ color: '#334455', health: 70, dents: [[0.1, 0.2, 0.3]] })), true);
  assert.equal(w.vehicles.length, 1);
  const v = w.vehicles[0];
  assert.deepEqual(v.coopBezit, { slot: 1, id: 'hero', recht: 'iedereen' });
  assert.equal(v.model.color, '#334455');
  assert.equal(v.health, 70);
  assert.deepEqual(v.dentLog, [[0.1, 0.2, 0.3]]);
  assert.deepEqual(v.upgrades, ['tyres1']);
  assert.equal(w.meldingen.length, 1);
  assert.equal(w.meldingen[0][0], 1);
  assert.match(w.meldingen[0][1], /staat klaar/);
  assert.equal(w.aan.length, 1, 'de andere gasten horen het');
  assert.equal(w.aan[0][1], 2);
  assert.match(w.aan[0][0].tekst, /Tessa/);
});

t('grenzen: geen tweede keer hetzelfde, hooguit twee per speler, en de host brengt niets mee', () => {
  const w = mkWorld();
  assert.equal(bezorgHost(w, 1, vraag()), true);
  assert.equal(bezorgHost(w, 1, vraag()), false, 'hetzelfde voertuig staat er al');
  assert.equal(w.vehicles.length, 1);
  assert.equal(bezorgHost(w, 1, vraag({ id: 'mug' })), true);
  assert.equal(bezorgHost(w, 1, vraag({ id: 'muis' })), false, 'boven het maximum');
  assert.equal(w.vehicles.length, MAX_BEZORG);
  assert.match(w.meldingen[w.meldingen.length - 1][1], new RegExp(String(MAX_BEZORG)));
  assert.equal(bezorgHost(w, 0, vraag({ id: 'mug' })), false, 'de host heeft zijn eigen voertuigen al');
  assert.equal(bezorgHost(w, 1, { k: 'bezorg', id: 'bestaatniet' }), false, 'een onbekend voertuig');
  assert.equal(w.vehicles.length, MAX_BEZORG);
});

t('weggaan: het voertuig van die gast gaat weg (ook als een ander erin rijdt), de rest blijft', () => {
  const w = mkWorld();
  bezorgHost(w, 1, vraag()); bezorgHost(w, 2, vraag({ id: 'mug' }));
  const [eigen, ander] = w.vehicles;
  let uit = 0;
  w.coopRijders = { 2: { slot: 2, v: eigen } };
  assert.equal(bezorgWeg(w, 1, () => { uit++; }), 1);
  assert.equal(uit, 1, 'de berijder stapt eerst uit');
  assert.deepEqual(w.vehicles, [ander]);
  assert.equal(bezorgControle(w.coopBezit, 1, { id: 'hero' }).ok, true, 'opnieuw bezorgen kan weer');
  assert.equal(bezorgAllesWeg(w), 1);
  assert.equal(w.vehicles.length, 0);
  assert.deepEqual(w.coopBezit.bezorgd, {});
});

t('geen plek: de host zegt het en zet niets neer', () => {
  const w = mkWorld();
  zetDeelHaken({ plek: () => null });
  assert.equal(bezorgHost(w, 1, vraag()), false);
  assert.match(w.meldingen[w.meldingen.length - 1][1], /past hij niet/);
  zetDeelHaken({ plek: () => ({ x: 20, y: 30, angle: 0 }) });
  assert.equal(bezorgHost(w, 1, vraag({ id: 'mug' })), true);
  assert.equal(w.vehicles.length, 1);
});

t('een boot en de heli komen met hun eigen soort en plek in de sessie (#449)', () => {
  const w = mkWorld();
  gevraagd.length = 0;
  zetDeelHaken({ plek: (world, x, y, model) => { gevraagd.push({ x, y, model }); return { x: 20, y: 30, angle: 0.5 }; } });
  const boot = vraag({ id: 'sloep', soort: 'boot', color: '#223344' });
  assert.equal(bezorgHost(w, 1, boot), true, 'de host zet de boot van de gast neer');
  assert.equal(gevraagd.length, 1);
  assert.equal(gevraagd[0].model.name, 'boat', 'de host zoekt water met het model van de boot');
  assert.equal(w.vehicles[0].coopBezit.soort, undefined, 'de kopie houdt alleen slot, id en recht bij');
  assert.deepEqual(w.vehicles[0].coopBezit, { slot: 1, id: 'sloep', recht: 'iedereen' });
  assert.match(w.meldingen[w.meldingen.length - 1][1], /ligt klaar/, 'een boot ligt');
  assert.match(w.aan[w.aan.length - 1][0].tekst, /eigen boot/);
  assert.equal(bezorgHost(w, 1, vraag({ id: 'wiekenwubbo', soort: 'heli' })), true, 'de heli ook');
  assert.equal(gevraagd[1].model.name, 'heli', 'de host zoekt open grond voor de heli');
  assert.match(w.meldingen[w.meldingen.length - 1][1], /staat op zijn plek/);
  assert.match(w.aan[w.aan.length - 1][0].tekst, /eigen helikopter/);
  assert.equal(w.vehicles.length, 2);
  // dezelfde grenzen als bij een auto: twee per speler, niet twee keer hetzelfde
  assert.equal(bezorgHost(w, 1, vraag({ id: 'sloep', soort: 'boot' })), false);
  // het model van de host bepaalt de soort: een boot als auto bestaat niet
  assert.equal(bezorgHost(w, 2, vraag({ id: 'sloep' })), false, 'soort voertuig bij een boot');
  assert.equal(bezorgHost(w, 2, vraag({ id: 'hero', soort: 'boot' })), false, 'soort boot bij een auto');
  assert.equal(w.vehicles.length, 2);
});

t('de rechten (iedereen of alleen ik) gelden ook voor een boot en de heli', () => {
  const s = nieuweDeelStaat();
  assert.equal(zetDeelRecht(s, 'sloep', 'ik'), 'ik');
  assert.equal(rechtVan(s, 'sloep'), 'ik');
  assert.equal(magGebruiken(rechtVan(s, 'sloep'), 2, 1), false, 'alleen de eigenaar');
  assert.equal(zetDeelRecht(s, 'wiekenwubbo', 'iedereen'), 'iedereen');
  assert.equal(magGebruiken(rechtVan(s, 'wiekenwubbo'), 2, 1), true);
  const w = mkWorld();
  const g = { id: 'sloep', kind: 'boat', label: 'Sloep Nait Soezen', color: '#e8e6e0', upgrades: [], dents: [], health: 100, flat: false };
  assert.equal(bezorgEvent(g, rechtVan(s, 'sloep')).recht, 'ik', 'het recht van de boot gaat mee over de lijn');
  assert.equal(bezorgHost(w, 1, bezorgEvent({ ...g, recht: 'ik' }, 'ik')), true);
  assert.deepEqual(w.vehicles[0].coopBezit, { slot: 1, id: 'sloep', recht: 'ik' });
  assert.match(w.meldingen[w.meldingen.length - 1][1], /Alleen jij hebt de sleutel/);
});

t('een pand gaat als soort pand over de lijn: alleen de deur, geen interieur of sleutel', () => {
  assert.equal(leesBezorg({ k: 'bezorg', soort: 'onderzeeer', id: 'hero' }), null, 'een onbekend soort bestaat niet');
  assert.equal(leesBezorg({ k: 'bezorg', soort: 'boot', id: 'hero' }).soort, 'boot', 'een boot is een eigen soort');
  assert.equal(leesBezorg({ k: 'bezorg', soort: 'heli', id: 'wiekenwubbo' }).soort, 'heli', 'de heli ook');
  assert.equal(leesBezorg({ k: 'bezorg', soort: 'pand', id: 'hero' }), null, 'een pand heeft een h:-sleutel');
  assert.equal(leesBezorg({ k: 'bezorg', soort: 'pand', id: 'h:wp:WP1017', x: 'veel', y: 0, ang: 0 }), null);
  assert.equal(leesBezorg({ k: 'bezorg', soort: 'pand', id: 'h:wp:WP1017', x: 1e6, y: 0, ang: 0 }), null, 'ver buiten de kaart');
  const p = leesBezorg({ k: 'bezorg', soort: 'pand', id: 'h:wp:WP1017', x: 12.5, y: -3, ang: 7.5, recht: 'vrienden', interieur: 'marmer' });
  assert.equal(p.soort, 'pand');
  assert.equal(p.id, 'h:wp:WP1017');
  assert.equal(p.recht, STANDAARD_PAND_RECHT, 'een onbekend recht valt terug op alleen ik');
  assert.equal(p.interieur, undefined, 'niets anders dan de deur gaat mee');
  assert.ok(p.ang >= 0 && p.ang < Math.PI * 2, 'de hoek is genormaliseerd');
  assert.deepEqual(pandEvent({ id: 'h:wp:WP1017', x: 1, y: 2, ang: 0.5 }, 'iedereen'),
    { k: 'bezorg', soort: 'pand', id: 'h:wp:WP1017', x: 1, y: 2, ang: 0.5, recht: 'iedereen' });
});

t('de gast stuurt de plek van zijn pand en zet zelf niets in zijn eigen wereld', () => {
  const w = { player: { inVehicle: null }, vehicles: [], coopBezit: nieuweDeelStaat(), verstuurd: [] };
  w.coopNet = { role: 'client', session: { slot: 1, sendEvent(b) { w.verstuurd.push(b); return true; } } };
  const r = pandVraag(w, { id: 'h:wp:WP1017', x: 100, y: 200, ang: 0.5 });
  assert.equal(r.ok, true);
  assert.equal(w.verstuurd.length, 1);
  assert.equal(w.verstuurd[0].soort, 'pand');
  assert.equal(w.verstuurd[0].recht, STANDAARD_PAND_RECHT, 'je huis deel je niet zomaar');
  assert.equal(w.vehicles.length, 0, 'de gast zet niets in zijn eigen wereld');
  assert.equal(pandVraag(w, { id: 'hero', x: 1, y: 2, ang: 0 }).ok, false, 'geen pandsleutel');
  assert.equal(pandVraag({}, { id: 'h:wp:WP1017', x: 1, y: 2, ang: 0 }).ok, false, 'zonder sessie geen pand');
});

t('de host controleert de plek en zet alleen een deur neer, zonder een save aan te raken', () => {
  const w = mkWorld();
  w.saveTekst = 'onveranderd';
  deuren.length = 0;
  assert.equal(bezorgHost(w, 1, pandBody()), true);
  assert.equal(deuren.length, 1, 'de host zet een deur neer');
  assert.deepEqual(w.coopBezit.panden[1], ['h:wp:WP1017']);
  assert.equal(w.saveTekst, 'onveranderd', 'de save van de host blijft zoals hij was');
  assert.equal(w.vehicles.length, 0, 'een pand is geen voertuig');
  assert.match(w.meldingen[w.meldingen.length - 1][1], /pand staat in de sessie/);
  assert.equal(w.aan.length, 1, 'de andere gasten horen het');
  assert.match(w.aan[0][0].tekst, /Tessa/);
  assert.equal(bezorgPandHost(w, 1, pandBody()), false, 'niet twee keer dezelfde deur');
  assert.equal(bezorgHost(w, 0, pandBody({ id: 'h:wp:WP1018' })), false, 'de host brengt geen eigen pand mee');
  assert.equal(bezorgHost(w, 1, { k: 'bezorg', soort: 'pand', id: 'geen-pand', x: 1, y: 2, ang: 0 }), false, 'een onbekende sleutel');
});

t('grenzen: hooguit drie panden per speler en alleen op een plek die de host goedkeurt', () => {
  const w = mkWorld();
  deuren.length = 0;
  for (const id of ['h:wp:WP1017', 'h:wp:WP1018', 'h:wk:WK001400']) assert.equal(bezorgPandHost(w, 2, pandBody({ id })), true);
  assert.equal(bezorgPandHost(w, 2, pandBody({ id: 'h:wp:WP1019' })), false, 'boven het maximum');
  assert.match(w.meldingen[w.meldingen.length - 1][1], new RegExp(String(MAX_PANDEN)));
  assert.equal(bezorgPandHost(w, 2, pandBody({ id: 'h:wk:WK001400' })), false, 'hetzelfde pand staat er al');
  zetDeelHaken({ pand: () => null });
  assert.equal(bezorgPandHost(w, 1, pandBody()), false, 'de host keurt de plek af');
  assert.equal(deuren.length, 3, 'er komt geen deur bij');
  zetDeelHaken({ pand: (ww, p) => ({ x: p.x, y: p.y, ang: p.ang, gz: 0 }) });
});

t('weggaan: de panden van die gast gaan mee terug, de rest blijft', () => {
  const w = mkWorld();
  w.saveTekst = 'x';
  deuren.length = 0;
  bezorgPandHost(w, 1, pandBody()); bezorgPandHost(w, 2, pandBody({ id: 'h:wp:WP1018' }));
  assert.equal(bezorgWeg(w, 1), 0, 'geen voertuig om weg te halen');
  assert.equal(deuren.length, 1, 'zijn deur gaat weg');
  assert.deepEqual(Object.keys(w.coopBezit.panden), ['2'], 'de deur van de ander blijft');
  assert.equal(w.saveTekst, 'x');
  assert.equal(bezorgControle(w.coopBezit, 1, { soort: 'pand', id: 'h:wp:WP1017' }).ok, true, 'opnieuw bezorgen kan weer');
  bezorgAllesWeg(w);
  assert.deepEqual(w.coopBezit.panden, {});
  assert.equal(deuren.length, 0);
});

t('geen staat of geen gastheer: niets breekt', () => {
  assert.equal(bezorgWeg({}, 1), 0);
  assert.equal(bezorgAllesWeg({}), 0);
  assert.equal(bezorgControle(null, 1, { id: 'hero' }).ok, true);
  assert.equal(bezorgControle(null, 1, { soort: 'pand', id: 'h:wp:WP1017' }).ok, true);
  assert.equal(bezorgVraag({}, { id: 'hero', kind: 'car' }).ok, false, 'zonder sessie geen bezorging');
  assert.equal(pandVraag({}, { id: 'h:wp:WP1017', x: 1, y: 2, ang: 0 }).ok, false, 'zonder sessie geen pand');
  assert.equal(bezorgHost({ coopNet: { role: 'client' } }, 1, pandBody()), false, 'een gast is geen host');
});

console.log(`coopbezit_test: ${n}/${n} ok`);
