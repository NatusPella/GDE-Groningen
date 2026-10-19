// Het titelscherm zoals een speler het ziet (#34, #92): geen spel starten, alleen schermafbeeldingen.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
await sleep(4000);
console.log('[capture] titel');
await sleep(800);
return ['klaar'];
