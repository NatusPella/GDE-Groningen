// Eén compacte verticale stapel voor de kaarten bovenin beeld (AAA, duivenspot en museum): uitleg, spotopdracht, hoogtekaart,
// ondertitel en naamplaten lagen over elkaar omdat elke kaart zijn eigen vaste top kreeg. Hier staat de regel, puur (geen DOM):
//
//   stapel(kaarten, { top, ruimte, gap })   welke kaarten blijven, op welke top, en welke vallen weg
//
// kaart: { id, prio, h, compactH?, nodig? }  prio: hoger is belangrijker; h: hoogte in px; compactH: de hoogte als de kaart
// compact getekend wordt (de uitleg zonder doelzin); nodig: false = de kaart is nu niet nodig en valt automatisch weg.
// De volgorde van de lijst is de volgorde van boven naar beneden. Past de stapel niet in `ruimte`, dan worden eerst de kaarten met
// de laagste prio compact, en daarna weggelaten (laagste prio eerst); de kaart met de hoogste prio blijft altijd.
export const STAPEL_TOP = 204;   // px: onder de missieregel en de meters
export const STAPEL_GAP = 8;

const eindig = (v) => typeof v === 'number' && Number.isFinite(v);

export function stapel(kaarten, { top = STAPEL_TOP, ruimte = 260, gap = STAPEL_GAP } = {}) {
  const lijst = (Array.isArray(kaarten) ? kaarten : []).filter((k) => k && k.id && eindig(k.h) && k.nodig !== false)
    .map((k) => ({ id: k.id, prio: eindig(k.prio) ? k.prio : 0, h: k.h, compactH: eindig(k.compactH) && k.compactH < k.h ? k.compactH : null, compact: false, weg: false }));
  const weg = (Array.isArray(kaarten) ? kaarten : []).filter((k) => k && k.id && k.nodig === false).map((k) => k.id);
  const hoogte = () => {
    const zicht = lijst.filter((k) => !k.weg);
    return zicht.reduce((s, k) => s + (k.compact ? k.compactH : k.h), 0) + Math.max(0, zicht.length - 1) * gap;
  };
  // eerst compact (laagste prio eerst), dan weg (laagste prio eerst); de belangrijkste kaart blijft
  const opPrio = [...lijst].sort((a, b) => a.prio - b.prio);
  for (const k of opPrio) { if (hoogte() <= ruimte) break; if (k.compactH != null) k.compact = true; }
  for (const k of opPrio) {
    if (hoogte() <= ruimte) break;
    if (lijst.filter((x) => !x.weg).length <= 1) break;
    k.weg = true;
  }
  let y = top;
  const zichtbaar = [];
  for (const k of lijst) {
    if (k.weg) { weg.push(k.id); continue; }
    const h = k.compact ? k.compactH : k.h;
    zichtbaar.push({ id: k.id, top: y, h, compact: k.compact });
    y += h + gap;
  }
  return { zichtbaar, weg, onder: y - gap };
}

// Overlap-controle voor de test en de debug: geeft de paren ids die elkaar raken (leeg = goed).
export function overlap(zichtbaar) {
  const uit = [];
  for (let i = 0; i < zichtbaar.length; i++) for (let j = i + 1; j < zichtbaar.length; j++) {
    const a = zichtbaar[i], b = zichtbaar[j];
    if (a.top < b.top + b.h && b.top < a.top + a.h) uit.push([a.id, b.id]);
  }
  return uit;
}

// De ruimte voor de stapel: tot net boven het midden van het scherm (daar staat de pijl naar het doel), in px van het HUD-vlak
// (viewportH al gedeeld door --ui). Nooit minder dan één kaart.
export function stapelRuimte(viewportH, top = STAPEL_TOP, midden = 0.5, pijl = 70) {
  const tot = (eindig(viewportH) ? viewportH : 720) * midden - pijl;
  return Math.max(110, tot - top);
}

