// Beelden van de start van het spel (boot, keuzekaart Alleen of Samen, moeilijkheid, laadscherm) met een wegwerpprofiel zonder save.
// Draait als --perf-script met GDE_STARTKEUZE=vraag en GDE_MOEILIJKHEID=vraag (zie huidig_beeld.mjs / queue.sh).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const out = [];
const shot = async (name, wait = 600) => { await sleep(wait); console.log('[capture] ' + name); await sleep(900); out.push(name); };
const wacht = async (fn, max = 120) => { for (let i = 0; i < max; i++) { if (fn()) return true; await sleep(500); } return false; };
await sleep(1500);
if (document.querySelector('#loading')) await shot('S-boot', 300);
if (await wacht(() => document.querySelector('#online-start .sk-keuze'))) {
  await shot('S-keuzekaart', 1200);
  tap('1', 'Digit1');
  if (await wacht(() => document.querySelector('#online-start .sk-keuze') && document.querySelector('#online-start').textContent.includes('pittig'), 40)) {
    await shot('S-moeilijkheid', 1200);
    tap('2', 'Digit2');
  } else out.push('geen moeilijkheidskaart');
} else out.push('geen keuzekaart');
if (await wacht(() => document.querySelector('.ls.on'), 60)) await shot('S-laadscherm-nieuw', 1500); else out.push('geen laadscherm');
await wacht(() => document.body.classList.contains('game-started'), 120);
return JSON.stringify(out);
