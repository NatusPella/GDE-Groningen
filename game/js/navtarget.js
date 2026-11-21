// Eén bron voor "welk doel volg ik" (#1078, 21-11): de lijst van de doelen die de minikaart, de grote kaart, de routelijn (2D en 3D) en de HUD
// laten zien, met per doel een type, een kleurrol, een prioriteit en een vorm (glyph). Pure logica, geen DOM en geen THREE (scripts/navtarget_test.mjs).
//
// De regels (besluit eigenaar 21-11, docs/MINIMAP-PIJLEN-21-11.md):
//  - Er is precies één ACTIEF doel: het doel met de hoogste prioriteit. Dat is de boog met het icoon, de afstand erbij, die als enige pulseert.
//  - Geel (rol 'mission') is het doel van de autoroute: de actieve of de volgende missie van het verhaal. Paars (rol 'user') is wat de speler
//    zelf koos (een klik op de kaart, 'Zet als doel'). Alle andere doelen houden de kleur van hun icoon (klus oranje, zorg roze).
//  - Elk ander doel is SECUNDAIR: een klein rond icoon-punt in de kleur van zijn type (geen pijl), hooguit MAX_SECUNDAIR tegelijk. Nooit alleen
//    kleur: elk type heeft zijn eigen Phosphor-icoon (GLYPH) en het actieve doel heeft bovendien de afstand erbij (kompasboog, navpijl.js).
//  - Een doel dat klaar is, nooit gestart kan worden of er al is (aankomst) heeft geen pijl; twee doelen op dezelfde plek zijn één doel
//    (het hoogste wint, het andere staat in `samengevoegd`).
//  - Een minigame op de plek (padel, kermis, ...) of een heli-run laat alle andere doelen verdwijnen: rustige kaart.
//
// De kleurkeuze staat op één plek: NAV_ROL hieronder. Een regel wijzigen is genoeg om een type een andere paletrol (a11y.js PALETTES) te geven;
// minikaart, grote kaart, de 3D-lijn en de CSS-variabelen (--nav-actief, --nav-eigen, --nav-klus, --nav-zorg) volgen. Zo volgen ze ook de drie
// kleurenblindpaletten.
import { dsKleur } from './kaartkleuren.js';

// type -> sleutel in PALETTES (a11y.js). Besluit 21-11: actief geel, eigen paars, de rest de kleur van het icoon.
export const NAV_ROL = {
  missie: 'mission', verhaal: 'mission', groep: 'mission', heli: 'mission', uitdaging: 'mission',
  eigen: 'user',
  klus: 'job',
  zorg: 'care',
};

// De route-soorten van routing.js (user, mission, job, care) naar hun type: voor de routelijn en de 3D-ribbon.
export const PATH_KIND = { user: 'eigen', mission: 'missie', job: 'klus', care: 'zorg' };
// De paletsleutel van een route-soort (voor markerColors()[...]).
export const pathRole = (kind) => NAV_ROL[PATH_KIND[kind] || 'missie'] || 'mission';

// Het type in de markering: de sleutel is de vorm, de waarde de Phosphor-naam (icons.js) die navpijl.js in het ronde icoon van de kompasboog tekent.
export const GLYPH = { ster: 'ster', vlag: 'vlag', ruit: 'tas', kruis: 'ehbo', ring: 'helikopter', auto: 'auto', punt: 'doel', speler: 'speler' };

// rank: hoe hoger, hoe eerder actief. De volgorde is die van routing.js (heli, klus, missie in uitvoering, eigen doel, verhaalstap, uitdaging, zorg).
// volg: telt mee voor "het actieve doel". glyph: de vorm. label: de korte naam voor de afstandsregel en de schermlezer.
export const NAV_TYPES = {
  heli: { rank: 100, volg: true, glyph: 'ring', label: 'Heli' },
  klus: { rank: 90, volg: true, glyph: 'ruit', label: 'Klus' },
  missie: { rank: 80, volg: true, glyph: 'ster', label: 'Missie' },
  groep: { rank: 78, volg: true, glyph: 'ster', label: 'Missie van de groep' },
  eigen: { rank: 70, volg: true, glyph: 'vlag', label: 'Jouw doel' }, // glyph hangt van de soort doel af: zie eigenGlyph
  verhaal: { rank: 60, volg: true, glyph: 'ster', label: 'Verhaal' },
  uitdaging: { rank: 50, volg: true, glyph: 'ster', label: 'Uitdaging' },
  zorg: { rank: 30, volg: true, glyph: 'kruis', label: 'Opknappen' },
  eigenauto: { rank: 10, volg: false, glyph: 'auto', label: 'Jouw auto' },
};

