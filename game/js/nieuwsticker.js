// Radionieuws als tekst-ticker (#202): kopregels die reageren op wat de speler
// doet (overval, achtervolging, brug open, kermis, evenement), met verzonnen
// nieuwslezers en per regio een eigen toon. Alleen tekst, geen TTS. Puur: geen
// DOM, geen klok; de aanroeper geeft `now` (seconden) mee. De ticker staat bij
// de radio en op de HUD-kaartzone (hudbus.js: als 'tip', P3, laagste rang).
// Dichtheid: een minimale pauze tussen kopregels, een plafond per tijdvak,
// een wachttijd per soort en nooit dezelfde regel kort na elkaar. Berovingen
// zijn zonder leed: er verdwijnt een deel van het geld, niemand raakt gewond.
// Alle namen zijn verzonnen. Tests: scripts/nieuwsticker_test.mjs.

// Verzonnen lezers per regio; 'overig' is de terugval.
export const LEZERS = {
  groningen: ['Marrit Meeuwsen', 'Dikkie Dijkstra'],
  friesland: ['Sjoerd Zoutkamp'],
  drenthe: ['Hanneke Hunebed'],
  overig: ['Piet Peilbuis'],
};
export const BRON = 'Kiekdoar Nieuws';

// Soorten: prio (hoger mag de pauze doorbreken), cooldown (s) per soort.
export const SOORTEN = {
  achtervolging: { prio: 3, cooldown: 120 },
  overval: { prio: 2, cooldown: 90 },
  brug: { prio: 1, cooldown: 150 },
  kermis: { prio: 1, cooldown: 300 },
  evenement: { prio: 1, cooldown: 240 },
};

// Regels per soort, met {plaats}. Per regio mag een eigen tint; 'overig' geldt altijd als vulling.
const REGELS = {
  achtervolging: {
    overig: [
      'Een snelle auto en drie politiewagens maken een rondje {plaats}. Het verkeer vraagt vriendelijk om ruimte.',
      'Achtervolging bij {plaats}: de politie houdt vol, de auto ook. Een duif kijkt toe en blijft zitten.',
      'Rond {plaats} is een wilde rit gesignaleerd. Omstanders wordt gevraagd gewoon door te fietsen.',
    ],
    groningen: ['Politie jaagt in {plaats} op een verdachte auto. Op de fiets was het sneller gegaan, zegt een fietser.'],
    friesland: ['In {plaats} gaat het wild. Zelfs de skûtsjes in de haven keren hun zeil om even te kijken.'],
    drenthe: ['Bij {plaats} raast iets langs de hunebedden. De hunebedden verroeren zich niet.'],
  },
  overval: {
    overig: [
      'In {plaats} is een portemonnee van eigenaar gewisseld. Het bedrag was bescheiden, het commentaar luid.',
      'Een rare snuiter in {plaats} liep er met een deel van andermans zakgeld vandoor. Niemand raakte gewond.',
      'Winkeliers in {plaats} houden de kassa in de gaten. De politie noemt het een flinke schrikbeurt.',
    ],
    groningen: ['Grunn is iets lichter: in {plaats} is wat geld verdwenen. De politie zoekt een man in een opvallend jack.'],
    friesland: ['Ook in {plaats} is een deel van de portemonnee zoek. De Friese politie spreekt van een kleine, gemene streek.'],
    drenthe: ['In {plaats} is een kassalade lichter geworden. De dader nam het kleingeld niet eens mee.'],
  },
  brug: {
    overig: [
      'De brug bij {plaats} gaat open voor een schip. Wachten dus, en het uitzicht is gratis.',
      'Brugwachter bij {plaats} draait het wiel: even stilstaan, de boot gaat voor.',
    ],
    groningen: ['De Zuiderbrug is niet de enige die omhooggaat: ook bij {plaats} klinkt de bel. Neem een bakkie.'],
  },
  kermis: {
    overig: [
      'Kermis in {plaats}: de draaimolens draaien, de suikerspin plakt en de rij voor de oliebollen groeit.',
      'In {plaats} staat de kermis. Verwacht drukte, muziek en een lange rij voor de oliebollen.',
    ],
  },
  evenement: {
    overig: [
      'Vandaag in {plaats}: een evenement. Sommige straten zijn dicht, fietsers mogen er soms doorheen.',
      'Het is feest in {plaats}. Automobilisten wordt geraden een andere weg te nemen.',
    ],
    groningen: ['Gezellig in {plaats}: afsluitingen en veel volk. De bakker draait overuren.'],
  },
};

