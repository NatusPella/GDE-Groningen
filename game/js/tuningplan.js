// Onderdelen en tuning per voertuig (#196): banden, uitlaat, stoel, verlichting
// en geluid, met verzonnen merken, prijzen en kleine effecten. Pure data en
// regels, Node-safe, zonder THREE: garages.js laat er een sectie "Onderdelen"
// van zien, de opslag staat onder één eigen sleutel (storagekeys.js, tuning)
// en raakt de bestaande save en de upgrades van shops.js niet. Kleur blijft
// bij Spuit & Klaar. Bestaande keuzes worden alleen aangevuld, nooit hernoemd.
//
// Een keuze is { part, id }; per onderdeel zit er maar één tegelijk op een voertuig.
// De effecten zijn vermenigvuldigers rond 1 (grip, comfort, zicht, geluid, gewicht)
// en een `opvallend`-getal: hoe graag de politie ernaar kijkt (alleen uitlaat en geluid).

export const PARTS = ['banden', 'uitlaat', 'stoel', 'verlichting', 'geluid'];
export const PART_LABELS = { banden: 'Banden', uitlaat: 'Uitlaat', stoel: 'Stoel', verlichting: 'Verlichting', geluid: 'Geluid' };

// kinds: voor welke voertuigsoorten het onderdeel past (tweewieler | auto)
const O = (part, id, label, price, kinds, fx, desc) => ({ part, id, label, price, kinds, fx, desc });
const TW = ['tweewieler'], CAR = ['auto'], BOTH = ['tweewieler', 'auto'];

export const OPTIONS = [
  O('banden', 'b-stad', 'Stadsbanden Klinkerhaai', 18, BOTH, { grip: 1.05, gewicht: 1 }, 'Rollen soepel over klinkers'),
  O('banden', 'b-terrein', 'Veenpad-banden', 34, BOTH, { grip: 1.12, gewicht: 1.03 }, 'Grip op grind, gras en veen'),
  O('banden', 'b-race', 'Slick Zuidlaren', 60, BOTH, { grip: 1.2, gewicht: 0.98 }, 'Veel grip op droog asfalt, glad in de plassen'),
  O('uitlaat', 'u-zacht', 'Fluisterpijp Hoogkerk', 22, BOTH, { geluid: 0.8, opvallend: 0 }, 'Je hoort hem pas als hij weg is'),
  O('uitlaat', 'u-sport', 'Sportdemper Haren', 45, TW, { geluid: 1.2, opvallend: 0.2 }, 'Een goed hoorbare brom'),
  O('uitlaat', 'u-sport-auto', 'Sportuitlaat Haren', 70, CAR, { geluid: 1.25, opvallend: 0.2 }, 'Een goed hoorbare brom'),
  O('uitlaat', 'u-knal', 'Knalpijp Appingedam', 55, BOTH, { geluid: 1.5, opvallend: 0.5 }, 'Iedereen draait zich om. De politie ook'),
  O('stoel', 's-plat', 'Zachte zadelhoes Eelde', 14, TW, { comfort: 1.1 }, 'Dikke vulling, minder trillen'),
  O('stoel', 's-sport', 'Sportzadel Noordlaren', 26, TW, { comfort: 0.95, gewicht: 0.98 }, 'Smal en licht'),
  O('stoel', 's-leer', 'Leren bekleding Zernike', 48, CAR, { comfort: 1.15 }, 'Ruikt naar een nieuwe boekenkast'),
  O('stoel', 's-kuip', 'Kuipstoelen Roden', 72, CAR, { comfort: 1.0, grip: 1.02 }, 'Je blijft zitten in de bocht'),
  O('verlichting', 'l-led', 'Heldere koplamp Delfzijl', 24, BOTH, { zicht: 1.2 }, 'Wit licht, ver vooruit'),
  O('verlichting', 'l-warm', 'Warme koplamp Winsum', 16, BOTH, { zicht: 1.08 }, 'Geel licht, zacht voor de ogen'),
  O('verlichting', 'l-fel', 'Zoeklicht Ten Boer', 42, BOTH, { zicht: 1.45, opvallend: 0.1 }, 'Schijnt tot de volgende wijk'),
  O('geluid', 'g-bel', 'Dubbele bel Pieterburen', 9, TW, { claxon: 'bel2' }, 'Twee tonen: kring-kring'),
  O('geluid', 'g-toeter', 'Toeter De Marne', 12, BOTH, { claxon: 'toeter' }, 'Een vrolijke toeter'),
  O('geluid', 'g-melodie', 'Melodietoeter Vlagtwedde', 38, BOTH, { claxon: 'melodie', opvallend: 0.1 }, 'Speelt drie noten van een bekend deuntje (verzonnen)'),
];
export const OPTION_IDS = OPTIONS.map((o) => o.id);
export const optionById = (id) => OPTIONS.find((o) => o.id === id) || null;

