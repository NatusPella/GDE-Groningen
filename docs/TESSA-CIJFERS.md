# Tessa: cijfers voor het feitenblok, geverifieerd (#39)

Gecontroleerd op 17 oktober 2026 met publieke CBS-pagina's. Het feitenblok
staat in `docs/archief/2026-10/FEEDBACK-SPEELTEST-1.md` (§ "Tessa en onveilig uitgaan").
In de speltekst (`game/js`) staan nog **geen** cijfers over Tessa of onveilig
uitgaan (grep op Tessa, feitenblok, veilig, uitgaan, CBS, procent: niets).
Er hoeft dus niets in het spel te worden gecorrigeerd; dit zijn de cijfers en
formuleringen voor wanneer de scene (F4a) wordt gebouwd.

Het nieuwste jaar is de **Veiligheidsmonitor 2025** (CBS, gepubliceerd 2 maart
2026). Gebruik die, niet 2023.

## Geverifieerde claims

| # | Claim in het feitenblok | Geverifieerd cijfer | Bron | Jaar |
|---|---|---|---|---|
| 1 | Aandeel vrouwen dat zich weleens onveilig voelt (algemeen) | **47,9%** van de vrouwen (mannen 26,3%). Afgerond: 48% tegen 26%. | [CBS Veiligheidsmonitor 2025, h3 Veiligheidsbeleving, tabel 3.1.3](https://www.cbs.nl/nl-nl/longread/rapportages/2026/veiligheidsmonitor-2025/3-veiligheidsbeleving) | 2025 |
| 2 | Idem, in de eigen buurt | **20,9%** van de vrouwen (mannen 12,7%). Afgerond 21% tegen 13%. | zelfde tabel | 2025 |
| 3 | Verschil jong/oud en vrouw/man | Vrouwen 15-25: **28%** weleens onveilig in de buurt, **60%** in het algemeen (tekst, afgerond). Jonge mannen: 13% en 27%. In elke leeftijdsgroep voelen vrouwen zich vaker onveilig; het verschil is kleiner bij ouderen. De tabel zelf geeft voor 15-25 alleen beide geslachten samen (20,2% / 43%), dus de 28% en 60% komen uit de lopende tekst. | zelfde pagina | 2025 |
| 4 | Vrouwen die omlopen of omrijden om onveilige plekken | Jonge vrouwen 15-25: **45%** loopt of rijdt weleens om; jonge mannen ongeveer 20%. Het cijfer is "ongeveer gelijk gebleven". Dit komt uit NOS-berichtgeving over CBS-cijfers (Emancipatiemonitor/Veiligheidsmonitor, enquête 2023, 170.000 personen), niet uit de 2025-pagina; die geeft geen uitsplitsing naar geslacht. | [NOS, 18 juli 2025](https://nos.nl/l/2575496) | 2023 |
| 5 | Op straat lastiggevallen (nafluiten, nariepen, achtervolgen) | CBS meet niet precies dat, maar "respectloos gedrag door onbekenden op straat": vrouwen **1,9% vaak en 15,1% soms** (mannen 1,7% en 12,2%); 15-25 jaar 3,3% vaak en 16,1% soms. Dit is via een zoekresultaat gevonden, de hoofdstukpagina zelf gaf een 404 en is niet rechtstreeks gelezen. Dus half geverifieerd. | [CBS Veiligheidsmonitor 2023, h8](https://www.cbs.nl/nl-nl/longread/rapportages/2024/veiligheidsmonitor-2023/8-respectloos-gedrag-en-discriminatie) | 2023 |
| 6 | Seksueel grensoverschrijdend gedrag onder jonge vrouwen | **51,7%** (afgerond 52%) van de vrouwen van 18-24 jaar was in de afgelopen 12 maanden slachtoffer, online en offline samen, ook seksuele opmerkingen en ongewenst aanraken. Niet alleen "op straat". | [CBS/WODC Prevalentiemonitor, nieuwsbericht](https://www.cbs.nl/nl-nl/nieuws/2023/02/helft-jonge-vrouwen-slachtoffer-seksueel-grensoverschrijdend-gedrag-in-2022) | 2022 |

## Niet te verifiëren

| Claim | Waarom | Veilige herformulering |
|---|---|---|
| Aantal aangiften van seksuele intimidatie (Politie, jaarcijfers) | Niet gevonden bij CBS of in publieke zoekresultaten; aangiften zeggen bovendien weinig, omdat de meeste intimidatie niet wordt gemeld. | Weglaten. Zo nodig: "De meeste intimidatie wordt nooit gemeld." Alleen met bron als dat ook geverifieerd is. |
| Cijfer specifiek voor "in het uitgaansleven" | CBS publiceert geen uitsplitsing naar uitgaan. Het avondcijfer in de Veiligheidsmonitor is alleen totaal, niet naar geslacht (2023: 3,6% voelt zich 's avonds vaak onveilig op straat). | Niet "in het uitgaansleven" zeggen. Wel "in het algemeen" of "in de eigen buurt". |
| Vrouwen "op straat nagefloten" met een percentage | Geen CBS-meting met precies die definitie (zie claim 5). | Gebruik "respectloos gedrag op straat" of laat het weg. |

## Voorgestelde teksten (alleen één getal, met bron en jaar)

- **Laadschermregel of Kiekdoar-bericht (voorkeur):** "Bijna de helft van de
  vrouwen (48%) voelt zich weleens onveilig. Bij mannen is dat ruim een kwart
  (26%). Bron: CBS Veiligheidsmonitor 2025."
- **Variant jonge vrouwen:** "Van de vrouwen van 15 tot 25 jaar voelt 60%
  zich weleens onveilig; bij jonge mannen 27%. Bron: CBS Veiligheidsmonitor 2025."
- **Variant gedrag (jaar noemen, andere bron):** "Bijna de helft van de jonge
  vrouwen (45%) loopt weleens een straatje om. Bron: CBS, 2023."
- Zeg "weleens onveilig voelen", niet "is onveilig" of "wordt lastiggevallen":
  het gaat om een gevoel, niet om slachtofferschap.
- Rond af (48%, niet 47,9%), noem altijd bron en jaar, noem er één per keer.
- Niet mengen van 2023 en 2025 in één zin.

## Aandachtspunten

- De 2025-cijfers zijn hoger dan 2023 (toen: vrouwen 44,1% algemeen, 18,1%
  buurt; mannen 25,5% en 11,9%). Controleer bij de bouw van F4a of er een
  nieuwere uitgave is.
- Cijfers van Plan International (meer dan 80%) of lokale onderzoeken (Hengelo
  87%) zijn niet vergelijkbaar met CBS en horen niet in het spel.
