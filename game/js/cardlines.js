// What Tammo or Anita (whoever you play) says out loud when a HUD card
// shows (hudcards.js). Matched against the card text; the spoken line is
// recorded for both in the lines manifest ("Tammo|<say>", "Anita|<say>"),
// registered in scripts/voicelines_collect.mjs. Only moments worth a voice:
// dangers, the police, big wins. Everything else stays a silent card.
export const CARD_LINES = [
  { match: /^Je bent de politie kwijt/, say: 'We zijn ze kwijt. Rustig aan nu, niet opvallen.' },
  { match: /^Je bent klemgereden/, say: 'Klemgereden! Eruit en wegwezen!' },
  { match: /^Een getuige heeft de politie gebeld/, say: 'Die heeft de pliesie gebeld. Doorlopen.' },
  { match: /^De politie zag je dat .* slopen/, say: 'Oei. Dat zag de pliesie.' },
  { match: /^Geflitst!/, say: 'Flits. Daar gaat mijn geld.' },
  { match: /^Je auto staat in brand/, say: 'Hij staat in de fik! Eruit, nu!' },
  { match: /^Plons! Je auto zinkt/, say: 'We zinken! Eruit, eruit!' },
  { match: /^Je raakt uitgeput/, say: 'Ik kan niet meer. Naar de kant!' },
  { match: /^Code Rood: storm/, say: 'Code rood. Hou je fiets maar goed vast.' },
  { match: /^Eierbal gevonden!/, say: 'Een eierbal! En nog warm ook.' },
  { match: /^Alle \d+ eierballen gevonden/, say: 'Allemaal! Elke eierbal van Grunn. Ik ben trots op ons.' },
  { match: /^Vrijgespeeld:/, say: 'Die is van ons! Hij staat in de garage.' },
  { match: /: niveau \d+, /, say: 'Promotie! Meer geld, maar ook zwaarder werk.' },
  { match: /^Nieuw record bij/, say: 'Nieuw record. Kon minder, hè?' },
  { match: /^Trein gekaapt!/, say: 'We hebben een trein. Dit wordt een lang verhaal.' },
  { match: /^Eerst je bijbaantje afmaken|^Maak eerst je huidige missie af/, say: 'Eerst afmaken waar we mee bezig zijn.' },
];
