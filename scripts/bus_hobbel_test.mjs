// Bus zonder hobbel (#519): de hoogte onder de wielen komt uit één bron per rijstrook en wordt
// gemiddeld met een vaste set monsterpunten en vaste gewichten, niet met sum/aantal. Zo geeft
// een punt dat net over de rand van een busbaan of verhoogd fietspad valt geen sprong meer.
// Wat deze test vastlegt:
//   a) twee hoogtebronnen die per beeld ±0,10 m verschillen: de bak zakt hooguit 2 cm per beeld
//      (de hobbel was 9-12 cm: het aantal meegetelde punten versprong);
//   b) een echte stap van 0,6 m (viaductrand) wordt wél meteen gevolgd — geen temporele demping
//      op v.z, want die liet de auto op de N370 achterlopen en daarna met een sprong inhalen;
//   c) op een helling van 5% loopt de auto niet achter: de hoogte volgt de weg direct.
//   node scripts/bus_hobbel_test.mjs
import './node3d.mjs';
await import('../game/js/player.js');
const { Vehicle, TRAFFIC_MODELS, settleVehicleHeight } = await import('../game/js/vehicle.js');
const modellen = TRAFFIC_MODELS();
const dt = 1 / 60;
const bus = () => Object.assign(new Vehicle(0, 0, 0, modellen.find((m) => m.name === 'bus')), { driver: 'ai' });

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// Rijdt de bus `seconden` lang rechtdoor over `map` (alleen de hoogte telt hier: sturen,
// botsen en veren laten we weg, die hebben hun eigen tests).
function rijd(v, map, seconden, perBeeld) {
  const stappen = Math.round(seconden / dt);
  let vorige = v.z || 0, maxSprong = 0, waar = null;
  for (let i = 0; i < stappen; i++) {
    v.x += v.speed * dt;
    settleVehicleHeight(v, map, dt);
    const d = Math.abs((v.z || 0) - vorige);
    if (d > maxSprong) { maxSprong = d; waar = { i, x: +v.x.toFixed(2), z: +v.z.toFixed(3) }; }
    vorige = v.z || 0;
    if (perBeeld) perBeeld(v, i);
  }
  return { maxSprong, waar };
}

// --- a) twee hoogtebronnen die elkaar per beeld afwisselen --------------------------------
// De busbaan (0 m) loopt langs een verhoogd fietspad (0,10 m). De rand ertussen ligt een
// paar graden schuin op de rijrichting (zoals in de data: geen enkele stoeprand loopt
// kaarsrecht langs de weg), dus liggen de acht monsterpunten over de wielbasis aan
// verschillende kanten van die rand en valt er telkens één punt net over de rand. De twee
// bronnen schelen 0,10 m; geen enkel beeld mag meer dan 2 cm hoogteverschil geven.
{
  const HOOG = 0.10; // m: het verhoogde fietspad naast de busbaan
  // de rand staat 0.1 rad (6 graden) schuin op de rijrichting; s is de loodrechte afstand
  // tot die rand, dus de acht monsterpunten liggen 0,65 m uit elkaar en vallen één voor één
  // over de rand terwijl de bus 5 m verder rijdt
  const TH = 0.1, X0 = 2.8;
  const s = (x, y) => (x - X0) * Math.cos(TH) + (y - 1.30) * Math.sin(TH);
  const op = (x, y) => (s(x, y) >= 0 ? HOOG : 0);
  const map = { groundHeightAt: (x, y) => op(x, y) };
  const v = bus();
  v.y = 1.30; v.z = 0; v.speed = 12; v.angle = 0;
  let gemengd = 0, hoogste = 0, laagste = 8, hobbel = 0, waar = null;
  let vorige = 0;
  rijd(v, map, 1, (car, i) => {
    // hoeveel monsterpunten staan nu op de hoge bron? (moet beide kanten op voorkomen)
    let k = 0;
    for (const f of [-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1]) {
      const d = f * Math.min(car.halfLen * 0.85, 2.6);
      if (op(car.x + Math.cos(car.angle) * d, car.y + Math.sin(car.angle) * d) > 0) k++;
    }
    if (k > 0 && k < 8) gemengd++;
    hoogste = Math.max(hoogste, k); laagste = Math.min(laagste, k);
    // de hobbel telt zolang de bus op de busbaan zelf rijdt (de bron onder zijn
    // midden is de lage): daar hingen de punten over de rand van het fietspad
    if (op(car.x, car.y) === 0) {
      const d = Math.abs(car.z - vorige);
      if (d > hobbel) { hobbel = d; waar = { i, x: +car.x.toFixed(2), z: +car.z.toFixed(3) }; }
    }
    vorige = car.z;
  });
  ok(gemengd > 10 && laagste <= 1 && hoogste === 8, 'bus: de bronnen wisselen over de wielbasis', `${gemengd} gemengde beelden (${laagste}..${hoogste} punten hoog)`);
  ok(hobbel < 0.02, 'bus: geen hobbel als een punt over de rand valt (max per beeld op de busbaan)', `${(hobbel * 100).toFixed(1)} cm bij ${JSON.stringify(waar)}`);
  ok(v.z > HOOG - 0.01, 'bus: volgt de hogere bron als hij er eenmaal op staat', v.z.toFixed(3));
}

