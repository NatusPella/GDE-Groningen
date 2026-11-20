// AAA-upgrade van akte 3 en 4, tweede laag (docs/MISSIE-AAA-AKTE3-4.md): wat missions_akte3.js en missions_akte45.js nog niet hadden.
//
//   - openingsbeeld  st.openCam   een korte, rustige camera (3 tot 4 s) bij het begin van een stap: de plek, de aankleding en wie
//                                 er staat, voor je zelf mag lopen. Pan-budget (cineshots.js): geen pan, een kruip van 0,3 m/s.
//   - tussenbeats    st.beats     een moment halverwege (komedie of spanning): een regel op het scherm, een sting en soms publiek.
//   - nasleep        def.nasleep  na de beloning: één of twee regels over wat er daarna gebeurt (alleen tekst, geen stem).
//   - aankleding     vijf nieuwe plannen (missiedecor.js): brugwachter, kantoorgevel, overweg, dijkstart, heliplek.
//   - wachtprops     M13 en M20 kiezen de nieuwe spullen (radio, kaartspel, landkaart) in wachtprops.js.
//
// De runner (missions.js) roept drie kleine haken aan en weet verder niets van deze laag: beatStart (stap begint), beatTik (elk beeld
// in de stap) en beatStop (stap voorbij). Alles is alleen beeld: de stap, de klok, de beloning en de voortgang veranderen niet.
//
// Samen spelen (voor alle missies hieronder): een verhaalmissie is van wie het spel opende; een gast kiest bij Meedoen? (J of N,
// geen antwoord is nee). Camera, beats, nasleep en aankleding zijn lokaal beeld bij de speler die de stap draait; er gaat niets over
// het net en er wordt niets in wereld, beloning of voortgang geschreven (per speler, #429). Wie wegvalt of later aansluit mist alleen
// beeld; de camera start alleen voor de hoofdspeler te voet (in een voertuig blijft de gewone camera).
import { hoofdspeler } from './players.js';
import { startCameraTake, stopCameraTake } from './cinematics.js';
import { stingen } from './sfx/stingen.js';
import { haakFx } from './sfx/haken.js';
import { pointInPolygon } from './polygon.js';
import { registreerAankleding } from './missiedecor.js';

const eindig = (v) => typeof v === 'number' && Number.isFinite(v);
const klem = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const zeg = (fn) => { try { return fn(); } catch (e) { return null; } }; // beeld mag een missie nooit raken
export const OPEN_CAM_ID = 'akte34-open';
export const OPEN_CAM_SECS = 3.6;
export const OPEN_CAM_MAX_AFSTAND = 60; // m: verder dan dit staat er niets om naar te kijken

// --- het openingsbeeld (puur) -------------------------------------------------------------------------------------------
// De camera staat opzij van het midden tussen de speler en het anker (de aankleding of het doel), laag en met een kruip van
// 0,3 m/s langs de kijkrichting: geen pan, wel levend. `zij` is 1 of -1 (de kant), `afstand` hoe ver opzij. Geeft null bij kapotte
// invoer (dan blijft de gewone camera).
export function openingPose(focus, anker, t = 0, { zij = 1, afstand = 9, hoogte = 2.1 } = {}) {
  if (!focus || !eindig(focus.x) || !eindig(focus.y) || !anker || !eindig(anker.x) || !eindig(anker.y)) return null;
  let dx = anker.x - focus.x, dy = anker.y - focus.y;
  let L = Math.hypot(dx, dy);
  if (L < 1e-3) { dx = 1; dy = 0; L = 1; }
  const ux = dx / L, uy = dy / L;
  const lang = Math.min(L, 36); // een ver doel: kijk naar het punt 36 m vooruit, niet naar de horizon
  const mx = focus.x + ux * lang * 0.5, my = focus.y + uy * lang * 0.5;
  const tt = eindig(t) ? Math.max(0, t) : 0;
  const nx = -uy * (zij < 0 ? -1 : 1), ny = ux * (zij < 0 ? -1 : 1);
  return {
    position: { x: mx + nx * afstand + ux * tt * 0.3, y: my + ny * afstand + uy * tt * 0.3, z: hoogte },
    lookAt: { x: mx, y: my, z: 1.3 },
    fov: klem(50 - tt * 1.1, 42, 52),
  };
}

