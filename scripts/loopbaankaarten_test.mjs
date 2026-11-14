// Loopbanen (#846): de eerste klus als maatstaf, de overkoepelende teller, de eenmalige verhaalstapkaartjes
// en de prestatie "De Duizendpoot". Puur: de kaartkeuze en de tekst komen uit loopbaan.js + storyarc.js, het
// tonen en het eenmalig onthouden gaan via loopbaankaarten.js en het profiel (geen DOM, geen THREE).
//   node scripts/loopbaankaarten_test.mjs
import assert from 'node:assert/strict';
import * as L from '../game/js/loopbaan.js';
import * as Live from '../game/js/loopbaanlive.js';
import { kaartenBijStap, maybeCareerCards } from '../game/js/loopbaankaarten.js';
import { loopbanenBijStap } from '../game/js/storyarc.js';
import { ACHIEVEMENTS } from '../game/js/achievements.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message || e).split('\n')[0]); } };

const nepOpslag = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const schoon = () => Live.zetProfielVoorTest(null, null);

// ------------------------------------------------------------------ de maatstaf
t('eersteKlusGedaan: punten of teller, niet de menuknop', () => {
  const p = L.nieuwProfiel();
  assert.equal(L.eersteKlusGedaan(p, 'bus'), false);
  L.startVak(p, 'bus'); // alleen de menuknop: nog geen werk gedaan
  assert.equal(L.eersteKlusGedaan(p, 'bus'), false, 'de menuknop telt niet mee');
  L.tel(p, 'bus', { xp: 1 });
  assert.equal(L.eersteKlusGedaan(p, 'bus'), true);
  const q = L.nieuwProfiel();
  L.tel(q, 'taxi', { n: 1 }); // alleen de teller, zonder punten
  assert.equal(L.eersteKlusGedaan(q, 'taxi'), true, 'een getelde eenheid is ook echt werk');
  assert.equal(L.eersteKlusGedaan(q, 'bestaatniet'), false);
  assert.equal(L.eersteKlusGedaan(null, 'bus'), false);
  assert.equal(L.eersteKlusGedaan({}, 'bus'), false);
  assert.equal(L.eersteKlusGedaan({ vakken: { bus: null } }, 'bus'), false);
  assert.equal(L.eersteKlusGedaan({ vakken: { bus: { xp: NaN, n: 'veel' } } }, 'bus'), false);
  // gezaaid uit de prestaties: die speler heeft het echt gedaan, dus het telt
  const zaad = L.zaaiUitPrestaties({ padelMatches: 6 }, {});
  assert.equal(L.eersteKlusGedaan(zaad, 'padel'), true);
  assert.equal(L.eersteKlusGedaan(L.zaaiUitPrestaties({}, {}), 'padel'), false);
});

t('eersteKlussen en eersteKlusStand: de overkoepelende teller van negentien', () => {
  const p = L.nieuwProfiel();
  assert.deepEqual(L.eersteKlusStand(p), { gedaan: 0, totaal: L.VAKKEN.length, rest: L.VAKKEN.length, klaar: false, titel: null });
  assert.equal(L.VAKKEN.length, 19);
  for (const id of L.VAK_IDS.slice(0, -1)) L.tel(p, id, { xp: 1 });
  assert.equal(L.eersteKlussen(p), L.VAKKEN.length - 1);
  assert.equal(L.eersteKlusStand(p).klaar, false);
  assert.equal(L.eersteKlusStand(p).titel, null, 'de titel komt pas bij alle negentien');
  L.tel(p, L.VAK_IDS[L.VAK_IDS.length - 1], { xp: 1 });
  const klaar = L.eersteKlusStand(p);
  assert.equal(klaar.gedaan, L.VAKKEN.length);
  assert.equal(klaar.klaar, true);
  assert.equal(klaar.titel, L.DUIZENDPOOT_TITEL);
  assert.equal(L.DUIZENDPOOT_TITEL, 'De Duizendpoot');
  assert.equal(L.DUIZENDPOOT_EURO, 750);
});

// ------------------------------------------------------------------ het profiel
t('normaliseer en voegSamen houden de kaarten en de eenmalige beloning bij', () => {
  const p = L.nieuwProfiel();
  p.kaarten = ['bus', 'bus', 'bestaatniet', 7, 'padel'];
  p.duizendpoot = true;
  const q = L.normaliseer(JSON.stringify(p));
  assert.deepEqual(q.kaarten, ['bus', 'padel']);
  assert.equal(q.duizendpoot, true);
  const r = L.nieuwProfiel();
  assert.equal(L.kaartGezien(r, 'taxi'), false);
  assert.equal(L.markeerKaart(r, 'taxi'), true);
  assert.equal(L.markeerKaart(r, 'taxi'), false, 'een kaartje is eenmalig');
  assert.equal(L.kaartGezien(r, 'taxi'), true);
  assert.equal(L.markeerKaart(r, 'bestaatniet'), false);
  // samenvoegen (een tweede tabblad): de kaarten en de beloning gaan mee
  const a = L.nieuwProfiel(), b = L.nieuwProfiel();
  L.markeerKaart(a, 'bus'); L.markeerKaart(b, 'padel'); b.duizendpoot = true;
  const m = L.voegSamen(a, b);
  assert.deepEqual(m.kaarten.sort(), ['bus', 'padel']);
  assert.equal(m.duizendpoot, true);
  // de markering van de beloning alleen bij alle negentien
  const half = L.nieuwProfiel();
  L.tel(half, 'bus', { xp: 1 });
  assert.equal(L.markeerDuizendpoot(half), false, 'niet eerder uitbetalen dan bij negentien');
  for (const id of L.VAK_IDS) L.tel(half, id, { xp: 1 });
  assert.equal(L.markeerDuizendpoot(half), true);
  assert.equal(L.markeerDuizendpoot(half), false, 'maar één keer');
});

