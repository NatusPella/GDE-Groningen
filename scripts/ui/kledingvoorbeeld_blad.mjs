// Contactblad van de kledingvoorbeelden (zonder Electron: software-renderer, scripts/lib/stuk_png.mjs). Tekent per stuk (of set) wat de
// Spullen-tegel zou tonen, zodat je zelf naar de voorbeelden kunt kijken.
//   node scripts/ui/kledingvoorbeeld_blad.mjs [--uit=docs/beeld-22-11/spullen-kleding] [--bladen=6] [--hoek=0.6]
//   node scripts/ui/kledingvoorbeeld_blad.mjs --stukken=jack.blauw,jeans.nachtblauw --naam=proef   (eigen keuze, een blad)
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pngVan, driehoeken, teken, plak, tekst } from '../lib/stuk_png.mjs';

const arg = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const THREE = await import('three');
const CP = await import('../../game/js/clothingpreview.js');
const D = await import('../../game/js/clothingdata.js');
const SP = await import('../../game/js/spullen3d.js');

const TW = 224, TH = 168, COLS = 4, ROWS = 4;
const hoek = Number(arg.hoek ?? 0.6);
const uit = String(arg.uit || 'docs/beeld-22-11/spullen-kleding');

// bg-tint zoals de tegel hem krijgt (spullen3d.js tintVoor), over de donkere paneelkleur
function tegelBeeld(spec, tint) {
  const o = CP.buildClothingPreview(spec);
  if (!o) return null;
  CP.turnPreview(o.mesh, hoek);
  const tris = driehoeken(THREE, o.mesh);
  const bg = [34, 40, 52];
  if (tint) { const [r, g, b, a] = tint; for (let k = 0; k < 3; k++) bg[k] = Math.round(bg[k] * (1 - a) + [r, g, b][k] * a); }
  return teken(tris, TW, TH, { c: [o.fit.c.x, o.fit.c.y, o.fit.c.z], r: o.fit.r }, { bg });
}
const rgba = (css) => { const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(css); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] : null; };

const lijst = [];
if (arg.stukken) for (const p of String(arg.stukken).split(',')) lijst.push({ spec: { kind: 'piece', piece: p }, hex: D.parsePiece(p).hex });
else {
  for (const it of D.ITEMS) { const p = `${it.id}.${it.colors[0]}`; lijst.push({ spec: SP.stukSpec(p), hex: D.parsePiece(p).hex }); }
  for (const s of [...D.SETS.filter((x) => x.char === 'tammo'), ...D.LOOKS]) lijst.push({ spec: SP.setSpec(s.pieces), hex: D.parsePiece(s.pieces[0]).hex });
  for (const [s, c] of [['short', 'naturel'], ['curly', 'naturel'], ['bob', 'naturel'], ['long', 'naturel']]) lijst.push({ spec: SP.haarSpec(`${s}.${c}`, 'anita'), hex: 0x5a3d26 });
}
const perBlad = COLS * ROWS;
const bladen = Math.min(Number(arg.bladen || 6), Math.ceil(lijst.length / perBlad));
fs.mkdirSync(uit, { recursive: true });
let n = 0;
for (let b = 0; b < bladen; b++) {
  const GW = TW * COLS, GH = TH * ROWS;
  const img = Buffer.alloc(GW * GH * 3, 20);
  for (let i = 0; i < perBlad; i++) {
    const it = lijst[b * perBlad + i];
    if (!it) break;
    const t = tegelBeeld(it.spec, rgba(SP.tintVoor(it.hex)));
    if (!t) { console.log('geen voorbeeld voor', JSON.stringify(it.spec)); continue; }
    plak(img, GW, t, TW, TH, (i % COLS) * TW, Math.floor(i / COLS) * TH);
    tekst(img, GW, (i % COLS) * TW + 5, Math.floor(i / COLS) * TH + 5, String(b * perBlad + i + 1));
    n++;
  }
  const naam = arg.naam ? `${arg.naam}.png` : `blad-${b + 1}.png`;
  fs.writeFileSync(path.join(uit, naam), pngVan(GW, GH, img));
}
console.log(`${n} voorbeelden getekend in ${bladen} blad(en) in ${uit}`);
