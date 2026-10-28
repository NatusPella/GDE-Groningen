// Schade aan je eigen auto blijft van jou (#502): een respawn of "Naar huis" zet geen
// verse Escapade met health 100 neer, een betaalde reparatie springt niet terug, en een
// wrak komt er niet gratis heel van af.
//   node scripts/garage_schade_test.mjs
//
// Wat hier echt uit de bron komt en wat nagebootst is:
//  - parkHeroCar uit game/js/respawn.js is de echte functie (respawn.js laadt in node via
//    node3d.mjs). Alleen de kaart en de auto-spawner zijn nep, zodat te zien is of er een
//    verse auto wordt neergezet of dat de bestaande met zijn schade terugkomt.
//  - stash (home.js, stallen in de garage) en damageSave (shops.js, schade in de save)
//    worden als bronblok uit het bestand gehaald en met new Function gedraaid, precies
//    zoals mission_chain_test.mjs dat doet: het bestand zelf is een browsermodule en de
//    functies zijn niet geëxporteerd.
//  - de regel in shops.js die de heldenauto voor de save opzoekt, wordt als bronregel
//    gedraaid met een nep-worldRef.
//  - het laden (health terugzetten) is nagebootst: dezelfde waarde die de save leest,
//    op een verse auto gezet. De leeskant is niet veranderd, de schrijfkant wel; twee
//    ankerchecks zorgen dat de nagebootste sleutel echt de sleutel is die shops.js leest.
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { parkHeroCar, heroMelding } = await import('../game/js/respawn.js');
const { HERO_REPLACE_FEE } = await import('../game/js/economy.js');

let n = 0, fout = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { fout++; console.log('FAIL', naam, info); } };

// --- parkHeroCar: de auto die je had komt terug, met zijn schade -----------------

// De kaart is alleen nodig voor spawnZ (de hoogte van de weg); de spawner is nep en telt
// hoe vaak er een verse auto wordt gebouwd.
const kaart = { spawnZ: () => 0 };
let gespawnd = 0;
const nepSpawn = (map, x, y) => {
  gespawnd++;
  return { vers: true, isHeroCar: true, health: 100, dentLog: [], x, y, angle: 0.3, speed: 0 };
};

const held = (health, extra = {}) => ({
  isHeroCar: true, health, dentLog: [], flat: false, x: 1, y: 2, angle: 0.1, speed: 4,
  upgrades: ['motor'], model: { color: '#a11f1f' }, ...extra,
});
const wereld = (hero, money = 0) => {
  const berichten = [];
  return { map: kaart, vehicles: hero ? [hero] : [], money, berichten, addMessage: (t) => berichten.push(t) };
};
const plan = { car: { x: 30, y: 40, angle: 0.7 }, player: { x: 28, y: 39, angle: 0.2 } };

// Een auto met 40 health en een deuk komt na een respawn terug met 40 - geen verse auto.
{
  gespawnd = 0;
  const auto = held(40, { dentLog: [[0.4, 1.2, 0.6]] });
  const w = wereld(auto);
  const terug = parkHeroCar(w, plan, nepSpawn);
  check('respawn: dezelfde auto komt terug', terug === auto);
  check('respawn: health blijft 40, niet 100', auto.health === 40, auto.health);
  check('respawn: de deuken blijven', auto.dentLog.length === 1 && auto.dentLog[0][2] === 0.6);
  check('respawn: er wordt geen verse auto gebouwd', gespawnd === 0, gespawnd);
  check('respawn: de auto staat op de kerb-plek', auto.x === 30 && auto.y === 40 && auto.angle === 0.7);
  check('respawn: hij staat stil en is van niemand', auto.speed === 0 && auto.driver === null && auto.road === null);
  check('respawn: er is niets afgeschreven', w.money === 0 && w.berichten.length === 0, JSON.stringify(w.berichten));
  check('respawn: geen tweede auto in de wereld', w.vehicles.length === 1);
}

// Een auto met 100 health houdt 100 (en er wordt niets gebouwd of gerekend).
{
  gespawnd = 0;
  const auto = held(100);
  const w = wereld(auto, 500);
  const terug = parkHeroCar(w, plan, nepSpawn);
  check('hele auto: dezelfde auto komt terug', terug === auto);
  check('hele auto: health blijft 100', auto.health === 100, auto.health);
  check('hele auto: niets gespawnd', gespawnd === 0);
  check('hele auto: geen geld afgeschreven', w.money === 500, w.money);
}

