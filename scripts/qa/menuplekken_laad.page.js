// Paginascript van menuplekken_shots.mjs --meet: hoe lang het hoofdmenu over het laden doet (de laadmarkeringen en de poort).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ss = document.getElementById('start-screen');
for (let i = 0; i < 480 && !(ss && ss.classList.contains('visible')); i++) await sleep(250);
await sleep(1500);
return JSON.stringify({ start: { marks: window.__loadMarks || null, poort: window.__menuGate ? window.__menuGate() : null, hang_ms: window.__menuHang ? window.__menuHang() : null, eerste: window.__menuBeeld || null }, beelden: [{ naam: 'meting' }] });
