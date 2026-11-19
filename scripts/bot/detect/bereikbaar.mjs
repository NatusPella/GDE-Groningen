// Detector (g): bereikbaarheid van het doel. De page-kant logt bij elke doelwissel een 'bereik'-regel:
//   { type: 'bereik', t, stap, doel: { x, y, naam }, voertuig: 'auto' | 'te voet' | 'boot' | ..., probe: {
//       inWater, inGebouw, vrij (staat een wandelaar er niet verdrongen), dichtstbijVrijM (afstand tot de dichtstbijzijnde vrije plek, tot 40),
//       routeGevonden (findWalkPath of de planner), routeLengteM, luchtM } }
// Pure oordelen:
//   doel-in-water        het doel ligt in water terwijl de speler niet in een boot zit (en het doel geen boot-doel is)
//   doel-in-gebouw       het doel ligt in een gebouw/muur zonder vrije plek binnen `maxM`
//   doel-onbereikbaar    geen vrije plek binnen `maxM` van het doel
//   doel-geen-route      op het land (niet vliegen of varen) vindt de planner geen route
//   doel-omweg           de route is meer dan 4x zo lang als de lucht (cosmetisch, alleen bij luchtafstand > 80 m)
export const BEREIK = { maxM: 6 };

export function bereikOordeel(ev, { maxM = BEREIK.maxM } = {}) {
  const p = ev.probe || {}, uit = [];
  const v = String(ev.voertuig || ''), dichtbij = Number.isFinite(p.dichtstbijVrijM) && p.dichtstbijVrijM <= maxM;
  const opWater = /boot|sloep|skûtsje|skutsje|roei|zeil/i.test(v), lucht = /heli|vliegtuig|duif|plane/i.test(v);
  if (p.inWater && !opWater && !lucht && !ev.doel?.water) uit.push({ type: 'bereik-doel-in-water', ernst: 'blokkeert', uitleg: `het doel ligt in het water en de speler is ${v || 'te voet'}` });
  else if (p.inGebouw && !dichtbij) uit.push({ type: 'bereik-doel-in-gebouw', ernst: 'blokkeert', uitleg: `het doel ligt in een gebouw of muur, de dichtstbijzijnde vrije plek is ${p.dichtstbijVrijM == null ? 'meer dan 40' : p.dichtstbijVrijM} m weg` });
  else if (p.vrij === false && !dichtbij && !opWater && !lucht) uit.push({ type: 'bereik-doel-onbereikbaar', ernst: 'blokkeert', uitleg: `geen begaanbare plek binnen ${maxM} m van het doel (dichtstbij: ${p.dichtstbijVrijM == null ? 'meer dan 40' : p.dichtstbijVrijM} m)` });
  if (p.routeGevonden === false && !opWater && !lucht && !p.inWater) uit.push({ type: 'bereik-geen-route', ernst: 'blokkeert', uitleg: 'de routeplanner vindt geen route naar het doel' });
  else if (p.routeGevonden && p.luchtM > 80 && p.routeLengteM > p.luchtM * 4) uit.push({ type: 'bereik-omweg', ernst: 'cosmetisch', uitleg: `de route is ${Math.round(p.routeLengteM)} m voor ${Math.round(p.luchtM)} m hemelsbreed` });
  return uit;
}

export function bereikBevindingen(events, o = {}) {
  const uit = [];
  for (const e of events.filter((q) => q.type === 'bereik' && q.doel)) {
    for (const f of bereikOordeel(e, o)) uit.push({ type: f.type, soort: 'bereik', ernst: f.ernst, stap: e.stap || '', plek: [Math.round(e.doel.x), Math.round(e.doel.y)], t: e.t, tekst: e.doel.naam || '', bewijs: { uitleg: f.uitleg, probe: e.probe, voertuig: e.voertuig } });
  }
  return uit;
}