// optiekeuzes voor een deel en voertuigsoort
export const optionsFor = (part, kind) => OPTIONS.filter((o) => o.part === part && o.kinds.includes(kind));

// Voertuigsoort uit de vlaggen van het voertuig (v.isBike, v.isScooter).
export const tuningKind = (v) => (v && (v.isBike || v.isScooter) ? 'tweewieler' : 'auto');

// Een leeg tuningrecord: voor elk onderdeel niets.
export const emptyTuning = () => ({});

// Schoon een opgeslagen record op: onbekende of niet-passende keuzes gaan eruit.
export function sanitizeTuning(t, kind = null) {
  const out = {};
  if (!t || typeof t !== 'object') return out;
  for (const part of PARTS) {
    const o = optionById(t[part]);
    if (o && o.part === part && (!kind || o.kinds.includes(kind))) out[part] = o.id;
  }
  return out;
}

// De som van wat erop zit. Alles is een vermenigvuldiger (1 = niets veranderd) behalve claxon en opvallend.
export function tuningEffects(t) {
  const fx = { grip: 1, comfort: 1, zicht: 1, geluid: 1, gewicht: 1, opvallend: 0, claxon: null };
  for (const id of Object.values(sanitizeTuning(t))) {
    const e = optionById(id).fx;
    for (const [k, val] of Object.entries(e)) {
      if (k === 'claxon') fx.claxon = val;
      else if (k === 'opvallend') fx.opvallend += val;
      else fx[k] *= val;
    }
  }
  fx.opvallend = Math.min(1, fx.opvallend);
  return fx;
}

// Wat het kost om part op te bouwen: de prijs van de nieuwe keuze minus de helft van de oude (inruil).
export function installPrice(t, optionId) {
  const o = optionById(optionId);
  if (!o) return null;
  const old = optionById((t || {})[o.part]);
  if (old && old.id === o.id) return null;
  return Math.max(0, o.price - (old ? Math.floor(old.price / 2) : 0));
}

// Zet een keuze op het record (nieuw object terug), of null als het niet past.
export function withOption(t, optionId, kind) {
  const o = optionById(optionId);
  if (!o || !o.kinds.includes(kind)) return null;
  return { ...sanitizeTuning(t, kind), [o.part]: o.id };
}

export function withoutPart(t, part) {
  const out = { ...sanitizeTuning(t) };
  delete out[part];
  return out;
}

// --- opslag -----------------------------------------------------------------------------
// Eén JSON-object { versie: 1, voertuigen: { [id]: { part: optionId } } } onder de sleutel uit storagekeys.js.
// `store` is localStorage-achtig ({ getItem, setItem }); fouten en rommel geven een lege stand.
export const STORE_VERSION = 1;
const MAX_VEHICLES = 64;

export function loadTuning(store, key) {
  try {
    const raw = store && store.getItem(key);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (!data || data.versie !== STORE_VERSION || typeof data.voertuigen !== 'object' || !data.voertuigen) return {};
    const out = {};
    for (const [id, t] of Object.entries(data.voertuigen).slice(0, MAX_VEHICLES)) {
      const clean = sanitizeTuning(t);
      if (Object.keys(clean).length) out[String(id).slice(0, 40)] = clean;
    }
    return out;
  } catch { return {}; }
}

export function saveTuning(store, key, all) {
  try {
    if (!store) return false;
    const voertuigen = {};
    for (const [id, t] of Object.entries(all || {}).slice(0, MAX_VEHICLES)) {
      const clean = sanitizeTuning(t);
      if (Object.keys(clean).length) voertuigen[id] = clean;
    }
    store.setItem(key, JSON.stringify({ versie: STORE_VERSION, voertuigen }));
    return true;
  } catch { return false; }
}
