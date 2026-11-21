// Jelle als eindbaas (#1139, WP16 van de verhaal-epic): per akte een offerte aan het begin, een zichtbare handlanger bij zijn streken en
// (Bezit, rival.js) het opkopen van plekken als speelbaar plakje. Satire, geen leed: hij wint met bureaucratie (vergunning, formulier in drievoud),
// wordt verslagen met zijn eigen wapens (de beste eierbal, een nette vergunning) en is alleen kwetsbaar door zijn moeder Mem. Nooit geweld.
//
// Zuiver: geen DOM, geen wereld, geen opslag; scripts/jellebaas_test.mjs. De akte komt van de aanroeper (storyquery currentStep, STEPS[].part):
// 'kop' (akte 1), 'romp' (2), 'staart' (3), 'zuid' (4), 'ontzet' (5), 'nazomer'. Zonder bekende akte (oude save, geen verhaal) geeft de handlanger-regel niets en valt de offerte terug op 'kop'.
// Samen spelen: lokaal per speler; de tekst komt in de eigen meldingen en verandert niets in het net (docs/COOP-GAST.md).

export const BOSS = {
  kop: {
    offerte: '"Een vriendelijk voorstel," appt Jelle. "Ik koop uw plek, uw wagen en uw plannen. Voor een eerlijke prijs, dat spreekt." Hij heeft de goede plekken al.',
    handlanger: 'Durk en Douwe',
    wat: 'sjouwen en kijken streng',
    streek: { storing: 'Durk en Douwe stonden er toevallig, met een tang.', pech: 'Douwe stond bij je wagen "even iets te controleren".', recensie: 'Durk bracht de recensie persoonlijk langs, op briefpapier.', oorlog: 'Durk en Douwe delen de saus uit, met een grote glimlach.', overkoop: 'Douwe hield de deur voor je verkoper open.', vergunning: 'Durk en Douwe brachten het formulier, in drievoud.' },
  },
  romp: {
    offerte: '"Het Noorden is groot," appt Jelle, "maar het meeste papier is van mij. Mijn offerte ligt klaar, met stempel."',
    handlanger: 'Durk en Douwe',
    wat: 'formulieren bezorgen',
    streek: { storing: 'Durk keek toe en zei niets. Dat is erger.', pech: 'Douwe bood aan te helpen, na een formulier.', recensie: 'Douwe las de recensie hardop voor.', oorlog: 'Durk en Douwe stonden naast Jelles wagen met een bord.', overkoop: 'Durk schonk koffie voor je verkoper.', vergunning: 'Durk en Douwe wachtten bij het loket tot jij kwam.' },
  },
  staart: {
    offerte: '"Panden zijn zo veel rustiger dan friet," appt Jelle. "Geef mij de actKey, dan krijgt u nooit meer een storing."',
    handlanger: 'Durk en Douwe',
    wat: 'rijden en meekijken',
    streek: { storing: 'Durk en Douwe reden twee keer langs.', pech: 'Douwe stond met de sleepwagen al klaar.', recensie: 'Durk schreef mee, met één oog dicht.', oorlog: 'Douwe hing de prijzen op, scheef.', overkoop: 'Durk en Douwe wachtten bij de kassa op je medewerker.', vergunning: 'Durk bracht de stempel mee, Douwe het inktkussen.' },
  },
  zuid: {
    offerte: '"Eén handtekening," zegt Jelle, "en uw hele regio is rustig. Dat is mijn laatste vriendelijke aanbod."',
    handlanger: 'Durk',
    wat: 'verklapt een geheim zodra hij één biertje op heeft',
    streek: { storing: 'Durk fluisterde: "Ik heb niks gedaan." Dat zei hij te snel.', pech: 'Durk vertelde per ongeluk wie de actKey had.', recensie: 'Durk wist welke recensie. Hij zei het hardop.', oorlog: 'Durk liet de prijslijst liggen.', overkoop: 'Durk wist de naam van de koper. Hij zei hem twee keer.', vergunning: 'Durk liet het dossier op de bar liggen.' },
  },
  ontzet: {
    offerte: '"Alles wat u hebt, past in één map," zegt Jelle. "Tekent u hier? Mijn moeder kijkt mee."',
    handlanger: 'niemand meer',
    wat: 'Durk en Douwe staan bij Jelles oma in de keuken',
    streek: { storing: 'Dit keer deed Jelle het zelf. Met een formulier.', pech: 'Jelle belde zelf. Niemand nam op.', recensie: 'Jelle schreef de recensie zelf, met drie fouten.', oorlog: 'Jelle zette de prijzen zelf neer.', overkoop: 'Jelle stond zelf bij je verkoper.', vergunning: 'Jelle diende het zelf in. Zijn eigen vergunning was niet in orde.' },
  },
  nazomer: {
    offerte: '"Ik heb mijn offerte teruggetrokken," schrijft Jelle. "Mijn moeder zei dat de eierbal de beste was."',
    handlanger: 'niemand meer',
    wat: 'de rekening ligt bij Jelle',
    streek: {},
  },
};

export const ACTS = Object.keys(BOSS);
const actKey = (part) => (BOSS[part] ? part : 'kop');

// De offerte van Jelle aan het begin van een akte.
export const jelleOffer = (part) => BOSS[actKey(part)].offerte;
// Wie bij deze akte zijn handlanger is: { naam, wat }.
export const henchmenOf = (part) => { const b = BOSS[actKey(part)]; return { naam: b.handlanger, wat: b.wat }; };
// De zin met de handlanger bij een streek (storing, pech, recensie, oorlog, overkoop, vergunning); '' als er geen is.
export const henchmanLine = (part, kind) => (BOSS[part] && BOSS[part].streek[kind]) || '';
// De tekst van een streek met de handlanger erbij (voor de melding).
export const trickText = (part, kind, tekst) => { const r = henchmanLine(part, kind); return r ? `${tekst} ${r}` : tekst; };
