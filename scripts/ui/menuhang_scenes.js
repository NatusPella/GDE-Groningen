// Meet de hang van het hoofdmenu (#226): hoe lang is de langste frame in de 4 s nadat het menu verscheen,
// en hoe lang duurde het laadscherm? node scripts/ui_shots.mjs --scenes=scripts/ui/menuhang_scenes.js --out=<map>
// Draait zonder spel te starten. Een oudere bouw heeft geen __menuHang: dan meet deze scene zelf met rAF.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
let maxGap = 0, last = 0, on = false;
const tick = (t) => { if (on && last) maxGap = Math.max(maxGap, t - last); last = t; requestAnimationFrame(tick); };
requestAnimationFrame(tick);
let t0 = performance.now();
for (let i = 0; i < 600 && !document.querySelector('#start-screen.visible'); i++) await sleep(100);
const shownAt = Math.round(performance.now());
on = true;
await sleep(4500);
console.log('[capture] menu');
await sleep(500);
return [`menu zichtbaar na ${shownAt} ms; langste rAF-gat in de 4 s erna: ${Math.round(maxGap)} ms; poort: ${window.__menuGate ? JSON.stringify(window.__menuGate()) : 'n.v.t.'}; marks: ${JSON.stringify(window.__loadMarks)}`];
