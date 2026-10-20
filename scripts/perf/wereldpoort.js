// Poort "zwarte wereld / consolefouten per frame" (desktop --perf-script, zie test_all.mjs stap wereldpoort).
// Draait ~120 frames na de start van een spel en telt per frame de consolefouten en scriptfouten, kijkt of de
// scène echt iets tekent (zichtbare meshes, driehoeken, drawcalls) en maakt een beeld voor de pixelcheck.
// Geeft een JSON-tekst terug; test_all.mjs oordeelt erover met beoordeelWereldpoort (lib/testrapport.mjs).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const FRAMES = 120;
const fouten = [];
const origError = console.error;
console.error = (...a) => { fouten.push(a.map((x) => (x && x.message) || String(x)).join(' ').slice(0, 200)); origError.apply(console, a); };
const opFout = (e) => fouten.push('window.onerror: ' + String((e && (e.message || (e.reason && e.reason.message))) || e).slice(0, 200));
window.addEventListener('error', opFout);
window.addEventListener('unhandledrejection', opFout);

for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) await sleep(500);
const gestart = document.body.classList.contains('game-started');
await sleep(4000); // laat de wereld rond de speler laden

const sc = window.__scene3d;
const frames = [];
let vorig = fouten.length;
await new Promise((res) => {
  let n = 0;
  const stap = () => {
    frames.push(fouten.length - vorig); vorig = fouten.length;
    if (++n >= FRAMES) res(); else requestAnimationFrame(stap);
  };
  requestAnimationFrame(stap);
});

let meshes = 0, nan = 0;
if (sc && sc.scene) {
  sc.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.visible) return;
    const pos = o.geometry.attributes && o.geometry.attributes.position;
    if (!pos) return;
    meshes++;
    const a = pos.array;
    for (let i = 0; i < a.length; i += 7) if (a[i] !== a[i]) { nan++; break; }
  });
}
const info = sc && sc.renderer && sc.renderer.info && sc.renderer.info.render;
const metFout = frames.filter((x) => x > 0).length;
console.log('[capture] wereld');
await sleep(1500);
console.error = origError;
return JSON.stringify({
  gestart, scene: !!(sc && sc.scene), meshes, nan,
  tris: info ? info.triangles : null, calls: info ? info.calls : null,
  frames: frames.length, framesMetFout: metFout, foutenTotaal: frames.reduce((s, x) => s + x, 0),
  voorbeeld: [...new Set(fouten)].slice(0, 5),
});
