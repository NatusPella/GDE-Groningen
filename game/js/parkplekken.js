// Parkaankleding (#23): de bekende stadsparken krijgen banken en prullenbakken in
// een ring rond het hart, met de gezichten naar het midden. Pure en deterministisch;
// cityprops.js zet er props op waar de grond vrij is.
export const PARKS = [
  { name: 'Noorderplantsoen', x: 120.88, y: -725.14, rMin: 12, rMax: 55, banken: 14 },
  { name: 'Prinsentuin', x: 261.5, y: -210.93, rMin: 6, rMax: 22, banken: 5 },
];

// Kandidaatplekken voor banken: gelijkmatig rond de ring met een vaste spreiding.
// Elke plek: { x, y, angle (kijkt naar het midden), bin: bool }.
export function parkBankSpots(park) {
  const out = [];
  for (let i = 0; i < park.banken; i++) {
    const a = (i / park.banken) * Math.PI * 2 + (i % 2) * 0.11;
    const r = park.rMin + ((i * 0.618034) % 1) * (park.rMax - park.rMin);
    const x = park.x + Math.cos(a) * r, y = park.y + Math.sin(a) * r;
    out.push({ x, y, angle: Math.atan2(park.y - y, park.x - x), bin: i % 3 === 0 });
  }
  return out;
}
