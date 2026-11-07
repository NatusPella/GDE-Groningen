# De intocht: wat er gebeurt als je een wijk veroverd hebt (#704)

Epic **#704** is afgerond: elke verovering van een wijk of woonplaats levert een skipbare
film van 20-40 seconden, één keer per speler, met een knop om hem opnieuw te zien. Deze
pagina is de afronding en het naslagblad; de regels staan in de spec (zie onderaan) en de
code is de waarheid.

## Wat de speler ziet

1. Je doet alles wat er in een gebied te doen is. Bij de laatste taak betaalt `betaal()`
   (`game/js/gebiedenlive.js`) de beloning uit en zet de intocht in de wachtrij
   (`world.veroverWacht`) met het attention-moment `veroverd`.
2. De film begint pas als je rustig bent: geen andere film, banner, respawn, missie,
   bijbaan, race of minigame, geen pauzemenu of kaart, geen politie, 2,5 s na de vorige
   film en 2 s na de beloning (`probeerIntocht` in `game/js/intochten.js`; de pure
   regels in `game/js/wijkintocht.js`).
3. Je krijgt een tocht door de wijk: overzicht → 3-5 stops op ooghoogte → detail →
   eindbeeld achter de speler, met de titel "Wijkheld van …", de vlag en het geld. De
   camera komt data-gedreven uit de catalogus: de vaste ankers van de scène, de taken van
   het gebied, landmarks binnen de wijkpolygoon en het safehouse (`veroverTourShot` in
   `game/js/camerapath.js`).
4. De film is skipbaar (Spatie); de beloning is al betaald en gaat niet verloren.
5. Eén keer per speler: het profiel (`gde-gebieden-v1`) houdt in `intochten` bij welke
   intochten je zag. Terugkijken kan via **Loopbaan › Veroverd** ("Bekijk de intocht") en
   in de cutscene-preview (`game/cutpreview.html`, groep "Intochten").

## De acht handgeschreven scènes (#707)

| Wijk | Titel | Ankers |
|---|---|---|
| Centrum | Klokslag | Grote Markt · Vismarkt · Forum |
| Oud-Zuid | Aankomen | Stationsplein · Groninger Museum · Herebrug |
| Oud-Oost | De stoep | Korenbloemstraat · Trompsingel · Kop van Oost |
| Oud-West | De westkant | Schildersbuurt · Westerhaven · Suikerfabriek |
| Nieuw-Noord | Tegenwind | Klimtoren Zernike · Padel Paddepoel-Noord · Pleiadenlaan |
| Zuidwest | Het park | Skatepark · Discgolf · Padel Martini Trade Park |
| Hoogkerk | De oogst | Akker · Suikerhal · Polderweg |
| Oud-Noord | De zolder | Korreweg · Noorderplantsoen · De Hoogte |

Elk veroverd gebied zonder eigen scène krijgt de korte generieke variant (`generiekVoor`
in `wijkintocht.js`), zodat er altijd een film is. Oud-Noord is nog niet veroverbaar
(0 taken) maar de scène staat klaar. De woonplaats-, gemeente- en provincielagen hebben
hun eigen, kortere of bestaande afronding.

## Samen spelen (#712, #724)

Veroveren is per speler: wat jij veroverd hebt staat in je eigen profiel. De intocht is
een **host-only film** (`playCinematic` met een eigen camerabaan): wie het spel opende
speelt hem, een gast ziet de titelkaart en de regel uit het scènebericht. Er is geen
`playScript`-pakket voor de intocht, dus hij gaat niet als data naar de gasten; de
host-only-regel staat in `docs/COOP-GAST.md` en `.specs-fire/standards/verhaal.md`.

## Wat er in de code zit (per sub-issue)

| Sub-issue | Wat | Bewijs |
|---|---|---|
| #705 | wachtrij, rust-poort, `MOMENTS.veroverd`, betaal-haak | `wijkintocht_test.mjs`, `gebieden_test.mjs` |
| #706 | `veroverTourShot` met data-gedreven stops uit de catalogus | `wijkintocht_test.mjs`, `camerapath.js` |
| #707 | acht handgeschreven scènes + generieke variant | `wijkintocht_test.mjs` (13/13) |
| #708 | eenmalig per save, terugkijken via Veroverd en preview | `gebieden_test.mjs`, `cutpreview_test.mjs` |
| #709 | eerste bezoek: kaart, flyover en `wijkFilm` herzien | `cinematics.js`, `gebieden_test.mjs` |
| #710 | namen ("Wijkheld van …", geen "Wijk 00/14") | `gebieden_test.mjs` |
| #716 | terminologie: buurt (66 punten) vs wijk (CBS-laag) | `wijkterminologie_test.mjs` |
| #723 | docs, preview en specs bijwerken | `cutscene_engine_docs_test.mjs`, `cutpreview_test.mjs` |
| #724 | tests voor de gast-kant en de intocht | `wijkintocht_test.mjs`, `coopcut_test.mjs` |

**Acceptatie van de epic:** een verovering geeft een skipbare scène van 20-40 s met
titel en vlag, één keer per speler, met een knop om hem opnieuw te zien; de wachtrij, de
rust-poort en de stops zijn puur getest; de gast ziet de host-only-regel; de preview
toont alle scènes met duur en skipbaarheid. Aan alle punten is voldaan.

## Regels en naslag

- Canonieke spec: [`.specs-fire/standards/verhaal.md`](../.specs-fire/standards/verhaal.md)
  en [`wereld.md`](../.specs-fire/standards/world.md) (gebieden); bij verschil wint de spec.
- [GEBIEDEN.md](GEBIEDEN.md) §Intocht: de gebiedenkant (wachtrij, stops, terminologie).
- [COOP-GAST.md](COOP-GAST.md) §Veroveren en intochten: wat een gast ziet.
- Ontwerp en bron: `docs/archief/review-cutscenes-2026-11-06/00-WIJK-VEROVER-FILM.md` en
  `07-wijk-scenes-ontwerp.md`.
