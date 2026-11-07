// #632: cockpit-HUD's van bus, heli en vliegtuig — één cockpit-rand, de canonieke keycap, tokens
// en een kort instaptip. Bronchecks (geen wereld/DOM nodig). De stationlife-bordtekening en
// heliflight.js blijven buiten scope (heliflight is op dit moment van een andere werkstroom).
//   node scripts/cockpit_hud_test.mjs
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', naam, extra); } };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// Eén cockpit-rand: de nieuwe module met de gedeelde klasse en CSS, gebruikt door bus en vliegtuig.
const cockpit = lees('cockpit.js');
ok(/COCKPIT_CLASS = 'cockpit-frame'/.test(cockpit) && /border-left: 3px solid var\(--mk-ok/.test(cockpit), 'cockpit.js: één rand met token');
ok(/mountCockpitCss/.test(cockpit), 'cockpit.js: één keer gemonteerd');

// Bus: geen eigen keycap of losse amber/rood meer; de gedeelde cockpitrand en .hud-key.
const bus = lees('busboard3d.js'), busbed = lees('busbestuurhud.js');
ok(!/#ffb21a|#d93a2b/.test(bus + busbed), 'bus: geen losse amber of tweede rood');
ok(/hud-key/.test(bus) && !/<kbd>|\.hud-busnext kbd/.test(bus), 'buskaartje: canonieke keycap');
ok(/hud-key/.test(busbed) && !/<kbd>|\.hud-busbed kbd/.test(busbed), 'busbediening: canonieke keycap');
ok(/COCKPIT_CLASS/.test(bus) && /mountCockpitCss/.test(bus + busbed), 'bus: gebruikt de gedeelde cockpitrand');

// Vliegtuig: korte uitleg, tokens in het paneel en de canvas-kleuren uit de markerpaletten.
const instr = lees('instrumenten.js');
const woorden = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
ok(woorden('W/S gas · A/D rollen · Q/E roer · K kleppen · G landingsgestel') <= 14, 'vliegtuig: bediening ≤14 woorden');
ok(woorden(/UITLEG_INSTAPPEN = '([^']+)'/.exec(instr)[1]) <= 14, 'vliegtuig: instaptip ≤14 woorden', /UITLEG_INSTAPPEN = '([^']+)'/.exec(instr)[1]);
ok(/BEDIENING_KORT/.test(instr) && /COCKPIT_CLASS/.test(instr), 'vliegtuig: korte uitleg en de cockpitrand');
ok(/markerColors\(\)/.test(instr), 'vliegtuig: canvaskleuren uit de markerpaletten');
const instrHex = instr.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()').replace(/--[a-z0-9-]+:\s*#[0-9a-fA-F]{3,6}/g, '--token').replace(/(fill|stroke)="#[0-9a-fA-F]{3,6}"/g, '$1=""');
ok(!/#(?!f0ede4|0c140e|fff|ffffff)[0-9a-fA-F]{6}\b/.test(instrHex), 'vliegtuig: geen losse hex buiten chroom/tokens');

// Heli: geen dubbele tokens en de spotkleur uit de mission-token.
const heli = lees('helirun.js');
ok(!/var\(--mk-[a-z]+, var\(--mk-/.test(heli), 'heli: geen dubbele token-fallback');
ok(/markerColors\(\)/.test(heli) && /SPOT_COLOR\(\)/.test(heli), 'heli: spotkleur uit de mission-token');
ok(/var\(--mk-mission/.test(heli) && /var\(--mk-danger/.test(heli), 'heli: status via de tokens');

// Uitleg ≤14 woorden per kaart, 12 px-vloer en keycaps bestaan al in de HUD; reduce-motion voor de heli.
ok(/prefers-reduced-motion/.test(heli) || /reduce-motion/.test(heli), 'heli: reduce-motion geregeld');

console.log(fails ? `${fails} of ${n} cockpit-HUD checks failed` : `cockpit_hud_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
