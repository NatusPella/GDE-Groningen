// Loopbaan (#381): de balans. De loopbaan mag de economie niet laten ontsporen (docs/LOOPBAAN.md):
//   node scripts/loopbaan_balans_test.mjs
// - de loonfactor is begrensd (+30% op het hoogste niveau, alleen op wat een vak zelf betaalt);
// - geld uit missies, winkels en vondsten verandert niet (geen haak daar);
// - de nieuwe premies voor vakken die niets uitbetaalden blijven klein ten opzichte van een bijbaan;
// - tempo: het hoogste niveau kost uren echt spelen, het tweede niveau is snel te halen.
// De tijden per gebeurtenis zijn schattingen uit de speeltesten (docs/SPELBOT-RAPPORT.md, speeltestlus): de test beschermt de
// verhoudingen, niet de seconden. Het simulatiespel hieronder speelt een vak urenlang achter elkaar zoals een speler die er
// opgaat in; dat is het zwaarste geval.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as L from '../game/js/loopbaan.js';
import { SIDEJOB_PAY_MULT } from '../game/js/economy.js';

const JS = fileURLToPath(new URL('../game/js/', import.meta.url));
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

// Een speler die één vak urenlang doet: gebeurtenissen met hun duur (minuten), punten en basisbedrag (euro, voor de factor).
// Bijbaan: een ronde duurt ongeveer 1,7 minuut en betaalt zo'n 90 euro (PAY_GUESS in sidejobs.js, keer SIDEJOB_PAY_MULT).
const PROFIELEN = [
  { vak: 'bus', naam: 'bijbaan: bus, een ronde', min: 1.7, xp: 10, uniek: 0, geld: 90 * SIDEJOB_PAY_MULT, kmPerMin: 0.8, kmVak: 'bus' },
  { vak: 'bezorg', naam: 'bijbaan: bezorger', min: 1.7, xp: 10, uniek: 0, geld: 40 * SIDEJOB_PAY_MULT },
  { vak: 'landbouw', naam: 'bijbaan: bietenoogst', min: 3.5, xp: 10, uniek: 0, geld: 70 * SIDEJOB_PAY_MULT },
  { vak: 'landbouw', naam: 'eigen boerderij, een ronde (ploegen, zaaien, oogsten, afleveren)', min: 10, xp: 60, uniek: 0, geld: 330 },
  { vak: 'kantoor', naam: 'bijbaan: balie', min: 2, xp: 10, uniek: 0, geld: 60 * SIDEJOB_PAY_MULT },
  { vak: 'padel', naam: 'padel, een potje', min: 6, xp: 22, uniek: 1 / 3, geld: 200 * 0.5 }, // een medaille van de drie: gemiddeld halve prijs
  { vak: 'race', naam: 'kart, een race', min: 3.5, xp: 12, uniek: 0, geld: 15 },
  { vak: 'race', naam: 'regatta', min: 5, xp: 20, uniek: 0, geld: 20 },
  { vak: 'golf', naam: 'discgolf, een ronde', min: 12, xp: 40, uniek: 0, geld: 20 },
  { vak: 'trein', naam: 'machinist, een dienst', min: 8, xp: 55, uniek: 0, geld: 160 },
  { vak: 'trein', naam: 'treinreis van 15 km', min: 1.5, xp: 15 * L.KM_XP.trein, uniek: 0.15, geld: 0 },
  { vak: 'hengelen', naam: 'hengelen, de wedstrijd in Meerstad', min: 7, xp: 24, uniek: 0, geld: 10 },
  // vrij hengelen (visdata.js): een vangst per ongeveer 11 s (wachttijd 4,5 tot 11 s, uitgooien, binnenhalen), gemiddeld 1,9 punt en
  // 0,6 euro per vis (vis_test.mjs rekent het na), een nieuwe plek zo nu en dan
  { vak: 'hengelen', naam: 'hengelen, vrij op elk water', min: 11 / 60, xp: 1.9, uniek: 0.02, geld: 0.6 },
  { vak: 'lucht', naam: 'helikopter, een vlucht', min: 6, xp: 22, uniek: 0, geld: 20 },
  // de vliegschool: een les duurt twee tot vier minuten; alleen de eerste keer per medaille betaalt (25, 40 en 60 euro), opnieuw doen geeft 6 punten:
  // gemiddeld over honderd lessen is dat ongeveer 12 punten en 10 euro per les (VLIEGSCHOOL in vliegschoolrules.js)
  { vak: 'lucht', naam: 'vliegschool, een les', min: 3, xp: 12, uniek: 0.1, geld: 10 },
  { vak: 'horeca', naam: 'pannenkoekenschip, een dienst', min: 8, xp: 30, uniek: 0, geld: 20 },
];

