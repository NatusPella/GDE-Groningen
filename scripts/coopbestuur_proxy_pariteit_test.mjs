// Pariteit tussen het proxy-object van coopbestuur.js en de leden van Player.prototype die main.js erop aanroept (#520).
//
// Op 31-10 crashte Samen spelen bij in- en uitstappen: een gast rijdt via een proxy (coopbestuur.js maakProxy) en de haken
// die main.js zet roepen echte Player.prototype-methoden aan met dat proxy-object als `this`. De proxy had stapNaastDeur
// niet, dus gooide exitVehicle midden in het uitstappen en bleef de rijdersregel staan (daarna `null.isPlane` en
// `null.sinking`). Dat is per geval gerepareerd; deze test maakt de klasse structureel onmogelijk.
//
// De eis wordt niet hier verzonnen maar afgeleid uit de code:
//   1. uit game/js/main.js: elke haak die `Player.prototype.<naam>.call` gebruikt (rond regel 467);
//   2. uit game/js/player.js: de methoden die die haken op `this` verder aanroepen (de sluiting), en de velden die ze op
//      `this` lezen of schrijven.
// Daarna eist de test dat het proxy-object (via de gedeelde basis PROXY_BASIS) elk van die leden heeft, dat elke methode
// aanroepbaar is, en dat de vier haakmethoden echt naar hun haak gaan met het proxy-object als `this`.
//
//   node scripts/coopbestuur_proxy_pariteit_test.mjs
import './node3d.mjs'; // player.js komt via vehicle.js aan three; zonder deze haak resolvet de CDN-import niet in Node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { Player } = await import('../game/js/player.js');
const B = await import('../game/js/coopbestuur.js');

const ROOT = new URL('../', import.meta.url);
const lees = (pad) => fs.readFileSync(new URL(pad, ROOT), 'utf8');

let n = 0;
const t = (naam, f) => { f(); n++; };

// ---- 1. de haken zoals main.js ze zet -------------------------------------------------------

// Het objectliteral van zetBestuurHaken(...), met strings en commentaar overgeslagen zodat een accolade daarin niet telt.
function hakenLiteral(bron) {
  const start = bron.indexOf('zetBestuurHaken(');
  assert.ok(start >= 0, 'main.js zet de bestuurhaken met zetBestuurHaken(...)');
  let diepte = 0, begonnen = false;
  let i = bron.indexOf('{', start);
  const van = i;
  for (; i < bron.length; i++) {
    const c = bron[i];
    if (c === '/' && bron[i + 1] === '/') { i = bron.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && bron[i + 1] === '*') { i = bron.indexOf('*/', i) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < bron.length && bron[i] !== c; i++) if (bron[i] === '\\') i++;
      continue;
    }
    if (c === '{') { diepte++; begonnen = true; }
    else if (c === '}') { diepte--; if (begonnen && !diepte) return bron.slice(van, i + 1); }
  }
  throw new Error('het haakobject in main.js is niet afgesloten');
}

// Elke haak `naam: (lichaam, ...) => Player.prototype.methode.call(...)`.
function haakMethoden(bron) {
  const literal = hakenLiteral(bron);
  const uit = new Map();
  for (const m of literal.matchAll(/(\w+)\s*:\s*\([^)]*\)\s*=>\s*Player\.prototype\.(\w+)\.call/g)) uit.set(m[1], m[2]);
  return uit;
}

const HAKEN = haakMethoden(lees('game/js/main.js'));

t('main.js leidt vier haken naar een echte Player-methode (enter, exit, drive, stap)', () => {
  assert.ok(HAKEN.size >= 4, `haken gevonden: ${[...HAKEN.keys()].join(', ')}`);
  for (const haak of ['enter', 'exit', 'drive', 'stap']) assert.ok(HAKEN.has(haak), `haak ${haak}`);
  assert.equal(HAKEN.get('enter'), 'enterVehicle');
  assert.equal(HAKEN.get('exit'), 'exitVehicle');
  assert.equal(HAKEN.get('drive'), 'driveVehicle');
  assert.equal(HAKEN.get('stap'), 'stapNaastDeur'); // de methode die op 31-10 ontbrak
  for (const methode of HAKEN.values()) {
    assert.equal(typeof Player.prototype[methode], 'function', `Player.prototype.${methode} bestaat`);
  }
});

// ---- 2. de sluiting: wat die methoden zelf op `this` aanroepen en lezen ----------------------

