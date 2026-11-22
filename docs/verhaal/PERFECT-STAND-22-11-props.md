# Perfect-stand 22-11: props, sets en figuranten

Scope van de ronde "het nieuwe verhaal helemaal perfect" voor alle props, sets en figuranten van de missies en scènes (#1121). De volledige lijst per model staat in [../PROPS-STAND-22-11.md](../PROPS-STAND-22-11.md) (gegenereerd door `node scripts/verhaal_props_audit.mjs --write`); de toets is `scripts/verhaal_props_test.mjs` (203 controles).

Niets is in beeld gezien (geen Electron in deze ronde): vorm, schaal en kleur zijn gemeten met een three-mock, niet bekeken. Alles hieronder is "nog niet bekeken" tot de sweep van de coördinator.

## Wat de audit controleert

`scripts/verhaal_props_audit.mjs` haalt uit 95 scènes (134 props), 27 aankledingsplannen, de wachtstappen, de sets en de 49 figuren van de NPC-tabel:

1. elke soort bestaat in een bouwer of catalogus (decor in `storyprops.js`, voertuig of dier uit de wereld) en staat in `PROP_KINDS`;
2. elk decormodel houdt zijn polygoonbudget, heeft 2 tot 6 materialen, een silhouet, geen NaN, staat op de grond en is deterministisch; twee soorten met hetzelfde model vallen door;
3. een prop-id die een bekend ding noemt (klomp, tank, limo, stempel, ...) is ook die soort: geen doos of bord als stand-in;
4. verwijzingen kloppen (`prop:`, `actor:`, `carry`, `drop`, `follows`, `mid:`), props staan niet dubbel op één plek, een figuur begint niet in een voertuig of een groot voorwerp (behalve wie in de opening wegloopt of verborgen meerijdt);
5. elke set (cutscene en missiestap) is een bekende set; elke aankleding waar naar verwezen wordt heeft een plan en elk onderdeel een bouwer (anders werd het stil overgeslagen); elke gekozen wachtprop bestaat;
6. elke rol in een cast en elke spreker in `script.json` heeft een volledig uiterlijk in de NPC-tabel.

## Gedaan en gefixt (aantallen)

| Onderdeel | Aantal | Wat |
|---|---|---|
| Nieuwe decormodellen | 17 | klomp, stempel, pinpas, map, bierviltje, fotolijst (op een ezel), statief, krat, pan, vuurwerk, koelbox, jas, aktetas, hesjes, container (10 voet), scherm, prikbord |
| Wereldmodellen als scène-prop | 3 | snackwagen (M30, foodtruck), tankwagen (M07, vettankwagen Us Mem), limo (M10, M14, M15, M26, de trekker-limo) |
| Verbeterde bestaande modellen | 7 | bal (voetbal met zwart en wit), matras, koffer, klembord, bord, radio, duiventil |
| Scènes met een juist model in plaats van een stand-in | 36 prop-regels (plus de containers van M13 via een hulpfunctie) | o.a. klomp (M03, M09, M20, M21), kratten (M09), containers (M13), scherm (M03, M18), statief (M01) |
| Figuranten | 1 | Beppe stond niet in de NPC-tabel: een scène met haar kon niet worden bezet |
| Dubbele bouwers samengevoegd | 4 | bank, kist, baal en ton bestonden in `missiedecor.js` en `wachtprops.js` |
| Figuren die in een voertuig stonden | 2 | Jelle in M14 (de limo) en in M30 (de snackwagen) staan nu naast het voertuig |
| `PROP_MAKERS` | 13 soorten verhuisd | van `cutscenehost.js` naar `storyprops.js`, met budget (`DECOR_BUDGET`) en meting (`measureModel`); de draaghoogte staat op één plek (`CARRY_LOW`) |

Per-stap-regel (props, sets, figuranten):

- M01: kladblok, klembord, statief (streamer, nu een echt statief met ringlamp), bakkie, fietsers: gedaan. Set `keuken` (opening): bestond al.
- M02: automaat, paal, politie, pinpas (nu een pinpas): gedaan; `paal` blijft een bord (open).
- M03: set `loket`; stempel, stempelblad, klomp, scherm (nu een scherm op een voet): gedaan.
- M05, M06, M08, M09: bierviltje, radio, foto (nu een fotolijst op een ezel), brij en pannen (nu een pan), kratten (nu kratten): gedaan.
- M07: de tankwagen is de vettankwagen met opschrift; pannen: gedaan.
- M10 tot en met M15: de limo is de trekker-limo, map is een dossiermap, aktetas, koeltas, vesten (hesjes): gedaan.
- M13: containers zijn containers (10 voet) in plaats van dozen: gedaan.
- M20 tot en met M26: klomp, jas, vuurwerk, vergunning (blijft klembord), bakje (blijft doos): gedaan.
- M27 tot en met M30: de bus van M30 is de snackwagen "Tam & Tes" (foodtruck); de verhuisbus van M27 en M28 blijft een bestelbus; Jelle staat niet meer in het voertuig: gedaan.
- Aankleding (27 plannen) en wachtstappen (12 soorten): alle onderdelen hebben een bouwer en vallen binnen het budget.

## Samen spelen

Props, sets en figuranten zijn beeld van de eigen cutscene of stap: elke speler bouwt ze lokaal bij zijn eigen scène en er gaat niets over het net dat er niet al was (geen nieuw bericht, geen nieuwe coöp-test). De beloning en voortgang veranderen niet (per speler, #429).

## Open

- Niets in beeld gezien (zie boven).
- `paal` (M02), `lijstje`, `zak`, `bakje`, `vergunning` blijven bestaande vormen.
- De aankleding-trekker (`tractor` in `missiedecor.js`) is een blokkenmodel van 6 delen; de wereldtrekker is mooier maar vraagt gedeelde geometrie en opruiming.
- Het prikbord (N8, de vijf vrienden) bestaat als model, maar geen spec zet het neer (N8 heeft geen cutscene-spec).
- De 3D-uitwerking van de dagdroom in T2 (WP-STAND-21-11) is geen prop-werk en blijft open.
- Beppe staat nu in de NPC-tabel; de verzoeningsscène met haar is werk van de verhaalakte, niet van deze ronde.
