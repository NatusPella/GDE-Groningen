// De volgcam op drie schermformaten (#502): 360x800 (telefoon staand),
// 800x360 (telefoon liggend) en 1920x1080 (bureaublad). Wat deze test vastlegt:
//   1. de verhouding komt uit innerWidth/innerHeight, maar nooit onbruikbaar
//      (0, NaN, oneindig) - dat maakte de projectie één beeld lang kapot;
//   2. de kijkhoek is de VERTICALE hoek en blijft op elk formaat gelijk;
//   3. de volgplek is op elk formaat dezelfde: achter de speler en boven de
//      grond, dus geen "onder het maaiveld" bij een breed beeld;
//   4. in een voertuig staat de camera buiten de auto (achter de bumper, boven
//      het dak), ook als de camera nog op een oude plek hing: dan een harde
//      snee in plaats van een glijvlucht door de gevels.
// De getallen komen uit de gemeten beelden van de mobiele beeldronde (#463):
// de camera hing daar op het laatste titelbeeld 1,6 km verderop, 0,59 m boven de
// kale kaart, en gleed van daar naar de speler.
//   node scripts/camera_mobiel_test.mjs
import { cameraAspect, cameraVerticalFov, followCameraPose, cameraSnapNeeded, pitchForMouse, CAMERA_SNAP_GAP, DEFAULT_PITCH, PITCH_MIN_DEG, PITCH_MAX_DEG } from '../game/js/cameraplan.js';
import fs from 'node:fs';

let n = 0, bad = 0;
const ok = (c, name, extra) => {
  n++;
  if (!c) { bad++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); }
};
const near = (a, b, eps) => Math.abs(a - b) <= eps;

const SCHERMEN = [[360, 800], [800, 360], [1920, 1080]];
const FOV = 64; // Instellingen > Beeld (settings.js), als verticale hoek

// Dezelfde spelerstand op elk scherm: op de Grote Markt, kijkend naar het
// noorden, met de standaardbaan (ORBIT_RADIUS x cameraDistance) en de laagste
// kijkhoek die de camera kent (10 graden, wat een aanraakscherm krijgt omdat
// er geen muishoogte is).
const SPELER = { x: 100, y: 77, ground: 0, eye: 1.3, angle: 0, pitch: 10 * Math.PI / 180, radius: Math.hypot(2.6, 2.6) };

const uitkomsten = [];
for (const [w, h] of SCHERMEN) {
  const tag = `${w}x${h}`;
  const aspect = cameraAspect(w, h);
  ok(near(aspect, w / h, 1e-9), `${tag}: verhouding is breedte/hoogte`, aspect);
  ok(Number.isFinite(aspect) && aspect > 0, `${tag}: verhouding is bruikbaar`, aspect);

  // de verticale kijkhoek is van het scherm onafhankelijk
  const fov = cameraVerticalFov(FOV);
  ok(fov === FOV, `${tag}: verticale kijkhoek blijft ${FOV}`, fov);

  const pose = followCameraPose({ x: SPELER.x, y: SPELER.y, eye: SPELER.ground + SPELER.eye, angle: SPELER.angle, pitch: SPELER.pitch, radius: SPELER.radius });
  // boven de grond: het oog zit al 1,3 m boven de grond en de baan komt daar
  // sin(10) x 3,68 = 0,64 m bij
  ok(pose.y > SPELER.ground + 1.5, `${tag}: camera boven de grond`, pose.y);
  ok(pose.y > SPELER.ground + SPELER.eye, `${tag}: camera boven het oog van de speler`, pose.y);
  // achter de speler: de kijkrichting is (cos angle, sin angle); het teken van
  // het inwendig product van speler->camera met die richting moet negatief zijn
  const bx = pose.x - SPELER.x, bz = pose.z - SPELER.y;
  const mee = (bx * Math.cos(SPELER.angle) + bz * Math.sin(SPELER.angle)) / (Math.hypot(bx, bz) || 1);
  ok(mee < -0.5, `${tag}: camera staat achter de speler`, mee);
  // dezelfde afstand en hoogte als op de andere schermen (los van de verhouding)
  ok(near(Math.hypot(bx, bz), Math.cos(SPELER.pitch) * SPELER.radius, 1e-9), `${tag}: afstand uit de baan`, Math.hypot(bx, bz));
  uitkomsten.push({ tag, aspect, fov, pose });
}
for (const u of uitkomsten) {
  const a = uitkomsten[0];
  ok(near(u.pose.x, a.pose.x, 1e-9) && near(u.pose.y, a.pose.y, 1e-9) && near(u.pose.z, a.pose.z, 1e-9),
    `${u.tag}: zelfde camerastand als ${a.tag} (verhouding doet niet mee)`, u.pose);
}