// Speel het profiel tot niveau `doel` en geef de minuten terug.
function minutenTot(p, doel) {
  const xpPerMin = (p.xp + (p.uniek || 0) * L.UNIEK_XP + (p.kmPerMin || 0) * L.KM_XP[p.kmVak || 'bus']) / p.min;
  return L.XP_DREMPELS[doel - 1] / xpPerMin;
}
const perUur = (p, factor) => (p.geld * factor * 60) / p.min;

t('de loonfactor is begrensd: nooit meer dan +30% en nooit een sprong tussen twee niveaus van meer dan 8 punten', () => {
  assert.ok(Math.max(...L.LOON_FACTOR) <= 1.3 + 1e-9);
  for (let i = 1; i < L.LOON_FACTOR.length; i++) assert.ok(L.LOON_FACTOR[i] - L.LOON_FACTOR[i - 1] <= 0.08 + 1e-9, `sprong bij niveau ${i + 1}`);
});

t('het inkomen per uur van wie alles uit een vak haalt stijgt met hooguit 30%', () => {
  for (const p of PROFIELEN.filter((x) => x.geld > 0)) {
    const basis = perUur(p, 1), top = perUur(p, L.LOON_FACTOR[L.MAX_NIVEAU - 1]);
    assert.ok(top / basis <= 1.3 + 1e-9, p.naam);
  }
});

t('geld uit missies, winkels, vondsten en reparaties loopt niet via de loopbaan', () => {
  const nietLopen = ['missions.js', 'shops.js', 'garages.js', 'geheimen.js', 'story.js', 'muggings.js', 'dorpsuitjes.js', 'snackketen.js', 'furniture.js', 'cashvan.js', 'regiolevenrt.js'];
  for (const f of nietLopen) assert.ok(!/loopbaan/i.test(fs.readFileSync(JS + f, 'utf8')), `${f} raakt de loopbaan`);
});

