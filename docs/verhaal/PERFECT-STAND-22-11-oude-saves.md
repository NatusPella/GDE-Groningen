# Perfecte stand 22-11: oude saves en het nieuwe verhaal

Scope (besluit eigenaar): een oude save (zonder poort of van een eerdere verhaalversie) krijgt eenmaal een korte kaart, een tag in het opgeslagen-spellen-scherm, en blijft verder precies werken zoals hij werkte. Verslag bij #1121 (verhaal-epic) en WP8 (#1131, de ontgrendelpoort).

## Besluit

- Titel "Nieuw verhaal" (13 tekens), één zin: "Dit spel komt van een eerdere versie. Voor het nieuwe verhaal werkt een nieuw spel het best."
- Knoppen **Doorgaan** (Enter-toets in de knop, voorselectie) en **Nieuw spel**.
- Doorgaan laadt de save zoals nu: geen migratie erbij, alles open (`unlockgate.js`: een save zonder poort leest als "alles open"), geen dataverlies.
- Nieuw spel gaat via de gewone route (`startNewSlot`): een nieuwe plek, de oude save blijft staan. Is er geen vrije plek, dan zegt de kaart dat en gebeurt er niets; hij neemt nooit de plek van de oude save in (de gewone vraag bij een volle lijst zou dat wel doen).
- Eenmaal per save: de vlag `legacyCardSeen` staat in de save zelf (`savegame.js` schrijft hem mee in elke volgende save, `saveslots.js` zet hem vóór het laden in de ruwe tekst). Hij verhuist mee bij kopiëren en exporteren en overleeft de migraties. Een nieuw spel begint zonder vlag.
- Tag "Oude versie" (chip in Opgeslagen spellen) blijft staan, ook na de kaart.
- Samen spelen: lokaal, geen netwerk, geen EXTRA-bericht. De kaart laat het kiezen van een spel voor de sessie (`pick`) en de gast-route ongemoeid; wie als host een oude save opent, ziet de kaart bij het laden. Voortgang en beloningen per speler (#429) veranderen niet.

## Wat telt als oud (`game/js/legacysave.js`, zuiver)

Een save met voortgang (verhaalstappen of voltooide missies) én een van deze:
1. geen `story.gate`, of een gate met `legacy: true`, of een oudere `GATE_VERSION`;
2. een verhaalsave van de eerste vorm (`story.v` 1);
3. de vlag `oudGemigreerd` (save van het eerste verhaal, migratie 9).
Een leeg spel (geen stappen, geen missies) heeft niets te verliezen en krijgt geen kaart.

## Gedaan

| Onderdeel | Bestand | Stand |
|---|---|---|
| Regel en tekst | `game/js/legacysave.js` | gedaan |
| Kaart voor boot en hoofdmenu (alle drie de Doorgaan-paden) | `game/js/legacysavecardui.js`, `startscreen.js` | gedaan, luistert naar pijlen, Tab, Enter, klik; Escape en Backspace kiezen niets |
| Kaart in Opgeslagen spellen (laden, held "Doorgaan" bovenaan) | `game/js/saveslotsui.js` | gedaan, eigen modaal vak, toetsgroep `menu` (listnav-patroon) |
| Tag "Oude versie" | `saveslotsui.js`, `saveslots.js` (`summarize`) | gedaan |
| Vlag zetten zonder te migreren | `saveslots.js` `markLegacyCardSeen` | gedaan; een kapotte of herstelde plek blijft onaangeroerd |
| Testrun (AUTO, autoplay, menutest) | `startscreen.js` | slaat de kaart over |
| Toets | `scripts/legacysave_test.mjs` | 57 controles |

## Open

- Niet in beeld bekeken: geen Electron en geen build gedraaid (machine krap, perf-meting loopt). Opmaak (breedte van de modaal in `ssl-box`, de toets in de knop met `sk-toets-in` binnen de saveslots-stijl) is nog niet gezien. Alles hierboven is met pure tests en een DOM-nabootsing gedekt.
- Een gast in Samen spelen bewaart een eigen save met verhaalvoortgang; heeft die geen poort, dan krijgt hij de tag en de kaart bij laden van die eigen save. Ongevaarlijk (Doorgaan laadt zoals nu), maar nog te beoordelen of de poort ook voor gastsaves hoort.
- Het pauzemenu (laden midden in het spel) toont de kaart ook; de tweede knop is daar Terug, want Nieuw spel bestaat daar niet.
- Geen nieuwe audio nodig (geen gesproken tekst, `voice_coverage` ongewijzigd groen). Geen eigen SFX voor de kaart (niet gecontroleerd of de knoppen de gewone menuklik geven).

## Tellers

Nieuwe bestanden 3 (twee modules, één test), gewijzigd 4 (`savegame.js`, `saveslots.js`, `saveslotsui.js`, `startscreen.js`), controles nieuw 57, bestaande save-, DS3- en tekstdieettests ongewijzigd groen.
