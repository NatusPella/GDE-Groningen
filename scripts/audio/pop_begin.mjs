// Pop aan het begin van een clip (21-11, eigenaar: "de foute clips beginnen vaak met een rare pop"). Gemeten op de gemelde clips: na
// een stuk digitale stilte komt op ca. 40 ms een losse klik van ca. 5 ms met een piek van -2 tot -7 dBFS, direct gevolgd door
// -35 tot -60 dB (de stem begint daarna pas zacht of later). Geen fade-in: de klik staat los van wat erna komt. Een gewone inzet
// van een woord stijgt geleidelijk of de stem blijft luid. Puur: werkt op een Float32Array.
//   popBegin(x, sr) -> { pop, piekDb, tegenDb, vanMs }
export const POP = { blokS: 0.005, zoekS: 0.08, minPiekDb: -15, minTegenDb: 15, naBlokken: [2, 6] };

const db = (v) => 20 * Math.log10(v + 1e-9);
export function popBegin(x, sr) {
  const B = Math.max(1, Math.floor(sr * POP.blokS)), nz = Math.ceil(POP.zoekS / POP.blokS);
  const blok = [];
  for (let i = 0; i < nz + POP.naBlokken[1] + 1; i++) {
    let pk = 0; for (let j = 0; j < B && i * B + j < x.length; j++) pk = Math.max(pk, Math.abs(x[i * B + j]));
    blok.push(db(pk));
  }
  let m = 0; for (let i = 1; i < nz; i++) if (blok[i] > blok[m]) m = i;
  const piekDb = blok[m];
  // het luidste blok in de eerste 80 ms tegenover het luidste blok 10 tot 30 ms later
  let na = -200; for (let k = m + POP.naBlokken[0]; k <= m + POP.naBlokken[1] && k < blok.length; k++) na = Math.max(na, blok[k]);
  const tegenDb = piekDb - na;
  const pop = piekDb > POP.minPiekDb && tegenDb >= POP.minTegenDb;
  return { pop, piekDb: +piekDb.toFixed(1), tegenDb: +Math.min(tegenDb, 200).toFixed(1), vanMs: +(m * POP.blokS * 1000).toFixed(0) };
}
