// Het uithangbord van een winkel (issue #156), de pure kant: waar het bord op de gevel komt,
// welke tekst en welke kleuren. shopsigns3d.js maakt er een vlak van. Geen THREE, geen DOM.

export const SIGN_H = 0.4;        // m hoog, in de bovenband van de winkelpui (0,5 m)
export const SIGN_MAX_W = 5.5;    // m breed
export const SIGN_OFF = 0.135;    // m voor de gevel (de band steekt 0,12 uit)

// Hoe lang een naam op een bord mag zijn; langere namen worden afgekapt op een woordgrens.
export function signText(name, max = 26) {
  const t = String(name || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  if (sp > Math.min(8, max / 2)) return cut.slice(0, sp).trim();
  // een smal bord: nooit een half woord ("SLAGE"), dan liever alleen de eerste woorden of een leeg bord
  if (max < 26) return sp > 0 ? cut.slice(0, sp).trim() : '';
  return cut.trim();
}

// Het canvas van het bord heeft dezelfde verhouding als het bord zelf (AI-tells 23-11): een vast canvas van 512 x 80 op een bord
// van 0,8 tot 5,5 m breed rekte de letters tot 2x uit of perste ze 3x samen, onleesbare tekst die je in één oogopslag ziet.
export const SIGN_PX = 80;        // canvashoogte in px
export const SIGN_CHAR_PX = 24;   // breedte van een hoofdletter in px (Bebas Neue, 50 px)
export function signCanvasW(w) {
  return Math.max(128, Math.min(1024, Math.round((SIGN_PX * w) / SIGN_H)));
}
// Hoeveel letters er op een bord van w meter passen zonder dat fillText ze samenperst.
export function signMaxChars(w) {
  return Math.max(3, Math.floor((signCanvasW(w) - 32) / SIGN_CHAR_PX));
}
// Hoeveel de letters uitgerekt (> 1) of samengeperst (< 1) zijn: canvasverhouding gedeeld door bordverhouding.
export function signStretch(cw, ch, w, h) {
  return (w / h) / (cw / ch);
}

// Alles wat het bord van een pui nodig heeft: plaats en maat, canvasbreedte en de tekst die erop past (shopsigns3d.js, de audit).
export function signFor(front, name) {
  const layout = signLayout(front);
  return { layout, cw: signCanvasW(layout.w), text: signText(name, Math.min(26, signMaxChars(layout.w))) };
}

// Lichte of donkere letters op de kleur van de band (hex 0xRRGGBB).
export function signColors(hex) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return { bg: '#' + (hex & 0xffffff).toString(16).padStart(6, '0'), fg: lum > 0.55 ? '#1b1b1b' : '#f6f1e4', accent: lum > 0.55 ? '#7a1f22' : '#f2c14a' };
}

// De plaats van het bord: front = { ax, ay, tx, ty, nx, ny, s0, s1, top } (de voorgevel van het pand).
// x, z: wereldplaats van het midden; y: hoogte; rotY: draait het vlak (voorkant +z) naar buiten; w, h: maat.
export function signLayout(front) {
  const s = (front.s0 + front.s1) / 2;
  const w = Math.max(0.8, Math.min(SIGN_MAX_W, front.s1 - front.s0 - 0.5));
  return {
    x: front.ax + front.tx * s + front.nx * SIGN_OFF,
    y: front.top + 0.25,
    z: front.ay + front.ty * s + front.ny * SIGN_OFF,
    rotY: Math.atan2(front.nx, front.ny),
    w, h: SIGN_H,
  };
}
