# Stemkaarten en proefzinnen per personageblad (#1367)

Stand 28-11-2026. Data: `scripts/stemkaarten.json` (39 bladen: de zeven hoofdfiguren en hun directe kring, de bijfiguren van
bijbel `docs/verhaal/bijbel-28-11/01-verhaal-en-personages.md` §2). Afleiding: `scripts/lib/stemkaart.mjs`. Test:
`node scripts/stemkaarten_test.mjs`.

## Wat een kaart afleidt

Uit leeftijd, geslacht, dialectniveau (0, 1, 2, 3, F1, F2 uit §2.0) en spreekstijl volgt de wie-beschrijving ("hele oude Friese
vrouw (...), zacht en nuchter"), het accent, de stijlpoel, het tempo (een expliciet tempo of een stijlwoord als snel of
plechtig wint, anders vanaf 65 jaar langzaam) en de taal van de opname (Gronings uit de spreektekst, Nederlands en Fries uit
de geschreven tekst, zoals `langOf` in `scripts/tts_cast.mjs`). De stijlregel heeft dezelfde vorm als `styleOf` aan de
TTS-scripts geeft.

## Regels die de test bewaakt

- Elke stem is een van de dertig Gemini-stemmen. Een al opgenomen rol heeft de stem van zijn clips (gecontroleerd tegen de
  `tts.json`-bestanden); een voorstel heeft nog geen clips en zegt hoe hij zich onderscheidt van de stem die hij deelt.
- Alle dertig stemmen zijn in gebruik: twee rollen op één stem moeten verschillen in leeftijdsklasse, tempo of dialect.
- Tammo zegt hooguit acht woorden per proefzin; Tessa spreekt standaard Nederlands zonder Gronings woord; plat Gronings en
  Fries hebben een Nederlandse ondertitel; geen winter, geen echt merk, "Grunn" en nooit "de Grunn".

## Voorstellen (nog geen stem opgenomen)

Sander Poelman (Puck), Omroeper Hayo Prins (Algenib), Tante Aaltje (Achernar), Dries Oltmans (Sadaltager), Annemarie
(Despina), Jochem Luiken (Rasalgethi), Hilda Wolthuis (Kore), Joost Ensing (Sadachbia), Tjeerd Bolhuis (Umbriel). Veldkamp
houdt Alnilam (stemkeuze 22-11, `docs/TTS-ROND3-22-11.md`).

## Open voor de eigenaar of een kenner

- **Beppe** staat in de bijbel als "stem nieuw", maar er zijn al 9 clips in Aoede. De kaart houdt Aoede (zachter, langzamer,
  Fries-getint, onderscheiden van Willemien en Boerin Geesje); een andere stem betekent die clips opnieuw opnemen.
- De Gronings en Friese proefzinnen (Trijntje, Hindrik, Wiebe, Beppe, Mem, Aaltje) zijn concept en niet door een kenner
  nagelezen; zie `docs/verhaal/GRONINGS-20-SPREEKTEKSTEN.md`.
- Er is niets beluisterd en niets opgenomen: alles is op papier gekozen uit de beschrijving van de Gemini-stemmen.
