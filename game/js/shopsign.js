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
  return (sp > 8 ? cut.slice(0, sp) : cut).trim();
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
