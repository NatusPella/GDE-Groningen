// De audit van alle kaartmarkers en kaartlagen (22-11, #1009): data die uit de code zelf wordt gelezen, zodat scripts/kaart_ds3_test.mjs
// hem kan nalopen en docs/KAART-DS3-AUDIT-22-11.md (scripts/kaart_audit_doc.mjs) er een tabel van maakt. Dynamische imports, omdat de
// activiteiten three.js nodig hebben (scripts/node3d.mjs moet eerst geladen zijn; de test en het docscript doen dat).
import '../node3d.mjs';

const R = '../../game/js/';

// De legenda van mapview.js (LEGEND), per rij: de soort die het icoon tekent en welke soorten de rij dekt. De test leest mapview.js
// en keurt dat de soorten van de rijen hier gelijk zijn aan die in de code (een nieuwe rij zonder regel hier valt op).
export const LEGENDA = [
  { groep: 'Altijd', kind: 'player', label: 'Jij', dekt: ['player', 'partner', 'companion'] },
  { groep: 'Altijd', kind: 'missionIdle', label: 'Verhaal', dekt: ['missionIdle', 'missionActive', 'waypoint', 'mi-', 'ma-', 'sj-target', 'sj-dot', 'mm-*', 'eierbalTip'] },
  { groep: 'Altijd', kind: 'userWaypoint', label: 'Jouw waypoint', dekt: ['userWaypoint'] },
  { groep: 'Altijd', kind: 'route', label: 'Route', dekt: ['route'] },
  { groep: 'Altijd', kind: 'navdoel', label: 'Doel dat je volgt', dekt: ['navdoel'] },
  { groep: 'Te doen', kind: 'padel', label: 'Minigames', dekt: ['padel', 'pigeon', 'heli', 'act-', 'pg-', 'onderdeel', 'wrakduik', 'streekuitdaging'] },
  { groep: 'Te doen', kind: 'sj-taxi', label: 'Bijbaantjes', dekt: ['sj-'] },
  { groep: 'Te doen', kind: 'missionIdle', label: 'Klussen', dekt: ['mi-'] },
  { groep: 'Te doen', kind: 'dorp', label: 'Ommeland', dekt: ['dorp', 'dorpKlaar', 'wereldeinde', 'beppe'] },
  { groep: 'Te doen', kind: 'perceel-koop', label: 'Percelen', dekt: ['perceel-'] },
  { groep: 'Te doen', kind: 'perceel-koop', label: 'Te koop', dekt: ['tekoop'] },
  { groep: 'Te doen', kind: 'perceel-koop', label: 'Standplaatsen', dekt: ['standplaats'] },
  { groep: 'Te doen', kind: 'perceel-eigen-rijp', label: 'Je velden', dekt: ['perceel-eigen', 'perceel-machine', 'perceel-afnemer'] },
  { groep: 'Te doen', kind: 'perceel-eigen-rijp', label: 'Alleen oogstklaar', dekt: [] },
  { groep: 'Te doen', kind: 'pg-jelle', label: 'Na het verhaal', dekt: ['pg-'] },
  { groep: 'Diensten', kind: 'home', label: 'Thuis', dekt: ['home*'] },
  { groep: 'Diensten', kind: 'own', label: 'Jouw voertuigen', dekt: ['own', 'car'] },
  { groep: 'Diensten', kind: 'garage', label: 'Garage en pomp', dekt: ['garage'] },
  { groep: 'Diensten', kind: 'hospital', label: 'Ziekenhuis en huisarts', dekt: ['hospital'] },
  { groep: 'Diensten', kind: 'politiebureau', label: 'Politiebureau', dekt: ['politiebureau'] },
  { groep: 'Diensten', kind: 'police', label: 'Politie-eenheid', dekt: ['police*', 'cash'] },
  { groep: 'Diensten', kind: 'horeca', label: 'Horeca', dekt: ['horeca'] },
  { groep: 'Diensten', kind: 'betreedbaar', label: 'Betreedbaar', dekt: ['betreedbaar'] },
  { groep: 'Diensten', kind: 'shop-kleding', label: 'Winkels', dekt: ['shop-:shops'] },
  { groep: 'Diensten', kind: 'shop-fietsen', label: 'Voertuigwinkels', dekt: ['shop-:shopsVoertuigen'] },
  { groep: 'Diensten', kind: 'shop-wapens', label: 'Wapens & pandjeshuis', dekt: ['shop-:shopsWapens'] },
  { groep: 'Diensten', kind: 'station', label: 'Treinstation', dekt: ['station'] },
  { groep: 'Diensten', kind: 'ov-halte', label: 'Bushalte', dekt: ['ov-halte'] },
  { groep: 'Diensten', kind: 'livebus', label: 'Live bus', dekt: ['livebus'] },
  { groep: 'Diensten', kind: 'roosterbus', label: 'Rooster', dekt: ['roosterbus'] },
  { groep: 'Onderweg', kind: 'companion', label: 'Maat', dekt: ['companion'] },
  { groep: 'Onderweg', kind: 'flitspaal', label: 'Flitspaal', dekt: ['flitspaal'] },
  { groep: 'Onderweg', kind: 'landmark', label: 'Bezienswaardigheid', dekt: ['landmark'] },
  { groep: 'Onderweg', kind: 'uitkijkpunt', label: 'Uitkijkpunten', dekt: ['uitkijkpunt'] },
  { groep: 'Onderweg', kind: 'act-safehuis', label: 'Safehouse', dekt: ['act-safehuis'] },
  { groep: 'Onderweg', kind: 'veroverd', label: 'Veroverd', dekt: ['veroverd'] },
  { groep: 'Onderweg', kind: 'text-street', label: 'Straatnamen', dekt: ['text-street'] },
  { groep: 'Onderweg', kind: 'text-wijk', label: 'Wijknamen', dekt: ['text-wijk'] },
  { groep: 'Onderweg', kind: 'buildings', label: 'Gebouwen', dekt: ['buildings'] },
];

