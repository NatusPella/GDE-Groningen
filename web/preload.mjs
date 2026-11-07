// #657: er zit geen bundler in node_modules (geen esbuild/rollup/vite) en een
// eigen één-bestandsbundel is hier niet veilig: 20 plekken gebruiken
// import.meta.url en 3 starten een worker via new URL(...), dus die paden
// breken zodra de modules in één bestand zitten. In plaats van een half
// gebouwde bundel genereren we de "import-map-bundel": één lijst
// modulepreload-hints voor alle modules, zodat de browser ze in één parallelle
// golf ophaalt i.p.v. via de ontdekkingswaterfall van 892 losse imports.
// Pure functies, zodat de lijst en de meting los te testen zijn.
export function modulePreloadTags(relFiles) {
  const out = [];
  const seen = new Set();
  for (const f of relFiles || []) {
    if (!/\.(js|mjs)$/.test(f)) continue;
    if (f === 'web.js' || f === 'sw.js' || seen.has(f)) continue;
    seen.add(f);
    out.push('<link rel="modulepreload" href="' + encodeURI(f) + '">');
  }
  return out;
}

// De meting: hoeveel modules en bytes gaan er in één golf mee (ontdubbeld).
export function preloadStats(relFiles, sizeOf = () => 0) {
  let files = 0, bytes = 0;
  const seen = new Set();
  for (const f of relFiles || []) {
    if (!/\.(js|mjs)$/.test(f) || f === 'web.js' || f === 'sw.js' || seen.has(f)) continue;
    seen.add(f);
    files++;
    try { bytes += sizeOf(f) || 0; } catch (e) { /* onbekend bestand */ }
  }
  return { files, bytes };
}