// Geen kerb-plek (de aankomst is krap): de auto van de speler blijft bestaan, met schade.
{
  gespawnd = 0;
  const auto = held(40);
  const w = wereld(auto);
  const terug = parkHeroCar(w, { car: null, player: { x: 100, y: 200, angle: 0 } }, nepSpawn);
  check('zonder kerb-plek: dezelfde auto blijft in de wereld', terug === auto && w.vehicles.includes(auto));
  check('zonder kerb-plek: health blijft 40', auto.health === 40, auto.health);
  check('zonder kerb-plek: hij wordt wel verplaatst', auto.x === 100 && auto.y === 200);
  check('zonder kerb-plek: geen verse auto gebouwd', gespawnd === 0, gespawnd);
}

// Een wrak (total loss) zonder geld komt niet gratis terug: het wrak blijft staan en zowel de
// melding die de speler bij de aankomst ziet (heroMelding, uit dezelfde bron) als parkHeroCar
// zelf noemen wat het opknappen kost. parkHeroCar meldt het ook zelf, omdat de boete van de
// respawn er dan al af is en de speler hier alsnog te weinig kan hebben.
{
  gespawnd = 0;
  const wrak = held(0, { wrecked: true, blewUp: true, dentLog: [[1, 1, 1]] });
  const w = wereld(wrak, HERO_REPLACE_FEE - 1);
  const terug = parkHeroCar(w, plan, nepSpawn);
  check('wrak zonder geld: geen nieuwe auto', terug === null && gespawnd === 0);
  check('wrak zonder geld: het wrak blijft staan', w.vehicles.includes(wrak));
  check('wrak zonder geld: het wrak blijft de heldenauto, zodat de save hem kent', wrak.isHeroCar === true);
  check('wrak zonder geld: geen geld afgeschreven', w.money === HERO_REPLACE_FEE - 1, w.money);
  check('wrak zonder geld: de auto meldt het zelf ook', w.berichten.some((t) => t.includes(`€${HERO_REPLACE_FEE}`)), JSON.stringify(w.berichten));
  const tekst = heroMelding(w);
  check('wrak zonder geld: de melding noemt de prijs', tekst.includes(`€${HERO_REPLACE_FEE}`), tekst);
  check('wrak zonder geld: de melding zegt dat het niet kan', /niet/.test(tekst), tekst);
  const rijk = heroMelding({ money: HERO_REPLACE_FEE });
  check('wrak met geld: de melding zegt dat het kan', rijk.includes(`€${HERO_REPLACE_FEE}`) && !/niet/.test(rijk), rijk);
  // nog een keer doodgaan lost niets op: nog steeds geen gratis auto
  check('wrak zonder geld: een tweede respawn geeft ook niets', parkHeroCar(w, plan, nepSpawn) === null && gespawnd === 0);
}

// Een wrak met genoeg geld: een nieuwe Escapade, en HERO_REPLACE_FEE gaat er af.
{
  gespawnd = 0;
  const wrak = held(0, { wrecked: true, blewUp: true });
  const w = wereld(wrak, HERO_REPLACE_FEE + 20);
  const terug = parkHeroCar(w, plan, nepSpawn);
  check('wrak met geld: er komt een nieuwe auto', !!terug && terug !== wrak && gespawnd === 1);
  check('wrak met geld: de nieuwe is heel', terug && terug.health === 100);
  check('wrak met geld: het wrak is geen heldenauto meer', wrak.isHeroCar === false && w.vehicles.includes(wrak));
  check('wrak met geld: de prijs is afgeschreven', w.money === 20, w.money);
  check('wrak met geld: de melding zegt het', w.berichten.length === 1, JSON.stringify(w.berichten));
}

// --- stallen en opslaan: een betaalde reparatie blijft heel ---------------------

const haalFunctie = (src, naam) => {
  const start = src.indexOf(`function ${naam}(`);
  assert.ok(start >= 0, `${naam} staat in de bron`);
  let diep = 0, eind = -1;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') diep++;
    else if (src[i] === '}' && --diep === 0) { eind = i; break; }
  }
  assert.ok(eind > start, `${naam} heeft een sluitende accolade`);
  return src.slice(start, eind + 1);
};
const uitBron = (src, naam) => new Function(`${haalFunctie(src, naam)}; return ${naam};`)();