export const LIMIETEN = {
  minPauze: 45,        // s tussen twee kopregels (hoge prio mag halverwege)
  venster: 300,        // s
  maxPerVenster: 4,
  levensduur: 40,      // s dat een regel in beeld blijft
  wachtrij: 3,
  herhaal: 8,          // laatste N regels die niet terugkomen
};

export function createTicker(seed = 1) {
  return { seed: seed >>> 0 || 1, now: 0, lastAt: -1e9, times: [], perSoort: {}, recent: [], queue: [], current: null };
}

const next = (t) => { // kleine, deterministische reeks (mulberry-achtig)
  t.seed = (t.seed + 0x6D2B79F5) >>> 0;
  let x = t.seed;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

const lezerVoor = (t, regio) => { const l = LEZERS[regio] || LEZERS.overig; return l[Math.floor(next(t) * l.length)]; };

// De tekst die in beeld staat: "Kiekdoar Nieuws · Marrit Meeuwsen: …"
export const tickerTekst = (item) => `${BRON} · ${item.lezer}: ${item.tekst}`;

// Mag er nu een kopregel van deze soort bij? Geeft { ok, reden }.
export function mag(t, soort, now) {
  const s = SOORTEN[soort];
  if (!s) return { ok: false, reden: 'onbekend' };
  t.times = t.times.filter((x) => now - x < LIMIETEN.venster);
  if (t.times.length >= LIMIETEN.maxPerVenster) return { ok: false, reden: 'vol' };
  if (now - (t.perSoort[soort] ?? -1e9) < s.cooldown) return { ok: false, reden: 'cooldown' };
  const gap = now - t.lastAt;
  const hoogste = Math.max(0, ...t.queue.map((q) => SOORTEN[q.soort].prio), t.current ? SOORTEN[t.current.soort].prio : 0);
  // hogere prio dan wat er staat mag halverwege de pauze door
  const doorbreek = s.prio > hoogste && gap >= LIMIETEN.minPauze / 3;
  if (gap < LIMIETEN.minPauze && !doorbreek) return { ok: false, reden: 'pauze' };
  return { ok: true, reden: '' };
}

// Meld iets dat de speler deed of dat er gebeurt. info: { regio, plaats }.
// Geeft het nieuwe item of null (te druk, te kort geleden, onbekend).
export function meld(t, soort, info = {}, now = t.now) {
  t.now = now;
  const r = mag(t, soort, now);
  if (!r.ok) return null;
  const regio = LEZERS[info.regio] ? info.regio : 'overig';
  const plaats = String(info.plaats || 'de omgeving').replace(/[\u0000-\u001f<>]/g, ' ').slice(0, 40);
  const pool = [...(REGELS[soort][regio] || []), ...REGELS[soort].overig];
  const verse = pool.filter((l) => !t.recent.includes(l));
  const keuze = (verse.length ? verse : pool);
  const sjabloon = keuze[Math.floor(next(t) * keuze.length)];
  const item = { soort, regio, plaats, lezer: lezerVoor(t, regio), tekst: sjabloon.replace(/\{plaats\}/g, plaats), at: now, tot: 0 };
  t.recent.push(sjabloon);
  if (t.recent.length > LIMIETEN.herhaal) t.recent.shift();
  t.times.push(now);
  t.perSoort[soort] = now;
  t.lastAt = now;
  t.queue.push(item);
  t.queue.sort((a, b) => SOORTEN[b.soort].prio - SOORTEN[a.soort].prio || a.at - b.at);
  if (t.queue.length > LIMIETEN.wachtrij) t.queue.length = LIMIETEN.wachtrij;
  return item;
}

// Elke tick: oude regel laten verlopen, volgende naar voren halen. Geeft de huidige regel of null.
export function tikTicker(t, now) {
  t.now = now;
  if (t.current && now >= t.current.tot) t.current = null;
  if (!t.current && t.queue.length) {
    t.current = t.queue.shift();
    t.current.tot = now + LIMIETEN.levensduur;
  }
  return t.current;
}

// Past de regel op een ticker van `breedte` tekens? Scrollsnelheid in tekens per seconde,
// zodat de regel leesbaar binnen de levensduur door beeld gaat.
export function scrollSnelheid(item, breedte = 60) {
  const lang = tickerTekst(item).length;
  return Math.max(6, (lang + breedte) / LIMIETEN.levensduur);
}

// Voor de HUD-kaartzone: nieuws heeft geen eigen soort in hudbus.js, dus tonen als
// 'tip' (P3, laagste rang, wijkt voor alles).
export const HUD_SOORT = 'tip';
