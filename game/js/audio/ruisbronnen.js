// Het register van de ruisbronnen (21-11, melding eigenaar: "soms hoor ik een white noise in game"). Twee soorten ruis die niet
// weg mogen blijven: (1) een doorlopende lus (wind, regen, motorlaag, banden, rotor) waarvan de gain bij een gestopte of
// vastgelopen update op de laatste stand blijft staan, en (2) een lus die bij herstart niet wordt opgeruimd, zodat er meer
// tegelijk klinken dan bedoeld. Dit register
//   - telt de levende lussen per naam (volg) en meldt een stapeling boven het maximum;
//   - bewaakt de gain van een doorlopende ruisstem (bewaak): hoort hij uit te zijn, maar staat hij na twee controles nog
//     hoorbaar open, dan zet controleer() hem op nul en telt het;
//   - maakt een berekende waarde veilig (schoon): een NaN of Infinity in een gain blijft voor altijd hangen, want de
//     volgende stap rekent verder met NaN en setTargetAtTime gooit.
// Puur: geen import van audio.js, draait ook in Node (scripts/audio/ruisbronnen_test.mjs).

export const RUIS_GRENS = 0.004;     // een gain boven dit is hoorbaar; een uitfade van tau <= 0,4 s zit na 2 s eronder
export const RUIS_STRIKES = 2;       // zoveel opeenvolgende controles (elk 2 s) voordat er wordt ingegrepen

// NaN, Infinity of een niet-getal wordt de terugvalwaarde; alles daarbuiten blijft zoals het is.
export function schoon(x, fallback = 0) {
  return typeof x === 'number' && Number.isFinite(x) ? x : fallback;
}

export function createNoiseRegistry({ onFix = () => {} } = {}) {
  const live = new Map();          // naam -> aantal levende lussen
  const piek = new Map();          // naam -> hoogste aantal tegelijk
  const wacht = [];                // { naam, param, verwacht, strikes }
  const st = { gestart: 0, gestopt: 0, stapeling: 0, gecorrigeerd: 0, laatste: null };

  function release(naam) {
    st.gestopt++;
    live.set(naam, Math.max(0, (live.get(naam) || 0) - 1));
  }
  return {
    // een gestarte lus (of lang geluid) bijhouden tot hij eindigt. max: meer tegelijk dan dit is een stapeling.
    volg(naam, src, { max = 1 } = {}) {
      const n = (live.get(naam) || 0) + 1;
      live.set(naam, n);
      st.gestart++;
      if (n > (piek.get(naam) || 0)) piek.set(naam, n);
      if (n > max) { st.stapeling++; st.laatste = `stapeling ${naam}: ${n} tegelijk (max ${max})`; }
      let klaar = false;
      const eind = () => { if (!klaar) { klaar = true; release(naam); } };
      if (src && typeof src.addEventListener === 'function') src.addEventListener('ended', eind);
      else if (src) { const vorige = src.onended; src.onended = (e) => { eind(); if (vorige) vorige.call(src, e); }; }
      return src;
    },
    // een doorlopende ruisstem: verwacht(wereld) zegt of hij nu mag klinken
    bewaak(naam, param, verwacht) {
      wacht.push({ naam, param, verwacht, strikes: 0 });
    },
    // elke watchdog-ronde. Geeft de namen terug die gecorrigeerd zijn.
    controleer(wereld) {
      const fixed = [];
      for (const w of wacht) {
        let mag = true;
        try { mag = !!w.verwacht(wereld); } catch (e) { mag = true; }
        const level = schoon(w.param && w.param.value, Infinity);   // een NaN-gain telt als open
        if (!mag && level > RUIS_GRENS) {
          w.strikes++;
          if (w.strikes >= RUIS_STRIKES) {
            w.strikes = 0;
            st.gecorrigeerd++;
            st.laatste = `ruis-vast ${w.naam}: gain ${Number.isFinite(level) ? level.toFixed(3) : 'NaN'} terwijl hij uit hoort`;
            try { onFix(w.naam, w.param); } catch (e) { /* niet erg */ }
            fixed.push(w.naam);
          }
        } else w.strikes = 0;
      }
      return fixed;
    },
    stand() {
      let lussen = 0;
      for (const n of live.values()) lussen += n;
      return {
        lussen, perNaam: Object.fromEntries([...live].filter(([, n]) => n > 0)), piek: Object.fromEntries(piek),
        bewaakt: wacht.length, gestart: st.gestart, gestopt: st.gestopt, stapeling: st.stapeling, gecorrigeerd: st.gecorrigeerd, laatste: st.laatste,
      };
    },
  };
}