// Welke kant van de lijn staat vrij van gebouwen? 1, -1 of 0 (geen kant: geen beeld). `map` mag leeg zijn (dan 1).
export function kiesZij(map, focus, anker, afstand = 9) {
  const probe = (zij) => {
    const p = openingPose(focus, anker, 0, { zij, afstand });
    if (!p) return false;
    if (!map || typeof map.buildingsNear !== 'function') return true;
    try {
      return !map.buildingsNear(p.position.x, p.position.y, 2).some((b) => b.pts && pointInPolygon(p.position.x, p.position.y, b.pts));
    } catch (e) { return true; }
  };
  if (probe(1)) return 1;
  if (probe(-1)) return -1;
  return 0;
}

// --- de haken van de runner ---------------------------------------------------------------------------------------------
// S: de stapstaat van missions.js (S.t loopt in seconden). st.beats: [{ na, tekst, sting?, fx?, duur? }], st.openCam: { secs? }.
export function beatStart(world, st, S, anker) {
  if (!st || !S) return null;
  S.aaa34 = { cam: false, camT: 0, gedaan: new Set(), anker: anker && eindig(anker.x) && eindig(anker.y) ? { x: anker.x, y: anker.y } : null };
  const p = hoofdspeler(world);
  if (st.openCam && S.aaa34.anker && p && !p.inVehicle && !S.set) {
    // staat de aankleding om de speler zelf, dan kijkt de camera naar wat voor hem ligt (de aankleding staat in zijn kijkrichting);
    // een doel dat ver weg ligt geeft geen beeld
    const d0 = Math.hypot(S.aaa34.anker.x - p.x, S.aaa34.anker.y - p.y);
    if (d0 < 6 && eindig(p.angle)) S.aaa34.anker = { x: p.x + Math.cos(p.angle) * 8, y: p.y + Math.sin(p.angle) * 8 };
    const zij = d0 > OPEN_CAM_MAX_AFSTAND ? 0 : kiesZij(world && world.map, p, S.aaa34.anker);
    if (zij) {
      const secs = eindig(st.openCam.secs) ? klem(st.openCam.secs, 2, 5) : OPEN_CAM_SECS;
      S.aaa34.cam = secs;
      const A = S.aaa34.anker;
      zeg(() => startCameraTake(OPEN_CAM_ID, (t) => {
        const q = hoofdspeler(world);
        return t > secs || !q ? null : openingPose({ x: q.x, y: q.y }, A, t, { zij });
      }, { letterbox: false, hideHud: false }));
    }
  }
  return S.aaa34;
}

export function beatTik(world, st, S, dt) {
  const H = S && S.aaa34;
  if (!H) return;
  if (H.cam) {
    H.camT += dt;
    const p = hoofdspeler(world);
    if (H.camT >= H.cam || (p && p.inVehicle)) { zeg(() => stopCameraTake(OPEN_CAM_ID)); H.cam = false; }
  }
  const beats = st && st.beats;
  if (!Array.isArray(beats)) return;
  beats.forEach((b, i) => {
    if (!b || H.gedaan.has(i) || !(S.t >= b.na)) return;
    H.gedaan.add(i);
    const p = hoofdspeler(world);
    if (b.tekst) world.addMessage(b.tekst, b.duur || 4.5, { kind: 'beat', key: `beat:${i}:${b.tekst.slice(0, 16)}` });
    if (b.sting) zeg(() => stingen.push(world, b.sting));
    if (b.fx && p) zeg(() => haakFx(world, b.fx, p.x, p.y));
  });
}

export function beatStop(S) {
  const H = S && S.aaa34;
  if (!H) return;
  if (H.cam) zeg(() => stopCameraTake(OPEN_CAM_ID));
  S.aaa34 = null;
}

// De nasleep na de beloning: regels als berichten, een voor een met een kleine tussenpoos (via de berichtenduur zelf).
export function nasleepRegels(def) {
  return def && Array.isArray(def.nasleep) ? def.nasleep.filter((t) => typeof t === 'string' && t) : [];
}
export function toonNasleep(world, def) {
  nasleepRegels(def).forEach((t, i) => world.addMessage(t, 5, { kind: 'nasleep', key: `nasleep:${def.label}:${i}` }));
}