t('wat de loopbaan uitbetaalt loopt alleen via loopbaanVerdien of de loonfactor van het vak', () => {
  // elke haak die geld uitbetaalt staat hier; een nieuwe haak moet bewust worden toegevoegd (en hier verantwoord)
  const haken = ['sidejobs.js', 'machinist.js', 'padel.js', 'driftzone.js', 'kermis.js', 'carbid.js', 'postgame.js', 'kartbaan.js', 'regatta.js', 'stationtravel.js', 'coopnet.js', 'hengelen.js', 'vliegschool.js', 'loopbaanlive.js', 'boerderijlive.js', 'kaartjescontrole.js', 'pitchputt.js', 'discgolf.js', 'klimtoren.js']; // discgolf.js en klimtoren.js: idem voor een online ronde of klim (#443); pitchputt.js: de prijs van een online pitch-and-putt-ronde loopt via loopbaanVerdien('golf') (#443); kaartjescontrole.js: EUR 45 per volle perronronde, per station hooguit eens per 15 spelminuten (#437)
  const gevonden = fs.readdirSync(JS).filter((f) => f.endsWith('.js') && !/^loopbaan/.test(f) && /loopbaan(Verdien|Loon|Prijs|Gast)\(/.test(fs.readFileSync(JS + f, 'utf8')));
  assert.deepEqual(gevonden.sort(), haken.filter((f) => !/^loopbaan/.test(f)).sort());
});

t('de premies voor vakken die niets uitbetaalden zijn klein: hooguit 900 euro per uur op het hoogste niveau', () => {
  const top = L.LOON_FACTOR[L.MAX_NIVEAU - 1];
  for (const p of PROFIELEN.filter((x) => ['race', 'golf', 'buiten', 'hengelen', 'lucht', 'horeca'].includes(x.vak))) assert.ok(perUur(p, top) <= 900, `${p.naam}: ${Math.round(perUur(p, top))} euro per uur`);
  for (const [key, r] of Object.entries(L.STAT_VAK)) if (r.premie) assert.ok(r.premie <= 40, key);
  // en de kartpremie (eerste plaats) blijft onder een kwart van wat één bijbaanronde betaalt
  const kart = fs.readFileSync(JS + 'kartbaan.js', 'utf8').match(/\[0, (\d+), (\d+), (\d+), (\d+)\]\[pos\]/);
  assert.ok(kart && +kart[1] <= 40 && +kart[1] > +kart[2] && +kart[2] > +kart[3] && +kart[3] > +kart[4], 'kartpremie loopt af met de plaats');
});

t('de premie van een bijbaan van het zwaarste vak blijft de grootste inkomstenbron: een bijbaanronde levert meer per minuut dan elke premie', () => {
  const bij = PROFIELEN.filter((p) => ['bus', 'bezorg', 'kantoor'].includes(p.vak)).map((p) => p.geld / p.min);
  const premie = PROFIELEN.filter((p) => ['race', 'golf', 'buiten', 'hengelen', 'lucht', 'horeca'].includes(p.vak)).map((p) => p.geld / p.min);
  assert.ok(Math.min(...bij) > Math.max(...premie) * 2, `bijbaan ${Math.round(Math.min(...bij))} per minuut tegen premie ${Math.round(Math.max(...premie))}`);
});

t('tempo: het tweede niveau komt snel, het hoogste kost uren echt spelen', () => {
  for (const p of PROFIELEN) {
    const m2 = minutenTot(p, 2), m6 = minutenTot(p, L.MAX_NIVEAU);
    assert.ok(m2 <= 20, `${p.naam}: niveau 2 na ${Math.round(m2)} minuten is te traag`);
    assert.ok(m6 >= 60, `${p.naam}: niveau ${L.MAX_NIVEAU} al na ${Math.round(m6)} minuten is te snel`);
    assert.ok(m6 <= 24 * 60, `${p.naam}: niveau ${L.MAX_NIVEAU} pas na ${(m6 / 60).toFixed(1)} uur is te traag`);
  }
});

t('tempo: wie het hele spel speelt (60 uur verdeeld over veel vakken) haalt niet alle vakken op het hoogste niveau', () => {
  // een speler die gelijk over alle zestien vakken verdeelt, 3 uur per vak; met 16 vakken komt dat op 48 uur
  const perVak = {};
  for (const p of PROFIELEN) (perVak[p.vak] ||= []).push(p);
  let top = 0;
  for (const vak of L.VAK_IDS) {
    const ps = perVak[vak] || [];
    if (!ps.length) continue;
    const xpMin = Math.max(...ps.map((p) => (p.xp + (p.uniek || 0) * L.UNIEK_XP) / p.min));
    if (xpMin * 180 >= L.XP_DREMPELS[L.MAX_NIVEAU - 1]) top++;
  }
  assert.ok(top < L.VAKKEN.length / 2, `${top} vakken op niveau ${L.MAX_NIVEAU} na 3 uur per vak`);
});

t('een bijbaanronde levert op het hoogste niveau per uur hooguit 30% meer dan op niveau 1 (met de bestaande bijbaanniveaus erbij)', () => {
  // sidejobs.js: basis keer SIDEJOB_PAY_MULT, keer (1 + 0,15 per bijbaanniveau), keer de reeks (hooguit +60%), nu keer de loonfactor
  const bestaandMax = SIDEJOB_PAY_MULT * (1 + 0.15 * 4) * 1.6;
  const eerder = bestaandMax, nu = bestaandMax * L.LOON_FACTOR[L.MAX_NIVEAU - 1];
  assert.ok(nu / eerder <= 1.3 + 1e-9);
  assert.ok(nu < 5 * 90 * 1.6, 'een ronde blijft onder 5 keer een gemiddeld basisbedrag, ook met alles op het hoogst');
});

console.log(`loopbaan_balans_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
