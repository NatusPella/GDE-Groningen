// One small icon per story mission, in the HUD's icon style (24×24, solid
// shapes in currentColor, a few with round strokes). Shown in Te doen, on
// the map and minimap (inside the yellow mission ring, hud_panel.js), in the
// phone's mission list and on the HUD's mission cards. Keyed by the
// missions.js def id (storyarc.js MISSION_IDS); `fill` is drawn even-odd, so
// shapes inside a shape are holes.
import { MISSION_IDS } from './storyarc.js';

const MISSION_ICONS = {
  // H1 Berend telt de krassen: his bakkie
  berend: { fill: 'M2 17v-3a1 1 0 0 1 1-1h1.6l1.6-4.6a1 1 0 0 1 .9-.4H15a1 1 0 0 1 .8.4l2.8 4.6H21a1 1 0 0 1 1 1v3h-2a3 3 0 0 0-6 0h-4a3 3 0 0 0-6 0zM7.3 9.5L6 13h5V9.5zM13 9.5V13h4.4l-2-3.5zM7 15.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM17 15.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z' },
  // M03 Het Loket: a queue ticket
  loket: { fill: 'M3 6h18v4.2a2 2 0 0 0 0 3.6V18H3v-4.2a2 2 0 0 0 0-3.6zM7 9v2h4V9zM7 13v2h6v-2zM15.5 9.5v5H17v-5z' },
  // H3 Iets met de Grote Markt: a terrace parasol going over
  chaos: { fill: 'M3.6 12.6a9 7 -20 0 1 16.9-6.2zM12.4 10.6l1.5-.5 2.6 7.4a2.3 2.3 0 0 1-4.3 1.6l-.2-.5 1.5-.5.2.5a.7.7 0 0 0 1.3-.5z', stroke: 'M3 18.5l2-1M3.6 21.2l2.6-.2' },
  // H5 Wind tegen, beide kanten op: the KEI race bike
  kei: { stroke: 'M6 16m-3.6 0a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0-7.2 0M18 16m-3.6 0a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0-7.2 0M6 16l3.6-6.5h6.2L18 16M9.6 9.5l4 6.5H6M15.8 9.5l-1-3h2.6M8 7h3.2' },
  // H7 Heel aankomen is ook een kunst: breekbaar
  noorderzon: { fill: 'M7 3h10l-.6 5.2a4.5 4.5 0 0 1-3.6 3.9V18H16v2.4H8V18h3.2v-5.9A4.5 4.5 0 0 1 7.6 8.2zM8.9 4.8l.3 3a2.8 2.8 0 0 0 5.6 0l.3-3z' },
  // H9 Ring Zuid, laatste fase: the chequered flag
  ringweg: { fill: 'M4 3h1.8v18H4zM6.6 4H20v10H6.6zM9.8 4v3.3h3.3V4zM16.4 4v3.3H20V4zM6.6 7.3v3.4h3.2V7.3zM13.1 7.3v3.4h3.3V7.3zM9.8 10.7V14h3.3v-3.3zM16.4 10.7V14H20v-3.3z' },
  // H11 Nog eentje dan: a beer
  kroegentocht: { fill: 'M5 5h11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM8 8v9h1.4V8zM11.6 8v9H13V8zM4.6 5a2.4 2.4 0 0 1 3.2-2.6 3 3 0 0 1 5.2 0A2.4 2.4 0 0 1 16.4 5zM16 8h2.5A2.5 2.5 0 0 1 21 10.5v3a2.5 2.5 0 0 1-2.5 2.5H16v-2h2.3a.7.7 0 0 0 .7-.7v-2.6a.7.7 0 0 0-.7-.7H16z' },
  // H12 Fatbikes tellen niet als fiets: te voet, ertussendoor
  fatbike: { fill: 'M13.5 2.2a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z', stroke: 'M12.6 8.4L10.6 14l3 2.2V21M10.6 14L8 20.6M12.6 8.4l3.4 3 3-.6M12.6 8.4l-3.8 1.8-1.2 3' },
  // H13 Alles klopt, behalve de papieren: the rondvaartboot
  rondvaart: { fill: 'M2 14h20l-2.5 5h-15zM5 13V9.5A1.5 1.5 0 0 1 6.5 8h11A1.5 1.5 0 0 1 19 9.5V13zM7 9.6v2.2h2.4V9.6zM10.8 9.6v2.2h2.4V9.6zM14.6 9.6v2.2H17V9.6zM10.7 2.6a1.6 1.6 0 0 1 1.3.6 1.6 1.6 0 0 1 2.6 1.3c0 1.1-1.5 1.9-2.6 2.6-1.1-.7-2.6-1.5-2.6-2.6a1.6 1.6 0 0 1 1.3-1.9z' },
  // H2 Even pinnen: the ATM with Tessa's pass
  pinautomaat: { fill: 'M4 2.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1zM6 4.6v5h12v-5zM8 12.6V14h8v-1.4zM9 18h6v3.5H9z' },
  // H4 Kieken van boven: Bert's pigeon
  duifverkenning: { fill: 'M3 13c3-1 5.2-4 9-4 1.6 0 2.6-1.6 3.8-2.6 1.2-.9 2.9-.6 3.7.5l1.5.5-1.6.8c.2 3.7-2.3 7-6.4 7.8L10 20H7.5l1.8-3.4C6.6 16.4 4.4 15 3 13zM17.6 7.8a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4z' },
  // H6 Het museum stond er al zo: the museum
  museumkraak: { fill: 'M12 2.5L22 8H2zM4 9.5h2.5v8H4zM8.5 9.5H11v8H8.5zM13 9.5h2.5v8H13zM17.5 9.5H20v8h-2.5zM2 19h20v2.5H2z' },
  // H8 Al het vet van Grunn: frituurvet
  vetgekaapt: { fill: 'M12 2.5c3.5 4.6 6.5 8.4 6.5 12a6.5 6.5 0 0 1-13 0c0-3.6 3-7.4 6.5-12zM8.6 14.5a3.4 3.4 0 0 0 3.4 3.4v-1.6a1.8 1.8 0 0 1-1.8-1.8z' },
  // H10 Er hangt iets Fries aan d'Olle Grieze: a flag on the tower
  vlag: { fill: 'M11 1.8L13 8H9zM9 8h4v13H9zM13 9h8l-2 3 2 3h-8zM10.3 11v2.4h1.4V11z' },
  // H14 Geleend van de Friezen: the skûtsje
  skutsje: { fill: 'M3 16h18l-3 4.5H6zM11 3h1.4v12.5H11zM12.8 4L20 14.5h-7.2zM10.6 6L5 14.5h5.6z' },
  // H15 Het staat niet in het rooster: the heli
  traumaduif: { fill: 'M8 10h6a5 4 0 0 1 0 8H8a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM14 11.4v3h2.4a2.6 1.5 0 0 0 0-3zM1.5 12H6v1.6H1.5zM1.5 9.5h1.6V12H1.5zM5 6.5h14v1.4H5zM11.3 7.9h1.4V10h-1.4zM9 18h1.3v2H9zM15 18h1.3v2H15zM7 20h11v1.4H7z' },
  // H16 Iedereen heeft een rode auto gezien: zoeken
  fjord: { fill: 'M10 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 2.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6zM14.9 16.5l1.6-1.6 5.3 5.3-1.6 1.6z' },
  // H17 Het bod viel tegen: eieren, breekbaar
  bod: { fill: 'M12 2.5c3.6 0 6.5 6 6.5 10.5a6.5 6.5 0 0 1-13 0C5.5 8.5 8.4 2.5 12 2.5zM9.4 7.6c-.9 1.4-1.4 3-1.5 4.4h1.6c.1-1.1.5-2.4 1.2-3.5z' },
  // H18 Ontzet, net als in 1672: the Gouden Eierbal on its trophy
  ontzet: { fill: 'M12 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM10 6a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8zM13.8 8.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6zM11 10.2a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4zM8 14.5h8l-1.6 3H9.6zM10.8 17.5h2.4v2h-2.4zM7.5 19.5h9v2h-9z' },
};