// --- aankleding: vijf nieuwe plannen ---------------------------------------------------------------------------------------
const look = (shirt, skin, seed, variant = 'male') => ({ shirt, skin, seed, variant });
const PI2 = Math.PI / 2;

// M17: Wubbo (brugwachter) met zijn radio en twee fanfareleden aan de kade, klaar voor de elf bruggen.
export const PLAN_BRUGWACHTER = {
  props: [
    { kind: 'bank', along: 3.5, side: -6.5, a: PI2 },
    { kind: 'kist', along: 5.0, side: -7.8, a: 0.4 },
    { kind: 'ton', along: 7.0, side: 6.8, a: 0 },
    { kind: 'vaandel', along: 9, side: 5.5, a: 0 },
    { kind: 'banner', along: 12, side: 0, a: 0, title: 'ELF BRUGGEN, EEN VAARWEG', sub: 'Toeter, wacht, vaar door' },
  ],
  people: [
    { look: look(0xe0b93a, 0xd9a06e, 9101), along: 4.5, side: 4.6, a: -PI2 - 0.3, anim: 'wave' },
    { look: look(0x2f6fb0, 0xf1c9a5, 9102), along: 6.4, side: -5.6, a: PI2, anim: 'cheer' },
    { look: look(0x2f6fb0, 0xa9744a, 9103, 'female'), along: 7.6, side: -6.6, a: PI2 + 0.4, anim: 'talk' },
  ],
  crowd: null,
};

// M18: de glazen gevel van Wiebelwerk: een stoepbord, twee medewerkers met koffie en een stagiair die zwaait.
export const PLAN_KANTOORGEVEL = {
  props: [
    { kind: 'bank', along: 4.0, side: 7.0, a: -PI2 },
    { kind: 'ton', along: 2.5, side: 8.4, a: 0 },
    { kind: 'ton', along: 7.5, side: -7.4, a: 0 },
    { kind: 'banner', along: 10, side: 0, a: 0, title: 'WIEBELWERK', sub: 'Websites met karakter' },
  ],
  people: [
    { look: look(0x555f6e, 0xf1c9a5, 9201), along: 5.2, side: 5.4, a: -PI2 - 0.5, anim: 'talk' },
    { look: look(0x8a4a8a, 0xd9a06e, 9202, 'female'), along: 6.2, side: 6.4, a: -PI2 - 0.2, anim: 'hips' },
    { look: look(0x3f8a52, 0xa9744a, 9203), along: 8.5, side: -5.0, a: PI2, anim: 'wave' },
  ],
  crowd: null,
};

// M21: de overweg bij Zuidhorn: een bareel (hek), een waarschuwingsbord en twee buurtbewoners die de trein verwachten.
export const PLAN_OVERWEG = {
  props: [
    { kind: 'hek', along: 6.5, side: -2.5, a: PI2 },
    { kind: 'hek', along: 6.5, side: 2.5, a: PI2 },
    { kind: 'perronbord', along: 4.5, side: 4.6, a: 0 },
    { kind: 'vaandel', along: 8, side: -6, a: 0 },
    { kind: 'bank', along: -3, side: 7.5, a: -PI2 },
  ],
  people: [
    { look: look(0xc8552e, 0xf1c9a5, 9301, 'female'), along: 3.5, side: -5.5, a: PI2 - 0.6, anim: 'point' },
    { look: look(0x4a5a6a, 0xd9a06e, 9302), along: 4.6, side: -6.4, a: PI2 - 0.9, anim: 'talk' },
  ],
  crowd: null,
};

