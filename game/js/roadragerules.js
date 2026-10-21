// Verkeersruzie (issue #44) en wapens oppakken (issue #52). Na een flinke
// botsing of lang getoeter kan een boze bestuurder uitstappen: een duw en een
// mopperbui, soms met iets in de hand (een klomp, een bezem,
// een fietspomp, een waterpistool). Politie in de buurt komt erop af. Niemand bloedt, er
// wordt niets getoond dat leed is, en de klappen zijn klein (nooit het laatste
// stukje gezondheid). Wie hem neerslaat, ziet hem zijn spullen laten vallen:
// oppakken met E. Pure regels (geen DOM, geen THREE); scripts/roadrage_test.mjs
// test ze. De instelling heet `ruzie` (uit / weinig / normaal / veel).

export const RAGE_LEVELS = { uit: 0, weinig: 0.5, normaal: 1, veel: 1.8 };
export const RAGE_CHOICES = Object.keys(RAGE_LEVELS);

export const RAGE = {
  crashMinSpeed: 4.5, // m/s dichtsnelheid van de botsing
  crashChance: 0.2,
  hornChance: 0.12,
  armedShare: 0.3, // van de ruziemakers, bij 'normaal'
  firstGrace: 45,
  cooldown: 70, // tussen twee ruzies
  vehicleCooldown: 240, // dezelfde auto
  maxDist: 40,
  stopWait: 3, // s wachten tot de auto stilstaat
  outDelay: 0.9,
  chargeSpeed: 3.4,
  returnSpeed: 2.6,
  reach: 1.3,
  waterRange: 4,
  hitEvery: 1.4,
  windup: 0.35,
  unarmedDamage: 3,
  armedDamageCap: 8,
  mercyHealth: 25, // eronder doet een klap geen pijn meer
  yieldHealth: 14, // zijn eigen gezondheid: eronder geeft hij het op
  giveUpAfter: 16,
  giveUpDist: 32,
  copSight: 50,
  copDelay: 2.5,
  copSpeed: 4.8,
  arrestReach: 1.6,
  arrestHold: 5,
  dropLife: 120,
  dropMax: 6,
  dropFar: 160,
  pickupReach: 1.7,
};

// Wat ze kunnen vasthouden: alleen huis-tuin-en-keuken-slapstick (een klomp, een bezem,
// een fietspomp, een waterpistool). Geen knuppel of stok, ook geen vuurwapen: geen wapens
// in NPC-handen (constitution 6, besluit van de coördinator).
export const RAGE_WEAPONS = [
  { key: 'klomp', weight: 3 },
  { key: 'bezem', weight: 3 },
  { key: 'fietspomp', weight: 2 },
  { key: 'waterpistool', weight: 2 },
];

// Hoe een gevallen ding heet en wat het geeft bij het oppakken.
export const DROP_INFO = {
  klomp: { name: 'klomp', melee: true },
  bezem: { name: 'bezem', melee: true },
  fietspomp: { name: 'fietspomp', melee: true },
  waterpistool: { name: 'waterpistool', melee: false, ammo: 30, cap: 600 },
};

export const levelOf = (name) => (name in RAGE_LEVELS ? RAGE_LEVELS[name] : RAGE_LEVELS.normaal);

// De kans dat een botsing of getoeter in ruzie eindigt. trigger: 'crash' | 'horn'.
export function rageChance(trigger, level, closing = 0) {
  if (!(level > 0)) return 0;
  if (trigger === 'crash') {
    if (!(closing >= RAGE.crashMinSpeed)) return 0;
    return Math.min(0.9, RAGE.crashChance * level * (0.7 + Math.min(closing, 14) / 14));
  }
  if (trigger === 'horn') return Math.min(0.9, RAGE.hornChance * level);
  return 0;
}

// Mag er nu een ruzie beginnen? s = { onFoot?, busy, dead, wanted, since, time, level }
export function mayRage(s) {
  if (!s || !(s.level > 0) || s.busy || s.dead || s.wanted > 0) return false;
  if (s.since < RAGE.cooldown || s.time < RAGE.firstGrace) return false;
  return true;
}