export const MAX_SECUNDAIR = 2; // zoveel wachtende icoon-punten naast de boog
export const AANKOMST_M = 10; // dichter dan dit ben je er: geen pijl meer
const SAMENVOEG_M = 8; // twee doelen op dezelfde plek zijn één doel

// Een eigen doel heeft de vorm van wat het is: een plek een vlag, een missie of uitdaging een ster, een klus een ruit.
export function eigenGlyph(soort) {
  return soort === 'mission' || soort === 'challenge' ? 'ster' : soort === 'job' ? 'ruit' : soort === 'play' ? 'punt' : 'vlag';
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const valid = (d) => !!d && Number.isFinite(d.x) && Number.isFinite(d.y);

// De route-lijn per manier van reizen: dezelfde doelen, andere lijn (de boot een vaarlijn, het luchtvaartuig een rechte lijn).
const LINE_STYLE = { boot: 'vaar', lucht: 'lucht', ov: 'ov' };
export const lineStyleFor = (modus) => LINE_STYLE[modus] || 'weg';

// s: een momentopname van de wereld (hud_panel.js bouwt hem; de test een eigen):
//  speler {x, y}; modus 'lopen'|'fiets'|'auto'|'boot'|'ov'|'lucht';
//  bezig: 'minigame' | 'heli' | null (gameBusy en heliRun);
//  heli {x, y, name};                            het volgende doel van een heli-run
//  klus {x, y, name};                            de marker van de actieve bijbaan
//  uitdaging {x, y, name};                       het volgende punt van een actieve uitdaging na het verhaal
//  missie {x, y, name, fase, opKaart};           world.mission: fase 'active' | 'idle' | 'cooldown'; opKaart = missionOnMap
//  eigen {x, y, name, soort};                    goal.js: de keuze van de speler (soort = place | mission | play | job | challenge)
//  verhaal {x, y, name};                         world.storyGuide
//  groep [{x, y, name}];                         Samen spelen: de doelen van de groep, het dichtstbijzijnde per lijst
//  zorg {x, y, name, waarom};                    een zorgdoel (opknappen, garage na een lekke band)
//  klaar: ['eigen', ...]                         types die net klaar zijn (aankomst, afgerond): geen pijl
export function resolveNavTargets(s) {
  const uit = { actief: null, secundair: [], alle: [], verborgen: [], modus: s.modus || 'lopen', lijn: lineStyleFor(s.modus), reden: null };
  const verberg = (type, reden, id = type) => uit.verborgen.push({ type, id, reden });
  const sp = s.speler || { x: 0, y: 0 };
  const klaar = new Set(s.klaar || []);

  if (s.bezig === 'minigame') { uit.reden = 'minigame'; for (const t of ['klus', 'missie', 'eigen', 'verhaal', 'zorg']) if (s[t]) verberg(t, 'minigame'); return uit; }
  if (s.bezig === 'heli') {
    uit.reden = 'heli';
    if (valid(s.heli)) { const d = make('heli', s.heli, sp); d.rol = 'actief'; uit.actief = d; uit.alle.push(d); }
    for (const t of ['klus', 'missie', 'eigen', 'verhaal', 'zorg']) if (s[t]) verberg(t, 'heli');
    return uit;
  }

  const kandidaten = [];
  const voeg = (type, bron, extra) => {
    if (!valid(bron)) return;
    if (klaar.has(type)) { verberg(type, 'klaar'); return; }
    kandidaten.push(make(type, bron, sp, extra));
  };
  voeg('klus', s.klus);
  if (!s.klus) voeg('uitdaging', s.uitdaging); // zoals de minikaart: een klus gaat voor een uitdaging
  const m = s.missie;
  if (valid(m)) {
    if (s.klus) verberg('missie', 'klus actief');
    else if (m.fase === 'cooldown') verberg('missie', 'afgerond');
    else if (m.fase === 'active') voeg('missie', m, { id: 'missie' });
    else if (m.opKaart) voeg('verhaal', m, { id: 'missie', rankPlus: 1 }); // een missie op de kaart die nog niet loopt is de volgende stap
  }
  voeg('eigen', s.eigen, { glyph: eigenGlyph(s.eigen && s.eigen.soort) });
  voeg('verhaal', s.verhaal, { id: 'gids' }); // de stap van het verhaal kan ook een winkel zijn: valt samen als hij op de missie ligt
  for (const g of s.groep || []) voeg('groep', g);
  voeg('zorg', s.zorg);

  // aankomst: wie er al staat heeft geen pijl (de plek zelf toont zijn marker)
  const aanwezig = kandidaten.filter((d) => d.afstand < AANKOMST_M);
  for (const d of aanwezig) { verberg(d.type, 'aangekomen', d.id); kandidaten.splice(kandidaten.indexOf(d), 1); }

  // dezelfde plek is één doel: het hoogste wint
  kandidaten.sort((a, b) => b.rank - a.rank || a.afstand - b.afstand);
  const others = [];
  for (const d of kandidaten) {
    const dubbel = others.find((o) => distance(o, d) < SAMENVOEG_M);
    if (dubbel) { dubbel.samengevoegd.push(d.type); verberg(d.type, 'zelfde plek als ' + dubbel.type, d.id); } else others.push(d);
  }

  const follow = others.filter((d) => NAV_TYPES[d.type].volg);
  if (follow.length) {
    follow[0].rol = 'actief';
    uit.actief = follow[0];
    uit.secundair = follow.slice(1, 1 + MAX_SECUNDAIR);
    for (const d of follow.slice(1 + MAX_SECUNDAIR)) verberg(d.type, 'te veel pijlen');
  }
  for (const d of uit.secundair) d.rol = 'secundair';
  uit.alle = [...(uit.actief ? [uit.actief] : []), ...uit.secundair];
  return uit;
}

function make(type, bron, sp, extra = {}) {
  const t = NAV_TYPES[type];
  return {
    type, id: extra.id || type, rank: t.rank + (extra.rankPlus || 0), rol: 'secundair', x: bron.x, y: bron.y, name: bron.name || t.label, glyph: extra.glyph || t.glyph,
    afstand: Math.hypot(bron.x - sp.x, bron.y - sp.y), samengevoegd: [],
  };
}

// De kleur van een pijl: de paletrol van het type (palette = markerColors() uit a11y.js). Zorg en klus houden hun eigen kleur.
export function navColor(doel, palette) {
  const rol = NAV_ROL[doel.type] || 'mission';
  return (palette && palette[rol]) || dsKleur('ink-geel');
}

// De korte tekst bij een pijl voor de schermlezer en de tooltip: "Missie, 420 m". Alleen het actieve doel krijgt de afstand in beeld.
export function navTekst(doel, fmt = (m) => `${Math.round(m)} m`) {
  const t = NAV_TYPES[doel.type];
  return `${doel.rol === 'actief' ? t.label : t.label + ' (wacht)'}, ${fmt(doel.afstand)}`;
}


// De momentopname uit de wereld (minikaart en grote kaart bouwen hem hier, zodat ze nooit uit elkaar lopen). e: wat de wereld niet zelf weet:
//  speler {x, y}, modus, busyGame (padel, kermis, heli), heli {x, y} (het doel van de heli-run), goal (goal.js getGoal), missieOpKaart (goal.js missionOnMap),
//  groep [{x, y}] (Samen spelen), zorg {x, y, name} (lekke-bandgarage of de zorgroute).
export function snapshotFromWorld(w, e) {
  const m = w.mission;
  const job = w.sideJob && w.sideJob.active ? w.sideJob : null;
  const g = e.goal;
  return {
    speler: e.speler, modus: e.modus,
    bezig: w.heliRun ? 'heli' : e.busyGame ? 'minigame' : null,
    heli: e.heli || null,
    klus: job && job.marker ? { x: job.marker.x, y: job.marker.y, name: job.label } : null,
    uitdaging: !job && w.challengeTarget ? w.challengeTarget : null,
    missie: m && m.marker ? { x: m.marker.x, y: m.marker.y, name: m.label, fase: m.phase, opKaart: !!e.missieOpKaart } : null,
    eigen: g ? { x: g.x, y: g.y, name: g.name, soort: g.kind } : null,
    verhaal: !w.storyFreePlay && w.storyGuide && Number.isFinite(w.storyGuide.x) ? w.storyGuide : null,
    groep: e.groep || [],
    zorg: e.zorg || null,
  };
}

// De afstand bij het actieve doel: langs de route als die er is en naar dit doel loopt, anders hemelsbreed (dezelfde waarde als de doelregel in de HUD).
export function distanceFor(doel, route) {
  return route && route.target && Math.hypot(route.target.x - doel.x, route.target.y - doel.y) < 40 ? route.remaining : doel.afstand;
}

// De afstand voor de kleine tag bij het doel (minikaart en grote kaart): meters onder een kilometer, daarboven kilometers, geen decimale ruis.
//   onder 1 km op tientallen ("80 m", "420 m"), onder 10 km een decimaal ("4,7 km"), daarboven hele kilometers ("12 km").
export function compactDistance(m) {
  if (!Number.isFinite(m) || m < 0) return '';
  if (m < 995) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  if (m < 9950) return `${(Math.round(m / 100) / 10).toFixed(1).replace('.', ',')} km`;
  return `${Math.round(m / 1000)} km`;
}