// M14: de startlijn van de dijk: een limo-hek, Jelles deurwaarder met zijn dossiermap en drie toeschouwers.
export const PLAN_DIJKSTART = {
  props: [
    { kind: 'hek', along: 5, side: -7, a: 0 },
    { kind: 'hek', along: 5, side: 7, a: 0 },
    { kind: 'vaandel', along: 8, side: -5, a: 0 },
    { kind: 'vaandel', along: 8, side: 5, a: 0 },
    { kind: 'banner', along: 12, side: 0, a: 0, title: 'BESLAG OP DE DIJK', sub: 'Wie het eerst bij de sluis is, wint' },
  ],
  people: [
    { look: look(0x3a3a4a, 0xf1c9a5, 9401), along: 6.2, side: 3.4, a: -PI2 - 0.4, anim: 'point' },
    { look: look(0xe0b93a, 0xd9a06e, 9402, 'female'), along: 7.8, side: -4.6, a: PI2, anim: 'cheer' },
    { look: look(0x2f6fb0, 0xa9744a, 9403), along: 9.0, side: -5.6, a: PI2 + 0.3, anim: 'wave' },
  ],
  crowd: null,
};

// M12: de heliplek: de lunchkisten van Dijkstra, een windzak en twee mensen die het inladen.
export const PLAN_HELIPLEK = {
  props: [
    { kind: 'kist', along: 5.0, side: -6.0, a: 0.3 },
    { kind: 'kist', along: 5.9, side: -6.6, a: 0.9 },
    { kind: 'kist', along: 5.4, side: -6.3, a: 0.1, y: 0.75 },
    { kind: 'vaandel', along: 8, side: 7, a: 0 },
    { kind: 'ton', along: -4, side: 7.4, a: 0 },
    { kind: 'banner', along: 12, side: 0, a: 0, title: 'DIJKSTRA\'S LUNCHSERVICE', sub: 'Warm aan het ziekenhuis' },
  ],
  people: [
    { look: look(0xe08a2a, 0xd9a06e, 9501), along: 4.2, side: -4.4, a: PI2, anim: 'talk' },
    { look: look(0xe0b93a, 0xf1c9a5, 9502, 'female'), along: 6.4, side: 4.8, a: -PI2, anim: 'wave' },
  ],
  crowd: null,
};

export const PLANNEN_AKTE34 = { brugwachter: PLAN_BRUGWACHTER, kantoorgevel: PLAN_KANTOORGEVEL, overweg: PLAN_OVERWEG, dijkstart: PLAN_DIJKSTART, heliplek: PLAN_HELIPLEK };
for (const [kind, plan] of Object.entries(PLANNEN_AKTE34)) registreerAankleding(kind, plan);

// --- de tussenbeats en de nasleep (data) -----------------------------------------------------------------------------------
// Per missie: per stap (zoek op label) een openingsbeeld en beats; per missie een nasleep. Alle tekst is Nederlands en alleen te
// lezen (geen nieuwe stemregels); de namen zijn verzonnen of staan al in het verhaal.
export const BEATS = {
  M13: { // Het containerlabyrint
    kooi: [{ na: 3.5, tekst: 'Beneden zingt de bewaker mee met zijn radio. Vals.', sting: 'stap' }, { na: 7, tekst: 'Hij kijkt omhoog. Dan pakt hij zijn koffie. Het mag.', sting: 'bijna' }],
    papieren: [{ na: 2.5, tekst: 'Het slot piept bij elke draai. Houd vol.' }, { na: 5, tekst: 'Voetstappen op de stapel. Blijf staan.', sting: 'bijna' }],
  },
  M14: { chase: [{ na: 14, tekst: 'Een kudde schapen steekt de dijk over. De deurwaarder remt niet.', sting: 'stap' }, { na: 55, tekst: 'Uit het raam van de limo zwaait een dossiermap: "Beslag!"' }] },
  M15: { poorten: [{ na: 22, tekst: 'Onder je zwaaien kermisgangers met suikerspinnen.', sting: 'stap', fx: 'publiek_gejuich' }] },
  M17: {
    fluit: [{ na: 9, tekst: 'Wubbo fluit twee keer. Dicht. Hij lacht erbij.', sting: 'stap' }],
    drie: [{ na: 12, tekst: 'Een eend gaat voor je langs. Hij heeft voorrang.' }],
    elf: [{ na: 8, tekst: 'Aan de overkant start de limo. De brug blijft dicht: Wubbo kent geen limo\'s.', sting: 'bijna' }],
  },
  M18: {
    servers: [{ na: 5, tekst: 'Achter je blijft de accountmanager glimlachen. Dat is zorgwekkender.', sting: 'stap' }],
    logboek: [{ na: 3, tekst: 'De printer begint te zoemen. Dit komt er echt uit.', sting: 'bijna' }],
  },
  M19: { rit: [{ na: 18, tekst: 'In de salonwagen eten de juryleden eierballen. Ze klappen bij elke bocht.', sting: 'stap' }, { na: 60, tekst: 'Langs het spoor rent een fotograaf met de trein mee.', fx: 'publiek_gejuich' }] },
  M20: {
    wal1: [{ na: 4, tekst: 'Een kartonnen kogel suist over je hoofd. Berend roept: "Dat was oefenen!"', sting: 'stap' }],
    wal2: [{ na: 3.5, tekst: 'Op de noordwal speelt een wachter kaart. Hij heeft drie azen.' }],
    deur1: [{ na: 3, tekst: 'Achter de deur klopt iemand in het ritme van de fanfare.', sting: 'bijna' }],
    deur3: [{ na: 3, tekst: 'De laatste deur kraakt. Mem roept: "Nog heel even!"', sting: 'bijna' }],
  },
  M21: { overweg: [{ na: 10, tekst: 'Aan de overweg wijst een buurvrouw naar het spoor: "Daar komt hij."', sting: 'stap' }] },
};

