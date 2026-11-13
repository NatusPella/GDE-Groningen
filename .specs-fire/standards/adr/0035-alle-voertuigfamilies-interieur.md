# 0035 - Alle voertuigfamilies krijgen een eigen interieur volgens het #833-patroon

- **Status:** besloten
- **Datum:** 2026-11-13
- **Spec:** `.specs-fire/standards/system-architecture.md` (camera en voertuigen)
- **Gerelateerd:** #847, #833, #389, #442, #444, #497, #804

## Context

Na #833 (ADR 0034) hadden auto's, bestelbussen, vrachtwagens en bussen een
interieur op LOD's, en de eigen auto een detailinterieur voor de
eerste-persooncamera. De rest van de voertuigfamilies bleef leeg of kreeg het
verkeerde interieur: de trekker en de boerderijmachines waren uitgesloten, de
helikopter en het vliegtuig hadden geen cockpit (het vliegtuig kreeg zelfs het
generieke auto-interieur met de spanwijdte van 10,6 m als breedte), boten met
een roef/stuurhut waren holle schillen, de achterwagen van de gelede bus had
geen passagiersruimte, andere treinen dan de bereden trein hadden niets achter
de ramen, wrakken hadden blinde zwarte ramen en laadruimtes waren niet
gemodelleerd (ook niet als de deuren openstonden). De eigenaar vroeg om al deze
voertuigen alsnog een interieur te geven, met dezelfde prestatie-eisen als #833.

## Besluit

1. **Elke voertuigfamilie krijgt een eigen, pure indelingsmodule** —
   `cockpitlayout.js` (trekker, helikopter, vliegtuig, maaidorser,
   laadmachine), `bootinterieur.js` (roef/stuurhut per bootsoort),
   `vrachtruimte.js` (laadruimtes en kofferbakken), naast de bestaande
   `carinteriorlayout.js`, `businterieur.js` en `treinlayout.js`. De indeling is
   in voertuig-/scheepscoördinaten en los van three.js testbaar; de maten komen
   uit de modelbouwers met een commentaarverwijzing.
2. **De 3D volgt het #833-patroon**: één gedeelde, samengevoegde geometrie per
   (soort, maat, niveau) via `GeoBuilder` + `markShared`, één gedeeld
   Lambert-materiaal met vertexkleuren, per voertuig één mesh die alleen van
   `geometry` wisselt, een bouwbudget per frame (2-3), `castShadow = false`,
   verbergen voorbij de verste straal en geen allocaties of raycasts in het
   hete pad. Detail in eerste persoon is een extra niveau van dezelfde mesh,
   nooit een tweede mesh.
3. **Nieuwe families draaien als wereld-tick-kinds** (`activityhub`, zoals
   `busInterieurKind`): `bootInterieurKind` en `vrachtruimteKind` worden in
   `main.js` geregistreerd. Zo blijft `scene3d.js` buiten de #497-grens en hoeft
   er geen nieuwe camera-/wereldhaak bij.
4. **LOD-afstanden schalen waar de voertuigen groot zijn** (boten: factor tot
   2,2 op de scheepslengte; trein: eigen straal), met dezelfde
   bouwbudgetten en dezelfde regel "voorbij de verste straal niets".
5. **Wrakken krijgen een kapot interieur**: het glasmateriaal van dat ene
   voertuig wordt doorzichtig of weggezet (materialen zijn per voertuig nieuw),
   er komt een gedeelde wrakvariant (soot, scheve stoelen/stangen, geen
   reizigers) en de cabine van de maaidorser is in `models3d_vehicles.js`
   opengesplitst in een onderpaneel, een dakpaneel en vier hoekstijlen, zodat
   het interieur door de glasband te zien is.
6. **Vrachtruimtes zijn zichtbaar bij open, losse of ontbrekende deuren en in
   een wrak**; de carrosserie erachter wordt met de bestaande dieptetruc (zoals
   `CABIN_HOLE` in `vehicledoors3d.js`) als gat behandeld. Elke soort heeft
   eigen inhoud: pakketten, geldkoffers, brancard, werkbank, pallets, koffers.
7. **De trein**: de bereden trein houdt het volledige interieur; alle andere
   treinen en rijtuigen in de buurt krijgen een gedeeld LOD-interieur achter de
   ramen. Daarvoor is de treinromp in `railway3d.js` opengesplitst in een
   onder- en bovenband met transparante glaspanelen en een donkere vuller die
   wijkt zodra het LOD-interieur er is.

## Afgewezen

- **Alles via het generieke auto-interieur.** Dat gaf een 10 m brede cabine in
  het vliegtuig, een interieur op auto-hoogte in de maaidorser en niets
  bruikbaars in boten en helikopters. Elke familie heeft andere maten en een
  andere zit-/kijkpositie.
- **Een eigen mesh per detailniveau of per los onderdeel.** Dat verdrievoudigt
  draw calls; geometrie wisselen op één mesh is cheaper (zie ADR 0034).
- **Nieuwe hooks in `scene3d.js` per familie.** Dat doorbreekt de #497-grens en
  maakt de camera/wereldmodule weer een verzamelpunt; de tick-kinds zijn er al.
- **Wrakramen dicht laten.** Dan is een kapot interieur per definitie
  onzichtbaar; het glas van een wrak moet open of doorzichtig.
- **Vrachtruimte alleen tonen als de speler het voertuig bestuurt.** Juist op
  straat zie je een openstaande klep of een losse deur; de inhoud hoort dan
  zichtbaar te zijn.
- **Treinramen dicht laten en alleen het interieur van de bereden trein
  houden.** De eigenaar vroeg om alle treinen.

## Gevolgen

- Nieuwe modules `cockpitlayout.js`, `bootinterieur.js`, `bootinterieur3d.js`,
  `vrachtruimte.js`, `vrachtruimte3d.js`; uitbreidingen in
  `carinteriorlayout.js`, `cabin3d.js`, `carinterior.js`, `autointerieur.js`,
  `seating3d.js`, `businterieur.js`, `businterieur3d.js`, `treininterieur.js`,
  `treinlayout.js`, `railway3d.js` en een kleine opening in de
  maaidorser-cabine in `models3d_vehicles.js`.
- `main.js` registreert twee extra wereld-tick-kinds.
- Nieuwe tests: `scripts/cockpit_test.mjs`, `scripts/bootinterieur_test.mjs`,
  `scripts/bootinterieur3d_test.mjs`, `scripts/vrachtruimte_test.mjs`,
  `scripts/vrachtruimte3d_test.mjs`, `scripts/trein_lod_test.mjs`, plus
  uitbreidingen van `cabin_test.mjs`, `carinterior_test.mjs`,
  `businterieur_test.mjs` en `businterieur3d_test.mjs`.
- De QA-ronde `scripts/qa/interieuren_847_shots.mjs` legt per familie beelden en
  metingen vast (LOD-driehoeken, bouwtijd, draw calls) en beoordeelt ze met de
  hand; de metingen en het oordeel staan in #847.
- Beperking: de boten gebruiken de bestaande `boatSeats`-hoogtes; bij grote
  schepen kan het eerste-persoonsoog net boven de raamband staan en de
  glasband van de fitters is een massief glasvlak. Dat is een model-/seatkwestie
  die later apart kan worden aangepakt.
