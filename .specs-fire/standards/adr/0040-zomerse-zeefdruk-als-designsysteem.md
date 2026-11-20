# 0040 - Zomerse zeefdruk als enig designsysteem (v3)

- **Status:** besloten
- **Datum:** 2026-11-20
- **Spec:** `.specs-fire/standards/ui-taal.md` ("Designsysteem v3"), `DESIGN_SYSTEM.md` ("Design system v3")

## Context

Er liepen twee oppervlakken naast elkaar: donker crime-poster-glas (HUD, pauze, kaart)
en de crème kassabon van v2 (#980; winkel, missies, loopbanen). Daarbij twee gelen
(`#e8c93a`, `#f9c80e`), Bebas Neue zonder kleine letters met Arial Narrow als leesletter,
en de lettertypen kwamen van Google Fonts, een externe dienst buiten de uitzonderingen
van constitution-regel 4. De eigenaar vond de eerdere voorstellen te weinig eigen.
In drie vragenrondes op 20-11 koos hij een richting voor alle UI.

## Besluit

- **Eén materiaal overal: zomerse zeefdruk.** HUD, menu's, telefoon, kaart,
  laadschermen en grote momenten: crème papier, harde inkt, verschoven harde schaduw
  in plaats van gloed, misdruk als handtekening, raster voor leeg of uitgeschakeld.
- **Palet: vijf inkten en twee statusrollen.** Papier, inkt, bordgroen, zomergeel en
  misdrukroze; daarnaast alleen het ene gevaarrood (ADR 0010) en de kleurenblinde
  `--mk-*`. Eén geel: `#e8c93a` gaat op in het zomergeel.
- **Letters: Barlow Condensed** (titels, cijfers, HUD) en **Atkinson Hyperlegible**
  (lopende tekst), beide OFL en zelf gehost; Google Fonts verdwijnt.
- **Volle persoonlijkheid** in de UI (parodie-apps, stempels, Groningse uitroepen),
  met elke Groningse regel ook in het Nederlands.
- **HUD verschijnt bij behoefte**, minimap afgerond vierkant met GPS-lijn, en vier
  grote momenten: missie geslaagd of mislukt, opgepakt, nieuw gebied, wanted omhoog
  of omlaag (dat laatste aan de rand, niet schermvullend).
- **Schakelaar "Rustig drukwerk"**: geen misdruk, schuine hoeken, raster of
  stempelanimatie, alle tekst minstens 7:1; standaard aan op de Steam Deck.
- **Controller eerst** voor maat, focus en navigatie.
- **Handhaving:** token- en componenttest, de galerij als enige bron,
  beeldregressie per scherm (drie resoluties plus Rustig drukwerk), en de migratie
  als één epic zonder half omgebouwde schermen in een release.

## Afgewezen

- **Vaste hybride (glas in de wereld, papier voor beslissingen).** De aanbevolen
  middenweg, maar de eigenaar wil één eigen gezicht in plaats van twee oppervlakken.
- **Alles donker crime-glas.** Dichter bij het genre, maar niet eigen, en donker op
  donker valt weg in schemerige scènes.
- **Zeefdruk alleen voor grote momenten.** Zou de tweedeling van v2 laten bestaan.
- **Zeefdruk met een rustige HUD als standaard.** Afgewezen voor de standaard; die
  rust zit nu in de schakelaar Rustig drukwerk.
- **Genre-geel voor wanted houden.** Een tweede geel is precies de drift van ADR 0010.
- **Een vierde inkt per gebied.** Meer sfeer, maar meer regels en testvarianten.
- **Bebas Neue houden.** Geen kleine letters en zwak bij kleine maten.
- **Muis en toetsenbord eerst / alles apart per apparaat.** Bank-afstand en de Deck
  zijn de strengste maat; drie layouts per scherm is te veel werk om goed te houden.

## Gevolgen

v2 (#980) gaat op in v3: de tokens en componenten blijven het mechanisme, de waarden
en het oppervlak veranderen. Elke scherm-PR van de epic moet de galerij en de
beeldregressie groen hebben. Het grootste risico is leesbaarheid van de HUD boven een
drukke scène; de HUD-proef (binnenstad en Hogeland, vol en rustig) komt daarom eerst
en de eigenaar keurt hem voordat de rest omgaat. De leeftijds- en taalregels blijven:
humor in de UI noemt geen echt merk of echte persoon.

## Aanvulling 2026-11-20: eigen identiteit per context

De eigenaar koos: eerst **minigames, bijbanen en missielijnen**; het thema mag **ook de schermachtergrond** raken; eerst een **proefset van twee** (golf en farming) die hij keurt; en **volledige themaiconen** op de kaart.
Elke context is één regel in een tabel (motief, embleem, kopband, stempeltekst) met alleen de bestaande inkten, zonder hex of lettertype; de tabel vervangt de losse identiteitskleur per minigame. In Rustig drukwerk valt het motief weg of wordt effen.
**Risico dat de eigenaar tegen ons advies koos:** volledige themaiconen (eigen vorm per thema) kunnen de soort op de kaart minder leesbaar maken. Voorwaarden: de soort blijft herkenbaar via een vaste rand of hoekmarkering plus `--mk-*`, en een achtergrondmotief blijft onder 4,5:1-contrast voor elke tekst, anders wordt het een effen vlak. De proefset toetst dit voordat de rest wordt getekend.