// De standaardkaarten van de duivenspot, in volgorde van boven naar beneden: de opdracht (altijd), de uitleg van de eerste vlucht
// (alleen tot hij gezien is; compact als de ruimte krap is) en de hoogtekaart (alleen bij een museum-doel dat hoog hangt).
export function duivenKaarten({ introActief, holdActief, hoogteActief, intro = { h: 150, compactH: 74 }, opdracht = { h: 84, holdH: 110 }, hoogte = { h: 54 } } = {}) {
  return [
    { id: 'opdracht', prio: 3, h: holdActief ? opdracht.holdH : opdracht.h },
    { id: 'uitleg', prio: 2, h: intro.h, compactH: intro.compactH, nodig: !!introActief },
    { id: 'hoogte', prio: 1, h: hoogte.h, nodig: !!hoogteActief },
  ];
}

// --- vaste zones (#1053, #1058) ------------------------------------------------------------------------------------------------
// Elk HUD-onderdeel van de duivenmodus en de minigame-lagen (heli, duif) heeft één vaste zone in HUD-px (het venster gedeeld door --ui);
// deze rechthoeken mogen elkaar nooit raken (hudstack_test.mjs, bij 1280x720 en 1920x1080). De CSS gebruikt dezelfde getallen
// (pigeonmode.js, pigeonguide.js, hudcards.css, helirun.js); de test leest die bestanden na. Onderdelen die om dezelfde plek strijden
// (missiekaart, prestatiekaart, nieuwsregel) delen één zone met een prioriteit: het hoogste wint, de rest wacht.
export const LINKS_RAND = 46;       // px: de linkerrand van de HUD (--hud-edge)
export const LINKS_KAART_TOP = 200; // px: missiekaart, prestatiekaart en nieuwsregel staan onder het paneel van de minigame
export const LINKS_KAART_BREED = 350;
export const MM = 250;              // px: de minikaart (--mm-size)
const MM_BODEM = 46;         // px: --mm-bottom
const PLAATS_BREED = 230;    // px: de plaatsnaam naast de minikaart
const PLAATS_H = 84;
export const HINTS_LINKS = 560;     // px: de toetsbalk begint rechts van de plaatsnaam
export const HINTS_H = 100;
const HINTS_BODEM = 22;
const STAPEL_BREED = 480;
const RECHTS_KAART_BREED = 280;

// De breedtes die meekrimpen als de HUD smal wordt (Grootte interface 1,2 tot 1,5: het HUD-vlak is dan minder dan ~1140 px breed, review 21-11).
// links: de missie- en prestatiekaart (de CSS neemt 30 % van de breedte, hooguit LINKS_KAART_BREED); stapel: de opdrachtkaarten tussen
// de linkerkolom en het midden; boven: de doel- en routekaart van de gewone HUD tussen het paneel (rechts op 276) en de meldingen.
export function duivenMaten(vw) {
  const b = eindig(vw) ? vw : 1280;
  const links = Math.min(LINKS_KAART_BREED, Math.round(b * 0.3));
  const stapelB = Math.max(240, Math.min(STAPEL_BREED, Math.round(b - 2 * (LINKS_RAND + links + 14))));
  const boven = Math.max(240, Math.min(600, Math.round(2 * (b / 2 - 306))));
  return { links, stapel: stapelB, boven };
}

const rect = (id, x, y, w, h) => ({ id, x, y, w: Math.max(0, w), h: Math.max(0, h) });