// ------------------------------------------------------------------ de kaartjes
t('kaartdata: een titel en de eerste klus met startplek per vak', () => {
  for (const id of L.VAK_IDS) {
    const k = L.kaartVoorVak(id);
    assert.ok(k, `${id}: kaartdata`);
    assert.equal(k.titel, `Loopbaan in zicht: ${L.vakInfo(id).naam}`);
    assert.equal(k.tekst, `Eerste klus: ${L.START[id].klus} · ${L.START[id].plek}`);
  }
  assert.equal(L.kaartVoorVak('bestaatniet'), null);
});

t('kaartenBijStap: alleen wat de stap noemt, nog niet gedaan en nog niet gezien', () => {
  assert.deepEqual(loopbanenBijStap('M02'), ['klus']);
  const leeg = L.nieuwProfiel();
  const kaarten = kaartenBijStap(leeg, 'M02');
  assert.equal(kaarten.length, 1);
  assert.equal(kaarten[0].vak, 'klus');
  assert.equal(kaartenBijStap(leeg, 'bestaatniet').length, 0);
  assert.equal(kaartenBijStap(leeg, null).length, 0);
  assert.equal(kaartenBijStap(null, 'M02').length, 0);
  // de eerste klus is al gedaan: geen kaart
  const gedaan = L.nieuwProfiel();
  L.tel(gedaan, 'klus', { xp: 5 });
  assert.deepEqual(kaartenBijStap(gedaan, 'M02'), []);
  // het kaartje is al geweest: geen kaart
  const gezien = L.nieuwProfiel();
  L.markeerKaart(gezien, 'klus');
  assert.deepEqual(kaartenBijStap(gezien, 'M02'), []);
  // een stap met twee loopbanen (T2: bus en hengelen) geeft er twee, en alleen de openste blijft over
  const t2 = L.nieuwProfiel();
  assert.deepEqual(kaartenBijStap(t2, 'T2').map((k) => k.vak).sort(), ['bus', 'hengelen']);
  L.tel(t2, 'bus', { xp: 1 });
  assert.deepEqual(kaartenBijStap(t2, 'T2').map((k) => k.vak), ['hengelen']);
});

t('maybeCareerCards: eenmalig, stil en veilig (null/geen data geeft 0)', () => {
  Live.zetProfielVoorTest(L.nieuwProfiel(), nepOpslag());
  const w = { msgs: [], addMessage(text, d, o) { this.msgs.push({ text, d, o }); } };
  assert.equal(maybeCareerCards(null, 'M02'), 0);
  assert.equal(maybeCareerCards({}, 'M02'), 0, 'zonder addMessage doet hij niets');
  assert.equal(maybeCareerCards(w, 'bestaatniet'), 0);
  assert.equal(maybeCareerCards(w, null), 0);
  assert.equal(w.msgs.length, 0);
  assert.equal(maybeCareerCards(w, 'M02'), 1);
  assert.equal(w.msgs.length, 1);
  assert.match(w.msgs[0].text, /^Loopbaan in zicht: Klussen\. Eerste klus: /);
  assert.equal(w.msgs[0].o.kind, 'tip');
  assert.equal(w.msgs[0].o.kicker, 'Loopbaan');
  assert.equal(w.msgs[0].o.voice, false, 'een stil kaartje: geen TTS');
  assert.equal(w.msgs[0].o.key, 'loopbaan-kaart-klus');
  // eenmalig per speler/device, in het loopbaanprofiel
  assert.equal(maybeCareerCards(w, 'M02'), 0, 'het tweede bezoek geeft geen kaart meer');
  assert.equal(L.kaartGezien(Live.getProfiel(), 'klus'), true);
  const bewaard = L.normaliseer(JSON.stringify(Live.getProfiel()));
  assert.deepEqual(bewaard.kaarten, ['klus'], 'normaliseer bewaart de eenmaligheid');
  // het kaartje begint de loopbaan niet: alleen echt werk telt voor de teller
  assert.equal(L.isGestart(Live.getProfiel(), 'klus'), false);
  assert.equal(L.eersteKlussen(Live.getProfiel()), 0);
  Live.schrijfNu();
  schoon();
});

// ------------------------------------------------------------------ de prestatie
t('de prestatie Van alle markten thuis hoort bij de teller van loopbaanlive', () => {
  const a = ACHIEVEMENTS.find((x) => x.id === 'duizendpoot');
  assert.ok(a, 'de prestatie bestaat');
  assert.equal(a.cat, 'bijbaan');
  assert.equal(a.goal, L.VAKKEN.length);
  assert.equal(a.stat, Live.EERSTE_KLUS_STAT);
  // de blijvende loopbaantitel heet De Duizendpoot; de prestatie zelf heeft een eigen naam naast de bestaande
  // prestatie 'Duizendpoot' (de zes bijbaantjes)
  assert.equal(a.title, 'Van alle markten thuis');
  assert.match(a.desc, /De Duizendpoot/);
});

console.log(`loopbaankaarten_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
