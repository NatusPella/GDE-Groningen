# Sprint 22-11: graphics, licht en kleur

Gebied: zonlicht, schaduw, hemel en wolken, mist en kleurvariatie van gras. Uitgangspunt: Wereldkleur-DS3 ([WERELDKLEUR-21-11.md](WERELDKLEUR-21-11.md)). Alles hieronder is zonder Electron gemaakt en getest (pure tests en shader-tekst); **niets is in beeld bekeken**.

## Wat veranderde

| Onderwerp | Voor | Na | Test |
|---|---|---|---|
| Dichte mist en de Martinitoren (#1202) | In dichte mist kromp `fog.far` naar 150 m; de skylinemist (vast 55% tot `fog.far`, 95% op 3x) zette een toren op 400 m op ca. 87%: een spookachtig silhouet | De grenzen zakken met de mist: 55% naar 40% en 95% naar 78% (`SKYLINE_FOG` in `weatherlook.js`, uniforms in de skylinematerialen van `scene3d.js`). Zonder mist ongewijzigd; de mist zelf (kleur, afstand, zichtbodem #866) blijft | `weatherlook_test.mjs` |
| Schaduwen bij lage zon | Vaste schaduwrand (radius 1,2 tot 1,5) de hele dag | `shadowSoftness(elev)` in `sunrules.js`: tot 35% bredere rand naarmate de zon zakt (gouden uur), 1 bij hoge zon; per beeld vermenigvuldigd op de basisstraal van het schaduwniveau, geen extra kosten | `sunrules_test.mjs` |
| Gras: kale effen vlakken (#1203, #1193) | Verre groenvlakken en streamtegels: één egale kleur per vlak | `grassVariation` in `farlod.js`: twee ruisschalen (ca. 40 m en 9 m) in de wereldruimte, helderheid en een tikje geel-groen, gemiddeld neutraal, tussen -18% en +18%; geldt voor `green` en `greenNear` | `farlod_test.mjs` |
| Wolken bij zonsopkomst en -ondergang | Altijd wit | Tint tot 45% richting de gloedkleur van `sunGlow`, minder onder een dicht wolkendek, niet 's middags | `cloudlook_test.mjs` |
| Bewaking van het daglichtprofiel | Geen test op de lichtkleuren over het etmaal | `daglicht_profiel_test.mjs`: warm gouden uur, zachte schaduwverhouding (zon tegen hemel 2,2 tot 3,9), mist en horizon overdag binnen 25% helderheid, geen sprongen, koel maanlicht | zelf |

## Wat in beeld bekeken moet worden

1. **Dichte mist in de Binnenstad** (weer Mist, Martinitoren op ca. 300 tot 450 m): de toren moet als herkenbaar silhouet met wat kleur blijven staan, niet bijna verdwijnen; controleer dat de gewone mistsfeer en de zichtbodem niet veranderden.
2. **Gouden uur** (zonshoogte 3 tot 14 graden): schaduwranden zacht zonder zichtbare banding in de schaduwkaart (Laag en Midden gebruiken radius 1,5, dus tot ca. 2,0; als de rand ruisig of gestreept oogt, de 0,35 in `shadowSoftness` verlagen). Wolken met een gouden randje.
3. **Verre weilanden en dorpsplein** (Usquert, Bourtange): de groenvlakken tonen vlekkerige variatie in schaal en tint; geen zichtbare naad op de grens met het gedetailleerde gras (de variatie is gemiddeld neutraal gehouden), geen flikkering.
4. Shadercompilatie op Windows en Mac: de grasvariatie voegt een varying `vGrassXZ` en een kleine functie toe aan twee grondmaterialen; geen GL-run gedaan.

## Wat bewust niet is gedaan

- Het bruine grondvlak met horizontale strepen in Usquert (#1193) is niet opgelost voor zover het schaduwbanding van de schaduwkaart is; daarvoor is een beeld nodig. De variatie is alleen voor gras.
- Waterkleur, bloom-instellingen en nachtlantaarns zijn gelezen maar niet gewijzigd: de lantaarnkleur (`0xffb66e`) is al warm, bloom en tonemapping volgen de Wereldkleur-tabel.

## Samen spelen

Alles is een lokale weergave: licht, mist, wolken en grasvariatie volgen de eigen klok en het eigen weer van elke speler. Niets wordt gesynchroniseerd; geen snapshot, beloning of voortgang. Een gast die later aansluit rekent hetzelfde uit.
