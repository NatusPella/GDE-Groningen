// LOD-niveaus met een dither-overgang (vettruck 23-11; eis van de eigenaar: elk model krijgt 2 tot 3 LOD-niveaus). Puur: geen
// three.js, geen DOM, zodat scripts/lodniveau_test.mjs elke regel zonder browser keurt. lod3d.js past het toe op meshes.
//
// Een LOD-opgave staat in het centrale register (propregister.js: PROP_REGISTER[id].lod, VOERTUIG_REGISTER[id].lod):
//   { grenzen: [g0, g1, ...], band, weg }
//   niveau 0 (het volle model) tot g0 m van de camera, niveau 1 tot g1, ... en het laatste niveau daarna;
//   band: de breedte (m) van de overgang rond elke grens: daarin staan beide niveaus er met een schermdeur-dither (aanvullende
//         patronen: elke pixel komt van precies één niveau), zodat er niets springt en er geen toestand nodig is;
//   weg:  (optioneel) voorbij deze afstand is het model weg, met dezelfde dither-band (kleine props); zonder weg blijft het
//         laatste niveau staan (een voertuig ruimt de wereld zelf op).
// Bedoeld als centrale vorm: een algemeen LOD-systeem (perf-ultra-23-11) kan deze opgave en lodKeuze overnemen.

export const LOD_BAND = 6; // m: de standaardbreedte van een overgang

// Controleert een opgave; null als hij klopt, anders de fout.
export function lodFout(lod) {
  if (!lod || !Array.isArray(lod.grenzen) || !lod.grenzen.length) return 'geen grenzen';
  const band = lod.band ?? LOD_BAND;
  if (!(band > 0)) return 'band moet positief zijn';
  const g = lod.weg != null ? [...lod.grenzen, lod.weg] : lod.grenzen;
  for (let i = 0; i < g.length; i++) {
    if (!Number.isFinite(g[i]) || g[i] <= band / 2) return `grens ${i} (${g[i]}) ligt binnen de halve band`;
    if (i && g[i] - g[i - 1] <= band) return `grens ${i} ligt minder dan een band na de vorige`;
  }
  return null;
}

// Welk niveau op afstand d: { a, b, t }. a is het niveau dat er staat (of uitdooft), b het niveau dat erbij komt (-1: geen,
// bij `weg` is dat "niets"), t in [0, 1] hoe ver de overgang is. Buiten een band: b = -1 en t = 0. a = -1: het model is weg.
export function lodKeuze(d, lod) {
  const g = lod.grenzen, band = lod.band ?? LOD_BAND, h = band / 2;
  const n = g.length; // er zijn n + 1 niveaus: 0..n
  if (!Number.isFinite(d) || d < 0) d = 0;
  for (let i = 0; i < n; i++) {
    if (d < g[i] - h) return { a: i, b: -1, t: 0 };
    if (d <= g[i] + h) return { a: i, b: i + 1, t: (d - (g[i] - h)) / band };
  }
  if (lod.weg != null) {
    if (d < lod.weg - h) return { a: n, b: -1, t: 0 };
    if (d <= lod.weg + h) return { a: n, b: -1, t: (d - (lod.weg - h)) / band, weg: true };
    return { a: -1, b: -1, t: 0, weg: true };
  }
  return { a: n, b: -1, t: 0 };
}

// De dither per niveau voor een keuze: Map niveau -> { keep, aanvul }. keep is de drempel k in [0, 1]; het uitdovende niveau
// houdt de pixels met bayer < k, het inkomende (aanvul = true) de pixels met bayer >= k. Een niveau dat niet in de map staat,
// is onzichtbaar. Samen dekken a en b elke pixel precies één keer.
export function lodDither(keuze) {
  const uit = new Map();
  if (keuze.a < 0) return uit;
  const k = 1 - keuze.t;
  uit.set(keuze.a, { keep: k, aanvul: false });
  if (keuze.b >= 0) uit.set(keuze.b, { keep: k, aanvul: true });
  return uit;
}

// Hoeveel niveaus een opgave heeft (grenzen + 1).
export const lodNiveaus = (lod) => (lod && lod.grenzen ? lod.grenzen.length + 1 : 1);
