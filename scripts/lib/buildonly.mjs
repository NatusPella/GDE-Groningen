// Modules in game/js die het spel zelf nooit laadt (alleen bouwscripts en tests): ze
// worden niet in de app- en webbouw meegeleverd (desktop/build.mjs). #103
// De lijst wordt bewaakt door scripts/buildonly_test.mjs tegen scripts/dead_code.mjs.
export const BUILD_ONLY = [
  'builderhooks.js', // wereldbouwer-haken (greenery, meubilair) voor build_corridor/build_province
  'buildingheights.js', // hoogteketen 3dbag > osm > default, alleen in de tegelbouw
  'worldbuilder.js', // de tegelbouwer zelf
  'floatingorigin.js', // zwevende oorsprong, nog niet aangesloten
  'marinas.js', // jachthavenplanner; het spel leest alleen marinas.json
  'padscreens.js',
  'randaudit.js', 'streekaudit.js', 'terrainaudit.js', // wereldaudits (scripts/world)
  'vehicleregister.js', // register dat alleen een test en cutscene-audit lezen
];