// --- a2) een rand die golft: meerdere wielen tegelijk van bron ----------------------------
// Zware variant: een rafelige rand waar de bus met zijn hele midden op rijdt, zodat er per
// beeld twee tot drie punten tegelijk van bron wisselen. Dat is geen naad meer maar een rand
// onder de bak (een busbaan die over een verhoogde oversteekplaats loopt); hij mag niet meer
// springen dan de bronnen schelen, en zeker niet meer dan de 9-12 cm van eerst.
{
  const HOOG = 0.10;
  const rand = (x) => 1.30 + 0.06 * Math.sin(x * 1.7) + 0.03 * Math.sin(x * 4.3);
  const map = { groundHeightAt: (x, y) => (y >= rand(x) ? HOOG : 0) };
  const v = bus();
  v.y = 1.30; v.z = 0; v.speed = 12; v.angle = 0;
  const { maxSprong } = rijd(v, map, 2);
  ok(maxSprong < 0.06, 'bus: rafelige rand onder de bak blijft onder de bronafstand', `${(maxSprong * 100).toFixed(1)} cm per beeld`);
}

// --- b) een echte stap van 0,6 m wordt meteen gevolgd --------------------------------------
// De rand van een viaduct: het wegdek ligt vanaf x = 10 m 0,6 m hoger. Geen demping: de auto
// moet in het beeld dat hij de rand over gaat de volle stap maken (en dus niet blijven hangen
// en later inhalen, wat drive_audit als "springt" zag).
{
  const map = { groundHeightAt: (x) => (x >= 10 ? 0.6 : 0) };
  const v = bus();
  v.y = 0; v.z = 0; v.speed = 6; v.angle = 0;
  const { maxSprong } = rijd(v, map, 3);
  ok(Math.abs(v.z - 0.6) < 0.005, 'bus: volgt een echte stap van 0,6 m', v.z.toFixed(3));
  ok(maxSprong > 0.5, 'bus: de stap komt in één beeld (geen hoogtedemping)', `${(maxSprong * 100).toFixed(0)} cm`);
}

// --- c) op een helling van 5% loopt de auto niet achter -----------------------------------
// Een gelijkmatige helling: de hoogte onder het midden is de hoogte van de auto, dus de
// gemiddelden links en rechts van het midden heffen elkaar op. Loopt de auto achter, dan komt
// hij onder de weg uit (het verschil groeit met de snelheid) en haalt hij die later in.
{
  const HELLING = 0.05;
  const map = { groundHeightAt: (x) => HELLING * x };
  const v = bus();
  v.y = 0; v.z = 0; v.speed = 25; v.angle = 0; // 90 km/h: op topsnelheid mag de achterstand niet oplopen
  let maxAchter = 0;
  rijd(v, map, 3, (car) => { maxAchter = Math.max(maxAchter, Math.abs(car.z - HELLING * car.x)); });
  ok(maxAchter < 0.01, 'bus: loopt niet achter op een helling van 5%', `${(maxAchter * 100).toFixed(2)} cm`);
}

console.log(bad ? `bus_hobbel_test: ${bad} van ${n} mislukt` : `bus_hobbel_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