// M01 of the new story is Berend's bakkie again, with the stunts first
MISSION_ICONS.bakkiestunt = MISSION_ICONS.berend;
// act 2: M09 the sixty eggs (the egg of "Het bod"), M10 the quad against the tractor-limo (a car)
MISSION_ICONS.eieren = MISSION_ICONS.bod;
MISSION_ICONS.wierde = MISSION_ICONS.berend;

// Icon spec for a mission index (missions.js), or null.
function missionIcon(i) {
  return MISSION_ICONS[MISSION_IDS[i]] || null;
}

// Inline <svg> for the DOM (Te doen, phone, HUD card); '' for an unknown mission.
function missionIconSvg(i, cls = '') {
  const ic = missionIcon(i);
  if (!ic) return '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>` +
    (ic.fill ? `<path fill="currentColor" fill-rule="evenodd" d="${ic.fill}"/>` : '') +
    (ic.stroke ? `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="${ic.stroke}"/>` : '') +
    '</svg>';
}

// Inner SVG markup only (hudcards.js wraps it in its own <svg>).
export function missionIconInner(i) {
  const s = missionIconSvg(i);
  return s ? s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') : '';
}

const paths = new Map();
function path2d(d) {
  if (typeof Path2D === 'undefined') return null;
  let p = paths.get(d);
  if (!p) { p = new Path2D(d); paths.set(d, p); }
  return p;
}

// Draws mission i's icon centred on the canvas origin, `size` pixels wide.
export function drawMissionGlyph(ctx, i, size, color) {
  const ic = missionIcon(i);
  if (!ic) return false;
  ctx.save();
  ctx.scale(size / 24, size / 24);
  ctx.translate(-12, -12);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (ic.fill) { const p = path2d(ic.fill); if (p) ctx.fill(p, 'evenodd'); }
  if (ic.stroke) {
    const p = path2d(ic.stroke);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (p) ctx.stroke(p);
  }
  ctx.restore();
  return true;
}
