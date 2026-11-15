// De buurtgrenzen op de minikaart (#885): de lijnen lagen als losse blokjes op een
// raster dat met de speler meeschuift en trilden daardoor heen en weer. Hier testen we
// de pure regel uit mapborders.js: de segmenten liggen op een vast wereldraster, ze
// scheiden twee verschillende buurten en ze zijn gelijk in elk venster dat ze dekt.
//   node scripts/mapborders_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { borderSegments, BORDER_CELL } from '../game/js/mapborders.js';

let n = 0, fails = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { fails++; console.log('FAIL ' + naam + (extra ? ' :: ' + extra : '')); } };
const sleutel = (s) => s.map((q) => q.join(',')).sort().join('|');
const midden = (s) => [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2];

// Vier buurtpunten in een vierkant: de grenzen zijn twee rechte lijnen door het midden.
const punten = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 0, y: 200 }, { x: 200, y: 200 }];
{
  const seg = borderSegments(punten, -100, -100, 300, 300, BORDER_CELL);
  ok(seg.length > 10, 'er zijn grenslijnen', String(seg.length));
  ok(seg.every(([ax, ay, bx, by]) => (ax === bx || ay === by)), 'elk segment ligt horizontaal of verticaal');
  ok(seg.every(([ax, ay, bx, by]) => Math.abs((ax === bx ? by - ay : bx - ax)) === BORDER_CELL), 'elk segment is precies één cel lang');
  ok(seg.every(([ax, ay, bx, by]) => ax % (BORDER_CELL / 2) === 0 && ay % (BORDER_CELL / 2) === 0), 'de uiteinden liggen op het halve-celraster');
  ok(new Set(seg.map((q) => q.join(','))).size === seg.length, 'geen dubbel segment');
  // elk segment scheidt twee verschillende eigenaars: de celcentra aan weerszijden
  // horen bij een andere buurt (het segment ligt op de rand van die twee cellen)
  const dichtst = (x, y) => {
    let best = -1, bd = Infinity;
    punten.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  };
  let fout = 0;
  for (const [ax, ay, bx, by] of seg) {
    const [mx, my] = midden([ax, ay, bx, by]);
    const dx = ax === bx ? BORDER_CELL / 2 : 0, dy = ax === bx ? 0 : BORDER_CELL / 2;
    if (dichtst(mx - dx, my - dy) === dichtst(mx + dx, my + dy)) fout++;
  }
  ok(fout === 0, 'elk segment ligt echt tussen twee buurten', String(fout));
}

// Stabiliteit: een venster dat één cel opschuift levert in de overlap dezelfde lijnen.
// Dat is precies het trillen van #885 (de oude regel hing van de spelerscel af).
{
  const a = borderSegments(punten, 0, 0, 280, 280, BORDER_CELL);
  const b = borderSegments(punten, BORDER_CELL, 0, 280 + BORDER_CELL, 280, BORDER_CELL);
  const inOverlap = (s) => { const [mx, my] = midden(s); return mx >= BORDER_CELL && mx <= 280 && my >= 0 && my <= 280; };
  ok(sleutel(a.filter(inOverlap)) === sleutel(b.filter(inOverlap)), 'hetzelfde gebied geeft dezelfde lijnen, ook na opschuiven');
  const X = 2 * BORDER_CELL, Y = 3 * BORDER_CELL;
  const c = borderSegments(punten, X, Y, 280 + X, 280 + Y, BORDER_CELL);
  const inA = (s) => { const [mx, my] = midden(s); return mx >= X && mx <= 280 && my >= Y && my <= 280; };
  const inC = (s) => { const [mx, my] = midden(s); return mx >= X && mx <= 280 && my >= Y && my <= 280; };
  ok(sleutel(a.filter(inA)) === sleutel(c.filter(inC)), 'ook een sprong van twee/drie cellen blijft gelijk');
}

// Randgevallen: geen punten, een kapot venster of een onmogelijke celmaat geeft niets.
{
  assert.deepEqual(borderSegments([], 0, 0, 100, 100), []);
  assert.deepEqual(borderSegments(punten, NaN, 0, 100, 100), []);
  assert.deepEqual(borderSegments(punten, 100, 100, 0, 0), []);
  assert.deepEqual(borderSegments(punten, 0, 0, 100, 100, 0), []);
  assert.deepEqual(borderSegments(null, 0, 0, 100, 100), []);
  assert.doesNotThrow(() => borderSegments([{ x: NaN, y: 0 }, { x: 0, y: 0 }], 0, 0, 100, 100));
}

// De echte 66 buurtpunten van de stad: bij de Grote Markt levert elk venster dezelfde
// lijnen in de overlap, dus de lijn staat stil terwijl je loopt.
{
  const stad = JSON.parse(fs.readFileSync(new URL('../game/stad.json', import.meta.url), 'utf8'));
  const P = (stad.meta && stad.meta.neighbourhoodPoints) || [];
  ok(P.length >= 60, 'de echte buurtpunten zijn er', String(P.length));
  const cx = 213.8, cy = 10.2;
  const a = borderSegments(P, cx - 140, cy - 140, cx + 140, cy + 140, BORDER_CELL);
  const b = borderSegments(P, cx - 140 + BORDER_CELL, cy - 140, cx + 140 + BORDER_CELL, cy + 140, BORDER_CELL);
  const binnen = (s, x0, y0, x1, y1) => { const [mx, my] = midden(s); return mx >= x0 && mx <= x1 && my >= y0 && my <= y1; };
  ok(a.length > 0 && b.length > 0, 'de echte stad heeft buurtgrenzen', a.length + '/' + b.length);
  ok(sleutel(a.filter((s) => binnen(s, cx - 140 + BORDER_CELL, cy - 140, cx + 140, cy + 140))) === sleutel(b.filter((s) => binnen(s, cx - 140 + BORDER_CELL, cy - 140, cx + 140, cy + 140))), 'de echte buurtgrens staat stil bij het lopen');
}

// De haken: de minikaart gebruikt de regel echt en tekent geen losse blokjes meer.
{
  const hud = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
  ok(hud.includes("from './mapborders.js'") && hud.includes('borderSegments(points'), 'de minikaart vraagt de segmenten aan mapborders');
  ok(hud.includes('for (const [ax, ay, bx, by] of borderCache.lines)') && hud.includes('ctx.moveTo(ax, ay); ctx.lineTo(bx, by);'), 'de grens wordt als één doorlopend pad getekend');
  ok(!hud.includes('ctx.fillRect(rx, ry, cell * 0.5, cell * 0.5)'), 'de losse blokjes van de oude regel zijn weg');
  ok(hud.includes('borderCache.gx !== gx') && hud.includes('borderCache.gy !== gy'), 'de cache hangt aan het wereldraster, niet aan de spelerspositie');
  ok(hud.includes('const gx = Math.floor(player.x / cell)') && !hud.includes('const ox = Math.round(player.x / cell)'), 'het venster ligt op hele cellen');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