// Zo dekt deze lijst elk soort voertuig: de boottak van driveVehicle roept alleen vehicle.js-functies aan, de
// vliegtuig- en helikoptertak flyPlane/flyHeli (geen `this`), en een heli of vliegtuig zet coopbestuur.js toch al
// buiten de deur (bestuurTick). De trein loopt via cooptrein.js en raakt Player.prototype niet aan. Wat er dus overblijft
// is de sluiting hieronder, en die is voor elke gast hetzelfde.
const LID = /this\.([A-Za-z_$][\w$]*)\s*\(/g;
const VELD = /this\.([A-Za-z_$][\w$]*)\b(?!\s*\()/g;

// De bron van een echte methode (geen tekstparser op regels: Function#toString is wat er werkelijk draait).
const bronVan = (naam) => {
  const f = Player.prototype[naam];
  assert.equal(typeof f, 'function', `Player.prototype.${naam} bestaat`);
  return f.toString();
};

function sluiting(start) {
  const methoden = new Set(), velden = new Set(), wacht = [...start];
  while (wacht.length) {
    const naam = wacht.pop();
    if (methoden.has(naam)) continue;
    methoden.add(naam);
    const bron = bronVan(naam);
    for (const m of bron.matchAll(LID)) if (typeof Player.prototype[m[1]] === 'function') wacht.push(m[1]);
    for (const m of bron.matchAll(VELD)) velden.add(m[1]);
  }
  for (const naam of methoden) velden.delete(naam); // een aanroep is geen veld
  return { methoden, velden };
}

const NODIG = sluiting([...HAKEN.values()]);

t('de sluiting bevat de methode van de crash van 31-10 en de paden daaronder', () => {
  for (const naam of HAKEN.values()) assert.ok(NODIG.methoden.has(naam), `${naam} in de sluiting`);
  // exitVehicle roept deze zelf aan; ontbrak er een, dan gooide hij midden in het uitstappen
  assert.ok(NODIG.methoden.has('stapNaastDeur'), 'stapNaastDeur (deur van de stoel)');
  assert.ok(NODIG.methoden.has('diveOut'), 'diveOut (uitstappen boven de bailsnelheid)');
  assert.ok(NODIG.methoden.has('ejectIntoWater') || NODIG.methoden.has('enterSwim'), 'het zinkpad');
  // en de velden die player.js op het lichaam leest
  for (const veld of ['inVehicle', 'gz', 'x', 'y', 'angle']) assert.ok(NODIG.velden.has(veld), `veld ${veld}`);
});

// ---- 3. een echt proxy-object, gemaakt door coopbestuur.js zelf -----------------------------

const kaart = () => ({ buildingsNear: () => [] });
const nepHaken = () => {
  const gezien = [];
  const haak = (naam) => (...args) => { gezien.push([naam, args[0]]); };
  return {
    gezien,
    vind: (x, y, lijst) => lijst[0] || null,
    // zoals player.js: instappen zet inVehicle, uitstappen haalt hem er weer af
    enter: (l, v) => { gezien.push(['enter', l]); l.inVehicle = v; },
    exit: (l) => { gezien.push(['exit', l]); l.inVehicle = null; },
    drive: haak('drive'), stap: (...args) => { gezien.push(['stap', args[0]]); return false; },
    los: () => ({ ok: true, wacht: false }), bijGroep: () => true,
    misdaad: () => {}, trekUit: () => false,
  };
};
const wereld = (v) => {
  const w = {
    player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0, inVehicle: null },
    companion: null, coop: { local: false }, coopFigures: {}, vehicles: v ? [v] : [], pedestrians: [], map: kaart(),
    money: 0, wanted: 0, time: 0, paused: false, audioEvents: [], messages: [], coopMeld: () => {}, addMessage() {},
  };
  w.coopFigures[1] = { slot: 1, x: v ? v.x - 1.2 : 1, y: v ? v.y : 1, angle: 0, gz: 0, radius: 0.35, vx: 0, vy: 0, char: 'rik', naam: 'Rik', input: { mx: 0, my: 0, buttons: 0, yaw: 0 } };
  return w;
};
const auto = (x = 10, y = 10) => ({ id: 1, x, y, angle: 0.4, speed: 0, z: 0, halfLen: 2.2, halfWid: 1, model: { name: 'sedan', len: 4.4 } });

// Een gast stapt in: zo maakt coopbestuur.js de proxy die de haken als lichaam krijgen.
function maakEchteProxy() {
  const h = nepHaken();
  B.zetBestuurHaken(h);
  const v = auto();
  const w = wereld(v);
  const r = B.bestuurInstappen(w, 1);
  assert.equal(r.gedaan, true, 'de gast stapt in');
  const p = w.coopRijders[1].proxy;
  assert.ok(p, 'de gastheer houdt een rijdersregel met een proxy bij');
  return { w, v, p, h };
}
const ECHT = maakEchteProxy();
const proxy = ECHT.p;

t('een proxy deelt de methoden met de basis en heeft ze niet als eigen lijstje', () => {
  // geen eigen methoden op de proxy: ze komen van de ene gedeelde basis, zodat een tweede proxy ze niet kan missen
  for (const sleutel of Object.getOwnPropertyNames(proxy)) {
    assert.notEqual(typeof proxy[sleutel], 'function', `${sleutel} hoort op de gedeelde basis, niet op de proxy`);
  }
  const basis = Object.getPrototypeOf(proxy);
  assert.ok(basis && basis !== Object.prototype, 'de proxy heeft een eigen basis als prototype');
  assert.ok(Object.isFrozen(basis), 'de basis staat vast: niemand voegt er per ongeluk iets aan toe');
  // twee gasten in twee voertuigen delen precies die basis
  const tweede = maakEchteProxy().p;
  assert.equal(Object.getPrototypeOf(tweede), basis, 'elke proxy hangt aan dezelfde basis');
});

// ---- 4. de eis: elk lid van de sluiting staat op de proxy en is aanroepbaar -----------------

t('elke methode die main.js via de haken bereikt, staat op de proxy en is aanroepbaar', () => {
  assert.ok(NODIG.methoden.size >= 5, `methoden: ${[...NODIG.methoden].join(', ')}`);
  for (const naam of NODIG.methoden) {
    assert.equal(typeof proxy[naam], 'function', `proxy.${naam} ontbreekt (de crash van 31-10)`);
    assert.equal(proxy[naam], Object.getPrototypeOf(proxy)[naam], `${naam} komt van de gedeelde basis`);
  }
  // en de vier haakmethoden gaan echt naar hun haak, met de proxy als `this`
  const { w, v, p, h } = maakEchteProxy();
  h.gezien.length = 0;
  const invoer = { axis: () => [0, 0], isDown: () => false, wasPressed: () => false };
  p.stapNaastDeur(v, w.map, null);
  p.exitVehicle(w.map, w, false);
  p.enterVehicle(v, w);
  p.driveVehicle(1 / 60, invoer, w.map, w);
  assert.deepEqual(h.gezien.map(([naam]) => naam), ['stap', 'exit', 'enter', 'drive'], 'elke haak kwam langs');
  for (const [, lichaam] of h.gezien) assert.equal(lichaam, p, 'de haak kreeg de proxy als lichaam');
});

t('de methoden die geen haak hebben, doen niets en gooien niet', () => {
  const { p } = maakEchteProxy();
  for (const naam of NODIG.methoden) {
    if ([...HAKEN.values()].includes(naam)) continue; // die gaan naar de opgenomen haak
    assert.doesNotThrow(() => p[naam](p.inVehicle, {}), `${naam} op een proxy`);
  }
});

// ---- 5. de velden die player.js op `this` leest -------------------------------------------

const soort = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

t('elk veld dat player.js op het lichaam leest bestaat op de proxy, met dezelfde soort waarde als bij een Player', () => {
  const echt = new Player(0, 0);
  assert.ok(NODIG.velden.size >= 8, `velden: ${[...NODIG.velden].join(', ')}`);
  // een verse proxy (nog zonder voertuig) heeft de rustwaarde van een staande speler
  const { p: vers } = maakEchteProxy();
  vers.inVehicle = null; // de nep-haak zet hem bij het instappen; hier telt de begintoestand
  for (const veld of NODIG.velden) {
    assert.ok(veld in vers, `proxy.${veld} ontbreekt en player.js leest hem`);
    assert.notEqual(vers[veld], undefined, `proxy.${veld} is niet undefined`);
    assert.equal(soort(vers[veld]), soort(echt[veld]), `proxy.${veld} is van hetzelfde soort als bij een echte Player`);
  }
  assert.equal(proxy.water, null, 'een gast in een auto zwemt niet');
  assert.equal(proxy.inVehicle, ECHT.v, 'tijdens het rijden wijst inVehicle naar zijn voertuig');
  assert.deepEqual([proxy.x, proxy.y], [ECHT.v.x, ECHT.v.y], 'de proxy staat waar het voertuig staat');
});

console.log(`coopbestuur_proxy_pariteit_test: ${n} groepen ok (${HAKEN.size} haken, ${NODIG.methoden.size} methoden, ${NODIG.velden.size} velden)`);
