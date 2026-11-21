// #657: er zit geen bundler in node_modules (geen esbuild/rollup/vite) en een
// eigen één-bestandsbundel is hier niet veilig: 20 plekken gebruiken
// import.meta.url en 3 starten een worker via new URL(...), dus die paden
// breken zodra de modules in één bestand zitten. In plaats van een half
// gebouwde bundel genereren we de "import-map-bundel": één lijst
// modulepreload-hints voor alle modules, zodat de browser ze in één parallelle
// golf ophaalt i.p.v. via de ontdekkingswaterfall van 892 losse imports.
// #757: ontwikkel-, QA- en trailerhulpen staan niet in die lijst; die worden
// alleen met een dev-URL, een trailer of een benchmark geladen. Pure functies,
// zodat de lijst en de meting los te testen zijn.

// let op: js/vehicle/trailer.js is de aanhangwagen van het spel, geen dev-hulp.
const DEV_ONLY = new Set([
  'js/trailer.js', 'js/trailerplan.js', 'js/trailerprops.js',
  'js/testmenu.js', 'js/testmenulogic.js', 'js/storytest.js', 'js/sfx/sfxtest.js',
  'js/cutpreview.js', 'js/cutpreviewui.js', 'js/worldbuilder.js', 'js/sfx/engineworklet.js',
]);
// #1072: alleen namen die op audit eindigen; de oude regel (…test…) hield ook skatestatus.js en padtest.js (beide vanuit het spel
// statisch geimporteerd) uit de lijst, zodat die via de waterval laadden (modulepreload_dekking_test)
const isDevOnly = (f) => DEV_ONLY.has(f) || /^js\/[^/]*audit\.js$/.test(f);

export function modulePreloadTags(relFiles) {
  const out = [];
  const seen = new Set();
  for (const f of relFiles || []) {
    if (!/\.(js|mjs)$/.test(f)) continue;
    if (f === 'web.js' || f === 'sw.js' || seen.has(f) || isDevOnly(f)) continue;
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
    if (!/\.(js|mjs)$/.test(f) || f === 'web.js' || f === 'sw.js' || seen.has(f) || isDevOnly(f)) continue;
    seen.add(f);
    files++;
    try { bytes += sizeOf(f) || 0; } catch (e) { /* onbekend bestand */ }
  }
  return { files, bytes };
}

// Zet de hints in een gestagede index.html, vlak vóór het module-script van main.js (desktop en web delen dit).
// `replacement` is wat er voor het main-script in de plaats komt (web: ook web.js); standaard blijft het script staan.
export function withModulePreload(page, relFiles, replacement = null) {
  const main = '<script type="module" src="js/main.js"></script>';
  if (!page.includes(main)) throw new Error('index.html: main.js script tag not found');
  const tags = modulePreloadTags(relFiles).join('\n');
  return page.replace(main, () => tags + '\n' + (replacement === null ? main : replacement));
}