// Een camera die nog op zijn oude plek hangt, moet een harde snee krijgen. Het
// gemeten titelbeeld van de beeldronde: 1,6 km verderop, 0,59 m boven de kaart.
const titelbeeld = { x: -1268.587, y: 0.587, z: -1059.618 };
const volg = followCameraPose({ x: SPELER.x, y: SPELER.y, eye: SPELER.ground + SPELER.eye, angle: SPELER.angle, pitch: SPELER.pitch, radius: SPELER.radius });
ok(cameraSnapNeeded(titelbeeld, volg), 'camera op het titelbeeld: harde snee naar de speler');
ok(cameraSnapNeeded(null, volg), 'eerste beeld van een partij: harde snee');
ok(!cameraSnapNeeded(volg, volg), 'camera op de volgplek: geen snee');
// een camera die een beeld achterloopt (25 m/s bij 6/s is 4 m) blijft gewoon glijden
ok(!cameraSnapNeeded({ x: volg.x + 4, y: volg.y, z: volg.z }, volg), 'camera 4 m achter: geen snee');
ok(CAMERA_SNAP_GAP > 20, 'snee pas voorbij de grootste baan (helikopter 16 m)', CAMERA_SNAP_GAP);
// een verhouding die de browser even niet kan geven, houdt de vorige aan
const vorige = cameraAspect(800, 360);
ok(cameraAspect(800, 0, vorige) === vorige, 'hoogte 0 (draaien/adresbalk): vorige verhouding blijft');
ok(cameraAspect(0, 0, vorige) === vorige, 'breedte en hoogte 0: vorige verhouding blijft');
ok(cameraAspect(NaN, 360, vorige) === vorige, 'NaN als breedte: vorige verhouding blijft');
ok(near(cameraAspect(800, 0), 16 / 9, 1e-9), 'zonder vorige verhouding: 16:9 als terugval');
ok(cameraVerticalFov(NaN) === 64 && cameraVerticalFov(0) === 40 && cameraVerticalFov(500) === 80, 'kijkhoek blijft binnen 40..80 graden');

// In een voertuig: de camera hoort buiten de auto te staan, ook als er een gevel
// naast staat. De baan groeit mee met de lengte van het voertuig (scene3d.js:
// camScale), dus reken de personenauto (4,4 m) en de bus (12 m + aanhanger) na.
for (const [naam, len, wid, dak] of [['personenauto', 4.4, 1.8, 1.5], ['bus', 12, 2.5, 3.1]]) {
  const scale = Math.min(3.2, Math.max(1.35, len / 2.4));
  const radius = Math.hypot(2.6, 2.6) * scale;
  const eye = 1.3 + (scale - 1) * 0.55;
  const p = followCameraPose({ x: SPELER.x, y: SPELER.y, eye, angle: SPELER.angle, pitch: SPELER.pitch, radius });
  ok(p.y > dak + 0.5, `${naam}: camera boven het dak`, { hoogte: p.y, dak });
  // achter de achterbumper: het midden van de auto is (100, 77), de kont staat
  // op len/2 achter dat punt
  const achter = Math.hypot(p.x - SPELER.x, p.z - SPELER.y);
  ok(achter > len / 2 + 1, `${naam}: camera achter de auto, niet erin`, { afstand: achter, half: len / 2 });
  ok(Math.abs(p.y - (eye + Math.sin(SPELER.pitch) * radius)) < 1e-9, `${naam}: hoogte uit de baan`);
}

// De kijkhoek kwam op een telefoon uit de cursorpositie gedeeld door de
// schermhoogte: dezelfde pixel gaf op 360 px hoog een andere hoek dan op
// 800 px, en daarmee een andere camerahoogte. Zonder muis hoort de hoek vast
// te staan, en die vaste stand moet op elk formaat dezelfde zijn.
const graden = (rad) => rad * 180 / Math.PI;
ok(near(graden(pitchForMouse(NaN)), 23.4, 0.1), 'zonder muis: vaste volgstand (23,4 graden)', graden(pitchForMouse(NaN)));
ok(pitchForMouse(NaN) === DEFAULT_PITCH, 'zonder muis: DEFAULT_PITCH');
ok(near(graden(pitchForMouse(0)), PITCH_MIN_DEG, 1e-9) && near(graden(pitchForMouse(1)), PITCH_MAX_DEG, 1e-9), 'met muis: bovenin 10, onderin 52 graden');
ok(near(pitchForMouse(-5), pitchForMouse(0), 1e-12) && near(pitchForMouse(99), pitchForMouse(1), 1e-12), 'met muis: hoek blijft tussen 10 en 52 graden');
for (const [w, h] of SCHERMEN) {
  const pose = followCameraPose({ x: SPELER.x, y: SPELER.y, eye: SPELER.ground + SPELER.eye, angle: SPELER.angle, pitch: pitchForMouse(NaN), radius: SPELER.radius });
  ok(pose.y > SPELER.ground + 2, `${w}x${h}: telefoonhoogte uit de vaste stand`, pose.y);
  ok(near(pose.y, followCameraPose({ x: SPELER.x, y: SPELER.y, eye: SPELER.ground + SPELER.eye, angle: SPELER.angle, pitch: DEFAULT_PITCH, radius: SPELER.radius }).y, 1e-9),
    `${w}x${h}: dezelfde hoogte als op de andere schermen`);
}

// De bedrading: scene3d.js moet deze regels ook echt gebruiken. Een camera die
// zijn verhouding weer zelf uitrekent (innerWidth / innerHeight) of zijn plek
// zelf uitrekent, valt hier door de mand - dat is precies hoe #502 ontstond.
const bron = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
ok(!/innerWidth\s*\/\s*innerHeight/.test(bron), 'scene3d.js rekent de verhouding niet zelf uit');
ok(/cameraAspect\(innerWidth, innerHeight/.test(bron), 'scene3d.js haalt de verhouding uit cameraplan.js');
ok(/followCameraPose\(/.test(bron) && /cameraSnapNeeded\(/.test(bron), 'scene3d.js gebruikt de volgplek en de harde snee');
ok(/cameraVerticalFov\(/.test(bron), 'scene3d.js zet de verticale kijkhoek via cameraplan.js');
ok(/pitchForMouse\(/.test(bron) && /touch-play/.test(bron), 'scene3d.js haalt de kijkhoek zonder muis niet uit de cursor');
ok(!/PITCH_MIN_DEG \+ \(PITCH_MAX_DEG/.test(bron), 'scene3d.js rekent de kijkhoek niet zelf uit de schermhoogte');

console.log(bad ? `camera_mobiel_test: ${bad} van ${n} checks rood` : `camera_mobiel_test: ${n} checks groen`);
process.exit(bad ? 1 : 0);