export const NASLEEP = {
  M12: ['Dijkstra\'s lunch is warm aangekomen. Het ziekenhuis wil volgende week hetzelfde.'],
  M13: ['Lammert telt de kisten twee keer en kijkt je niet aan: "Ik heb niets gezien. Ik zie nooit wat."'],
  M14: ['Aan de sluis staat de deurwaarder met een leeg dossier. De schapen hebben zijn beslag opgegeten.'],
  M15: ['Roelfien deelt suikerspinnen uit onder de vleugel. Het spandoek blijft tot zondag hangen.'],
  M16: ['De botsauto\'s staan stil. Durk en Douwe vragen om een revanche.'],
  M17: ['Wubbo sluit de bruggen een voor een. Het mosterdschip ligt vast midden in de diep. Een eend zwemt er trots omheen.'],
  M18: ['Het printje rolt uit de printer als een diploma. Wiebelwerk stuurt nog een offerte voor een chatbot.'],
  M19: ['De juryleden stappen niet uit. Ze vragen of de trein ook naar Assen gaat.'],
  M20: ['De vesting is weer stil. Berend telt zijn flyers: er zijn er nog tweehonderd over.'],
  M21: ['Zuidhorn slaapt. Op de overweg ligt één rode sticker. Niemand weet van wie.'],
};

// --- de toepassing ---------------------------------------------------------------------------------------------------
const LABELS = {
  M12: 'Het staat niet in het rooster', M13: 'Het containerlabyrint', M14: 'De dijk', M15: 'Laag over het graan', M16: 'Nog eentje dan',
  M17: 'Open, dicht', M18: 'Wie draaide de camera\'s uit?', M19: 'Stoom', M20: 'Het beleg van Bourtange', M21: 'Iedereen heeft een rode auto gezien',
};