const homeSrc = fs.readFileSync(new URL('../game/js/home.js', import.meta.url), 'utf8');
const shopSrc = fs.readFileSync(new URL('../game/js/shops.js', import.meta.url), 'utf8');
const stash = uitBron(homeSrc, 'stash');
const damageSave = uitBron(shopSrc, 'damageSave');

// De auto staat met 40 health in de garage, wordt bij Henk naar 100 gerepareerd en gaat
// daarna weer in de garage: de bewaarde stand moet dan 100 zijn, niet die oude 40.
{
  const auto = held(40, { dentLog: [[0.4, 1.2, 0.6]] });
  const w = { vehicles: [auto] };
  const o = { key: 'mug', v: auto, upgrades: [], health: undefined, dents: undefined, flat: false };
  stash(w, o);
  check('stallen: een kapotte auto bewaart zijn health', o.health === 40, o.health);
  check('stallen: de deuken gaan mee', Array.isArray(o.dents) && o.dents.length === 1);
  check('stallen: de auto is uit de wereld', w.vehicles.length === 0 && o.v === null);

  // de betaalde reparatie (garages.js repairVehicle) en daarna weer neerzetten + stallen
  auto.health = 100; auto.dentLog = []; auto.flat = false; auto.wrecked = false;
  w.vehicles.push(auto); o.v = auto;
  stash(w, o);
  check('na de reparatie: health 100 wordt bewaard', o.health === 100, o.health);
  check('na de reparatie: de deuken zijn weg', Array.isArray(o.dents) && o.dents.length === 0, JSON.stringify(o.dents));

  // de save schrijft die 100 ook echt op (damageSave altijd health + dents)
  const sv = damageSave(auto);
  check('save: health staat erin, ook bij 100', sv.health === 100, sv.health);
  check('save: dents staat erin, ook leeg', Array.isArray(sv.dents) && sv.dents.length === 0, JSON.stringify(sv.dents));

  // ... en laden zet hem terug: de leeskant pakt sv.health, anders 100 (spawnOwned)
  const geladen = { health: Number.isFinite(sv.health) ? sv.health : 100 };
  check('laden: de auto is nog steeds heel', geladen.health === 100, geladen.health);
  // anker: de leeskant in shops.js leest echt de sleutel die damageSave schrijft, anders
  // bewijst de simulatie hierboven niets over het echte laden
  check('laden: shops.js leest d.hero.health', /health: d\.hero\.health/.test(shopSrc));
  check('laden: shops.js zet die health op de heldenauto', /hero\.health = Math\.max\(5, Math\.min\(100, pendingHeroDamage\.health\)\)/.test(shopSrc));
  // een oude save zonder health blijft ook 100, dat is de bestaande leesregel
  const oud = { health: Number.isFinite(undefined) ? undefined : 100 };
  check('laden: een save zonder health is 100', oud.health === 100);
}

// Een kapotte auto bewaart zijn buts ook echt in de save, niet alleen in het entry-object.
{
  const auto = held(55, { dentLog: [[1, 1, 0.9]] });
  const sv = damageSave(auto);
  check('save: health 55 blijft 55', sv.health === 55, sv.health);
  check('save: de deuk gaat mee de save in', sv.dents.length === 1 && sv.dents[0][2] === 0.9, JSON.stringify(sv.dents));
}

// --- de heldenauto in de save: een wrak telt mee --------------------------------

{
  const m = /const hero = (worldRef[^;]*);/.exec(shopSrc);
  assert.ok(m, 'de regel die de heldenauto voor de save opzoekt staat in shops.js');
  const kiesHero = new Function('worldRef', `return ${m[1]};`);
  const wrak = { isHeroCar: true, wrecked: true, health: 0, dentLog: [[1, 1, 1]] };
  const heel = { isHeroCar: true, wrecked: false, health: 100, dentLog: [] };
  check('save: een wrak wordt niet overgeslagen', kiesHero({ vehicles: [wrak] }) === wrak);
  check('save: een hele auto gaat voor op een wrak', kiesHero({ vehicles: [wrak, heel] }) === heel);
  check('save: een wrak bewaart health 0 (laden maakt er minstens 5 van)', damageSave(kiesHero({ vehicles: [wrak] })).health === 0);
}

console.log(`garage_schade_test: ${n - fout}/${n}`);
process.exit(fout ? 1 : 0);
