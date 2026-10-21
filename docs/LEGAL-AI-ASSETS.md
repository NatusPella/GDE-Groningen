# AI-stemmen en -muziek onder CC BY-NC-SA: juridisch nalezen (#38)

**Dit is geen juridisch advies.** Het is een leesverslag door een AI-assistent
van publieke voorwaarden, bedoeld om een gesprek met een jurist voor te
bereiden. Voorwaarden veranderen; de Google-, Gemini- en OpenRouter-punten
hieronder komen uit de samenvatting in `docs/LICENTIES.md` §4 (stand daarvan:
Google ToS 30 juli 2026, Gemini API Additional Terms 28 april 2026, OpenRouter
Terms 31 augustus 2026) en zijn voor deze notitie niet opnieuw woord voor woord
gelezen. Lees de bronnen zelf vlak voor publicatie.

## Situatie

- ~3.100 stemclips (3.123 op 21 okt, elk in een `tts.json`; `node scripts/audio_herkomst.mjs` controleert dat): `google/gemini-3.8-flash-tts` via OpenRouter, vaste
  prebuilt stemmen (geen kloon van een echt persoon).
- Muziek (20 G-Music-nummers, 2 loops, titelnummer): Google Gemini; welk
  product en abonnement is nog niet vastgelegd.
- Het spel speelt vooraf gemaakte bestanden af; er wordt tijdens het spelen
  niets gegenereerd.
- Licentie inhoud: CC BY-NC-SA 4.0 "voor zover er rechten op rusten"
  (`LICENSE-CONTENT.md`); code GPL-3.0-or-later; gratis, geen verkoop.

## Wat Gemini/Google zegt (kern)

| Punt | Gevolg voor GDE |
|---|---|
| Google claimt geen eigendom van gegenereerde content (ToS, Gemini API Additional Terms). | Verspreiden en onder een licentie aanbieden lijkt toegestaan. |
| Verbod om output te gebruiken om concurrerende ML-modellen te trainen. | Geen probleem voor het spel; wel: de mp3's niet als trainingsdata aanbieden. De CC-licentie staat hergebruik toe, dus overweeg een regel dat AI-training buiten de licentie valt (zie vragen). |
| Verbod om anderen te laten denken dat AI-output door een mens is gemaakt. | Vermelden "gemaakt met Google Gemini" in credits en NOTICE (staat er al). |
| Gemini API: verbod de Services te gebruiken "as part of" een app voor minderjarigen; API-gebruiker moet 18+ zijn. | Het spel is 18+ en roept Gemini niet live aan. Live AI in het spel inbouwen is dus een aparte afweging. |
| Prohibited Use Policy: geen misleidende imitatie van echte personen, geen inbreuk op rechten van derden. | Prebuilt stemmen: ok. Muziek mag niet klinken als een bestaand nummer. |
| Gemini-app muziek (Lyria): 18+, SynthID-watermerk; commercieel gebruik wordt vooral bij betaalde abonnementen genoemd. | Bij de app (niet API) gelden de app-voorwaarden. Voor niet-commercieel gebruik waarschijnlijk geen probleem; leg vast welk product het was. |
| Gratis tier van de API: prompts en output mogen door Google worden gebruikt. | Privacy van de prompts, niet van de licentie. Prompts bevatten alleen spelteksten. |

## Wat OpenRouter zegt

Eigendom en gebruik van de output volgen de voorwaarden van het onderliggende
model; OpenRouter voegt volgens `LICENTIES.md` geen extra beperking toe, maar je
moet ook de voorwaarden van Google naleven. OpenRouter is dus een doorgeefluik;
de Google-voorwaarden zijn bepalend.

## Auteursrecht op pure AI-output

In de EU is voor auteursrecht een eigen intellectuele schepping van een mens
nodig (Infopaq, Cofemel). Volledig gegenereerde audio is dan waarschijnlijk
niet beschermd. Gevolgen:

1. Een CC BY-NC-SA-licentie op de AI-audio zelf is moeilijk afdwingbaar. De
   formulering "voor zover er rechten op rusten" is daarom juist.