// Markers die dezelfde vorm, kleur en glyph delen omdat het één dienst in varianten is: de variant staat in de tooltip en de naam. Alles wat
// hier niet in staat moet een eigen combinatie van vorm, kleur en glyph hebben (kaart_ds3_test).
export const FAMILIES = [
  ['livebus', 'roosterbus'], ['sj-taxi', 'sj-taxinacht'], ['sj-bus', 'sj-lijn', 'sj-schoolrit', 'sj-museumbus'],
  ['sj-rondvaart', 'sj-rondvaarttour', 'sj-tjalke', 'sj-veerdienst', 'sj-zeeschipwad', 'sj-zeeschipeems'],
  ['sj-helix', 'sj-niemeyer', 'sj-vandermeden'], ['sj-bernard', 'sj-berging', 'sj-bernardrit'], ['sj-suikerbieten', 'sj-bietenoogst'],
];

// De kinds die geen kaartmarker zijn maar wel op de kaart staan: lagen, lijnen en teksten.
export const LAGEN = [
  { naam: 'Routelijn: verhaal en missie (actief doel)', token: 'ink-geel', bron: 'mapstyle INK.routeLine / a11y PALETTES.mission', toelichting: 'dik en geel met een inktrand; het enige geel op de kaart' },
  { naam: 'Routelijn: jouw eigen doel', token: 'a11y-palet: user (paars)', bron: 'a11y.js PALETTES.uit.user (#c068ff) en de drie kleurenblindpaletten', toelichting: 'paars gestreept; bewust een palet voor kleurenblinden, geen DS-token' },
  { naam: 'Routelijn: klus', token: 'a11y-palet: job (oranje)', bron: 'a11y.js PALETTES', toelichting: 'puntjes' },
  { naam: 'Routelijn: opknappen of repareren', token: 'a11y-palet: care (roze)', bron: 'a11y.js PALETTES', toelichting: 'streep-punt' },
  { naam: 'Te koop (percelen)', token: 'laagTekoop = inktblauw (markerRollen().blauw)', bron: 'kaartkleuren.js kaartLaag, forsalemap.js STATES', toelichting: 'streeplijn en vlak 16 procent met prijskaartje' },
  { naam: 'Van jou (percelen)', token: 'laagEigen = ink-bord', bron: 'kaartkleuren.js kaartLaag', toelichting: 'volle lijn, vlak 26 procent' },
  { naam: 'Van een medespeler (percelen)', token: 'laagMedespeler = amber-tx (of de spelerkleur)', bron: 'kaartkleuren.js kaartLaag', toelichting: 'stippellijn' },
  { naam: 'Niet te koop (percelen)', token: 'laagSlot = inkt-zacht gemengd met papier', bron: 'kaartkleuren.js kaartLaag', toelichting: 'korte streepjes en een slot' },
  { naam: 'Betreedbaar', token: 'ICON_FILL.shop (bordgroen) en INK.locked als hij dicht is', bron: 'interiormap.js drawDoorBadge', toelichting: 'tegel met de Phosphor-deur uitgang gespiegeld' },
  { naam: 'Ontdekking: onzichtbaar', token: 'glas-3 met punt-raster', bron: 'kaartkleuren.js gebiedKleuren', toelichting: 'donker glas over het papier: nog niet verkend' },
  { naam: 'Ontdekking: zichtbaar / bezig / veroverd', token: 'ink-papier / ink-geel / licht-groen met glas-onderlijn', bron: 'kaartkleuren.js gebiedKleuren', toelichting: 'dikke lijn met donkere onderlijn, altijd leesbaar op papier' },
  { naam: 'OV: station en bushalte', token: 'blauw (markerRollen().blauw)', bron: 'MARKER_ROL station', toelichting: 'pil-vorm; live bus is een crème cirkel' },
  { naam: 'Verkeer: flitspaal', token: 'rood (markerRollen().rood)', bron: 'MARKER_ROL flitspaal', toelichting: 'achthoek' },
];

