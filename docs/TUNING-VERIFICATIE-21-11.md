# Autotuning: wat is geverifieerd en wat nog niet (21-11)

Epic #1155. Geen Electron gebruikt; alles hieronder is headless of puur.

## Getest (draait met gewone `node`)

| Test | Dekt |
| --- | --- |
| `scripts/vehiclelook_test.mjs` | catalogus, soorten, code (rondje, tolerant), nummerbordfilter, prijzen en inruil, generator (deterministisch, stijlen), opslag en builds, snackwagen-velden |
| `scripts/vehiclelook3d_test.mjs` | echte THREE-geometrie in Node: eindig, binnen het voertuig, driehoekbudget, drawcallbudget, gedeelde geometrie, afwerking, ruitfolie, underglow, snackwagen, NPC-bus en wrak blijven kaal, cache begrensd |
| `scripts/tuningplan_test.mjs` | onderdeel ophanging, grenzen op `draai` en `grip`, rijhaak alleen voor de speler |
| `scripts/tuningdraft_test.mjs` | concept, kosten, garageniveau, dagaanbiedingen (25%), vergrendelen, tabbladen en groepen, effecten, builds |
| `scripts/tuningworld_test.mjs` | aandeel per profiel en uur, nooit meer dan 5%, platteland 0, budgetten, treffen, glow-begroting |
| `scripts/coopbezit_test.mjs`, `net_codec_test.mjs`, `coopworld_test.mjs` | tuning in bezorgbericht en uiterlijkrecord, oud en nieuw formaat |

Plus `node --check`, `spec_check`, `docs_index_test`, `lineendings_test`, `text_audit`, `undef_check`, `import_cycles_test`, `naamtaal_check` (alleen de voetbalbestanden van een andere epic falen), `ds3_ratel_test` en `ds3_dekking_test` (geen stijging).

## Beeld (headless Chrome, `node scripts/tuning_shots.mjs`)

In `docs/beeld-21-11/tuning/`: `voertuigen-dag/nacht.png` (zes auto's, stijlen race, show, rally, cruiser, underglow 's nachts), `snackwagen-dag/nacht.png` (luifel, tafel, bakkenlicht, lampjesrand, damp, belettering), `ui-*.png` (de echte werkplaats-module met een opslag in het geheugen: lak, carrosserie, velgen, licht, onderdelen, builds, snackwagen, installeren, vergrendeld).

## Nog niet bekeken (de coördinator in de sweep)

- de werkplaats in een echte garage (R in de garage, Pimp-werkplaats bovenaan), met controller en met aanraking;
- tweewieler, bus en boot in het voorbeeld; de werf en de fietsenmaker;
- underglow en bakkenlicht in de echte nacht; de lucht (bijtjes) in beweging;
- geparkeerde chunks met gepimpte auto's (prototypes, glow-laag) en het autotreffen (melding, zinnen);
- de prestatie van gepimpte verkeersauto's en geparkeerde blokken (meet gepaard, `docs/PERF-*`);
- een leakwatch-run met veel verschillende looks (de cache en `forgetWheelPool`);
- Samen spelen met twee instanties: gast ziet de gepimpte auto van de host en omgekeerd.