// Zet de tweede AAA-laag op de defs (na applyAkte3 en applyAkte45). Een missie of stap die er niet is, wordt overgeslagen.
export function applyAkte34(list) {
  const by = (id) => (list || []).find((d) => d.label === LABELS[id]);
  const vind = (def, soort, re) => (def && Array.isArray(def.stages) ? def.stages.find((s) => s && (!soort || s.kind === soort) && re.test(s.label || '')) : null) || null;
  const zet = (s, veld) => { if (s) Object.assign(s, veld); return !!s; };
  const beats = (s, lijst) => zet(s, { beats: lijst.map((b) => ({ ...b })) });
  for (const id of Object.keys(NASLEEP)) { const d = by(id); if (d) d.nasleep = NASLEEP[id].slice(); }

  // M12 Het staat niet in het rooster: de heliplek met Dijkstra's lunchkisten bij de start.
  const m12 = by('M12');
  if (m12 && m12.stages && m12.stages[0] && !m12.stages[0].dressing) zet(m12.stages[0], { dressing: 'heliplek', openCam: {} }); // bij de helipad van de stap (de start schuift later naar Eelde)

  // M13: een radio bij de bewaker in de kooi (de bewaker zingt mee), een landkaart bij de container; twee beats per wachtstap.
  const m13 = by('M13');
  if (m13 && m13.stages) {
    zet(m13.stages[0], { openCam: {} });
    const kooi = m13.stages[1], papieren = m13.stages[3];
    if (kooi && kooi.wacht) kooi.wacht = { ...kooi.wacht, prop: 'radio' };
    if (papieren && papieren.wacht) papieren.wacht = { ...papieren.wacht, prop: 'landkaart' };
    beats(kooi, BEATS.M13.kooi); beats(papieren, BEATS.M13.papieren);
  }

  // M14 De dijk: de startlijn met de deurwaarder, en twee beats in de race (schapen, dossiermap).
  const m14 = by('M14');
  if (m14 && m14.stages && m14.start) {
    zet(m14.stages[0], { dressing: 'dijkstart', dressingAt: { x: m14.start.x, y: m14.start.y }, openCam: {} });
    beats(m14.stages[1], BEATS.M14.chase);
  }

  // M15: een beat bij de poorten (de kermis zwaait); de landing houdt zijn publiek van tien.
  const m15 = by('M15');
  if (m15 && m15.stages) beats(m15.stages[1], BEATS.M15.poorten);

  // M17 Open, dicht: Wubbo en de fanfare aan de kade bij de start, beats bij de fluit, de brugreeks en de laatste brug.
  const m17 = by('M17');
  if (m17 && m17.stages && m17.start) {
    zet(m17.stages[0], { dressing: 'brugwachter', dressingAt: { x: m17.start.x, y: m17.start.y }, openCam: {} });
    beats(vind(m17, 'goto', /brug 5, 6 en 7/), BEATS.M17.fluit);
    beats(vind(m17, 'goto', /brug 8, 9 en 10/), BEATS.M17.drie);
    beats(vind(m17, 'goto', /brug elf/), BEATS.M17.elf);
  }

  // M18: de gevel van Wiebelwerk (twee medewerkers en een stagiair) bij binnenkomst, beats in de gang en bij de printer.
  const m18 = by('M18');
  if (m18 && m18.stages && m18.start) {
    // de eerste stap is bij de start al gehaald (start en doel vallen samen): de gevel staat bij het naar-buiten-moment, met de printout
    zet(vind(m18, 'goto', /Naar buiten/), { dressing: 'kantoorgevel' });
    beats(vind(m18, 'goto', /serverkamer/), BEATS.M18.servers);
    beats(vind(m18, 'hold', /logboek/), BEATS.M18.logboek);
  }

  // M19 Stoom: twee beats in de rit (de salonwagen, de fotograaf langs het spoor).
  const m19 = by('M19');
  if (m19) beats(m19.stages && m19.stages.find((s) => s.kind === 'rit'), BEATS.M19.rit);

  // M20: de nieuwe wachtspullen (kaartspel op de noordwal), beats bij de wal en de deuren, openingsbeeld bij de wallen.
  const m20 = by('M20');
  if (m20 && m20.stages) {
    zet(vind(m20, 'goto', /wallen van de vesting/), { openCam: {} });
    const wal2 = vind(m20, 'hold', /noordwal/);
    if (wal2 && wal2.wacht) wal2.wacht = { ...wal2.wacht, prop: 'kaartspel' };
    beats(vind(m20, 'hold', /westwal/), BEATS.M20.wal1); beats(wal2, BEATS.M20.wal2);
    beats(vind(m20, 'hold', /eerste deur/), BEATS.M20.deur1); beats(vind(m20, 'hold', /derde deur/), BEATS.M20.deur3);
  }

  // M21: de overweg met buurtbewoners (Tessa's deel), een beat als de trein wordt aangekondigd.
  const m21 = by('M21');
  if (m21 && m21.stages) {
    const overweg = vind(m21, 'goto', /overweg bij Zuidhorn/);
    zet(overweg, { dressing: 'overweg' });
    beats(overweg, BEATS.M21.overweg);
  }
}