const TOKEN_VAN_ROL = { bord: 'ink-bord (gemengd met licht-groen 10 procent)', geel: 'ink-geel', rood: 'rood-glas (gemengd met inkt 18 procent)', blauw: 'WATER_BLAUW (gemengd met inkt 10 procent)', creme: 'creme' };
// Vorm en kleur van de markers die een eigen teken houden (geen badge): wat de speler ziet.
export const EIGEN_VORM = {
  player: { vorm: 'pijl', kleur: 'licht-groen met crème rand', token: 'licht-groen' },
  partner: { vorm: 'zestien vormen per speler', kleur: 'spelerkleur (--ds-c-id-1 tot 8)', token: 'id-1..8' },
  companion: { vorm: 'cirkel', kleur: 'bordgroen met crème glyph', token: 'ink-bord' },
  userWaypoint: { vorm: 'pin', kleur: 'paars (a11y-palet user)', token: 'a11y-palet' },
  missionIdle: { vorm: 'ring', kleur: 'ink-geel', token: 'ink-geel' }, missionActive: { vorm: 'ring met stip', kleur: 'ink-geel', token: 'ink-geel' },
  waypoint: { vorm: 'stip', kleur: 'ink-geel (half)', token: 'ink-geel' },
  car: { vorm: 'cirkel', kleur: 'kleur van het voertuig', token: 'voertuigkleur' },
  own: { vorm: 'cirkel met ring', kleur: 'kleur van je voertuig met een groene ring', token: 'voertuigkleur' },
  police: { vorm: 'schild', kleur: 'politieblauw (a11y-palet police)', token: 'a11y-palet' },
  cash: { vorm: 'cirkel', kleur: 'ink-geel met inktrand', token: 'ink-geel' },
  home: { vorm: 'cirkel', kleur: 'blauw (Bezit)', token: 'blauw' },
};

// Wat de kinds zijn (een representatieve lijst plus alles uit de tabellen van winkels, bijbanen en activiteiten).
const BASIS = ['player', 'partner', 'companion', 'cash', 'userWaypoint', 'missionIdle', 'missionActive', 'waypoint', 'eierbalTip', 'own', 'home', 'homeGarage', 'homeMooring', 'homeHelipad',
  'garage', 'hospital', 'politiebureau', 'station', 'ov-halte', 'livebus', 'roosterbus', 'horeca', 'flitspaal', 'landmark', 'uitkijkpunt', 'beppe', 'police', 'policeFoot', 'policeBike', 'policeHorse',
  'dorp', 'dorpKlaar', 'wereldeinde', 'perceel-koop', 'perceel-huur', 'perceel-eigen', 'perceel-eigen-rijp', 'perceel-machine', 'perceel-afnemer', 'pigeon', 'heli', 'padel', 'onderdeel', 'wrakduik',
  'streekuitdaging', 'pg-jelle', 'pg-fjord', 'mi-0', 'ma-0', 'sj-target', 'sj-dot', 'mm-gevaar', 'mm-rival', 'mm-halte', 'mm-ring', 'mm-pad', 'mm-brug', 'mm-subdoel', 'mm-hulp'];

