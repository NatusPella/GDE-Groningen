# Merk en marketingbeeld in zeefdruk: inventaris (21-11, issue #1003)

Het zeefdrukdesign (ADR 0040, `DESIGN_SYSTEM.md`) buiten het spel: waar staat het logo, het icoon en het marketingbeeld, wat is al omgezet, wat is nieuw en wat vraagt beeld. Alles hieronder is gecontroleerd met pure tests; **niets is in beeld gezien** (geen Electron, geen browservenster op de assets). Constitutie: alleen verzonnen namen, geen echt merk of echte persoon, geen extern lettertype- of trackingverzoek, de letters zijn paden uit het zelf gehoste Barlow Condensed (SIL OFL 1.1).

## Inkten en regels voor deze bestanden

Vijf inkten: papier `#f3ead3`, inkt `#1d1b17`, bordgroen `#0e6b3c`, zomergeel `#f9c80e`, roze `#e8505b` (alleen als misdruk). Vlakke vullingen, geen verloop, geen blur, geen rasterbeeld. Kleine maten en lage dekking krijgen de rustige variant: effen vlakken, geen misdruk, geen ondertitel.

## Inventaris

| plek | bestanden | stand | test |
|---|---|---|---|
| Website (stijl, indeling, zelf gehoste lettertypen) | `website/style.css`, `website/index.html`, `website/build.mjs`, `website/help-pages.mjs`, `website/fonts/` | omgezet (eerder, commits Refs #1003); geen Google Fonts | `website_test` |
| Logo in het spel | `game/js/logo.js` (`logoHtml`), `.gde-logo` in `game/index.html` en de laad- en startschermen | omgezet (eerder) | `logo_taal_test`, `ds_tokens_test` |
| Logo als los bestand (kleur, één inkt, rustig) | `website/brand/logo-kleur.svg`, `logo-inkt.svg`, `logo-klein.svg` | **nieuw** (deze ronde) | `merkbestanden_test` |
| Socialkaart | `website/brand/social-card.svg` (1200 x 630) | **nieuw**; de bestaande `social-preview.png` van de pagina is nog een schermafbeelding en blijft tot een beeldkeuring | `merkbestanden_test` |
| Steam: header, kleine en grote capsule, verticale capsule, bibliotheekcapsule, bibliotheekhero, bibliotheeklogo | `steam/art/*.svg` (maten in de bestandsnaam) | **nieuw**; zonder schermafbeeldingen (die kiest de eigenaar), alleen woordmerk en kleurvlakken | `merkbestanden_test` |
| App-icoon (bron, Windows .ico 16/32/48/256, macOS .icns, Linux png, Android mipmaps en adaptief icoon, venstericoon, favicon) | `desktop/resources/*`, `android/.../res/mipmap-*`, `game/favicon*`, `desktop/scripts/make-icon-svg.cjs` | omgezet (eerder) | `app_icons_test` |
| Trailer-titelkaarten | `game/js/trailer.js` | omgezet (eerder) | `trailer`-tests, `ds3_dekking_test` |
| Splash, About, installer | Android-opstartscherm en venster | omgezet (eerder, achtergrond op papier) | `app_icons_test` |

Generator: `node desktop/scripts/make-brand-assets.cjs` schrijft de logo- en Steambestanden (zelfde letterpaden als het icoon, `make-icon-svg.cjs`). `merkbestanden_test` faalt als een bestand achterloopt op het script.

## Nog niet gedaan of vraagt beeld

- De echte bouw per platform (de coordinator bouwt): `app_icons_test` toetst bronnen en, als er een build staat, het resultaat.
- Rasteren van de SVG-bestanden naar PNG voor Steam (Steam vraagt PNG of JPG): een stap voor de eigenaar of de coordinator met `desktop/scripts/render-icon.cjs` als voorbeeld; hier niet gedaan.
- Keuring door de eigenaar van website en logo's in beeld, en de leesbaarheid van de rustige varianten op 16, 32 en 231 px.
- Het Steam-beeld met een echte schermafbeelding als achtergrond: een keuze van de eigenaar.

**Samen spelen:** n.v.t. (alleen marketingbestanden en documentatie; geen spelgedrag).
