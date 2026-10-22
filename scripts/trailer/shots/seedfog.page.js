// Zet een verkende kaart klaar zoals een speler hem na een paar uur spelen zou hebben: gebieden rond het centrum, de eerste missies en de route
// ertussen zijn "verkend" (mist weg). Schrijft de mistkaart van het spel (mapview.js, zelfde formaat) in de opslag van het wegwerpprofiel;
// herstart het spel daarna (repl_boot.mjs) zodat de kaart hem inleest.

const w = window.__debug.world;
const [minx, miny, maxx, maxy] = w.map.meta.bounds;
const CELL = 50;
const W = Math.ceil((maxx - minx) / CELL), H = Math.ceil((maxy - miny) / CELL);
const bits = new Uint8Array(Math.ceil((W * H) / 8));
const reveal = (x, y, r) => {
  const cx = (x - minx) / CELL, cy = (y - miny) / CELL, rc = r / CELL;
  for (let j = Math.max(0, Math.floor(cy - rc)); j <= Math.min(H - 1, Math.ceil(cy + rc)); j++) for (let i = Math.max(0, Math.floor(cx - rc)); i <= Math.min(W - 1, Math.ceil(cx + rc)); i++) {
    if ((i - cx) ** 2 + (j - cy) ** 2 > rc * rc) continue;
    const k = j * W + i; bits[k >> 3] |= 1 << (k & 7);
  }
};
const args = window.__args || {};
for (const [x, y, r] of (args.discs || [[110, 70, 1200], [250, -330, 700], [-300, 100, 600], [-1280, -1070, 900], [300, 120, 400], [600, 200, 400], [900, 300, 500]])) reveal(x, y, r);
let bin = '';
for (let i = 0; i < bits.length; i++) bin += String.fromCharCode(bits[i]);
const key = 'gde-fog';
const val = `${W}x${H}:${btoa(bin)}`;
localStorage.setItem(key, val);
// het spel schrijft zijn eigen mist weg bij het herladen (beforeunload): onze schrijfactie komt als laatste
window.addEventListener('beforeunload', () => localStorage.setItem(key, val));
let n = 0; for (let k = 0; k < W * H; k++) if (bits[k >> 3] & (1 << (k & 7))) n++;
return JSON.stringify({ key, W, H, ratio: +(n / (W * H)).toFixed(3) });