export async function bouwAudit() {
  const [mi, ms, kk, mm, shopdata, sidejobs, activities] = await Promise.all(['mapicons', 'mapstyle', 'kaartkleuren', 'mapmarkers', 'shopdata', 'sidejobs', 'activities'].map((m) => import(R + m + '.js')));
  const kinds = [...BASIS, ...Object.keys(shopdata.SHOP_TYPES).map((k) => 'shop-' + k), ...sidejobs.SIDE_JOBS.map((j) => 'sj-' + j.id), ...activities.ACTIVITY_LEGEND.map((a) => a.kind)];
  const unieke = [...new Set(kinds)];
  const rollen = kk.MARKER_ROL;
  const eigenSleutel = (kind) => Object.keys(mm.EIGEN_SYMBOOL).find((k) => k.split(' / ').some((p) => (p.endsWith('*') ? kind.startsWith(p.slice(0, -1)) : p === kind)));
  const dekking = (kind) => {
    const groep = kind.startsWith('shop-') ? shopdata.SHOP_TYPES[kind.slice(5)]?.group || 'shops' : null;
    const rij = LEGENDA.find((r) => r.dekt.some((d) => (d.includes(':') ? kind.startsWith(d.split(':')[0]) && groep === d.split(':')[1] : d.endsWith('-') ? kind.startsWith(d) : d.endsWith('*') ? kind.startsWith(d.slice(0, -1)) : d === kind)));
    return rij ? rij.label : null;
  };
  const lijst = unieke.map((kind) => {
    const cat = mi.mapCategory(kind);
    const icoon = mm.markerIcoon(kind);
    const vul = mi.mapFillColor(kind);
    const eigen = !icoon ? eigenSleutel(kind) || (EIGEN_VORM[kind] ? kind : null) : null;
    const vorm = vul ? mi.badgeShape(kind) : (EIGEN_VORM[kind] || EIGEN_VORM[kind.replace(/^(mi|ma)-.*/, 'missionIdle')] || {}).vorm || 'eigen';
    const rol = rollen[cat];
    return {
      kind, categorie: cat, bron: icoon ? 'phosphor' : 'eigen', icoon: icoon || null, eigenReden: eigen ? mm.EIGEN_SYMBOOL[eigen] || 'eigen spelsymbool (zie EIGEN_VORM)' : null,
      vorm, vul: vul || null, kleurRol: vul ? rol : null, kleurToken: vul ? TOKEN_VAN_ROL[rol] : (EIGEN_VORM[kind] || {}).token || 'eigen', glyphKleur: vul ? mi.badgeGlyphColor(vul) : null,
      minPx: mi.MIN_ICON_PX, minZoom: ms.ICON_MIN_ZOOM[cat], legenda: dekking(kind), badge: !!vul,
    };
  });
  return { markers: lijst, lagen: LAGEN, legenda: LEGENDA, kinds: unieke };
}

// --- kleurenblind-simulatie (Machado 2009, ernst 1,0) en een kleurverschil, voor de test op vorm bij een klein kleurverschil ---
const CVD = {
  deuteranopie: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  protanopie: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  tritanopie: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};
export const CVD_SOORTEN = Object.keys(CVD);
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function simuleer(hex, soort) {
  const [r, g, b] = rgb(hex).map(lin);
  if (!soort) return [r, g, b];
  const M = CVD[soort];
  return [M[0] * r + M[1] * g + M[2] * b, M[3] * r + M[4] * g + M[5] * b, M[6] * r + M[7] * g + M[8] * b].map((v) => Math.max(0, Math.min(1, v)));
}
const lab = ([r, g, b]) => {
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
};
// Het kleurverschil (CIE76 in Lab) tussen twee hexen zoals iemand met die kleurenblindheid ze ziet (soort weggelaten: normaal zicht).
export function kleurVerschil(a, b, soort) {
  const la = lab(simuleer(a, soort)), lb = lab(simuleer(b, soort));
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}
