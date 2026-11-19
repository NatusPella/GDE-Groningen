// Page half of scripts/qa/bouwsteen_regelkaart_beeld.mjs (desktop --perf-script body). Toont in het echte spel de
// kaartjes van de regelkaart (doel met tijdsdruk en afloop, en elke regeltype), één tegelijk, via dezelfde showCard
// als de runner. Raakt geen spelstaat, geen missie en geen echte opslag. Beoordeel: leesbaar binnen het kaartbudget,
// icoon naast de zin, niet twee kaartjes tegelijk.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const K = await import('/js/regelkaart.js');
const out = { fouten: [], standen: 0 };
const world = window.__debug && window.__debug.world;
const STAPPEN = {
  eierrit: { kaart: { doel: 'Breng de eieren heel naar de bakker', druk: 'drie minuten', afloop: 'alle eieren stuk: opnieuw', regels: [
    { type: 'limiet', inv: { waarde: 38, limiet: 40, label: 'Snelheid' } },
    { type: 'voorraad', inv: { heel: 42, totaal: 60, icoon: 'ei', label: 'Eieren' } },
    { type: 'teller', inv: { rest: 40, totaal: 180, label: 'Tijd' } } ] } },
  mix: { kaart: { doel: 'Houd de maat', regels: [
    { type: 'toets', inv: { toetsen: ['A', 'D'], handeling: 'houd', label: 'Klimmen' } },
    { type: 'timing', inv: { naald: 0.5, van: 0.42, tot: 0.58 }, label: 'Raak de zone' },
    { type: 'wijzer', inv: { afstand: 120, hoek: -1.2, label: 'Doel' } } ] } },
};
for (const [naam, stap] of Object.entries(STAPPEN)) {
  const staat = K.startKaart(stap, `beeld:${naam}`);
  if (!staat) { out.fouten.push(`${naam}: geen kaart`); continue; }
  for (let i = 0; i < 40 && !staat.klaar; i++) {
    const spec = K.toonRegelkaart(world, staat, 0.5);
    if (spec) { out.standen++; await sleep(1200); console.log(`[capture] regelkaart-${naam}-${spec.key.split('-').pop()}`); await sleep(400); }
    staat.t += 0.5; // de seconden die de kaart nodig heeft, zonder echt te wachten
  }
  if (!staat.klaar) out.fouten.push(`${naam}: kaart werd niet klaar`);
}
console.log(`[regelkaart] kaartjes ${out.standen}, fouten ${out.fouten.length}`);
return JSON.stringify({ results: { regelkaart: out } });