// Heeft hij iets in de hand, en wat? rng() in [0,1).
export function rollWeapon(level, rng = Math.random) {
  if (!(level > 0) || rng() >= Math.min(0.8, RAGE.armedShare * level)) return null;
  const total = RAGE_WEAPONS.reduce((n, w) => n + w.weight, 0);
  let r = rng() * total;
  for (const w of RAGE_WEAPONS) { r -= w.weight; if (r < 0) return w.key; }
  return RAGE_WEAPONS[0].key;
}

// Een klap op de speler: klein, en nooit onder de genadegrens.
export function canHurt(health) { return health > RAGE.mercyHealth; }
export function hitDamage(weaponDamage, level, health) {
  if (!canHurt(health)) return 0;
  const base = weaponDamage > 0 ? Math.min(RAGE.armedDamageCap, weaponDamage * 0.3) : RAGE.unarmedDamage;
  const dmg = Math.max(1, Math.round(base * Math.min(1.5, 0.6 + level * 0.4)));
  return Math.min(dmg, Math.max(0, Math.floor(health - RAGE.mercyHealth)));
}

// Geeft hij het op? Neergeslagen, bijna uitgeteld, of de speler is weg / klaar.
export function yields(ped) {
  return !!ped && (!!ped.ragdoll || ped.state === 'dead' || ped.health <= RAGE.yieldHealth);
}
export function givesUp(t, dist) { return t >= RAGE.giveUpAfter || dist >= RAGE.giveUpDist; }

// Wat oppakken doet. owned = world.ammo[key] || 0.
export function pickupPlan(key, owned = 0) {
  const info = DROP_INFO[key];
  if (!info) return { ok: false, msg: '' };
  if (info.melee) {
    if (owned > 0) return { ok: false, ammo: owned, msg: `Een ${info.name} heb je al.` };
    return { ok: true, ammo: 1, msg: `Je pakt de ${info.name} op. Toets 1 om te wisselen.` };
  }
  if (owned >= info.cap) return { ok: false, ammo: owned, msg: `Je ${info.name} zit al vol.` };
  const ammo = Math.min(info.cap, owned + info.ammo);
  return { ok: true, ammo, msg: owned > 0 ? `Je pakt een ${info.name} op: +${ammo - owned} water.` : `Je pakt een ${info.name} op. Toets 2 om te wisselen.` };
}

export const dropLabel = (key) => (DROP_INFO[key] ? `${DROP_INFO[key].name[0].toUpperCase()}${DROP_INFO[key].name.slice(1)} oppakken` : 'Oppakken');

export const RAGE_TEXT = {
  out: ['Zie je niet waar je rijdt?!', 'Kiek uut, joh!', 'Wat doe jij nou?!', 'Mijn bumper!', 'Heb je je rijbewijs in een loterij gewonnen?!'],
  horn: ['Wat sta jij daar te staan?!', 'Opschieten, joh!', 'Ik heb ook nog een leven!'],
  armed: ['Kijk, wat ik bij me heb!', 'Hier, pak aan!', 'Dit is mijn tweede bumper!'],
  hit: ['Pats!', 'Daar, hè!', 'En nu eruit!'],
  yield: ['Au, mijn schuld, mijn schuld!', 'Ik ga al, ik ga al!', 'Rustig aan, joh!'],
  back: ['Nou, laat maar.', 'Vergeet het maar.', 'Rij maar door, hoor.'],
  copStop: ['Politie! Wapen neer!', 'Hé, uit elkaar!'],
  copCalm: 'Rustig aan, meneer. Mee naar het bureau.',
  bonk: 'Hij bonkt boos op je motorkap.',
  squirt: 'Pats! Kletsnat, maar verder niks aan de hand.',
  drop: (key) => `Hij liet zijn ${DROP_INFO[key] ? DROP_INFO[key].name : 'spullen'} vallen. Oppakken met E.`,
  arrested: 'De agent neemt de ruziemaker mee. De auto blijft staan.',
  start: (armed) => (armed ? 'Een boze bestuurder stapt uit, met iets in de hand.' : 'Een boze bestuurder stapt uit.'),
};