// Alle zones van de duivenmodus voor een venster van vw x vh HUD-px, met de stapel zoals stapel() hem berekent (onder = de onderkant).
// top: waar de stapel begint (STAPEL_TOP, of lager als de doel- en routekaart van de gewone HUD hoger zijn, bijvoorbeeld bij 1280x720 waar de doelregel omslaat).
// Geeft { zones: [rect], pijl: rect }; pijl is de vrije band voor de richtingspijl.
export function duivenZones(vw, vh, onder = STAPEL_TOP + 110, top = STAPEL_TOP) {
  const mmTop = vh - MM_BODEM - MM;
  const maten = duivenMaten(vw);
  const hintsW = Math.min(760, vw - HINTS_LINKS - LINKS_RAND);
  const hintsY = vh - HINTS_BODEM - HINTS_H;
  const zones = [
    rect('paneel', 14, 12, 262, 140),
    rect('bovenbalk', vw / 2 - maten.boven / 2, 34, maten.boven, top - 8 - 34),   // doel- en routekaart van de gewone HUD
    rect('stapel', vw / 2 - maten.stapel / 2, top, maten.stapel, onder - top),
    rect('linkskaart', LINKS_RAND, LINKS_KAART_TOP, maten.links, mmTop - 12 - LINKS_KAART_TOP),
    rect('meldingen', vw - 14 - RECHTS_KAART_BREED, 96, RECHTS_KAART_BREED, 84),
    rect('minikaart', LINKS_RAND, mmTop, MM, MM),
    rect('plaats', LINKS_RAND + MM + 16, vh - MM_BODEM - 4 - PLAATS_H, PLAATS_BREED, PLAATS_H),
    rect('hints', HINTS_LINKS, hintsY, hintsW, HINTS_H),
    rect('ondertitel', HINTS_LINKS, hintsY - 12 - 64, hintsW, 64),
  ];
  const pijlX = LINKS_RAND + maten.links + 14;
  const pijlY = onder + 12;
  const pijl = rect('pijl', pijlX, pijlY, vw - pijlX - 14 - RECHTS_KAART_BREED - 14, hintsY - 12 - 64 - 12 - pijlY);
  return { zones, pijl };
}

// Elke twee zones die elkaar raken: [[a, b], ...] (leeg = goed)
export function zoneOverlap(zones) {
  const uit = [];
  for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
    const a = zones[i], b = zones[j];
    if (a.w > 0 && a.h > 0 && b.w > 0 && b.h > 0 && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) uit.push([a.id, b.id]);
  }
  return uit;
}

// Het midden van de richtingspijl (w x h px): naar de rand van het scherm (e.x, e.y in -1..1, y omhoog), maar altijd binnen de vrije band.
// e.onScreen: het doel is in beeld; de pijl hangt dan 70 px boven het doel (ook binnen de band).
export function pijlPlek(e, vw, vh, band, { w = 120, h = 84 } = {}) {
  const x = vw / 2 + (eindig(e && e.x) ? e.x : 0) * vw / 2;
  const y = vh / 2 - (eindig(e && e.y) ? e.y : 0) * vh / 2 - (e && e.onScreen ? 70 : 0);
  const klem = (v, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  return { x: klem(x, band.x + w / 2, band.x + band.w - w / 2), y: klem(y, band.y + h / 2, band.y + band.h - h / 2) };
}

// Naamplaten in de wereld: welke blijven staan als ze elkaar of een zone van de HUD raken? platen: [{ id, prio, x, y, w, h }] met het
// midden in HUD-px en prio 0 voor het dichtstbijzijnde doel (hoger = minder belangrijk). Een plaat valt weg als hij een belangrijkere plaat
// of een blokzone raakt of buiten het scherm staat; er blijven er hooguit `max` staan. Geeft de ids die blijven.
export function plaatSelectie(platen, vw, vh, blok = [], max = 3) {
  const raakt = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const kept = [];
  const lijst = (Array.isArray(platen) ? platen : []).filter((p) => p && eindig(p.x) && eindig(p.y) && eindig(p.w) && eindig(p.h)).sort((a, b) => (a.prio || 0) - (b.prio || 0));
  for (const p of lijst) {
    const r = { id: p.id, x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
    if (r.x < 0 || r.y < 0 || r.x + r.w > vw || r.y + r.h > vh) continue;
    if (kept.length >= max) continue;
    if (blok.some((z) => raakt(r, z)) || kept.some((k) => raakt(r, k))) continue;
    kept.push(r);
  }
  return kept.map((k) => k.id);
}