2. Wel beschermd zijn waarschijnlijk: de teksten en scripts, het verhaal, de
   dialogen, de selectie en rangschikking, en eigen bewerking (mixen, snijden).
3. Het Nederlandse en Europese recht rond AI-output is in beweging; een jurist
   moet het actuele standpunt geven.

## Wat CC BY-NC-SA 4.0 vereist

(Bron: [legal code](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode),
[deed](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.nl).)

- **BY, naamsvermelding:** naam van de maker (of aangewezen partij), een
  copyrightvermelding, verwijzing naar de licentie met link, een disclaimer-
  verwijzing, link naar het origineel indien redelijk, en aangeven of je iets
  hebt gewijzigd. In een spel is een credits- of NOTICE-scherm gebruikelijk.
- **NC, niet commercieel:** niet primair gericht op commercieel voordeel of
  geldelijke vergoeding. "Commercieel" is in de praktijk grijs: advertenties,
  donaties, Steam-verkoop of een betaalde bundel kunnen problemen geven. De
  licentie bindt de ontvangers, niet jou als licentiegever: jij mag je eigen
  werk zelf wel commercieel gebruiken.
- **SA, gelijk delen:** bewerkingen deel je onder dezelfde (of een compatibele)
  licentie.
- **Geen technische beperkingen** (DRM) die ontvangers hinderen.
- **Onherroepelijk** voor ontvangers zolang ze zich aan de voorwaarden houden;
  achteraf intrekken kan niet voor wie het al ontving.
- **Garantie:** geen garanties; de licentie dekt geen rechten van derden.
- Een licentiegever mag alleen licentie geven op wat hij zelf mag.

### Samenspel met de GPL-code

CC BY-NC-SA 4.0 is niet compatibel met de GPL. Daarom staan code (GPL) en
inhoud (CC) los van elkaar in aparte bestanden (`LICENSE`, `LICENSE-CONTENT.md`).
Wie de game bundelt, levert twee aparte werken mee. Dat is een bewuste keuze en
houdbaar zolang de scheiding duidelijk blijft.

## Risico's en aanbevelingen

1. Houd "voor zover er rechten op rusten" en de Gemini-vermelding aan.
2. Leg vast: product (API of app), plan, datum, modelnaam en dat het ging om
   prebuilt stemmen; bewaar `tts.json` en prompts.
3. Voeg geen live AI of nieuwe generatie toe zonder de voorwaarden opnieuw te lezen.
4. Verkoop, advertenties of betaalde Steam-release botsen met de NC-claim en
   mogelijk met app-voorwaarden voor muziek: opnieuw beoordelen.
5. Controleer muziek zorgvuldig op herkenbare gelijkenis (Content ID).

## Open vragen voor een jurist

1. Is een CC-licentie op ongeschermde AI-output zinvol, of is "CC0 voor de
   audio, CC BY-NC-SA voor teksten en verhaal" eerlijker en duidelijker?
2. Valt het voor de NC-clausule onder "commercieel" als het spel gratis op Steam
   staat (plaatsingsvoorwaarden, geen verkoop)? En als er een donatielink komt?
3. Welk Gemini-product (app of API, welk abonnement) is voor de muziek gebruikt,
   en laten de voorwaarden daarvan publicatie onder CC toe?
4. Moet er een uitsluiting komen voor AI-training in de licentietekst, gezien
   het Google-verbod en de EU TDM-opt-out (artikel 4 DSM-richtlijn)?
5. Is de vermelding "gemaakt met Google Gemini" voldoende als AI-transparantie
   (EU AI Act, artikel 50, labeling van synthetische audio)?
6. Gevolgen van SynthID-watermerken en de regel dat output niet als menselijk
   werk mag worden gepresenteerd, voor een licentie die "naam van de maker" eist.
7. Blijft het gebruik van de oudere Preview-modelclips houdbaar, of opnieuw
   inspreken met het GA-model?
8. De voorwaarden zijn per datum; wie bewaakt wijzigingen na publicatie?
